import { activeEvents, type GameEvent, type ShotDot } from "@basket-log/core";

export interface PlacedShot extends ShotDot {
  period: number;
}

/** Field-goal attempts that have a court position (voided plays removed), in the order they happened. */
export function placedShots(events: GameEvent[]): PlacedShot[] {
  const shots: PlacedShot[] = [];
  for (const e of activeEvents(events)) {
    if (e.type !== "shot" || e.x === undefined || e.y === undefined) continue;
    shots.push({
      playerId: e.playerId, side: e.side, made: !!e.made, points: e.points ?? 2, x: e.x, y: e.y,
      ...(e.distanceFt === undefined ? {} : { distanceFt: e.distanceFt }),
      period: e.period,
    });
  }
  return shots;
}

/** Dot colour by side: home reads green, away reads ink (same as the tracker). */
export const sideColor = (side: "home" | "away") => (side === "home" ? "var(--green)" : "var(--ink)");
