import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const functionName = "evaluate-user";

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const qwenKey = Deno.env.get('QWEN_API_KEY')!

    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error(`[${functionName}] Missing Authorization header`);
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error(`[${functionName}] Auth error:`, authError);
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const { event } = await req.json()
    console.log(`[${functionName}] Evaluating user ${user.id} triggered by event: ${event}`);

    // Fetch user profile and recent logs to compile a comprehensive picture
    const [profileRes, urgesRes, logsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("urge_logs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("behavioral_logs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    ]);

    const profile = profileRes.data || {};
    const urges = urgesRes.data || [];
    const logs = logsRes.data || [];

    // Formulate a professional behavioral analysis prompt for Qwen
    const systemPrompt = `
You are the Anchor Recovery & Behavioral Evaluation Engine.
Model: Qwen-Plus (Alibaba Cloud)

Analyze the user's focus habit, current streak, recent urges, and logs to evaluate their recovery state.

Return a JSON object with this EXACT structure:
{
  "recovery_score": number (0 to 100),
  "risk_score": number (0 to 10),
  "risk_level": "low" | "medium" | "high" | "critical",
  "weekly_insight": "string (short, motivating, habit-specific observation)",
  "reflection_prompt": "string (thoughtful question for their next check-in)",
  "recommended_action": "string (concrete coping strategy or recommended micro-action)",
  "suggested_next_check_in_hours": number (integer, typically 4 to 24)
}
`;

    const userPayload = {
      habit_type: profile.habit_type,
      current_streak: profile.current_streak,
      best_streak: profile.best_streak_days,
      triggers: profile.triggers,
      event_trigger: event,
      recent_urges: urges.map(u => ({ intensity: u.intensity, resisted: u.resisted, time: u.created_at })),
      recent_reflections: logs.map(l => ({ mood: l.mood_score, urge: l.urge_level, text: l.notes }))
    };

    const qwenRes = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${qwenKey}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        model: "qwen-plus",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Context data: ${JSON.stringify(userPayload)}` }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!qwenRes.ok) {
      throw new Error(`Qwen API failed with status ${qwenRes.status}`);
    }

    const qwenData = await qwenRes.json();
    const evaluation = JSON.parse(qwenData.choices[0].message.content);

    console.log(`[${functionName}] Generated evaluation for ${user.id}:`, evaluation);

    // Calculate next check-in timestamp
    const nextCheckIn = new Date();
    nextCheckIn.setHours(nextCheckIn.getHours() + (evaluation.suggested_next_check_in_hours || 12));

    // Update the profile table
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        recovery_score: evaluation.recovery_score,
        risk_score: evaluation.risk_score,
        risk_level: evaluation.risk_level,
        weekly_insight: evaluation.weekly_insight,
        reflection_prompt: evaluation.reflection_prompt,
        recommended_action: evaluation.recommended_action,
        next_check_in_at: nextCheckIn.toISOString(),
        last_ai_evaluation: new Date().toISOString()
      })
      .eq("id", user.id);

    if (updateError) {
      throw updateError;
    }

    return new Response(JSON.stringify({ success: true, evaluation }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error: any) {
    console.error(`[${functionName}] Error:`, error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }
})