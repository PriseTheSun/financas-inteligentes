'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, CheckCircle, Clock, Tag, TrendingUp, TrendingDown, BrainCircuit, Calendar as CalendarIcon, ChevronLeft, ChevronRight, LayoutGrid, List, LogOut } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, addMonths, subMonths, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { Transaction, TransactionStatus, TransactionType } from '@/lib/types';
import { getGeminiResponse } from '@/lib/gemini';
import { useFinanceController } from '@/hooks/useFinanceController';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

export default function FinanceApp({ session }: { session?: Session | null }) {
  const {
    transactions,
    loading,
    supabaseStatus,
    supabaseErrorMessage,
    supabaseErrorCode,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    toggleTransactionStatus
  } = useFinanceController();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  
  // Form state
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    owner: '',
    type: 'expense' as TransactionType,
    status: 'pending' as TransactionStatus,
    tags: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  const filteredTransactions = transactions.filter((t: Transaction) => {
    const date = parseISO(t.date);
    return isWithinInterval(date, {
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth)
    });
  });

  const totals = filteredTransactions.reduce((acc, t: Transaction) => {
    if (t.type === 'income') acc.income += t.amount;
    else acc.expense += t.amount;
    return acc;
  }, { income: 0, expense: 0 });

  const chartData = [
    { name: 'Entradas', value: totals.income, color: '#10b981' },
    { name: 'Saídas', value: totals.expense, color: '#ef4444' },
  ];

  const tagData = Object.entries(
    filteredTransactions.reduce((acc: Record<string, number>, t: Transaction) => {
      t.tags.forEach(tag => {
        acc[tag] = (acc[tag] || 0) + (t.type === 'expense' ? t.amount : 0);
      });
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value: value as number }));

  const openModal = (transaction?: Transaction) => {
    if (transaction) {
      setEditingTransaction(transaction);
      setFormData({
        description: transaction.description,
        amount: transaction.amount.toString(),
        owner: transaction.owner || '',
        type: transaction.type,
        status: transaction.status,
        tags: transaction.tags.join(', '),
        date: transaction.date
      });
    } else {
      setEditingTransaction(null);
      setFormData({
        description: '',
        amount: '',
        owner: '',
        type: 'expense',
        status: 'pending',
        tags: '',
        date: format(new Date(), 'yyyy-MM-dd')
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(t => t !== '');
    
    const transactionData = {
      description: formData.description,
      amount: parseFloat(formData.amount),
      owner: formData.owner,
      date: formData.date,
      type: formData.type,
      status: formData.status,
      tags: tagsArray,
    };

    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, transactionData);
      } else {
        await addTransaction(transactionData);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving transaction:', err);
    }
  };

  const toggleStatus = async (id: string) => {
    await toggleTransactionStatus(id);
  };

  const handleManualDelete = async (id: string) => {
    if (confirm('Deseja excluir esta transação?')) {
      await deleteTransaction(id);
    }
  };

  const askAI = async () => {
    setIsAIThinking(true);
    try {
      const prompt = "Analise minhas finanças deste mês. Quais são os pontos críticos? Como posso economizar ou investir melhor? Crie um plano de ação para os próximos 30 dias.";
      const response = await getGeminiResponse(prompt, {
        month: format(currentMonth, 'MMMM yyyy', { locale: ptBR }),
        totals,
        transactions: filteredTransactions
      });
      setAiResponse(response || "Não foi possível obter uma resposta da IA.");
    } catch (error) {
      console.error(error);
      setAiResponse("Erro ao consultar a IA. Verifique sua chave de API.");
    } finally {
      setIsAIThinking(false);
    }
  };

  // Calendar Logic
  const calendarDays = () => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {supabaseStatus === 'not-configured' && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900">Supabase não configurado</p>
              <p className="text-xs text-amber-700">O app está usando armazenamento local. Configure as variáveis de ambiente para persistência na nuvem.</p>
            </div>
          </div>
          <div className="text-[10px] font-mono bg-white/50 px-2 py-1 rounded border border-amber-100 text-amber-600">
            NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
          </div>
        </div>
      )}

      {supabaseStatus === 'error' && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-100 text-rose-600 rounded-xl">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-rose-900">Erro na conexão com Supabase</p>
              <div className="text-xs text-rose-700 space-y-1">
                <p>{supabaseErrorMessage || 'Não conseguimos acessar o banco de dados.'}</p>
                {supabaseErrorCode && (
                  <p className="font-mono bg-rose-100/50 px-1 py-0.5 rounded inline-block">Código: {supabaseErrorCode}</p>
                )}
                {supabaseErrorCode === 'PGRST116' || supabaseErrorMessage?.includes('relation') ? (
                  <div className="mt-2 p-3 bg-rose-100/50 rounded-xl border border-rose-200">
                    <p className="font-bold text-rose-800">Aviso: A tabela &apos;transactions&apos; não foi encontrada.</p>
                    <p className="mt-1">Você precisa executar o script SQL no Supabase para criar a tabela. Copie o conteúdo de <code className="bg-rose-200 px-1 rounded">supabase_schema.sql</code> e cole no SQL Editor do Supabase.</p>
                  </div>
                ) : (
                  <div className="mt-2 space-y-2">
                    <p className="mt-1">Verifique se as chaves no painel de Segredos estão corretas e se o projeto não está pausado.</p>
                    <ul className="list-disc list-inside text-[10px] opacity-80">
                      <li>Use a <b>Anon Key</b> (não a Service Role)</li>
                      <li>A URL deve começar com <b>https://</b></li>
                      <li>Certifique-se de usar o prefixo <b>NEXT_PUBLIC_</b> se estiver configurando manualmente</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {supabaseStatus === 'connected' && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-900">Supabase Conectado!</p>
              <p className="text-xs text-emerald-700">Seus dados estão sendo sincronizados com a nuvem com sucesso.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Cloud Sync Ativo</span>
          </div>
        </div>
      )}
      {loading && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-zinc-200 shadow-sm flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Sincronizando...</span>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-zinc-900">
            Finanças Inteligentes
          </h1>
          <p className="text-zinc-500">Gestão inteligente com auxílio de IA</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          {session && (
            <button
              onClick={() => supabase.auth.signOut()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-zinc-500 hover:text-rose-600 bg-white border border-zinc-200 rounded-2xl shadow-sm transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          )}

          <div className="flex items-center gap-1 bg-white p-1 rounded-2xl shadow-sm border border-zinc-200 w-full sm:w-auto">
            <button 
              onClick={() => setViewMode('list')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${viewMode === 'list' ? 'bg-zinc-900 text-white shadow-md' : 'text-zinc-500 hover:bg-zinc-100'}`}
            >
              <List className="w-4 h-4" />
              Lista
            </button>
            <button 
              onClick={() => setViewMode('calendar')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${viewMode === 'calendar' ? 'bg-zinc-900 text-white shadow-md' : 'text-zinc-500 hover:bg-zinc-100'}`}
            >
              <LayoutGrid className="w-4 h-4" />
              Calendário
            </button>
          </div>

          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-zinc-200 w-full sm:w-auto justify-between">
            <button 
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 hover:bg-zinc-100 rounded-xl transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-zinc-600" />
            </button>
            <div className="flex items-center gap-2 px-2 font-semibold text-zinc-700 min-w-[140px] justify-center">
              <CalendarIcon className="w-4 h-4 text-emerald-600" />
              <span className="capitalize">{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</span>
            </div>
            <button 
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 hover:bg-zinc-100 rounded-xl transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-zinc-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 group hover:border-emerald-200 transition-colors"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Entradas</span>
          </div>
          <p className="text-3xl font-display font-bold text-zinc-900">
            R$ {totals.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 group hover:border-rose-200 transition-colors"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl group-hover:scale-110 transition-transform">
              <TrendingDown className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Saídas</span>
          </div>
          <p className="text-3xl font-display font-bold text-zinc-900">
            R$ {totals.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-zinc-900 p-6 rounded-3xl shadow-xl text-white sm:col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white/10 text-white rounded-2xl">
              <Tag className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Saldo Disponível</span>
          </div>
          <p className="text-3xl font-display font-bold">
            R$ {(totals.income - totals.expense).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Charts Section */}
          <section className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200">
            <h2 className="text-xl font-display font-bold mb-6 flex items-center gap-2">
              Fluxo de Caixa
            </h2>
            <div className="h-[250px] md:h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} />
                  <Tooltip 
                    cursor={{ fill: '#f4f4f5' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Transactions Section */}
          <section className="bg-white rounded-3xl shadow-sm border border-zinc-200 overflow-hidden">
            <div className="p-6 border-b border-zinc-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-xl font-display font-bold">
                {viewMode === 'list' ? 'Histórico de Transações' : 'Agenda de Pagamentos'}
              </h2>
              <button 
                onClick={() => openModal()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-xl hover:bg-emerald-700 transition-all font-bold shadow-lg shadow-emerald-600/20"
              >
                <Plus className="w-5 h-5" />
                Nova Transação
              </button>
            </div>

            {viewMode === 'list' ? (
              <div className="divide-y divide-zinc-100">
                {filteredTransactions.length === 0 ? (
                  <div className="p-16 text-center">
                    <div className="bg-zinc-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <List className="w-8 h-8 text-zinc-300" />
                    </div>
                    <p className="text-zinc-400 font-medium">Nenhuma transação este mês.</p>
                  </div>
                ) : (
                  filteredTransactions.map((t) => (
                    <div key={t.id} className="p-4 md:p-6 hover:bg-zinc-50/80 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group">
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className={`p-3 rounded-2xl shrink-0 ${t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                          {t.type === 'income' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-zinc-900 truncate">{t.description}</h3>
                            {t.owner && (
                              <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                {t.owner}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs text-zinc-500 font-medium">{format(parseISO(t.date), 'dd/MM/yyyy')}</span>
                            {t.tags.map(tag => (
                              <span key={tag} className="text-[10px] bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full font-bold">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-t-0 pt-4 sm:pt-0">
                        <div className="text-left sm:text-right">
                          <p className={`text-lg font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-zinc-900'}`}>
                            {t.type === 'income' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <button 
                            onClick={() => toggleStatus(t.id)}
                            className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider mt-1 ${
                              t.status === 'paid' ? 'text-emerald-600' : 'text-amber-500'
                            }`}
                          >
                            {t.status === 'paid' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {t.status === 'paid' ? 'Pago' : 'Pendente'}
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => openModal(t)}
                            className="p-2 text-zinc-400 hover:text-indigo-600 transition-colors sm:opacity-0 group-hover:opacity-100"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleManualDelete(t.id)}
                            className="p-2 text-zinc-400 hover:text-rose-600 transition-colors sm:opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="p-4 md:p-6 overflow-x-auto">
                <div className="min-w-[700px]">
                  <div className="grid grid-cols-7 gap-px bg-zinc-100 rounded-2xl overflow-hidden border border-zinc-100">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                      <div key={day} className="bg-zinc-50 p-3 text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                        {day}
                      </div>
                    ))}
                    {calendarDays().map((date, i) => {
                      const isCurrentMonth = isSameMonth(date, currentMonth);
                      const dayTransactions = transactions.filter(t => isSameDay(parseISO(t.date), date));
                      const isToday = isSameDay(date, new Date());
                      
                      return (
                        <div 
                          key={i} 
                          className={`min-h-[120px] p-2 bg-white border-t border-l border-zinc-100 transition-colors hover:bg-zinc-50/50 ${!isCurrentMonth ? 'bg-zinc-50/30' : ''}`}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className={`text-xs font-bold ${isToday ? 'bg-emerald-600 text-white w-6 h-6 flex items-center justify-center rounded-full shadow-lg shadow-emerald-600/30' : isCurrentMonth ? 'text-zinc-900' : 'text-zinc-300'}`}>
                              {date.getDate()}
                            </span>
                          </div>
                          <div className="space-y-1">
                            {dayTransactions.slice(0, 3).map(t => (
                              <button 
                                key={t.id} 
                                onClick={() => openModal(t)}
                                className={`w-full text-left text-[9px] p-1.5 rounded-lg border truncate font-bold transition-all hover:scale-[1.02] ${
                                  t.type === 'income' 
                                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                                    : t.status === 'paid' 
                                      ? 'bg-zinc-100 border-zinc-200 text-zinc-400 line-through'
                                      : 'bg-rose-50 border-rose-100 text-rose-700'
                                }`}
                              >
                                {t.description}
                              </button>
                            ))}
                            {dayTransactions.length > 3 && (
                              <div className="text-[8px] text-zinc-400 font-bold text-center py-1">
                                +{dayTransactions.length - 3} itens
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* AI Consultant */}
          <section className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-[2rem] shadow-2xl text-white relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md group-hover:rotate-12 transition-transform">
                  <BrainCircuit className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-display font-bold">IA Conselheira</h2>
              </div>
              <p className="text-indigo-100 text-sm leading-relaxed mb-8">
                Análise profunda dos seus hábitos financeiros para otimizar seu patrimônio.
              </p>
              <button 
                onClick={askAI}
                disabled={isAIThinking}
                className="w-full bg-white text-indigo-600 py-4 rounded-2xl font-bold hover:bg-indigo-50 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg shadow-indigo-900/20"
              >
                {isAIThinking ? (
                  <>
                    <div className="w-5 h-5 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    Processando...
                  </>
                ) : (
                  'Gerar Relatório IA'
                )}
              </button>
            </div>
            <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-indigo-400/20 rounded-full blur-3xl" />
          </section>

          {/* AI Response */}
          <AnimatePresence>
            {aiResponse && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white p-6 rounded-3xl shadow-xl border border-zinc-200"
              >
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                    <h3 className="font-bold text-zinc-900">Insights Estratégicos</h3>
                  </div>
                  <button onClick={() => setAiResponse(null)} className="text-zinc-400 hover:text-rose-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="prose prose-zinc prose-sm max-w-none text-zinc-600 leading-relaxed">
                  <ReactMarkdown>{aiResponse}</ReactMarkdown>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Categories */}
          <section className="bg-white p-8 rounded-[2rem] shadow-sm border border-zinc-200">
            <h2 className="text-xl font-display font-bold mb-8">Gastos por Categoria</h2>
            {tagData.length === 0 ? (
              <div className="text-center py-10">
                <Tag className="w-10 h-10 text-zinc-100 mx-auto mb-2" />
                <p className="text-zinc-400 text-sm">Sem categorias este mês.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {tagData.sort((a, b) => b.value - a.value).map((tag, i) => (
                  <div key={tag.name} className="group">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-bold text-zinc-700 capitalize flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        {tag.name}
                      </span>
                      <span className="text-zinc-500 font-medium">R$ {tag.value.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="h-2.5 bg-zinc-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(tag.value / totals.expense) * 100}%` }}
                        className="h-full bg-indigo-500 rounded-full group-hover:bg-indigo-600 transition-colors"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Transaction Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-zinc-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                <h2 className="text-2xl font-display font-bold text-zinc-900">
                  {editingTransaction ? 'Editar Transação' : 'Nova Transação'}
                </h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-zinc-200 rounded-full transition-colors"
                >
                  <ChevronLeft className="w-6 h-6 rotate-180 text-zinc-400" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-2">Descrição</label>
                    <input 
                      required
                      type="text" 
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                      placeholder="Ex: Aluguel, Salário, Mercado..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-2">Pertence a (Opcional)</label>
                    <input 
                      type="text" 
                      value={formData.owner}
                      onChange={e => setFormData({...formData, owner: e.target.value})}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                      placeholder="Ex: João, Empresa X, Família..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-zinc-700 mb-2">Valor (R$)</label>
                      <input 
                        required
                        type="number" 
                        step="0.01"
                        value={formData.amount}
                        onChange={e => setFormData({...formData, amount: e.target.value})}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold"
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-zinc-700 mb-2">Data</label>
                      <input 
                        required
                        type="date" 
                        value={formData.date}
                        onChange={e => setFormData({...formData, date: e.target.value})}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-zinc-700 mb-2">Tipo de Fluxo</label>
                      <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 rounded-2xl">
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, type: 'expense'})}
                          className={`py-2 rounded-xl text-xs font-bold transition-all ${formData.type === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-zinc-500'}`}
                        >
                          Saída
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, type: 'income'})}
                          className={`py-2 rounded-xl text-xs font-bold transition-all ${formData.type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-zinc-500'}`}
                        >
                          Entrada
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-zinc-700 mb-2">Status Atual</label>
                      <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 rounded-2xl">
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, status: 'pending'})}
                          className={`py-2 rounded-xl text-xs font-bold transition-all ${formData.status === 'pending' ? 'bg-white text-amber-600 shadow-sm' : 'text-zinc-500'}`}
                        >
                          Pendente
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, status: 'paid'})}
                          className={`py-2 rounded-xl text-xs font-bold transition-all ${formData.status === 'paid' ? 'bg-white text-emerald-600 shadow-sm' : 'text-zinc-500'}`}
                        >
                          Pago
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-2">Tags (Categorias)</label>
                    <input 
                      type="text" 
                      value={formData.tags}
                      onChange={e => setFormData({...formData, tags: e.target.value})}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                      placeholder="lazer, fixo, alimentação..."
                    />
                    <p className="text-[10px] text-zinc-400 mt-2 ml-1 italic">Separe as categorias por vírgula.</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-6">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-zinc-100 text-zinc-600 py-4 rounded-2xl font-bold hover:bg-zinc-200 transition-all order-2 sm:order-1"
                  >
                    Descartar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 order-1 sm:order-2"
                  >
                    {editingTransaction ? 'Atualizar Dados' : 'Confirmar Lançamento'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e4e4e7;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d4d4d8;
        }
      `}</style>
    </div>
  );
}
