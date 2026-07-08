"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, MessageCircle, AlertCircle, TrendingUp, Clock, ShieldAlert, X, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import MobileLayout from '@/components/MobileLayout';
import { supabase } from '@/integrations/supabase/client';
import { useChat } from '@/context/ChatContext';

const Home = () => {
  const navigate = useNavigate();
  const { isFirstTimeUser, refreshChat } = useChat();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showBanner, setShowBanner] = useState(true);
  const [isVerified, setIsVerified] = useState(true);
  const [isCheckInDue, setIsCheckInDue] = useState(false);
  const [nextCheckInString, setNextCheckInString] = useState<string>('');
  const [computedStreak, setComputedStreak] = useState(0);

  useEffect(() => {
    refreshChat(); // Sync chat state to detect first-time user accurately
    
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsVerified(!!user.email_confirmed_at);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (!error && data) {
          setProfile(data);
          
          // Compute streak dynamically on client side so it updates in real time
          const lastRelapseDate = data.last_relapse_at ? new Date(data.last_relapse_at) : new Date(user.created_at);
          const diffMs = Math.max(0, Date.now() - lastRelapseDate.getTime());
          const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          setComputedStreak(days);

          // If recovery score is 0 or uncalculated, trigger a secure initial evaluate-user call
          if (!data.recovery_score || data.recovery_score === 0) {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session) {
                const evalRes = await fetch('https://aymmmpfupfqlmyacilbm.supabase.co/functions/v1/evaluate-user', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                  },
                  body: JSON.stringify({ event: "home_fetch_sync" })
                });
                if (evalRes.ok) {
                  const evalData = await evalRes.json();
                  if (evalData.evaluation) {
                    setProfile((prev: any) => ({
                      ...prev,
                      recovery_score: evalData.evaluation.recovery_score,
                      risk_score: evalData.evaluation.risk_score,
                      risk_level: evalData.evaluation.risk_level,
                    }));
                  }
                }
              }
            } catch (evalErr) {
              console.warn("Home initial sync evaluation error:", evalErr);
            }
          }

          if (data.next_check_in_at) {
            const nextTime = new Date(data.next_check_in_at);
            const now = new Date();
            
            if (nextTime <= now) {
              setIsCheckInDue(true);
            } else {
              setIsCheckInDue(false);
              const isToday = nextTime.toDateString() === now.toDateString();
              const timeString = nextTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              setNextCheckInString(isToday ? `Today at ${timeString}` : `${nextTime.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeString}`);
            }
          } else {
            setIsCheckInDue(true);
          }
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = profile?.display_name || 'there';
    if (hour >= 5 && hour < 12) return `Good morning, ${name}.`;
    if (hour >= 12 && hour < 17) return `Good afternoon, ${name}.`;
    return `Good evening, ${name}.`;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-indigo-600" size={32} />
    </div>
  );

  return (
    <MobileLayout>
      {!isVerified && showBanner && (
        <div className="bg-amber-50 border-b border-amber-100 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-800 text-xs font-medium">
            <ShieldAlert size={16} />
            <span>Verify your email to secure your account.</span>
          </div>
          <button onClick={() => setShowBanner(false)} className="text-amber-400"><X size={16} /></button>
        </div>
      )}

      <div className="p-6 space-y-6">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{getGreeting()}</h1>
            <p className="text-slate-500">Let's stay strong today.</p>
          </div>
          <div className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-4 py-2 rounded-2xl flex items-center gap-2 font-bold shadow-sm">
            <Flame size={20} className="animate-pulse" />
            <span>{computedStreak} Days</span>
          </div>
        </header>

        {isCheckInDue ? (
          <Card className="p-6 bg-emerald-600 text-white border-none shadow-lg shadow-emerald-100 dark:shadow-none rounded-3xl">
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-emerald-100 text-sm font-bold uppercase tracking-wider">
                  <Sparkles size={16} className="animate-spin" style={{ animationDuration: '4s' }} />
                  <span>Anchor is waiting</span>
                </div>
                <h3 className="text-xl font-bold">Time for a check-in?</h3>
                <p className="text-emerald-50 text-sm">Let's log your emotional state to keep your streak alive.</p>
              </div>
            </div>
            <Button onClick={() => navigate('/check-in')} className="w-full bg-white text-emerald-600 hover:bg-emerald-50 rounded-xl font-bold shadow-sm">
              Check In Now
            </Button>
          </Card>
        ) : (
          <Card className="p-6 bg-indigo-600 text-white border-none shadow-lg shadow-indigo-100 dark:shadow-none rounded-3xl">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-indigo-100 text-sm font-medium uppercase tracking-wider">Next Scheduled</p>
                <h3 className="text-xl font-bold mt-1">{nextCheckInString || 'Daily Reflection'}</h3>
              </div>
              <Clock className="text-indigo-200 animate-pulse" />
            </div>
            <Button onClick={() => navigate('/check-in')} className="w-full bg-white text-indigo-600 hover:bg-indigo-700 rounded-xl font-bold shadow-sm">
              Check In Early
            </Button>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 rounded-2xl border-slate-100 dark:border-slate-800 dark:bg-slate-900 shadow-sm flex flex-col items-center text-center gap-2">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <span className="text-xs text-slate-500 font-medium">Risk Score</span>
            <span className="font-bold text-slate-900 dark:text-white">{(profile?.risk_score ?? 0).toFixed(1)}</span>
          </Card>
          <Card className="p-4 rounded-2xl border-slate-100 dark:border-slate-800 dark:bg-slate-900 shadow-sm flex flex-col items-center text-center gap-2">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center">
              <AlertCircle size={20} />
            </div>
            <span className="text-xs text-slate-500 font-medium">Risk Level</span>
            <span className="font-bold text-slate-900 dark:text-white capitalize">{profile?.risk_level || 'Low'}</span>
          </Card>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Quick Actions</h2>
          <Button 
            onClick={() => navigate('/chat')} 
            variant="outline" 
            className={`w-full h-16 justify-start gap-4 rounded-2xl border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 px-6 transition-all duration-500 ${
              isFirstTimeUser 
                ? 'ring-4 ring-indigo-500/30 border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 animate-pulse shadow-lg shadow-indigo-500/10' 
                : ''
            }`}
          >
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
              <MessageCircle size={20} />
            </div>
            <div className="text-left">
              <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                Talk to Anchor
                {isFirstTimeUser && (
                  <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider animate-bounce">
                    Start Here
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-500">AI Support anytime</p>
            </div>
          </Button>
          <Button onClick={() => navigate('/log-urge')} variant="outline" className="w-full h-16 justify-start gap-4 rounded-2xl border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 px-6">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-center"><AlertCircle size={20} /></div>
            <div className="text-left">
              <p className="font-bold text-slate-900 dark:text-white">Log Urge</p>
              <p className="text-xs text-slate-500">Track and resist</p>
            </div>
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
};

export default Home;
</dyad-file>

Now, let's update the `check-in-scheduler` Edge Function to support AI-initiated conversations. When scheduled notifications occur, it will generate a personalized message using Qwen, store it in `chat_messages` with `read: false` (unread), and trigger the notification.

<dyad-write path="supabase/functions/check-in-scheduler/index.ts" description="Updating check-in-scheduler Edge Function to support AI-initiated conversations and mark messages as unread">
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
      
      const qwenRes = await fetch("https://ws-12c4bsjrjqxy8v2b.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${qwenKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "qwen3.7-max-2026-06-08",
          messages: [
            { role: "system", content: "You are Anchor. Generate a short, personalized check-in message (1 sentence) based on user memories. No generic greetings." },
            { role: "user", content: `User: ${user.display_name}. Memories: ${memories?.map(m => m.content).join('; ')}` }
          ]
        })
      });

      const qwenData = await qwenRes.json();
      const checkInMessage = qwenData.choices[0].message.content;

      // 3. Save to chat history as unread (this triggers the notification and unread badge in real-time)
      await supabase.from('chat_messages').insert({
        user_id: user.id,
        role: 'ai',
        message: checkInMessage,
        read: false
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