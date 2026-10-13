export function TeamChip({ abbr, color, size = 44 }: { abbr: string; color: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-display font-extrabold text-card"
      style={{ width: size, height: size, backgroundColor: color, fontSize: Math.round(size * 0.34) }}
    >
      {abbr}
    </span>
  );
}
