import { describe, expect, it } from 'vitest';
import type { Side } from './index';

describe('core', () => {
  it('compiles and runs', () => {
    const side: Side = 'home';
    expect(side).toBe('home');
  });
});
