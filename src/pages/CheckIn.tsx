"use client";

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft, Send, Smile, Meh, Frown, AlertCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { showSuccess } from '@/utils/toast';

const CheckIn = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [mood, setMood] = useState<string | null>(null);
  const [urge, setUrge] = useState<string | null>(null);
  const [response, setResponse] = useState('');

  const handleFinish = () => {
    showSuccess("Check-in completed. Stay strong!");
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col max-w-md mx-auto">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="text-slate-400">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-slate-900">Daily Check-in</h1>
      </header>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-bold text-slate-900">How are you feeling right now?</h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: Smile, label: 'Good', color: 'text-green-500', bg: 'bg-green-50' },
                { icon: Meh, label: 'Okay', color: 'text-yellow-500', bg: 'bg-yellow-50' },
                { icon: Frown, label: 'Bad', color: 'text-red-500', bg: 'bg-red-50' },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => setMood(item.label)}
                  className={`p-6 rounded-3xl flex flex-col items-center gap-2 transition-all border-2 ${
                    mood === item.label ? 'border-indigo-600 bg-indigo-50' : 'border-transparent bg-white'
                  }`}
                >
                  <item.icon size={32} className={item.color} />
                  <span className="text-sm font-bold text-slate-600">{item.label}</span>
                </button>
              ))}
            </div>
            <Button 
              disabled={!mood} 
              onClick={() => setStep(2)}
              className="w-full h-14 rounded-2xl bg-indigo-600"
            >
              Next
            </Button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-bold text-slate-900">What is your urge level?</h2>
            <div className="space-y-3">
              {['Low', 'Medium', 'High'].map((level) => (
                <button
                  key={level}
                  onClick={() => setUrge(level)}
                  className={`w-full p-5 rounded-2xl text-left border-2 transition-all flex justify-between items-center ${
                    urge === level 
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                      : 'border-transparent bg-white text-slate-600'
                  }`}
                >
                  <span className="font-bold">{level}</span>
                  {urge === level && <AlertCircle size={20} />}
                </button>
              ))}
            </div>
            <Button 
              disabled={!urge} 
              onClick={() => setStep(3)}
              className="w-full h-14 rounded-2xl bg-indigo-600"
            >
              Next
            </Button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-bold text-slate-900">Any thoughts you want to share?</h2>
            <Textarea
              placeholder="Type your reflection here..."
              className="min-h-[200px] rounded-3xl bg-white border-none p-6 text-lg"
              value={response}
              onChange={(e) => setResponse(e.target.value)}
            />
            <Button 
              onClick={handleFinish}
              className="w-full h-14 rounded-2xl bg-indigo-600 font-bold text-lg"
            >
              Complete Check-in
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CheckIn;