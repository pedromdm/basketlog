import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

/** True when the signed-in user may log events for the game: its scorekeeper or its creator (RLS allows both). */
export function useCanScore(gameId: string | undefined): boolean {
  const [can, setCan] = useState(false);
  useEffect(() => {
    if (!gameId) return;
    let alive = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return;
      const [keeper, game] = await Promise.all([
        supabase.from('game_scorekeepers').select('user_id').eq('game_id', gameId).eq('user_id', uid).maybeSingle(),
        supabase.from('games').select('created_by').eq('id', gameId).maybeSingle(),
      ]);
      if (alive) setCan(!!keeper.data || game.data?.created_by === uid);
    })().catch(() => {});
    return () => {
      alive = false;
    };
  }, [gameId]);
  return can;
}
