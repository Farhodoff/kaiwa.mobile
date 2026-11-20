import { fetchSpeechToken, SpeechTokenResponse } from './speech';

/**
 * Token manager for Azure Speech ephemeral tokens.
 * Caches tokens and automatically refreshes them before the 10-minute expiry (at 9 minutes).
 * Safe for concurrent callers via promise deduplication.
 */
class SpeechTokenManager {
  private cached: { token: string; region: string; expiresAt: number } | null = null;
  private pending: Promise<SpeechTokenResponse> | null = null;

  async getValidToken(signal?: AbortSignal): Promise<{ token: string; region: string }> {
    const now = Date.now();
    // Use cached token if valid for more than 60 seconds
    if (this.cached && this.cached.expiresAt - now > 60_000) {
      return { token: this.cached.token, region: this.cached.region };
    }

    if (!this.pending) {
      this.pending = fetchSpeechToken(signal)
        .then((res) => {
          this.cached = {
            token: res.token,
            region: res.region,
            // Cache expires 60 seconds before official expiration
            expiresAt: Date.now() + Math.max(60, res.expiresIn - 60) * 1000,
          };
          return res;
        })
        .finally(() => {
          this.pending = null;
        });
    }

    const res = await this.pending;
    return { token: res.token, region: res.region };
  }

  invalidateToken(): void {
    this.cached = null;
  }
}

export const speechTokenManager = new SpeechTokenManager();
