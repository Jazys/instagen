-- Fix the function that's causing the type mismatch error
CREATE OR REPLACE FUNCTION public.reset_monthly_quotas()
RETURNS TRIGGER AS $$
DECLARE
  -- Rename the variable to avoid conflict with PostgreSQL's current_time function
  current_ts TIMESTAMP WITH TIME ZONE := now();
BEGIN
  -- Only reset if we've passed the next_reset_date
  IF current_ts >= NEW.next_reset_date THEN
    NEW.credits_remaining := 100; -- Reset to default quota
    NEW.last_reset_date := current_ts;
    NEW.next_reset_date := date_trunc('month', current_ts) + interval '1 month';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;