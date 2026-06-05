"use client";

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, MessageCircle, AlertCircle, TrendingUp, Clock, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import MobileLayout from '@/components/MobileLayout';

const Home = () => {
  const navigate = useNavigate();

  return (
    <MobileLayout>
      <div className="p-6 space-y-6">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Hello, Friend</h1>
            <p className="text-slate-500">Let's stay strong today.</p>
          </div>
          <div className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-4 py-2 rounded-2xl flex items-center gap-2 font-bold">
            <Flame size={20} />
            <span>5 Days</span>
          </div>
        </header>

        <Card className="p-6 bg-indigo-600 text-white border-none shadow-lg shadow-indigo-200 dark:shadow-none rounded-3xl">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-indigo-100 text-sm font-medium">Next Check-in</p>
              <h3 className="text-xl font-bold">Afternoon Reflection</h3>
            </div>
            <Clock className="text-indigo-200" />
          </div>
          <div className="flex items-center gap-2 text-indigo-100 text-sm mb-6">
            <div className="w-2 h-2 bg-indigo-300 rounded-full animate-pulse" />
            Scheduled for 2:00 PM
          </div>
          <Button 
            onClick={() => navigate('/check-in')}
            className="w-full bg-white text-indigo-600 hover:bg-indigo-50 rounded-xl font-bold"
          >
            Start Check-in
          </Button>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 rounded-2xl border-slate-100 dark:border-slate-800 dark:bg-slate-900 shadow-sm flex flex-col items-center text-center gap-2">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <span className="text-xs text-slate-500 font-medium">Mood Status</span>
            <span className="font-bold text-slate-900 dark:text-white">Stable</span>
          </Card>
          <Card className="p-4 rounded-2xl border-slate-100 dark:border-slate-800 dark:bg-slate-900 shadow-sm flex flex-col items-center text-center gap-2">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center">
              <AlertCircle size={20} />
            </div>
            <span className="text-xs text-slate-500 font-medium">Urge Level</span>
            <span className="font-bold text-slate-900 dark:text-white">Low</span>
          </Card>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Quick Actions</h2>
          <Button 
            onClick={() => navigate('/chat')}
            variant="outline" 
            className="w-full h-16 justify-start gap-4 rounded-2xl border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 px-6"
          >
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
              <MessageCircle size={20} />
            </div>
            <div className="text-left">
              <p className="font-bold text-slate-900 dark:text-white">Talk to Anchor</p>
              <p className="text-xs text-slate-500">AI Support anytime</p>
            </div>
          </Button>
          
          <Button 
            onClick={() => navigate('/log-urge')}
            variant="outline" 
            className="w-full h-16 justify-start gap-4 rounded-2xl border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 px-6"
          >
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-center">
              <AlertCircle size={20} />
            </div>
            <div className="text-left">
              <p className="font-bold text-slate-900 dark:text-white">Log Urge</p>
              <p className="text-xs text-slate-500">Track and resist</p>
            </div>
          </Button>

          <Button 
            onClick={() => navigate('/progress')}
            variant="outline" 
            className="w-full h-16 justify-start gap-4 rounded-2xl border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 px-6"
          >
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center">
              <Calendar size={20} />
            </div>
            <div className="text-left">
              <p className="font-bold text-slate-900 dark:text-white">View Progress</p>
              <p className="text-xs text-slate-500">See your journey</p>
            </div>
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
};

export default Home;