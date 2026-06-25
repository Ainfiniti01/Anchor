import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const qwenKey = Deno.env.get('QWEN_API_KEY') || Deno.env.get('GROQ_API_KEY')! // Fallback for transition

    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const { message } = await req.json()

    // 1. Intelligent Memory Retrieval (Weighted by Importance, Usage, and Recency)
    // Priority = (Importance * 10) + UsageCount - (DaysSinceLastUsed * 0.5)
    const { data: memories } = await supabase.rpc('get_prioritized_memories', { p_user_id: user.id });
    
    // Fallback if RPC isn't deployed yet
    let contextMemories = memories;
    if (!memories) {
      const { data: fallback } = await supabase
        .from('user_memories')
        .select('*')
        .eq('user_id', user.id)
        .order('importance_score', { ascending: false })
        .limit(5);
      contextMemories = fallback;
    }

    // 2. Fetch Behavioral Learning & History
    const [profileRes, historyRes, feedbackRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('chat_messages').select('role, message').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('interaction_feedback').select('is_helpful').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5)
    ]);

    const profile = profileRes.data || {};
    const history = (historyRes.data || []).reverse();
    const recentFeedback = feedbackRes.data || [];

    // 3. Qwen Cloud Integration (DashScope OpenAI-Compatible Endpoint)
    const systemPrompt = `
You are Anchor, a production-grade MemoryAgent accountability companion.
Model: Qwen-Max (Alibaba Cloud)

CORE MISSION:
- Maintain continuity across sessions using persistent memory.
- Adapt to the user's preferred style: ${profile.ai_tone || 'Supportive Friend'}.
- Use behavioral learning: ${JSON.stringify(profile.behavioral_preferences || {})}.

MEMORY AGENT RULES:
- Reference memories naturally (e.g., "How is that startup project going?").
- If a memory is old/decayed, verify it (e.g., "Are you still focusing on [Goal]?").
- Never hallucinate context. If you don't know, ask.

CONVERSATION FLOW:
1. Observe (Read context/history)
2. Acknowledge (Validate user state)
3. Reflect (Connect to identity/goals)
4. Suggest (Only if appropriate)

USER CONTEXT:
- Streak: ${profile.current_streak} days
- Risk: ${profile.risk_level}
- Memories: ${contextMemories?.map(m => `[${m.memory_type}] ${m.content}`).join('; ')}
`;

    const qwenResponse = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${qwenKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "qwen-max",
        messages: [
          { role: "system", content: systemPrompt },
          ...history.map(h => ({ role: h.role === 'ai' ? 'assistant' : 'user', content: h.message })),
          { role: "user", content: message }
        ],
        response_format: { type: "json_object" }
      })
    });

    const qwenData = await qwenResponse.json();
    const result = JSON.parse(qwenData.choices[0].message.content);

    // 4. Update Memory Usage (Reinforcement)
    if (contextMemories?.length > 0) {
      const usedIds = contextMemories.map(m => m.id);
      await supabase.from('user_memories')
        .update({ last_used_at: new Date().toISOString(), usage_count: 1 }) // Increment logic handled by DB or simple update
        .in('id', usedIds);
    }

    // 5. Store New Memories
    if (result.new_memories?.length > 0) {
      await supabase.from('user_memories').insert(
        result.new_memories.map((m: any) => ({
          user_id: user.id,
          content: m.content,
          memory_type: m.memory_type,
          importance_score: m.importance_score
        }))
      );
    }

    return new Response(JSON.stringify({ reply: result.reply }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error: any) {
    console.error("[chat-ai] Qwen Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});