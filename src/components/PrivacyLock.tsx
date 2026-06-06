"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Fingerprint, Delete, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

interface PrivacyLockProps {
  onUnlock: () => void;
}

const PrivacyLock = ({ onUnlock }: PrivacyLockProps) => {
  const [pin, setPin] = useState('');
  const [lockType, setLockType] = useState<'pin' | 'biometric' | 'none'>('none');
  const [storedPin, setStoredPin] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLock = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('privacy_lock_type, pin_code')
          .eq('id', user.id)
          .single();
        
        if (data) {
          setLockType(data.privacy_lock_type as any);
          setStoredPin(data.pin_code);
          
          if (data.privacy_lock_type === 'biometric') {
            handleBiometric();
          }
        }
      }
      setLoading(false);
    };
    checkLock();
  }, []);

  const handleBiometric = async () => {
    // In a real web app, we'd use WebAuthn. For this demo, we simulate success.
    // Most mobile wrappers (Capacitor/Cordova) would trigger native biometrics here.
    setTimeout(() => {
      onUnlock();
    }, 1000);
  };

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        if (newPin === storedPin) {
          onUnlock();
        } else {
          showError("Incorrect PIN");
          setPin('');
        }
      }
    }
  };

  if (loading || lockType === 'none') return null;

  return (
    <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-950 flex flex-col items-center justify-center p-8">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-xs flex flex-col items-center"
      >
        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
          <Lock size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Anchor Locked</h2>
        <p className="text-slate-500 text-center mb-12">Enter your PIN to continue</p>

        <div className="flex gap-4 mb-12">
          {[0, 1, 2, 3].map((i) => (
            <div 
              key={i}
              className={`w-4 h-4 rounded-full border-2 border-indigo-600 transition-all ${
                pin.length > i ? 'bg-indigo-600' : 'bg-transparent'
              }`}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6 w-full">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num.toString())}
              className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-900 text-2xl font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors"
            >
              {num}
            </button>
          ))}
          <div className="flex items-center justify-center">
            {lockType === 'biometric' && (
              <button onClick={handleBiometric} className="text-indigo-600">
                <Fingerprint size={32} />
              </button>
            )}
          </div>
          <button
            onClick={() => handleKeyPress('0')}
            className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-900 text-2xl font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors"
          >
            0
          </button>
          <button
            onClick={() => setPin(pin.slice(0, -1))}
            className="flex items-center justify-center text-slate-400"
          >
            <Delete size={24} />
          </button>
        </div>

        <button 
          onClick={() => supabase.auth.signOut()}
          className="mt-12 text-sm font-medium text-indigo-600 hover:underline"
        >
          Forgot PIN? Sign out and log in again
        </button>
      </motion.div>
    </div>
  );
};

export default PrivacyLock;