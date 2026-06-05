"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, ChevronLeft, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MobileLayout from '@/components/MobileLayout';
import { useNavigate } from 'react-router-dom';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

const Chat = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi there. I'm Anchor. How are you feeling right now?",
      sender: 'ai',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // Mock AI Response
    setTimeout(() => {
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: "I hear you. What is making the urge stronger right now?",
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMsg]);
    }, 1000);
  };

  const quickActions = [
    "I feel an urge",
    "I'm struggling",
    "I slipped today",
    "Check-in"
  ];

  return (
    <MobileLayout>
      <div className="flex flex-col h-screen bg-white">
        <header className="p-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-slate-400">
              <ChevronLeft size={24} />
            </button>
            <div>
              <h2 className="font-bold text-slate-900">Anchor</h2>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Online</span>
              </div>
            </div>
          </div>
          <Info size={20} className="text-slate-400" />
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-slate-100 text-slate-800 rounded-tl-none'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        <div className="fixed bottom-20 w-full max-w-md bg-white border-t border-slate-100 p-4 space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {quickActions.map((action) => (
              <button
                key={action}
                onClick={() => setInput(action)}
                className="whitespace-nowrap px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-xs font-medium text-slate-600 hover:bg-slate-100"
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
              className="rounded-xl bg-slate-50 border-none h-12"
            />
            <Button 
              onClick={handleSend}
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