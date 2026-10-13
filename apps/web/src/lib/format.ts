/** m:ss for a game clock in milliseconds. */
export function formatClock(clockMs: number): string {
  const total = Math.max(0, Math.ceil(clockMs / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
