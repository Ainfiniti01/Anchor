"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, ChevronLeft, Info, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MobileLayout from '@/components/MobileLayout';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

interface Message {
  id: string;
  message: string;
  role: 'user' | 'ai';
  created_at: string;
}

const Chat = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChatHistory();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const fetchChatHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      showError("Failed to load chat history");
    } else if (data) {
      setMessages(data);
    }
    setLoading(false);
  };

  const saveMessage = async (role: 'user' | 'ai', text: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Background save
    supabase.from('chat_messages').insert([
      {
        user_id: user.id,
        role: role,
        message: text
      }
    ]).then(({ error }) => {
      if (error) console.error("Failed to save message:", error);
    });
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userText = input;
    setInput('');

    const userMsg: Message = {
      id: Date.now().toString(),
      message: userText,
      role: 'user',
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    saveMessage('user', userText);
    setIsTyping(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("User not authenticated");

      // Fetch profile for AI context
      const { data: profile } = await supabase
        .from('profiles')
        .select('habit_type, habit_duration, risk_level, triggers')
        .eq('id', session.user.id)
        .single();

      const response = await fetch('https://aymmmpfupfqlmyacilbm.supabase.co/functions/v1/chat-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          message: userText,
          profile: {
            addiction_type: profile?.habit_type || '',
            duration: profile?.habit_duration || '',
            risk_level: profile?.risk_level || '',
            triggers: profile?.triggers || []
          },
          user_id: session.user.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to connect to AI (Status: ${response.status})`);
      }

      const data = await response.json();
      const aiReply = data.reply;

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        message: aiReply,
        role: 'ai',
        created_at: new Date().toISOString(),
      };

      setMessages(prev => [...prev, aiMsg]);
      saveMessage('ai', aiReply);
    } catch (error: any) {
      showError("Unable to connect to Anchor right now. Please try again.");
      console.error("AI Chat Error:", error.message || error);
    } finally {
      setIsTyping(false);
    }
  };

  const quickActions = [
    "I feel an urge",
    "I'm struggling",
    "I slipped today",
    "Check-in"
  ];

  return (
    <MobileLayout>
      <div className="flex flex-col h-screen bg-white dark:bg-slate-950">
        <header className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-950 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-slate-400">
              <ChevronLeft size={24} />
            </button>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">Anchor</h2>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Online</span>
              </div>
            </div>
          </div>
          <Info size={20} className="text-slate-400" />
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-indigo-600" />
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            ))
          )}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 p-4 rounded-2xl rounded-tl-none text-sm italic flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Anchor is typing...
              </div>
            </div>
          )}
        </div>

        <div className="fixed bottom-20 w-full max-w-md bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 p-4 space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {quickActions.map((action) => (
              <button
                key={action}
                onClick={() => setInput(action)}
                className="whitespace-nowrap px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {action}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              className="rounded-xl bg-slate-50 dark:bg-slate-900 border-none h-12"
              disabled={isTyping}
            />
            <Button 
              onClick={handleSend}
              disabled={isTyping || !input.trim()}
              className="w-12 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 p-0"
            >
              <Send size={20} />
            </Button>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
};

export default Chat;