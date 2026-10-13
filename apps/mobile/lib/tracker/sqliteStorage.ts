import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { MemoryStorage, type QueueStorage, type QueuedEvent } from './queue';

interface Row {
  id: string;
  game_id: string;
  row: string;
  created_at: number;
}

/** Thin expo-sqlite adapter for the outbox. */
class SqliteStorage implements QueueStorage {
  private db: Promise<SQLite.SQLiteDatabase>;

  constructor() {
    this.db = SQLite.openDatabaseAsync('basket-log.db').then(async (db) => {
      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS event_queue (
           id TEXT PRIMARY KEY NOT NULL,
           game_id TEXT NOT NULL,
           row TEXT NOT NULL,
           created_at INTEGER NOT NULL,
           synced INTEGER NOT NULL DEFAULT 0
         );
         CREATE INDEX IF NOT EXISTS event_queue_pending ON event_queue (synced, created_at);`,
      );
      return db;
    });
  }

  async insert(item: QueuedEvent): Promise<void> {
    const db = await this.db;
    await db.runAsync(
      'INSERT OR IGNORE INTO event_queue (id, game_id, row, created_at, synced) VALUES (?, ?, ?, ?, 0)',
      item.id, item.gameId, JSON.stringify(item.row), item.createdAt,
    );
  }

  async pending(gameId?: string): Promise<QueuedEvent[]> {
    const db = await this.db;
    const rows = gameId
      ? await db.getAllAsync<Row>('SELECT id, game_id, row, created_at FROM event_queue WHERE synced = 0 AND game_id = ? ORDER BY created_at, rowid', gameId)
      : await db.getAllAsync<Row>('SELECT id, game_id, row, created_at FROM event_queue WHERE synced = 0 ORDER BY created_at, rowid');
    return rows.map((r) => ({ id: r.id, gameId: r.game_id, row: JSON.parse(r.row), createdAt: r.created_at }));
  }

  async markSynced(ids: string[]): Promise<void> {
    const db = await this.db;
    for (const id of ids) await db.runAsync('UPDATE event_queue SET synced = 1 WHERE id = ?', id);
  }
}

let storage: QueueStorage | null = null;

/** SQLite on devices; memory when expo-sqlite is unavailable (web export / Node). */
export function getQueueStorage(): QueueStorage {
  if (!storage) {
    try {
      storage = Platform.OS === 'web' || typeof window === 'undefined' ? new MemoryStorage() : new SqliteStorage();
    } catch {
      storage = new MemoryStorage();
    }
  }
  return storage;
}
