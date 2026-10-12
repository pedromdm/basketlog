import type { GameEvent, Side } from './types';

export interface DeriveSetup {
  teams: Record<Side, { shortName: string }>;
  players: Record<string, { displayName: string }>;
  roster: Record<Side, { starters: string[]; bench: string[] }>;
  /** Period used for team fouls; defaults to the latest period with an event. */
  period?: number;
}

export interface PlayerLine {
  pts: number;
  fgm: number;
  fga: number;
  tpm: number;
  tpa: number;
  ftm: number;
  fta: number;
  oreb: number;
  dreb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  pf: number;
}

export interface ShotDot {
  playerId: string | null;
  side: Side;
  made: boolean;
  points: 1 | 2 | 3;
  x: number;
  y: number;
  distanceFt?: number;
}

export interface Play {
  groupId: string;
  period: number;
  clockMs: number;
  /** The side of the play's first event. */
  side: Side;
  text: string;
  /** Points scored in this play. */
  points: number;
  scoreAfter: Record<Side, number>;
}

export interface Derived {
  score: Record<Side, number>;
  teamFouls: Record<Side, number>;
  onCourt: Record<Side, string[]>;
  players: Record<string, PlayerLine>;
  shots: ShotDot[];
  plays: Play[];
}

/** Events that still count: voided groups and the void events themselves are dropped. */
export function activeEvents(events: GameEvent[]): GameEvent[] {
  const voided = new Set(events.flatMap((e) => (e.type === 'void' && e.voidsGroupId ? [e.voidsGroupId] : [])));
  return events.filter((e) => e.type !== 'void' && !voided.has(e.groupId));
}

/** The players on court for a side after applying every counted substitution. */
export function courtAfter(starters: string[], events: GameEvent[], side: Side): string[] {
  return activeEvents(events).reduce(
    (court, e) =>
      e.type === 'sub' && e.side === side
        ? court.map((id) => (id === e.outPlayerId ? (e.inPlayerId as string) : id))
        : court,
    starters,
  );
}

const emptyLine = (): PlayerLine => ({
  pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, tov: 0, pf: 0,
});

function describeEvent(e: GameEvent, setup: DeriveSetup): string {
  const name = (id: string | null | undefined) => (id == null ? null : (setup.players[id]?.displayName ?? id));
  const team = setup.teams[e.side].shortName;
  const who = name(e.playerId) ?? team;
  switch (e.type) {
    case 'shot': {
      const where = e.distanceFt === undefined ? '' : ` (${e.distanceFt} ft)`;
      return `${who} ${e.made ? 'makes' : 'misses'} ${e.points}PT${where}${e.fastBreak ? ' · fast break' : ''}`;
    }
    case 'ft': return `${who} ${e.made ? 'makes' : 'misses'} free throw`;
    case 'ast': return `Assist: ${who}`;
    case 'blk': return `Blocked by ${who}`;
    case 'reb': return e.playerId === null ? `${team} team rebound` : `${e.offensive ? 'Off.' : 'Def.'} rebound: ${who}`;
    case 'tov': return `${who} turnover`;
    case 'stl': return `Steal: ${who}`;
    case 'foul': return `Foul on ${who}`;
    case 'sub': return `${name(e.inPlayerId)} in for ${name(e.outPlayerId)}`;
    case 'timeout': return `${team} timeout`;
    default: return '';
  }
}

export function derive(events: GameEvent[], setup: DeriveSetup): Derived {
  const live = activeEvents(events);
  const period = setup.period ?? live.reduce((max, e) => Math.max(max, e.period), 1);
  const score: Record<Side, number> = { home: 0, away: 0 };
  const teamFouls: Record<Side, number> = { home: 0, away: 0 };
  const players: Record<string, PlayerLine> = {};
  const shots: ShotDot[] = [];
  const plays: Play[] = [];
  const playByGroup = new Map<string, Play>();

  for (const side of ['home', 'away'] as const) {
    for (const id of [...setup.roster[side].starters, ...setup.roster[side].bench]) players[id] = emptyLine();
  }
  const line = (id: string | null) => (id === null ? null : (players[id] ??= emptyLine()));

  for (const e of live) {
    const p = line(e.playerId);
    switch (e.type) {
      case 'shot':
      case 'ft': {
        const points = e.points ?? 0;
        if (e.made) score[e.side] += points;
        if (p) {
          if (e.type === 'ft') {
            p.fta++;
            if (e.made) { p.ftm++; p.pts += 1; }
          } else {
            p.fga++;
            if (e.made) { p.fgm++; p.pts += points; }
            if (points === 3) { p.tpa++; if (e.made) p.tpm++; }
          }
        }
        if (e.type === 'shot' && e.x !== undefined && e.y !== undefined) {
          shots.push({
            playerId: e.playerId, side: e.side, made: !!e.made, points: e.points ?? 2, x: e.x, y: e.y,
            ...(e.distanceFt === undefined ? {} : { distanceFt: e.distanceFt }),
          });
        }
        break;
      }
      case 'reb': if (p) { if (e.offensive) p.oreb++; else p.dreb++; } break;
      case 'ast': if (p) p.ast++; break;
      case 'stl': if (p) p.stl++; break;
      case 'blk': if (p) p.blk++; break;
      case 'tov': if (p) p.tov++; break;
      case 'foul':
        if (p) p.pf++;
        if (e.period === period) teamFouls[e.side]++;
        break;
    }

    let play = playByGroup.get(e.groupId);
    if (!play) {
      play = { groupId: e.groupId, period: e.period, clockMs: e.clockMs, side: e.side, text: '', points: 0, scoreAfter: { ...score } };
      playByGroup.set(e.groupId, play);
      plays.push(play);
    }
    const text = describeEvent(e, setup);
    play.text = play.text ? `${play.text} → ${text}` : text;
    if ((e.type === 'shot' || e.type === 'ft') && e.made) play.points += e.points ?? 0;
    play.scoreAfter = { ...score };
  }

  return {
    score,
    teamFouls,
    onCourt: {
      home: courtAfter(setup.roster.home.starters, events, 'home'),
      away: courtAfter(setup.roster.away.starters, events, 'away'),
    },
    players,
    shots,
    plays,
  };
}
