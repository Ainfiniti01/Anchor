"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Card } from '@/components/ui/card';
import { Flame, Trophy, Calendar, Zap } from 'lucide-react';
import MobileLayout from '@/components/MobileLayout';

const data = [
  { name: 'Mon', urges: 2, mood: 4 },
  { name: 'Tue', urges: 1, mood: 5 },
  { name: 'Wed', urges: 4, mood: 3 },
  { name: 'Thu', urges: 0, mood: 5 },
  { name: 'Fri', urges: 2, mood: 4 },
  { name: 'Sat', urges: 1, mood: 5 },
  { name: 'Sun', urges: 0, mood: 5 },
];

const Progress = () => {
  return (
    <MobileLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Your Progress</h1>

        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 rounded-2xl border-none bg-orange-50 flex flex-col gap-1">
            <Flame className="text-orange-500 mb-1" size={24} />
            <span className="text-3xl font-bold text-orange-700">5</span>
            <span className="text-xs text-orange-600 font-medium">Current Streak</span>
          </Card>
          <Card className="p-4 rounded-2xl border-none bg-indigo-50 flex flex-col gap-1">
            <Trophy className="text-indigo-500 mb-1" size={24} />
            <span className="text-3xl font-bold text-indigo-700">14</span>
            <span className="text-xs text-indigo-600 font-medium">Best Streak</span>
          </Card>
        </div>

        <Card className="p-6 rounded-3xl border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-900">Urge History</h3>
            <Calendar size={18} className="text-slate-400" />
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                />
                <Bar dataKey="urges" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 rounded-3xl border-none bg-slate-900 text-white space-y-4">
          <div className="flex items-center gap-2 text-indigo-400">
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