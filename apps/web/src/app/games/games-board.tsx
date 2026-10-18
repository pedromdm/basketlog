"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TeamChip } from "@/components/team-chip";
import type { GameCard } from "@/lib/games-list";

type Filter = "all" | GameCard["status"];

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const WEEKDAY = new Intl.DateTimeFormat("en", { weekday: "short" });
const TITLE_DATE = new Intl.DateTimeFormat("en", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
const KICKOFF = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" });

function sevenDays(anchor: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + i - 3));
}

export function GamesBoard({ games }: { games: GameCard[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [day, setDay] = useState<string | null>(null);
  // Fixed once per mount so the strip does not shift while the page is open.
  const [today] = useState(() => new Date());
  const days = useMemo(() => sevenDays(today), [today]);

  const visible = games.filter(
    (g) => (filter === "all" || g.status === filter) && (!day || (g.startsAt && dayKey(new Date(g.startsAt)) === day)),
  );
  const count = (s: GameCard["status"]) => games.filter((g) => g.status === s).length;
  const groups: { title: string; status: GameCard["status"] }[] = [
    { title: "Live now", status: "live" },
    { title: "Final", status: "final" },
    { title: "Upcoming", status: "scheduled" },
  ];
  const chips: { id: Filter; label: string; n: number }[] = [
    { id: "all", label: "All games", n: games.length },
    { id: "live", label: "Live", n: count("live") },
    { id: "final", label: "Final", n: count("final") },
    { id: "scheduled", label: "Upcoming", n: count("scheduled") },
  ];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs font-semibold tracking-widest text-muted uppercase">{TITLE_DATE.format(today)}</p>
          <h1 className="font-display text-[44px] leading-none font-extrabold italic uppercase sm:text-[64px]">Game night</h1>
        </div>
        <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
          {days.map((d) => {
            const key = dayKey(d);
            const selected = day === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={selected}
                onClick={() => setDay(selected ? null : key)}
                className={`flex h-[66px] w-[58px] flex-col items-center justify-center rounded-xl border ${selected ? "border-ink bg-ink text-card" : "border-line bg-card text-ink"}`}
              >
                <span className={`text-[10px] font-semibold tracking-widest uppercase ${selected ? "text-green-light" : "text-muted"}`}>
                  {WEEKDAY.format(d)}
                </span>
                <span className="font-display text-2xl font-extrabold">{d.getDate()}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={filter === c.id}
            onClick={() => setFilter(c.id)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${filter === c.id ? "border-green bg-green text-card" : "border-line-3 bg-card text-ink"}`}
          >
            {c.label} · {c.n}
          </button>
        ))}
      </div>

      {visible.length === 0 && <p className="mt-12 text-muted">No games match.</p>}
      {groups.map(({ title, status }) => {
        const items = visible.filter((g) => g.status === status);
        if (!items.length) return null;
        return (
          <section key={status} className="mt-10">
            <h2 className="flex items-center gap-4 font-display text-[26px] font-bold uppercase">
              {title}
              <span className="h-px flex-1 bg-line-3" />
            </h2>
            <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
              {items.map((g) => (
                <GameCardView key={g.id} game={g} />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}

const SHORT_DATE = new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" });

/** A square card: status and competition, both teams with score, points per period, top scorers and links. */
function GameCardView({ game: g }: { game: GameCard }) {
  const started = g.status !== "scheduled";
  const time = g.startsAt ? KICKOFF.format(new Date(g.startsAt)) : "TBD";
  const ahead = g.score.home === g.score.away ? null : g.score.home > g.score.away ? "home" : "away";
  const periods = g.periods.map((p) => `${p.label} ${p.home}–${p.away}`).join(" | ");
  const leaders = (["home", "away"] as const).filter((s) => g.leaders[s]);
  return (
    <article className="flex aspect-square flex-col overflow-hidden rounded-[14px] border border-line bg-card">
      {g.status === "live" && <div className="h-1.5 shrink-0 bg-wood" />}
      <div className="flex min-h-0 flex-1 flex-col gap-2 px-4 pt-3">
        <div className="flex justify-between gap-2 text-[11px] font-bold tracking-widest uppercase">
          {g.status === "live" ? (
            <span className="flex items-center gap-2 text-green">
              <span className="size-2 rounded-full bg-green" /> Live{g.liveLabel ? ` · ${g.liveLabel}` : ""}
            </span>
          ) : g.status === "final" ? (
            <span className="text-muted">Final{g.overtime ? " / OT" : ""}</span>
          ) : (
            <span className="text-muted">{g.startsAt ? SHORT_DATE.format(new Date(g.startsAt)) : "Date TBD"}</span>
          )}
          <span className="truncate text-xs font-medium tracking-normal text-muted normal-case">{g.competition}</span>
        </div>

        {started ? null : (
          <>
            <p className="font-display text-[48px] leading-none font-extrabold">{time}</p>
            <p className="truncate text-xs text-muted">{g.venue}</p>
          </>
        )}

        {(["home", "away"] as const).map((side) => (
          <div key={side} className="flex items-center gap-2.5">
            <TeamChip abbr={g.teams[side].abbr} color={g.teams[side].color} size={40} />
            <div className="min-w-0 flex-1">
              {g.teams[side].city && <p className="truncate text-[11px] text-muted">{g.teams[side].city}</p>}
              <p className="truncate font-display text-[21px] leading-tight font-bold uppercase">{g.teams[side].name}</p>
            </div>
            {started && (
              <span className={`font-display text-[44px] leading-none font-extrabold ${ahead && ahead !== side ? "text-muted" : ""}`}>{g.score[side]}</span>
            )}
          </div>
        ))}

        {started && (g.startsAt || g.venue) && (
          <p className="truncate text-[11px] text-muted">
            {[g.startsAt ? `${SHORT_DATE.format(new Date(g.startsAt))}, ${time}` : null, g.venue].filter(Boolean).join(" | ")}
          </p>
        )}
        {started && periods && <p className="truncate rounded-lg bg-paper px-2.5 py-1.5 text-[11px] font-semibold text-ink-3">{periods}</p>}
        {started && (
          <p className="text-[11px] leading-snug text-ink-3">
            {leaders.map((s) => (
              <span key={s} className="block truncate">
                <b>{g.teams[s].abbr}</b> - {g.leaders[s]?.number != null ? `#${g.leaders[s]?.number} ` : ""}{g.leaders[s]?.name} - {g.leaders[s]?.points}pts
              </span>
            ))}
          </p>
        )}
      </div>
      <div className="flex h-[42px] shrink-0 items-center gap-4 border-t border-line-2 px-4 text-xs font-semibold">
        {started ? (
          <>
            <Link href={`/games/${g.id}/box`} className="text-green">Box score</Link>
            <Link href={`/games/${g.id}`}>Play-by-play</Link>
            {g.status === "final" && <Link href={`/games/${g.id}/recap`}>Recap</Link>}
          </>
        ) : (
          <Link href={`/games/${g.id}`} className="text-green">Preview</Link>
        )}
      </div>
    </article>
  );
}
