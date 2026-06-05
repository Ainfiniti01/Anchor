"use client";

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check, ChevronRight, ChevronLeft } from 'lucide-react';

const steps = [
  {
    id: 'welcome',
    title: 'Welcome to Anchor',
    description: 'Anchor helps you stay in control of your habits, one check-in at a time.',
    type: 'intro'
  },
  {
    id: 'goal',
    title: 'What is your primary goal?',
    options: ['Break addiction', 'Build discipline', 'Reduce urges', 'Improve habits'],
    type: 'single'
  },
  {
    id: 'habit',
    title: 'What habit are we focusing on?',
    options: ['Porn addiction', 'Substance use', 'Social media', 'Gaming', 'Other'],
    type: 'single'
  },
  {
    id: 'triggers',
    title: 'What triggers your urges?',
    options: ['Boredom', 'Stress', 'Loneliness', 'Night time', 'Social pressure'],
    type: 'multi'
  },
  {
    id: 'notifications',
    title: 'Check-in frequency',
    options: ['1 check-in per day', '2 check-ins per day', '3 check-ins per day (Recommended)'],
    type: 'single'
  },
  {
    id: 'tone',
    title: 'AI Personality Tone',
    options: ['Soft & supportive', 'Neutral', 'Strict accountability'],
    type: 'single'
  },
  {
    id: 'finish',
    title: 'You’re not alone.',
    description: 'Let’s take Day 1 together.',
    type: 'finish'
  }
];

const Onboarding = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<Record<string, any>>({});
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
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
    <div className="min-h-screen bg-white p-6 flex flex-col">
      <div className="flex justify-between items-center mb-8">
        {currentStep > 0 && (
          <button onClick={handleBack} className="text-slate-400 hover:text-slate-600">
            <ChevronLeft size={24} />
          </button>
        )}
        <div className="flex gap-1 mx-auto">
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
          <h2 className="text-3xl font-bold text-slate-900 mb-4">{step.title}</h2>
          {step.description && (
            <p className="text-slate-500 text-lg mb-8 leading-relaxed">{step.description}</p>
          )}

          <div className="space-y-3 mt-4">
            {step.options?.map((option) => {
              const isSelected = step.type === 'single' 
                ? selections[step.id] === option
                : selections[step.id]?.includes(option);

              return (
                <button
                  key={option}
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
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-8">
        <Button 
          onClick={handleNext} 
          className="w-full h-14 rounded-2xl text-lg font-semibold bg-indigo-600 hover:bg-indigo-700"
        >
          {currentStep === steps.length - 1 ? 'Go to Home' : 'Continue'}
          <ChevronRight size={20} className="ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default Onboarding;