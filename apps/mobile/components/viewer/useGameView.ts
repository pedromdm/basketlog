import { loadGameView, type GameView } from '@basket-log/db';
import { useCallback, useEffect, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase';

const THROTTLE_MS = 500;

export interface GameViewState {
  game: GameView | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/** Loads one game for viewing and, while it isn't final, refetches (throttled) on Realtime changes. */
export function useGameView(gameId: string | undefined): GameViewState {
  const [game, setGame] = useState<GameView | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);

  const load = useCallback(async () => {
    if (!gameId) return;
    try {
      const view = await loadGameView(supabase, gameId);
      if (!alive.current) return;
      setGame(view);
      setError(view ? null : 'Game not found');
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : 'Could not load the game');
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    alive.current = true;
    void load();
    return () => {
      alive.current = false;
    };
  }, [load]);

  const status = game?.status;
  useEffect(() => {
    if (!gameId || status === 'final') return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const refetch = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        void load();
      }, THROTTLE_MS);
    };
    const channel = supabase
      .channel(`viewer:${gameId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_events', filter: `game_id=eq.${gameId}` }, refetch)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` }, refetch)
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [gameId, status, load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    if (alive.current) setRefreshing(false);
  }, [load]);

  return { game, loading, refreshing, error, refresh };
}
