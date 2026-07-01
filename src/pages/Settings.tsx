"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Bell, LogOut, Moon, Sun, ChevronLeft, Lock, Clock, Shield, KeyRound, ChevronRight, User, Palette, Sparkles, HelpCircle, Eye, VolumeX, AlertCircle, Volume2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import MobileLayout from '@/components/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Card } from '@/components/ui/card';

// Import the specific notification audio asset using Vite asset bundling
import chimeAudioFile from '../../assets/sounds/dragon-studio-notification-sound-effect-372475.mp3';

const Settings = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState<any>(null);
  
  // PIN security states
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [setupStep, setSetupStep] = useState<'create' | 'confirm'>('create');

  // Profile Edit states
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editHabitType, setEditHabitType] = useState('');
  const [customHabit, setCustomHabit] = useState('');
  const [editAiTone, setEditAiTone] = useState('');
  const [editGoal, setEditGoal] = useState('');
  const [goalMemoryId, setGoalMemoryId] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Change states
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Info dialogs
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  // Notification states
  const [notifications, setNotifications] = useState(true);
  const [checkInFrequency, setCheckInFrequency] = useState('Once per day');
  const [notificationStyle, setNotificationStyle] = useState('Both');
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('08:00');

  // Audio elements
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
      
      if (data) {
        setProfile(data);
        setEditDisplayName(data.display_name || '');
        
        const knownHabits = ['Porn Addiction', 'Substance Use', 'Social Media', 'Gaming'];
        if (knownHabits.includes(data.habit_type || '')) {
          setEditHabitType(data.habit_type || '');
          setCustomHabit('');
        } else if (data.habit_type) {
          setEditHabitType('Other');
          setCustomHabit(data.habit_type);
        } else {
          setEditHabitType('');
          setCustomHabit('');
        }

        setEditAiTone(data.ai_tone || 'Supportive Friend');
        
        // Parse notifications preferences
        const isNotifOn = data.check_in_frequency !== 'none' && data.check_in_frequency !== null;
        setNotifications(isNotifOn);
        if (isNotifOn) {
          setCheckInFrequency(data.check_in_frequency || 'Once per day');
        }

        const prefs = data.behavioral_preferences || {};
        setNotificationStyle(prefs.notification_style || 'Both');
        setQuietHoursStart(prefs.quiet_hours?.start || '22:00');
        setQuietHoursEnd(prefs.quiet_hours?.end || '08:00');
      }

      // Fetch user goal from memories
      const { data: memories } = await supabase
        .from('user_memories')
        .select('*')
        .eq('user_id', user.id)
        .eq('memory_type', 'goal')
        .order('created_at', { ascending: false })
        .limit(1);

      if (memories && memories.length > 0) {
        const goalContent = memories[0].content.replace('Goal: ', '');
        setEditGoal(goalContent);
        setGoalMemoryId(memories[0].id);
      } else {
        setEditGoal('');
        setGoalMemoryId(null);
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!editDisplayName.trim()) {
      showError("Display name cannot be empty");
      return;
    }

    setSavingProfile(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User session not found");

      const finalHabit = editHabitType === 'Other' ? customHabit : editHabitType;

      // Update Profile table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          display_name: editDisplayName,
          habit_type: finalHabit,
          ai_tone: editAiTone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update or Insert Recovery Goal in memories
      if (editGoal.trim()) {
        const formattedGoal = `Goal: ${editGoal.trim()}`;
        if (goalMemoryId) {
          const { error: memError } = await supabase
            .from('user_memories')
            .update({
              content: formattedGoal,
              updated_at: new Date().toISOString()
            })
            .eq('id', goalMemoryId);
          if (memError) throw memError;
        } else {
          const { error: memError } = await supabase
            .from('user_memories')
            .insert({
              user_id: user.id,
              content: formattedGoal,
              importance_score: 5,
              memory_type: 'goal'
            });
          if (memError) throw memError;
        }
      }

      showSuccess("Profile updated successfully");
      setIsProfileDialogOpen(false);
      fetchProfile();
    } catch (err: any) {
      showError(err.message || "Failed to save profile changes");
    } finally {
      setSavingProfile(false);
    }
  };

  // Dynamically update and sync personalized notification properties
  const handleUpdateNotifications = async (
    isEnabled: boolean,
    freq = checkInFrequency,
    style = notificationStyle,
    start = quietHoursStart,
    end = quietHoursEnd
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updatedFreq = isEnabled ? freq : 'none';

      const { error } = await supabase
        .from('profiles')
        .update({
          check_in_frequency: updatedFreq,
          behavioral_preferences: {
            notification_style: style,
            quiet_hours: { start, end }
          }
        })
        .eq('id', user.id);

      if (error) throw error;
      showSuccess("Notification settings synchronized!");
      
      // Update local state cleanly
      setNotifications(isEnabled);
      setCheckInFrequency(freq);
      setNotificationStyle(style);
      setQuietHoursStart(start);
      setQuietHoursEnd(end);
    } catch (err: any) {
      showError("Failed to update notifications");
    }
  };

  const playNotificationSound = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(chimeAudioFile);
      }
      audioRef.current.volume = 0.5;
      audioRef.current.play().catch(() => {
        // Fallback tone if the browser blocks immediate audio play
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 note
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5 note
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      });
    } catch (e) {
      console.warn("Audio play error:", e);
    }
  };

  const handlePreviewClick = () => {
    playNotificationSound();
    showSuccess("Simulating notification preview chime!");
    navigate('/chat');
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      showError("Password must be at least 6 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      showError("Passwords do not match");
      return;
    }

    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      showError(error.message);
    } else {
      showSuccess("Password updated successfully!");
      setIsPasswordDialogOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    }
    setSavingPassword(false);
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

  // Generates discrete simulated notifications depending on style settings
  const getSimulatedNotification = () => {
    const goalMsg = editGoal ? `"${editGoal}"` : 'your big goals';
    
    if (notificationStyle === 'Random Encouragement') {
      return `Take a breath. Remember what you're working towards: ${goalMsg}.`;
    }
    if (notificationStyle === 'Scheduled Reminders') {
      return `Daily check-in scheduled. Stay consistent with your commitment today.`;
    }
    return `Your future self will thank you for the strength you show today. Care to do a quick reflection?`;
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

      <div className="px-6 space-y-8 pb-24">
        {/* Profile Card Section */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">
            Personal Profile
          </h3>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mb-3">
              <User size={32} />
            </div>
            <h4 className="font-bold text-lg text-slate-800 dark:text-slate-100">
              {profile?.display_name || "Anchor User"}
            </h4>
            <p className="text-xs text-slate-400 uppercase tracking-wide font-bold mt-1">
              Focus Habit: <span className="text-indigo-600 dark:text-indigo-400">{profile?.habit_type || "None"}</span>
            </p>
            {editGoal && (
              <p className="text-sm italic text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                "{editGoal}"
              </p>
            )}
            <Button 
              onClick={() => setIsProfileDialogOpen(true)}
              className="mt-4 w-full h-11 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold text-sm text-white"
            >
              Edit Profile & Companion Style
            </Button>
          </div>
        </div>

        {/* Security & Privacy */}
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
                    <SelectTrigger className="w-[120px] h-9 rounded-lg border-slate-200 text-slate-900 dark:text-white">
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
                  className="w-full flex items-center justify-between p-4 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
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

            <button 
              onClick={() => setIsPasswordDialogOpen(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                  <Shield size={20} />
                </div>
                <span className="font-medium text-slate-700 dark:text-slate-200">Change Password</span>
              </div>
              <ChevronRight size={20} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* Personalized Notifications Redesign */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">
            Personalized Notifications
          </h3>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-4 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-50 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                  <Bell size={20} />
                </div>
                <div>
                  <span className="font-medium text-slate-700 dark:text-slate-200 block">Enable Notifications</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">Discreetly protect your privacy</span>
                </div>
              </div>
              <Switch 
                checked={notifications} 
                onCheckedChange={(checked) => {
                  handleUpdateNotifications(checked);
                }} 
              />
            </div>

            {notifications && (
              <div className="space-y-4 pt-1 animate-in fade-in duration-200">
                {/* Frequency Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase">Check-In Frequency</label>
                  <Select 
                    value={checkInFrequency} 
                    onValueChange={(val) => {
                      handleUpdateNotifications(true, val);
                    }}
                  >
                    <SelectTrigger className="w-full h-11 rounded-xl border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
                      <SelectValue placeholder="Choose frequency" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-100 dark:border-slate-800">
                      <SelectItem value="Once per day" className="text-slate-900 dark:text-white">Once per day</SelectItem>
                      <SelectItem value="Twice per day" className="text-slate-900 dark:text-white">Twice per day</SelectItem>
                      <SelectItem value="Three times per day" className="text-slate-900 dark:text-white">Three times per day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Notification Style */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase">Notification Style</label>
                  <Select 
                    value={notificationStyle} 
                    onValueChange={(val) => {
                      handleUpdateNotifications(true, checkInFrequency, val);
                    }}
                  >
                    <SelectTrigger className="w-full h-11 rounded-xl border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
                      <SelectValue placeholder="Style" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-100 dark:border-slate-800">
                      <SelectItem value="Random Encouragement" className="text-slate-900 dark:text-white">Random Encouragement</SelectItem>
                      <SelectItem value="Scheduled Reminders" className="text-slate-900 dark:text-white">Scheduled Reminders</SelectItem>
                      <SelectItem value="Both" className="text-slate-900 dark:text-white">Both Styles</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Quiet Hours */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <VolumeX size={14} className="text-slate-400" />
                    <label className="text-xs font-bold text-slate-400 uppercase">Quiet Hours</label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-medium">Start Time</span>
                      <Input 
                        type="time" 
                        value={quietHoursStart} 
                        onChange={(e) => {
                          handleUpdateNotifications(true, checkInFrequency, notificationStyle, e.target.value, quietHoursEnd);
                        }}
                        className="rounded-xl h-10 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-medium">End Time</span>
                      <Input 
                        type="time" 
                        value={quietHoursEnd} 
                        onChange={(e) => {
                          handleUpdateNotifications(true, checkInFrequency, notificationStyle, quietHoursStart, e.target.value);
                        }}
                        className="rounded-xl h-10 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200"
                      />
                    </div>
                  </div>
                </div>

                {/* Notification Preview Card */}
                <div className="pt-2 border-t border-slate-50 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-400 uppercase block mb-2">Notification Preview</span>
                  <Card 
                    onClick={handlePreviewClick}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer border border-slate-100 dark:border-slate-800 transition-all shadow-sm space-y-1.5 relative overflow-hidden group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-indigo-600 rounded-md flex items-center justify-center text-white text-[10px] font-bold">⚓</div>
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Anchor Companion</span>
                      </div>
                      <span className="text-[9px] text-slate-400 uppercase tracking-wide flex items-center gap-1">
                        <Volume2 size={10} className="text-indigo-500" /> Tap to hear chime & reply
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-200 font-medium leading-relaxed italic pr-4">
                      {getSimulatedNotification()}
                    </p>
                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-900">
                      <span className="text-[9px] text-indigo-500 font-bold flex items-center gap-1 group-hover:underline">
                        Tap to reply directly to Anchor
                      </span>
                    </div>
                    <div className="absolute top-2 right-2 flex items-center gap-1 text-[8px] bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded-full font-bold uppercase text-indigo-600 dark:text-indigo-400">
                      <AlertCircle size={8} /> Discreet Preview
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Color Palette Preferences */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">
            Display Preferences
          </h3>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
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

        {/* Info & Help */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">
            Support & Info
          </h3>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
            <button 
              onClick={() => setIsAboutOpen(true)}
              className="w-full flex items-center justify-between p-4 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                  <HelpCircle size={20} />
                </div>
                <span className="font-medium text-slate-700 dark:text-slate-200">About Anchor</span>
              </div>
              <ChevronRight size={20} className="text-slate-400" />
            </button>
            
            <button 
              onClick={() => setIsPrivacyOpen(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                  <Eye size={20} />
                </div>
                <span className="font-medium text-slate-700 dark:text-slate-200">Privacy & Terms</span>
              </div>
              <ChevronRight size={20} className="text-slate-400" />
            </button>
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

      {/* Profile Edit Dialog */}
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="rounded-3xl max-w-[340px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <User className="text-indigo-600" size={20} />
              Edit Profile
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Display Name</label>
              <Input
                placeholder="Full Name / Handle"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                className="rounded-xl h-11 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Focus Habit</label>
              <Select value={editHabitType} onValueChange={setEditHabitType}>
                <SelectTrigger className="rounded-xl h-11 bg-slate-50 dark:bg-slate-800 border-none text-slate-900 dark:text-white">
                  <SelectValue placeholder="Select Focus Habit" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-100 dark:border-slate-800">
                  <SelectItem value="Porn Addiction" className="text-slate-900 dark:text-white">Porn Addiction</SelectItem>
                  <SelectItem value="Substance Use" className="text-slate-900 dark:text-white">Substance Use</SelectItem>
                  <SelectItem value="Social Media" className="text-slate-900 dark:text-white">Social Media</SelectItem>
                  <SelectItem value="Gaming" className="text-slate-900 dark:text-white">Gaming</SelectItem>
                  <SelectItem value="Other" className="text-slate-900 dark:text-white">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editHabitType === 'Other' && (
              <div className="space-y-1 animate-in slide-in-from-top-1 duration-200">
                <label className="text-xs font-bold text-slate-400 uppercase">Custom Habit Description</label>
                <Input
                  placeholder="Type your habit here"
                  value={customHabit}
                  onChange={(e) => setCustomHabit(e.target.value)}
                  className="rounded-xl h-11 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Companion Style</label>
              <Select value={editAiTone} onValueChange={setEditAiTone}>
                <SelectTrigger className="rounded-xl h-11 bg-slate-50 dark:bg-slate-800 border-none text-slate-900 dark:text-white">
                  <SelectValue placeholder="Companion Style" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-100 dark:border-slate-800">
                  <SelectItem value="Supportive Friend" className="text-slate-900 dark:text-white">Supportive Friend</SelectItem>
                  <SelectItem value="Neutral Companion" className="text-slate-900 dark:text-white">Neutral Companion</SelectItem>
                  <SelectItem value="Accountability Coach" className="text-slate-900 dark:text-white">Accountability Coach</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1">
                <Sparkles size={12} className="text-amber-500" />
                Recovery Goal
              </label>
              <Textarea
                placeholder="e.g., Become a software engineer"
                value={editGoal}
                onChange={(e) => setEditGoal(e.target.value)}
                className="rounded-xl min-h-[80px] bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-100 dark:border-slate-800 resize-none py-2.5"
              />
            </div>

            <Button 
              onClick={handleSaveProfile} 
              disabled={savingProfile}
              className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold mt-4 text-white"
            >
              {savingProfile ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* PIN Setup Dialog */}
      <Dialog open={isPinDialogOpen} onOpenChange={setIsPinDialogOpen}>
        <DialogContent className="rounded-3xl max-w-[320px]">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">{setupStep === 'create' ? 'Set Security PIN' : 'Confirm PIN'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {setupStep === 'create' 
                ? 'Enter a 4-digit PIN to protect your sensitive data.' 
                : 'Please re-enter your PIN to confirm.'}
            </p>
            <Input
              type="password"
              maxLength={4}
              placeholder="0000"
              className="text-center text-2xl tracking-[1em] h-14 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
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
              className="w-full h-12 rounded-xl bg-indigo-600 text-white"
            >
              {setupStep === 'create' ? 'Next' : 'Enable PIN Lock'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="rounded-3xl max-w-[320px]">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">New Password</label>
              <Input
                type="password"
                placeholder="••••••"
                className="rounded-xl h-11 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Confirm Password</label>
              <Input
                type="password"
                placeholder="••••••"
                className="rounded-xl h-11 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleChangePassword} 
              disabled={savingPassword}
              className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-white"
            >
              {savingPassword ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* About Dialog */}
      <Dialog open={isAboutOpen} onOpenChange={setIsAboutOpen}>
        <DialogContent className="rounded-3xl max-w-[320px]">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">About Anchor</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <p>
              ⚓ <strong>Anchor</strong> is your private memory-powered accountability companion.
            </p>
            <p>
              Unlike standard tracking apps, Anchor uses a high-performance memory agent powered by Alibaba Cloud Qwen-Max and DashScope to build deep, empathetic insights tailored directly to your personal recovery goals and triggers.
            </p>
            <p className="text-xs text-slate-400 mt-4">
              Version 1.2.0 • Made with ❤️ for Global AI Hackathon
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Privacy Policy Dialog */}
      <Dialog open={isPrivacyOpen} onOpenChange={setIsPrivacyOpen}>
        <DialogContent className="rounded-3xl max-w-[320px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Privacy & Terms</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <h4 className="font-bold text-slate-800 dark:text-slate-100">1. Data Storage</h4>
            <p>All sensitive logs, reflection notes, and memories are stored securely within Supabase with strict Row-Level Security (RLS). Nobody except you has authorization to view your records.</p>
            
            <h4 className="font-bold text-slate-800 dark:text-slate-100">2. AI Encryption</h4>
            <p>Your goals and experiences are compressed using a secure, weighted retrieval & decay engine. Generative models only analyze the minimum required context to support you.</p>

            <h4 className="font-bold text-slate-800 dark:text-slate-100">3. Local Safety</h4>
            <p>Enabling App Lock protects your device in case someone else gets hold of it. Secure PIN hashing protects authorization vectors from brute force attempts.</p>
          </div>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
};

export default Settings;