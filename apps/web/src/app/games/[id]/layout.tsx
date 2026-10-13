import { notFound } from "next/navigation";
import { Suspense } from "react";
import { lineScore, periodLabel } from "@basket-log/core";
import { HubTabs } from "@/components/hub-tabs";
import { LiveRefresh } from "@/components/live-refresh";
import { TeamChip } from "@/components/team-chip";
import { getGameView } from "@/lib/game-view";

const STATUS_LABEL = { live: "Live", final: "Final", scheduled: "Upcoming" } as const;

async function Hub({ params, children }: { params: Promise<{ id: string }>; children: React.ReactNode }) {
  const { id } = await params;
  const game = await getGameView(id);
  if (!game) notFound();

  const rows = lineScore(game.derived.plays, game.rules.periods);
  const { score } = game.derived;
  const ahead = score.home === score.away ? null : score.home > score.away ? "home" : "away";
  const overtime = rows.length > game.rules.periods;

  return (
    <>
      <section
        className="bg-wood"
        style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent 0 118px, var(--wood-shadow) 118px 120px)" }}
      >
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-6 px-12 py-8">
          <TeamBlock side="home" game={game} />
          <span className={`font-display text-[76px] leading-none font-extrabold text-wood-text ${ahead === "away" ? "opacity-50" : ""}`}>{score.home}</span>
          <div className="rounded-xl bg-card px-5 py-3 text-sm shadow-sm">
            <table className="font-display font-semibold">
              <thead>
                <tr className="text-muted">
                  <th className="pr-4 text-left text-green uppercase">
                    {STATUS_LABEL[game.status]}
                    {overtime && game.status === "final" ? " / OT" : ""}
                  </th>
                  {rows.map((r) => (
                    <th key={r.period} className="min-w-8 px-1 text-center font-semibold">
                      {r.period > game.rules.periods ? periodLabel(game.rules, r.period) : r.period}
                    </th>
                  ))}
                  <th className="min-w-10 px-1 text-center">T</th>
                </tr>
              </thead>
              <tbody>
                {(["home", "away"] as const).map((side) => (
                  <tr key={side}>
                    <td className="pr-4 text-left">{game.teams[side].abbr}</td>
                    {rows.map((r) => (
                      <td key={r.period} className="px-1 text-center">{r[side]}</td>
                    ))}
                    <td className="px-1 text-center font-extrabold">{score[side]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <span className={`font-display text-[76px] leading-none font-extrabold text-wood-text ${ahead === "home" ? "opacity-50" : ""}`}>{score.away}</span>
          <TeamBlock side="away" game={game} />
        </div>
      </section>
      {game.status !== "final" && <LiveRefresh gameId={game.id} />}
      <HubTabs gameId={game.id} />
      {children}
    </>
  );
}

function TeamBlock({ side, game }: { side: "home" | "away"; game: NonNullable<Awaited<ReturnType<typeof getGameView>>> }) {
  const team = game.teams[side];
  const name = (
    <div className={side === "away" ? "text-right" : ""}>
      <p className="text-xs font-medium text-wood-text">{team.city}</p>
      <p className="font-display text-[34px] leading-none font-extrabold text-ink uppercase">{team.name}</p>
    </div>
  );
  const chip = <TeamChip abbr={team.abbr} color={team.color} size={68} />;
  return (
    <div className="flex items-center gap-4">
      {side === "home" ? <>{chip}{name}</> : <>{name}{chip}</>}
    </div>
  );
}

export default function GameHubLayout({ params, children }: LayoutProps<"/games/[id]">) {
  return (
    <Suspense fallback={<p className="p-12 text-muted">Loading game…</p>}>
      <Hub params={params}>{children}</Hub>
    </Suspense>
  );
}
