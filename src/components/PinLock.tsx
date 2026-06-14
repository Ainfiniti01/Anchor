"use client";

import React, { useState, useEffect } from 'react';
import { Lock, Delete, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

interface PinLockProps {
  onSuccess: () => void;
}

const PinLock = ({ onSuccess }: PinLockProps) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleNumber = (num: string) => {
    if (pin.length < 4 && cooldown === 0) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const verifyPin = async (enteredPin: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('verify_user_pin', { p_pin: enteredPin });
      
      if (error) throw error;

      if (data === true) {
        onSuccess();
      } else {
        setPin('');
        showError("Incorrect PIN");
        // Check for lockout
        const { data: security } = await supabase
          .from('user_security_settings')
          .select('lockout_until')
          .single();
        
        if (security?.lockout_until && new Date(security.lockout_until) > new Date()) {
          setCooldown(30);
        }
      }
    } catch (err: any) {
      showError("Security service error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-indigo-600 z-[100] flex flex-col items-center justify-center p-6 text-white">
      <div className="mb-12 text-center">
        <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-md">
          <Lock size={40} />
        </div>
        <h1 className="text-2xl font-bold">Anchor Locked</h1>
        <p className="text-indigo-100 mt-2">Enter PIN to continue</p>
      </div>

      <div className="flex gap-4 mb-12">
        {[0, 1, 2, 3].map((i) => (
          <div 
            key={i}
            className={`w-4 h-4 rounded-full border-2 border-white/50 transition-all duration-200 ${
              pin.length > i ? 'bg-white scale-125' : ''
            }`}
          />
        ))}
      </div>

      {cooldown > 0 ? (
        <div className="flex flex-col items-center gap-2 text-rose-200 mb-8">
          <ShieldAlert size={24} />
          <p className="font-bold">Too many attempts. Wait {cooldown}s</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6 w-full max-w-[280px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumber(num.toString())}
              className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 text-2xl font-bold transition-colors flex items-center justify-center"
            >
              {num}
            </button>
          ))}
          <div />
          <button
            onClick={() => handleNumber('0')}
            className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 text-2xl font-bold transition-colors flex items-center justify-center"
          >
            0
          </button>
          <button
            onClick={() => setPin(pin.slice(0, -1))}
            className="w-16 h-16 rounded-full text-white/50 hover:text-white flex items-center justify-center"
          >
            <Delete size={24} />
          </button>
        </div>
      )}

      {loading && (
        <div className="mt-8">
          <Loader2 className="animate-spin" />
        </div>
      )}
    </div>
  );
};

export default PinLock;