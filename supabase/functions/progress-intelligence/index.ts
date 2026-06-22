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
    const now = new Date()
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(now.getDate() - 7)

    const [urgeRes, relapseRes, logRes, profileRes] = await Promise.all([
      supabase.from('urge_logs').select('*').eq('user_id', user.id).gte('created_at', sevenDaysAgo.toISOString()),
      supabase.from('relapse_logs').select('*').eq('user_id', user.id).gte('created_at', sevenDaysAgo.toISOString()),
      supabase.from('behavioral_logs').select('*').eq('user_id', user.id).gte('created_at', sevenDaysAgo.toISOString()),
      supabase.from('profiles').select('*').eq('id', user.id).single()
    ])

    const urges = urgeRes.data || []
    const relapses = relapseRes.data || []
    const logs = logRes.data || []
    const profile = profileRes.data || {}

    // 2. Calculate Truth-Based Metrics
    const dailyUrges = Array(7).fill(0)
    const relapseIndices = []
    
    urges.forEach(u => {
      const day = (new Date(u.created_at).getDay() + 6) % 7; // Mon=0, Sun=6
      dailyUrges[day]++
    })

    relapses.forEach(r => {
      const day = (new Date(r.created_at).getDay() + 6) % 7;
      relapseIndices.push(day)
    })

    const totalUrges = urges.length
    const resistedUrges = urges.filter(u => u.resisted !== false).length
    const avgUrges = (totalUrges / 7).toFixed(1)

    const systemPrompt = `
You are Anchor Progress Intelligence Engine.
Analyze behavioral data and produce structured insights.
Return JSON only.

LIGHT INTELLIGENCE LAYER RULES:
- Generate simple insights ONLY from real numeric patterns.
- Insights must be factual, statistical, and non-judgmental.
- NEVER make psychological conclusions or emotional labeling.
- NEVER make predictive claims without history.
- If confidence is low or data is insufficient, return "Not enough data yet to detect reliable patterns."

Return JSON:
{
  "insights": ["string"],
  "reflection": "string",
  "confidence": number
}
`;

    const userPrompt = `
DATA:
- Daily Urges (Mon-Sun): ${JSON.stringify(dailyUrges)}
- Relapse Days: ${JSON.stringify(relapseIndices)}
- Total Resisted: ${profile.total_resisted_urges}
- Current Streak: ${profile.current_streak}
- Best Streak: ${profile.best_streak_days}
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
    const aiResult = JSON.parse(groqData.choices[0].message.content)

    const finalResult = {
      weekly_urge_pattern: {
        data: dailyUrges,
        trend: totalUrges > 5 ? (dailyUrges[6] > dailyUrges[0] ? "increasing" : "decreasing") : "stable",
        confidence: aiResult.confidence
      },
      resistance_metrics: {
        resisted_urges_total: profile.total_resisted_urges || resistedUrges,
        resistance_ratio: totalUrges > 0 ? Math.round((resistedUrges / totalUrges) * 100) : 100
      },
      relapse_analysis: {
        relapse_days_indices: relapseIndices,
        total_relapses: profile.total_relapses || 0
      },
      streaks: {
        current_streak: profile.current_streak || 0,
        best_streak: profile.best_streak_days || 0,
        recovery_streak: profile.current_streak || 0
      },
      additional_metrics: {
        average_urges_per_day: avgUrges
      },
      insights: aiResult.confidence >= 60 ? aiResult.insights : ["Not enough data yet to detect reliable patterns."],
      reflection: aiResult.reflection,
      achievements: [], // Achievements handled by logic, not AI
      emotional_snapshot: {
        calm_days: logs.filter(l => l.mood_score > 0).length,
        high_urge_days: dailyUrges.filter(u => u > 2).length,
        stress_level: "low"
      }
    };

    return new Response(JSON.stringify(finalResult), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }
})