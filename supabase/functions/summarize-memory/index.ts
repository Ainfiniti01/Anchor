import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { user_id } = await req.json()

    // Fetch raw data for compression
    const { data: logs } = await supabase.from('behavioral_logs').select('*').eq('user_id', user_id).order('created_at', { ascending: false }).limit(20)
    const { data: messages } = await supabase.from('chat_messages').select('*').eq('user_id', user_id).order('created_at', { ascending: false }).limit(20)

    const prompt = `
Summarize the following user data into a structured JSON format for an AI accountability companion.
LOGS: ${JSON.stringify(logs)}
MESSAGES: ${JSON.stringify(messages)}

OUTPUT JSON FORMAT:
{
  "emotional_profile": "string",
  "motivation_summary": "string",
  "relapse_pattern_summary": "string",
  "risk_behavior_patterns": "string",
  "metadata": { "key_triggers": [], "progress_notes": "string" }
}
`

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${Deno.env.get("GROQ_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: "You are a behavioral data analyst." }, { role: "user", content: prompt }]
      }),
    })

    const aiResult = await response.json()
    const summary = JSON.parse(aiResult.choices[0].message.content)

    // Update the summary table
    await supabase.from('user_ai_summaries').upsert({
      user_id,
      ...summary,
      last_updated: new Date().toISOString()
    })

    // Reset counter
    await supabase.from('profiles').update({ messages_since_last_summary: 0 }).eq('id', user_id)

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }
})