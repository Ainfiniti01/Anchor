"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Fingerprint, Delete, Loader2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

interface PrivacyLockProps {
  onUnlock: () => void;
}

const PrivacyLock = ({ onUnlock }: PrivacyLockProps) => {
  const [pin, setPin] = useState('');
  const [lockType, setLockType] = useState<'pin' | 'biometric' | 'none'>('none');
  const [loading, setLoading] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const publicPaths = ['/', '/login', '/register', '/forgot-password', '/onboarding', '/setup-profile'];
  const isPublicPath = publicPaths.includes(location.pathname);

  useEffect(() => {
    const checkLock = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !isPublicPath) {
        const { data, error } = await supabase
          .from('profiles')
          .select('privacy_lock_type')
          .eq('id', user.id)
          .single();
        
        if (!error && data && data.privacy_lock_type !== 'none') {
          setLockType(data.privacy_lock_type as any);
          if (data.privacy_lock_type === 'biometric') {
            handleBiometric();
          }
        } else {
          setLockType('none');
          setIsUnlocked(true);
          onUnlock();
        }
      } else {
        setLockType('none');
        setIsUnlocked(true);
        onUnlock();
      }
      setLoading(false);
    };
    checkLock();
  }, [location.pathname]);

  const handleBiometric = async () => {
    setVerifying(true);
    setTimeout(() => {
      setIsUnlocked(true);
      onUnlock();
      setVerifying(false);
    }, 1000);
  };

  const handleKeyPress = async (num: string) => {
    if (pin.length < 4 && !verifying) {
      const newPin = pin + num;
      setPin(newPin);
      
      if (newPin.length === 4) {
        setVerifying(true);
        try {
          const { data, error } = await supabase.rpc('verify_user_pin', { p_pin: newPin });
          
          if (error) throw error;

          if (data === true) {
            setIsUnlocked(true);
            onUnlock();
          } else {
            showError("Incorrect PIN. Please try again.");
            setPin('');
          }
        } catch (err) {
          console.error("PIN Verification Error:", err);
          showError("Security service unavailable. Try again.");
          setPin('');
        } finally {
          setVerifying(false);
        }
      }
    }
  };

  const handleForgotPin = async () => {
    await supabase.auth.signOut();
    setIsUnlocked(true);
    navigate('/login');
  };

  if (loading || lockType === 'none' || isUnlocked || isPublicPath) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-950 flex flex-col items-center justify-center p-8">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-xs flex flex-col items-center"
      >
        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
          {verifying ? <Loader2 className="animate-spin" size={32} /> : <Lock size={32} />}
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Anchor Locked</h2>
        <p className="text-slate-500 text-center mb-12">
          {verifying ? "Verifying security..." : "Enter your PIN to continue"}
        </p>

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
              disabled={verifying}
              onClick={() => handleKeyPress(num.toString())}
              className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-900 text-2xl font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors disabled:opacity-50 active:scale-90"
            >
              {num}
            </button>
          ))}
          <div className="flex items-center justify-center">
            {lockType === 'biometric' && (
              <button onClick={handleBiometric} disabled={verifying} className="text-indigo-600 hover:scale-110 transition-transform">
                <Fingerprint size={32} />
              </button>
            )}
          </div>
          <button
            disabled={verifying}
            onClick={() => handleKeyPress('0')}
            className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-900 text-2xl font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors disabled:opacity-50 active:scale-90"
          >
            0
          </button>
          <button
            disabled={verifying || pin.length === 0}
            onClick={() => setPin(pin.slice(0, -1))}
            className="flex items-center justify-center text-slate-400 disabled:opacity-30 hover:text-slate-600 transition-colors"
          >
            <Delete size={24} />
          </button>
        </div>

        <button 
          onClick={handleForgotPin}
          className="mt-12 text-sm font-medium text-indigo-600 hover:underline"
        >
          Forgot PIN? Sign out and log in again
        </button>
      </motion.div>
    </div>
  );
};

export default PrivacyLock;