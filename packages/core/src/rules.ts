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
  stopClockOnFoul: true,
};

export const NBA_RULES: GameRules = {
  ...FIBA_RULES,
  preset: 'NBA',
  periodMinutes: 12,
  foulsToFoulOut: 6,
  timeoutMode: 'perGame',
  timeouts: { first: 7, overtime: 2 },
};
