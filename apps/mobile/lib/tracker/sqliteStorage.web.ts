import { MemoryStorage, type QueueStorage } from './queue';

// Web has no durable SQLite here (expo-sqlite needs a wasm asset), so the outbox lives in memory.
let storage: QueueStorage | null = null;

export function getQueueStorage(): QueueStorage {
  storage ??= new MemoryStorage();
  return storage;
}
