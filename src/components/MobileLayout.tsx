"use client";

import React from 'react';
import BottomNav from './BottomNav';
import { useLocation } from 'react-router-dom';

const MobileLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const hideNavPaths = ['/', '/onboarding', '/login', '/register', '/setup-profile'];
  const showNav = !hideNavPaths.includes(location.pathname);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 max-w-md mx-auto border-x border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden">
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>
      {showNav && <BottomNav />}
    </div>
  );
};

export default MobileLayout;