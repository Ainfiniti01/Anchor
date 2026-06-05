"use client";

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Anchor, Mail, Lock, Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Mock registration
    setTimeout(() => {
      setLoading(false);
      navigate('/onboarding');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-white mb-8">
          <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mb-4 backdrop-blur-sm">
            <UserPlus size={40} />
          </div>
          <h1 className="text-3xl font-bold">Create Account</h1>
          <p className="text-indigo-100">Start your recovery journey today</p>
        </div>

        <Card className="p-6 rounded-3xl border-none shadow-2xl">
          <form onSubmit={handleRegister} className="space-y-4">
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
                  type="password"
                  placeholder="Password"
                  className="pl-10 h-12 rounded-xl bg-slate-50 border-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-400" size={20} />
                <Input
                  type="password"
                  placeholder="Confirm Password"
                  className="pl-10 h-12 rounded-xl bg-slate-50 border-none"
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