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
    const qwenKey = Deno.env.get('QWEN_API_KEY') || Deno.env.get('GROQ_API_KEY')!

    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

    // Fetch behavioral data
    const { data: urges } = await supabase.from('urge_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

    const systemPrompt = `
You are the Anchor Behavioral Intelligence Engine.
Model: Qwen-Plus (Alibaba Cloud)
Analyze the user's urge patterns and provide statistical insights.
Return JSON: { "insights": [], "reflection": "", "confidence": 0-100 }
`;

    const qwenRes = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${qwenKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen-plus",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Data: ${JSON.stringify(urges)}; Profile: ${JSON.stringify(profile)}` }
        ],
        response_format: { type: "json_object" }
      })
    });

    const qwenData = await qwenRes.json();
    const aiResult = JSON.parse(qwenData.choices[0].message.content);

    // Merge with existing logic...
    return new Response(JSON.stringify({ ...aiResult, streaks: { current_streak: profile.current_streak } }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }
})