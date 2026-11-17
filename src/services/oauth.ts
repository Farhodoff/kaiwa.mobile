import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase, hasRealBackend } from '../lib/supabase';
import { AuthResult, DEMO_USER, toSessionUser } from './auth';

export type OAuthProvider = 'google' | 'apple';

export type OAuthResult = AuthResult & {
  /** True when this account was created moments ago (run onboarding). */
  isNew?: boolean;
};

/** Set before an OAuth flow starts, consumed after the session is restored. */
const PENDING_KEY = 'kaiwa-oauth-pending';
const PENDING_TTL_MS = 15 * 60 * 1000;
/** Accounts younger than this count as brand new. */
const NEW_USER_WINDOW_MS = 10 * 60 * 1000;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const providerLabel = (provider: OAuthProvider) =>
  provider === 'google' ? 'Google' : 'Apple';

/** Where the provider should send the user back. */
function getRedirectUri(): string {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' ? window.location.origin : '';
  }
  // Deep link handled by the app (scheme in app.json).
  return makeRedirectUri({ scheme: 'kaiwa', path: 'auth-callback' });
}

async function markPending(): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

async function clearPending(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Called once while restoring a session (web OAuth returns via a full page
 * reload). True when an OAuth flow started recently AND the signed-in user
 * was just created — the flag is always consumed so it never fires twice.
 */
export async function consumeOAuthPending(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    if (!raw) return false;
    await clearPending();
    const ts = Number(raw);
    if (!Number.isFinite(ts) || Date.now() - ts > PENDING_TTL_MS) return false;
    const { data } = await supabase.auth.getSession();
    const createdAt = data.session?.user?.created_at;
    if (!createdAt) return false;
    return Date.now() - new Date(createdAt).getTime() < NEW_USER_WINDOW_MS;
  } catch {
    return false;
  }
}

const isNewAccount = (createdAt?: string) =>
  !!createdAt &&
  Date.now() - new Date(createdAt).getTime() < NEW_USER_WINDOW_MS;

/** Map Supabase/Google OAuth errors to Uzbek messages shown in the UI. */
function humanizeOAuthError(message: string, provider: OAuthProvider): string {
  const m = message.toLowerCase();
  if (m.includes('provider is not enabled') || m.includes('unsupported provider')) {
    return `${providerLabel(provider)} bilan kirish hozircha sozlanmagan`;
  }
  if (m.includes('flow_state_not_found') || m.includes('code challenge') || m.includes('code_verifier')) {
    return "Sessiya muddati tugdi — qaytadan urinib ko'ring";
  }
  if (m.includes('redirect') && (m.includes('invalid') || m.includes('not allowed') || m.includes('allow'))) {
    return 'Redirect URL sozlamalari noto\'g\'ri';
  }
  if (m.includes('rate limit') || m.includes('too many')) return "Juda ko'p urinish — biroz kuting";
  if (m.includes('network') || m.includes('fetch')) return 'Internet aloqasi yo\'q';
  return message;
}

function pickErrorParams(url: string): string | null {
  try {
    const parsed = new URL(url);
    const fromQuery =
      parsed.searchParams.get('error_description') || parsed.searchParams.get('error');
    if (fromQuery) return fromQuery;
    if (parsed.hash) {
      const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''));
      return hash.get('error_description') || hash.get('error');
    }
  } catch {
    /* ignore */
  }
  return null;
}

function pickParam(url: string, key: string): string | null {
  try {
    const parsed = new URL(url);
    const value = parsed.searchParams.get(key);
    if (value) return value;
    if (parsed.hash) {
      return new URLSearchParams(parsed.hash.replace(/^#/, '')).get(key);
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Ask the authorize endpoint whether it will accept this request BEFORE
 * sending the user to the browser, so a disabled provider shows a friendly
 * message instead of a raw JSON error page.
 * Returns the provider's error message, or null when the flow can proceed.
 */
async function probeAuthorize(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { redirect: 'manual' });
    // A redirect to the real provider (or an unreadable/CORS response) is fine.
    if (res.type === 'opaqueredirect' || res.status === 0 || res.status < 400) return null;
    const text = await res.text();
    try {
      const parsed = JSON.parse(text);
      return (
        parsed.msg || parsed.error_description || parsed.error || parsed.message || null
      );
    } catch {
      return null;
    }
  } catch {
    // Network/CORS issue — let the real flow run and handle it there.
    return null;
  }
}

/**
 * Sign in with Google / Apple through Supabase's OAuth (PKCE).
 * - native: opens the browser and waits for the kaiwa:// deep-link return
 * - web:    full-page redirect (the session is restored on reload)
 */
export async function signInWithOAuth(provider: OAuthProvider): Promise<OAuthResult> {
  if (!hasRealBackend) {
    // Offline demo mode — no backend credentials configured.
    await delay(600);
    return { ok: true, isNew: true, user: DEMO_USER };
  }

  const redirectUri = getRedirectUri();

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectUri, skipBrowserRedirect: true },
    });
    if (error) return { ok: false, error: humanizeOAuthError(error.message, provider) };
    if (!data.url) return { ok: false, error: `${providerLabel(provider)} kirishida xatolik` };

    // Bail out early (with a friendly message) when the provider is disabled.
    const blocked = await probeAuthorize(data.url);
    if (blocked) return { ok: false, error: humanizeOAuthError(blocked, provider) };

    // Web: full-page redirect — the session is restored on reload.
    if (Platform.OS === 'web') {
      await markPending();
      window.location.href = data.url;
      return { ok: false };
    }

    await markPending();
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

    if (result.type !== 'success') {
      await clearPending();
      // User closed the browser — no error banner.
      return { ok: false };
    }

    const returnedUrl = result.url;
    const oauthError = pickErrorParams(returnedUrl);
    if (oauthError) {
      await clearPending();
      return { ok: false, error: humanizeOAuthError(oauthError, provider) };
    }

    const code = pickParam(returnedUrl, 'code');
    const accessToken = pickParam(returnedUrl, 'access_token');
    const refreshToken = pickParam(returnedUrl, 'refresh_token');

    if (code) {
      const { data: ex, error: exError } = await supabase.auth.exchangeCodeForSession(code);
      if (exError) {
        await clearPending();
        return { ok: false, error: humanizeOAuthError(exError.message, provider) };
      }
      if (!ex.user) {
        await clearPending();
        return { ok: false, error: 'Kirishda kutilmagan xatolik' };
      }
      await clearPending();
      return { ok: true, user: toSessionUser(ex.user), isNew: isNewAccount(ex.user.created_at) };
    }

    if (accessToken && refreshToken) {
      const { data: sd, error: sError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (sError) {
        await clearPending();
        return { ok: false, error: humanizeOAuthError(sError.message, provider) };
      }
      if (!sd.user) {
        await clearPending();
        return { ok: false, error: 'Kirishda kutilmagan xatolik' };
      }
      await clearPending();
      return { ok: true, user: toSessionUser(sd.user), isNew: isNewAccount(sd.user.created_at) };
    }

    await clearPending();
    return { ok: false, error: 'Avtorizatsiya kodini olish amalga oshmadi' };
  } catch (e) {
    await clearPending();
    return {
      ok: false,
      error: humanizeOAuthError(e instanceof Error ? e.message : 'Tarmoq xatosi', provider),
    };
  }
}
