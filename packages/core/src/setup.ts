import type { GameRules } from './rules';
import type { Side, TrackingMode } from './types';

export interface RosterPlayerInput {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  number: number;
}

export interface RosterIssue {
  playerId: string;
  field: 'firstName' | 'lastName' | 'displayName' | 'number';
  message: string;
}

/** Jersey numbers must be unique per team; short names may repeat. */
export function validateRoster(players: RosterPlayerInput[]): RosterIssue[] {
  const issues: RosterIssue[] = [];
  const firstWithNumber = new Map<number, RosterPlayerInput>();
  for (const p of players) {
    if (!p.firstName.trim()) issues.push({ playerId: p.id, field: 'firstName', message: 'First name is required' });
    if (!p.lastName.trim()) issues.push({ playerId: p.id, field: 'lastName', message: 'Last name is required' });
    if (!p.displayName.trim()) issues.push({ playerId: p.id, field: 'displayName', message: 'Short name is required' });
    if (!Number.isInteger(p.number) || p.number < 0 || p.number > 99) {
      issues.push({ playerId: p.id, field: 'number', message: 'Number must be between 0 and 99' });
      continue;
    }
    const first = firstWithNumber.get(p.number);
    if (first) {
      issues.push({ playerId: p.id, field: 'number', message: `Number ${p.number} is already used by ${first.displayName}` });
    } else {
      firstWithNumber.set(p.number, p);
    }
  }
  return issues;
}

export interface GameDraft {
  homeTeamId: string | null;
  awayTeamId: string | null;
  rules: GameRules;
  tracking: Record<Side, TrackingMode>;
  /** Player ids available to each side (the roster that will be snapshotted). */
  roster: Record<Side, string[]>;
  starters: Record<Side, string[]>;
}

const label = (side: Side) => (side === 'home' ? 'Home' : 'Away');

/** The Review step's "Fix before starting" list; empty means the game can start. */
export function validateNewGame(draft: GameDraft): string[] {
  const problems: string[] = [];
  const { rules } = draft;
  if (!draft.homeTeamId || !draft.awayTeamId || draft.homeTeamId === draft.awayTeamId) {
    problems.push('Pick two different teams');
  }
  if (rules.playersOnCourt < 3 || rules.playersOnCourt > 5) problems.push('Players on court must be 3 to 5');
  if (rules.periods < 1 || rules.periodMinutes <= 0) problems.push('Periods and period length must be positive');

  for (const side of ['home', 'away'] as const) {
    if (draft.tracking[side] === 'team_only') continue;
    const picked = draft.starters[side];
    if (picked.length !== rules.playersOnCourt) {
      problems.push(`${label(side)} needs ${rules.playersOnCourt} starters (${picked.length} picked)`);
    } else if (new Set(picked).size !== picked.length || picked.some((id) => !draft.roster[side].includes(id))) {
      problems.push(`${label(side)} starters must be distinct players from the roster`);
    }
    if (draft.roster[side].length < rules.playersOnCourt) {
      problems.push(`${label(side)} roster has only ${draft.roster[side].length} players`);
    }
  }
  return problems;
}
