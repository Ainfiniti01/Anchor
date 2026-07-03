"use client";

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Loader2, User, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import brandLogo from '../../assets/images/_1c592e83-1366-4bb2-b7b0-e1f941f7668f';

const Register = () => {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      showError("Passwords do not match");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        }
      }
    });

    if (error) {
      showError(error.message);
      setLoading(false);
    } else {
      setIsSuccess(true);
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });
    if (error) showError(error.message);
    else showSuccess("Verification email resent!");
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center p-6">
        <Card className="w-full max-w-md p-8 rounded-[40px] border-none shadow-2xl text-center space-y-6 bg-white">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-3xl flex items-center justify-center mx-auto">
            <CheckCircle2 size={48} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">Account created successfully.</h1>
            <p className="text-slate-500 leading-relaxed">
              We've sent a verification email to your inbox. You can continue using Anchor while your email remains unverified.
            </p>
          </div>
          <div className="space-y-3 pt-4">
            <Button 
              onClick={() => navigate('/setup-profile')}
              className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-bold text-lg"
            >
              Continue to App
            </Button>
            <Button 
              variant="ghost"
              onClick={handleResendEmail}
              className="w-full h-14 rounded-2xl text-indigo-600 font-bold"
            >
              Resend Verification Email
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-white mb-8">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-4 shadow-xl overflow-hidden p-2">
            <img src={brandLogo} alt="Anchor" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold">Create Account</h1>
          <p className="text-indigo-100">Start your recovery journey today</p>
        </div>

        <Card className="p-6 rounded-3xl border-none shadow-2xl bg-white">
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <User className="absolute left-3 top-3 text-slate-400" size={20} />
                <Input
                  type="text"
                  placeholder="Full Name / Display Name"
                  className="pl-10 h-12 rounded-xl bg-slate-50 border-none text-slate-900"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-slate-400" size={20} />
                <Input
                  type="email"
                  placeholder="Email Address"
                  className="pl-10 h-12 rounded-xl bg-slate-50 border-none text-slate-900"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-400" size={20} />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  className="pl-10 pr-10 h-12 rounded-xl bg-slate-50 border-none text-slate-900"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-400" size={20} />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm Password"
                  className="pl-10 pr-10 h-12 rounded-xl bg-slate-50 border-none text-slate-900"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-lg"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Create Account'}
            </Button>
          </form>
        </Card>

        <p className="text-center text-indigo-100">
          Already have an account?{' '}
          <Link to="/login" className="font-bold underline">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;