export type Side = 'home' | 'away';
export type TrackingMode = 'full' | 'team_only';
export type EventType =
  | 'shot'
  | 'fb'
  | 'ft'
  | 'ast'
  | 'reb'
  | 'blk'
  | 'stl'
  | 'tov'
  | 'foul'
  | 'sub'
  | 'timeout'
  | 'period'
  | 'void';

export interface GameEvent {
  id: string;
  gameId: string;
  /** The chained play this event belongs to. */
  groupId: string;
  /** Device-local order; the server assigns its own serverSeq. */
  seq: number;
  /** 1-4, 5+ = overtime. */
  period: number;
  clockMs: number;
  side: Side;
  /** null = team-level event (team-only side, team rebound). */
  playerId: string | null;
  type: EventType;
  // shot / ft
  made?: boolean;
  points?: 1 | 2 | 3;
  x?: number;
  y?: number;
  distanceFt?: number;
  /** On `fb` events: the answer to "was it a fast break?" for the shot in the same group. */
  fastBreak?: boolean;
  // rebound
  offensive?: boolean;
  // sub
  inPlayerId?: string;
  outPlayerId?: string;
  // void
  voidsGroupId?: string;
  createdBy: string;
  createdAt: string;
}
