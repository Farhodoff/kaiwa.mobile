import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

/**
 * Same Supabase project the kaiwa.live web app uses.
 * Values can be overridden with EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY.
 */
export const DEFAULT_SUPABASE_URL = 'https://qmuimxnknxwarvnkpnlo.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'sb_publishable_6g0Ei_1Cw46e1mJLKj_1Ug_sOmhlgoI';

const isValidUrl = (value?: string) => {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const isValidKey = (value?: string) => {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return false;
  if (trimmed.includes('your_supabase') || trimmed.includes('placeholder')) return false;
  return trimmed.startsWith('sb_publishable_') || trimmed.startsWith('eyJ');
};

const envUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const envKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseUrl = isValidUrl(envUrl) ? envUrl!.trim() : DEFAULT_SUPABASE_URL;
export const supabaseAnonKey = isValidKey(envKey) ? envKey!.trim() : DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
    // On web the OAuth redirect lands on the page with ?code=... — let the
    // client exchange it. Native apps receive it through the kaiwa:// scheme
    // handled in src/services/oauth.ts instead.
    detectSessionInUrl: Platform.OS === 'web',
    storage: AsyncStorage,
    storageKey: 'sb-kaiwa-auth-token',
  },
});

/**
 * True when usable backend credentials exist — either explicit EXPO_PUBLIC_*
 * env vars or the project defaults (the same Supabase project the web app
 * ships with, see src/lib/supabase.ts in the repo root).
 */
export const hasRealBackend = isValidUrl(supabaseUrl) && isValidKey(supabaseAnonKey);
