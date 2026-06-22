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
    const message = body.message || "";
    const lowerMessage = message.toLowerCase().trim();

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), { status: 400, headers: corsHeaders });
    }

    // 1. Detect Low-Information Input
    const isGreeting = ["hi", "hello", "hey", "yo", "sup", "morning", "evening"].includes(lowerMessage);

    // 2. Fetch Context
    const [profileRes, summaryRes, memoriesRes, historyRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('user_ai_summaries').select('*').eq('user_id', user.id).single(),
      supabase.from('user_memories').select('*').eq('user_id', user.id).order('importance_score', { ascending: false }).limit(10),
      supabase.from('chat_messages').select('role, message').eq('user_id', user.id).order('created_at', { ascending: false }).limit(8)
    ]);

    const profile = profileRes.data || {};
    const summary = summaryRes.data || {};
    const memories = memoriesRes.data || [];
    const history = (historyRes.data || []).reverse();

    // 3. Build the System Prompt based on the new Behavioral Rules
    const systemPrompt = `
You are Anchor, a behavioral support and accountability AI. 
Your job is to provide grounded, accurate, adaptive support based ONLY on verified user data, not assumptions.

CONVERSATION MEMORY QUALITY RULES:
- Use memory ONLY when information was explicitly stated by the user, appears repeatedly (3+ times), or is a confirmed goal/trigger.
- NEVER assume habits, addiction type, duration, or progress.
- NEVER guess coping strategies or infer emotional states not explicitly stated.
- If uncertain, say "I don't have enough context yet" or respond generally.

RESPONSE STYLE RULES:
- Keep responses short (1–2 paragraphs max).
- Do NOT ask a question in every response. Only ask when the user shows struggle, clarification is needed, or engagement is low.
- Default behavior: Acknowledge first, then respond or reflect.
- Valid acknowledgments: "Got it", "I hear you", "Okay", "That makes sense".
- Avoid: excessive praise, fake encouragement, exaggerated positivity.

BEHAVIORAL SAFETY PRINCIPLE:
- Your goal is NOT to persuade, pressure, or predict behavior.
- Your goal is to reflect reality clearly, support user awareness, and help the user make decisions based on their own values.

CHECK-IN BEHAVIOR:
- If the user is responding to a check-in, be short, context-aware, and avoid pressure or guilt.

CURRENT USER CONTEXT:
- Tone Preference: ${profile.ai_tone || 'Supportive Friend'}
- Risk Level: ${profile.risk_level || 'Low'}
- Current Streak: ${profile.current_streak || 0} days
- Stored Memories: ${memories.map(m => `[${m.memory_type}] ${m.content}`).join(', ')}
- Behavioral Summary: ${summary.emotional_profile || 'No summary yet'}

FINAL PRINCIPLE: Be accurate first, supportive second, adaptive third. Never invent context. Never exaggerate progress.

OUTPUT FORMAT: Return JSON {"reply": "string", "new_memories": []}
`;

    // 4. Call Groq API
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${groqKey}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          ...history.map(h => ({ role: h.role === 'ai' ? 'assistant' : 'user', content: h.message })),
          { role: "user", content: message }
        ],
        temperature: 0.6,
      }),
    })

    const groqData = await groqResponse.json();
    const result = JSON.parse(groqData.choices?.[0]?.message?.content || '{"reply": "I am here for you.", "new_memories": []}');
    
    const aiReply = result.reply;
    const newMemories = result.new_memories || [];

    // 5. Save new memories if detected (conservative)
    if (newMemories.length > 0) {
      const memoriesToInsert = newMemories.map((m: any) => ({
        user_id: user.id,
        content: m.content,
        memory_type: m.memory_type || 'general',
        importance_score: m.importance_score || 3
      }));
      await supabase.from('user_memories').insert(memoriesToInsert);
    }

    // 6. Log the interaction
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