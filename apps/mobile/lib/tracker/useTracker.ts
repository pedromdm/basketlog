import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { newId } from '../uuid';
import { supabase } from '../supabase';

const TICK_MS = 100;
const KEEP_AWAKE_TAG = 'basket-log-tracker';
const CLOCK_ACTIONS = new Set<TrackerAction['type']>(['setClock', 'startClock', 'pauseClock', 'setPeriod', 'syncEvents']);
const REMOTE_THROTTLE_MS = 400;

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
        envRef.current = { newId, now: () => new Date().toISOString(), userId };
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
      // Local-first: the outbox write is synchronous, so the event is on disk before this tap returns.
      queue.enqueueSync(rows);
      writeChain.current = writeChain.current
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

  // Another device may be scoring the same game: when it saves events, fetch the server's list and merge it in.
  const loaded = !!game;
  useEffect(() => {
    if (!loaded) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const pull = () => {
      if (timer) return;
      timer = setTimeout(async () => {
        timer = null;
        try {
          dispatch({ type: 'syncEvents', events: await loadEvents(gameId, queue) });
        } catch {
          // offline: the next change or reconnect pulls again
        }
      }, REMOTE_THROTTLE_MS);
    };
    const channel = supabase
      .channel(`tracker:${gameId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_events', filter: `game_id=eq.${gameId}` }, (payload) => {
        const id = (payload.new as { id?: string }).id;
        // our own events echo back through here; only pull for ones we don't have
        if (!id || !stateRef.current?.events.some((e) => e.id === id)) pull();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` }, (payload) => {
        const status = (payload.new as { status?: TrackerGame['status'] }).status;
        if (status) setGame((g) => (g ? { ...g, status } : g));
      })
      .subscribe((status) => {
        // after a dropped connection, catch up on what was missed
        if (status === 'SUBSCRIBED') pull();
      });
    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [loaded, gameId, dispatch]);

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

  // finishGame can be requested offline: the game is final locally right away and games.status
  // follows once every event has reached the server (events can't be inserted into a final game).
  const finishRequested = useRef(false);
  const markFinalOnServer = useCallback(async () => {
    const { error: err } = await supabase.from('games').update({ status: 'final' }).eq('id', gameId);
    if (err) throw new Error(err.message);
    finishRequested.current = false;
  }, [gameId]);

  const finishGame = useCallback(async () => {
    await writeChain.current;
    await syncerRef.current?.flush();
    dispatch({ type: 'pauseClock' });
    if ((await queue.count(gameId)) > 0) {
      finishRequested.current = true;
    } else {
      await markFinalOnServer();
    }
    setGame((g) => (g ? { ...g, status: 'final' } : g));
  }, [dispatch, gameId, markFinalOnServer]);

  useEffect(() => {
    if (finishRequested.current && sync.status === 'synced' && sync.pending === 0) {
      markFinalOnServer().catch(() => {});
    }
  }, [sync, markFinalOnServer]);

  return { loading, error, game, state, derived, prompt, sync, dispatch, toggleClock, nextPeriod, finishGame, events };
}
