import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from Auth header
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const { message } = await req.json()

    // Fetch full context from Memory System
    const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', user.id).single()
    const { data: summary } = await supabaseClient.from('user_ai_summaries').select('*').eq('user_id', user.id).single()
    const { data: memories } = await supabaseClient.from('user_memories').select('*').eq('user_id', user.id).order('importance_score', { ascending: false }).limit(5)

    const prompt = `
You are Anchor, an AI behavioral companion.

AI STYLE: ${profile?.ai_tone ?? "Supportive Friend"}

USER PROFILE:
- Focus: ${profile?.habit_type}
- Risk Level: ${profile?.risk_level} (Score: ${profile?.risk_score}/10)
- Streak: ${profile?.current_streak} days

COMPRESSED MEMORY (AI SUMMARY):
- Emotional Profile: ${summary?.emotional_profile ?? "New user"}
- Motivation: ${summary?.motivation_summary ?? "Not yet analyzed"}
- Patterns: ${summary?.relapse_pattern_summary ?? "No patterns detected"}

PERSONAL MEMORIES/GOALS:
${memories?.map(m => `- [${m.memory_type}] ${m.content}`).join('\n') ?? "None shared yet"}

USER MESSAGE:
${message}

RULES:
1. Adapt tone to ${profile?.ai_tone}.
2. Use personal goals/memories to reinforce identity.
3. Ask ONLY ONE reflective question.
4. Keep it short (1-2 paragraphs).
5. Never judge.
`

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("GROQ_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-70b-versatile",
        messages: [
          { role: "system", content: "You are Anchor, a supportive accountability companion." },
          { role: "user", content: prompt }
        ]
      }),
    })

    const data = await response.json()
    return new Response(JSON.stringify({ reply: data.choices[0].message.content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })

  } catch (error: any) {
    console.error("[chat-ai] Error:", error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }
})