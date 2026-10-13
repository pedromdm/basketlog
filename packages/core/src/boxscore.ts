import type { PlayerLine, ShotDot } from './derive';

export interface TeamTotals extends PlayerLine {
  reb: number;
}

export function teamTotals(lines: PlayerLine[]): TeamTotals {
  const totals: TeamTotals = {
    pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, tov: 0, pf: 0, reb: 0,
  };
  for (const l of lines) {
    for (const key of Object.keys(l) as (keyof PlayerLine)[]) totals[key] += l[key];
    totals.reb += l.oreb + l.dreb;
  }
  return totals;
}

/** One-decimal percentage, or null when nothing was attempted. */
export function percentage(made: number, attempts: number): number | null {
  return attempts === 0 ? null : Math.round((made / attempts) * 1000) / 10;
}

export interface Leader {
  playerId: string;
  value: number;
}

export interface TeamLeaders {
  pts: Leader | null;
  reb: Leader | null;
  ast: Leader | null;
}

/** Best player per category; the first player (by insertion order) wins ties. */
export function teamLeaders(players: Record<string, PlayerLine>): TeamLeaders {
  const best = (value: (l: PlayerLine) => number): Leader | null => {
    let leader: Leader | null = null;
    for (const [playerId, l] of Object.entries(players)) {
      const v = value(l);
      if (!leader || v > leader.value) leader = { playerId, value: v };
    }
    return leader;
  };
  return { pts: best((l) => l.pts), reb: best((l) => l.oreb + l.dreb), ast: best((l) => l.ast) };
}

export interface ZoneLine {
  made: number;
  attempts: number;
}

export interface ShotZones {
  paint: ZoneLine;
  midRange: ZoneLine;
  corner3: ZoneLine;
  aboveBreak3: ZoneLine;
}

// Same geometry as the court (see classifyShot): the key is x 170-330 and y 0-190; corners are x < 30 or x > 470 below y = 140.
const PAINT = { minX: 170, maxX: 330, maxY: 190 };

export function shotZones(shots: ShotDot[]): ShotZones {
  const zones: ShotZones = {
    paint: { made: 0, attempts: 0 },
    midRange: { made: 0, attempts: 0 },
    corner3: { made: 0, attempts: 0 },
    aboveBreak3: { made: 0, attempts: 0 },
  };
  for (const s of shots) {
    if (s.points === 1) continue;
    const inPaint = s.x >= PAINT.minX && s.x <= PAINT.maxX && s.y <= PAINT.maxY;
    const zone =
      s.points === 3 ? (s.y < 140 && (s.x < 30 || s.x > 470) ? zones.corner3 : zones.aboveBreak3) : inPaint ? zones.paint : zones.midRange;
    zone.attempts++;
    if (s.made) zone.made++;
  }
  return zones;
}
