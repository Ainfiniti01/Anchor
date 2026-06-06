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
      console.error("[chat-ai] Auth error:", authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const body = await req.json().catch(() => ({}));
    const message = body.message;

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), { status: 400, headers: corsHeaders });
    }

    console.log(`[chat-ai] Fetching context for user: ${user.id}`);

    // Fetch context with individual error handling to prevent 500s on missing records
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    const { data: summary } = await supabase.from('user_ai_summaries').select('*').eq('user_id', user.id).single();
    const { data: memories } = await supabase.from('user_memories')
      .select('*')
      .eq('user_id', user.id)
      .gte('importance_score', 3)
      .order('importance_score', { ascending: false })
      .limit(5);

    const safeProfile = profile || { ai_tone: 'supportive', habit_type: 'unknown', risk_level: 'low', risk_score: 0 };
    const safeMemories = memories || [];

    const prompt = `
You are Anchor, a supportive accountability companion.
STYLE: ${safeProfile.ai_tone || 'supportive'}
RISK: ${safeProfile.risk_level || 'low'} (${safeProfile.risk_score || 0}/10)

SUMMARY: ${summary?.emotional_profile ?? "New user - no history yet."}
IDENTITY ANCHORS:
${safeMemories.length > 0 ? safeMemories.map(m => `- [Priority ${m.importance_score}] ${m.content}`).join('\n') : "No identity anchors set yet."}

USER: ${message}

RULES:
- Use Priority 4-5 memories as "Identity Anchors" if available.
- Ask ONE reflective question.
- Keep it short and human-like (1-2 paragraphs).
- Never judge or shame.
`

    console.log("[chat-ai] Calling Groq API with model llama3-8b-8192...");
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${groqKey}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: "You are Anchor, a supportive companion." }, 
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      }),
    })

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error("[chat-ai] Groq API error:", errorText);
      return new Response(JSON.stringify({ error: 'AI Service Error' }), { status: 502, headers: corsHeaders });
    }

    const groqData = await groqResponse.json();
    const aiReply = groqData.choices?.[0]?.message?.content || "I'm here for you. How are you feeling?";

    // Async updates
    const newCount = (safeProfile.messages_since_last_summary || 0) + 1;
    supabase.from('profiles').update({ messages_since_last_summary: newCount }).eq('id', user.id).then(() => {
      if (newCount >= 10) {
        fetch(`${supabaseUrl}/functions/v1/summarize-memory`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id })
        }).catch(e => console.error("[chat-ai] Summary trigger failed:", e));
      }
    });

    return new Response(JSON.stringify({ reply: aiReply }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error: any) {
    console.error("[chat-ai] Critical error:", error.message);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
})