type MicrophoneCapture = { stop: () => Promise<ArrayBuffer>; cancel: () => void };
type SpeechDependencies = {
  openMicrophone: () => Promise<MicrophoneCapture>;
  transcribe: (wav: ArrayBuffer, language: string, signal: AbortSignal) => Promise<string>;
};

export interface STTListener {
  onStart?: () => void;
  onProcessing?: () => void;
  onFinal?: (text: string) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

type Session = {
  listener: STTListener;
  language: string;
  capture?: MicrophoneCapture;
  controller: AbortController;
  timer?: ReturnType<typeof setTimeout>;
  result?: Promise<string | null>;
};


function message(error: unknown): string {
  const name = error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Mikrofon ruxsati berilmadi. Brauzer yoki telefon sozlamalaridan mikrofonni yoqing.';
  }
  if (name === 'NotFoundError') return 'Mikrofon topilmadi. Mikrofonni ulang va qayta urinib ko‘ring.';
  if (name === 'NotReadableError') return 'Mikrofon band. Uni ishlatayotgan boshqa ilovani yoping.';
  return error instanceof Error ? error.message : 'Ovozni tanib bo‘lmadi. Qayta urinib ko‘ring.';
}

export function createSpeechRecognition(dependencies: SpeechDependencies) {
  let active: Session | null = null;

  function cancelSpeechRecognition(): void {
    const session = active;
    active = null;
    if (!session) return;
    clearTimeout(session.timer);
    session.controller.abort();
    session.capture?.cancel();
    session.listener.onEnd?.();
  }

  async function startSpeechRecognition(listener: STTListener, language = 'ja-JP'): Promise<boolean> {
    cancelSpeechRecognition();
    const session: Session = { listener, language, controller: new AbortController() };
    active = session;
    try {
      const capture = await dependencies.openMicrophone();
      if (active !== session) { capture.cancel(); return false; }
      session.capture = capture;
      listener.onStart?.();
      // Keep below Azure's 60-second short-audio limit.
      session.timer = setTimeout(() => { void stopSpeechRecognition(); }, 45_000);
      return true;
    } catch (error) {
      if (active === session) {
        active = null;
        listener.onError?.(message(error));
        listener.onEnd?.();
      }
      return false;
    }
  }

  async function finish(session: Session): Promise<string | null> {
    clearTimeout(session.timer);
    session.listener.onProcessing?.();
    const timeout = setTimeout(() => session.controller.abort(), 25_000);
    try {
      const wav = await session.capture!.stop();
      if (active !== session) return null;
      const text = await dependencies.transcribe(wav, session.language, session.controller.signal);
      if (active !== session) return null;
      session.listener.onFinal?.(text);
      return text;
    } catch (error) {
      if (active === session) {
        session.listener.onError?.(session.controller.signal.aborted
          ? 'Ovozni tanish vaqti tugadi. Internetni tekshirib, qayta urinib ko‘ring.' : message(error));
      }
      return null;
    } finally {
      clearTimeout(timeout);
      if (active === session) { active = null; session.listener.onEnd?.(); }
    }
  }

  function stopSpeechRecognition(): Promise<string | null> {
    const session = active;
    if (!session?.capture) return Promise.resolve(null);
    session.result ??= finish(session);
    return session.result;
  }

  return { startSpeechRecognition, stopSpeechRecognition, cancelSpeechRecognition };
}
