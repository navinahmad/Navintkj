import { supabaseClient } from './supabase';

const TOKEN_STORAGE_KEY = 'smk_pu_session_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export async function getActiveAccessToken(): Promise<string | null> {
  if (supabaseClient) {
    const { data } = await supabaseClient.auth.getSession();
    if (data.session?.access_token) {
      return data.session.access_token;
    }
  }
  return getStoredToken();
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getActiveAccessToken();
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Permintaan gagal (${response.status})`);
  }
  return payload as T;
}
