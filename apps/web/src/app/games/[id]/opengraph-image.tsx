import { ImageResponse } from "next/og";
import { colors } from "@basket-log/ui";
import { getGameView } from "@/lib/game-view";

export const alt = "Basket Log game";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = await getGameView(id);
  if (!game) {
    return new ImageResponse(<div style={{ display: "flex", width: "100%", height: "100%", background: colors.ink }} />, size);
  }
  const { score } = game.derived;
  const status = game.status === "live" ? "LIVE" : game.status === "final" ? "FINAL" : "UPCOMING";
  const side = (s: "home" | "away") => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 420 }}>
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", width: 140, height: 140, borderRadius: 70,
          background: game.teams[s].color, color: "#fff", fontSize: 48, fontWeight: 800,
        }}
      >
        {game.teams[s].abbr}
      </div>
      <div style={{ display: "flex", marginTop: 20, fontSize: 40, fontWeight: 700 }}>{game.teams[s].name}</div>
      <div style={{ display: "flex", fontSize: 140, fontWeight: 800 }}>{game.status === "scheduled" ? "-" : score[s]}</div>
    </div>
  );
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: colors.ink, color: "#fff", padding: 60 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 32 }}>
          <span style={{ display: "flex", fontWeight: 800 }}>BASKET LOG</span>
          <span style={{ display: "flex" }}>{status}{game.competition ? ` · ${game.competition}` : ""}</span>
        </div>
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "space-between" }}>
          {side("home")}
          <div style={{ display: "flex", fontSize: 40 }}>vs</div>
          {side("away")}
        </div>
      </div>
    ),
    size,
  );
}
