"use client";

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, User, Mail, Calendar, Shield, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const Profile = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col max-w-md mx-auto">
      <header className="bg-indigo-600 p-6 pb-20 rounded-b-[40px] relative">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="text-white/80 hover:text-white">
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-xl font-bold text-white">Profile</h1>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white/80 hover:text-white hover:bg-white/10"
            onClick={() => navigate('/setup-profile')}
          >
            <Edit2 size={20} />
          </Button>
        </div>

        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center">
          <div className="w-24 h-24 bg-white dark:bg-slate-900 text-indigo-600 rounded-full flex items-center justify-center border-4 border-slate-50 dark:border-slate-950 shadow-lg">
            <User size={48} />
          </div>
        </div>
      </header>

      <div className="mt-16 px-6 flex flex-col items-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">User Name</h2>
        <p className="text-slate-500 dark:text-slate-400">Member since Oct 2023</p>
      </div>

      <div className="px-6 space-y-4">
        <Card className="p-4 border-none shadow-sm rounded-2xl flex items-center gap-4 dark:bg-slate-900">
          <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-xl flex items-center justify-center">
            <Mail size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase">Email</p>
            <p className="font-medium text-slate-700 dark:text-slate-200">user@example.com</p>
          </div>
        </Card>

        <Card className="p-4 border-none shadow-sm rounded-2xl flex items-center gap-4 dark:bg-slate-900">
          <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-xl flex items-center justify-center">
            <Shield size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase">Focus Habit</p>
            <p className="font-medium text-slate-700 dark:text-slate-200">Porn addiction</p>
          </div>
        </Card>

        <Card className="p-4 border-none shadow-sm rounded-2xl flex items-center gap-4 dark:bg-slate-900">
          <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-xl flex items-center justify-center">
            <Calendar size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase">Check-in Frequency</p>
            <p className="font-medium text-slate-700 dark:text-slate-200">3 times per day</p>
          </div>
        </Card>
      </div>

      <div className="mt-auto p-6">
        <Button 
          variant="outline" 
          className="w-full h-14 rounded-2xl border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold"
          onClick={() => navigate('/setup-profile')}
        >
          Redo Setup Flow
        </Button>
      </div>
    </div>
  );
};

export default Profile;