'use client';

import { useEffect, useState } from 'react';
import FinanceApp from '@/components/FinanceApp';
import Auth from '@/components/Auth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col justify-center items-center">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="mt-4 text-zinc-500 font-medium">Carregando carteira eletrônica...</p>
      </div>
    );
  }

  // If Supabase is not configured, we just render FinanceApp for local storage
  if (!isSupabaseConfigured || session) {
    return (
      <main>
        <FinanceApp session={session} />
      </main>
    );
  }

  // If Supabase is configured but no session, show Auth
  return <Auth />;
}
