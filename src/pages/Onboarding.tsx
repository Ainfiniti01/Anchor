"use client";

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronRight, Shield, Heart, Zap, Sparkles } from 'lucide-react';

const steps = [
  {
    id: 'welcome',
    title: 'Welcome to Anchor',
    description: 'Your private accountability companion designed to help you stay in control.',
    icon: Shield,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50'
  },
  {
    id: 'trust',
    title: 'No Judgment. No Pressure.',
    description: 'Just support. Anchor is a safe space for you to track your journey and find strength.',
    icon: Heart,
    color: 'text-rose-500',
    bg: 'bg-rose-50'
  },
  {
    id: 'features',
    title: 'What Anchor Does',
    description: 'Daily check-ins, AI companion chat, habit tracking, and progress insights to keep you grounded.',
    icon: Zap,
    color: 'text-amber-500',
    bg: 'bg-amber-50'
  },
  {
    id: 'ready',
    title: 'Ready to Begin?',
    description: 'Let’s set up your companion to match your specific needs and goals.',
    icon: Sparkles,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50'
  }
];

const Onboarding = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      navigate('/setup-profile');
    }
  };

  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <div className="min-h-screen bg-white p-6 flex flex-col max-w-md mx-auto">
      <div className="flex gap-1 mb-12 justify-center">
        {steps.map((_, i) => (
          <div 
            key={i} 
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === currentStep ? 'w-8 bg-indigo-600' : 'w-2 bg-slate-100'
            }`} 
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -20, opacity: 0 }}
          className="flex-1 flex flex-col items-center text-center justify-center"
        >
          <div className={`w-24 h-24 ${step.bg} ${step.color} rounded-3xl flex items-center justify-center mb-8`}>
            <Icon size={48} />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-4">{step.title}</h2>
          <p className="text-slate-500 text-lg leading-relaxed px-4">{step.description}</p>
        </motion.div>
      </AnimatePresence>

      <div className="mt-8">
        <Button 
          onClick={handleNext} 
          className="w-full h-14 rounded-2xl text-lg font-semibold bg-indigo-600 hover:bg-indigo-700"
        >
          {currentStep === steps.length - 1 ? 'Set Up My Companion' : 'Continue'}
          <ChevronRight size={20} className="ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default Onboarding;