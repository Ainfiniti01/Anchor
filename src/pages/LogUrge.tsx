"use client";

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, AlertCircle, Zap, Loader2, CheckCircle2, ShieldAlert, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';

const LogUrge = () => {
  const navigate = useNavigate();
  const [hasUrge, setHasUrge] = useState<boolean | null>(null);
  const [intensity, setIntensity] = useState<number | null>(null);
  const [didResist, setDidResist] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const handleWellnessCheckIn = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // 1. Create a wellness check entry in behavioral_logs (do NOT insert into urge_logs)
      const { error: logError } = await supabase.from('behavioral_logs').insert([{
        user_id: user.id,
        mood_score: 1, // Good mood
        urge_level: 0, // No urge
        relapse_occurred: false,
        notes: "Wellness Check-in: Doing okay, no urge"
      }]);

      if (logError) throw logError;

      // 2. Trigger DB risk calculation
      await supabase.rpc('calculate_user_risk', { p_user_id: user.id });

      // 3. Trigger AI evaluation
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetch('https://aymmmpfupfqlmyacilbm.supabase.co/functions/v1/evaluate-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ event: "wellness_checkin" })
        });
      }

      showSuccess("Wellness logged! Proud of you for staying well.");
      navigate('/home');
    } catch (error: any) {
      showError(error.message || "Failed to submit wellness check-in");
    } finally {
      setLoading(false);
    }
  };

  const handleLogUrge = async () => {
    if (intensity === null || didResist === null) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // 1. Log actual urge event
      const { error: urgeError } = await supabase.from('urge_logs').insert([{
        user_id: user.id,
        intensity,
        resisted: didResist
      }]);

      if (urgeError) throw urgeError;

      // 2. If user relapsed, record in relapse logs to trigger streak resets
      if (!didResist) {
        const { error: relapseError } = await supabase.from('relapse_logs').insert([{
          user_id: user.id,
          severity: intensity >= 4 ? 'high' : 'medium',
          notes: `Relapsed after intensity ${intensity} urge`
        }]);

        if (relapseError) throw relapseError;

        // Create log event for risk engine
        await supabase.from('behavioral_logs').insert([{
          user_id: user.id,
          mood_score: -2, // Anxious/Hopeless
          urge_level: intensity,
          relapse_occurred: true,
          notes: "Relapse event logged"
        }]);
      } else {
        // Create resisted behavioral log entry to reflect positive coping
        await supabase.from('behavioral_logs').insert([{
          user_id: user.id,
          mood_score: 0, 
          urge_level: intensity,
          relapse_occurred: false,
          notes: `Resisted intensity ${intensity} urge successfully`
        }]);
      }

      // 3. Trigger DB risk calculation
      await supabase.rpc('calculate_user_risk', { p_user_id: user.id });

      // 4. Trigger AI evaluation
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetch('https://aymmmpfupfqlmyacilbm.supabase.co/functions/v1/evaluate-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ event: didResist ? "urge_resisted" : "relapse_occurred" })
        });
      }

      if (didResist) {
        showSuccess("Urge logged and resisted successfully! Keep going.");
      } else {
        showSuccess("Relapse logged. Tomorrow is a new start; Anchor is here to support you.");
      }
      navigate('/home');
    } catch (error: any) {
      showError(error.message || "Failed to record urge event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 flex flex-col max-w-md mx-auto justify-between">
      <div>
        <header className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate(-1)} className="text-slate-400">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Redefined Logging</h1>
        </header>

        {hasUrge === null && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="text-center space-y-2 mb-8">
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-3xl flex items-center justify-center mx-auto">
                <Heart size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Are you experiencing an urge right now?</h2>
              <p className="text-slate-500 dark:text-slate-400">Be honest. Anchor helps you track your recovery state accurately.</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => setHasUrge(false)}
                className="w-full p-6 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 hover:border-emerald-500 rounded-3xl text-left transition-all flex items-center justify-between group shadow-sm"
              >
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600">✅ No, I'm doing okay</h4>
                  <p className="text-xs text-slate-400 mt-1">This registers as a wellness check and builds recovery scores.</p>
                </div>
              </button>

              <button
                onClick={() => setHasUrge(true)}
                className="w-full p-6 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 hover:border-red-500 rounded-3xl text-left transition-all flex items-center justify-between group shadow-sm"
              >
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-red-600">⚠️ Yes, I have an urge</h4>
                  <p className="text-xs text-slate-400 mt-1">Select intensity and track how you process this challenge.</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {hasUrge === false && (
          <div className="space-y-6 text-center py-8 animate-in fade-in duration-300">
            <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={44} />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Staying strong!</h3>
            <p className="text-slate-500 dark:text-slate-400 px-4">
              Checking in when you feel well builds consistency and reinforces healthy behavior blocks in your profile.
            </p>
            <Card className="p-4 bg-white dark:bg-slate-900 border-none text-left leading-relaxed text-sm text-slate-500 mt-6">
              ⚓ Wellness checks are logged separately and never calculated as urge events.
            </Card>
          </div>
        )}

        {hasUrge === true && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">How strong is the urge?</h2>
              <p className="text-slate-500 dark:text-slate-400">Scale of 1 (very mild) to 5 (extremely powerful)</p>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  onClick={() => setIntensity(num)}
                  className={`h-14 rounded-xl font-bold text-lg transition-all ${
                    intensity === num 
                      ? 'bg-red-600 text-white scale-110 shadow-lg shadow-red-200' 
                      : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>

            {intensity !== null && (
              <div className="space-y-4 pt-4 animate-in fade-in slide-in-from-top-2">
                <h3 className="text-center font-bold text-slate-800 dark:text-slate-200">Did you manage to resist it?</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setDidResist(true)}
                    className={`p-4 rounded-2xl border-2 font-semibold text-sm text-center transition-all ${
                      didResist === true 
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400' 
                        : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Yes, I resisted! ⚓
                  </button>
                  <button
                    onClick={() => setDidResist(false)}
                    className={`p-4 rounded-2xl border-2 font-semibold text-sm text-center transition-all ${
                      didResist === false 
                        ? 'border-red-600 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400' 
                        : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    No, I acted on it ⚠️
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 space-y-3">
        {hasUrge === false && (
          <Button 
            onClick={handleWellnessCheckIn}
            disabled={loading}
            className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 font-bold text-lg text-white"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Confirm Wellness Check-in'}
          </Button>
        )}

        {hasUrge === true && (
          <Button 
            onClick={handleLogUrge}
            disabled={intensity === null || didResist === null || loading}
            className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-bold text-lg text-white"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Log Recovery Status'}
          </Button>
        )}

        {hasUrge !== null && (
          <Button 
            variant="ghost"
            onClick={() => {
              setHasUrge(null);
              setIntensity(null);
              setDidResist(null);
            }}
            className="w-full h-14 rounded-2xl text-slate-500 font-bold"
          >
            Go Back
          </Button>
        )}
      </div>
    </div>
  );
};

export default LogUrge;