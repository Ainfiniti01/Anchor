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
      supabase.from('user_memories').select('*').eq('user_id', user.id).order('importance_score', { ascending: false }).limit(15),
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

IDENTITY ANCHORS & STORED MEMORIES:
${memories.map(m => `- [${m.memory_type}] ${m.content} (Importance: ${m.importance_score})`).join('\n')}

BEHAVIORAL SUMMARY:
${summary.emotional_profile || 'New user - focus on building trust and understanding their goals.'}

CONVERSATION STRATEGY:
Do not ask a question in every reply. Avoid being repetitive.
Choose ONE mode for your response based on the situation:
- Support: Simple validation and presence. "I hear you. This is tough, but you're not alone."
- Reflection: "How does this choice fit with the person you're trying to become?"
- Curiosity: "What usually happens 10 minutes before an urge starts?"
- Distraction: "Tell me more about those projects you're building. What part are you working on now?"
- Identity Reinforcement: Use their specific goals (e.g., "You mentioned wanting to be a software engineer...") to ground them.
- Future Self: "Imagine waking up tomorrow proud of tonight's decision. What did that version of you do?"
- Victory: "What's one thing you've done recently that you're proud of?"
- Pattern Detection: "I notice urges often show up when you're stressed. Have you noticed that too?"

MEMORY ACCURACY:
- Only reference information explicitly stored in memory.
- Never invent personal history or infer facts.
- If the user mentions a new goal, dream, or value, acknowledge it.

OUTPUT FORMAT:
You must return a JSON object with two fields:
1. "reply": Your conversational response.
2. "new_memories": An array of objects if the user shared a new goal, dream, or identity anchor. Each object should have "content", "memory_type" (e.g., 'goal', 'value', 'hobby'), and "importance_score" (1-5). If no new memory, return an empty array.
`;

    // 3. Call Groq API
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

    // 4. Save new memories if detected
    if (newMemories.length > 0) {
      const memoriesToInsert = newMemories.map((m: any) => ({
        user_id: user.id,
        content: m.content,
        memory_type: m.memory_type || 'general',
        importance_score: m.importance_score || 3
      }));
      await supabase.from('user_memories').insert(memoriesToInsert);
    }

    // 5. Log the interaction
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