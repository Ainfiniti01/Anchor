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
    const qwenKey = Deno.env.get('QWEN_API_KEY')!

    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

    // 1. PRE-PROCESS: Calculate metrics in TypeScript
    const [urgeRes, relapseRes, profileRes] = await Promise.all([
      supabase.from('urge_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
      supabase.from('relapse_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').eq('id', user.id).single()
    ]);

    const urges = urgeRes.data || [];
    const relapses = relapseRes.data || [];
    const profile = profileRes.data || {};

    // Calculate Peak Day
    const dayCounts = Array(7).fill(0);
    urges.forEach(u => dayCounts[new Date(u.created_at).getDay()]++);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const peakDay = days[dayCounts.indexOf(Math.max(...dayCounts))];

    const metrics = {
      avg_urges_per_day: (urges.length / 7).toFixed(1),
      peak_weekday: peakDay,
      current_streak: profile.current_streak,
      best_streak: profile.best_streak_days,
      total_resisted: profile.total_resisted_urges,
      relapse_count: relapses.length,
      weekly_change: "calculating..." // Simplified for example
    };

    // 2. REASON: Send structured metrics to workspace Qwen model
    const systemPrompt = `
You are the Anchor Behavioral Intelligence Engine.
Model: Qwen-Plus (Alibaba Cloud)
Analyze these structured metrics and provide deep behavioral insights.
Return JSON: { "insights": [], "reflection": "", "confidence": 0-100 }
`;

    const qwenRes = await fetch("https://ws-12c4bsjrjqxy8v2b.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${qwenKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen3.7-max-2026-06-08",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Metrics: ${JSON.stringify(metrics)}` }
        ],
        response_format: { type: "json_object" }
      })
    });

    const qwenData = await qwenRes.json();
    const aiResult = JSON.parse(qwenData.choices[0].message.content);

    return new Response(JSON.stringify({ ...aiResult, ...metrics }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }
})