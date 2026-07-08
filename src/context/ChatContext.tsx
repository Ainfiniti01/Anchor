"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

export interface Message {
  id: string;
  message: string;
  role: 'user' | 'ai';
  created_at: string;
  feedback_given?: boolean;
  read?: boolean;
}

export interface NotificationRecommendation {
  recommended_frequency: string;
  recommended_times: string;
  explanation: string;
}

interface ChatContextType {
  messages: Message[];
  isTyping: boolean;
  unreadCount: number;
  isFirstTimeUser: boolean;
  recommendation: NotificationRecommendation | null;
  setRecommendation: (rec: NotificationRecommendation | null) => void;
  sendMessage: (text: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  applyRecommendation: () => Promise<void>;
  triggerFirstTimeWelcome: () => Promise<void>;
  refreshChat: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [recommendation, setRecommendation] = useState<NotificationRecommendation | null>(null);
  const isProcessingRef = useRef(false);

  const fetchChatAndMemories = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch chat history
    const { data: chatData, error: chatError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    // Fetch memories to detect first-time user
    const { data: memoriesData } = await supabase
      .from('user_memories')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    const hasNoChat = !chatData || chatData.length === 0;
    const hasNoMemories = !memoriesData || memoriesData.length === 0;
    const firstTime = hasNoChat && hasNoMemories;
    setIsFirstTimeUser(firstTime);

    if (chatError) {
      console.error("Failed to load chat history:", chatError);
    } else if (chatData) {
      setMessages(chatData);
      // Calculate unread count safely
      const unread = chatData.filter(m => m.role === 'ai' && m.read === false).length;
      setUnreadCount(unread);
    }
  };

  useEffect(() => {
    fetchChatAndMemories();

    // Set up real-time subscription for new messages
    const channel = supabase
      .channel('chat_messages_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages'
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        if (newMsg.role === 'ai' && !newMsg.read) {
          setUnreadCount(c => c + 1);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Optimistically clear unread count and update local state
    setUnreadCount(0);
    setMessages(prev => prev.map(m => m.role === 'ai' ? { ...m, read: true } : m));

    try {
      // Perform the update safely
      await supabase
        .from('chat_messages')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('role', 'ai')
        .eq('read', false);
    } catch (err) {
      console.warn("Could not sync read status to database. Ensure SQL migration has been run.", err);
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isProcessingRef.current) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    isProcessingRef.current = true;
    setIsTyping(true);

    // 1. Immediately save user message to Supabase
    const { data: savedUserMsg, error: saveError } = await supabase
      .from('chat_messages')
      .insert([{
        user_id: user.id,
        role: 'user',
        message: text,
        read: true
      }])
      .select()
      .single();

    if (saveError) {
      showError("Failed to send message");
      isProcessingRef.current = false;
      setIsTyping(false);
      return;
    }

    // 2. Immediately display user message in UI
    setMessages(prev => [...prev, savedUserMsg]);

    // 3. Start Edge Function request in the background
    triggerBackgroundAiReply(text, user.id);
  };

  const triggerBackgroundAiReply = async (text: string, userId: string) => {
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
          message: text,
          user_id: userId,
          is_first_time: false
        })
      });

      if (!response.ok) throw new Error("AI Service unavailable");

      const data = await response.json();
      const aiReply = data.reply;

      // Save AI response to chat_messages table
      const { data: savedAiMsg } = await supabase
        .from('chat_messages')
        .insert([{
          user_id: userId,
          role: 'ai',
          message: aiReply,
          read: false
        }])
        .select()
        .single();

      if (savedAiMsg) {
        setMessages(prev => {
          if (prev.some(m => m.id === savedAiMsg.id)) return prev;
          return [...prev, savedAiMsg];
        });
      }

      // Handle notification recommendation if present
      if (data.notification_recommendation) {
        setRecommendation(data.notification_recommendation);
      }

      setIsFirstTimeUser(false);
    } catch (error) {
      console.error("Background AI reply error:", error);
    } finally {
      isProcessingRef.current = false;
      setIsTyping(false);
    }
  };

  const triggerFirstTimeWelcome = async () => {
    if (isProcessingRef.current) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    isProcessingRef.current = true;
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
            message: "Hello Anchor",
            user_id: user.id,
            is_first_time: true
          })
        });

      if (!response.ok) throw new Error("AI Service unavailable");

      const data = await response.json();
      const aiReply = data.reply;

      const { data: savedAiMsg } = await supabase
        .from('chat_messages')
        .insert([{
          user_id: user.id,
          role: 'ai',
          message: aiReply,
          read: false
        }])
        .select()
        .single();

      if (savedAiMsg) {
        setMessages(prev => [...prev, savedAiMsg]);
      }
      setIsFirstTimeUser(false);
    } catch (error) {
      console.error("First time welcome error:", error);
    } finally {
      isProcessingRef.current = false;
      setIsTyping(false);
    }
  };

  const applyRecommendation = async () => {
    if (!recommendation) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          check_in_frequency: recommendation.recommended_frequency,
          behavioral_preferences: {
            notification_style: 'Both',
            quiet_hours: { start: '22:00', end: '08:00' },
            recommended_times: recommendation.recommended_times
          }
        })
        .eq('id', user.id);

      if (error) throw error;

      showSuccess("Notification schedule updated successfully!");
      setRecommendation(null);
    } catch (err) {
      showError("Failed to apply recommendation");
    }
  };

  return (
    <ChatContext.Provider value={{
      messages,
      isTyping,
      unreadCount,
      isFirstTimeUser,
      recommendation,
      setRecommendation,
      sendMessage,
      markAllAsRead,
      applyRecommendation,
      triggerFirstTimeWelcome,
      refreshChat: fetchChatAndMemories
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};