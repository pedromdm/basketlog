import { notFound } from "next/navigation";
import { periodLabel } from "@basket-log/core";
import { getGameView } from "@/lib/game-view";
import { PlayFeed, type FeedPlay } from "./play-feed";

export default async function PlayByPlayPage({ params }: PageProps<"/games/[id]">) {
  const { id } = await params;
  const game = await getGameView(id);
  if (!game) notFound();

  const plays: FeedPlay[] = game.derived.plays
    .map((p) => ({
      id: p.groupId,
      period: p.period,
      periodLabel: periodLabel(game.rules, p.period),
      clockMs: p.clockMs,
      side: p.side,
      text: p.text,
      points: p.points,
      score: p.scoreAfter,
    }))
    .reverse();
  const periods = [...new Set(plays.map((p) => p.period))]
    .sort((a, b) => a - b)
    .map((period) => ({ period, label: periodLabel(game.rules, period) }));

  return <PlayFeed plays={plays} periods={periods} />;
}
