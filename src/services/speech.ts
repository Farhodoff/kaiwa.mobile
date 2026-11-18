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
export async function fetchSpeechToken(): Promise<SpeechTokenResponse> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const isGuest = !token;

  const url = isGuest
    ? `${API_BASE}/api/speech-token?mode=guest`
    : `${API_BASE}/api/speech-token`;

  const bearerToken = token || supabaseAnonKey;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      apikey: supabaseAnonKey,
    },
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Speech token error (${res.status}): ${errorText.slice(0, 100)}`);
  }

  return (await res.json()) as SpeechTokenResponse;
}
