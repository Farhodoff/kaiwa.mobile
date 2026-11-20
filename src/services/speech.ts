import { supabase, supabaseAnonKey } from '../lib/supabase';
import { API_BASE } from './coach';

export type SpeechTokenResponse = {
  token: string;
  region: string;
  expiresIn: number;
};

/**
 * Fetch ephemeral Azure Speech token from kaiwa.live backend.
 * Valid for 10 minutes. Used for real-time speech recognition (STT)
 * and pronunciation assessment.
 */
export async function fetchSpeechToken(signal?: AbortSignal): Promise<SpeechTokenResponse> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const isGuest = !token;

  const url = isGuest
    ? `${API_BASE}/api/speech-token?mode=guest`
    : `${API_BASE}/api/speech-token`;

  const bearerToken = token || supabaseAnonKey;

  const res = await fetch(url, {
    method: 'GET',
    signal,
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      apikey: supabaseAnonKey,
    },
  });

  if (!res.ok) {
    throw new Error(`Nutqni tanish xizmatiga ulanib bo‘lmadi (${res.status}). Qayta urinib ko‘ring.`);
  }

  const result = await res.json() as SpeechTokenResponse;
  if (typeof result.token !== 'string' || !result.token || typeof result.region !== 'string' || !/^[a-z0-9-]+$/.test(result.region)) {
    throw new Error('Nutqni tanish xizmati noto‘g‘ri javob qaytardi.');
  }
  return result;
}
