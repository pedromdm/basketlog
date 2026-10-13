import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Admin · Basket Log" };

const STATUS_STYLE = {
  live: "bg-green text-card",
  scheduled: "bg-line-2 text-ink",
  final: "bg-ink text-card",
} as const;

async function ManagedGames() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return <p className="text-muted">Sign in to manage games.</p>;

  // Games the user created or whose league they administer (RLS decides what they can then change).
  const { data: leagues } = await supabase
    .from("memberships")
    .select("league_id")
    .eq("user_id", uid)
    .eq("role", "admin")
    .not("league_id", "is", null);
  const leagueIds = (leagues ?? []).map((m) => m.league_id).filter((id): id is string => !!id);
  const filter = [`created_by.eq.${uid}`, ...(leagueIds.length ? [`league_id.in.(${leagueIds.join(",")})`] : [])].join(",");

  const { data: games } = await supabase.from("games").select("*").or(filter).order("starts_at", { ascending: false });
  const teamIds = [...new Set((games ?? []).flatMap((g) => [g.home_team_id, g.away_team_id]))];
  const { data: teams } = teamIds.length
    ? await supabase.from("teams").select("id, name, abbr").in("id", teamIds)
    : { data: [] as { id: string; name: string; abbr: string }[] };
  const byId = new Map((teams ?? []).map((t) => [t.id, t]));

  if (!games?.length) {
    return <p className="text-muted">You have no games to manage yet. Start one from the app&apos;s New game wizard.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {games.map((g) => {
        const home = byId.get(g.home_team_id);
        const away = byId.get(g.away_team_id);
        return (
          <li key={g.id}>
            <Link
              href={`/admin/games/${g.id}`}
              className="flex items-center gap-4 rounded-[14px] border border-line bg-card px-5 py-4 hover:border-line-3"
            >
              <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${STATUS_STYLE[g.status]}`}>{g.status}</span>
              <span className="font-display text-xl font-bold uppercase">
                {home?.abbr ?? "?"} vs {away?.abbr ?? "?"}
              </span>
              <span className="text-sm text-muted">{[home?.name, away?.name].filter(Boolean).join(" – ")}</span>
              <span className="ml-auto text-sm text-muted">
                {g.starts_at ? new Date(g.starts_at).toLocaleString() : "No date"}
                {g.is_public ? "" : " · private"}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function AdminPage() {
  return (
    <main className="mx-auto w-full max-w-[1280px] flex-1 p-8">
      <div className="mb-6 flex items-end justify-between">
        <h1 className="font-display text-[56px] leading-none font-extrabold italic uppercase">Admin</h1>
        <Link href="/teams" className="rounded-full border-[1.5px] border-line-3 px-4 py-2 text-sm font-semibold hover:bg-paper">
          Manage teams &amp; rosters
        </Link>
      </div>
      <h2 className="mb-3 font-display text-2xl font-bold uppercase">Your games</h2>
      <Suspense fallback={<p className="text-muted">Loading games…</p>}>
        <ManagedGames />
      </Suspense>
    </main>
  );
}
