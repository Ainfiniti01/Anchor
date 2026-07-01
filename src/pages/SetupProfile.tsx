"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, ChevronRight, ChevronLeft, Loader2, Target, Sparkles } from 'lucide-react';
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
    id: 'goals',
    title: 'What are your big dreams?',
    description: 'Anchor uses these to remind you why you started. (e.g., Become a software engineer, Build a startup)',
    type: 'input',
    placeholder: 'Enter your main goal...'
  },
  {
    id: 'ai_tone',
    title: 'AI Companion Style',
    options: ['Supportive Friend', 'Neutral Companion', 'Accountability Coach'],
    type: 'single'
  }
];

const SetupProfile = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<Record<string, any>>({});
  const [customHabit, setCustomHabit] = useState('');
  const [goalInput, setGoalInput] = useState('');
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
  const isGoalValid = currentStep !== steps.findIndex(s => s.id === 'goals') || goalInput.trim().length > 0;

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

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          habit_type: finalHabit,
          habit_duration: selections.habit_duration,
          triggers: selections.triggers,
          ai_tone: selections.ai_tone,
          display_name: user.user_metadata?.display_name || 'User',
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) {
        showError(profileError.message);
        setLoading(false);
        return;
      }

      // Save goal as a memory for the AI
      if (goalInput) {
        await supabase.from('user_memories').insert({
          user_id: user.id,
          content: `Goal: ${goalInput}`,
          importance_score: 5,
          memory_type: 'goal'
        });
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
    if (step.type === 'single') {
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
    <div className="min-h-screen bg-white dark:bg-slate-950 p-6 flex flex-col max-w-md mx-auto">
      <div className="flex justify-between items-center mb-8">
        <button onClick={handleBack} className={`text-slate-400 hover:text-slate-600 ${currentStep === 0 ? 'invisible' : ''}`}>
          <ChevronLeft size={24} />
        </button>
        <div className="flex gap-1">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentStep ? 'w-8 bg-indigo-600' : 'w-2 bg-slate-100 dark:bg-slate-800'
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
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{step.title}</h2>
          {step.description && <p className="text-slate-500 dark:text-slate-400 mb-8">{step.description}</p>}

          <div className="space-y-3 mt-4">
            {step.type === 'input' ? (
              <div className="relative">
                <Target className="absolute left-4 top-5 text-indigo-600" size={20} />
                <Input
                  placeholder={step.placeholder}
                  className="h-16 pl-12 rounded-2xl bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 focus:border-indigo-600 text-lg text-slate-900 dark:text-white placeholder:text-slate-400"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                />
              </div>
            ) : (
              step.options?.map((option: any) => {
                const isSelected = step.type === 'single' 
                  ? selections[step.id] === option
                  : selections[step.id]?.includes(option);

                return (
                  <div key={option} className="space-y-3">
                    <button
                      type="button"
                      onClick={() => toggleOption(option)}
                      className={`w-full p-5 rounded-2xl text-left border-2 transition-all flex justify-between items-center ${
                        isSelected 
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400' 
                          : 'border-slate-100 dark:border-slate-900 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-slate-200 dark:hover:border-slate-800'
                      }`}
                    >
                      <span className="font-medium">{option}</span>
                      {isSelected && <Check size={20} className="text-indigo-600" />}
                    </button>
                    
                    {option === 'Other' && isSelected && step.id === 'habit_type' && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="px-1">
                        <Input
                          placeholder="Type your habit here"
                          className="h-14 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400"
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
          disabled={loading || (step.type === 'single' && !selections[step.id]) || (step.id === 'habit_type' && !isOtherValid) || (step.id === 'goals' && !isGoalValid)}
          className="w-full h-14 rounded-2xl text-lg font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
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