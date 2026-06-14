"use client";

import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export function useAuthLock() {
  const location = useLocation();
  const [isLocked, setIsLocked] = useState(false);
  const [lastActive, setLastActive] = useState<number>(Date.now());
  const [config, setConfig] = useState<{ enabled: boolean; timeout: number }>({
    enabled: false,
    timeout: 0
  });

  // Paths that should NEVER trigger a PIN lock
  const safePaths = ['/', '/login', '/register', '/onboarding', '/forgot-password', '/setup-profile'];
  const isSafePath = safePaths.includes(location.pathname);

  const fetchConfig = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || isSafePath) {
      setIsLocked(false);
      if (!user) setConfig({ enabled: false, timeout: 0 });
      return;
    }

    // Fetch profile and check if a PIN actually exists in security settings
    const [profileRes, securityRes] = await Promise.all([
      supabase.from('profiles').select('privacy_lock_type, auto_lock_timeout').eq('id', user.id).single(),
      supabase.from('user_security_settings').select('id').eq('user_id', user.id).single()
    ]);

    const profile = profileRes.data;
    const hasPinSet = !!securityRes.data;

    if (profile) {
      const isPinEnabled = profile.privacy_lock_type === 'pin' && hasPinSet;
      
      setConfig({
        enabled: isPinEnabled,
        timeout: profile.auto_lock_timeout || 0
      });
      
      // Only lock if PIN is enabled, a PIN actually exists, AND we are NOT on a safe path
      if (isPinEnabled && !isSafePath) {
        setIsLocked(true);
      } else {
        setIsLocked(false);
      }
    } else {
      setIsLocked(false);
    }
  }, [isSafePath]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    if (!config.enabled || isSafePath) {
      if (isSafePath) setIsLocked(false);
      return;
    }

    const handleStateChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        const elapsed = (now - lastActive) / 1000;
        if (elapsed > config.timeout) {
          setIsLocked(true);
        }
      } else {
        setLastActive(Date.now());
      }
    };

    document.addEventListener('visibilitychange', handleStateChange);
    return () => document.removeEventListener('visibilitychange', handleStateChange);
  }, [config, lastActive, isSafePath]);

  const unlock = () => setIsLocked(false);

  return { isLocked, unlock, config, refreshConfig: fetchConfig };
}