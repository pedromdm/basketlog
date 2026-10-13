"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/browser";

/** Re-renders the server components when a live game gets new events (Supabase Realtime), at most every 500 ms. */
export function LiveRefresh({ gameId }: { gameId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        router.refresh();
      }, 500);
    };
    const channel = supabase
      .channel(`game:${gameId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "game_events", filter: `game_id=eq.${gameId}` }, refresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` }, refresh)
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [gameId, router]);

  return null;
}
