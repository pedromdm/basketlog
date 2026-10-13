import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { percentage, periodLabel, shotZones, type Side } from "@basket-log/core";
import { Court } from "@/components/court";
import { getGameView } from "@/lib/game-view";
import { placedShots, sideColor } from "@/lib/shots";

type Search = { team?: string; player?: string; result?: string; period?: string };
type Props = { params: Promise<{ id: string }>; searchParams: Promise<Search> };

export default function ShotChartPage(props: Props) {
  return (
    <Suspense fallback={<p className="p-10 text-muted">Loading shot chart…</p>}>
      <ShotChart {...props} />
    </Suspense>
  );
}

async function ShotChart({ params, searchParams }: Props) {
  const { id } = await params;
  const search = await searchParams;
  const game = await getGameView(id);
  if (!game) notFound();

  const side: Side = search.team === "away" ? "away" : "home";
  const result = search.result === "made" || search.result === "missed" ? search.result : "all";
  const period = Number(search.period) || null;
  const players = game.players.filter((p) => p.side === side);
  const player = players.find((p) => p.id === search.player)?.id ?? null;

  const link = (patch: Partial<Search>) => {
    const next: Search = { team: side, player: player ?? undefined, result: result === "all" ? undefined : result, period: period ? String(period) : undefined, ...patch };
    const query = new URLSearchParams(Object.entries(next).filter((entry): entry is [string, string] => entry[1] !== undefined)).toString();
    return `/games/${id}/shots${query ? `?${query}` : ""}`;
  };

  // team + period + player decide which shots count; "result" only changes what is drawn
  const all = placedShots(game.events);
  const counted = all.filter((s) => s.side === side && (!period || s.period === period) && (!player || s.playerId === player));
  const drawn = counted.filter((s) => result === "all" || (result === "made" ? s.made : !s.made));
  const zones = shotZones(counted);
  const made = counted.filter((s) => s.made).length;
  const periodCount = Math.max(game.rules.periods, ...game.events.map((e) => e.period));
  const perPlayer = new Map<string, { made: number; att: number }>();
  for (const s of all) {
    if (s.side !== side || !s.playerId || (period && s.period !== period)) continue;
    const line = perPlayer.get(s.playerId) ?? { made: 0, att: 0 };
    line.att++;
    if (s.made) line.made++;
    perPlayer.set(s.playerId, line);
  }

  const zoneCards = [
    { label: "Paint", ...zones.paint },
    { label: "Mid-range", ...zones.midRange },
    { label: "Corner 3", ...zones.corner3 },
    { label: "Above-break 3", ...zones.aboveBreak3 },
  ];

  return (
    <div className="mx-auto grid max-w-[1280px] gap-8 px-6 py-8 lg:grid-cols-[260px_1fr_300px]">
      <aside className="flex flex-col gap-5">
        <div className="flex rounded-xl bg-line p-1">
          {(["home", "away"] as const).map((s) => (
            <Link
              key={s}
              href={link({ team: s, player: undefined })}
              className={`flex-1 rounded-lg py-2.5 text-center font-display text-sm font-bold uppercase ${s === side ? "bg-green text-white" : "text-ink"}`}
            >
              {game.teams[s].name}
            </Link>
          ))}
        </div>
        <ul className="rounded-2xl bg-card p-2 shadow-sm">
          {players.map((p) => {
            const line = perPlayer.get(p.id);
            const active = player === p.id;
            return (
              <li key={p.id}>
                <Link
                  href={link({ player: active ? undefined : p.id })}
                  aria-current={active}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[15px] ${active ? "bg-green-tint font-semibold" : ""}`}
                >
                  <span className="w-6 text-right font-display font-bold text-muted">{p.number}</span>
                  <span className="flex-1">{p.displayName}</span>
                  <span className="text-sm text-muted">{line ? `${line.made}-${line.att}` : "0-0"}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <FilterRow label="Result">
          {(["all", "made", "missed"] as const).map((r) => (
            <Chip key={r} href={link({ result: r === "all" ? undefined : r })} active={result === r}>{r}</Chip>
          ))}
        </FilterRow>
        <FilterRow label="Period">
          <Chip href={link({ period: undefined })} active={!period}>All</Chip>
          {Array.from({ length: periodCount }, (_, i) => i + 1).map((n) => (
            <Chip key={n} href={link({ period: String(n) })} active={period === n}>{periodLabel(game.rules, n)}</Chip>
          ))}
        </FilterRow>
      </aside>

      <section>
        {game.tracking[side] === "team_only" ? (
          <p className="rounded-2xl bg-card p-8 text-muted">{game.teams[side].name} was tracked at team level, so there are no shot locations.</p>
        ) : (
          <>
            <Court className="w-full rounded-2xl shadow-sm" dots={drawn.map((s) => ({ x: s.x, y: s.y, made: s.made, color: sideColor(s.side) }))} />
            <div className="mt-3 flex items-center justify-between text-sm text-muted">
              <span className="flex items-center gap-2">
                <Legend filled /> Made <Legend /> Missed
              </span>
              <span className="font-display text-base font-bold text-ink">
                {made}/{counted.length} FG · {percentage(made, counted.length) ?? "–"}%
              </span>
            </div>
          </>
        )}
      </section>

      <aside>
        <h2 className="mb-4 font-display text-xl font-bold uppercase">By zone</h2>
        <div className="flex flex-col gap-3">
          {zoneCards.map((z) => {
            const fg = percentage(z.made, z.attempts);
            const share = percentage(z.attempts, counted.length);
            return (
              <div key={z.label} className="rounded-2xl bg-card p-4 shadow-sm">
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold">{z.label}</span>
                  <span className="font-display text-3xl font-extrabold">{fg === null ? "–" : `${Math.round(fg)}%`}</span>
                </div>
                <div className="my-2 h-2 rounded-full bg-line-2">
                  <div className="h-2 rounded-full bg-green" style={{ width: `${fg ?? 0}%` }} />
                </div>
                <div className="flex justify-between text-xs text-muted">
                  <span>{z.made}/{z.attempts} made</span>
                  <span>{share === null ? "–" : `${Math.round(share)}%`} of shots</span>
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold capitalize ${active ? "border-ink bg-ink text-white" : "border-line-3 bg-card"}`}>
      {children}
    </Link>
  );
}

function Legend({ filled = false }: { filled?: boolean }) {
  return <span className={`mr-1 inline-block size-3 rounded-full border-2 border-green ${filled ? "bg-green" : "bg-transparent"}`} />;
}
