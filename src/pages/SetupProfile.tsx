"use client";

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, ChevronRight, ChevronLeft } from 'lucide-react';
import { showSuccess } from '@/utils/toast';

const steps = [
  {
    id: 'addiction_type',
    title: 'What habit are we focusing on?',
    options: ['Porn addiction', 'Substance use', 'Social media', 'Gaming', 'Other'],
    type: 'single'
  },
  {
    id: 'addiction_duration',
    title: 'How long has this been a struggle?',
    options: ['Less than 1 month', '1–6 months', '6 months – 2 years', '2+ years'],
    type: 'single'
  },
  {
    id: 'triggers',
    title: 'What triggers your urges?',
    options: ['Boredom', 'Stress', 'Loneliness', 'Night time', 'Emotional distress', 'Social pressure'],
    type: 'multi'
  },
  {
    id: 'risk_level',
    title: 'Self-perceived risk level',
    options: ['Low', 'Medium', 'High'],
    type: 'single'
  },
  {
    id: 'notification_frequency',
    title: 'Check-in frequency',
    options: ['1 per day', '2 per day', '3 per day (Recommended)'],
    type: 'single'
  },
  {
    id: 'tone',
    title: 'AI Personality Tone',
    options: ['Soft & supportive', 'Neutral', 'Strict accountability'],
    type: 'single'
  }
];

const SetupProfile = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<Record<string, any>>({});
  const [customHabit, setCustomHabit] = useState('');
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
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
            {step.options?.map((option) => {
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
                  
                  {option === 'Other' && isSelected && step.id === 'addiction_type' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="px-1"
                    >
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
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-8">
        <Button 
          onClick={handleNext} 
          disabled={step.type === 'single' && !selections[step.id]}
          className="w-full h-14 rounded-2xl text-lg font-semibold bg-indigo-600 hover:bg-indigo-700"
        >
          {currentStep === steps.length - 1 ? 'Finish Setup' : 'Continue'}
          <ChevronRight size={20} className="ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default SetupProfile;