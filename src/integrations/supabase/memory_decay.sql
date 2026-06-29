-- Function to apply decay to memories
-- Memories lose confidence over time unless they are reinforced or are 'Identity Anchors' (Importance >= 4)
CREATE OR REPLACE FUNCTION public.apply_memory_decay()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_memories
  SET confidence = GREATEST(confidence - 0.05, 0.1)
  WHERE importance_score < 4 -- Identity Anchors don't decay
    AND last_used_at < NOW() - INTERVAL '7 days';
    
  -- Archive memories with very low confidence
  DELETE FROM public.user_memories
  WHERE confidence <= 0.1
    AND importance_score < 3;
END;
$$;

-- Ensure memory_type can handle 'achievement' and 'experience'
-- (Already exists as TEXT, but good to keep in mind)