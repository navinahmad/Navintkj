import { getSupabaseClient } from './supabase';
import { handleSupabaseFallback } from './supabaseFallback';

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

  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      headers,
    });
  } catch {
    const client = await getSupabaseClient();
    if (client && path.startsWith('/api/')) {
      return (await handleSupabaseFallback(client, path, options)) as T;
    }
    throw new Error(`Tidak dapat terhubung ke server (${path}).`);
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  // Jika dihosting sebagai web statis (Vercel/Netlify), /api/* akan 404 atau membalas HTML SPA.
  // Alihkan otomatis ke koneksi Supabase klien langsung jika VITE_SUPABASE_* tersedia.
  if (path.startsWith('/api/') && (response.status === 404 || !isJson)) {
    const client = await getSupabaseClient();
    if (client) {
      return (await handleSupabaseFallback(client, path, options)) as T;
    }
    if (path === '/api/auth/login' || path === '/api/auth/register') {
      throw new Error(
        'Server backend (/api) tidak aktif di hosting ini dan variabel VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum terpasang saat build. Tambahkan keduanya di Environment Variables hosting Anda lalu redeploy.'
      );
    }
  }

  const payload = isJson ? await response.json().catch(() => ({})) : {};
  if (!response.ok) {
    throw new Error(payload.error || `Permintaan ${path} gagal (${response.status})`);
  }
  return payload as T;
}
