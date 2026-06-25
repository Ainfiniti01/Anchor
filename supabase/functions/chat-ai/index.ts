import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const functionName = "chat-ai";
  console.log(`[${functionName}] Request received`);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const qwenKey = Deno.env.get('QWEN_API_KEY')!

    if (!qwenKey) {
      console.error(`[${functionName}] QWEN_API_KEY is missing`);
      throw new Error("QWEN_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error(`[${functionName}] No Authorization header`);
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error(`[${functionName}] Auth error:`, authError);
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const { message } = await req.json()
    console.log(`[${functionName}] Processing message for user: ${user.id}`);

    // 1. RETRIEVE: Get prioritized memories
    const { data: memories, error: memError } = await supabase.rpc('get_prioritized_memories', { p_user_id: user.id });
    if (memError) console.warn(`[${functionName}] Memory retrieval error:`, memError);

    const [profileRes, historyRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('chat_messages').select('role, message').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10)
    ]);

    const profile = profileRes.data || {};
    const history = (historyRes.data || []).reverse();

    // 2. REASON & RESPOND: Qwen-Max with Memory Verification Logic
    const systemPrompt = `
You are Anchor, a production-grade MemoryAgent.
Model: Qwen-Max (Alibaba Cloud)

MEMORY TYPES: identity, goal, trigger, coping_strategy, preference, project, relationship, fear, motivation, achievement, routine.

AGENT RULES:
- VERIFY: If a memory is older than 90 days or has confidence < 0.7, verify it (e.g., "Last time you mentioned [Goal]. Is that still your focus?").
- REINFORCE: If the user confirms or repeats a memory, note it for reinforcement.
- STYLE: ${profile.ai_tone || 'Supportive Friend'}.
- LOOP: Observe -> Acknowledge -> Reflect -> Suggest -> Reconnect.

USER CONTEXT:
- Streak: ${profile.current_streak} days
- Memories: ${memories?.map(m => `[ID:${m.id}][Type:${m.memory_type}][Conf:${m.confidence}] ${m.content}`).join('; ')}

OUTPUT FORMAT: Return JSON {"reply": "string", "new_memories": [], "reinforced_memory_ids": [], "suggested_check_in_hours": number}
`;

    console.log(`[${functionName}] Calling Qwen API...`);
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

    if (!qwenResponse.ok) {
      const errorText = await qwenResponse.text();
      console.error(`[${functionName}] Qwen API error (${qwenResponse.status}):`, errorText);
      throw new Error(`Qwen API returned ${qwenResponse.status}`);
    }

    const qwenData = await qwenResponse.json();
    console.log(`[${functionName}] Qwen API response received`);

    if (!qwenData.choices || qwenData.choices.length === 0) {
      console.error(`[${functionName}] No choices in Qwen response:`, qwenData);
      throw new Error("Invalid response from Qwen API");
    }

    let result;
    try {
      result = JSON.parse(qwenData.choices[0].message.content);
    } catch (parseError) {
      console.error(`[${functionName}] Failed to parse Qwen content as JSON:`, qwenData.choices[0].message.content);
      throw new Error("AI returned invalid JSON format");
    }

    // 3. LEARN: Update and Reinforce Memories
    if (result.reinforced_memory_ids?.length > 0) {
      console.log(`[${functionName}] Reinforcing ${result.reinforced_memory_ids.length} memories`);
      await supabase.rpc('reinforce_memories', { memory_ids: result.reinforced_memory_ids });
    }

    if (result.new_memories?.length > 0) {
      console.log(`[${functionName}] Storing ${result.new_memories.length} new memories`);
      await supabase.from('user_memories').insert(
        result.new_memories.map((m: any) => ({
          user_id: user.id,
          content: m.content,
          memory_type: m.memory_type,
          importance_score: m.importance_score,
          confidence: m.confidence || 0.5
        }))
      );
    }

    // 4. SCHEDULE: Update next check-in time based on conversation
    if (result.suggested_check_in_hours) {
      console.log(`[${functionName}] Scheduling next check-in in ${result.suggested_check_in_hours} hours`);
      const nextCheckIn = new Date();
      nextCheckIn.setHours(nextCheckIn.getHours() + result.suggested_check_in_hours);
      await supabase.from('profiles').update({ next_check_in_at: nextCheckIn.toISOString() }).eq('id', user.id);
    }

    return new Response(JSON.stringify({ reply: result.reply }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error: any) {
    console.error(`[${functionName}] Error:`, error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});