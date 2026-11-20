import type { LessonProgressRow } from '../services/content';
import type { ActivityRow, UserProgress } from '../services/progress';

export type ProgressSnapshot = {
  progress: UserProgress;
  lessonProgress: Record<string, LessonProgressRow>;
  reviewedCards: string[];
  activity: ActivityRow[];
};

// Absolute values make a retry safe even when the server committed a request
// whose response was lost. Cross-device conflict resolution needs a server RPC.
export type ProgressWrite =
  | { kind: 'progress'; patch: Partial<UserProgress> }
  | { kind: 'lesson'; row: LessonProgressRow }
  | { kind: 'review'; cardId: string; day: string }
  | { kind: 'activity'; row: ActivityRow };

type Document = {
  version: 1;
  snapshot: ProgressSnapshot;
  pending: Record<string, ProgressWrite>;
};

type Storage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<unknown>;
};

export type SyncState = {
  snapshot: ProgressSnapshot | null;
  syncing: boolean;
  error: string | null;
  storageError: boolean;
};

type Options = {
  userId: string;
  storage: Storage;
  read: () => Promise<ProgressSnapshot>;
  write: (write: ProgressWrite) => Promise<void>;
  onChange: (state: SyncState) => void;
};

/** One account's durable cache and coalescing outbox. No platform dependencies. */
export class ProgressSync {
  private options: Options;
  private document: Document | null = null;
  private disk: Promise<unknown> = Promise.resolve();
  private running: Promise<void> | null = null;
  private revision = 0;
  private stopped = false;
  private error: string | null = null;
  private storageError = false;

  constructor(options: Options) {
    this.options = options;
  }

  private get key() {
    return `kaiwa-progress:v1:${this.options.userId}`;
  }

  get snapshot(): ProgressSnapshot | null {
    return this.document?.snapshot ?? null;
  }

  get needsRetry(): boolean {
    return !!this.error || !this.document || Object.keys(this.document.pending).length > 0;
  }

  private emit(syncing: boolean) {
    if (!this.stopped) {
      this.options.onChange({
        snapshot: this.snapshot, syncing, error: this.error, storageError: this.storageError,
      });
    }
  }

  private persist() {
    const value = JSON.stringify(this.document);
    // Recover the chain after a storage failure, but never send an operation
    // until its current snapshot/outbox has been written successfully.
    this.disk = this.disk.catch(() => undefined).then(() => this.options.storage.setItem(this.key, value));
    return this.disk;
  }

  async start(): Promise<void> {
    await Promise.resolve();
    if (this.stopped) return;
    this.emit(true);
    try {
      const raw = await this.options.storage.getItem(this.key);
      if (this.stopped) return;
      if (raw) {
        const parsed = JSON.parse(raw) as Document;
        if (parsed.version !== 1 || !parsed.snapshot?.progress || !parsed.pending) {
          throw new Error('Invalid progress cache');
        }
        this.document = parsed;
        this.emit(true);
      }
    } catch {
      this.storageError = true;
      this.error = 'Qurilmadagi progressni o‘qib bo‘lmadi. Qayta urinib ko‘ring.';
      this.emit(false);
      return;
    }
    await this.sync();
  }

  /** Update memory synchronously so two taps never read the same old values. */
  update(snapshot: ProgressSnapshot, writes: Record<string, ProgressWrite>): void {
    if (this.stopped || !this.document) return;
    const pending = { ...this.document.pending, ...writes };
    const previous = this.document.pending.progress;
    const next = writes.progress;
    if (previous?.kind === 'progress' && next?.kind === 'progress') {
      pending.progress = { kind: 'progress', patch: { ...previous.patch, ...next.patch } };
    }
    this.document = { version: 1, snapshot, pending };
    this.revision++;
    this.emit(true);
    void this.persist().then(() => this.sync(false)).catch(() => {
      this.storageError = true;
      this.error = 'Progress qurilmaga saqlanmadi. Ilovani yopmasdan qayta urinib ko‘ring.';
      this.emit(false);
    });
  }

  sync(refresh = true): Promise<void> {
    if (this.stopped) return Promise.resolve();
    if (this.running) return this.running;
    this.running = this.performSync(refresh).finally(() => {
      this.running = null;
      // Edits made during the final read still need a writer, even if no more
      // taps arrive. Do not spin automatically on a failed connection.
      if (!this.error && !this.stopped && Object.keys(this.document?.pending ?? {}).length) {
        void this.sync(false);
      }
    });
    return this.running;
  }

  private async performSync(refresh: boolean): Promise<void> {
    this.error = null;
    this.emit(true);
    try {
      if (this.document) {
        await this.persist();
        this.storageError = false;
        while (!this.stopped) {
          const entry = Object.entries(this.document.pending)[0];
          if (!entry) break;
          const [key, write] = entry;
          // An edit may have happened while the previous request was pending.
          await this.disk;
          await this.options.write(write);
          if (this.document.pending[key] === write) {
            const pending: Record<string, ProgressWrite> = { ...this.document.pending };
            delete pending[key];
            this.document = { ...this.document, pending };
          }
          await this.persist();
        }
      }
      if (this.stopped || (!refresh && this.document)) return;
      const revision = this.revision;
      const snapshot = await this.options.read();
      if (this.stopped) return;
      // Never replace edits made while a slow read was in flight.
      if (revision === this.revision) {
        this.document = { version: 1, snapshot, pending: {} };
        await this.persist();
        this.storageError = false;
      }
    } catch {
      // Pending writes stay durable, including requests with ambiguous results.
      // Distinguish disk failures from network/auth failures for honest UI copy.
      try { await this.disk; } catch { this.storageError = true; }
      this.error = this.storageError
        ? 'Progress qurilmaga saqlanmadi. Ilovani yopmasdan qayta urinib ko‘ring.'
        : this.document
          ? 'Server bilan sinxronlab bo‘lmadi. Progress shu qurilmada saqlanmoqda.'
          : 'Progressni yuklab bo‘lmadi. Internetni tekshirib, qayta urinib ko‘ring.';
    } finally {
      this.emit(false);
    }
  }

  stop(): void {
    this.stopped = true;
  }
}
