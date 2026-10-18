import { percentage, teamTotals } from './boxscore';
import type { PlayerLine } from './derive';
import { formatMinutes, formatPlusMinus, type PlayingTime } from './minutes';
import type { Side } from './types';

export interface CsvPlayer {
  id: string;
  side: Side;
  number: number;
  displayName: string;
  starter: boolean;
}

export interface BoxScoreCsvInput {
  teams: Record<Side, { name: string }>;
  players: CsvPlayer[];
  lines: Record<string, PlayerLine>;
  /** Minutes and plus/minus; the MIN and +/- columns are blank without it. */
  playing?: Record<string, PlayingTime>;
}

const HEADER = ['Team', '#', 'Player', 'Starter', 'PTS', 'FGM', 'FGA', 'FG%', '3PM', '3PA', '3P%', 'FTM', 'FTA', 'FT%', 'REB', 'OREB', 'DREB', 'AST', 'STL', 'BLK', 'TO', 'PF', 'MIN', '+/-'];

const cell = (value: string | number): string => {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const pct = (made: number, attempts: number) => {
  const value = percentage(made, attempts);
  return value === null ? '' : value.toFixed(1);
};

function statCells(l: PlayerLine): (string | number)[] {
  return [
    l.pts, l.fgm, l.fga, pct(l.fgm, l.fga), l.tpm, l.tpa, pct(l.tpm, l.tpa), l.ftm, l.fta, pct(l.ftm, l.fta),
    l.oreb + l.dreb, l.oreb, l.dreb, l.ast, l.stl, l.blk, l.tov, l.pf,
  ];
}

const timeCells = (t: PlayingTime | undefined): string[] => (t ? [formatMinutes(t.ms), formatPlusMinus(t.plusMinus)] : ['', '']);

const EMPTY: PlayerLine = { pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, tov: 0, pf: 0 };

/** Box score as CSV: home then away, starters first, one TOTAL row per team. CRLF line endings. */
export function boxScoreCsv({ teams, players, lines, playing }: BoxScoreCsvInput): string {
  const rows: (string | number)[][] = [HEADER];
  for (const side of ['home', 'away'] as const) {
    const team = teams[side].name;
    const roster = players.filter((p) => p.side === side);
    const ordered = [...roster.filter((p) => p.starter), ...roster.filter((p) => !p.starter)];
    for (const p of ordered) {
      rows.push([team, p.number, p.displayName, p.starter ? 'Yes' : 'No', ...statCells(lines[p.id] ?? EMPTY), ...timeCells(playing?.[p.id])]);
    }
    rows.push([team, '', 'TOTAL', '', ...statCells(teamTotals(roster.map((p) => lines[p.id] ?? EMPTY))), '', '']);
  }
  return rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}
