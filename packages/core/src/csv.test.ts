import { describe, expect, it } from 'vitest';
import type { PlayerLine } from './derive';
import { boxScoreCsv } from './csv';

const line = (over: Partial<PlayerLine>): PlayerLine => ({
  pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, tov: 0, pf: 0, ...over,
});

const HEADER = 'Team,#,Player,Starter,PTS,FGM,FGA,FG%,3PM,3PA,3P%,FTM,FTA,FT%,REB,OREB,DREB,AST,STL,BLK,TO,PF,MIN,+/-';

describe('boxScoreCsv', () => {
  const players = [
    { id: 'h1', side: 'home' as const, number: 7, displayName: 'Okafor', starter: true },
    { id: 'h2', side: 'home' as const, number: 3, displayName: 'Reyes, Jr.', starter: false },
    { id: 'a1', side: 'away' as const, number: 10, displayName: 'Duarte', starter: true },
  ];
  const lines = {
    h1: line({ pts: 8, fgm: 3, fga: 5, tpm: 2, tpa: 3, ftm: 0, fta: 0, oreb: 1, dreb: 2, ast: 1, pf: 1 }),
    h2: line({ pts: 2, fgm: 1, fga: 4, ftm: 0, fta: 2, dreb: 1, tov: 1 }),
    a1: line({}),
  };
  const csv = boxScoreCsv({ teams: { home: { name: 'Sporting' }, away: { name: 'Benfica' } }, players, lines });
  const rows = csv.split('\r\n');

  it('starts with the header and writes starters before bench, with CRLF line endings and a trailing newline', () => {
    expect(rows[0]).toBe(HEADER);
    expect(rows[1]).toBe('Sporting,7,Okafor,Yes,8,3,5,60.0,2,3,66.7,0,0,,3,1,2,1,0,0,0,1,,');
    expect(rows[2]).toBe('Sporting,3,"Reyes, Jr.",No,2,1,4,25.0,0,0,,0,2,0.0,1,0,1,0,0,0,1,0,,');
    expect(csv.endsWith('\r\n')).toBe(true);
  });

  it('adds a totals row per team and then the other team', () => {
    expect(rows[3]).toBe('Sporting,,TOTAL,,10,4,9,44.4,2,3,66.7,0,2,0.0,4,1,3,1,0,0,1,1,,');
    expect(rows[4]).toBe('Benfica,10,Duarte,Yes,0,0,0,,0,0,,0,0,,0,0,0,0,0,0,0,0,,');
    expect(rows[5]).toBe('Benfica,,TOTAL,,0,0,0,,0,0,,0,0,,0,0,0,0,0,0,0,0,,');
  });

  it('fills MIN and +/- when playing time is given', () => {
    const out = boxScoreCsv({
      teams: { home: { name: 'Sporting' }, away: { name: 'Benfica' } },
      players,
      lines,
      playing: { h1: { ms: 1_935_000, plusMinus: 5 }, a1: { ms: 0, plusMinus: -5 } },
    }).split('\r\n');
    expect(out[1]!.endsWith(',1,32:15,+5')).toBe(true);
    expect(out[2]!.endsWith(',0,')).toBe(false);
    expect(out[4]!.endsWith(',0:00,-5')).toBe(true);
  });

  it('quotes embedded double quotes', () => {
    const out = boxScoreCsv({
      teams: { home: { name: 'The "Hawks"' }, away: { name: 'B' } },
      players: [{ id: 'h1', side: 'home', number: 1, displayName: 'X', starter: true }],
      lines: { h1: line({}) },
    });
    expect(out.split('\r\n')[1]!.startsWith('"The ""Hawks""",1,X')).toBe(true);
  });
});
