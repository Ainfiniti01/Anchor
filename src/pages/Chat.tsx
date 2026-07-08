"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, ChevronLeft, Info, Loader2, ThumbsUp, ThumbsDown, Sparkles, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import MobileLayout from '@/components/MobileLayout';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useChat } from '@/context/ChatContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const Chat = () => {
  const navigate = useNavigate();
  const { 
    messages, 
    isTyping, 
    sendMessage, 
    markAllAsRead, 
    isFirstTimeUser, 
    triggerFirstTimeWelcome,
    recommendation,
    setRecommendation,
    applyRecommendation
  } = useChat();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    markAllAsRead();
    
    // If first time user, trigger welcome message automatically
    if (isFirstTimeUser && messages.length === 0) {
      triggerFirstTimeWelcome();
    }
  }, [isFirstTimeUser, messages.length]);

  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior
      });
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      if (isInitialLoad) {
        // Snap instantly to bottom on first load
        scrollToBottom('auto');
        setIsInitialLoad(false);
      } else {
        // Smooth scroll for new messages
        scrollToBottom('smooth');
      }
    }
  }, [messages, isInitialLoad]);

  useEffect(() => {
    if (isTyping) {
      scrollToBottom('smooth');
    }
  }, [isTyping]);

  // Handle auto-resizing of textarea to prevent horizontal scroll & ugly overflows
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

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
      showSuccess(isHelpful ? "Anchor will keep this style!" : "Anchor will adjust its approach.");
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const text = input;
    setInput('');
    await sendMessage(text);
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

      {/* Notification Recommendation Bottom Sheet Dialog */}
      <Dialog open={!!recommendation} onOpenChange={(open) => !open && setRecommendation(null)}>
        <DialogContent className="rounded-3xl max-w-[340px] p-6">
          <DialogHeader className="space-y-2">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-2">
              <Sparkles size={24} className="animate-pulse" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
              Smart Schedule Recommendation
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Anchor recommends adjusting your check-ins based on your recovery pattern.
            </DialogDescription>
          </DialogHeader>

          {recommendation && (
            <div className="space-y-4 py-3">
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Frequency</span>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{recommendation.recommended_frequency}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Suggested Times</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{recommendation.recommended_times}</span>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
                "{recommendation.explanation}"
              </p>
            </div>
          )}

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end pt-2">
            <Button 
              onClick={applyRecommendation}
              className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-sm text-white flex items-center justify-center gap-2"
            >
              <Check size={16} />
              Apply Schedule
            </Button>
            <Button 
              variant="ghost"
              onClick={() => setRecommendation(null)}
              className="w-full h-11 rounded-xl text-slate-500 font-bold text-sm flex items-center justify-center gap-2"
            >
              <X size={16} />
              Not now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
};

export default Chat;