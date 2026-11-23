import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const supabaseAnonKey = (
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY as string | undefined)
)?.trim();

export const isClientSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let dynamicClient: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null;

export const supabaseClient: SupabaseClient | null = dynamicClient;

export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  if (dynamicClient) return dynamicClient;
  try {
    const resp = await fetch('/api/public-config');
    if (!resp.ok) return null;
    const cfg = (await resp.json()) as { supabaseUrl?: string | null; supabaseAnonKey?: string | null };
    if (cfg.supabaseUrl && cfg.supabaseAnonKey) {
      dynamicClient = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
      return dynamicClient;
    }
  } catch {
    return null;
  }
  return null;
}
