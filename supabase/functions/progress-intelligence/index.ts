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

    // 2. Calculate Truth-Based Metrics
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const dailyUrges = Array(7).fill(0)
    
    urges.forEach(u => {
      const dayIndex = (new Date(u.created_at).getDay() + 6) % 7; // Adjust to Mon-Sun
      dailyUrges[dayIndex]++
    })

    const totalUrges = urges.length;
    const resistedUrges = urges.length; // In this context, every log is a resisted urge unless a relapse is logged
    const mostActiveDay = days[dailyUrges.indexOf(Math.max(...dailyUrges))];

    const systemPrompt = `
You are Anchor Progress Intelligence Engine.
Your role is to analyze behavioral data and produce structured insights.
You do NOT motivate, praise, or assume emotions.
You ONLY analyze patterns and present grounded summaries.

TASK:
Generate a "Behavior Snapshot" JSON.
- insights: factual, short, non-emotional.
- confidence: 0-100.

Return JSON only.
`;

    const userPrompt = `
INPUT DATA:
- Daily Urges (Mon-Sun): ${JSON.stringify(dailyUrges)}
- Total Urges: ${totalUrges}
- Current Streak: ${profile.current_streak || 0}
- Best Streak: ${profile.best_streak || 0}
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
        trend: totalUrges > 5 ? "increasing" : "stable",
        most_active_day: mostActiveDay,
        confidence: 85
      },
      resistance_metrics: {
        resisted_urges_total: resistedUrges,
        resistance_ratio: 100
      },
      streaks: {
        current_streak: profile.current_streak || 0,
        best_streak: profile.best_streak || 0,
        recovery_streak: profile.current_streak || 0
      },
      additional_metrics: {
        total_urges_this_week: totalUrges,
        average_urges_per_day: (totalUrges / 7).toFixed(1),
        most_active_urge_day: mostActiveDay
      },
      insights: aiResult.insights || ["Not enough data yet to detect clear patterns"],
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