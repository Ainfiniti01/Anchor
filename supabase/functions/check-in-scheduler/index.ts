import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const qwenKey = Deno.env.get('QWEN_API_KEY')!

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Find users due for a check-in
    const { data: users } = await supabase
      .from('profiles')
      .select('id, next_check_in_at, display_name')
      .lte('next_check_in_at', new Date().toISOString())
      .limit(10);

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ message: "No check-ins due" }), { headers: corsHeaders });
    }

    for (const user of users) {
      console.log(`[check-in-scheduler] Processing check-in for user: ${user.id}`);

      // 2. Generate personalized check-in message using Qwen
      const { data: memories } = await supabase.rpc('get_prioritized_memories', { p_user_id: user.id });
      
      const qwenRes = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${qwenKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "qwen-plus",
          messages: [
            { role: "system", content: "You are Anchor. Generate a short, personalized check-in message (1 sentence) based on user memories. No generic greetings." },
            { role: "user", content: `User: ${user.display_name}. Memories: ${memories?.map(m => m.content).join('; ')}` }
          ]
        })
      });

      const qwenData = await qwenRes.json();
      const checkInMessage = qwenData.choices[0].message.content;

      // 3. Save to chat history (this triggers the notification in a real app)
      await supabase.from('chat_messages').insert({
        user_id: user.id,
        role: 'ai',
        message: checkInMessage
      });

      // 4. Reset scheduler
      const nextCheckIn = new Date();
      nextCheckIn.setHours(nextCheckIn.getHours() + 24); // Default to 24h if not specified
      await supabase.from('profiles').update({ next_check_in_at: nextCheckIn.toISOString() }).eq('id', user.id);
    }

    return new Response(JSON.stringify({ success: true, processed: users.length }), { headers: corsHeaders });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }
})