"use client";

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, User, Mail, Calendar, Shield, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const Profile = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col max-w-md mx-auto">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-slate-400">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-slate-900">Profile</h1>
        </div>
        <Button variant="ghost" size="icon" className="text-indigo-600">
          <Edit2 size={20} />
        </Button>
      </header>

      <div className="flex flex-col items-center mb-8">
        <div className="w-24 h-24 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-sm">
          <User size={48} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">User Name</h2>
        <p className="text-slate-500">Member since Oct 2023</p>
      </div>

      <div className="space-y-4">
        <Card className="p-4 border-none shadow-sm rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center">
            <Mail size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase">Email</p>
            <p className="font-medium text-slate-700">user@example.com</p>
          </div>
        </Card>

        <Card className="p-4 border-none shadow-sm rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center">
            <Shield size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase">Focus Habit</p>
            <p className="font-medium text-slate-700">Porn addiction</p>
          </div>
        </Card>

        <Card className="p-4 border-none shadow-sm rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center">
            <Calendar size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase">Check-in Frequency</p>
            <p className="font-medium text-slate-700">3 times per day</p>
          </div>
        </Card>
      </div>

      <div className="mt-auto pt-8">
        <Button 
          variant="outline" 
          className="w-full h-14 rounded-2xl border-slate-200 text-slate-600 font-bold"
          onClick={() => navigate('/setup-profile')}
        >
          Redo Setup Flow
        </Button>
      </div>
    </div>
  );
};

export default Profile;