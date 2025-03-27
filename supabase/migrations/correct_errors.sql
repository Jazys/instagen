-- Create user_quotas table for storing credit balances
CREATE TABLE IF NOT EXISTS public.user_quotas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_remaining INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add a unique constraint on user_id to prevent duplicate entries
ALTER TABLE public.user_quotas ADD CONSTRAINT user_quotas_user_id_key UNIQUE (user_id);

-- Create credits_usage_logs table for tracking credit transactions
CREATE TABLE IF NOT EXISTS public.credits_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  credits_used INTEGER NOT NULL,
  credits_remaining INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

-- Set up RLS (Row Level Security) policies
ALTER TABLE public.user_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits_usage_logs ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own credit balance
CREATE POLICY "Users can view their own quotas" 
  ON public.user_quotas 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Allow service role to manage all quotas
CREATE POLICY "Service role can manage all quotas" 
  ON public.user_quotas 
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Allow users to view their own credit logs
CREATE POLICY "Users can view their own credit logs" 
  ON public.credits_usage_logs 
  FOR SELECT 
  USING (auth.uid() = user_id);