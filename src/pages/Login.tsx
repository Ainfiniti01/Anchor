"use client";

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { showError, showSuccess } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import brandLogo from '../../assets/images/createimg-ai.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      showError(error.message);
      setLoading(false);
    } else {
      showSuccess("Welcome back!");
      navigate('/home');
    }
  };

  return (
    <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-white mb-8">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-4 shadow-xl overflow-hidden p-2">
            <img src={brandLogo} alt="Anchor" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold">Welcome Back</h1>
          <p className="text-indigo-100">Sign in to continue your journey</p>
        </div>

        <Card className="p-6 rounded-3xl border-none shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-4">
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
            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-400" size={20} />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  className="pl-10 pr-10 h-12 rounded-xl bg-slate-50 border-none"
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
              <div className="text-right">
                <Link to="/forgot-password" uncomfortable-link="true" className="text-sm text-indigo-600 font-medium hover:underline">
                  Forgot Password?
                </Link>
              </div>
            </div>
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-lg"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Login'}
            </Button>
          </form>
        </Card>

        <p className="text-center text-indigo-100">
          Don't have an account?{' '}
          <Link to="/register" className="font-bold underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;