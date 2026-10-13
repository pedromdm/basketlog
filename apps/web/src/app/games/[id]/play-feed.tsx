"use client";

import { useState } from "react";
import { formatClock } from "@/lib/format";

export interface FeedPlay {
  id: string;
  period: number;
  periodLabel: string;
  clockMs: number;
  side: "home" | "away";
  text: string;
  points: number;
  score: { home: number; away: number };
}

export function PlayFeed({ plays, periods }: { plays: FeedPlay[]; periods: { period: number; label: string }[] }) {
  const [period, setPeriod] = useState<number | null>(null);
  const [scoringOnly, setScoringOnly] = useState(false);
  const rows = plays.filter((p) => (period === null || p.period === period) && (!scoringOnly || p.points > 0));

  return (
    <div className="mx-auto w-full max-w-[860px] flex-1 px-6 py-6">
      <div className="flex items-center gap-2">
        <Chip active={period === null} onClick={() => setPeriod(null)}>All</Chip>
        {periods.map((p) => (
          <Chip key={p.period} active={period === p.period} onClick={() => setPeriod(period === p.period ? null : p.period)}>
            {p.label}
          </Chip>
        ))}
        <span className="flex-1" />
        <Chip active={scoringOnly} onClick={() => setScoringOnly(!scoringOnly)}>Scoring only</Chip>
      </div>

      {rows.length === 0 ? (
        <p className="mt-10 text-muted">No plays yet.</p>
      ) : (
        <ol className="mt-4 overflow-hidden rounded-[14px] border border-line bg-card">
          {rows.map((p) => (
            <li key={p.id} className="flex items-center gap-4 border-b border-line-2 px-5 py-3 last:border-b-0">
              <span className="w-12 font-display text-lg font-bold text-muted">{formatClock(p.clockMs)}</span>
              <span className={`h-9 w-1 rounded-full ${p.side === "home" ? "bg-green" : "bg-ink"}`} />
              <div className="min-w-0 flex-1">
                <p className={`text-[15px] ${p.points > 0 ? "font-bold" : "font-medium"}`}>{p.text}</p>
                <p className="text-xs text-muted">{p.periodLabel}</p>
              </div>
              <div className="text-right">
                <p className={`font-display text-lg ${p.points > 0 ? "font-bold" : "font-medium text-muted"}`}>
                  {p.score.home}-{p.score.away}
                </p>
                {p.points > 0 && (
                  <span className="rounded-md bg-green-tint px-1.5 py-0.5 text-[11px] font-bold text-green-dark">+{p.points}</span>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${active ? "border-ink bg-ink text-card" : "border-line-3 bg-card text-ink"}`}
    >
      {children}
    </button>
  );
}
