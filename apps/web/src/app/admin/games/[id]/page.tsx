import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { listScorekeepers } from "@basket-log/db";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "../../errors";
import { AdminGameForm } from "./admin-game-form";

export const metadata = { title: "Manage game · Basket Log" };

async function GameAdmin({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: game } = await supabase.from("games").select("*").eq("id", id).maybeSingle();
  if (!game) notFound();
  const { data: teams } = await supabase.from("teams").select("id, name").in("id", [game.home_team_id, game.away_team_id]);
  const name = (teamId: string) => teams?.find((t) => t.id === teamId)?.name ?? "?";

  let scorekeepers: { user_id: string; email: string }[] = [];
  let scorekeeperError: string | null = null;
  try {
    scorekeepers = await listScorekeepers(supabase, id);
  } catch (e) {
    scorekeeperError = friendlyError(e);
  }

  return (
    <>
      <h1 className="font-display text-[44px] leading-none font-extrabold italic uppercase">
        {name(game.home_team_id)} vs {name(game.away_team_id)}
      </h1>
      <p className="mt-2 mb-6 text-sm text-muted">
        <Link href={`/games/${game.id}`} className="underline">View public page</Link>
      </p>
      <AdminGameForm
        game={{
          id: game.id,
          competition: game.competition ?? "",
          venue: game.venue ?? "",
          startsAt: game.starts_at,
          isPublic: game.is_public,
          status: game.status,
        }}
        scorekeepers={scorekeepers}
        scorekeeperError={scorekeeperError}
      />
    </>
  );
}

export default function AdminGamePage({ params }: PageProps<"/admin/games/[id]">) {
  return (
    <main className="mx-auto w-full max-w-[860px] flex-1 p-8">
      <Link href="/admin" className="mb-4 inline-block text-sm font-semibold text-green">← All games</Link>
      <Suspense fallback={<p className="text-muted">Loading game…</p>}>
        <GameAdmin params={params} />
      </Suspense>
    </main>
  );
}
