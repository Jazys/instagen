CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    username,
    avatar_url
  )
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'username', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  
  -- Insert into user_quotas table
  INSERT INTO public.user_quotas (
    user_id, 
    credits_remaining, 
    last_reset_date, 
    next_reset_date
  )
  VALUES (
    new.id, 
    100, 
    now(), 
    (date_trunc('month', now()) + interval '1 month')
  );
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;