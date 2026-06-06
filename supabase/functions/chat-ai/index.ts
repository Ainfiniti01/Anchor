import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const groqKey = Deno.env.get('GROQ_API_KEY')

    if (!supabaseUrl || !supabaseKey || !groqKey) {
      console.error("[chat-ai] Missing environment variables");
      throw new Error("Server configuration error");
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Authenticate user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error("[chat-ai] No authorization header");
      return new Response(JSON.stringify({ error: 'No authorization header' }), { status: 401, headers: corsHeaders })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error("[chat-ai] Auth error:", authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const { message } = await req.json()
    console.log(`[chat-ai] Processing message for user: ${user.id}`);

    // 1. Fetch Context Data with error handling
    const [profileRes, summaryRes, memoriesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('user_ai_summaries').select('*').eq('user_id', user.id).single(),
      supabase.from('user_memories').select('*').eq('user_id', user.id).gte('importance_score', 3).order('importance_score', { ascending: false }).limit(5)
    ])

    if (profileRes.error && profileRes.error.code !== 'PGRST116') {
      console.error("[chat-ai] Profile fetch error:", profileRes.error);
    }

    const profile = profileRes.data || { ai_tone: 'supportive', habit_type: 'unknown', risk_level: 'low', risk_score: 0 };
    const summary = summaryRes.data;
    const memories = memoriesRes.data || [];

    const prompt = `
You are Anchor, a supportive accountability companion.
STYLE: ${profile.ai_tone || 'supportive'}
RISK: ${profile.risk_level || 'low'} (${profile.risk_score || 0}/10)

SUMMARY: ${summary?.emotional_profile ?? "New user - no history yet."}
IDENTITY ANCHORS:
${memories.length > 0 ? memories.map(m => `- [Priority ${m.importance_score}] ${m.content}`).join('\n') : "No identity anchors set yet."}

USER: ${message}

RULES:
- Use Priority 4-5 memories as "Identity Anchors" if available.
- Ask ONE reflective question.
- Keep it short and human-like (1-2 paragraphs).
- Never judge or shame.
`

    console.log("[chat-ai] Calling Groq API...");
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${groqKey}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        model: "llama-3.1-70b-versatile",
        messages: [
          { role: "system", content: "You are Anchor, a supportive companion." }, 
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      }),
    })

    if (!groqResponse.ok) {
      const errorData = await groqResponse.text();
      console.error("[chat-ai] Groq API error:", errorData);
      throw new Error(`AI Service Error: ${groqResponse.status}`);
    }

    const data = await groqResponse.json()
    const aiReply = data.choices?.[0]?.message?.content || "I'm here to support you. How are you feeling right now?";

    // 2. Increment Counter & Trigger Compression if needed (Async)
    const newCount = (profile.messages_since_last_summary || 0) + 1
    supabase.from('profiles').update({ messages_since_last_summary: newCount }).eq('id', user.id)
      .then(({ error }) => {
        if (error) console.error("[chat-ai] Failed to update message counter:", error);
        
        if (newCount >= 10) {
          console.log("[chat-ai] Triggering memory compression...");
          fetch(`${supabaseUrl}/functions/v1/summarize-memory`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: user.id })
          }).catch(e => console.error("[chat-ai] Summary trigger failed:", e))
        }
      });

    return new Response(JSON.stringify({ reply: aiReply }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    })

  } catch (error: any) {
    console.error("[chat-ai] Critical error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: corsHeaders 
    })
  }
})