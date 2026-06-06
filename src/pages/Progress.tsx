"use client";

import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';
import { Flame, Trophy, Calendar, Zap, ChevronLeft, Loader2 } from 'lucide-react';
import MobileLayout from '@/components/MobileLayout';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const Progress = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch profile for streaks
      const { data: profileData } = await supabase
        .from('profiles')
        .select('current_streak, best_streak')
        .eq('id', user.id)
        .single();
      
      setProfile(profileData);

      // Fetch last 7 days of urge logs
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: logs } = await supabase
        .from('urge_logs')
        .select('created_at')
        .eq('user_id', user.id)
        .gte('created_at', sevenDaysAgo.toISOString());

      // Process logs for chart
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return {
          name: days[d.getDay()],
          dateStr: d.toISOString().split('T')[0],
          urges: 0
        };
      });

      logs?.forEach(log => {
        const logDate = log.created_at.split('T')[0];
        const day = last7Days.find(d => d.dateStr === logDate);
        if (day) day.urges++;
      });

      setChartData(last7Days);
      setLoading(false);
    };

    fetchData();
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
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 rounded-2xl border-none bg-orange-50 dark:bg-orange-900/20 flex flex-col gap-1">
            <Flame className="text-orange-500 mb-1" size={24} />
            <span className="text-3xl font-bold text-orange-700 dark:text-orange-400">
              {profile?.current_streak || 0}
            </span>
            <span className="text-xs text-orange-600 dark:text-orange-500 font-medium">Current Streak</span>
          </Card>
          <Card className="p-4 rounded-2xl border-none bg-indigo-50 dark:bg-indigo-900/20 flex flex-col gap-1">
            <Trophy className="text-indigo-500 mb-1" size={24} />
            <span className="text-3xl font-bold text-indigo-700 dark:text-indigo-400">
              {profile?.best_streak || 0}
            </span>
            <span className="text-xs text-indigo-600 dark:text-indigo-500 font-medium">Best Streak</span>
          </Card>
        </div>

        <Card className="p-6 rounded-3xl border-slate-100 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-900 dark:text-white">Urge History (Last 7 Days)</h3>
            <Calendar size={18} className="text-slate-400" />
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

        <Card className="p-6 rounded-3xl border-none bg-slate-900 dark:bg-slate-800 text-white space-y-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <Zap size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">AI Insight</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            {chartData.reduce((acc, curr) => acc + curr.urges, 0) > 5 
              ? "You've had a few more urges this week. Remember to use your triggers list to stay prepared."
              : "Great job staying consistent this week. Your urge levels are trending downwards."}
          </p>
        </Card>
      </div>
    </MobileLayout>
  );
};

export default Progress;