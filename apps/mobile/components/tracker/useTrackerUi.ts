import { classifyShot, type Derived, type ShotLocation, type Side, type TrackerState } from '@basket-log/core';
import { useCallback, useMemo, useState } from 'react';

import type { TrackerApi, TrackerGame } from '@/lib/tracker/types';

/** A TrackerApi whose data has loaded. */
export type ReadyTracker = TrackerApi & { game: TrackerGame; state: TrackerState; derived: Derived };

export function isReady(t: TrackerApi): t is ReadyTracker {
  return !t.loading && !t.error && !!t.game && !!t.state && !!t.derived;
}

/**
 * View state shared by the tablet and phone layouts: which team and player is selected, the pending court tap,
 * and thin wrappers that turn button presses into reducer actions.
 */
export function useTrackerUi(t: ReadyTracker) {
  const { game, state, derived, dispatch } = t;
  const [side, setSide] = useState<Side>('home');
  const [picked, setPicked] = useState<Record<Side, string | null>>({ home: null, away: null });
  const [pending, setPending] = useState<ShotLocation | null>(null);

  const isFull = (s: Side) => game.tracking[s] === 'full';
  const onCourt = derived.onCourt;
  const busy = !!state.chain;

  /** The selected player for a side; falls back to the first on court (e.g. after a sub). Null on a team-only side. */
  const playerFor = useCallback(
    (s: Side): string | null => {
      if (game.tracking[s] !== 'full') return null;
      const court = onCourt[s];
      const chosen = picked[s];
      return chosen && court.includes(chosen) ? chosen : (court[0] ?? null);
    },
    [game.tracking, onCourt, picked],
  );

  const selectPlayer = useCallback((s: Side, id: string) => setPicked((p) => ({ ...p, [s]: id })), []);
  const playerId = playerFor(side);

  const actions = useMemo(
    () => ({
      shot: (points: 2 | 3, made: boolean) => dispatch({ type: 'shot', side, playerId, points, made }),
      ft: (made: boolean) => dispatch({ type: 'ft', side, playerId, made }),
      quick: (event: 'oreb' | 'dreb' | 'ast' | 'stl' | 'blk') => dispatch({ type: 'quick', event, side, playerId }),
      foul: () => dispatch({ type: 'foul', side, playerId }),
      turnover: () => dispatch({ type: 'turnover', side, playerId }),
      sub: () => {
        if (playerId) dispatch({ type: 'sub', side, outPlayerId: playerId });
      },
      timeout: () => dispatch({ type: 'timeout', side }),
      undo: () => dispatch({ type: 'undo' }),
      done: () => dispatch({ type: 'done' }),
      cancel: () => dispatch({ type: 'cancel' }),
      answer: (optionId: string) => dispatch({ type: 'answer', optionId }),
    }),
    [dispatch, side, playerId],
  );

  /** Team-level actions for a side regardless of the selection (the team-only bar). */
  const teamActions = useCallback(
    (s: Side) => ({
      shot: (points: 2 | 3, made: boolean) => dispatch({ type: 'shot', side: s, playerId: null, points, made }),
      ft: (made: boolean) => dispatch({ type: 'ft', side: s, playerId: null, made }),
      turnover: () => dispatch({ type: 'turnover', side: s, playerId: null }),
      foul: () => dispatch({ type: 'foul', side: s, playerId: null }),
      timeout: () => dispatch({ type: 'timeout', side: s }),
    }),
    [dispatch],
  );

  const tapCourt = useCallback(
    (x: number, y: number) => {
      if (busy) return;
      setPending(classifyShot(x, y));
    },
    [busy],
  );

  /** Logs the pending court tap for a shooter (a team-only side drops the location). */
  const commitPending = useCallback(
    (shooterSide: Side, shooterId: string | null, made: boolean) => {
      if (!pending) return;
      const located = game.tracking[shooterSide] === 'full';
      dispatch({
        type: 'shot',
        side: shooterSide,
        playerId: shooterId,
        points: pending.points,
        made,
        ...(located ? { x: pending.x, y: pending.y, distanceFt: pending.distanceFt } : {}),
      });
      if (shooterId) setPicked((p) => ({ ...p, [shooterSide]: shooterId }));
      setSide(shooterSide);
      setPending(null);
    },
    [pending, game.tracking, dispatch],
  );

  return {
    side,
    setSide,
    isFull,
    playerId,
    playerFor,
    selectPlayer,
    pending,
    setPending,
    tapCourt,
    commitPending,
    busy,
    actions,
    teamActions,
  };
}

export type TrackerUi = ReturnType<typeof useTrackerUi>;
