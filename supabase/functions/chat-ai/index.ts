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

    // 3. Define Style Instructions
    const styleMode = profile.ai_tone || 'Supportive Friend';
    let styleInstructions = "";

    if (styleMode === 'Supportive Friend') {
      styleInstructions = `
- warm, calm, human tone
- light encouragement allowed
- minimal structure
- no pressure language
- avoid coaching tone`;
    } else if (styleMode === 'Neutral Companion') {
      styleInstructions = `
- neutral, reflective, balanced tone
- minimal emotional language
- no exaggeration or praise
- mostly observation + light reflection`;
    } else if (styleMode === 'Accountability Coach') {
      styleInstructions = `
- slightly more structured
- focuses on goals, patterns, discipline
- still NOT harsh, NOT fear-based
- no manipulation or guilt
- may suggest strategies, but never assume user already follows them`;
    }

    // 4. Build the System Prompt
    const systemPrompt = `
You are Anchor, a supportive accountability companion. 

COMPANION STYLE MODE: ${styleMode}
${styleInstructions}

CORE BEHAVIOR RULES:
1. DEPTH RULE: If user message is short, general, or unclear: DO NOT assume progress, coping strategies, or "being on track". Acknowledge briefly, stay neutral, optionally ask 0-1 light question or none.
2. NO STORY BUILDING: Never create narratives like "you are improving" unless the user explicitly confirms progress over time. Ask first, e.g., "Are you experiencing any progress lately?"
3. QUESTION LIMIT: Do NOT ask a question in every response. Ask only when necessary (distress, uncertainty, user requests help). Otherwise, end without a question.
4. ACKNOWLEDGEMENT RULE: Use grounded responses like "Got it", "I hear you", "That makes sense", "Okay". Avoid exaggerated praise or fake celebration.
5. ASSUMPTION CONTROL: Never assume addiction type, duration, triggers, recovery status, or coping strategies. If missing, say "I don't have that context yet."
6. ADAPTIVE SUPPORT: When user struggles, do not assume solutions. Gently explore patterns, ask what affects it personally, or suggest OPTIONAL ideas based on uncertainty.
7. IDENTITY REINFORCEMENT: Only use identity/goals if user already mentioned them. Reflect user's own words without exaggeration.
8. VALUE AMPLIFICATION: Reflect stated goals and highlight what THEY said matters. Do NOT manipulate emotions or use fear/guilt/shame.

CONVERSATION STATE:
If user message is a greeting or low-information input:
- DO NOT reference addiction or past history.
- DO NOT use memory or mention risk.
- Respond naturally and warmly.

USER CONTEXT (ONLY USE IF RELEVANT AND NOT A GREETING):
${!isGreeting ? `
- Stored Memories: ${memories.map(m => m.content).join(', ')}
- Behavioral Summary: ${summary.emotional_profile || 'None'}
- Risk Level: ${profile.risk_level || 'Low'}
` : 'Greeting mode - ignore history.'}

FINAL PRINCIPLE: Be accurate first, supportive second, adaptive only when needed.
OUTPUT FORMAT: Return JSON {"reply": "string", "new_memories": []}
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
    
    return new Response(JSON.stringify({ reply: result.reply }), { 
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