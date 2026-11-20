import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiRequest, getStoredToken, setStoredToken } from '../lib/api';
import { supabaseClient } from '../lib/supabase';
import type { BootstrapStatus, UserProfile } from '../types/app';

interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  nip?: string;
  jabatan?: string;
}

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  bootstrapStatus: BootstrapStatus | null;
  login: (email: string, password: string) => Promise<UserProfile>;
  register: (payload: RegisterPayload) => Promise<{ user: UserProfile; isFirstAdmin: boolean }>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [bootstrapStatus, setBootstrapStatus] = useState<BootstrapStatus | null>(null);

  const loadBootstrap = useCallback(async () => {
    try {
      const status = await apiRequest<BootstrapStatus>('/api/auth/bootstrap-status');
      setBootstrapStatus(status);
      return status;
    } catch {
      return null;
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    setLoading(true);
    try {
      await loadBootstrap();
      let hasToken = Boolean(getStoredToken());
      if (supabaseClient) {
        const { data } = await supabaseClient.auth.getSession();
        if (data.session?.access_token) {
          hasToken = true;
        }
      }
      if (!hasToken) {
        setUser(null);
        return;
      }
      const res = await apiRequest<{ user: UserProfile }>('/api/auth/me');
      setUser(res.user);
    } catch {
      setStoredToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [loadBootstrap]);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const login = useCallback(async (email: string, password: string) => {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error || !data.session) {
        throw new Error(error?.message || 'Email atau kata sandi tidak valid.');
      }
      setStoredToken(data.session.access_token);
      const me = await apiRequest<{ user: UserProfile }>('/api/auth/me');
      setUser(me.user);
      await loadBootstrap();
      return me.user;
    }

    const res = await apiRequest<{ user: UserProfile; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(res.token);
    setUser(res.user);
    await loadBootstrap();
    return res.user;
  }, [loadBootstrap]);

  const register = useCallback(async (payload: RegisterPayload) => {
    const res = await apiRequest<{
      user: UserProfile;
      token: string | null;
      isFirstAdmin: boolean;
    }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (supabaseClient) {
      const { data } = await supabaseClient.auth.signInWithPassword({
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
      });
      if (data.session?.access_token) {
        setStoredToken(data.session.access_token);
      }
    } else if (res.token) {
      setStoredToken(res.token);
    }

    setUser(res.user);
    await loadBootstrap();
    return { user: res.user, isFirstAdmin: res.isFirstAdmin };
  }, [loadBootstrap]);

  const logout = useCallback(async () => {
    if (supabaseClient) {
      await supabaseClient.auth.signOut().catch(() => {});
    }
    setStoredToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        bootstrapStatus,
        login,
        register,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider.');
  }
  return ctx;
}
