import { notFound } from "next/navigation";
import { formatMinutes, formatPlusMinus, percentage, teamTotals, type PlayerLine, type PlayingTime } from "@basket-log/core";
import { getGameView } from "@/lib/game-view";
import type { ViewPlayer } from "@/lib/game-data";

const COLUMNS = ["MIN", "PTS", "FG", "3PT", "FT", "REB", "AST", "STL", "BLK", "TO", "PF", "+/-"];
const DASH = "—";
const frac = (m: number, a: number) => `${m}-${a}`;
const pct = (m: number, a: number) => {
  const p = percentage(m, a);
  return p === null ? DASH : `${p.toFixed(1)}%`;
};

function cells(l: PlayerLine, t?: PlayingTime): (string | number)[] {
  return [t ? formatMinutes(t.ms) : DASH, l.pts, frac(l.fgm, l.fga), frac(l.tpm, l.tpa), frac(l.ftm, l.fta), l.oreb + l.dreb, l.ast, l.stl, l.blk, l.tov, l.pf, t ? formatPlusMinus(t.plusMinus) : DASH];
}

export default async function BoxScorePage({ params }: PageProps<"/games/[id]">) {
  const { id } = await params;
  const game = await getGameView(id);
  if (!game) notFound();

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-6 px-12 py-8">
      <div className="flex justify-end">
        <a
          href={`/games/${game.id}/box/export`}
          download
          className="rounded-full border-[1.5px] border-line-3 px-4 py-2 text-sm font-semibold text-ink hover:bg-paper"
        >
          Export CSV
        </a>
      </div>
      {(["home", "away"] as const).map((side) => {
        const team = game.teams[side];
        const roster = game.players.filter((p) => p.side === side);
        const lineOf = (p: ViewPlayer) => game.derived.players[p.id];
        const starters = roster.filter((p) => p.starter);
        const bench = roster.filter((p) => !p.starter);
        const all = roster.map(lineOf).filter((l): l is PlayerLine => !!l);
        const t = teamTotals(all);

        return (
          <section key={side} className="overflow-hidden rounded-[14px] border border-line bg-card">
            <div className={`flex items-center justify-between px-5 py-3 ${side === "home" ? "bg-green" : "bg-ink"} text-card`}>
              <h2 className="font-display text-[26px] font-bold uppercase">{team.name}</h2>
              <p className="text-xs font-semibold">
                FG {pct(t.fgm, t.fga)} · 3PT {pct(t.tpm, t.tpa)} · FT {pct(t.ftm, t.fta)}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="text-xs tracking-wider text-muted uppercase">
                    <th className="px-5 py-3 text-left font-semibold">Starters</th>
                    {COLUMNS.map((c) => (
                      <th key={c} className="px-3 py-3 text-right font-semibold">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {starters.map((p) => (
                    <PlayerRow key={p.id} player={p} line={lineOf(p)} time={game.playing[p.id]} />
                  ))}
                  {bench.length > 0 && (
                    <>
                      <tr className="bg-paper text-xs tracking-wider text-muted uppercase">
                        <td colSpan={COLUMNS.length + 1} className="px-5 py-2 font-semibold">Bench</td>
                      </tr>
                      {bench.map((p) => (
                        <PlayerRow key={p.id} player={p} line={lineOf(p)} time={game.playing[p.id]} />
                      ))}
                    </>
                  )}
                  <tr className="border-t border-line bg-paper font-display text-base font-bold">
                    <td className="px-5 py-3 uppercase">Totals</td>
                    {cells(t).map((c, i) => (
                      <td key={COLUMNS[i]} className="px-3 py-3 text-right">{c}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function PlayerRow({ player, line, time }: { player: ViewPlayer; line: PlayerLine | undefined; time: PlayingTime | undefined }) {
  const values = line ? cells(line, time) : COLUMNS.map(() => DASH);
  return (
    <tr className="border-t border-line-2">
      <td className="px-5 py-3 font-semibold">
        <span className="mr-3 inline-block w-6 font-display text-muted">{player.number}</span>
        {player.displayName}
      </td>
      {values.map((v, i) => (
        <td key={COLUMNS[i]} className={`px-3 py-3 text-right ${COLUMNS[i] === "PTS" ? "font-display text-base font-bold" : ""}`}>{v}</td>
      ))}
    </tr>
  );
}
