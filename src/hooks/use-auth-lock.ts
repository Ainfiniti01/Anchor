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

  const publicPaths = ['/', '/login', '/register', '/onboarding', '/forgot-password'];
  const isPublicPath = publicPaths.includes(location.pathname);

  const fetchConfig = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsLocked(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('privacy_lock_type, auto_lock_timeout')
      .eq('id', user.id)
      .single();

    if (profile) {
      const enabled = profile.privacy_lock_type === 'pin';
      setConfig({
        enabled,
        timeout: profile.auto_lock_timeout || 0
      });
      
      // Only lock on cold start if enabled AND not on a public path
      if (enabled && !isPublicPath) {
        setIsLocked(true);
      } else {
        setIsLocked(false);
      }
    } else {
      setIsLocked(false);
    }
  }, [isPublicPath]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    if (!config.enabled || isPublicPath) return;

    const handleStateChange = (nextAppState: string) => {
      if (nextAppState === 'visible') {
        const now = Date.now();
        const elapsed = (now - lastActive) / 1000;
        
        if (elapsed > config.timeout) {
          setIsLocked(true);
        }
      } else {
        setLastActive(Date.now());
      }
    };

    const onVisibilityChange = () => {
      handleStateChange(document.visibilityState === 'visible' ? 'visible' : 'hidden');
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [config, lastActive, isPublicPath]);

  const unlock = () => setIsLocked(false);

  return { isLocked, unlock, config, refreshConfig: fetchConfig };
}