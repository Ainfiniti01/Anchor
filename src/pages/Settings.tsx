"use client";

import React, { useState } from 'react';
import { Bell, Shield, User, LogOut, RefreshCw, ChevronRight, Moon, Sun, ChevronLeft, Lock } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import MobileLayout from '@/components/MobileLayout';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { showSuccess } from '@/utils/toast';
import { useTheme } from 'next-themes';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Settings = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [tone, setTone] = useState("supportive");
  const [privacyLock, setPrivacyLock] = useState("none");

  const handleLogout = () => {
    showSuccess("Logged out successfully");
    navigate('/login');
  };

  const handleResetStreak = () => {
    showSuccess("Streak has been reset. Day 1 starts now!");
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
            
            <div className="flex items-center justify-between p-4 border-b border-slate-50 dark:border-slate-800">
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

            <div className="flex items-center justify-between p-4 border-b border-slate-50 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                  <Lock size={20} />
                </div>
                <span className="font-medium text-slate-700 dark:text-slate-200">Privacy Lock</span>
              </div>
              <Select value={privacyLock} onValueChange={setPrivacyLock}>
                <SelectTrigger className="w-[140px] border-none bg-transparent focus:ring-0 text-right font-medium text-indigo-600">
                  <SelectValue placeholder="Select lock" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="pin">PIN Lock</SelectItem>
                  <SelectItem value="biometric">Biometric</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                  <Shield size={20} />
                </div>
                <span className="font-medium text-slate-700 dark:text-slate-200">AI Tone</span>
              </div>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="w-[140px] border-none bg-transparent focus:ring-0 text-right font-medium text-indigo-600">
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="supportive">Supportive</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="strict">Strict</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">
            Account
          </h3>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
            <button 
              onClick={() => navigate('/profile')}
              className="w-full flex items-center justify-between p-4 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                  <User size={20} />
                </div>
                <span className="font-medium text-slate-700 dark:text-slate-200">Profile Details</span>
              </div>
              <ChevronRight size={18} className="text-slate-300" />
            </button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="w-full flex items-center justify-between p-4 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500">
                      <RefreshCw size={20} />
                    </div>
                    <span className="font-medium text-red-600">Reset Streak</span>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-red-300" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-3xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will reset your current streak to 0. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetStreak} className="bg-red-600 hover:bg-red-700 rounded-xl">
                    Reset Streak
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
    </MobileLayout>
  );
};

export default Settings;