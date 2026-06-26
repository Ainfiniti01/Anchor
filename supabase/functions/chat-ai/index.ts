import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
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

  const functionName = "chat-ai";
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const qwenKey = Deno.env.get('QWEN_API_KEY');

    if (!supabaseUrl || !supabaseKey || !qwenKey) {
      console.error(`[${functionName}] Missing environment variables`);
      return new Response(JSON.stringify({ error: 'Server configuration error' }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verify Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: corsHeaders 
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error(`[${functionName}] Auth error:`, authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: corsHeaders 
      });
    }

    const { message } = await req.json();
    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    console.log(`[${functionName}] Processing message for user: ${user.id}`);

    // 1. RETRIEVE: Get prioritized memories & context
    const { data: memories, error: memError } = await supabase.rpc('get_prioritized_memories', { p_user_id: user.id });
    if (memError) console.warn(`[${functionName}] Memory retrieval error:`, memError);

    const [profileRes, summaryRes, historyRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("user_ai_summaries").select("*").eq("user_id", user.id).single(),
      supabase.from("chat_messages").select("role, message").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    ]);

    const profile = profileRes.data || {};
    const summary = summaryRes.data || {};
    const history = (historyRes.data || []).reverse();

    // Build Context Blocks
    const riskBlock = profile.risk_level ? `[CURRENT RISK: ${profile.risk_level} (Score: ${profile.risk_score})]` : "";
    const summaryBlock = summary.emotional_profile ? `[BEHAVIORAL PROFILE: ${summary.emotional_profile}]` : "";

    // 2. REASON & RESPOND
    const systemPrompt = `
You are Anchor, a warm, emotionally intelligent accountability companion.
Model: Qwen-Max (Alibaba Cloud)

CONTEXT:
${riskBlock}
${summaryBlock}
STYLE: ${profile.ai_tone || 'Supportive Friend'}
STREAK: ${profile.current_streak || 0} days

MEMORIES:
${memories?.map((m: any) => `[ID:${m.id}][Type:${m.memory_type}][Conf:${m.confidence.toFixed(2)}] ${m.content}`).join('\n') || 'No prior memories.'}

AGENT INSTRUCTIONS:
1. VERIFY: If a memory is older than 90 days or confidence < 0.7, verify it gently.
2. REINFORCE: If the user confirms a memory, include its ID in 'reinforced_memory_ids'.
3. REFLECT: Look for "Reflection Memories" (achievements, experiences, small wins). Store them with type 'achievement' or 'experience'.
4. ADAPT: Strictly follow the ${profile.ai_tone || 'Supportive Friend'} style. 
   - 'Supportive Friend': Warm, empathetic, casual.
   - 'Accountability Coach': Direct, goal-oriented, firm but kind.
   - 'Neutral Companion': Objective, calm, non-judgmental.

OUTPUT FORMAT: Return JSON {"reply": "string", "new_memories": [{"content": "string", "memory_type": "string", "importance_score": 1-5}], "reinforced_memory_ids": [], "suggested_check_in_hours": number}
`;

    const qwenResponse = await fetch(
      "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${qwenKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "qwen-max",
          messages: [
            { role: "system", content: systemPrompt },
            ...history.map(h => ({ role: h.role === "ai" ? "assistant" : "user", content: h.message })),
            { role: "user", content: message },
          ],
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!qwenResponse.ok) {
      const errorText = await qwenResponse.text();
      console.error(`[${functionName}] Qwen API error:`, errorText);
      throw new Error(`AI Service error: ${qwenResponse.statusText}`);
    }

    const qwenData = await qwenResponse.json();
    const result = JSON.parse(qwenData.choices[0].message.content);

    // 3. LEARN & UPDATE (Async background tasks)
    const updateTasks = [];

    if (result.reinforced_memory_ids?.length > 0) {
      updateTasks.push(supabase.rpc('reinforce_memories', { memory_ids: result.reinforced_memory_ids }));
    }

    if (result.new_memories?.length > 0) {
      updateTasks.push(supabase.from('user_memories').insert(
        result.new_memories.map((m: any) => ({
          user_id: user.id,
          content: m.content,
          memory_type: m.memory_type,
          importance_score: m.importance_score,
          confidence: 1.0
        }))
      ));
    }

    if (result.suggested_check_in_hours) {
      const nextCheckIn = new Date();
      nextCheckIn.setHours(nextCheckIn.getHours() + result.suggested_check_in_hours);
      updateTasks.push(supabase.from('profiles').update({ next_check_in_at: nextCheckIn.toISOString() }).eq('id', user.id));
    }

    // Wait for updates to complete (or at least start)
    if (updateTasks.length > 0) {
      Promise.all(updateTasks).catch(err => console.error(`[${functionName}] Background update error:`, err));
    }

    return new Response(JSON.stringify({ reply: result.reply }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error: any) {
    console.error(`[${functionName}] Error:`, error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});