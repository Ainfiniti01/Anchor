"use client";

import React from 'react';
import { Bell, Shield, User, LogOut, RefreshCw, ChevronRight, Moon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import MobileLayout from '@/components/MobileLayout';
import { Button } from '@/components/ui/button';

const Settings = () => {
  const settingsGroups = [
    {
      title: 'Preferences',
      items: [
        { icon: Bell, label: 'Notifications', type: 'toggle', value: true },
        { icon: Moon, label: 'Dark Mode', type: 'toggle', value: false },
        { icon: Shield, label: 'AI Tone', type: 'link', detail: 'Supportive' },
      ]
    },
    {
      title: 'Account',
      items: [
        { icon: User, label: 'Profile Details', type: 'link' },
        { icon: RefreshCw, label: 'Reset Streak', type: 'link', color: 'text-red-500' },
      ]
    }
  ];

  return (
    <MobileLayout>
      <div className="p-6 space-y-8">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

        {settingsGroups.map((group) => (
          <div key={group.title} className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
              {group.title}
            </h3>
            <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
              {group.items.map((item, idx) => (
                <div 
                  key={item.label}
                  className={`flex items-center justify-between p-4 ${
                    idx !== group.items.length - 1 ? 'border-b border-slate-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center ${item.color || 'text-slate-600'}`}>
                      <item.icon size={20} />
                    </div>
                    <span className="font-medium text-slate-700">{item.label}</span>
                  </div>
                  
                  {item.type === 'toggle' ? (
                    <Switch checked={item.value} />
                  ) : (
                    <div className="flex items-center gap-2">
                      {item.detail && <span className="text-sm text-slate-400">{item.detail}</span>}
                      <ChevronRight size={18} className="text-slate-300" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <Button 
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