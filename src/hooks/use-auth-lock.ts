"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export function useAuthLock() {
  const location = useLocation();
  const [isLocked, setIsLocked] = useState(false);
  const [lastActive, setLastActive] = useState<number>(Date.now());
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
        timeout: profile.auto_lock_timeout ?? 0
      });
      
      // If PIN lock is enabled on initial load and we aren't in a safe path, lock it!
      if (isPinEnabled && !isSafePath && !isLocked) {
        setIsLocked(true);
      }
    } else {
      setIsLocked(false);
    }
  }, [isSafePath, isLocked]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const updateActivity = useCallback(() => {
    const now = Date.now();
    setLastActive(now);
    lastActiveRef.current = now;
  }, []);

  // Track user activity and lock after period of absolute idle time
  useEffect(() => {
    if (!config.enabled || isSafePath || isLocked) return;

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    const handleActivity = () => {
      updateActivity();
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Check inactivity every 1 second
    const interval = setInterval(() => {
      if (isLocked || isSafePath) return;
      
      const now = Date.now();
      const elapsedSeconds = (now - lastActiveRef.current) / 1000;
      
      if (elapsedSeconds > config.timeout) {
        setIsLocked(true);
      }
    }, 1000);

    // Visibility change check
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        const elapsedSeconds = (now - lastActiveRef.current) / 1000;
        if (elapsedSeconds > config.timeout) {
          setIsLocked(true);
        } else {
          updateActivity();
        }
      } else {
        lastActiveRef.current = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [config.enabled, config.timeout, isSafePath, isLocked, updateActivity]);

  const unlock = () => {
    updateActivity();
    setIsLocked(false);
  };

  return { isLocked, unlock, config, refreshConfig: fetchConfig };
}