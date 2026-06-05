"use client";

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, AlertCircle, Zap, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { showSuccess } from '@/utils/toast';

const LogUrge = () => {
  const navigate = useNavigate();
  const [intensity, setIntensity] = useState<number | null>(null);

  const handleLog = () => {
    showSuccess("Urge logged. You're doing great by acknowledging it.");
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col max-w-md mx-auto">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="text-slate-400">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-slate-900">Log Urge</h1>
      </header>

      <div className="flex-1 space-y-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">How strong is the urge?</h2>
          <p className="text-slate-500">Be honest with yourself. We're here to help.</p>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((num) => (
            <button
              key={num}
              onClick={() => setIntensity(num)}
              className={`h-16 rounded-xl font-bold text-xl transition-all ${
                intensity === num 
                  ? 'bg-red-600 text-white scale-110 shadow-lg shadow-red-200' 
                  : 'bg-white text-slate-400 border border-slate-100'
              }`}
            >
              {num}
            </button>
          ))}
        </div>

        <Card className="p-6 bg-white border-none shadow-sm rounded-3xl space-y-4">
          <div className="flex items-center gap-3 text-indigo-600">
            <Zap size={20} />
            <h3 className="font-bold">Quick Tip</h3>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed">
            Try the 5-minute rule: Tell yourself you'll wait just 5 minutes before acting. Often, the peak of the urge passes by then.
          </p>
        </Card>
      </div>

      <div className="mt-8 space-y-3">
        <Button 
          onClick={handleLog}
          disabled={intensity === null}
          className="w-full h-14 rounded-2xl bg-red-600 hover:bg-red-700 font-bold text-lg"
        >
          Log and Resist
        </Button>
        <Button 
          variant="ghost"
          onClick={() => navigate('/chat')}
          className="w-full h-14 rounded-2xl text-indigo-600 font-bold"
        >
          Talk to Anchor instead
        </Button>
      </div>
    </div>
  );
};

export default LogUrge;