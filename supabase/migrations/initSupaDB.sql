--
-- PostgreSQL database dump
--

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: credits_usage_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credits_usage_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    action_type text NOT NULL,
    credits_used integer NOT NULL,
    credits_remaining integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    username text,
    full_name text,
    avatar_url text,
    email text NOT NULL
);


--
-- Name: user_quotas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_quotas (
    user_id uuid NOT NULL,
    credits_remaining integer DEFAULT 100 NOT NULL,
    last_reset_date timestamp with time zone DEFAULT now() NOT NULL,
    next_reset_date timestamp with time zone DEFAULT (date_trunc('month'::text, now()) + '1 mon'::interval) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: credits_usage_logs credits_usage_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credits_usage_logs
    ADD CONSTRAINT credits_usage_logs_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_email_key UNIQUE (email);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_username_key UNIQUE (username);


--
-- Name: user_quotas user_quotas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_quotas
    ADD CONSTRAINT user_quotas_pkey PRIMARY KEY (user_id);


--
-- Name: user_quotas user_quotas_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_quotas
    ADD CONSTRAINT user_quotas_user_id_key UNIQUE (user_id);


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  username_val TEXT;
  unique_username TEXT;
  counter INT := 0;
  max_attempts INT := 5;
BEGIN
  -- Get the username from metadata or fallback to email
  username_val := coalesce(new.raw_user_meta_data->>'username', '');
  
  -- If no username provided, create one from email
  IF username_val = '' THEN
    username_val := split_part(new.email, '@', 1);
  END IF;
  
  -- First try inserting with the original username
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
      username_val,
      coalesce(new.raw_user_meta_data->>'avatar_url', '')
    );
  EXCEPTION 
    WHEN unique_violation THEN
      -- If there's a username conflict, try with an incrementing number
      LOOP
        EXIT WHEN counter >= max_attempts;
        counter := counter + 1;
        unique_username := username_val || counter::text;
        
        BEGIN
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
            unique_username,
            coalesce(new.raw_user_meta_data->>'avatar_url', '')
          );
          -- If we get here, the insert succeeded
          EXIT;
        EXCEPTION 
          WHEN unique_violation THEN
            -- Keep looping
        END;
      END LOOP;
    WHEN others THEN
      -- Log other errors but don't fail the trigger
      RAISE LOG 'Error in handle_new_user creating profile: %', SQLERRM;
  END;
  
  -- Always try to create the quota regardless of profile success
  BEGIN
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
  EXCEPTION 
    WHEN unique_violation THEN
      -- Quota already exists, ignore
      RAISE LOG 'User quota already exists for user %', new.id;
    WHEN others THEN
      -- Log other errors but don't fail the trigger
      RAISE LOG 'Error in handle_new_user creating quota: %', SQLERRM;
  END;
  
  RETURN new;
END;
$$;


--
-- Name: reset_monthly_quotas(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reset_monthly_quotas() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


--
-- Name: use_credits(uuid, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.use_credits(p_user_id uuid, p_action_type text, p_credits_to_use integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;




--
-- Name: user_quotas check_quota_reset; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER check_quota_reset BEFORE UPDATE ON public.user_quotas FOR EACH ROW EXECUTE FUNCTION public.reset_monthly_quotas();

--
-- Name: auth.users on_auth_user_created; Type: TRIGGER; Schema: public; Owner: -
--
CREATE TRIGGER on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user(); 


--
-- Name: credits_usage_logs credits_usage_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credits_usage_logs
    ADD CONSTRAINT credits_usage_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_quotas user_quotas_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_quotas
    ADD CONSTRAINT user_quotas_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_quotas Enable all operations for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable all operations for all users" ON public.user_quotas USING (true) WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Public profiles are viewable by everyone.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);


--
-- Name: user_quotas Service role can manage all credits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage all credits" ON public.user_quotas USING (((auth.role() = 'service_role'::text) OR (auth.jwt() ? 'service_role'::text)));


--
-- Name: user_quotas Service role can manage all quotas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage all quotas" ON public.user_quotas USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: user_quotas Users can insert their own credits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own credits" ON public.user_quotas FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert their own profile.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: profiles Users can update own profile.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: user_quotas Users can update their own credits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own credits" ON public.user_quotas FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_quotas Users can update their own quota; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own quota" ON public.user_quotas FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: credits_usage_logs Users can view their own credit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own credit logs" ON public.credits_usage_logs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_quotas Users can view their own credits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own credits" ON public.user_quotas FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_quotas Users can view their own quota; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own quota" ON public.user_quotas FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_quotas Users can view their own quotas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own quotas" ON public.user_quotas FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: credits_usage_logs Users can view their own usage logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own usage logs" ON public.credits_usage_logs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: credits_usage_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.credits_usage_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_quotas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_quotas ENABLE ROW LEVEL SECURITY;


-- Create the generations table
CREATE TABLE public.generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enhanced_prompt TEXT NOT NULL,
  enhanced_prompt_external TEXT,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Optional metadata fields
  width INTEGER DEFAULT 1024,
  height INTEGER DEFAULT 1024
);

-- Enable Row Level Security
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read only their own generations
CREATE POLICY "Users can view their own generations"
  ON public.generations
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy for users to insert their own generations
CREATE POLICY "Users can insert their own generations"
  ON public.generations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster querying by user_id
CREATE INDEX generations_user_id_idx ON public.generations (user_id);
```