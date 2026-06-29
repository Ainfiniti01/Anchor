"use client";

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, AlertCircle, Zap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';

const LogUrge = () => {
  const navigate = useNavigate();
  const [intensity, setIntensity] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLog = async () => {
  if (intensity === null) return;

  setLoading(true);

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated");

    // 1. Save urge
    const { error: urgeError } = await supabase
      .from("urge_logs")
      .insert([
        {
          user_id: user.id,
          intensity,
          resisted: true,
        },
      ]);

    if (urgeError) throw urgeError;

    // 2. Get access token
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) throw new Error("No active session");

    // 3. Ask AI to re-evaluate the user
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evaluate-user`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event: "urge_log",
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to evaluate recovery state");
    }

    showSuccess(
      "Urge logged successfully. Anchor has updated your recovery progress."
    );

    navigate("/home");
  } catch (error: any) {
    console.error(error);

    showError(error.message || "Failed to log urge.");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 flex flex-col max-w-md mx-auto">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="text-slate-400">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Log Urge</h1>
      </header>

      <div className="flex-1 space-y-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">How strong is the urge?</h2>
          <p className="text-slate-500 dark:text-slate-400">Be honest with yourself. We're here to help.</p>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((num) => (
            <button
              key={num}
              onClick={() => setIntensity(num)}
              className={`h-16 rounded-xl font-bold text-xl transition-all ${
                intensity === num 
                  ? 'bg-red-600 text-white scale-110 shadow-lg shadow-red-200' 
                  : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800'
              }`}
            >
              {num}
            </button>
          ))}
        </div>

        <Card className="p-6 bg-white dark:bg-slate-900 border-none shadow-sm rounded-3xl space-y-4">
          <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
            <Zap size={20} />
            <h3 className="font-bold">Quick Tip</h3>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            Try the 5-minute rule: Tell yourself you'll wait just 5 minutes before acting. Often, the peak of the urge passes by then.
          </p>
        </Card>
      </div>

      <div className="mt-8 space-y-3">
        <Button 
          onClick={handleLog}
          disabled={intensity === null || loading}
          className="w-full h-14 rounded-2xl bg-red-600 hover:bg-red-700 font-bold text-lg"
        >
          {loading ? <Loader2 className="animate-spin" /> : 'Log and Resist'}
        </Button>
        <Button 
          variant="ghost"
          onClick={() => navigate('/chat')}
          className="w-full h-14 rounded-2xl text-indigo-600 dark:text-indigo-400 font-bold"
        >
          Talk to Anchor instead
        </Button>
      </div>
    </div>
  );
};

export default LogUrge;