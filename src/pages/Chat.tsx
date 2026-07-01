"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, ChevronLeft, Info, Loader2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import MobileLayout from '@/components/MobileLayout';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

interface Message {
  id: string;
  message: string;
  role: 'user' | 'ai';
  created_at: string;
  feedback_given?: boolean;
}

const Chat = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchChatHistory();
  }, []);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages, isTyping]);

  // Handle auto-resizing of textarea to prevent horizontal scroll & ugly overflows
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

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

  const handleFeedback = async (messageId: string, isHelpful: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('interaction_feedback').insert([{
      user_id: user.id,
      message_id: messageId,
      is_helpful: isHelpful
    }]);

    if (error) {
      showError("Failed to save feedback");
    } else {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, feedback_given: true } : m));
      showSuccess(isHelpful ? "Anchor will keep this style!" : "Anchor will adjust its approach.");
    }
  };

  const saveMessage = async (role: 'user' | 'ai', text: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase.from('chat_messages').insert([
      {
        user_id: user.id,
        role: role,
        message: text
      }
    ]).select();
    
    return data?.[0]?.id;
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
    await saveMessage('user', userText);
    setIsTyping(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("User not authenticated");

      const response = await fetch('https://aymmmpfupfqlmyacilbm.supabase.co/functions/v1/chat-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          message: userText,
          user_id: session.user.id
        })
      });

      if (!response.ok) throw new Error("AI Service unavailable");

      const data = await response.json();
      const aiReply = data.reply;
      const savedId = await saveMessage('ai', aiReply);

      const aiMsg: Message = {
        id: savedId || (Date.now() + 1).toString(),
        message: aiReply,
        role: 'ai',
        created_at: new Date().toISOString(),
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (error: any) {
      showError("Unable to connect to Anchor right now.");
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <MobileLayout>
      <div className="flex flex-col h-[calc(100vh-80px)] bg-white dark:bg-slate-950">
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

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-indigo-600" />
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm break-words whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'
                }`}>
                  {msg.message}
                </div>
                {msg.role === 'ai' && !msg.feedback_given && (
                  <div className="flex gap-2 mt-2 ml-1">
                    <button 
                      onClick={() => handleFeedback(msg.id, true)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-green-500 transition-colors"
                    >
                      <ThumbsUp size={14} />
                    </button>
                    <button 
                      onClick={() => handleFeedback(msg.id, false)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <ThumbsDown size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 p-4 rounded-2xl rounded-tl-none text-sm italic flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                </div>
                Anchor is typing...
              </div>
            </div>
          )}
          <div className="h-32" />
        </div>

        <div className="fixed bottom-20 w-full max-w-md bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 p-4 z-20">
          <div className="flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 min-h-[44px] max-h-[120px] rounded-xl bg-slate-50 dark:bg-slate-900 border-none resize-none py-3 px-4 focus-visible:ring-indigo-600 text-slate-900 dark:text-white"
              disabled={isTyping}
            />
            <Button 
              onClick={handleSend}
              disabled={isTyping || !input.trim()}
              className="w-12 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 p-0 shrink-0 text-white"
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