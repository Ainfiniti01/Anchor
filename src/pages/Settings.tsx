"use client";

import React, { useState } from 'react';
import { Bell, Shield, User, LogOut, RefreshCw, ChevronRight, Moon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import MobileLayout from '@/components/MobileLayout';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';
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

const Settings = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const handleLogout = () => {
    // Supabase logout logic here
    showSuccess("Logged out successfully");
    navigate('/login');
  };

  const handleResetStreak = () => {
    showSuccess("Streak has been reset. Day 1 starts now!");
  };

  return (
    <MobileLayout>
      <div className="p-6 space-y-8">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
            Preferences
          </h3>
          <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600">
                  <Bell size={20} />
                </div>
                <span className="font-medium text-slate-700">Notifications</span>
              </div>
              <Switch checked={notifications} onCheckedChange={setNotifications} />
            </div>
            
            <div className="flex items-center justify-between p-4 border-b border-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600">
                  <Moon size={20} />
                </div>
                <span className="font-medium text-slate-700">Dark Mode</span>
              </div>
              <Switch checked={darkMode} onCheckedChange={setDarkMode} />
            </div>

            <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600">
                  <Shield size={20} />
                </div>
                <span className="font-medium text-slate-700">AI Tone</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">Supportive</span>
                <ChevronRight size={18} className="text-slate-300" />
              </div>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
            Account
          </h3>
          <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
            <button className="w-full flex items-center justify-between p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600">
                  <User size={20} />
                </div>
                <span className="font-medium text-slate-700">Profile Details</span>
              </div>
              <ChevronRight size={18} className="text-slate-300" />
            </button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="w-full flex items-center justify-between p-4 hover:bg-red-50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
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
          className="w-full h-14 rounded-2xl text-red-500 hover:text-red-600 hover:bg-red-50 font-bold gap-2"
        >
          <LogOut size={20} />
          Logout
        </Button>
      </div>
    </MobileLayout>
  );
};

export default Settings;