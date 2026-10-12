import { describe, expect, it } from 'vitest';
import { derive, type DeriveSetup } from './derive';
import { ROSTER, setup } from './test-helpers';

const NAMES: Record<string, string> = {
  h1: 'Okafor', h2: 'Reyes', h3: 'Dias', h4: 'Lima', h5: 'Costa', h6: 'Pinto', h7: 'Silva',
  a1: 'Malundo', a2: 'Amorim', a3: 'Esteves', a4: 'Baza', a5: 'Diniz', a6: 'Zajicek',
};

const SETUP: DeriveSetup = {
  teams: { home: { shortName: 'Sporting' }, away: { shortName: 'Benfica' } },
  players: Object.fromEntries(Object.entries(NAMES).map(([id, displayName]) => [id, { displayName }])),
  roster: ROSTER,
};

/** A small game: a fast-break 3 with an assist, a missed 2 rebounded, a foul with 2 FTs, and a voided play. */
function playGame() {
  const t = setup();
  t.send({ type: 'shot', side: 'home', playerId: 'h1', points: 3, made: true, x: 250, y: 300, distanceFt: 26 });
  t.send({ type: 'answer', optionId: 'yes' });
  t.send({ type: 'answer', optionId: 'player:h2' });

  t.send({ type: 'shot', side: 'away', playerId: 'a1', points: 2, made: false });
  t.send({ type: 'answer', optionId: 'no' });
  t.send({ type: 'answer', optionId: 'none' });
  t.send({ type: 'answer', optionId: 'def:player:h3' });

  t.send({ type: 'foul', side: 'away', playerId: 'a2' });
  t.send({ type: 'answer', optionId: 'player:h1' });
  t.send({ type: 'answer', optionId: '2' });
  t.send({ type: 'answer', optionId: 'made' });
  t.send({ type: 'answer', optionId: 'missed' });
  t.send({ type: 'answer', optionId: 'skip' });

  t.send({ type: 'shot', side: 'away', playerId: 'a5', points: 3, made: true });
  t.send({ type: 'cancel' });
  return t.state.events;
}

describe('derive: stats', () => {
  it('computes score, team fouls, and per-player lines, ignoring voided plays', () => {
    const d = derive(playGame(), SETUP);

    expect(d.score).toEqual({ home: 4, away: 0 });
    expect(d.teamFouls).toEqual({ home: 0, away: 1 });
    expect(d.players.h1).toMatchObject({ pts: 4, fgm: 1, fga: 1, tpm: 1, tpa: 1, ftm: 1, fta: 2 });
    expect(d.players.h2).toMatchObject({ ast: 1, pts: 0 });
    expect(d.players.h3).toMatchObject({ dreb: 1, oreb: 0 });
    expect(d.players.a1).toMatchObject({ fga: 1, fgm: 0, pts: 0 });
    expect(d.players.a2).toMatchObject({ pf: 1 });
    expect(d.players.a5).toMatchObject({ fga: 0, tpa: 0, pts: 0 });
  });

  it('counts team fouls for the current period only', () => {
    const t = setup();
    t.send({ type: 'foul', side: 'away', playerId: 'a1' });
    t.send({ type: 'done' });
    t.send({ type: 'setPeriod', period: 2 });
    t.send({ type: 'foul', side: 'away', playerId: 'a2' });
    t.send({ type: 'done' });

    expect(derive(t.state.events, SETUP).teamFouls.away).toBe(1);
    expect(derive(t.state.events, { ...SETUP, period: 1 }).teamFouls.away).toBe(1);
    expect(derive(t.state.events, SETUP).players.a1).toMatchObject({ pf: 1 });
  });

  it('keeps the on-court lineup after substitutions and lists shot locations', () => {
    const t = setup();
    t.send({ type: 'sub', side: 'home', outPlayerId: 'h1' });
    t.send({ type: 'answer', optionId: 'player:h6' });
    t.send({ type: 'shot', side: 'home', playerId: 'h2', points: 2, made: true, x: 240, y: 120, distanceFt: 7 });
    t.send({ type: 'done' });

    const d = derive(t.state.events, SETUP);
    expect(d.onCourt.home).toEqual(['h6', 'h2', 'h3', 'h4', 'h5']);
    expect(d.shots).toEqual([{ playerId: 'h2', side: 'home', made: true, points: 2, x: 240, y: 120, distanceFt: 7 }]);
  });
});

describe('derive: play-by-play', () => {
  it('groups chained events into one line per play with the running score', () => {
    const { plays } = derive(playGame(), SETUP);

    expect(plays.map((p) => p.text)).toEqual([
      'Okafor makes 3PT (26 ft) · fast break → Assist: Reyes',
      'Malundo misses 2PT → Def. rebound: Dias',
      'Foul on Amorim → Okafor makes free throw → Okafor misses free throw',
    ]);
    expect(plays.map((p) => p.scoreAfter)).toEqual([
      { home: 3, away: 0 },
      { home: 3, away: 0 },
      { home: 4, away: 0 },
    ]);
    expect(plays[0]).toMatchObject({ side: 'home', period: 1, points: 3 });
    expect(plays[2]).toMatchObject({ side: 'away', points: 1 });
  });

  it('words team-level, substitution, timeout and block events', () => {
    const t = setup({ tracking: { away: 'team_only' }, rules: { askFastBreak: false } });
    t.send({ type: 'shot', side: 'away', playerId: null, points: 3, made: true });
    t.send({ type: 'timeout', side: 'home' });
    t.send({ type: 'sub', side: 'home', outPlayerId: 'h1' });
    t.send({ type: 'answer', optionId: 'player:h6' });
    t.send({ type: 'shot', side: 'home', playerId: 'h2', points: 2, made: false });
    t.send({ type: 'answer', optionId: 'team' });
    t.send({ type: 'answer', optionId: 'def:team' });
    t.send({ type: 'turnover', side: 'away', playerId: null });
    t.send({ type: 'answer', optionId: 'player:h3' });

    expect(derive(t.state.events, SETUP).plays.map((p) => p.text)).toEqual([
      'Benfica makes 3PT',
      'Sporting timeout',
      'Pinto in for Okafor',
      'Reyes misses 2PT → Blocked by Benfica → Benfica team rebound',
      'Benfica turnover → Steal: Dias',
    ]);
  });
});
