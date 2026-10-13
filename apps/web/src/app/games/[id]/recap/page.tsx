import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  biggestRuns, leadStats, percentage, periodLabel, periodLengthMs, teamTotals,
  type Play, type PlayerLine, type Side,
} from "@basket-log/core";
import { formatClock } from "@/lib/format";
import { getGameView } from "@/lib/game-view";
import type { GameView } from "@/lib/game-data";

type Props = { params: Promise<{ id: string }> };

export default function RecapPage(props: Props) {
  return (
    <Suspense fallback={<p className="p-10 text-muted">Loading recap…</p>}>
      <Recap {...props} />
    </Suspense>
  );
}

const other = (side: Side): Side => (side === "home" ? "away" : "home");

async function Recap({ params }: Props) {
  const { id } = await params;
  const game = await getGameView(id);
  if (!game) notFound();

  const { derived, teams } = game;
  const plays = derived.plays.filter((p) => p.points > 0 || p.scoreAfter.home + p.scoreAfter.away > 0);
  const lead = leadStats(plays);
  const runs = biggestRuns(plays);
  const when = (period: number, clockMs: number) => `${periodLabel(game.rules, period)} ${formatClock(clockMs)}`;

  const scoreHome = derived.score.home;
  const scoreAway = derived.score.away;
  const scored = scoreHome + scoreAway > 0;
  const leader: Side | null = scoreHome === scoreAway ? null : scoreHome > scoreAway ? "home" : "away";
  const players = Object.fromEntries(game.players.map((p) => [p.id, p]));
  const lines = Object.entries(derived.players)
    .map(([playerId, line]) => ({ playerId, line, player: players[playerId] }))
    .filter((p) => p.player);
  const topScorer = [...lines].sort((a, b) => b.line.pts - a.line.pts)[0];

  const headline = !scored
    ? "No score yet"
    : leader === null
      ? `${teams.home.name} and ${teams.away.name} ${game.status === "final" ? "finish level" : "are level"} at ${scoreHome}`
      : `${teams[leader].name} ${game.status === "final" ? "beat" : "lead"} ${teams[other(leader)].name} ${Math.max(scoreHome, scoreAway)}–${Math.min(scoreHome, scoreAway)}`;

  const facts: string[] = [];
  if (scored) {
    facts.push(
      lead.leadChanges === 0
        ? "The lead never changed hands"
        : `The lead changed hands ${lead.leadChanges} time${lead.leadChanges === 1 ? "" : "s"}`,
    );
    if (lead.ties > 0) facts[0] += ` and the score was tied ${lead.ties} time${lead.ties === 1 ? "" : "s"}`;
    const bestRun = runs.home.points >= runs.away.points ? "home" : "away";
    if (runs[bestRun].points > 0) {
      facts.push(`${teams[bestRun].name}'s best run was ${runs[bestRun].points} unanswered points, ending ${when(runs[bestRun].period, runs[bestRun].clockMs)}`);
    }
    if (topScorer && topScorer.line.pts > 0) {
      facts.push(`${topScorer.player!.displayName} led all scorers with ${topScorer.line.pts}`);
    }
  }
  const standfirst = facts.length ? `${facts.join(". ")}.` : "The recap fills in as plays are logged.";

  return (
    <div className="mx-auto grid max-w-[1280px] gap-8 px-6 py-8 lg:grid-cols-[1fr_460px]">
      <div className="flex min-w-0 flex-col gap-6">
        <header>
          <h1 className="font-display text-5xl font-extrabold uppercase italic leading-none">{headline}</h1>
          <p className="mt-3 max-w-[640px] text-[17px] text-ink-3">{standfirst}</p>
        </header>

        <section className="rounded-2xl bg-card p-6 shadow-sm">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-xl font-bold uppercase">Score flow</h2>
            <p className="text-sm text-muted">
              Largest lead · {teams.home.abbr} +{lead.biggestLead.home} · {teams.away.abbr} +{lead.biggestLead.away}
            </p>
          </div>
          <ScoreFlow game={game} plays={plays} />
          <p className="mt-2 flex gap-5 text-sm text-muted">
            <Key color="bg-green" label={`${teams.home.name} lead`} />
            <Key color="bg-ink" label={`${teams.away.name} lead`} />
          </p>
        </section>

        <Comparison game={game} />
      </div>

      <aside className="flex flex-col gap-8">
        <section>
          <h2 className="mb-3 font-display text-xl font-bold uppercase">Top performers</h2>
          <div className="flex flex-col gap-3">
            {[...lines]
              .sort((a, b) => b.line.pts - a.line.pts)
              .slice(0, 4)
              .filter((p) => p.line.pts > 0)
              .map(({ playerId, line, player }) => (
                <Performer key={playerId} gameId={game.id} playerId={playerId} line={line} number={player!.number} name={player!.displayName} abbr={teams[player!.side].abbr} home={player!.side === "home"} />
              ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-display text-xl font-bold uppercase">Key moments</h2>
          <KeyMoments game={game} plays={plays} />
        </section>
      </aside>
    </div>
  );
}

function Key({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`size-3 rounded-sm ${color}`} /> {label}
    </span>
  );
}

const CHART = { w: 640, h: 220, pad: 8 };

function ScoreFlow({ game, plays }: { game: GameView; plays: Play[] }) {
  // x = elapsed game time, y = home minus away
  const lengths: number[] = [];
  const lastPeriod = Math.max(game.rules.periods, ...plays.map((p) => p.period));
  for (let p = 1; p <= lastPeriod; p++) lengths.push(periodLengthMs(game.rules, p));
  const total = lengths.reduce((a, b) => a + b, 0);
  const start = (period: number) => lengths.slice(0, period - 1).reduce((a, b) => a + b, 0);
  const x = (period: number, clockMs: number) => ((start(period) + (lengths[period - 1]! - clockMs)) / total) * CHART.w;

  const points = [{ x: 0, d: 0 }, ...plays.map((p) => ({ x: x(p.period, p.clockMs), d: p.scoreAfter.home - p.scoreAfter.away }))];
  const max = Math.max(5, ...points.map((p) => Math.abs(p.d)));
  const mid = CHART.h / 2;
  const y = (d: number) => mid - (d / max) * (mid - CHART.pad);
  // step line: the difference holds until the next play
  const stepped = points.flatMap((pt, i) => (i === 0 ? [`M ${pt.x} ${y(pt.d)}`] : [`L ${pt.x} ${y(points[i - 1]!.d)}`, `L ${pt.x} ${y(pt.d)}`]));
  const last = points.at(-1)!;
  const area = `${stepped.join(" ")} L ${last.x} ${mid} L 0 ${mid} Z`;

  return (
    <svg viewBox={`0 0 ${CHART.w} ${CHART.h + 22}`} className="mt-4 w-full" role="img" aria-label="Score difference over the game">
      <defs>
        <clipPath id="flow-above"><rect x={0} y={0} width={CHART.w} height={mid} /></clipPath>
        <clipPath id="flow-below"><rect x={0} y={mid} width={CHART.w} height={mid} /></clipPath>
      </defs>
      {lengths.map((_, i) => (
        <g key={i}>
          {i > 0 && <line x1={(start(i + 1) / total) * CHART.w} x2={(start(i + 1) / total) * CHART.w} y1={0} y2={CHART.h} stroke="var(--line)" />}
          <text x={((start(i + 1) + lengths[i]! / 2) / total) * CHART.w} y={CHART.h + 16} textAnchor="middle" fontSize={12} fill="var(--muted)">
            {periodLabel(game.rules, i + 1)}
          </text>
        </g>
      ))}
      <path d={area} fill="var(--green)" clipPath="url(#flow-above)" />
      <path d={area} fill="var(--ink)" clipPath="url(#flow-below)" />
      <line x1={0} x2={CHART.w} y1={mid} y2={mid} stroke="var(--line-3)" />
    </svg>
  );
}

function Comparison({ game }: { game: GameView }) {
  const totals = (side: Side) =>
    teamTotals(game.players.filter((p) => p.side === side).map((p) => game.derived.players[p.id]).filter((l): l is PlayerLine => !!l));
  const h = totals("home");
  const a = totals("away");
  const rows: { label: string; home: number | null; away: number | null; format?: (n: number) => string }[] = [
    { label: "Field goal %", home: percentage(h.fgm, h.fga), away: percentage(a.fgm, a.fga) },
    { label: "3-point %", home: percentage(h.tpm, h.tpa), away: percentage(a.tpm, a.tpa) },
    { label: "Free throw %", home: percentage(h.ftm, h.fta), away: percentage(a.ftm, a.fta) },
    { label: "Rebounds", home: h.reb, away: a.reb },
    { label: "Assists", home: h.ast, away: a.ast },
    { label: "Steals", home: h.stl, away: a.stl },
    { label: "Blocks", home: h.blk, away: a.blk },
    { label: "Turnovers", home: h.tov, away: a.tov },
  ];
  return (
    <section className="rounded-2xl bg-card p-6 shadow-sm">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl font-bold uppercase">Team comparison</h2>
        <p className="text-sm text-muted">{game.teams.home.abbr} · {game.teams.away.abbr}</p>
      </div>
      <div className="mt-4 flex flex-col gap-4">
        {rows.map((r) => {
          const sum = (r.home ?? 0) + (r.away ?? 0);
          const share = sum === 0 ? 50 : ((r.home ?? 0) / sum) * 100;
          return (
            <div key={r.label} className="grid grid-cols-[56px_1fr_56px] items-center gap-3">
              <span className="font-display text-xl font-bold">{r.home ?? "–"}</span>
              <div>
                <p className="mb-1 text-center text-[11px] font-semibold uppercase tracking-widest text-muted">{r.label}</p>
                <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
                  <div className="bg-green" style={{ width: `${share}%` }} />
                  <div className="flex-1 bg-ink" />
                </div>
              </div>
              <span className="text-right font-display text-xl font-bold">{r.away ?? "–"}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Performer({ gameId, playerId, line, number, name, abbr, home }: { gameId: string; playerId: string; line: PlayerLine; number: number; name: string; abbr: string; home: boolean }) {
  return (
    <Link href={`/players/${playerId}/games/${gameId}`} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm">
      <span className={`flex size-12 items-center justify-center rounded-xl font-display text-xl font-bold ${home ? "bg-green text-white" : "bg-ink text-white"}`}>{number}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-lg font-bold uppercase">{name}</p>
        <p className="text-xs text-muted">{abbr} · {line.fgm}-{line.fga} FG · {line.tpm}-{line.tpa} 3PT</p>
      </div>
      {[
        [line.pts, "PTS"],
        [line.oreb + line.dreb, "REB"],
        [line.ast, "AST"],
      ].map(([value, label]) => (
        <div key={label} className="w-10 text-center">
          <p className="font-display text-2xl font-extrabold leading-none">{value}</p>
          <p className="text-[10px] text-muted">{label}</p>
        </div>
      ))}
    </Link>
  );
}

function KeyMoments({ game, plays }: { game: GameView; plays: Play[] }) {
  const { teams } = game;
  const when = (period: number, clockMs: number) => `${periodLabel(game.rules, period)} ${formatClock(clockMs)}`;
  const moments: { period: number; clockMs: number; text: string }[] = [];

  const runs = biggestRuns(plays);
  for (const side of ["home", "away"] as const) {
    if (runs[side].points >= 6) moments.push({ ...runs[side], text: `${teams[side].name} score ${runs[side].points} unanswered points.` });
  }
  // the last time the score was level, as long as someone has led since
  const lastTie = [...plays].reverse().find((p) => p.scoreAfter.home === p.scoreAfter.away && p.scoreAfter.home > 0);
  const final = plays.at(-1);
  if (lastTie && final && lastTie !== final) {
    const leader = final.scoreAfter.home > final.scoreAfter.away ? "home" : "away";
    moments.push({ period: lastTie.period, clockMs: lastTie.clockMs, text: `Tied at ${lastTie.scoreAfter.home}–${lastTie.scoreAfter.away} for the last time. ${teams[leader].name} ${game.status === "final" ? "never trailed again" : "lead from here"}.` });
  }
  const lead = leadStats(plays);
  for (const side of ["home", "away"] as const) {
    const best = lead.biggestLead[side];
    if (best < 5) continue;
    const play = plays.find((p) => (side === "home" ? 1 : -1) * (p.scoreAfter.home - p.scoreAfter.away) === best);
    if (play) moments.push({ period: play.period, clockMs: play.clockMs, text: `${teams[side].name} reach their biggest lead, +${best} (${play.scoreAfter.home}–${play.scoreAfter.away}).` });
  }
  moments.sort((a, b) => a.period - b.period || b.clockMs - a.clockMs);

  if (!moments.length) return <p className="rounded-2xl bg-ink p-5 text-sm text-muted-on-dark">Key moments appear once there are runs, leads and ties to report.</p>;
  return (
    <ul className="rounded-2xl bg-ink px-5 py-2 text-white">
      {moments.map((m, i) => (
        <li key={i} className="flex gap-4 border-b border-ink-3 py-3.5 last:border-b-0">
          <span className="w-16 shrink-0 font-display text-base font-bold text-green-light">{when(m.period, m.clockMs)}</span>
          <span className="text-[15px]">{m.text}</span>
        </li>
      ))}
    </ul>
  );
}
