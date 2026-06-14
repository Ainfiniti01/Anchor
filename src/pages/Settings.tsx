"use client";

import React, { useState, useEffect } from 'react';
import { Bell, LogOut, Moon, Sun, ChevronLeft, Lock, Clock, Shield, KeyRound, ChevronRight } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import MobileLayout from '@/components/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';
import { useTheme } from 'next-themes';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Settings = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState<any>(null);
  const [notifications, setNotifications] = useState(true);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [setupStep, setSetupStep] = useState<'create' | 'confirm'>('create');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(data);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    showSuccess("Logged out successfully");
    navigate('/login');
  };

  const handleSetPin = async () => {
    if (pin !== confirmPin) {
      showError("PINs do not match");
      setSetupStep('create');
      setPin('');
      setConfirmPin('');
      return;
    }

    if (pin.length !== 4) {
      showError("PIN must be 4 digits");
      return;
    }

    const { error } = await supabase.rpc('set_user_pin', { p_pin: pin });
    if (error) {
      showError("Failed to set PIN");
    } else {
      await supabase.from('profiles').update({ privacy_lock_type: 'pin' }).eq('id', profile.id);
      showSuccess("PIN Lock enabled");
      setIsPinDialogOpen(false);
      setPin('');
      setConfirmPin('');
      setSetupStep('create');
      fetchProfile();
    }
  };

  const handleToggleLock = async (enabled: boolean) => {
    if (enabled && !profile.privacy_lock_type) {
      setIsPinDialogOpen(true);
      return;
    }
    const { error } = await supabase.from('profiles').update({ 
      privacy_lock_type: enabled ? 'pin' : 'none' 
    }).eq('id', profile.id);
    
    if (!error) {
      setProfile({ ...profile, privacy_lock_type: enabled ? 'pin' : 'none' });
      showSuccess(enabled ? "Lock enabled" : "Lock disabled");
    }
  };

  const handleUpdateTimeout = async (value: string) => {
    const timeout = parseInt(value);
    const { error } = await supabase.from('profiles').update({ 
      auto_lock_timeout: timeout 
    }).eq('id', profile.id);
    
    if (!error) {
      setProfile({ ...profile, auto_lock_timeout: timeout });
      showSuccess("Auto-lock timer updated");
    }
  };

  return (
    <MobileLayout>
      <header className="bg-slate-900 dark:bg-indigo-950 p-6 pb-12 rounded-b-[40px] mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-white/80 hover:text-white">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
        </div>
      </header>

      <div className="px-6 space-y-8">
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">
            Security & Privacy
          </h3>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between p-4 border-b border-slate-50 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                  <Lock size={20} />
                </div>
                <span className="font-medium text-slate-700 dark:text-slate-200">App Lock</span>
              </div>
              <Switch 
                checked={profile?.privacy_lock_type === 'pin'} 
                onCheckedChange={handleToggleLock} 
              />
            </div>
            
            {profile?.privacy_lock_type === 'pin' && (
              <>
                <div className="flex items-center justify-between p-4 border-b border-slate-50 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                      <Clock size={20} />
                    </div>
                    <span className="font-medium text-slate-700 dark:text-slate-200">Auto-lock</span>
                  </div>
                  <Select 
                    value={profile?.auto_lock_timeout?.toString() || "0"} 
                    onValueChange={handleUpdateTimeout}
                  >
                    <SelectTrigger className="w-[120px] h-9 rounded-lg border-slate-200">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Immediate</SelectItem>
                      <SelectItem value="30">30 seconds</SelectItem>
                      <SelectItem value="60">1 minute</SelectItem>
                      <SelectItem value="300">5 minutes</SelectItem>
                      <SelectItem value="600">10 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <button 
                  onClick={() => {
                    setSetupStep('create');
                    setIsPinDialogOpen(true);
                  }}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                      <KeyRound size={20} />
                    </div>
                    <span className="font-medium text-slate-700 dark:text-slate-200">Change PIN</span>
                  </div>
                  <ChevronRight size={20} className="text-slate-400" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">
            Preferences
          </h3>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between p-4 border-b border-slate-50 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                  <Bell size={20} />
                </div>
                <span className="font-medium text-slate-700 dark:text-slate-200">Notifications</span>
              </div>
              <Switch checked={notifications} onCheckedChange={setNotifications} />
            </div>
            
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                  {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                </div>
                <span className="font-medium text-slate-700 dark:text-slate-200">Dark Mode</span>
              </div>
              <Switch 
                checked={theme === 'dark'} 
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')} 
              />
            </div>
          </div>
        </div>

        <Button 
          onClick={handleLogout}
          variant="ghost" 
          className="w-full h-14 rounded-2xl text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold gap-2"
        >
          <LogOut size={20} />
          Logout
        </Button>
      </div>

      <Dialog open={isPinDialogOpen} onOpenChange={setIsPinDialogOpen}>
        <DialogContent className="rounded-3xl max-w-[320px]">
          <DialogHeader>
            <DialogTitle>{setupStep === 'create' ? 'Set Security PIN' : 'Confirm PIN'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-500">
              {setupStep === 'create' 
                ? 'Enter a 4-digit PIN to protect your sensitive data.' 
                : 'Please re-enter your PIN to confirm.'}
            </p>
            <Input
              type="password"
              maxLength={4}
              placeholder="0000"
              className="text-center text-2xl tracking-[1em] h-14 rounded-xl bg-slate-50"
              value={setupStep === 'create' ? pin : confirmPin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                if (setupStep === 'create') setPin(val);
                else setConfirmPin(val);
              }}
            />
            <Button 
              onClick={() => {
                if (setupStep === 'create') {
                  if (pin.length === 4) setSetupStep('confirm');
                  else showError("PIN must be 4 digits");
                } else {
                  handleSetPin();
                }
              }} 
              className="w-full h-12 rounded-xl bg-indigo-600"
            >
              {setupStep === 'create' ? 'Next' : 'Enable PIN Lock'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
};

export default Settings;