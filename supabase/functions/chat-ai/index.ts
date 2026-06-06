import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, profile } = await req.json()
    const apiKey = Deno.env.get("GROQ_API_KEY")

    if (!apiKey) {
      console.error("[chat-ai] GROQ_API_KEY is not set in environment variables");
      throw new Error("AI Service configuration error");
    }

    const prompt = `
You are Anchor, a supportive accountability companion.

User Profile:
- Addiction: ${profile.addiction_type}
- Duration: ${profile.duration}
- Risk level: ${profile.risk_level}
- Triggers: ${profile.triggers?.join(", ")}

User message:
${message}

Rules:
- Be calm and supportive
- Do not judge
- Ask 1 short reflective question max
- Keep response short
`

    console.log("[chat-ai] Sending request to Groq API...");
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-70b-versatile",
        messages: [
          { role: "system", content: "You are Anchor, an accountability companion." },
          { role: "user", content: prompt }
        ]
      }),
    })

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[chat-ai] Groq API error response:", errorText);
      throw new Error(`AI Service error: ${response.status}`);
    }

    const data = await response.json()
    const aiMessage = data.choices[0].message.content

    return new Response(
      JSON.stringify({ reply: aiMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error: any) {
    console.error("[chat-ai] Function error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})