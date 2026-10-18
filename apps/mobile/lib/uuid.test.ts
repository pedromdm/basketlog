import { describe, expect, it, vi } from 'vitest';
vi.mock('expo-crypto', () => ({}));

import { uuidFromBytes } from './uuid';

describe('uuidFromBytes', () => {
  it('formats a v4 UUID with version and variant bits set', () => {
    const id = uuidFromBytes(new Uint8Array(16).fill(0xff));
    expect(id).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
    expect(uuidFromBytes(new Uint8Array(16))).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
