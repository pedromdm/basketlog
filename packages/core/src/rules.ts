export interface GameRules {
  preset: 'FIBA' | 'NBA' | 'Youth' | 'Custom';
  periods: number;
  periodMinutes: number;
  overtimeMinutes: number;
  playersOnCourt: number;
  foulsToFoulOut: number;
  teamFoulsBeforeBonus: number;
  shotClock: number;
  shotClockResetOffReb: number;
  timeoutMode: 'perHalf' | 'perPeriod' | 'perGame';
  timeouts: { first: number; second?: number; overtime: number };
  askFastBreak: boolean;
  askAssist: boolean;
  /** Ask "was it blocked?" after a miss. Absent in games saved before this rule existed: treated as true. */
  askBlock?: boolean;
  /**
   * A fouled-out player with no eligible substitute: true (FIBA) he leaves and the team plays with fewer players;
   * false (NBA: no team goes below five) he stays in. Absent: true.
   */
  playShortHanded?: boolean;
  /** The game cannot go on if a team has fewer than this many players on court (FIBA: one player left = forfeit). Absent: 2. */
  minPlayersToContinue?: number;
  stopClockOnFoul: boolean;
}

export const FIBA_RULES: GameRules = {
  preset: 'FIBA',
  periods: 4,
  periodMinutes: 10,
  overtimeMinutes: 5,
  playersOnCourt: 5,
  foulsToFoulOut: 5,
  teamFoulsBeforeBonus: 4,
  shotClock: 24,
  shotClockResetOffReb: 14,
  timeoutMode: 'perHalf',
  timeouts: { first: 2, second: 3, overtime: 1 },
  askFastBreak: true,
  askAssist: true,
  askBlock: true,
  playShortHanded: true,
  minPlayersToContinue: 2,
  stopClockOnFoul: true,
};

export const NBA_RULES: GameRules = {
  ...FIBA_RULES,
  preset: 'NBA',
  playShortHanded: false,
  minPlayersToContinue: 5,
  periodMinutes: 12,
  foulsToFoulOut: 6,
  timeoutMode: 'perGame',
  timeouts: { first: 7, overtime: 2 },
};

export const YOUTH_RULES: GameRules = {
  ...FIBA_RULES,
  preset: 'Youth',
  periodMinutes: 8,
  overtimeMinutes: 3,
  timeouts: { first: 2, second: 2, overtime: 1 },
};
