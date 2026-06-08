import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const groqKey = Deno.env.get('GROQ_API_KEY')

    if (!supabaseUrl || !supabaseKey || !groqKey) {
      console.error("[chat-ai] Missing environment variables");
      return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), { status: 401, headers: corsHeaders })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const body = await req.json().catch(() => ({}));
    const message = body.message;

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), { status: 400, headers: corsHeaders });
    }

    // Fetch context
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    const { data: summary } = await supabase.from('user_ai_summaries').select('*').eq('user_id', user.id).single();
    const { data: memories } = await supabase.from('user_memories').select('*').eq('user_id', user.id).order('importance_score', { ascending: false }).limit(5);

    const safeProfile = profile || {
      ai_tone: "supportive",
      risk_level: "low",
      risk_score: 0
    };

    const prompt = `
You are Anchor, a supportive accountability companion.

STYLE: ${safeProfile.ai_tone || 'supportive'}
RISK: ${safeProfile.risk_level || 'low'} (${safeProfile.risk_score || 0}/10)

SUMMARY: ${summary?.emotional_profile ?? "New user - no history yet."}

IDENTITY ANCHORS:
${memories && memories.length > 0 ? memories.map(m => `- [Priority ${m.importance_score}] ${m.content}`).join('\n') : "No identity anchors set yet."}

USER: ${message}

────────────────────────────────────────
BEHAVIOR CHANGE STRATEGY:
You must help the user resist urges using safe behavioral techniques:
1. Distraction: redirect attention to goals, future identity questions.
2. Awareness: help user notice patterns and triggers.
3. Consequence reflection: gently ask how habits affect mood, energy, focus.
4. Identity reinforcement: remind user of who they want to become.
5. Emotional support: calm, non-judgmental tone.

NEVER: shame, use fear-based language, or manipulate emotions.

FINAL RULES:
- Ask ONE reflective question max
- Keep response short and human-like (1–2 paragraphs)
- Be supportive and non-judgmental
`

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${groqKey}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are Anchor, a supportive companion who learns from user feedback." }, 
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      }),
    })

    const groqData = await groqResponse.json();
    const aiReply = groqData.choices?.[0]?.message?.content || "I'm here for you. How can I help?";

    // Log the interaction
    await supabase.from("response_effectiveness_log").insert({
      user_id: user.id,
      response_type: safeProfile.ai_tone,
      outcome: "pending",
      user_message: message,
      ai_response: aiReply,
      risk_level: safeProfile.risk_level
    });

    return new Response(JSON.stringify({ reply: aiReply }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error: any) {
    console.error("[chat-ai] Error:", error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
})