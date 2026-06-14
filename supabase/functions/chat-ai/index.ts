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
    const isShort = lowerMessage.length < 10;

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

    // 3. Build Dynamic Context Blocks
    const memoryBlock = (memories.length > 0 && !isGreeting) 
      ? `IDENTITY ANCHORS & STORED MEMORIES:\n${memories.map(m => `- [${m.memory_type}] ${m.content}`).join('\n')}`
      : "";

    const summaryBlock = (summary.emotional_profile && !isGreeting)
      ? `BEHAVIORAL SUMMARY:\n${summary.emotional_profile}`
      : "New user or low context - focus on building trust naturally.";

    const riskBlock = (profile.risk_level && !isGreeting)
      ? `CURRENT RISK: ${profile.risk_level} (Score: ${profile.risk_score})`
      : "";

    // 4. Build the System Prompt
    const systemPrompt = `
You are Anchor, a supportive accountability companion. 

CONVERSATION STATE:
If the user message is a greeting ("hi", "hello") or low-information input:
- DO NOT reference addiction, habits, or past history.
- DO NOT use stored memories or identity anchors.
- DO NOT mention risk levels or past behavior.
- Respond naturally and warmly. Optionally ask a gentle, open question about their day.

CRITICAL RULE: NO ASSUMPTION MODE
If the user has not explicitly mentioned a topic in THIS specific conversation:
- DO NOT assume their addiction type, duration, or triggers.
- DO NOT assume their current emotional state.
- If unsure, respond generally and offer support or ask a neutral question.

USER PREFERENCES:
- Tone: ${profile.ai_tone || 'supportive'}
${riskBlock}

${memoryBlock}

${summaryBlock}

CONVERSATION STRATEGY:
- Do not ask a question in every reply.
- Rotate modes: Support, Reflection, Curiosity, Distraction, Identity Reinforcement, Future Self, Victory, Pattern Detection.
- If the user is experiencing an urge: prioritize grounding, distraction, and goal reminders.
- Only reference information explicitly stored in memory when relevant to the user's current input.

OUTPUT FORMAT:
Return JSON: {"reply": "string", "new_memories": []}
"new_memories" should only contain NEW goals, dreams, or identity anchors shared in this message.
`;

    // 5. Call Groq API
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
        temperature: 0.7,
      }),
    })

    const groqData = await groqResponse.json();
    const result = JSON.parse(groqData.choices?.[0]?.message?.content || '{"reply": "I am here for you.", "new_memories": []}');
    
    const aiReply = result.reply;
    const newMemories = result.new_memories || [];

    // 6. Save new memories if detected
    if (newMemories.length > 0) {
      const memoriesToInsert = newMemories.map((m: any) => ({
        user_id: user.id,
        content: m.content,
        memory_type: m.memory_type || 'general',
        importance_score: m.importance_score || 3
      }));
      await supabase.from('user_memories').insert(memoriesToInsert);
    }

    // 7. Log the interaction
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