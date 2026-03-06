'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, LogIn, UserPlus, ShieldCheck, KeyRound, AlertCircle, CheckCircle } from 'lucide-react';

type AuthView = 'sign_in' | 'sign_up' | 'forgot_password';

export default function Auth() {
  const [view, setView] = useState<AuthView>('sign_in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (view === 'sign_in') {
        const { error, data } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.includes('Email not confirmed')) {
             throw new Error("Por favor, verifique seu e-mail e clique no link de confirmação antes de entrar.");
          }
          throw error;
        }
      } else if (view === 'sign_up') {
        
        // Supabase will send an email to the user if "Confirm Email" is ENABLED in the dashboard.
        const { error, data } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            // This is crucial for the email link to redirect back to the app 
            // instead of a 404 page or localhost when deployed.
            emailRedirectTo: window.location.origin, 
          }
        });
        
        if (error) throw error;
        
        if (data.user && data.user.identities && data.user.identities.length === 0) {
           setError('Este e-mail já está em uso.');
        } else {
           setSuccess('Pronto! Acabamos de enviar um e-mail de confirmação para você. Vá até sua caixa de entrada, clique no link e depois faça login aqui.');
        }

      } else if (view === 'forgot_password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSuccess('Instruções de recuperação foram enviadas para seu e-mail.');
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-400/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-600 to-emerald-500 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/30 mb-6"
        >
          <ShieldCheck className="w-8 h-8 text-white" />
        </motion.div>
        
        <h2 className="mt-2 text-center text-3xl font-display font-extrabold text-zinc-900 tracking-tight">
          Finanças Inteligentes
        </h2>
        <p className="mt-2 text-center text-sm font-medium text-zinc-500 px-4">
          Sua carteira pessoal, segura e com inteligência artificial para otimizar seus gastos.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <motion.div 
          initial={{ y: 20, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          transition={{ delay: 0.1 }}
          className="bg-white/80 backdrop-blur-xl py-8 px-4 shadow-2xl sm:rounded-[2rem] sm:px-10 border border-white/50"
        >
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{error}</p>
              </motion.div>
            )}
            
            {success && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-start gap-3"
              >
                <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{success}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form className="space-y-5" onSubmit={handleAuth}>
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-zinc-700 ml-1 mb-1.5">
                E-mail
              </label>
              <div className="mt-1 relative rounded-2xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-zinc-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-zinc-900 placeholder:text-zinc-400"
                  placeholder="voce@exemplo.com"
                />
              </div>
            </div>

            {view !== 'forgot_password' && (
              <div>
                <label htmlFor="password" className="block text-sm font-bold text-zinc-700 ml-1 mb-1.5">
                  Senha
                </label>
                <div className="mt-1 relative rounded-2xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-zinc-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={view === 'sign_in' ? 'current-password' : 'new-password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-zinc-900 placeholder:text-zinc-400"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            {view === 'sign_in' && (
              <div className="flex items-center justify-end">
                <div className="text-sm">
                  <button type="button" onClick={() => setView('forgot_password')} className="font-bold text-indigo-600 hover:text-indigo-500 transition-colors">
                    Esqueceu sua senha?
                  </button>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-2xl shadow-lg shadow-indigo-500/20 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {view === 'sign_in' && <><LogIn className="w-5 h-5" /> Entrar na conta</>}
                    {view === 'sign_up' && <><UserPlus className="w-5 h-5" /> Criar conta agora</>}
                    {view === 'forgot_password' && <><KeyRound className="w-5 h-5" /> Recuperar senha</>}
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 w-full border-t border-zinc-100 flex p-1 bg-zinc-100 rounded-2xl mt-6 relative overflow-hidden">
            <button
              onClick={() => { setView('sign_in'); setError(null); setSuccess(null); }}
              className={`flex-1 relative z-10 py-2.5 text-xs font-bold rounded-xl transition-all ${view === 'sign_in' ? 'text-indigo-700 shadow-sm bg-white' : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              Login
            </button>
            <button
              onClick={() => { setView('sign_up'); setError(null); setSuccess(null); }}
              className={`flex-1 relative z-10 py-2.5 text-xs font-bold rounded-xl transition-all ${view === 'sign_up' ? 'text-indigo-700 shadow-sm bg-white' : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              Cadastro
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
