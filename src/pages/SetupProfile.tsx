"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, ChevronRight, ChevronLeft, Loader2, Lock, Fingerprint, ShieldOff } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';

const steps = [
  {
    id: 'habit_type',
    title: 'What habit are we focusing on?',
    options: ['Porn Addiction', 'Substance Use', 'Social Media', 'Gaming', 'Other'],
    type: 'single'
  },
  {
    id: 'habit_duration',
    title: 'How long has this been a struggle?',
    options: ['Less than 1 month', '1–6 months', '6 months – 2 years', '2+ years'],
    type: 'single'
  },
  {
    id: 'triggers',
    title: 'What triggers your urges?',
    options: ['Boredom', 'Stress', 'Loneliness', 'Night Time', 'Emotional Distress', 'Social Pressure'],
    type: 'multi'
  },
  {
    id: 'risk_level',
    title: 'Self-perceived risk level',
    options: ['Low', 'Medium', 'High'],
    type: 'single'
  },
  {
    id: 'check_in_frequency',
    title: 'Notification frequency',
    options: ['1 daily', '2 daily', '3 daily'],
    type: 'single'
  },
  {
    id: 'ai_tone',
    title: 'AI Companion Style',
    options: ['Supportive Friend', 'Neutral Companion', 'Accountability Coach'],
    type: 'single'
  },
  {
    id: 'privacy_lock',
    title: 'Protect Anchor with an app lock?',
    options: [
      { label: 'No lock', value: 'none', icon: ShieldOff },
      { label: '4-digit PIN', value: 'pin', icon: Lock },
      { label: 'Biometric (Recommended)', value: 'biometric', icon: Fingerprint }
    ],
    type: 'lock'
  }
];

const SetupProfile = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<Record<string, any>>({});
  const [customHabit, setCustomHabit] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showError("Please log in to complete setup");
        navigate('/login');
      }
      setAuthLoading(false);
    };
    checkAuth();
  }, [navigate]);

  const isOtherSelected = selections.habit_type === 'Other';
  const isOtherValid = !isOtherSelected || (isOtherSelected && customHabit.trim().length > 0);
  const isPinValid = selections.privacy_lock !== 'pin' || pin.length === 4;

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      
      if (!user) {
        showError("Authentication session lost. Please log in again.");
        setLoading(false);
        navigate('/login');
        return;
      }

      const finalHabit = selections.habit_type === 'Other' ? customHabit : selections.habit_type;

      // 1. Update profile data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          habit_type: finalHabit,
          habit_duration: selections.habit_duration,
          triggers: selections.triggers,
          risk_level: selections.risk_level,
          check_in_frequency: selections.check_in_frequency,
          ai_tone: selections.ai_tone,
          privacy_lock_type: selections.privacy_lock,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) {
        showError(profileError.message);
        setLoading(false);
        return;
      }

      // 2. Set PIN securely if selected
      if (selections.privacy_lock === 'pin' && pin) {
        const { error: pinError } = await supabase.rpc('set_user_pin', { p_pin: pin });
        if (pinError) {
          showError("Failed to set PIN securely");
          setLoading(false);
          return;
        }
      }

      showSuccess("Profile setup complete!");
      navigate('/home');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const toggleOption = (option: string) => {
    const step = steps[currentStep];
    if (step.type === 'single' || step.type === 'lock') {
      setSelections({ ...selections, [step.id]: option });
    } else if (step.type === 'multi') {
      const current = selections[step.id] || [];
      const updated = current.includes(option)
        ? current.filter((o: string) => o !== option)
        : [...current, option];
      setSelections({ ...selections, [step.id]: updated });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  const step = steps[currentStep];

  return (
    <div className="min-h-screen bg-white p-6 flex flex-col max-w-md mx-auto">
      <div className="flex justify-between items-center mb-8">
        <button onClick={handleBack} className={`text-slate-400 hover:text-slate-600 ${currentStep === 0 ? 'invisible' : ''}`}>
          <ChevronLeft size={24} />
        </button>
        <div className="flex gap-1">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentStep ? 'w-8 bg-indigo-600' : 'w-2 bg-slate-100'
              }`} 
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -20, opacity: 0 }}
          className="flex-1 flex flex-col"
        >
          <h2 className="text-3xl font-bold text-slate-900 mb-8">{step.title}</h2>

          <div className="space-y-3">
            {step.type === 'lock' ? (
              step.options.map((opt: any) => (
                <div key={opt.value} className="space-y-3">
                  <button
                    onClick={() => toggleOption(opt.value)}
                    className={`w-full p-5 rounded-2xl text-left border-2 transition-all flex justify-between items-center ${
                      selections.privacy_lock === opt.value 
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                        : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <opt.icon size={20} />
                      <span className="font-medium">{opt.label}</span>
                    </div>
                    {selections.privacy_lock === opt.value && <Check size={20} className="text-indigo-600" />}
                  </button>
                  {opt.value === 'pin' && selections.privacy_lock === 'pin' && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}>
                      <Input
                        type="password"
                        maxLength={4}
                        placeholder="Enter 4-digit PIN"
                        className="h-14 rounded-xl bg-slate-50 border-slate-200 text-center text-2xl tracking-[1em]"
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      />
                    </motion.div>
                  )}
                </div>
              ))
            ) : (
              step.options?.map((option: any) => {
                const isSelected = step.type === 'single' 
                  ? selections[step.id] === option
                  : selections[step.id]?.includes(option);

                return (
                  <div key={option} className="space-y-3">
                    <button
                      onClick={() => toggleOption(option)}
                      className={`w-full p-5 rounded-2xl text-left border-2 transition-all flex justify-between items-center ${
                        isSelected 
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                          : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200'
                      }`}
                    >
                      <span className="font-medium">{option}</span>
                      {isSelected && <Check size={20} className="text-indigo-600" />}
                    </button>
                    
                    {option === 'Other' && isSelected && step.id === 'habit_type' && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="px-1">
                        <Input
                          placeholder="Type your habit here"
                          className="h-14 rounded-xl bg-slate-50 border-slate-200"
                          value={customHabit}
                          onChange={(e) => setCustomHabit(e.target.value)}
                        />
                      </motion.div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-8">
        <Button 
          onClick={handleNext} 
          disabled={loading || (step.type === 'single' && !selections[step.id]) || (step.id === 'habit_type' && !isOtherValid) || (step.id === 'privacy_lock' && !isPinValid)}
          className="w-full h-14 rounded-2xl text-lg font-semibold bg-indigo-600 hover:bg-indigo-700"
        >
          {loading ? <Loader2 className="animate-spin" /> : (
            <>
              {currentStep === steps.length - 1 ? 'Finish Setup' : 'Continue'}
              <ChevronRight size={20} className="ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default SetupProfile;