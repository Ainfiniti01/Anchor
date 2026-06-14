"use client";

import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';
import { Flame, Trophy, Activity, Zap, ChevronLeft, Loader2, ShieldCheck, Target } from 'lucide-react';
import MobileLayout from '@/components/MobileLayout';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const Progress = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchIntelligence = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      try {
        const response = await fetch('https://aymmmpfupfqlmyacilbm.supabase.co/functions/v1/progress-intelligence', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) throw new Error("Failed to fetch intelligence");
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchIntelligence();
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

  const chartData = data?.weekly_urge_pattern?.data.map((val: number, i: number) => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return { name: days[i], urges: val };
  }) || [];

  return (
    <MobileLayout>
      <header className="bg-emerald-600 p-6 pb-12 rounded-b-[40px] mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-white/80 hover:text-white">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold text-white">Your Progress</h1>
        </div>
      </header>

      <div className="px-6 space-y-6">
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 rounded-2xl border-none bg-orange-50 dark:bg-orange-900/20 flex flex-col gap-1">
            <Flame className="text-orange-500" size={20} />
            <span className="text-2xl font-bold text-orange-700 dark:text-orange-400">
              {data?.streaks?.current_streak || 0}
            </span>
            <span className="text-[10px] text-orange-600 dark:text-orange-500 font-bold uppercase">Current</span>
          </Card>
          <Card className="p-3 rounded-2xl border-none bg-indigo-50 dark:bg-indigo-900/20 flex flex-col gap-1">
            <Trophy className="text-indigo-500" size={20} />
            <span className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">
              {data?.streaks?.best_streak || 0}
            </span>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-500 font-bold uppercase">Best</span>
          </Card>
          <Card className="p-3 rounded-2xl border-none bg-emerald-50 dark:bg-emerald-900/20 flex flex-col gap-1">
            <ShieldCheck className="text-emerald-500" size={20} />
            <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {data?.streaks?.recovery_streak || 0}
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-500 font-bold uppercase">Recovery</span>
          </Card>
        </div>

        <Card className="p-6 rounded-3xl border-slate-100 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-900 dark:text-white">Weekly Urge Chart</h3>
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
              <Activity size={12} />
              <span>{data?.weekly_urge_pattern?.trend} Trend</span>
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
                <Bar dataKey="urges" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 rounded-2xl border-slate-100 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Urges</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{data?.additional_metrics?.total_urges_this_week || 0}</p>
          </Card>
          <Card className="p-4 rounded-2xl border-slate-100 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Avg/Day</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{data?.additional_metrics?.average_urges_per_day || 0}</p>
          </Card>
        </div>

        <Card className="p-6 rounded-3xl border-none bg-slate-900 dark:bg-slate-800 text-white space-y-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <Zap size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">Insight Engine</span>
          </div>
          <ul className="space-y-2">
            {data?.insights?.map((insight: string, i: number) => (
              <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                <div className="w-1 h-1 bg-emerald-500 rounded-full mt-2 shrink-0" />
                {insight}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-6 rounded-3xl border-none bg-indigo-50 dark:bg-indigo-900/20 space-y-3">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Target size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">Reflection</span>
          </div>
          <p className="text-slate-700 dark:text-slate-300 font-medium">
            {data?.weekly_urge_pattern?.most_active_day 
              ? `Urges peaked on ${data.weekly_urge_pattern.most_active_day}. What felt most challenging that day?`
              : "What is one small win you noticed in your behavior this week?"}
          </p>
        </Card>
      </div>
    </MobileLayout>
  );
};

export default Progress;