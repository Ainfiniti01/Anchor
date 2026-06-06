"use client";

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Loader2, ChevronLeft, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { showError, showSuccess } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      showError(error.message);
    } else {
      showSuccess("Password reset link sent to your email!");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-white mb-8">
          <button onClick={() => navigate(-1)} className="self-start mb-4 text-indigo-100 hover:text-white flex items-center gap-2">
            <ChevronLeft size={20} /> Back
          </button>
          <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mb-4 backdrop-blur-sm">
            <KeyRound size={40} />
          </div>
          <h1 className="text-3xl font-bold text-center">Reset Password</h1>
          <p className="text-indigo-100 text-center mt-2">Enter your email to receive a recovery link</p>
        </div>

        <Card className="p-6 rounded-3xl border-none shadow-2xl">
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-slate-400" size={20} />
                <Input
                  type="email"
                  placeholder="Email Address"
                  className="pl-10 h-12 rounded-xl bg-slate-50 border-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-lg"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Send Reset Link'}
            </Button>
          </form>
        </Card>

        <p className="text-center text-indigo-100">
          Remember your password?{' '}
          <Link to="/login" className="font-bold underline">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;