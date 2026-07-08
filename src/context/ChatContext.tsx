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
  enabled: boolean;
  times: string[];
  reason: string;
}

interface ChatContextType {
  messages: Message[];
  unreadCount: number;
  isTyping: boolean;
  loading: boolean;
  activeRecommendation: NotificationRecommendation | null;
  isFirstTimeUser: boolean;
  sendMessage: (text: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearRecommendation: () => void;
  applyRecommendation: () => Promise<void>;
  triggerFirstTimeWelcome: () => Promise<void>;
  simulateScheduledNotification: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeRecommendation, setActiveRecommendation] = useState<NotificationRecommendation | null>(null);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Keep a ref to messages to avoid closure issues in background promises
  const messagesRef = useRef<Message[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Fetch messages and check first-time user status
  const fetchChatData = async (uid: string) => {
    setLoading(true);
    try {
      // Fetch chat history
      const { data: chatData, error: chatError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: true });

      if (chatError) throw chatError;

      // Fetch memories to determine if first-time user
      const { data: memoriesData, error: memError } = await supabase
        .from('user_memories')
        .select('id')
        .eq('user_id', uid)
        .limit(1);

      if (memError) throw memError;

      const hasNoHistory = !chatData || chatData.length === 0;
      const hasNoMemories = !memoriesData || memoriesData.length === 0;
      const isFirstTime = hasNoHistory && hasNoMemories;

      setIsFirstTimeUser(isFirstTime);
      
      if (chatData) {
        // Map messages and handle missing 'read' column gracefully
        const mappedMessages = chatData.map((m: any) => ({
          id: m.id,
          message: m.message,
          role: m.role,
          created_at: m.created_at,
          feedback_given: m.feedback_given,
          read: m.read !== undefined ? m.read : true, // Default to true for old messages
        }));
        setMessages(mappedMessages);

        // Calculate unread count
        const unread = mappedMessages.filter(m => m.role === 'ai' && m.read === false).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error("Error fetching chat data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Listen to auth state changes
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        fetchChatData(session.user.id);
      } else {
        setUserId(null);
        setMessages([]);
        setUnreadCount(0);
        setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        fetchChatData(session.user.id);
      } else {
        setUserId(null);
        setMessages([]);
        setUnreadCount(0);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Mark all AI messages as read
  const markAllAsRead = async () => {
    if (!userId || unreadCount === 0) return;

    try {
      // Update local state immediately for instant UI feedback
      setMessages(prev => prev.map(m => m.role === 'ai' ? { ...m, read: true } : m));
      setUnreadCount(0);

      // Update in Supabase
      const { error } = await supabase
        .from('chat_messages')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('role', 'ai')
        .eq('read', false);

      if (error) {
        // If column doesn't exist yet, it will fail silently or log, which is fine
        console.warn("Could not update read status in DB (column might be missing):", error.message);
      }
    } catch (err) {
      console.error("Error marking messages as read:", err);
    }
  };

  // Send message with background processing
  const sendMessage = async (text: string) => {
    if (!userId || !text.trim()) return;

    const tempId = Date.now().toString();
    const userMsg: Message = {
      id: tempId,
      message: text,
      role: 'user',
      created_at: new Date().toISOString(),
      read: true
    };

    // 1. Immediately display user message in UI
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    // 2. Immediately save user message to Supabase in background
    const saveUserMessagePromise = supabase.from('chat_messages').insert([
      {
        user_id: userId,
        role: 'user',
        message: text,
        read: true
      }
    ]).select();

    // 3. Start Edge Function request in background (detached from component lifecycle)
    const processAiResponse = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("User not authenticated");

        // Wait for user message to be saved to get correct history order
        const userSaveResult = await saveUserMessagePromise;
        const savedUserMsgId = userSaveResult.data?.[0]?.id;

        if (savedUserMsgId) {
          // Update the temporary ID with the real database ID
          setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: savedUserMsgId } : m));
        }

        const response = await fetch('https://aymmmpfupfqlmyacilbm.supabase.co/functions/v1/chat-ai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            message: text,
            user_id: userId
          })
        });

        if (!response.ok) throw new Error("AI Service unavailable");

        const data = await response.json();
        const aiReply = data.reply;

        // Save AI response to Supabase with read = false
        const { data: savedAiData, error: aiSaveError } = await supabase.from('chat_messages').insert([
          {
            user_id: userId,
            role: 'ai',
            message: aiReply,
            read: false
          }
        ]).select();

        if (aiSaveError) throw aiSaveError;

        const savedAiMsg = savedAiData?.[0];
        const aiMsg: Message = {
          id: savedAiMsg?.id || (Date.now() + 1).toString(),
          message: aiReply,
          role: 'ai',
          created_at: savedAiMsg?.created_at || new Date().toISOString(),
          read: false,
          feedback_given: false
        };

        // Update messages list and unread count
        setMessages(prev => [...prev, aiMsg]);
        setUnreadCount(prev => prev + 1);

        // Check for notification recommendation
        if (data.notification_recommendation?.enabled) {
          setActiveRecommendation({
            enabled: true,
            times: data.notification_recommendation.times,
            reason: data.notification_recommendation.reason || "Anchor recommends adjusting your check-ins based on your recovery pattern."
          });
        }

        // Since a message was sent, it's no longer a first-time user
        setIsFirstTimeUser(false);

      } catch (error: any) {
        console.error("Background AI processing error:", error);
        showError("Unable to connect to Anchor right now.");
      } finally {
        setIsTyping(false);
      }
    };

    // Execute AI processing in background without awaiting it in the main thread
    processAiResponse();
  };

  // Trigger first-time welcome message automatically
  const triggerFirstTimeWelcome = async () => {
    if (!userId || messages.length > 0) return;

    setIsTyping(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Send a silent trigger to the AI to generate the welcome onboarding message
      const response = await fetch('https://aymmmpfupfqlmyacilbm.supabase.co/functions/v1/chat-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          message: "Hello, I am ready to start my journey.",
          user_id: userId
        })
      });

      if (!response.ok) throw new Error("AI Service unavailable");

      const data = await response.json();
      const aiReply = data.reply;

      // Save AI welcome message to Supabase
      const { data: savedAiData } = await supabase.from('chat_messages').insert([
        {
          user_id: userId,
          role: 'ai',
          message: aiReply,
          read: false
        }
      ]).select();

      const savedAiMsg = savedAiData?.[0];
      const aiMsg: Message = {
        id: savedAiMsg?.id || Date.now().toString(),
        message: aiReply,
        role: 'ai',
        created_at: savedAiMsg?.created_at || new Date().toISOString(),
        read: false,
        feedback_given: false
      };

      setMessages([aiMsg]);
      setUnreadCount(1);
      setIsFirstTimeUser(false);
    } catch (err) {
      console.error("Error triggering welcome message:", err);
    } finally {
      setIsTyping(false);
    }
  };

  // Simulate a scheduled notification conversation
  const simulateScheduledNotification = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Call the check-in-scheduler Edge Function
      const response = await fetch('https://aymmmpfupfqlmyacilbm.supabase.co/functions/v1/check-in-scheduler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) throw new Error("Scheduler failed");

      const data = await response.json();
      if (data.success) {
        showSuccess("Scheduled notification simulated! Check your chat.");
        // Refresh chat data to pull the new AI message
        await fetchChatData(userId);
      } else {
        showError("No check-ins due or scheduler returned false.");
      }
    } catch (err: any) {
      showError(err.message || "Failed to simulate scheduled notification");
    } finally {
      setLoading(false);
    }
  };

  const clearRecommendation = () => {
    setActiveRecommendation(null);
  };

  // Apply recommended notification times to user profile
  const applyRecommendation = async () => {
    if (!userId || !activeRecommendation) return;

    try {
      const formattedFrequency = `${activeRecommendation.times.length} times per day`;
      
      const { error } = await supabase
        .from('profiles')
        .update({
          check_in_frequency: formattedFrequency,
          behavioral_preferences: {
            notification_style: 'Both',
            quiet_hours: { start: '22:00', end: '08:00' },
            recommended_times: activeRecommendation.times
          }
        })
        .eq('id', userId);

      if (error) throw error;

      showSuccess("Anchor's recommended schedule applied successfully!");
      setActiveRecommendation(null);
    } catch (err: any) {
      showError("Failed to apply recommendation");
      console.error(err);
    }
  };

  return (
    <ChatContext.Provider value={{
      messages,
      unreadCount,
      isTyping,
      loading,
      activeRecommendation,
      isFirstTimeUser,
      sendMessage,
      markAllAsRead,
      clearRecommendation,
      applyRecommendation,
      triggerFirstTimeWelcome,
      simulateScheduledNotification
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