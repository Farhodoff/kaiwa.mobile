import { supabase, hasRealBackend } from '../lib/supabase';

export type SessionUser = {
  id: string;
  email: string;
  name: string;
};

export type AuthResult = {
  ok: boolean;
  user?: SessionUser;
  error?: string;
};

export const DEMO_USER: SessionUser = {
  id: 'demo-user',
  email: 'demo@kaiwa.live',
  name: 'Aziz',
};

/** Extract a friendly name from the email local-part (aziz@x.com -> Aziz). */
const nameFromEmail = (email: string) => {
  const local = email.split('@')[0] || 'Do\'st';
  return local.charAt(0).toUpperCase() + local.slice(1);
};

export const toSessionUser = (user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}): SessionUser => {
  const email = user.email ?? '';
  const metaName = user.user_metadata?.full_name ?? user.user_metadata?.name;
  return {
    id: user.id,
    email,
    name: typeof metaName === 'string' && metaName.trim() ? metaName : nameFromEmail(email),
  };
};

/** Map Supabase auth errors to Uzbek messages shown in the UI. */
function humanizeError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Email yoki parol noto\'g\'ri';
  if (m.includes('email not confirmed')) return 'Email tasdiqlanmagan — xatoni tekshiring';
  if (m.includes('already registered')) return 'Bu email allaqachon ro\'yxatdan o\'tgan';
  if (m.includes('password should be at least')) return 'Parol kamida 6 ta belgidan iborat bo\'lsin';
  if (m.includes('unable to validate email')) return 'Email formati noto\'g\'ri';
  if (m.includes('rate limit') || m.includes('too many')) return 'Juda ko\'p urinish — biroz kuting';
  if (m.includes('network') || m.includes('fetch')) return 'Internet aloqasi yo\'q';
  return message;
}

/** Returns the current session user, or null when signed out. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) return toSessionUser(data.session.user);
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) return toSessionUser(userData.user);
  } catch {
    /* offline / no session */
  }
  return null;
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const mail = email.trim().toLowerCase();
  if (!mail || !password) {
    return { ok: false, error: 'Iltimos, email va parolni kiriting' };
  }

  if (!hasRealBackend) {
    // Offline demo mode — no backend credentials configured.
    await delay(600);
    return { ok: true, user: DEMO_USER };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: mail,
      password,
    });
    if (error) return { ok: false, error: humanizeError(error.message) };
    if (!data.user) return { ok: false, error: 'Kirishda kutilmagan xatolik' };
    return { ok: true, user: toSessionUser(data.user) };
  } catch (e) {
    return { ok: false, error: humanizeError(e instanceof Error ? e.message : 'Tarmoq xatosi') };
  }
}

export async function signUp(
  email: string,
  password: string,
  name?: string,
): Promise<AuthResult> {
  const mail = email.trim().toLowerCase();
  if (!mail || !password) {
    return { ok: false, error: 'Iltimos, email va parolni kiriting' };
  }
  if (password.length < 6) {
    return { ok: false, error: 'Parol kamida 6 ta belgidan iborat bo\'lsin' };
  }

  if (!hasRealBackend) {
    await delay(600);
    return { ok: true, user: { ...DEMO_USER, email: mail, name: name || nameFromEmail(mail) } };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: mail,
      password,
      options: { data: { full_name: name || nameFromEmail(mail) } },
    });
    if (error) return { ok: false, error: humanizeError(error.message) };

    // If email confirmation is on there is no session yet.
    if (!data.session) {
      return {
        ok: true,
        user: { id: data.user?.id ?? 'pending', email: mail, name: name || nameFromEmail(mail) },
        error: 'Tasdiqlash xati yuborildi — emailni tasdiqlang',
      };
    }
    if (!data.user) return { ok: false, error: 'Ro\'yxatdan o\'tishda xatolik' };
    return { ok: true, user: toSessionUser(data.user) };
  } catch (e) {
    return { ok: false, error: humanizeError(e instanceof Error ? e.message : 'Tarmoq xatosi') };
  }
}

export async function signOut(): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    /* ignore */
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
