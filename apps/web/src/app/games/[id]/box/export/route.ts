import { boxScoreCsv } from "@basket-log/core";
import { getGameView } from "@/lib/game-view";

const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function GET(_request: Request, ctx: RouteContext<"/games/[id]/box/export">) {
  const { id } = await ctx.params;
  const game = await getGameView(id);
  if (!game) return new Response("Game not found", { status: 404 });

  const csv = boxScoreCsv({
    teams: { home: { name: game.teams.home.name }, away: { name: game.teams.away.name } },
    players: game.players,
    lines: game.derived.players,
    playing: game.playing,
  });
  const filename = `${slug(game.teams.home.name)}-vs-${slug(game.teams.away.name)}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
