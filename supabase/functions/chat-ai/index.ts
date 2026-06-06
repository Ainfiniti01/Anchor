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
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

    const { message } = await req.json()

    // 1. Fetch Context Data
    const [profileRes, summaryRes, memoriesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('user_ai_summaries').select('*').eq('user_id', user.id).single(),
      supabase.from('user_memories').select('*').eq('user_id', user.id).gte('importance_score', 3).order('importance_score', { ascending: false }).limit(5)
    ])

    const profile = profileRes.data
    const summary = summaryRes.data
    const memories = memoriesRes.data

    const prompt = `
You are Anchor, a supportive accountability companion.
STYLE: ${profile.ai_tone}
RISK: ${profile.risk_level} (${profile.risk_score}/10)

SUMMARY: ${summary?.emotional_profile ?? "New user"}
IDENTITY ANCHORS:
${memories?.map(m => `- [Priority ${m.importance_score}] ${m.content}`).join('\n')}

USER: ${message}

RULES:
- Use Priority 4-5 memories as "Identity Anchors".
- Ask ONE reflective question.
- Keep it short and human-like.
- Never judge or shame.
`

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${Deno.env.get("GROQ_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.1-70b-versatile",
        messages: [{ role: "system", content: "You are Anchor, a supportive companion." }, { role: "user", content: prompt }]
      }),
    })

    const data = await response.json()
    const aiReply = data.choices[0].message.content

    // 2. Increment Counter & Trigger Compression if needed
    const newCount = (profile.messages_since_last_summary || 0) + 1
    await supabase.from('profiles').update({ messages_since_last_summary: newCount }).eq('id', user.id)

    if (newCount >= 10) {
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/summarize-memory`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id })
      }).catch(e => console.error("Summary trigger failed", e))
    }

    return new Response(JSON.stringify({ reply: aiReply }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }
})