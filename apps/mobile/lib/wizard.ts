import { FIBA_RULES, validateNewGame, type GameDraft, type GameRules, type Side, type TrackingMode } from '@basket-log/core';
import type { CompetitionTree, NewGameInput, TeamWithPlayers } from '@basket-log/db';

export const STEPS = [
  { id: 'matchup', title: 'Matchup', hint: 'Teams, venue, date' },
  { id: 'rules', title: 'Rules', hint: 'Periods, clock, timeouts' },
  { id: 'lineups', title: 'Lineups', hint: 'Starting players' },
  { id: 'review', title: 'Review', hint: 'Check and start' },
] as const;

export interface WizardState {
  step: number;
  teamIds: Record<Side, string | null>;
  competition: string;
  /** Set when the game belongs to a competition created on the website (the `competition` text is then its name). */
  competitionId: string | null;
  roundId: string | null;
  venue: string;
  /** YYYY-MM-DD, optional. */
  date: string;
  /** HH:mm (24 h), optional; without it a dated game starts at 12:00. */
  time: string;
  rules: GameRules;
  tracking: Record<Side, TrackingMode>;
  starters: Record<Side, string[]>;
}

export const initialWizard = (rules: GameRules = FIBA_RULES): WizardState => ({
  step: 0,
  teamIds: { home: null, away: null },
  competition: '',
  competitionId: null,
  roundId: null,
  venue: '',
  date: '',
  time: '',
  rules,
  tracking: { home: 'full', away: 'full' },
  starters: { home: [], away: [] },
});

const other = (side: Side): Side => (side === 'home' ? 'away' : 'home');

export function goToStep(state: WizardState, step: number): WizardState {
  return { ...state, step: Math.max(0, Math.min(STEPS.length - 1, step)) };
}

/** Picking a team clears that side's starters; the same team cannot be on both sides. */
export function selectTeam(state: WizardState, side: Side, teamId: string): WizardState {
  const teamIds = { ...state.teamIds, [side]: teamId };
  const starters = { ...state.starters, [side]: [] as string[] };
  if (teamIds[other(side)] === teamId) {
    teamIds[other(side)] = null;
    starters[other(side)] = [];
  }
  return { ...state, teamIds, starters };
}

export function applyPreset(state: WizardState, preset: { name: string; rules: GameRules } | 'Custom'): WizardState {
  if (preset === 'Custom') return { ...state, rules: { ...state.rules, preset: 'Custom' } };
  return trimStarters({ ...state, rules: { ...preset.rules, preset: preset.name as GameRules['preset'] } });
}

/** Changing any rule value turns the preset into Custom. */
export function setRule(state: WizardState, patch: Partial<Omit<GameRules, 'preset' | 'timeouts'>>): WizardState {
  return trimStarters({ ...state, rules: { ...state.rules, ...patch, preset: 'Custom' } });
}

export function setTimeouts(state: WizardState, patch: Partial<GameRules['timeouts']>): WizardState {
  return { ...state, rules: { ...state.rules, timeouts: { ...state.rules.timeouts, ...patch }, preset: 'Custom' } };
}

export function setTracking(state: WizardState, side: Side, mode: TrackingMode): WizardState {
  return { ...state, tracking: { ...state.tracking, [side]: mode } };
}

/** Tapping selects a starter (up to playersOnCourt) or deselects one. */
export function toggleStarter(state: WizardState, side: Side, playerId: string): WizardState {
  const current = state.starters[side];
  if (current.includes(playerId)) {
    return { ...state, starters: { ...state.starters, [side]: current.filter((id) => id !== playerId) } };
  }
  if (current.length >= state.rules.playersOnCourt) return state;
  return { ...state, starters: { ...state.starters, [side]: [...current, playerId] } };
}

function trimStarters(state: WizardState): WizardState {
  const n = state.rules.playersOnCourt;
  return { ...state, starters: { home: state.starters.home.slice(0, n), away: state.starters.away.slice(0, n) } };
}

export const teamOf = (teams: TeamWithPlayers[], id: string | null) => teams.find((t) => t.id === id);

export function toDraft(state: WizardState, teams: TeamWithPlayers[]): GameDraft {
  const rosterOf = (side: Side) => teamOf(teams, state.teamIds[side])?.players.map((p) => p.id) ?? [];
  return {
    homeTeamId: state.teamIds.home,
    awayTeamId: state.teamIds.away,
    rules: state.rules,
    tracking: state.tracking,
    roster: { home: rosterOf('home'), away: rosterOf('away') },
    starters: state.starters,
  };
}

/** The "Fix before starting" list. */
export const problems = (state: WizardState, teams: TeamWithPlayers[]) => validateNewGame(toDraft(state, teams));

/** ISO start time from a YYYY-MM-DD date and an optional HH:mm time (device time zone); undefined without a valid date. */
export function startsAtOf(date: string, time: string): string | undefined {
  const d = date.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return undefined;
  const t = /^\d{2}:\d{2}$/.test(time.trim()) ? time.trim() : '12:00';
  const at = new Date(`${d}T${t}:00`);
  return Number.isNaN(at.getTime()) ? undefined : at.toISOString();
}

/** Competitions the home team is enrolled in (the only ones a game of that team can belong to). */
export function competitionsFor(competitions: CompetitionTree[], teamId: string | null): CompetitionTree[] {
  return teamId ? competitions.filter((c) => c.teamIds.includes(teamId)) : [];
}

/** The group the home team plays in for the chosen round, if the website assigned one. */
export function groupFor(competitions: CompetitionTree[], roundId: string | null, teamId: string | null): string | undefined {
  if (!roundId || !teamId) return undefined;
  return competitions.flatMap((c) => c.assignments).find((a) => a.round_id === roundId && a.team_id === teamId)?.group_id;
}

export function toNewGameInput(state: WizardState, groupId?: string): NewGameInput {
  const date = state.date.trim();
  return {
    homeTeamId: state.teamIds.home as string,
    awayTeamId: state.teamIds.away as string,
    rules: state.rules,
    tracking: state.tracking,
    starters: state.starters,
    ...(state.competition.trim() ? { competition: state.competition.trim() } : {}),
    ...(state.competitionId ? { competitionId: state.competitionId } : {}),
    ...(state.competitionId && state.roundId ? { roundId: state.roundId } : {}),
    ...(state.competitionId && groupId ? { groupId } : {}),
    ...(state.venue.trim() ? { venue: state.venue.trim() } : {}),
    ...(startsAtOf(date, state.time) ? { startsAt: startsAtOf(date, state.time) as string } : {}),
  };
}

/** Gate for the Next button: Matchup needs two teams, Lineups need complete starters. */
export function canAdvance(state: WizardState, teams: TeamWithPlayers[]): boolean {
  if (state.step === 0) return !!state.teamIds.home && !!state.teamIds.away;
  if (state.step === 2) return problems(state, teams).every((p) => !p.includes('starters'));
  return true;
}

export function rulesSummary(r: GameRules): string[] {
  const periodWord = r.periods === 2 ? 'halves' : 'periods';
  const second = r.timeouts.second !== undefined ? ` + ${r.timeouts.second}` : '';
  const timeouts =
    r.timeoutMode === 'perGame'
      ? `${r.timeouts.first} timeouts per game`
      : `${r.timeouts.first}${second} timeouts ${r.timeoutMode === 'perHalf' ? 'per half' : 'per period'}`;
  const asks = [r.askFastBreak && 'fast break', r.askAssist && 'assist', r.askBlock !== false && 'block'].filter(Boolean).join(', ');
  return [
    `${r.periods} ${periodWord} x ${r.periodMinutes} min, overtime ${r.overtimeMinutes} min`,
    `${r.playersOnCourt} players on court, foul out at ${r.foulsToFoulOut}, bonus after ${r.teamFoulsBeforeBonus} team fouls`,
    `Shot clock ${r.shotClock}/${r.shotClockResetOffReb}, ${timeouts}`,
    `Asks: ${asks || 'no follow-up questions'}${r.stopClockOnFoul ? '; fouls stop the clock' : ''}`,
    `The game cannot go on if a team has fewer than ${r.minPlayersToContinue ?? 2} players on court`,
    r.playShortHanded === false ? 'Fouled out with no substitute: stays in (no team below five)' : 'Fouled out with no substitute: leaves, team plays short',
  ];
}
