import { getSupabaseClient } from './supabase';

const TOKEN_STORAGE_KEY = 'smk_pu_session_token';
let memoryToken: string | null = null;

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || memoryToken;
  } catch {
    return memoryToken;
  }
}

export function setStoredToken(token: string | null): void {
  memoryToken = token;
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Abaikan jika browser memblokir localStorage di mode iframe/privasi ketat
  }
}

export async function getActiveAccessToken(): Promise<string | null> {
  const client = await getSupabaseClient();
  if (client) {
    try {
      const { data } = await client.auth.getSession();
      if (data.session?.access_token) {
        return data.session.access_token;
      }
    } catch {
      // Lanjut ke token tersimpan
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
    throw new Error(payload.error || `Permintaan ${path} gagal (${response.status})`);
  }
  return payload as T;
}
