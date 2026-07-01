"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export function useAuthLock() {
  const location = useLocation();
  const [isLocked, setIsLocked] = useState(false);
  const lastActiveRef = useRef<number>(Date.now());
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
        timeout: profile.auto_lock_timeout !== undefined ? profile.auto_lock_timeout : 0
      });
    } else {
      setIsLocked(false);
    }
  }, [isSafePath]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Activity listeners to track real interaction and auto-lock after configured duration
  useEffect(() => {
    if (!config.enabled || isSafePath) {
      return;
    }

    const updateActivity = () => {
      lastActiveRef.current = Date.now();
    };

    // User interaction events
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('mousedown', updateActivity);
    window.addEventListener('touchstart', updateActivity);
    window.addEventListener('scroll', updateActivity);

    // Periodic check for inactivity
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - lastActiveRef.current) / 1000;
      if (elapsed > config.timeout) {
        setIsLocked(true);
      }
    }, 5000);

    // App hidden / background checking
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        const elapsed = (now - lastActiveRef.current) / 1000;
        if (elapsed > config.timeout) {
          setIsLocked(true);
        }
      } else {
        // Record the background time
        lastActiveRef.current = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('mousedown', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
      window.removeEventListener('scroll', updateActivity);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [config.enabled, config.timeout, isSafePath]);

  const unlock = () => {
    lastActiveRef.current = Date.now();
    setIsLocked(false);
  };

  return { isLocked, unlock, config, refreshConfig: fetchConfig };
}