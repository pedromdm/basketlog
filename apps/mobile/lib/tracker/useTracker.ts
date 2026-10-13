import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import {
  canStartNextPeriod,
  derive,
  initTracker,
  periodLengthMs,
  reduce,
  type DeriveSetup,
  type GameEvent,
  type Prompt,
  type ReduceEnv,
  type Side,
  type TrackerAction,
  type TrackerState,
} from '@basket-log/core';
import { netInfoConnectivity } from './connectivity';
import { loadEvents, loadGame } from './load';
import { toRow } from './mapping';
import { EventQueue } from './queue';
import { getQueueStorage } from './sqliteStorage';
import { Syncer, supabaseUploader } from './sync';
import type { SyncInfo, TrackerApi, TrackerGame } from './types';
import { supabase } from '../supabase';

const TICK_MS = 100;
const KEEP_AWAKE_TAG = 'basket-log-tracker';
const CLOCK_ACTIONS = new Set<TrackerAction['type']>(['setClock', 'startClock', 'pauseClock', 'setPeriod']);

const queue = new EventQueue(getQueueStorage());

function haptic(events: GameEvent[]): void {
  if (events.length === 0) return;
  const run = events.some((e) => e.type === 'void')
    ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  run.catch(() => {});
}

function lineup(game: TrackerGame, side: Side) {
  const players = Object.values(game.players).filter((p) => p.side === side);
  return { starters: players.filter((p) => p.starter).map((p) => p.id), bench: players.filter((p) => !p.starter).map((p) => p.id) };
}

function buildSetup(game: TrackerGame, period: number): DeriveSetup {
  return {
    teams: { home: { shortName: game.teams.home.abbr }, away: { shortName: game.teams.away.abbr } },
    players: Object.fromEntries(Object.values(game.players).map((p) => [p.id, { displayName: p.displayName }])),
    roster: { home: lineup(game, 'home'), away: lineup(game, 'away') },
    period,
  };
}

const IDLE_SYNC: SyncInfo = { status: 'synced', pending: 0, lastSyncedAt: null };

export function useTracker(gameId: string): TrackerApi {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [game, setGame] = useState<TrackerGame | null>(null);
  const [state, setState] = useState<TrackerState | null>(null);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [sync, setSync] = useState<SyncInfo>(IDLE_SYNC);

  // The reducer state lives in a ref so rapid taps and the clock tick never act on a stale snapshot.
  const stateRef = useRef<TrackerState | null>(null);
  const promptRef = useRef<Prompt | null>(null);
  const envRef = useRef<ReduceEnv | null>(null);
  const syncerRef = useRef<Syncer | null>(null);
  const writeChain = useRef<Promise<void>>(Promise.resolve());
  const tickedAt = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const syncer = new Syncer(queue, supabaseUploader, netInfoConnectivity, gameId);
    syncerRef.current = syncer;
    const unsubscribe = syncer.subscribe(setSync);

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user.id;
        if (!userId) throw new Error('Not signed in');
        const loadedGame = await loadGame(gameId);
        const events = await loadEvents(gameId, queue);
        if (cancelled) return;

        const initial = initTracker({
          gameId,
          rules: loadedGame.rules,
          tracking: loadedGame.tracking,
          roster: { home: lineup(loadedGame, 'home'), away: lineup(loadedGame, 'away') },
          events,
        });
        envRef.current = { newId: () => Crypto.randomUUID(), now: () => new Date().toISOString(), userId };
        stateRef.current = initial;
        promptRef.current = null;
        setGame(loadedGame);
        setState(initial);
        setPrompt(null);
        syncer.start();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe();
      syncer.stop();
      syncerRef.current = null;
    };
  }, [gameId]);

  const dispatch = useCallback((action: TrackerAction) => {
    const current = stateRef.current;
    const env = envRef.current;
    if (!current || !env) return;
    const result = reduce(current, action, env);
    stateRef.current = result.state;
    // Clock actions answer with no prompt even while a play is open, so they must not clear it.
    const nextPrompt =
      result.state.chain === null
        ? null
        : CLOCK_ACTIONS.has(action.type)
          ? promptRef.current
          : (result.nextPrompt ?? promptRef.current);
    promptRef.current = nextPrompt;
    setState(result.state);
    setPrompt(nextPrompt);

    if (result.emittedEvents.length > 0) {
      haptic(result.emittedEvents);
      const rows = result.emittedEvents.map(toRow);
      // Local-first: persist to the outbox (in order) before any network call.
      writeChain.current = writeChain.current
        .then(() => queue.enqueue(rows))
        .then(() => syncerRef.current?.refreshPending())
        .then(() => syncerRef.current?.flush())
        .catch(() => {});
    }
  }, []);

  // Game clock + shot clock tick. Wall-clock deltas keep it accurate if the JS thread stalls.
  const clockRunning = state?.clockRunning ?? false;
  useEffect(() => {
    if (!clockRunning) {
      tickedAt.current = null;
      return;
    }
    tickedAt.current = Date.now();
    const id = setInterval(() => {
      const s = stateRef.current;
      if (!s || !s.clockRunning) return;
      const now = Date.now();
      const elapsed = now - (tickedAt.current ?? now);
      tickedAt.current = now;
      const clockMs = Math.max(0, s.clockMs - elapsed);
      dispatch({ type: 'setClock', clockMs, shotClockMs: Math.max(0, s.shotClockMs - elapsed) });
      if (clockMs === 0) dispatch({ type: 'pauseClock' });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [clockRunning, dispatch]);

  const live = game?.status === 'live';
  useEffect(() => {
    if (!live) return;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    };
  }, [live]);

  const toggleClock = useCallback(() => {
    dispatch({ type: stateRef.current?.clockRunning ? 'pauseClock' : 'startClock' });
  }, [dispatch]);

  const events = useMemo(() => state?.events ?? [], [state?.events]);

  const derived = useMemo(
    () => (game && state ? derive(state.events, buildSetup(game, state.period)) : null),
    [game, state],
  );

  const nextPeriod = useCallback(() => {
    const s = stateRef.current;
    const d = s && game ? derive(s.events, buildSetup(game, s.period)) : null;
    if (!s || !d || !canStartNextPeriod(s.rules, s.period, s.clockMs, d.score)) return;
    const period = s.period + 1;
    dispatch({ type: 'setPeriod', period });
    dispatch({ type: 'setClock', clockMs: periodLengthMs(s.rules, period), shotClockMs: s.rules.shotClock * 1000 });
  }, [dispatch, game]);

  const finishGame = useCallback(async () => {
    await writeChain.current;
    await syncerRef.current?.flush();
    if ((await queue.count(gameId)) > 0) throw new Error('Events are still syncing; try again when online');
    const { error: err } = await supabase.from('games').update({ status: 'final' }).eq('id', gameId);
    if (err) throw new Error(err.message);
    dispatch({ type: 'pauseClock' });
    setGame((g) => (g ? { ...g, status: 'final' } : g));
  }, [dispatch, gameId]);

  return { loading, error, game, state, derived, prompt, sync, dispatch, toggleClock, nextPeriod, finishGame, events };
}
