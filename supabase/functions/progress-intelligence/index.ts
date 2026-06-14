import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const groqKey = Deno.env.get('GROQ_API_KEY')!

    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

    // 1. Fetch Data
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const [urgeRes, logRes, profileRes] = await Promise.all([
      supabase.from('urge_logs').select('*').eq('user_id', user.id).gte('created_at', sevenDaysAgo.toISOString()),
      supabase.from('behavioral_logs').select('*').eq('user_id', user.id).gte('created_at', sevenDaysAgo.toISOString()),
      supabase.from('profiles').select('*').eq('id', user.id).single()
    ])

    const urges = urgeRes.data || []
    const logs = logRes.data || []
    const profile = profileRes.data || {}

    // 2. Prepare Data for AI
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const dailyUrges = Array(7).fill(0)
    const dailyRelapses = Array(7).fill(false)
    
    urges.forEach(u => {
      const dayIndex = new Date(u.created_at).getDay()
      dailyUrges[dayIndex]++
    })

    logs.forEach(l => {
      const dayIndex = new Date(l.created_at).getDay()
      if (l.relapse_occurred) dailyRelapses[dayIndex] = true
    })

    const systemPrompt = `
You are Anchor Progress Intelligence Engine.
Your role is to power the user's Progress Page by analyzing behavioral data and producing structured insights.
You do NOT motivate, praise excessively, or assume emotions.
You ONLY analyze patterns and present grounded, evidence-based summaries.

TASK OBJECTIVE:
Generate a "Behavior Snapshot" that helps the user understand:
- What is happening in their behavior
- When it happens
- How often it happens
- Whether it is improving or worsening
NOT why it happens (do not guess causes).

CORE OUTPUT STRUCTURE:
Return JSON only:
{
  "weekly_urge_pattern": {
    "data": [0-7 daily values],
    "trend": "increasing | decreasing | stable",
    "most_active_day": "string",
    "confidence": number (0-100)
  },
  "resistance_metrics": {
    "resisted_urges_total": number,
    "resistance_ratio": number
  },
  "relapse_analysis": {
    "relapse_days": number,
    "recent_relapse_pattern": "string"
  },
  "streaks": {
    "current_streak": number,
    "best_streak": number,
    "recovery_streak": number
  },
  "insights": ["string", "string", "string"],
  "emotional_snapshot": {
    "calm_days": number,
    "high_urge_days": number,
    "stress_level": "low | medium | high | unknown"
  }
}

INSIGHT RULES:
- Only generate insights if confidence ≥ 60
- Insights must be: factual, short, non-emotional, non-judgmental.
- Do NOT infer psychology or create narratives.
`;

    const userPrompt = `
INPUT DATA:
- Daily Urges: ${JSON.stringify(dailyUrges)}
- Daily Relapses: ${JSON.stringify(dailyRelapses)}
- Current Streak: ${profile.current_streak || 0}
- Best Streak: ${profile.best_streak || 0}
- Behavioral Logs: ${JSON.stringify(logs.map(l => ({ mood: l.mood_score, urge: l.urge_level })))}
`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.1
      })
    })

    const groqData = await groqRes.json()
    const result = JSON.parse(groqData.choices[0].message.content)

    return new Response(JSON.stringify(result), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }
})