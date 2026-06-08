-- 1. Ensure pgcrypto is available for PIN hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Table for tracking AI interaction outcomes
CREATE TABLE IF NOT EXISTS public.interaction_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id TEXT, 
  is_helpful BOOLEAN NOT NULL,
  feedback_text TEXT,
  context_tags TEXT[], 
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add learned_preferences to profiles for AI adaptation
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS learned_preferences JSONB DEFAULT '{}'::jsonb;

-- 4. Grants for feedback table
GRANT SELECT, INSERT, UPDATE ON TABLE public.interaction_feedback TO authenticated;
GRANT ALL ON TABLE public.interaction_feedback TO service_role;

-- 5. RLS for feedback
ALTER TABLE public.interaction_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own feedback" ON public.interaction_feedback
FOR ALL TO authenticated USING (auth.uid() = user_id);

-- 6. Robust PIN Functions (Fixing the "Incorrect PIN" bug)
CREATE OR REPLACE FUNCTION public.set_user_pin(p_pin text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Ensure the private_security table exists and is accessible
  INSERT INTO public.private_security (id, pin_hash)
  VALUES (auth.uid(), crypt(p_pin, gen_salt('bf')))
  ON CONFLICT (id) DO UPDATE
  SET pin_hash = crypt(p_pin, gen_salt('bf')),
      updated_at = NOW();
      
  -- Mark in profile that PIN is set
  UPDATE public.profiles SET privacy_lock_type = 'pin' WHERE id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_user_pin(p_pin text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
DECLARE
  v_hash text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT pin_hash INTO v_hash
  FROM public.private_security
  WHERE id = auth.uid();
  
  IF v_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN crypt(p_pin, v_hash) = v_hash;
END;
$$;