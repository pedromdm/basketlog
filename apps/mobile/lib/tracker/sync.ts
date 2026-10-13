import type { EventQueue, Uploader } from './queue';
import type { SyncInfo } from './types';
import type { EventRow } from './mapping';
import { supabase } from '../supabase';

const BATCH = 50;
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;

export interface Connectivity {
  isOnline(): Promise<boolean>;
  /** Calls back when connectivity changes; returns an unsubscribe. */
  subscribe(listener: (online: boolean) => void): () => void;
}

/** Idempotent upload: retrying a row the server already has is a no-op. */
export const supabaseUploader: Uploader = {
  async upload(rows: EventRow[]) {
    const { error } = await supabase.from('game_events').upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  },
};

/** Flushes the outbox in order with exponential backoff; reports a SyncInfo for the status pill. */
export class Syncer {
  private info: SyncInfo = { status: 'synced', pending: 0, lastSyncedAt: null };
  private listeners = new Set<(info: SyncInfo) => void>();
  private flushing = false;
  private again = false;
  private failures = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private unsubscribeNet: (() => void) | null = null;
  private stopped = false;

  constructor(
    private readonly queue: EventQueue,
    private readonly uploader: Uploader,
    private readonly net: Connectivity,
    private readonly gameId: string,
    private readonly now: () => number = Date.now,
  ) {}

  start(): void {
    this.unsubscribeNet = this.net.subscribe((online) => {
      if (online) void this.flush();
      else this.set({ status: 'offline' });
    });
    void this.flush();
  }

  stop(): void {
    this.stopped = true;
    this.unsubscribeNet?.();
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }

  getInfo(): SyncInfo {
    return this.info;
  }

  subscribe(listener: (info: SyncInfo) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Call after enqueueing so the pill shows pending events immediately. */
  async refreshPending(): Promise<void> {
    this.set({ pending: await this.queue.count(this.gameId) });
  }

  async flush(): Promise<void> {
    if (this.stopped) return;
    if (this.flushing) {
      this.again = true;
      return;
    }
    this.flushing = true;
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    try {
      do {
        this.again = false;
        await this.flushOnce();
      } while (this.again && !this.stopped);
    } finally {
      this.flushing = false;
    }
  }

  private async flushOnce(): Promise<void> {
    let pending = await this.queue.listPending(this.gameId);
    this.set({ pending: pending.length });
    if (pending.length === 0) {
      this.failures = 0;
      this.set({ status: 'synced' });
      return;
    }
    if (!(await this.net.isOnline())) {
      this.set({ status: 'offline' });
      return;
    }
    this.set({ status: 'syncing' });
    try {
      while (pending.length > 0) {
        const batch = pending.slice(0, BATCH);
        await this.uploader.upload(batch.map((i) => i.row));
        await this.queue.markSynced(batch.map((i) => i.id));
        pending = pending.slice(BATCH);
        this.set({ pending: pending.length });
      }
      this.failures = 0;
      this.set({ status: 'synced', lastSyncedAt: this.now() });
    } catch {
      this.failures += 1;
      this.set({ status: (await this.net.isOnline()) ? 'error' : 'offline', pending: await this.queue.count(this.gameId) });
      this.scheduleRetry();
    }
  }

  private scheduleRetry(): void {
    if (this.stopped) return;
    const delay = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** (this.failures - 1));
    this.retryTimer = setTimeout(() => void this.flush(), delay);
  }

  private set(patch: Partial<SyncInfo>): void {
    this.info = { ...this.info, ...patch };
    for (const l of this.listeners) l(this.info);
  }
}
