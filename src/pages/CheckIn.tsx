"use client";

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Smile, Meh, Frown, AlertCircle, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';

const CheckIn = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [mood, setMood] = useState<number | null>(null);
  const [urge, setUrge] = useState<number | null>(null);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFinish = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      // 1. Insert log - this will trigger the streak update in the DB
      const { error: logError } = await supabase.from('behavioral_logs').insert([{
        user_id: user.id,
        mood_score: mood,
        urge_level: urge,
        notes: response,
        relapse_occurred: false // Default to false for standard check-in
      }]);

      if (logError) throw logError;

      // 2. Trigger DB risk calculation
      await supabase.rpc('calculate_user_risk', { p_user_id: user.id });

      // 3. Get active session and trigger AI evaluation
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetch('https://aymmmpfupfqlmyacilbm.supabase.co/functions/v1/evaluate-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            event: "daily_checkin"
          })
        });
      }
      
      showSuccess("Check-in completed. Your recovery state has been re-evaluated!");
      navigate('/home');
    } catch (error: any) {
      showError(error.message || "Failed to complete check-in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 flex flex-col max-w-md mx-auto">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="text-slate-400">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Daily Check-in</h1>
      </header>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">How are you feeling?</h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: Smile, label: 'Good', score: 1, color: 'text-green-500' },
                { icon: Meh, label: 'Okay', score: 0, color: 'text-yellow-500' },
                { icon: Frown, label: 'Bad', score: -2, color: 'text-red-500' },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => setMood(item.score)}
                  className={`p-6 rounded-3xl flex flex-col items-center gap-2 transition-all border-2 ${
                    mood === item.score ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-transparent bg-white dark:bg-slate-900'
                  }`}
                >
                  <item.icon size={32} className={item.color} />
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{item.label}</span>
                </button>
              ))}
            </div>
            <Button disabled={mood === null} onClick={() => setStep(2)} className="w-full h-14 rounded-2xl bg-indigo-600">Next</Button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">What is your urge level?</h2>
            <div className="space-y-3">
              {[
                { label: 'Low', val: 0 },
                { label: 'Medium', val: 1 },
                { label: 'High', val: 2 }
              ].map((level) => (
                <button
                  key={level.label}
                  onClick={() => setUrge(level.val)}
                  className={`w-full p-5 rounded-2xl text-left border-2 transition-all flex justify-between items-center ${
                    urge === level.val ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400' : 'border-transparent bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className="font-bold">{level.label}</span>
                  {urge === level.val && <AlertCircle size={20} />}
                </button>
              ))}
            </div>
            <Button disabled={urge === null} onClick={() => setStep(3)} className="w-full h-14 rounded-2xl bg-indigo-600">Next</Button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Any thoughts?</h2>
            <Textarea
              placeholder="Type your reflection here..."
              className="min-h-[200px] rounded-3xl bg-white dark:bg-slate-900 border-none p-6 text-lg"
              value={response}
              onChange={(e) => setResponse(e.target.value)}
            />
            <Button onClick={handleFinish} disabled={loading} className="w-full h-14 rounded-2xl bg-indigo-600 font-bold text-lg">
              {loading ? <Loader2 className="animate-spin" /> : 'Complete Check-in'}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CheckIn;