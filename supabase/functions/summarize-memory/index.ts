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
    
    const { user_id } = await req.json()
    console.log(`[summarize-memory] Starting compression for user: ${user_id}`)

    // 1. Fetch last 50 messages + logs
    const [messagesRes, logsRes, profileRes] = await Promise.all([
      supabase.from('chat_messages').select('*').eq('user_id', user_id).order('created_at', { ascending: false }).limit(50),
      supabase.from('behavioral_logs').select('*').eq('user_id', user_id).order('created_at', { ascending: false }).limit(50),
      supabase.from('profiles').select('*').eq('id', user_id).single()
    ])

    const prompt = `
Summarize this user into a behavioral intelligence profile.
Return JSON ONLY.

{
  "emotional_profile": "string",
  "motivation_summary": "string",
  "relapse_pattern_summary": "string",
  "risk_behavior_patterns": "string",
  "metadata": { "key_triggers": [], "progress_notes": "string" }
}

USER PROFILE: ${JSON.stringify(profileRes.data)}
MESSAGES: ${JSON.stringify(messagesRes.data)}
LOGS: ${JSON.stringify(logsRes.data)}
`

    const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("GROQ_API_KEY")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: "You are a behavioral data analyst." }, { role: "user", content: prompt }]
      })
    })

    const data = await aiRes.json()
    const summary = JSON.parse(data.choices[0].message.content)

    // 2. Save structured summary
    await supabase.from('user_ai_summaries').upsert({
      user_id,
      ...summary,
      last_updated: new Date().toISOString()
    })

    // 3. Reset counter
    await supabase.from('profiles').update({ messages_since_last_summary: 0 }).eq('id', user_id)

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
  } catch (error: any) {
    console.error("[summarize-memory] Error:", error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }
})