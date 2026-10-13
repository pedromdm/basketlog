import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { activeEvents, percentage, periodLabel, type GameEvent } from "@basket-log/core";
import { Court } from "@/components/court";
import { formatClock } from "@/lib/format";
import { getGameView } from "@/lib/game-view";
import { placedShots, sideColor } from "@/lib/shots";

type Props = { params: Promise<{ id: string; gameId: string }> };

export default function PlayerGamePage(props: Props) {
  return (
    <Suspense fallback={<p className="p-10 text-muted">Loading player…</p>}>
      <PlayerGame {...props} />
    </Suspense>
  );
}

/** What a player's event in a play is called in the "His plays" list. */
function tag(e: GameEvent): { label: string; tone: "score" | "stat" | "miss" } | null {
  switch (e.type) {
    case "shot": return e.made ? { label: `+${e.points ?? 2}`, tone: "score" } : { label: "MISS", tone: "miss" };
    case "ft": return e.made ? { label: "+1", tone: "score" } : { label: "MISS", tone: "miss" };
    case "ast": return { label: "AST", tone: "stat" };
    case "stl": return { label: "STL", tone: "stat" };
    case "blk": return { label: "BLK", tone: "stat" };
    case "reb": return { label: "REB", tone: "stat" };
    case "tov": return { label: "TOV", tone: "stat" };
    case "foul": return { label: "PF", tone: "stat" };
    default: return null;
  }
}

const TONE = { score: "bg-green-tint text-green-dark", stat: "bg-ink text-white", miss: "bg-line-2 text-muted" } as const;

async function PlayerGame({ params }: Props) {
  const { id, gameId } = await params;
  const game = await getGameView(gameId);
  const player = game?.players.find((p) => p.id === id);
  if (!game || !player) notFound();

  const line = game.derived.players[id];
  if (!line) notFound();
  const team = game.teams[player.side];
  const opponent = game.teams[player.side === "home" ? "away" : "home"];
  const mine = game.derived.score[player.side];
  const theirs = game.derived.score[player.side === "home" ? "away" : "home"];
  const result = game.status === "final" ? `${mine > theirs ? "W" : mine < theirs ? "L" : "T"} ${mine}–${theirs}` : `${mine}–${theirs}${game.status === "live" ? " · live" : ""}`;
  const date = game.startsAt ? new Date(game.startsAt).toLocaleDateString("en-GB", { month: "short", day: "numeric", timeZone: "UTC" }) : null;

  const shots = placedShots(game.events).filter((s) => s.playerId === id);

  // plays this player took part in, newest first
  const live = activeEvents(game.events);
  const mineByGroup = new Map<string, GameEvent[]>();
  for (const e of live) if (e.playerId === id) mineByGroup.set(e.groupId, [...(mineByGroup.get(e.groupId) ?? []), e]);
  const plays = game.derived.plays
    .filter((p) => mineByGroup.has(p.groupId))
    .map((p) => ({ play: p, tags: (mineByGroup.get(p.groupId) ?? []).map(tag).filter((t) => t !== null) }))
    .reverse();

  const reb = line.oreb + line.dreb;
  const splits = [
    { label: "FG", made: line.fgm, att: line.fga },
    { label: "3PT", made: line.tpm, att: line.tpa },
    { label: "FT", made: line.ftm, att: line.fta },
  ];

  return (
    <main className="mx-auto max-w-[430px] pb-10">
      <header className="bg-green px-6 pb-6 pt-5 text-white">
        <div className="flex justify-between text-sm font-semibold text-white/80">
          <Link href={`/games/${game.id}/box`}>‹ Box score</Link>
          <span>{team.name}</span>
        </div>
        <div className="mt-4 flex items-end gap-4">
          <span className="font-display text-7xl font-extrabold italic leading-none text-green-light">{player.number}</span>
          <h1 className="font-display text-3xl font-extrabold uppercase italic leading-[0.95]">{player.displayName}</h1>
        </div>
        <p className="mt-4 rounded-xl bg-green-dark px-4 py-3 text-sm font-semibold">
          vs {opponent.abbr}{date ? ` · ${date}` : ""} <span className="float-right">{result}</span>
        </p>
      </header>

      <div className="grid grid-cols-3 bg-ink text-center text-white">
        {[
          [line.pts, "PTS"],
          [reb, "REB"],
          [line.ast, "AST"],
        ].map(([value, label]) => (
          <div key={label} className="border-r border-ink-3 py-5 last:border-r-0">
            <p className="font-display text-5xl font-extrabold leading-none">{value}</p>
            <p className="mt-1 text-xs tracking-widest text-muted-on-dark">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 px-4 py-4">
        <div className="grid grid-cols-3 gap-3">
          {splits.map((s) => {
            const pct = percentage(s.made, s.att);
            return (
              <div key={s.label} className="rounded-2xl bg-card p-3 shadow-sm">
                <p className="text-xs font-semibold text-muted">{s.label}</p>
                <p className="font-display text-2xl font-extrabold">{s.made}/{s.att}</p>
                <div className="my-1 h-1.5 rounded-full bg-line-2">
                  <div className="h-1.5 rounded-full bg-green" style={{ width: `${pct ?? 0}%` }} />
                </div>
                <p className="text-xs text-muted">{pct === null ? "–" : `${Math.round(pct)}%`}</p>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            [line.stl, "STL"],
            [line.blk, "BLK"],
            [line.tov, "TOV"],
            [line.pf, "PF"],
          ].map(([value, label]) => (
            <div key={label} className="rounded-2xl bg-card py-3 text-center shadow-sm">
              <p className="font-display text-2xl font-extrabold">{value}</p>
              <p className="text-xs text-muted">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-baseline justify-between">
          <h2 className="font-display text-xl font-bold uppercase">Shot chart</h2>
          <span className="text-sm text-muted">{shots.length} attempt{shots.length === 1 ? "" : "s"}</span>
        </div>
        {game.tracking[player.side] === "team_only" ? (
          <p className="rounded-2xl bg-card p-5 text-sm text-muted">{team.name} was tracked at team level, so there are no shot locations.</p>
        ) : (
          <Court className="w-full rounded-2xl shadow-sm" dotRadius={9} dots={shots.map((s) => ({ x: s.x, y: s.y, made: s.made, color: sideColor(s.side) }))} />
        )}

        <h2 className="mt-3 font-display text-xl font-bold uppercase">His plays</h2>
        {plays.length === 0 ? (
          <p className="rounded-2xl bg-card p-5 text-sm text-muted">No plays logged for {player.displayName} yet.</p>
        ) : (
          <ul className="rounded-2xl bg-card shadow-sm">
            {plays.map(({ play, tags }) => (
              <li key={play.groupId} className="flex items-center gap-3 border-b border-line-2 px-4 py-3 last:border-b-0">
                <span className="w-16 shrink-0 text-sm font-semibold text-muted">{periodLabel(game.rules, play.period)} {formatClock(play.clockMs)}</span>
                <span className="flex-1 text-[15px]">{play.text}</span>
                <span className="flex gap-1">
                  {tags.map((t, i) => (
                    <span key={i} className={`rounded-md px-2 py-0.5 text-xs font-bold ${TONE[t.tone]}`}>{t.label}</span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
