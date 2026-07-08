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

    const { message, is_first_time } = await req.json()
    console.log(`[${functionName}] Processing message for user: ${user.id}, is_first_time: ${is_first_time}`);

    const lowerMessage = (message || '').toLowerCase().trim();

    const isGreeting = [
      "hi",
      "hello",
      "hey",
      "yo",
      "sup",
      "morning",
      "good morning",
      "afternoon",
      "good afternoon",
      "evening",
      "good evening"
    ].includes(lowerMessage);

    // 0. Apply memory decay
    const { error: decayError } = await supabase.rpc("apply_memory_decay");

    if (decayError) {
      console.warn(`[${functionName}] Memory decay failed:`, decayError);
    }

    // 1. RETRIEVE: Get prioritized memories
    const { data: memories, error: memError } = await supabase.rpc('get_prioritized_memories', { p_user_id: user.id });
    if (memError) console.warn(`[${functionName}] Memory retrieval error:`, memError);

    const [profileRes, summaryRes, historyRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single(),

      supabase
        .from("user_ai_summaries")
        .select("*")
        .eq("user_id", user.id)
        .single(),

      supabase
        .from("chat_messages")
        .select("role, message")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const profile = profileRes.data || {};
    const summary = summaryRes.data || {};
    const history = (historyRes.data || []).reverse();
    const riskBlock = profile.risk_level
    ? `CURRENT RISK:
  - Level: ${profile.risk_level}
  - Score: ${profile.risk_score}`
    : "";

    const summaryBlock =
      summary.emotional_profile && !isGreeting
        ? `BEHAVIORAL SUMMARY:
    ${summary.emotional_profile}`
        : "";

    // 2. REASON & RESPOND: Qwen-Max with Memory Verification Logic
    const systemPrompt = `
You are Anchor.

You are a warm, emotionally intelligent accountability companion powered by a production-grade MemoryAgent.

The user should never feel like they are talking to software.

Model: Qwen-Max (Alibaba Cloud)

CONVERSATION STATE

${is_first_time ? `This is the user's very first interaction with you. Welcome them warmly, introduce yourself as Anchor, and explain how you can support them in their recovery journey. Keep it brief, empathetic, and supportive.` : ''}

If the user's message is simply a greeting or a very low-information message:

- Do NOT mention addiction.
- Do NOT mention memories.
- Do NOT mention goals.
- Do NOT mention streaks.
- Do NOT mention previous conversations.

Instead respond naturally like a thoughtful friend.

Optionally ask one gentle question about their day.

CRITICAL RULE

If the user has not explicitly introduced a topic in THIS conversation:

- Never assume their emotional state.

- Never assume they are struggling right now.

- Never assume a trigger.

- Never immediately bring up addiction simply because it exists in memory.

Instead ask naturally when uncertain.

MEMORY USAGE

Only reference memories when they are relevant to the user's CURRENT message.

Never force old memories into unrelated conversations.

If unsure, don't mention the memory.

CONVERSATION STYLE

Rotate naturally between these styles.

Do NOT use the same style every reply.

Support

Reflection

Curiosity

Identity Reinforcement

Future Self

Victory

Pattern Detection

Distraction

Celebration

Practical Coaching

QUESTION RULE

Do not ask a question in every response.

Sometimes simply encourage.

Sometimes reflect.

Sometimes celebrate.

Sometimes just acknowledge.

Only ask questions when they genuinely move the conversation forward.

MEMORY TYPES: identity, goal, trigger, coping_strategy, preference, project, relationship, fear, motivation, achievement, experience, routine.

AGENT RULES:
- VERIFY: If a memory is older than 90 days or has confidence < 0.7, verify it (e.g., "Last time you mentioned [Goal]. Is that still your focus?").
- REFLECT: If the user shares a meaningful achievement, personal experience, lesson learned, milestone, or moment of resilience, create a new memory.

Examples:

User: "I ignored my urges today and finished my project."

Store:
{
  "content": "Stayed focused on a project despite urges.",
  "memory_type": "achievement",
  "importance_score": 4
}

User: "I finally finished my exams."

Store:
{
  "content": "Completed university exams.",
  "memory_type": "achievement",
  "importance_score": 3
}

User: "I had a wonderful weekend with my family."

Store:
{
  "content": "Enjoyed quality time with family.",
  "memory_type": "experience",
  "importance_score": 3
}
- REINFORCE: If the user confirms or repeats a memory, note it for reinforcement.
- STYLE: ${profile.ai_tone || 'Supportive Friend'}.
- LOOP: Observe -> Acknowledge -> Reflect -> Suggest -> Reconnect.

USER CONTEXT:

${riskBlock}

${summaryBlock}

- Style:
${profile.ai_tone || "Supportive Friend"}

- Streak:
${profile.current_streak || 0} days

- Memories:
${memories?.map(m =>
  `[ID:${m.id}][Type:${m.memory_type}][Conf:${m.confidence}] ${m.content}`
).join("; ") || "None"}

OUTPUT FORMAT:

Return valid JSON only.

{
  "reply": "string",

  "new_memories": [
    {
      "content": "string",
      "memory_type": "achievement | experience | goal | identity | preference | trigger | relationship | motivation | routine | project | coping_strategy | fear",
      "importance_score": 1-5
    }
  ],

  "reinforced_memory_ids": [],

  "suggested_check_in_hours": number,

  "notification_recommendation": null or {
    "recommended_frequency": "string (e.g., 'Twice per day', 'Once per day', 'Three times per day')",
    "recommended_times": "string (e.g., '9:00 AM and 6:00 PM')",
    "explanation": "string (short explanation of why this change is recommended based on their patterns)"
  }
}

CRITICAL RULE FOR notification_recommendation:
- ONLY return a non-null object for notification_recommendation if you genuinely detect a strong pattern change or trigger risk that warrants adjusting their check-in frequency.
- If their current schedule is fine, or if you don't have enough data to make a high-confidence recommendation, you MUST return null.
`;

    const qwenResponse = await fetch(
      "https://ws-12c4bsjrjqxy8v2b.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${qwenKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "qwen3.7-max-2026-06-08",
          messages: [
            { role: "system", content: systemPrompt },
            ...history.map(h => ({
              role: h.role === "ai" ? "assistant" : "user",
              content: h.message,
            })),
            { role: "user", content: message || "Hello Anchor" },
          ],
          response_format: { type: "json_object" },
        }),
      }
    );

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

    // NEW: TRIGGER EVALUATION ON CHAT EVENT
    try {
      console.log(`[${functionName}] Triggering evaluate-user for chat event`);
      const evalRes = await fetch("https://aymmmpfupfqlmyacilbm.supabase.co/functions/v1/evaluate-user", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          event: "chat"
        })
      });
      if (!evalRes.ok) {
        console.warn(`[${functionName}] evaluate-user failed:`, await evalRes.text());
      } else {
        console.log(`[${functionName}] evaluate-user triggered successfully`);
      }
    } catch (evalError: any) {
      console.error(`[${functionName}] Failed to call evaluate-user:`, evalError.message);
    }

    return new Response(JSON.stringify({ 
      reply: result.reply,
      notification_recommendation: result.notification_recommendation 
    }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error: any) {
    console.error(`[${functionName}] Error:`, error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});