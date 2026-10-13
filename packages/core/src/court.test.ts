import { describe, expect, it } from 'vitest';
import { classifyShot } from './court';

describe('classifyShot', () => {
  it('calls a tap beyond the arc a 3 and reports the distance in whole feet', () => {
    // (250, 300) is 247.5 units from the basket (250, 52.5) -> 24.75 ft -> 25
    expect(classifyShot(250, 300)).toEqual({ x: 250, y: 300, points: 3, distanceFt: 25 });
  });

  it('calls a tap inside the arc a 2', () => {
    expect(classifyShot(250, 200)).toEqual({ x: 250, y: 200, points: 2, distanceFt: 15 });
  });

  it('treats the corner strip (x < 30 or x > 470 below y = 140) as 3, and just inside it as 2', () => {
    expect(classifyShot(10, 100)).toMatchObject({ points: 3 });
    expect(classifyShot(490, 100)).toMatchObject({ points: 3 });
    expect(classifyShot(40, 100)).toMatchObject({ points: 2 });
  });

  it('rounds coordinates to one decimal', () => {
    expect(classifyShot(250.04, 99.96)).toMatchObject({ x: 250, y: 100 });
  });
});
