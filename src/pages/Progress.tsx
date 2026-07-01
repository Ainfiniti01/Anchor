"use client";

import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card } from '@/components/ui/card';
import { Flame, Trophy, Activity, Zap, ChevronLeft, Loader2, ShieldCheck, Target, Award, Sparkles, CheckCircle } from 'lucide-react';
import MobileLayout from '@/components/MobileLayout';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const Progress = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [urgeLogs, setUrgeLogs] = useState<any[]>([]);
  const [relapseLogs, setRelapseLogs] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    avgUrgesPerDay: 0,
    totalResisted: 0,
    weeklyUrgesCount: 0,
    weeklyChange: "Stable"
  });

  useEffect(() => {
    const fetchProgressData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch profile, urge logs, and relapse logs in parallel
        const [profileRes, urgesRes, relapseRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).single(),
          supabase.from('urge_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
          supabase.from('relapse_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
        ]);

        if (profileRes.data) {
          setProfile(profileRes.data);
        }

        const urges = urgesRes.data || [];
        const relapses = relapseRes.data || [];

        setUrgeLogs(urges);
        setRelapseLogs(relapses);

        // Calculate dynamic metrics
        const totalResisted = urges.filter(u => u.resisted).length;
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const recentUrges = urges.filter(u => new Date(u.created_at) >= sevenDaysAgo);
        const weeklyUrgesCount = recentUrges.length;
        const avgUrgesPerDay = Number((weeklyUrgesCount / 7).toFixed(1));

        // Prior week comparison
        const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        const priorWeekUrges = urges.filter(u => {
          const date = new Date(u.created_at);
          return date >= fourteenDaysAgo && date < sevenDaysAgo;
        });

        let weeklyChange = "Stable";
        if (weeklyUrgesCount < priorWeekUrges.length) {
          weeklyChange = "Decreasing";
        } else if (weeklyUrgesCount > priorWeekUrges.length) {
          weeklyChange = "Increasing";
        }

        setMetrics({
          avgUrgesPerDay,
          totalResisted,
          weeklyUrgesCount,
          weeklyChange
        });

      } catch (error) {
        console.error("Error loading progress data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProgressData();
  }, []);

  if (loading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="animate-spin text-emerald-600" size={32} />
        </div>
      </MobileLayout>
    );
  }

  // Construct chart data for the last 7 days
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const chartData = Array.from({ length: 7 }).map((_, index) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - index));
    const dayName = daysOfWeek[d.getDay()];
    const dateStr = d.toDateString();

    const dailyUrges = urgeLogs.filter(u => new Date(u.created_at).toDateString() === dateStr).length;
    const dailyRelapse = relapseLogs.some(r => new Date(r.created_at).toDateString() === dateStr);

    return {
      name: dayName,
      urges: dailyUrges,
      isRelapse: dailyRelapse
    };
  });

  // Calculate dynamic achievements based on user metrics
  const achievements = [];
  if (profile?.current_streak >= 1) achievements.push("Day One Anchor");
  if (profile?.current_streak >= 3) achievements.push("Consistency Built");
  if (profile?.current_streak >= 7) achievements.push("Unbreakable Week");
  if (metrics.totalResisted >= 5) achievements.push("Urge Conqueror");
  if (profile?.recovery_score >= 80) achievements.push("Fortress Mindset");
  if (achievements.length === 0) achievements.push("Journey Started");

  return (
    <MobileLayout>
      <header className="bg-emerald-600 p-6 pb-12 rounded-b-[40px] mb-6 shadow-md">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-white/80 hover:text-white transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold text-white">Your Progress</h1>
        </div>
      </header>

      <div className="px-6 space-y-6 pb-24">
        {/* Streak & Score Grid */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 rounded-2xl border-none bg-orange-50 dark:bg-orange-900/20 flex flex-col gap-1 items-center text-center">
            <Flame className="text-orange-500 animate-pulse" size={22} />
            <span className="text-2xl font-bold text-orange-700 dark:text-orange-400">
              {profile?.current_streak || 0}
            </span>
            <span className="text-[10px] text-orange-600 dark:text-orange-500 font-bold uppercase">Current Streak</span>
          </Card>
          <Card className="p-3 rounded-2xl border-none bg-indigo-50 dark:bg-indigo-900/20 flex flex-col gap-1 items-center text-center">
            <Trophy className="text-indigo-500" size={22} />
            <span className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">
              {profile?.best_streak_days || 0}
            </span>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-500 font-bold uppercase">Best Streak</span>
          </Card>
          <Card className="p-3 rounded-2xl border-none bg-emerald-50 dark:bg-emerald-900/20 flex flex-col gap-1 items-center text-center">
            <ShieldCheck className="text-emerald-500" size={22} />
            <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {profile?.recovery_score ? Math.round(profile.recovery_score) : 0}%
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-500 font-bold uppercase">Recovery %</span>
          </Card>
        </div>

        {/* Weekly Urge Chart */}
        <Card className="p-6 rounded-3xl border-slate-100 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-900 dark:text-white">Weekly Urges & Relapses</h3>
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
              <Activity size={12} />
              <span>{metrics.weeklyChange} Trend</span>
            </div>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 12, fill: '#94a3b8'}} 
                />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    backgroundColor: 'white'
                  }}
                />
                <Bar dataKey="urges" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.isRelapse ? '#ef4444' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 text-[10px] font-bold uppercase text-slate-400">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Resisted Urge</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>Relapse Event</span>
            </div>
          </div>
        </Card>

        {/* Extra metrics */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 rounded-2xl border-slate-100 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Resisted</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{metrics.totalResisted} urges</p>
          </Card>
          <Card className="p-4 rounded-2xl border-slate-100 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Avg Urges / Day</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{metrics.avgUrgesPerDay}</p>
          </Card>
        </div>

        {/* AI Insight Engine Section */}
        <Card className="p-6 rounded-3xl border-none bg-slate-900 dark:bg-indigo-950 text-white space-y-4 shadow-md">
          <div className="flex items-center gap-2 text-emerald-400">
            <Zap size={18} className="animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider">Insight Engine</span>
          </div>
          <div className="space-y-3">
            <p className="text-slate-200 text-sm leading-relaxed font-medium">
              {profile?.weekly_insight || "Anchor is observing your triggers and log patterns. Take a quick action or chat to generate recovery insights."}
            </p>
            {profile?.recommended_action && (
              <div className="mt-4 pt-4 border-t border-slate-800">
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">Recommended Action</p>
                <p className="text-slate-300 text-sm">{profile.recommended_action}</p>
              </div>
            )}
          </div>
        </Card>

        

        {/* AI Reflection Prompter */}
        <Card className="p-6 rounded-3xl border-none bg-indigo-50 dark:bg-indigo-900/20 space-y-3 shadow-sm">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Target size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">Reflection Prompt</span>
          </div>
          <p className="text-slate-700 dark:text-slate-300 font-medium">
            {profile?.reflection_prompt || "What is one small win you noticed in your behavior this week?"}
          </p>
        </Card>

        
      </div>
    </MobileLayout>
  );
};

export default Progress;