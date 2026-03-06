import { useState, useEffect, useCallback } from 'react';
import { Transaction, TransactionStatus, TransactionType } from '@/lib/types';
import { transactionModel } from '@/lib/models/transactionModel';
import { isSupabaseConfigured } from '@/lib/supabase';
import { format } from 'date-fns';

export function useFinanceController() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [supabaseStatus, setSupabaseStatus] = useState<'idle' | 'checking' | 'connected' | 'error' | 'not-configured'>('idle');
  const [supabaseErrorMessage, setSupabaseErrorMessage] = useState<string | null>(null);
  const [supabaseErrorCode, setSupabaseErrorCode] = useState<string | null>(null);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    
    if (!isSupabaseConfigured) {
      setSupabaseStatus('not-configured');
    } else {
      setSupabaseStatus('checking');
    }

    try {
      if (isSupabaseConfigured) {
        const data = await transactionModel.getAll();
        setTransactions(data);
        setSupabaseStatus('connected');
        setSupabaseErrorMessage(null);
        setSupabaseErrorCode(null);
      } else {
        const saved = localStorage.getItem('financas_data');
        if (saved) {
          setTransactions(JSON.parse(saved));
        } else {
          setTransactions([]);
        }
      }
    } catch (err: any) {
      console.error('Error loading transactions:', err);
      setSupabaseStatus('error');
      setSupabaseErrorMessage(err.message || 'Erro desconhecido');
      setSupabaseErrorCode(err.code || 'CONNECTION_FAILED');
      
      // Fallback
      const saved = localStorage.getItem('financas_data');
      if (saved) setTransactions(JSON.parse(saved));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Sync to localStorage as backup
  useEffect(() => {
    if (transactions.length > 0) {
      localStorage.setItem('financas_data', JSON.stringify(transactions));
    }
  }, [transactions]);

  const addTransaction = async (data: Omit<Transaction, 'id'>) => {
    try {
      if (isSupabaseConfigured) {
        const newTransaction = await transactionModel.create(data);
        setTransactions(prev => [...prev, newTransaction]);
      } else {
        const newLocal = { ...data, id: Math.random().toString(36).substr(2, 9) } as Transaction;
        setTransactions(prev => [...prev, newLocal]);
      }
    } catch (err: any) {
      setSupabaseErrorMessage(err.message);
      throw err;
    }
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    try {
      if (isSupabaseConfigured) {
        const updated = await transactionModel.update(id, updates);
        setTransactions(prev => prev.map(t => t.id === id ? updated : t));
      } else {
        setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      }
    } catch (err: any) {
      setSupabaseErrorMessage(err.message);
      throw err;
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      if (isSupabaseConfigured) {
        await transactionModel.delete(id);
      }
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (err: any) {
      setSupabaseErrorMessage(err.message);
      throw err;
    }
  };

  const toggleTransactionStatus = async (id: string) => {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;

    const nextStatus: TransactionStatus = transaction.status === 'paid' ? 'pending' : 'paid';
    await updateTransaction(id, { status: nextStatus });
  };

  return {
    transactions,
    loading,
    supabaseStatus,
    supabaseErrorMessage,
    supabaseErrorCode,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    toggleTransactionStatus,
    refresh: loadTransactions
  };
}
