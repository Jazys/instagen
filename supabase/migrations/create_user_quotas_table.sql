-- Create the user_quotas table
CREATE TABLE IF NOT EXISTS public.user_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    credits_remaining INTEGER NOT NULL DEFAULT 90,
    last_reset_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    next_reset_date TIMESTAMP WITH TIME ZONE DEFAULT (DATE_TRUNC('month', NOW()) + INTERVAL '1 month')::date,
    CONSTRAINT user_quotas_user_id_key UNIQUE (user_id)
);

-- Add RLS policy for user_quotas
ALTER TABLE public.user_quotas ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read only their own credits
CREATE POLICY "Users can view their own credits" 
    ON public.user_quotas 
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Create policy to allow service role to manage all credits
CREATE POLICY "Service role can manage all credits" 
    ON public.user_quotas 
    USING (auth.jwt() ? 'service_role');

-- Grant permissions to authenticated users
GRANT SELECT ON public.user_quotas TO authenticated; 