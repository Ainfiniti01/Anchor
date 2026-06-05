"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';
import { Flame, Trophy, Calendar, Zap, ChevronLeft } from 'lucide-react';
import MobileLayout from '@/components/MobileLayout';
import { useNavigate } from 'react-router-dom';

const data = [
  { name: 'Mon', urges: 2 },
  { name: 'Tue', urges: 1 },
  { name: 'Wed', urges: 4 },
  { name: 'Thu', urges: 0 },
  { name: 'Fri', urges: 2 },
  { name: 'Sat', urges: 1 },
  { name: 'Sun', urges: 0 },
];

const Progress = () => {
  const navigate = useNavigate();

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
            <span className="text-3xl font-bold text-orange-700 dark:text-orange-400">5</span>
            <span className="text-xs text-orange-600 dark:text-orange-500 font-medium">Current Streak</span>
          </Card>
          <Card className="p-4 rounded-2xl border-none bg-indigo-50 dark:bg-indigo-900/20 flex flex-col gap-1">
            <Trophy className="text-indigo-500 mb-1" size={24} />
            <span className="text-3xl font-bold text-indigo-700 dark:text-indigo-400">14</span>
            <span className="text-xs text-indigo-600 dark:text-indigo-500 font-medium">Best Streak</span>
          </Card>
        </div>

        <Card className="p-6 rounded-3xl border-slate-100 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-900 dark:text-white">Urge History</h3>
            <Calendar size={18} className="text-slate-400" />
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
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
            “You struggled most at night but stayed consistent during the day. That is progress. Keep focusing on your evening routine.”
          </p>
        </Card>
      </div>
    </MobileLayout>
  );
};

export default Progress;