import type { EventRow } from './mapping';

export interface QueuedEvent {
  id: string;
  gameId: string;
  row: EventRow;
  createdAt: number;
}

/** Persistence for the outbox. SQLite on devices, memory on web. */
export interface QueueStorage {
  insert(item: QueuedEvent): Promise<void>;
  /** Unsynced items, oldest first. */
  pending(gameId?: string): Promise<QueuedEvent[]>;
  markSynced(ids: string[]): Promise<void>;
}

/** Sends rows to the server. Must be idempotent on row id (upsert, ignore duplicates). */
export interface Uploader {
  upload(rows: EventRow[]): Promise<void>;
}

export class EventQueue {
  constructor(
    private readonly storage: QueueStorage,
    private readonly now: () => number = Date.now,
  ) {}

  async enqueue(rows: EventRow[]): Promise<void> {
    for (const row of rows) {
      await this.storage.insert({ id: row.id as string, gameId: row.game_id, row, createdAt: this.now() });
    }
  }

  listPending(gameId?: string): Promise<QueuedEvent[]> {
    return this.storage.pending(gameId);
  }

  markSynced(ids: string[]): Promise<void> {
    return this.storage.markSynced(ids);
  }

  async count(gameId?: string): Promise<number> {
    return (await this.storage.pending(gameId)).length;
  }
}

export class MemoryStorage implements QueueStorage {
  private items = new Map<string, QueuedEvent & { synced: boolean }>();

  async insert(item: QueuedEvent): Promise<void> {
    if (!this.items.has(item.id)) this.items.set(item.id, { ...item, synced: false });
  }

  async pending(gameId?: string): Promise<QueuedEvent[]> {
    return [...this.items.values()]
      .filter((i) => !i.synced && (gameId === undefined || i.gameId === gameId))
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  async markSynced(ids: string[]): Promise<void> {
    for (const id of ids) {
      const item = this.items.get(id);
      if (item) item.synced = true;
    }
  }
}
