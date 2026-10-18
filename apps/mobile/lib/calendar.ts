/** Pure helpers for the in-app date and time pickers. Months are 0-based, as in Date. */

export const HOURS = Array.from({ length: 24 }, (_, i) => i);
export const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

const pad = (n: number) => String(n).padStart(2, '0');

/** Weeks (Monday first) of a month; days outside the month are null. */
export function monthGrid(year: number, month: number): (number | null)[][] {
  const lead = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

export const toIsoDate = (year: number, month: number, day: number): string => `${year}-${pad(month + 1)}-${pad(day)}`;

export function parseIsoDate(iso: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]) - 1, Number(m[3])];
  const d = new Date(year, month, day);
  return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day ? { year, month, day } : null;
}

export const toHm = (hour: number, minute: number): string => `${pad(hour)}:${pad(minute)}`;

export function parseHm(hm: string): { hour: number; minute: number } | null {
  const m = /^(\d{2}):(\d{2})$/.exec(hm);
  if (!m) return null;
  const [hour, minute] = [Number(m[1]), Number(m[2])];
  return hour <= 23 && minute <= 59 ? { hour, minute } : null;
}
