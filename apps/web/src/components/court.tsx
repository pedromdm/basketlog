import { court } from "@basket-log/ui";

export interface CourtDot {
  x: number;
  y: number;
  made: boolean;
  /** CSS colour (a theme variable, e.g. var(--green)). */
  color: string;
}

const { width, height, basket, threePointRadius: R, cornerX, paint } = court;
const FT_CIRCLE_RADIUS = 60;
const RESTRICTED_RADIUS = 40;
// where the 3PT arc meets the corner lines
const cornerArcY = basket.y + Math.sqrt(R * R - (basket.x - cornerX.left) ** 2);
const BANDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/** Half court in court units (500 x 470, basket at 250, 52.5). Server-renderable; dots are drawn as made (filled) or missed (ring). */
export function Court({ dots = [], dotRadius = 8, className }: { dots?: CourtDot[]; dotRadius?: number; className?: string }) {
  const line = { stroke: "white", strokeWidth: court.lineWidth, fill: "none" } as const;
  const keyMid = paint.x + paint.width / 2;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} role="img" aria-label="Half court shot chart">
      <rect width={width} height={height} fill="var(--wood)" />
      {BANDS.map((i) =>
        i % 2 ? <rect key={i} x={i * (width / BANDS.length)} width={width / BANDS.length} height={height} fill="var(--wood-shadow)" opacity={0.22} /> : null,
      )}
      <rect x={paint.x} y={paint.y} width={paint.width} height={paint.height} fill="var(--green)" opacity={0.9} />
      <g {...line}>
        <rect x={paint.x} y={paint.y} width={paint.width} height={paint.height} />
        <path d={`M ${keyMid - FT_CIRCLE_RADIUS} ${paint.height} A ${FT_CIRCLE_RADIUS} ${FT_CIRCLE_RADIUS} 0 0 0 ${keyMid + FT_CIRCLE_RADIUS} ${paint.height}`} />
        <path d={`M ${basket.x - RESTRICTED_RADIUS} ${basket.y} A ${RESTRICTED_RADIUS} ${RESTRICTED_RADIUS} 0 0 0 ${basket.x + RESTRICTED_RADIUS} ${basket.y}`} />
        <path d={`M ${cornerX.left} 0 V ${cornerArcY} A ${R} ${R} 0 0 0 ${cornerX.right} ${cornerArcY} V 0`} />
        <line x1={basket.x - 30} x2={basket.x + 30} y1={40} y2={40} />
      </g>
      <circle cx={basket.x} cy={basket.y} r={7.5} stroke="white" strokeWidth={court.lineWidth} fill="none" />
      {dots.map((d, i) =>
        d.made ? (
          <circle key={i} cx={d.x} cy={d.y} r={dotRadius} fill={d.color} stroke="white" strokeWidth={2} opacity={0.95} />
        ) : (
          <circle key={i} cx={d.x} cy={d.y} r={dotRadius} fill="white" fillOpacity={0.35} stroke={d.color} strokeWidth={3} />
        ),
      )}
    </svg>
  );
}
