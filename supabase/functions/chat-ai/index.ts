import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const functionName = "chat-ai";
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const qwenKey = Deno.env.get('QWEN_API_KEY')!

    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

    const { message } = await req.json()
    const lowerMessage = message.toLowerCase().trim();

    // 1. RETRIEVE: Get prioritized memories & context
    const { data: memories } = await supabase.rpc('get_prioritized_memories', { p_user_id: user.id });

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
STREAK: ${profile.current_streak} days

MEMORIES:
${memories?.map(m => `[ID:${m.id}][Type:${m.memory_type}][Conf:${m.confidence.toFixed(2)}] ${m.content}`).join('\n')}

AGENT INSTRUCTIONS:
1. VERIFY: If a memory is older than 90 days or confidence < 0.7, verify it gently.
2. REINFORCE: If the user confirms a memory, include its ID in 'reinforced_memory_ids'.
3. REFLECT: Look for "Reflection Memories" (achievements, experiences, small wins). Store them with type 'achievement' or 'experience'.
4. ADAPT: Strictly follow the ${profile.ai_tone} style. 
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

    const qwenData = await qwenResponse.json();
    const result = JSON.parse(qwenData.choices[0].message.content);

    // 3. LEARN & UPDATE
    if (result.reinforced_memory_ids?.length > 0) {
      await supabase.rpc('reinforce_memories', { memory_ids: result.reinforced_memory_ids });
    }

    if (result.new_memories?.length > 0) {
      await supabase.from('user_memories').insert(
        result.new_memories.map((m: any) => ({
          user_id: user.id,
          content: m.content,
          memory_type: m.memory_type,
          importance_score: m.importance_score,
          confidence: 1.0
        }))
      );
    }

    if (result.suggested_check_in_hours) {
      const nextCheckIn = new Date();
      nextCheckIn.setHours(nextCheckIn.getHours() + result.suggested_check_in_hours);
      await supabase.from('profiles').update({ next_check_in_at: nextCheckIn.toISOString() }).eq('id', user.id);
    }

    return new Response(JSON.stringify({ reply: result.reply }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});