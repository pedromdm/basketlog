import { followTeam, listFollowedTeamIds, unfollowTeam } from '@basket-log/db';
import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../supabase';

export interface FollowedTeams {
  /** Ids of followed teams; null until loaded. */
  followed: ReadonlySet<string> | null;
  isFollowing: (teamId: string) => boolean;
  toggle: (teamId: string) => Promise<void>;
  error: string | null;
}

/** The teams this user gets notifications for (game start, final score, close games). */
export function useFollowedTeams(): FollowedTeams {
  const [followed, setFollowed] = useState<ReadonlySet<string> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listFollowedTeamIds(supabase)
      .then((ids) => !cancelled && setFollowed(new Set(ids)))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = useCallback(
    async (teamId: string) => {
      const was = followed?.has(teamId) ?? false;
      const apply = (on: boolean) =>
        setFollowed((prev) => {
          const next = new Set(prev ?? []);
          if (on) next.add(teamId);
          else next.delete(teamId);
          return next;
        });
      apply(!was); // optimistic
      try {
        if (was) await unfollowTeam(supabase, teamId);
        else await followTeam(supabase, teamId);
        setError(null);
      } catch (e) {
        apply(was);
        setError((e as Error).message);
      }
    },
    [followed],
  );

  const isFollowing = useCallback((teamId: string) => followed?.has(teamId) ?? false, [followed]);
  return { followed, isFollowing, toggle, error };
}
