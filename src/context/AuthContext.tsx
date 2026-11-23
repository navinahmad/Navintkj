import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { apiRequest, getStoredToken, setStoredToken } from '../lib/api';
import { getSupabaseClient, supabaseClient } from '../lib/supabase';
import type { BootstrapStatus, UserProfile, UserRole } from '../types/app';

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

function mapProfileRow(row: Record<string, unknown>): UserProfile {
  const role = String(row.role || 'tenaga_kependidikan');
  const validRole: UserRole =
    role === 'admin' || role === 'guru' || role === 'tenaga_kependidikan'
      ? role
      : 'tenaga_kependidikan';
  return {
    id: String(row.id),
    email: String(row.email || ''),
    fullName: String(row.full_name || ''),
    nip: String(row.nip || ''),
    jabatan: String(row.jabatan || ''),
    role: validRole,
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

async function resolveProfileViaClient(client: SupabaseClient): Promise<UserProfile> {
  try {
    return (await apiRequest<{ user: UserProfile }>('/api/auth/me')).user;
  } catch {
    const { data: ensured, error: ensureErr } = await client.rpc('ensure_my_profile');
    if (!ensureErr && ensured) {
      return mapProfileRow(ensured as Record<string, unknown>);
    }
    const { data: authData } = await client.auth.getUser();
    if (!authData?.user) {
      throw new Error('Sesi autentikasi tidak ditemukan.');
    }
    const { data: prof, error: profErr } = await client
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();
    if (profErr || !prof) {
      throw new Error('Gagal membaca profil pengguna di Supabase.');
    }
    return mapProfileRow(prof as Record<string, unknown>);
  }
}

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
      const client = await getSupabaseClient();
      if (!client) return null;
      try {
        const { data: hasUsers, error } = await client.rpc('has_registered_users');
        const fallback: BootstrapStatus = {
          hasUsers: Boolean(hasUsers),
          provider: 'supabase',
          supabaseConfigured: true,
          schemaReady: !error,
          adminSyncAvailable: false,
        };
        setBootstrapStatus(fallback);
        return fallback;
      } catch {
        return null;
      }
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    setLoading(true);
    try {
      await loadBootstrap();
      const client = await getSupabaseClient();
      let hasToken = Boolean(getStoredToken());
      if (client) {
        const { data } = await client.auth.getSession();
        if (data.session?.access_token) {
          setStoredToken(data.session.access_token);
          hasToken = true;
        }
      }
      if (!hasToken) {
        setUser(null);
        return;
      }
      if (client) {
        const profile = await resolveProfileViaClient(client);
        setUser(profile);
      } else {
        const res = await apiRequest<{ user: UserProfile }>('/api/auth/me');
        setUser(res.user);
      }
    } catch {
      setStoredToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [loadBootstrap]);

  useEffect(() => {
    refreshAuth();
    const client = supabaseClient;
    if (!client) return;
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.access_token) {
        setStoredToken(session.access_token);
        refreshAuth();
      } else if (event === 'SIGNED_OUT') {
        setStoredToken(null);
        setUser(null);
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [refreshAuth]);

  const login = useCallback(async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const client = await getSupabaseClient();
    if (client) {
      const { data, error } = await client.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (error || !data.session) {
        const msg = error?.message || '';
        if (msg.toLowerCase().includes('invalid login credentials')) {
          throw new Error('Email atau kata sandi tidak valid.');
        }
        if (msg.toLowerCase().includes('email not confirmed')) {
          throw new Error('Email belum dikonfirmasi di Supabase Authentication.');
        }
        throw new Error(msg || 'Email atau kata sandi tidak valid.');
      }
      setStoredToken(data.session.access_token);
      const profile = await resolveProfileViaClient(client);
      setUser(profile);
      await loadBootstrap();
      return profile;
    }

    const res = await apiRequest<{ user: UserProfile; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: cleanEmail, password }),
    });
    setStoredToken(res.token);
    setUser(res.user);
    await loadBootstrap();
    return res.user;
  }, [loadBootstrap]);

  const register = useCallback(async (payload: RegisterPayload) => {
    const client = await getSupabaseClient();
    try {
      const res = await apiRequest<{
        user: UserProfile;
        token: string | null;
        isFirstAdmin: boolean;
      }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.token) {
        setStoredToken(res.token);
      }

      if (client) {
        const { data } = await client.auth.signInWithPassword({
          email: payload.email.trim().toLowerCase(),
          password: payload.password,
        });
        if (data.session?.access_token) {
          setStoredToken(data.session.access_token);
        }
      }

      setUser(res.user);
      await loadBootstrap();
      return { user: res.user, isFirstAdmin: res.isFirstAdmin };
    } catch (err) {
      if (!client) throw err;
      const errMsg = err instanceof Error ? err.message : '';
      if (!errMsg.includes('(404)') && !errMsg.includes('Failed to fetch')) {
        throw err;
      }

      const { data: rpcHasUsers } = await client.rpc('has_registered_users');
      const isFirstAdmin = !Boolean(rpcHasUsers);
      const { data: signUpData, error: signUpErr } = await client.auth.signUp({
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            full_name: payload.fullName.trim(),
            nip: (payload.nip || '').trim(),
            jabatan: (payload.jabatan || '').trim(),
            role: isFirstAdmin ? 'admin' : 'tenaga_kependidikan',
          },
        },
      });
      if (signUpErr || !signUpData.user) {
        throw new Error(signUpErr?.message || 'Gagal mendaftarkan akun di Supabase Auth.');
      }
      if (!signUpData.session?.access_token) {
        throw new Error(
          'Akun berhasil dibuat, namun Supabase meminta konfirmasi email terlebih dahulu. Periksa email Anda atau nonaktifkan "Confirm email" di Supabase Authentication.'
        );
      }
      setStoredToken(signUpData.session.access_token);
      const profile = await resolveProfileViaClient(client);
      setUser(profile);
      await loadBootstrap();
      return { user: profile, isFirstAdmin: isFirstAdmin || profile.role === 'admin' };
    }
  }, [loadBootstrap]);

  const logout = useCallback(async () => {
    const client = await getSupabaseClient();
    if (client) {
      await client.auth.signOut().catch(() => {});
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
