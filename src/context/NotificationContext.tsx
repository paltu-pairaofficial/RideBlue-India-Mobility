import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { NotificationItem } from '../types';
import { isSupabaseConfigured, supabase } from '../supabase/client';

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const refreshSequence = useRef(0);

  const refreshNotifications = useCallback(async () => {
    const sequence = ++refreshSequence.current;
    if (!isSupabaseConfigured || !supabase) {
      setNotifications([]);
      setAccountId(null);
      setError('Notifications are unavailable because Supabase is not configured.');
      return;
    }
    setLoading(true);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      setNotifications([]);
      setAccountId(null);
      setError(null);
      setLoading(false);
      return;
    }
    setAccountId(user.id);
    const { data, error: queryError } = await supabase
      .from('notifications')
      .select('id, recipient_user_id, target_role, title, message, type, is_read, link, created_at')
      .eq('recipient_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (sequence !== refreshSequence.current) return;
    const { data: currentSession } = await supabase.auth.getUser();
    if (sequence !== refreshSequence.current || currentSession.user?.id !== user.id) return;
    if (queryError) {
      setNotifications([]);
      setError(`Notifications could not be loaded: ${queryError.message}`);
    } else {
      setNotifications((data || []).map((row: any) => ({
        id: row.id,
        userId: row.recipient_user_id,
        targetRole: row.target_role || 'all',
        title: row.title,
        message: row.message,
        type: row.type,
        read: Boolean(row.is_read),
        link: row.link || undefined,
        createdAt: row.created_at,
      })));
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refreshNotifications();
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      // Clear old account data immediately; then reload under the new session.
      setNotifications([]);
      setAccountId(null);
      window.setTimeout(() => { void refreshNotifications(); }, 0);
    });
    return () => { refreshSequence.current += 1; subscription.unsubscribe(); };
  }, [refreshNotifications]);

  useEffect(() => {
    if (!supabase || !accountId) return;
    const channel = supabase.channel(`account-notifications-${accountId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `recipient_user_id=eq.${accountId}` }, () => {
        void refreshNotifications();
      }).subscribe();
    return () => { if (supabase) void supabase.removeChannel(channel); };
  }, [accountId, refreshNotifications]);

  const markAsRead = async (id: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Sign in to manage notifications.');
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id).eq('recipient_user_id', user.id);
    if (error) throw error;
    await refreshNotifications();
  };
  const markAllAsRead = async () => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('recipient_user_id', user.id).eq('is_read', false);
    if (error) throw error;
    await refreshNotifications();
  };
  const clearAll = async () => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('notifications').delete().eq('recipient_user_id', user.id);
    if (error) throw error;
    await refreshNotifications();
  };

  return <NotificationContext.Provider value={{ notifications, unreadCount: notifications.filter((n) => !n.read).length, loading, error, refreshNotifications, markAsRead, markAllAsRead, clearAll }}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
};
