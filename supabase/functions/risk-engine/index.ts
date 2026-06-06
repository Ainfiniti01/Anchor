import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { user_id, mood_score, urge_level, timestamp } = await req.json()
    let risk = 0

    // Emotional scoring (mood_score: 1 to -3)
    if (mood_score === -1) risk += 1 // stressed
    if (mood_score === -2) risk += 2 // anxious
    if (mood_score === -3) risk += 3 // hopeless

    // Urge scoring (urge_level: 0 to 2)
    if (urge_level === 1) risk += 2 // medium
    if (urge_level === 2) risk += 4 // high

    // Time risk (night relapse 9PM - 3AM)
    const hour = new Date(timestamp).getHours()
    if (hour >= 21 || hour <= 3) risk += 2

    let level = "low"
    if (risk >= 3) level = "medium"
    if (risk >= 6) level = "high"
    if (risk >= 9) level = "critical"

    // Update profile
    await supabase.from('profiles').update({
      risk_score: risk,
      risk_level: level
    }).eq('id', user_id)

    // Store history
    await supabase.from('user_risk_history').insert({
      user_id,
      risk_score: risk,
      risk_level: level,
      reason: { mood_score, urge_level, hour, calculated_at: new Date().toISOString() }
    })

    return new Response(JSON.stringify({ risk, level }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }
})