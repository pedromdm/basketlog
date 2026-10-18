import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../supabase', () => ({ supabase: {} }));

import { EventQueue, MemoryStorage, type Uploader } from './queue';
import type { EventRow } from './mapping';
import { Syncer, type Connectivity } from './sync';

const row = (id: string) => ({ id, game_id: 'g1' }) as unknown as EventRow;
const online = (value = true): Connectivity & { set(v: boolean): void } => {
  let listener: ((v: boolean) => void) | null = null;
  let current = value;
  return {
    isOnline: async () => current,
    subscribe: (l) => { listener = l; return () => { listener = null; }; },
    set: (v) => { current = v; listener?.(v); },
  };
};

afterEach(() => vi.useRealTimers());

describe('Syncer', () => {
  it('uploads pending rows in order and reports synced', async () => {
    const q = new EventQueue(new MemoryStorage());
    await q.enqueue([row('a'), row('b')]);
    const uploaded: string[][] = [];
    const uploader: Uploader = { upload: async (rows) => { uploaded.push(rows.map((r) => r.id as string)); } };
    const s = new Syncer(q, uploader, online(), 'g1');
    await s.flush();
    expect(uploaded).toEqual([['a', 'b']]);
    expect(s.getInfo()).toMatchObject({ status: 'synced', pending: 0 });
    expect(await q.count()).toBe(0);
  });

  it('stays pending and offline without uploading when there is no connection', async () => {
    const q = new EventQueue(new MemoryStorage());
    await q.enqueue([row('a')]);
    const upload = vi.fn();
    const s = new Syncer(q, { upload }, online(false), 'g1');
    await s.flush();
    expect(upload).not.toHaveBeenCalled();
    expect(s.getInfo()).toMatchObject({ status: 'offline', pending: 1 });
  });

  it('keeps rows after a failed upload and retries with backoff', async () => {
    vi.useFakeTimers();
    const q = new EventQueue(new MemoryStorage());
    await q.enqueue([row('a')]);
    const upload = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue(undefined);
    const s = new Syncer(q, { upload }, online(), 'g1');
    await s.flush();
    expect(s.getInfo()).toMatchObject({ status: 'error', pending: 1 });
    await vi.advanceTimersByTimeAsync(1_000);
    expect(upload).toHaveBeenCalledTimes(2);
    expect(s.getInfo()).toMatchObject({ status: 'synced', pending: 0 });
    s.stop();
  });

  it('flushes when the connection comes back', async () => {
    const q = new EventQueue(new MemoryStorage());
    await q.enqueue([row('a')]);
    const net = online(false);
    const upload = vi.fn().mockResolvedValue(undefined);
    const s = new Syncer(q, { upload }, net, 'g1');
    s.start();
    await vi.waitFor(() => expect(s.getInfo().status).toBe('offline'));
    net.set(true);
    await vi.waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
    s.stop();
  });
});
