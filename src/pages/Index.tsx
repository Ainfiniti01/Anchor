"use client";

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import brandLogo from '';

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/onboarding');
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-indigo-600 text-white">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center"
      >
        <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl overflow-hidden p-2">
          <img 
            src={brandLogo} 
            alt="Anchor Logo" 
            className="w-full h-full object-contain"
          />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Anchor</h1>
        <p className="mt-2 text-indigo-100 font-medium">Your AI Companion</p>
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-12"
      >
        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </motion.div>
    </div>
  );
};

export default Index;