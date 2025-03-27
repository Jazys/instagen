-- Create user_quotas table to track quota usage
CREATE TABLE public.user_quotas (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_remaining INTEGER NOT NULL DEFAULT 100,
  last_reset_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  next_reset_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create credits_usage_logs table to track individual credit usages
CREATE TABLE public.credits_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  credits_used INTEGER NOT NULL,
  credits_remaining INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Set up Row Level Security
ALTER TABLE public.user_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits_usage_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for user_quotas
CREATE POLICY "Users can view their own quota"
  ON public.user_quotas FOR SELECT
  USING (auth.uid() = user_id);

-- Only allow the service role or the user themselves to update their quota
CREATE POLICY "Users can update their own quota"
  ON public.user_quotas FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policies for credits_usage_logs
CREATE POLICY "Users can view their own usage logs"
  ON public.credits_usage_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Create trigger to automatically create quota when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_quotas (user_id, credits_remaining, last_reset_date, next_reset_date)
  VALUES (new.id, 100, now(), (date_trunc('month', now()) + interval '1 month'));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to reset quotas at the beginning of each month
CREATE OR REPLACE FUNCTION public.reset_monthly_quotas()
RETURNS TRIGGER AS $$
DECLARE
  current_time TIMESTAMP WITH TIME ZONE := now();
BEGIN
  -- Only reset if we've passed the next_reset_date
  IF current_time >= NEW.next_reset_date THEN
    NEW.credits_remaining := 100; -- Reset to default quota
    NEW.last_reset_date := current_time;
    NEW.next_reset_date := date_trunc('month', current_time) + interval '1 month';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to check for quota reset on user_quotas updates
DROP TRIGGER IF EXISTS check_quota_reset ON public.user_quotas;
CREATE TRIGGER check_quota_reset
  BEFORE UPDATE ON public.user_quotas
  FOR EACH ROW EXECUTE FUNCTION public.reset_monthly_quotas();

-- Create a function for safely using credits
CREATE OR REPLACE FUNCTION public.use_credits(
  p_user_id UUID, 
  p_action_type TEXT, 
  p_credits_to_use INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_current_credits INTEGER;
  v_updated_row public.user_quotas;
  v_result JSONB;
BEGIN
  -- First check if quota needs to be reset
  UPDATE public.user_quotas 
  SET updated_at = now() 
  WHERE user_id = p_user_id
  RETURNING * INTO v_updated_row;
  
  -- Get current credits after potential reset
  SELECT credits_remaining INTO v_current_credits
  FROM public.user_quotas
  WHERE user_id = p_user_id;
  
  -- Check if user has enough credits
  IF v_current_credits >= p_credits_to_use THEN
    -- Update credits
    UPDATE public.user_quotas
    SET 
      credits_remaining = credits_remaining - p_credits_to_use,
      updated_at = now()
    WHERE user_id = p_user_id
    RETURNING * INTO v_updated_row;
    
    -- Log usage
    INSERT INTO public.credits_usage_logs(
      user_id, action_type, credits_used, credits_remaining
    ) VALUES (
      p_user_id, p_action_type, p_credits_to_use, v_updated_row.credits_remaining
    );
    
    -- Return success result
    v_result := jsonb_build_object(
      'success', true,
      'credits_used', p_credits_to_use,
      'credits_remaining', v_updated_row.credits_remaining,
      'next_reset_date', v_updated_row.next_reset_date
    );
  ELSE
    -- Return failure result
    v_result := jsonb_build_object(
      'success', false,
      'credits_remaining', v_current_credits,
      'credits_required', p_credits_to_use,
      'next_reset_date', v_updated_row.next_reset_date,
      'message', 'Insufficient credits'
    );
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 