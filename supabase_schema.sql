-- SQL Schema for Finance App
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- Create the transactions table
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

-- Enable Row Level Security (RLS)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows anyone to read/write (for demo purposes)
-- In a real app, you would restrict this to authenticated users
CREATE POLICY "Allow public access" ON public.transactions
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Optional: Create an index on date for faster queries
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date);
