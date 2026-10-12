import { initTracker, reduce, type ReduceEnv, type TrackerAction, type TrackerState } from './chain';
import { FIBA_RULES, type GameRules } from './rules';
import type { Side, TrackingMode } from './types';

export const ROSTER = {
  home: { starters: ['h1', 'h2', 'h3', 'h4', 'h5'], bench: ['h6', 'h7'] },
  away: { starters: ['a1', 'a2', 'a3', 'a4', 'a5'], bench: ['a6'] },
};

function makeEnv(): ReduceEnv {
  let n = 0;
  return { newId: () => `id${++n}`, now: () => '2026-01-01T00:00:00.000Z', userId: 'scorekeeper' };
}

export function setup(opts: { rules?: Partial<GameRules>; tracking?: Partial<Record<Side, TrackingMode>> } = {}) {
  const env = makeEnv();
  let state: TrackerState = initTracker({
    gameId: 'g1',
    rules: { ...FIBA_RULES, ...opts.rules },
    tracking: { home: 'full', away: 'full', ...opts.tracking },
    roster: ROSTER,
  });
  const send = (action: TrackerAction) => {
    const result = reduce(state, action, env);
    state = result.state;
    return result;
  };
  return { send, get state() { return state; } };
}

