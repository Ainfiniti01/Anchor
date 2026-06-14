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

    // 1. Fetch Context (Profile, Summary, Memories)
    const [profileRes, summaryRes, memoriesRes, historyRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('user_ai_summaries').select('*').eq('user_id', user.id).single(),
      supabase.from('user_memories').select('*').eq('user_id', user.id).order('importance_score', { ascending: false }).limit(10),
      supabase.from('chat_messages').select('role, message').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10)
    ]);

    const profile = profileRes.data || {};
    const summary = summaryRes.data || {};
    const memories = memoriesRes.data || [];
    const history = (historyRes.data || []).reverse();

    // 2. Build the System Prompt
    const systemPrompt = `
You are Anchor, a supportive accountability companion. Your goal is to help the user overcome their habit: ${profile.habit_type || 'their addiction'}.

USER CONTEXT:
- Habit: ${profile.habit_type || 'Not specified'}
- Duration: ${profile.habit_duration || 'Not specified'}
- Triggers: ${profile.triggers?.join(', ') || 'Not specified'}
- Tone Preference: ${profile.ai_tone || 'supportive'}

IDENTITY ANCHORS & GOALS:
${memories.map(m => `- ${m.content}`).join('\n')}

BEHAVIORAL SUMMARY:
${summary.emotional_profile || 'New user - focus on building trust and understanding their goals.'}

STRATEGY:
1. Use "Identity Reinforcement": Remind them of their specific goals (e.g., becoming a software engineer) when they feel an urge.
2. Be non-judgmental and calm.
3. Ask reflective questions that connect their current choice to their future self.
4. Keep responses concise (1-2 paragraphs).

NEVER: Shame the user or use fear-based language.
`;

    // 3. Prepare Messages for Groq
    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map(h => ({ role: h.role === 'ai' ? 'assistant' : 'user', content: h.message })),
      { role: "user", content: message }
    ];

    // 4. Call Groq API
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${groqKey}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: messages,
        temperature: 0.7,
        max_tokens: 500
      }),
    })

    const groqData = await groqResponse.json();
    const aiReply = groqData.choices?.[0]?.message?.content || "I'm here for you. Let's talk through this.";

    // 5. Log the interaction for effectiveness tracking
    await supabase.from("response_effectiveness_log").insert({
      user_id: user.id,
      response_type: profile.ai_tone,
      outcome: "pending",
      user_message: message,
      ai_response: aiReply,
      risk_level: profile.risk_level
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