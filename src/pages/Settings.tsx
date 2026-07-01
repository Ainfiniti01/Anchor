"use client";

import React, { useState, useEffect } from 'react';
import { Bell, LogOut, Moon, Sun, ChevronLeft, Lock, Clock, Shield, KeyRound, ChevronRight, User, Palette, Sparkles, HelpCircle, Eye } from 'lucide-react';
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
  
  // PIN security states
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [setupStep, setSetupStep] = useState<'create' | 'confirm'>('create');

  // Profile Edit states
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editHabitType, setEditHabitType] = useState('');
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
        setEditHabitType(data.habit_type || '');
        setEditAiTone(data.ai_tone || 'Supportive Friend');
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

      // Update Profile table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          display_name: editDisplayName,
          habit_type: editHabitType,
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
              <p className="text-sm italic text-slate-500 mt-2 line-clamp-2">
                "{editGoal}"
              </p>
            )}
            <Button 
              onClick={() => setIsProfileDialogOpen(true)}
              className="mt-4 w-full h-11 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold text-sm"
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

        {/* Preferences */}
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
            <DialogTitle className="flex items-center gap-2">
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
                className="rounded-xl h-11 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Focus Habit</label>
              <Select value={editHabitType} onValueChange={setEditHabitType}>
                <SelectTrigger className="rounded-xl h-11 bg-slate-50 dark:bg-slate-800 border-none">
                  <SelectValue placeholder="Select Focus Habit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Porn Addiction">Porn Addiction</SelectItem>
                  <SelectItem value="Substance Use">Substance Use</SelectItem>
                  <SelectItem value="Social Media">Social Media</SelectItem>
                  <SelectItem value="Gaming">Gaming</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Companion Style</label>
              <Select value={editAiTone} onValueChange={setEditAiTone}>
                <SelectTrigger className="rounded-xl h-11 bg-slate-50 dark:bg-slate-800 border-none">
                  <SelectValue placeholder="Companion Style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Supportive Friend">Supportive Friend</SelectItem>
                  <SelectItem value="Neutral Companion">Neutral Companion</SelectItem>
                  <SelectItem value="Accountability Coach">Accountability Coach</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1">
                <Sparkles size={12} className="text-amber-500" />
                Recovery Goal
              </label>
              <Input
                placeholder="e.g., Become a software engineer"
                value={editGoal}
                onChange={(e) => setEditGoal(e.target.value)}
                className="rounded-xl h-11 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <Button 
              onClick={handleSaveProfile} 
              disabled={savingProfile}
              className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold mt-4"
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
              className="text-center text-2xl tracking-[1em] h-14 rounded-xl bg-slate-50 dark:bg-slate-800"
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

      {/* Change Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="rounded-3xl max-w-[320px]">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">New Password</label>
              <Input
                type="password"
                placeholder="••••••"
                className="rounded-xl h-11 bg-slate-50 dark:bg-slate-800"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Confirm Password</label>
              <Input
                type="password"
                placeholder="••••••"
                className="rounded-xl h-11 bg-slate-50 dark:bg-slate-800"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleChangePassword} 
              disabled={savingPassword}
              className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold"
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
      <DialogTitle>About Anchor</DialogTitle>
    </DialogHeader>

    <div className="space-y-3 py-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
      <p>
        ⚓ <strong>Anchor</strong> is your private, memory-powered accountability companion.
      </p>

      <p>
        Unlike traditional habit trackers, Anchor uses long-term memory and
        Alibaba Cloud&apos;s Qwen AI to provide personalized support based on
        your goals, recovery journey, and meaningful conversations.
      </p>

      <p className="text-xs text-slate-400 mt-4">
        Version 1.2.0 • Built for the Global AI Hackathon
      </p>
    </div>
  </DialogContent>
</Dialog>

{/* Privacy Policy Dialog */}
<Dialog open={isPrivacyOpen} onOpenChange={setIsPrivacyOpen}>
  <DialogContent className="rounded-3xl max-w-[320px] max-h-[80vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Privacy Policy</DialogTitle>
    </DialogHeader>

    <div className="space-y-3 py-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
      <h4 className="font-bold text-slate-800 dark:text-slate-100">
        1. Data Protection
      </h4>

      <p>
        Your logs, reflections, and personal data are securely stored in
        Supabase and protected using Row-Level Security (RLS), helping ensure
        that only you can access your records.
      </p>

      <h4 className="font-bold text-slate-800 dark:text-slate-100">
        2. AI Processing
      </h4>

      <p>
        Anchor uses Alibaba Cloud&apos;s Qwen AI together with a secure memory
        system that prioritizes relevant information while gradually reducing
        the influence of outdated context. Only the minimum information needed
        is processed to provide personalized support.
      </p>

      <h4 className="font-bold text-slate-800 dark:text-slate-100">
        3. App Security
      </h4>

      <p>
        When App Lock is enabled, your PIN is securely hashed before storage
        and is never saved in plain text, helping protect your account if
        someone else gains access to your device.
      </p>
    </div>
  </DialogContent>
</Dialog>
    </MobileLayout>
  );
};

export default Settings;