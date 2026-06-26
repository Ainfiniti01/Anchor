-- Function to decay memory confidence based on time since last use
CREATE OR REPLACE FUNCTION public.decay_memories()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Reduce confidence by 0.05 for every 7 days of inactivity
  -- Memories with importance_score >= 4 (Identity Anchors) are exempt
  UPDATE public.user_memories
  SET confidence = GREATEST(confidence - (EXTRACT(DAY FROM (NOW() - last_used_at)) / 7.0 * 0.05), 0.1)
  WHERE importance_score < 4
  AND last_used_at < NOW() - INTERVAL '7 days';

  -- Archive memories with very low confidence
  -- In a real app, we might move these to a 'history' table
  -- For now, we just keep them but they won't be retrieved by prioritized_memories
END;
$$;