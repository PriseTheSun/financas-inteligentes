-- SQL Schema for Finance App

-- 1. Primeiro removemos as políticas antigas
DROP POLICY IF EXISTS "Allow public access" ON public.transactions;
DROP POLICY IF EXISTS "Usuários podem ver suas próprias transações" ON public.transactions;
DROP POLICY IF EXISTS "Usuários podem inserir suas próprias transações" ON public.transactions;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias transações" ON public.transactions;
DROP POLICY IF EXISTS "Usuários podem deletar suas próprias transações" ON public.transactions;

-- 2. Limpar transações antigas de "teste" que não têm um ID de usuário associado.
-- (Este é o passo que previne o erro 23502 que você encontrou!)
TRUNCATE TABLE public.transactions;

-- 3. Criar tabela (caso não exista)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    date DATE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    status TEXT NOT NULL CHECK (status IN ('paid', 'pending')),
    owner TEXT,
    tags TEXT[] DEFAULT '{}'::TEXT[]
);

-- 4. Adicionar coluna user_id e relacionar com o auth.users do Supabase
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) NOT NULL;

-- 5. Habilitar segurança a nível de linha (RLS)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 6. Criar Políticas Restritivas (Isolamento de Dados por Usuário)

-- O usuário só pode VER suas próprias transações
CREATE POLICY "Usuários podem ver suas próprias transações" 
ON public.transactions FOR SELECT 
USING (auth.uid() = user_id);

-- O usuário só pode INSERIR para si mesmo
CREATE POLICY "Usuários podem inserir suas próprias transações" 
ON public.transactions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- O usuário só pode ATUALIZAR suas próprias transações
CREATE POLICY "Usuários podem atualizar suas próprias transações" 
ON public.transactions FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- O usuário só pode DELETAR suas próprias transações
CREATE POLICY "Usuários podem deletar suas próprias transações" 
ON public.transactions FOR DELETE 
USING (auth.uid() = user_id);

-- 7. Criar um índice na data e user_id para performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, date);
