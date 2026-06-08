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

    // Fetch context including learned preferences and recent feedback
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    const { data: feedback } = await supabase.from('interaction_feedback')
      .select('is_helpful, feedback_text')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    const prompt = `
You are Anchor, a supportive accountability companion.
USER PROFILE: ${profile?.habit_type || 'General support'}
TONE PREFERENCE: ${profile?.ai_tone || 'supportive'}
LEARNED PREFERENCES: ${JSON.stringify(profile?.learned_preferences || {})}
RECENT FEEDBACK: ${JSON.stringify(feedback || [])}

STRICT BEHAVIORAL RULES:
1. NEVER use fear tactics or shame.
2. NEVER use manipulation or guilt-tripping.
3. If the user previously marked a style as "not helpful", adjust immediately.
4. Focus on empowerment, self-compassion, and practical steps.
5. Keep responses concise and human-like.

USER MESSAGE: ${message}
`

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${groqKey}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are Anchor, a supportive companion who learns from user feedback." }, 
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      }),
    })

    const groqData = await groqResponse.json();
    const aiReply = groqData.choices?.[0]?.message?.content || "I'm here for you. How can I help?";

    return new Response(JSON.stringify({ reply: aiReply }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
})