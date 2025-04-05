-- Create the credits_history table to track credit transactions
CREATE TABLE IF NOT EXISTS public.credits_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    transaction_type TEXT NOT NULL,
    payment_id TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policy for credits_history
ALTER TABLE public.credits_history ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read only their own credit history
CREATE POLICY "Users can view their own credit history" 
    ON public.credits_history 
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Create policy to allow service role to manage all credit history
CREATE POLICY "Service role can manage credit history" 
    ON public.credits_history 
    USING (auth.jwt() ? 'service_role');

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS credits_history_user_id_idx ON public.credits_history(user_id);

-- Grant permissions to authenticated users
GRANT SELECT ON public.credits_history TO authenticated; 