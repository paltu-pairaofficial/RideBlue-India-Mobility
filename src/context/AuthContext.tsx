import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { UserAccount, UserRole } from '../types';
import { isSupabaseConfigured, supabase } from '../supabase/client';

interface AuthContextType {
  currentUser: UserAccount | null;
  currentRole: UserRole | null;
  isAuthenticated: boolean;
  authReady: boolean;
  signIn: (email: string, password: string) => Promise<UserRole>;
  signUp: (name: string, email: string, phone: string, password: string, role?: 'rider' | 'driver') => Promise<{ role: UserRole; needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  demoUsers: UserAccount[];
  demoMode: boolean;
  // Deprecated client-side role helpers retained as no-ops to prevent unhandled call crashes
  switchUser: (userId: string) => void;
  switchRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const avatarFallback = '';

function roleFromProfile(role: unknown): UserRole {
  return role === 'admin' || role === 'driver' ? role : 'rider';
}

function toAccount(user: User, profile?: any): UserAccount {
  return {
    id: user.id,
    email: user.email || '',
    name: profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'RideBlue User',
    phone: profile?.phone || user.user_metadata?.phone || '',
    role: roleFromProfile(profile?.role),
    avatar: profile?.avatar_url || avatarFallback,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const accountLoadSequence = useRef(0);

  const loadAccount = async (user: User | null) => {
    const sequence = ++accountLoadSequence.current;
    if (!user || !supabase) {
      setCurrentUser(null);
      return;
    }
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('full_name, phone, role, avatar_url')
      .eq('user_id', user.id)
      .maybeSingle();

    if (sequence !== accountLoadSequence.current) return;
    if (error || !profile) {
      console.error('Could not verify RideBlue database profile:', error?.message || 'Profile not found');
      setCurrentUser(null);
      return;
    }
    if (sequence === accountLoadSequence.current) setCurrentUser(toAccount(user, profile));
  };

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setCurrentUser(null);
      setAuthReady(true);
      return;
    }

    let alive = true;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (alive) await loadAccount(session?.user || null);
      if (alive) setAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
      window.setTimeout(() => {
        if (alive) void loadAccount(session?.user || null);
      }, 0);
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  const switchUser = (_userId: string) => {
    console.warn('[Security] Client-side user switching is disabled in production.');
  };

  const switchRole = (_role: UserRole) => {
    console.warn('[Security] Client-side role elevation is disabled in production. User role is authoritative from database profile only.');
  };

  const signIn = async (email: string, password: string): Promise<UserRole> => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error(
        'Supabase authentication is not configured. Please define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.'
      );
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;

    const { data: profile, error: profileError } = await supabase
      .from('profiles').select('role').eq('user_id', data.user.id).maybeSingle();
    if (profileError || !profile) {
      await supabase.auth.signOut();
      setCurrentUser(null);
      throw new Error('Your RideBlue account profile is missing or unavailable. Contact support before continuing.');
    }
    await loadAccount(data.user);
    return roleFromProfile(profile.role);
  };

  const signUp = async (
    name: string,
    email: string,
    phone: string,
    password: string,
    role: 'rider' | 'driver' = 'rider'
  ) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error(
        'Supabase authentication is not configured. Please define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.'
      );
    }

    // Explicit security rule: Public signup can only request rider or driver. Admin cannot be requested.
    const sanitizedRole: 'rider' | 'driver' = role === 'driver' ? 'driver' : 'rider';

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: name.trim(),
          phone: phone.trim(),
          requested_role: sanitizedRole,
        },
        emailRedirectTo: `${window.location.origin}/auth/sign-in`,
      },
    });

    if (error) throw error;
    if (data.user && data.session) await loadAccount(data.user);
    return { role: sanitizedRole, needsEmailConfirmation: !data.session };
  };

  const signOut = async () => {
    accountLoadSequence.current += 1;
    setCurrentUser(null);
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) console.warn('Supabase sign out error:', error.message);
    }
    setCurrentUser(null);
  };

  const requestPasswordReset = async (email: string) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase authentication is not configured.');
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) throw error;
  };

  const updatePassword = async (password: string) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase authentication is not configured.');
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole: currentUser?.role || null,
        isAuthenticated: !!currentUser,
        authReady,
        signIn,
        signUp,
        signOut,
        requestPasswordReset,
        updatePassword,
        demoUsers: [],
        demoMode: false,
        switchUser,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

