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
  // Opened synchronously so insertSync can write before the caller returns.
  private db: SQLite.SQLiteDatabase;

  constructor() {
    this.db = SQLite.openDatabaseSync('basket-log.db');
    this.db.execSync(
      `CREATE TABLE IF NOT EXISTS event_queue (
         id TEXT PRIMARY KEY NOT NULL,
         game_id TEXT NOT NULL,
         row TEXT NOT NULL,
         created_at INTEGER NOT NULL,
         synced INTEGER NOT NULL DEFAULT 0
       );
       CREATE INDEX IF NOT EXISTS event_queue_pending ON event_queue (synced, created_at);`,
    );
  }

  async insert(item: QueuedEvent): Promise<void> {
    this.insertSync(item);
  }

  insertSync(item: QueuedEvent): void {
    this.db.runSync(
      'INSERT OR IGNORE INTO event_queue (id, game_id, row, created_at, synced) VALUES (?, ?, ?, ?, 0)',
      item.id, item.gameId, JSON.stringify(item.row), item.createdAt,
    );
  }

  async pending(gameId?: string): Promise<QueuedEvent[]> {
    const rows = gameId
      ? await this.db.getAllAsync<Row>('SELECT id, game_id, row, created_at FROM event_queue WHERE synced = 0 AND game_id = ? ORDER BY created_at, rowid', gameId)
      : await this.db.getAllAsync<Row>('SELECT id, game_id, row, created_at FROM event_queue WHERE synced = 0 ORDER BY created_at, rowid');
    return rows.map((r) => ({ id: r.id, gameId: r.game_id, row: JSON.parse(r.row), createdAt: r.created_at }));
  }

  async markSynced(ids: string[]): Promise<void> {
    for (const id of ids) await this.db.runAsync('UPDATE event_queue SET synced = 1 WHERE id = ?', id);
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
