/** Half court is 500 x 470 units (1 unit = 0.1 ft) with the basket at (250, 52.5). */
export const BASKET = { x: 250, y: 52.5 } as const;
const THREE_POINT_RADIUS = 237.5;
const CORNER_Y = 140;
const CORNER_MIN_X = 30;
const CORNER_MAX_X = 470;

export interface ShotLocation {
  x: number;
  y: number;
  points: 2 | 3;
  distanceFt: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Turns a court tap into coordinates, 2PT/3PT and distance from the basket in whole feet. */
export function classifyShot(x: number, y: number): ShotLocation {
  const distance = Math.hypot(x - BASKET.x, y - BASKET.y);
  const three = y < CORNER_Y ? x < CORNER_MIN_X || x > CORNER_MAX_X : distance > THREE_POINT_RADIUS;
  return { x: round1(x), y: round1(y), points: three ? 3 : 2, distanceFt: Math.round(distance / 10) };
}
