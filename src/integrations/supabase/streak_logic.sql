-- Function to update user streak
CREATE OR REPLACE FUNCTION public.update_user_streak()
RETURNS TRIGGER AS $$
DECLARE
  v_last_check_in TIMESTAMP WITH TIME ZONE;
  v_current_streak INTEGER;
BEGIN
  -- Get the last check-in time and current streak
  SELECT last_check_in, current_streak INTO v_last_check_in, v_current_streak
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- If it's the first check-in or the last check-in was yesterday
  IF v_last_check_in IS NULL OR v_last_check_in < CURRENT_DATE THEN
    IF v_last_check_in >= CURRENT_DATE - INTERVAL '1 day' THEN
      -- Increment streak
      UPDATE public.profiles 
      SET current_streak = current_streak + 1,
          last_check_in = NOW(),
          best_streak = GREATEST(best_streak, current_streak + 1)
      WHERE id = NEW.user_id;
    ELSE
      -- Reset streak if more than a day has passed
      UPDATE public.profiles 
      SET current_streak = 1,
          last_check_in = NOW(),
          best_streak = GREATEST(best_streak, 1)
      WHERE id = NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for streak update
DROP TRIGGER IF EXISTS on_check_in_streak ON public.behavioral_logs;
CREATE TRIGGER on_check_in_streak
  AFTER INSERT ON public.behavioral_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_user_streak();

-- Refine risk calculation to be more sensitive to high intensity
CREATE OR REPLACE FUNCTION public.calculate_user_risk(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_latest_mood INTEGER;
  v_latest_urge INTEGER;
  v_relapse_count INTEGER;
  v_final_score FLOAT;
  v_level TEXT;
BEGIN
  -- Get the most recent log values instead of just averages to be more responsive
  SELECT mood_score, urge_level INTO v_latest_mood, v_latest_urge
  FROM public.behavioral_logs
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT COUNT(*) INTO v_relapse_count
  FROM public.behavioral_logs
  WHERE user_id = p_user_id AND relapse_occurred = TRUE AND created_at > NOW() - INTERVAL '7 days';

  -- Calculation: High weight on latest urge and mood
  v_final_score := LEAST(GREATEST((ABS(COALESCE(v_latest_mood, 0)) * 2.0) + (COALESCE(v_latest_urge, 0) * 3.0) + (v_relapse_count * 2.0), 0), 10);
  
  v_level := CASE 
    WHEN v_final_score < 3 THEN 'low'
    WHEN v_final_score < 5 THEN 'medium'
    WHEN v_final_score < 8 THEN 'high'
    ELSE 'critical'
  END;

  -- Update Profile
  UPDATE public.profiles SET risk_score = v_final_score, risk_level = v_level WHERE id = p_user_id;

  -- Log History
  INSERT INTO public.user_risk_history (user_id, risk_score, risk_level, reason)
  VALUES (p_user_id, v_final_score, v_level, jsonb_build_object(
    'latest_mood', v_latest_mood,
    'latest_urge', v_latest_urge,
    'relapse_count', v_relapse_count,
    'calculated_at', NOW()
  ));
END;
$function$;