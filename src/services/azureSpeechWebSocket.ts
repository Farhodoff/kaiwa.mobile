import { speechTokenManager } from './speechTokenManager';

export interface AzureSpeechListeners {
  onStart?: () => void;
  onHypothesis?: (text: string) => void;
  onFinalPhrase?: (text: string) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
}

function generateUuid(): string {
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getIsoTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Azure Speech-to-Text WebSocket Client.
 * Connects directly to Azure Cognitive Services WebSocket endpoint for low-latency streaming STT.
 */
export class AzureSpeechWebSocketClient {
  private ws: WebSocket | null = null;
  private requestId = generateUuid();
  private connectionId = generateUuid();
  private isConnected = false;
  private listeners: AzureSpeechListeners = {};
  private language: string;

  constructor(language = 'ja-JP') {
    this.language = language;
  }

  async connect(listeners: AzureSpeechListeners, signal?: AbortSignal): Promise<void> {
    this.listeners = listeners;
    this.requestId = generateUuid();
    this.connectionId = generateUuid();

    const { token, region } = await speechTokenManager.getValidToken(signal);

    const wsUrl = `wss://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${encodeURIComponent(
      this.language,
    )}&format=detailed&X-ConnectionId=${this.connectionId}&authorization=Bearer%20${encodeURIComponent(token)}`;

    return new Promise((resolve, reject) => {
      let isSettled = false;
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      const timeout = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          ws.close();
          reject(new Error('Azure Speech WebSocket ulanish vaqti tugadi.'));
        }
      }, 10_000);

      ws.onopen = () => {
        if (isSettled) return;
        isSettled = true;
        clearTimeout(timeout);
        this.isConnected = true;
        this.sendSpeechConfig();
        this.listeners.onStart?.();
        resolve();
      };

      ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          this.handleTextMessage(event.data);
        }
      };

      ws.onerror = (e) => {
        const errorMsg = 'Azure Speech WebSocket xatoligi yuz berdi.';
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timeout);
          reject(new Error(errorMsg));
        } else {
          this.listeners.onError?.(errorMsg);
        }
      };

      ws.onclose = () => {
        this.isConnected = false;
        this.ws = null;
        this.listeners.onClose?.();
      };
    });
  }

  private sendSpeechConfig(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const payload = JSON.stringify({
      context: {
        system: { version: '1.0.0' },
        os: { platform: 'ReactNative' },
        device: { manufacturer: 'Mobile', model: 'Expo' },
      },
    });

    const msg = [
      `path: speech.config`,
      `x-requestid: ${this.requestId}`,
      `x-timestamp: ${getIsoTimestamp()}`,
      `content-type: application/json; charset=utf-8`,
      '',
      payload,
    ].join('\r\n');

    this.ws.send(msg);
  }

  /**
   * Send binary PCM audio chunk (16kHz 16-bit mono little-endian).
   */
  sendAudioChunk(pcmData: Int16Array | ArrayBuffer): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const header = [
      `path: audio`,
      `x-requestid: ${this.requestId}`,
      `x-timestamp: ${getIsoTimestamp()}`,
      `content-type: audio/x-wav`,
      '',
      '',
    ].join('\r\n');

    const headerBytes = new Uint8Array(header.length);
    for (let i = 0; i < header.length; i++) {
      headerBytes[i] = header.charCodeAt(i);
    }

    const audioBytes = pcmData instanceof ArrayBuffer ? new Uint8Array(pcmData) : new Uint8Array(pcmData.buffer, pcmData.byteOffset, pcmData.byteLength);

    // Azure binary audio packet: 2 bytes header length (Big Endian) + header + audio payload
    const totalLength = 2 + headerBytes.length + audioBytes.length;
    const packet = new Uint8Array(totalLength);
    const view = new DataView(packet.buffer);
    view.setUint16(0, headerBytes.length, false); // Big Endian
    packet.set(headerBytes, 2);
    packet.set(audioBytes, 2 + headerBytes.length);

    this.ws.send(packet.buffer);
  }

  /**
   * Parse Azure Speech server text messages.
   */
  private handleTextMessage(message: string): void {
    const parts = message.split('\r\n\r\n');
    if (parts.length < 2) return;

    const headers = parts[0];
    const body = parts.slice(1).join('\r\n\r\n');

    const pathMatch = /path:\s*([^\r\n]+)/i.exec(headers);
    if (!pathMatch) return;
    const path = pathMatch[1].trim().toLowerCase();

    try {
      const data = body ? JSON.parse(body) : null;

      if (path === 'speech.hypothesis' && data?.Text) {
        this.listeners.onHypothesis?.(data.Text);
      } else if (path === 'speech.phrase' && data) {
        if (data.RecognitionStatus === 'Success' && data.DisplayText) {
          this.listeners.onFinalPhrase?.(data.DisplayText.trim());
        }
      }
    } catch {
      // Ignore non-json control packets
    }
  }

  close(): void {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore close error
      }
      this.ws = null;
    }
    this.isConnected = false;
  }
}
