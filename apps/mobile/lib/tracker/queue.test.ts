import { describe, expect, it } from 'vitest';
import { EventQueue, MemoryStorage } from './queue';
import type { EventRow } from './mapping';

const row = (id: string, gameId = 'g1') => ({ id, game_id: gameId }) as unknown as EventRow;

describe('EventQueue', () => {
  it('lists pending rows oldest first and filters by game', async () => {
    let t = 0;
    const q = new EventQueue(new MemoryStorage(), () => ++t);
    await q.enqueue([row('a'), row('b', 'g2'), row('c')]);
    expect((await q.listPending('g1')).map((i) => i.id)).toEqual(['a', 'c']);
    expect(await q.count()).toBe(3);
  });

  it('enqueueSync has written the rows by the time it returns', async () => {
    const q = new EventQueue(new MemoryStorage());
    q.enqueueSync([row('a')]);
    expect(await q.count('g1')).toBe(1);
  });

  it('ignores a row that is queued twice (same id)', async () => {
    const q = new EventQueue(new MemoryStorage());
    await q.enqueue([row('a')]);
    q.enqueueSync([row('a')]);
    expect(await q.count()).toBe(1);
  });

  it('drops rows from pending once synced', async () => {
    const q = new EventQueue(new MemoryStorage());
    await q.enqueue([row('a'), row('b')]);
    await q.markSynced(['a']);
    expect((await q.listPending()).map((i) => i.id)).toEqual(['b']);
  });
});
