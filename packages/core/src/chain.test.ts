import { describe, expect, it } from 'vitest';
import { activeEvents, courtAfter } from './derive';
import { foulsOf, initTracker, pendingFoulOutSub, teamBelowMinimum } from './chain';
import { FIBA_RULES } from './rules';
import { ROSTER, setup } from './test-helpers';

describe('made shot', () => {
  it('logs the shot, resets the shot clock and ends the play when follow-up questions are off', () => {
    const t = setup({ rules: { askFastBreak: false, askAssist: false } });
    t.send({ type: 'setClock', clockMs: 480_000, shotClockMs: 9_000 });

    const r = t.send({ type: 'shot', side: 'home', playerId: 'h1', points: 2, made: true });

    expect(r.emittedEvents).toHaveLength(1);
    expect(r.emittedEvents[0]).toMatchObject({
      type: 'shot', side: 'home', playerId: 'h1', points: 2, made: true, period: 1, clockMs: 480_000,
    });
    expect(r.nextPrompt).toBeNull();
    expect(r.state.shotClockMs).toBe(24_000);
  });
});

describe('made shot chain', () => {
  it('asks fast break, then assist (teammates on court only), and logs each answer', () => {
    const t = setup();

    const asked = t.send({ type: 'shot', side: 'home', playerId: 'h1', points: 3, made: true, x: 250, y: 300, distanceFt: 26 });
    expect(asked.emittedEvents).toEqual([
      expect.objectContaining({ type: 'shot', playerId: 'h1', points: 3, made: true, x: 250, y: 300, distanceFt: 26 }),
    ]);
    expect(asked.nextPrompt).toMatchObject({ kind: 'fastBreak', title: 'Was it a fast break?' });
    expect(asked.nextPrompt?.options.map((o) => o.id)).toEqual(['yes', 'no']);

    const assist = t.send({ type: 'answer', optionId: 'yes' });
    expect(assist.emittedEvents).toEqual([
      expect.objectContaining({ type: 'fb', side: 'home', playerId: 'h1', fastBreak: true }),
    ]);
    expect(assist.nextPrompt).toMatchObject({ kind: 'assist', title: 'Assisted by?' });
    expect(assist.nextPrompt?.options.map((o) => o.id)).toEqual(['player:h2', 'player:h3', 'player:h4', 'player:h5', 'none']);

    const done = t.send({ type: 'answer', optionId: 'player:h2' });
    expect(done.emittedEvents).toEqual([expect.objectContaining({ type: 'ast', side: 'home', playerId: 'h2' })]);
    expect(done.nextPrompt).toBeNull();
    const groups = new Set(t.state.events.map((e) => e.groupId));
    expect(groups.size).toBe(1);
  });

  it('keeps the shot unassisted when "No assist" is chosen and records fastBreak=false', () => {
    const t = setup();
    t.send({ type: 'shot', side: 'home', playerId: 'h1', points: 2, made: true });
    t.send({ type: 'answer', optionId: 'no' });
    const done = t.send({ type: 'answer', optionId: 'none' });

    expect(done.emittedEvents).toEqual([]);
    expect(done.nextPrompt).toBeNull();
    expect(t.state.events).toEqual([
      expect.objectContaining({ type: 'shot' }),
      expect.objectContaining({ type: 'fb', fastBreak: false }),
    ]);
  });
});

describe('missed shot chain', () => {
  it('asks fast break, blocked by (opponents on court), then rebound with all ten players and team options', () => {
    const t = setup();
    t.send({ type: 'shot', side: 'home', playerId: 'h1', points: 3, made: false });
    const block = t.send({ type: 'answer', optionId: 'no' });

    expect(block.emittedEvents).toEqual([expect.objectContaining({ type: 'fb', fastBreak: false })]);
    expect(block.nextPrompt).toMatchObject({ kind: 'block', title: 'Was it blocked?' });
    expect(block.nextPrompt?.options.map((o) => o.id)).toEqual([
      'player:a1', 'player:a2', 'player:a3', 'player:a4', 'player:a5', 'none',
    ]);

    const rebound = t.send({ type: 'answer', optionId: 'player:a3' });
    expect(rebound.emittedEvents).toEqual([expect.objectContaining({ type: 'blk', side: 'away', playerId: 'a3' })]);
    expect(rebound.nextPrompt).toMatchObject({ kind: 'rebound', title: 'Who got the rebound?' });
    expect(rebound.nextPrompt?.options.map((o) => o.id)).toEqual([
      'off:player:h1', 'off:player:h2', 'off:player:h3', 'off:player:h4', 'off:player:h5',
      'def:player:a1', 'def:player:a2', 'def:player:a3', 'def:player:a4', 'def:player:a5',
      'off:team', 'def:team', 'skip',
    ]);
  });

  it('a defensive rebound resets the shot clock to 24 and an offensive one to 14', () => {
    const def = setup({ rules: { askFastBreak: false } });
    def.send({ type: 'setClock', clockMs: 300_000, shotClockMs: 3_000 });
    def.send({ type: 'shot', side: 'home', playerId: 'h1', points: 2, made: false });
    def.send({ type: 'answer', optionId: 'none' });
    const d = def.send({ type: 'answer', optionId: 'def:player:a2' });
    expect(d.emittedEvents).toEqual([
      expect.objectContaining({ type: 'reb', side: 'away', playerId: 'a2', offensive: false }),
    ]);
    expect(d.nextPrompt).toBeNull();
    expect(d.state.shotClockMs).toBe(24_000);

    const off = setup({ rules: { askFastBreak: false } });
    off.send({ type: 'shot', side: 'home', playerId: 'h1', points: 2, made: false });
    off.send({ type: 'answer', optionId: 'none' });
    const o = off.send({ type: 'answer', optionId: 'off:team' });
    expect(o.emittedEvents).toEqual([
      expect.objectContaining({ type: 'reb', side: 'home', playerId: null, offensive: true }),
    ]);
    expect(o.state.shotClockMs).toBe(14_000);
  });

  it('"Skip" ends the play without a rebound', () => {
    const t = setup({ rules: { askFastBreak: false } });
    t.send({ type: 'shot', side: 'home', playerId: 'h1', points: 2, made: false });
    t.send({ type: 'answer', optionId: 'none' });
    const r = t.send({ type: 'answer', optionId: 'skip' });
    expect(r.emittedEvents).toEqual([]);
    expect(r.nextPrompt).toBeNull();
    expect(r.state.chain).toBeNull();
  });
});

describe('standalone free throw', () => {
  it('a made free throw is logged as 1 point and ends the play', () => {
    const t = setup();
    const r = t.send({ type: 'ft', side: 'home', playerId: 'h2', made: true });
    expect(r.emittedEvents).toEqual([expect.objectContaining({ type: 'ft', side: 'home', playerId: 'h2', points: 1, made: true })]);
    expect(r.nextPrompt).toBeNull();
  });

  it('a missed free throw goes to the rebound question with the shooter\'s team on offence', () => {
    const t = setup();
    const r = t.send({ type: 'ft', side: 'home', playerId: 'h2', made: false });
    expect(r.emittedEvents).toEqual([expect.objectContaining({ type: 'ft', made: false })]);
    expect(r.nextPrompt?.kind).toBe('rebound');

    const reb = t.send({ type: 'answer', optionId: 'def:player:a4' });
    expect(reb.emittedEvents).toEqual([expect.objectContaining({ type: 'reb', side: 'away', playerId: 'a4', offensive: false })]);
  });
});

describe('turnover', () => {
  it('asks who stole it (opponents on court), logs the steal, and resets the shot clock', () => {
    const t = setup();
    t.send({ type: 'setClock', clockMs: 200_000, shotClockMs: 5_000 });
    const asked = t.send({ type: 'turnover', side: 'home', playerId: 'h3' });

    expect(asked.emittedEvents).toEqual([expect.objectContaining({ type: 'tov', side: 'home', playerId: 'h3' })]);
    expect(asked.state.shotClockMs).toBe(24_000);
    expect(asked.nextPrompt).toMatchObject({ kind: 'steal', title: 'Stolen by?' });
    expect(asked.nextPrompt?.options.map((o) => o.id)).toEqual([
      'player:a1', 'player:a2', 'player:a3', 'player:a4', 'player:a5', 'none',
    ]);

    const done = t.send({ type: 'answer', optionId: 'player:a2' });
    expect(done.emittedEvents).toEqual([expect.objectContaining({ type: 'stl', side: 'away', playerId: 'a2' })]);
    expect(done.nextPrompt).toBeNull();
  });

  it('"No steal" just ends the play', () => {
    const t = setup();
    t.send({ type: 'turnover', side: 'home', playerId: 'h3' });
    const done = t.send({ type: 'answer', optionId: 'none' });
    expect(done.emittedEvents).toEqual([]);
    expect(done.nextPrompt).toBeNull();
  });
});

describe('foul', () => {
  it('stops the clock, asks who was fouled, how many free throws, then each attempt; a miss on the last goes to rebound', () => {
    const t = setup();
    t.send({ type: 'startClock' });
    const fouled = t.send({ type: 'foul', side: 'away', playerId: 'a2' });

    expect(fouled.emittedEvents).toEqual([expect.objectContaining({ type: 'foul', side: 'away', playerId: 'a2' })]);
    expect(fouled.state.clockRunning).toBe(false);
    expect(fouled.nextPrompt).toMatchObject({ kind: 'fouled', title: 'Who was fouled?' });
    expect(fouled.nextPrompt?.options.map((o) => o.id)).toEqual(['player:h1', 'player:h2', 'player:h3', 'player:h4', 'player:h5', 'none']);

    const count = t.send({ type: 'answer', optionId: 'player:h3' });
    expect(count.emittedEvents).toEqual([]);
    expect(count.nextPrompt).toMatchObject({ kind: 'ftCount' });
    expect(count.nextPrompt?.options.map((o) => o.id)).toEqual(['1', '2', '3', 'none']);

    const first = t.send({ type: 'answer', optionId: '2' });
    expect(first.nextPrompt).toMatchObject({ kind: 'ft' });
    expect(first.nextPrompt?.options.map((o) => o.id)).toEqual(['made', 'missed']);

    const second = t.send({ type: 'answer', optionId: 'made' });
    expect(second.emittedEvents).toEqual([expect.objectContaining({ type: 'ft', side: 'home', playerId: 'h3', points: 1, made: true })]);
    expect(second.nextPrompt).toMatchObject({ kind: 'ft' });

    const rebound = t.send({ type: 'answer', optionId: 'missed' });
    expect(rebound.emittedEvents).toEqual([expect.objectContaining({ type: 'ft', made: false })]);
    expect(rebound.nextPrompt).toMatchObject({ kind: 'rebound' });
    expect(new Set(t.state.events.map((e) => e.groupId)).size).toBe(1);
  });

  it('a made last free throw ends the play and "No free throws" ends it straight away', () => {
    const t = setup();
    t.send({ type: 'foul', side: 'away', playerId: 'a2' });
    t.send({ type: 'answer', optionId: 'player:h1' });
    t.send({ type: 'answer', optionId: '1' });
    const done = t.send({ type: 'answer', optionId: 'made' });
    expect(done.nextPrompt).toBeNull();

    t.send({ type: 'foul', side: 'home', playerId: 'h5' });
    t.send({ type: 'answer', optionId: 'player:a1' });
    const none = t.send({ type: 'answer', optionId: 'none' });
    expect(none.emittedEvents).toEqual([]);
    expect(none.nextPrompt).toBeNull();
  });

  it('keeps the clock running when the stopClockOnFoul rule is off', () => {
    const t = setup({ rules: { stopClockOnFoul: false } });
    t.send({ type: 'startClock' });
    const r = t.send({ type: 'foul', side: 'away', playerId: 'a2' });
    expect(r.state.clockRunning).toBe(true);
  });
});

describe('substitution', () => {
  it('offers the bench, logs the sub, and later prompts use the new lineup', () => {
    const t = setup({ rules: { askFastBreak: false } });
    const asked = t.send({ type: 'sub', side: 'home', outPlayerId: 'h1' });
    expect(asked.emittedEvents).toEqual([]);
    expect(asked.nextPrompt).toMatchObject({ kind: 'sub' });
    expect(asked.nextPrompt?.options.map((o) => o.id)).toEqual(['player:h6', 'player:h7']);

    const done = t.send({ type: 'answer', optionId: 'player:h6' });
    expect(done.emittedEvents).toEqual([
      expect.objectContaining({ type: 'sub', side: 'home', playerId: 'h1', outPlayerId: 'h1', inPlayerId: 'h6' }),
    ]);
    expect(done.nextPrompt).toBeNull();

    const assist = t.send({ type: 'shot', side: 'home', playerId: 'h2', points: 2, made: true });
    expect(assist.nextPrompt?.options.map((o) => o.id)).toEqual(['player:h6', 'player:h3', 'player:h4', 'player:h5', 'none']);
  });

  it('the player who went out becomes available from the bench', () => {
    const t = setup();
    t.send({ type: 'sub', side: 'home', outPlayerId: 'h1' });
    t.send({ type: 'answer', optionId: 'player:h6' });
    const again = t.send({ type: 'sub', side: 'home', outPlayerId: 'h2' });
    expect(again.nextPrompt?.options.map((o) => o.id)).toEqual(['player:h1', 'player:h7']);
  });
});

describe('timeout', () => {
  it('logs a team-level timeout and stops the clock', () => {
    const t = setup();
    t.send({ type: 'startClock' });
    const r = t.send({ type: 'timeout', side: 'away' });
    expect(r.emittedEvents).toEqual([expect.objectContaining({ type: 'timeout', side: 'away', playerId: null })]);
    expect(r.state.clockRunning).toBe(false);
    expect(r.nextPrompt).toBeNull();
  });
});

describe('one-tap events', () => {
  it.each([
    ['oreb', { type: 'reb', offensive: true }, 14_000],
    ['dreb', { type: 'reb', offensive: false }, 24_000],
    ['stl', { type: 'stl' }, 24_000],
    ['ast', { type: 'ast' }, 7_000],
    ['blk', { type: 'blk' }, 7_000],
  ] as const)('%s logs one event with its own play and sets the shot clock', (event, expected, shotClock) => {
    const t = setup();
    t.send({ type: 'setClock', clockMs: 100_000, shotClockMs: 7_000 });
    const r = t.send({ type: 'quick', event, side: 'away', playerId: 'a4' });
    expect(r.emittedEvents).toEqual([expect.objectContaining({ ...expected, side: 'away', playerId: 'a4' })]);
    expect(r.nextPrompt).toBeNull();
    expect(r.state.shotClockMs).toBe(shotClock);
  });
});

describe('undo', () => {
  it('voids the whole last play with one void event, then the one before it', () => {
    const t = setup({ rules: { askFastBreak: false } });
    t.send({ type: 'shot', side: 'home', playerId: 'h1', points: 2, made: true });
    t.send({ type: 'answer', optionId: 'player:h2' });
    t.send({ type: 'quick', event: 'dreb', side: 'away', playerId: 'a1' });
    const [shot, , dreb] = t.state.events;

    const first = t.send({ type: 'undo' });
    expect(first.emittedEvents).toEqual([expect.objectContaining({ type: 'void', voidsGroupId: dreb!.groupId })]);

    const second = t.send({ type: 'undo' });
    expect(second.emittedEvents).toEqual([expect.objectContaining({ type: 'void', voidsGroupId: shot!.groupId })]);

    const none = t.send({ type: 'undo' });
    expect(none.emittedEvents).toEqual([]);
  });

  it('undoing a substitution restores the previous lineup', () => {
    const t = setup();
    t.send({ type: 'sub', side: 'home', outPlayerId: 'h1' });
    t.send({ type: 'answer', optionId: 'player:h6' });
    t.send({ type: 'undo' });
    const r = t.send({ type: 'sub', side: 'home', outPlayerId: 'h2' });
    expect(r.nextPrompt?.options.map((o) => o.id)).toEqual(['player:h6', 'player:h7']);
  });
});

describe('cancel play', () => {
  it('voids what was already logged for the play in progress and closes the chain', () => {
    const t = setup();
    t.send({ type: 'shot', side: 'home', playerId: 'h1', points: 2, made: true });
    t.send({ type: 'answer', optionId: 'no' });
    const r = t.send({ type: 'cancel' });
    expect(r.emittedEvents).toEqual([expect.objectContaining({ type: 'void', voidsGroupId: t.state.events[0]!.groupId })]);
    expect(r.nextPrompt).toBeNull();
    expect(r.state.chain).toBeNull();
  });

  it('voids the shot even when cancelling at the very first question', () => {
    const t = setup();
    t.send({ type: 'shot', side: 'home', playerId: 'h1', points: 2, made: true });
    const r = t.send({ type: 'cancel' });
    expect(r.emittedEvents).toEqual([expect.objectContaining({ type: 'void', voidsGroupId: t.state.events[0]!.groupId })]);
    expect(activeEvents(r.state.events)).toEqual([]);
    expect(r.state.chain).toBeNull();
  });

  it('emits nothing when the play has not logged anything yet', () => {
    const t = setup();
    t.send({ type: 'sub', side: 'home', outPlayerId: 'h1' });
    const r = t.send({ type: 'cancel' });
    expect(r.emittedEvents).toEqual([]);
    expect(r.state.events).toEqual([]);
    expect(r.state.chain).toBeNull();
  });
});

describe('done and busy', () => {
  it('"Done" keeps what has been answered so far and closes the play', () => {
    const t = setup();
    t.send({ type: 'shot', side: 'home', playerId: 'h1', points: 3, made: false });
    t.send({ type: 'answer', optionId: 'yes' });
    const r = t.send({ type: 'done' });
    expect(r.emittedEvents).toEqual([]);
    expect(r.nextPrompt).toBeNull();
    expect(r.state.chain).toBeNull();
    expect(t.state.events).toEqual([
      expect.objectContaining({ type: 'shot', made: false }),
      expect.objectContaining({ type: 'fb', fastBreak: true }),
    ]);
  });

  it('"Done" before the fast-break answer keeps the shot that was already logged', () => {
    const t = setup();
    t.send({ type: 'shot', side: 'home', playerId: 'h1', points: 2, made: true });
    const r = t.send({ type: 'done' });
    expect(r.emittedEvents).toEqual([]);
    expect(r.state.chain).toBeNull();
    expect(t.state.events).toEqual([expect.objectContaining({ type: 'shot', made: true })]);
  });

  it('ignores new plays while one is in progress', () => {
    const t = setup();
    t.send({ type: 'shot', side: 'home', playerId: 'h1', points: 2, made: true });
    const before = t.state;
    const r = t.send({ type: 'quick', event: 'dreb', side: 'away', playerId: 'a1' });
    expect(r.emittedEvents).toEqual([]);
    expect(r.state).toBe(before);
    expect(r.nextPrompt).toMatchObject({ kind: 'fastBreak' });
  });
});

describe('undo during a play', () => {
  it('cancels the play in progress instead of reaching back to the previous play', () => {
    const t = setup({ rules: { askFastBreak: false, askAssist: false } });
    t.send({ type: 'shot', side: 'home', playerId: 'h1', points: 2, made: true });
    t.send({ type: 'shot', side: 'away', playerId: 'a1', points: 2, made: false });
    const r = t.send({ type: 'undo' });

    expect(r.state.chain).toBeNull();
    expect(r.emittedEvents).toEqual([expect.objectContaining({ type: 'void', voidsGroupId: t.state.events[1]!.groupId })]);
  });

  it('with nothing logged yet, it just discards the play in progress', () => {
    const t = setup();
    t.send({ type: 'quick', event: 'ast', side: 'home', playerId: 'h2' });
    t.send({ type: 'sub', side: 'home', outPlayerId: 'h1' });
    const r = t.send({ type: 'undo' });
    expect(r.emittedEvents).toEqual([]);
    expect(r.state.chain).toBeNull();
    expect(activeEvents(r.state.events)).toHaveLength(1);
  });
});

describe('team-only tracking', () => {
  it('a team-only side makes shots with no fast-break or assist questions', () => {
    const t = setup({ tracking: { away: 'team_only' } });
    const r = t.send({ type: 'shot', side: 'away', playerId: null, points: 3, made: true });
    expect(r.emittedEvents).toEqual([expect.objectContaining({ type: 'shot', side: 'away', playerId: null, points: 3, made: true })]);
    expect(r.nextPrompt).toBeNull();
  });

  it('a team-only miss skips fast break and goes to block, then rebound with only team options for that side', () => {
    const t = setup({ tracking: { away: 'team_only' } });
    const block = t.send({ type: 'shot', side: 'away', playerId: null, points: 2, made: false });
    expect(block.emittedEvents).toHaveLength(1);
    expect(block.nextPrompt).toMatchObject({ kind: 'block' });
    expect(block.nextPrompt?.options.map((o) => o.id)).toEqual(['player:h1', 'player:h2', 'player:h3', 'player:h4', 'player:h5', 'none']);

    const rebound = t.send({ type: 'answer', optionId: 'none' });
    expect(rebound.nextPrompt?.options.map((o) => o.id)).toEqual([
      'def:player:h1', 'def:player:h2', 'def:player:h3', 'def:player:h4', 'def:player:h5', 'off:team', 'def:team', 'skip',
    ]);
  });

  it('blocks by a team-only side are a single team option', () => {
    const t = setup({ tracking: { away: 'team_only' }, rules: { askFastBreak: false } });
    const block = t.send({ type: 'shot', side: 'home', playerId: 'h1', points: 2, made: false });
    expect(block.nextPrompt?.options.map((o) => o.id)).toEqual(['team', 'none']);
    const r = t.send({ type: 'answer', optionId: 'team' });
    expect(r.emittedEvents).toEqual([expect.objectContaining({ type: 'blk', side: 'away', playerId: null })]);
    expect(r.nextPrompt?.options.map((o) => o.id)).toEqual([
      'off:player:h1', 'off:player:h2', 'off:player:h3', 'off:player:h4', 'off:player:h5', 'off:team', 'def:team', 'skip',
    ]);
  });

  it('a turnover by the team-only side still asks who stole it; against it, no steal is asked', () => {
    const t = setup({ tracking: { away: 'team_only' } });
    const asked = t.send({ type: 'turnover', side: 'away', playerId: null });
    expect(asked.nextPrompt?.options.map((o) => o.id)).toEqual(['player:h1', 'player:h2', 'player:h3', 'player:h4', 'player:h5', 'none']);
    t.send({ type: 'answer', optionId: 'none' });

    const against = t.send({ type: 'turnover', side: 'home', playerId: 'h2' });
    expect(against.emittedEvents).toEqual([expect.objectContaining({ type: 'tov', playerId: 'h2' })]);
    expect(against.nextPrompt).toBeNull();
  });

  it('a foul on a team-only side skips "who was fouled" and shoots team-level free throws', () => {
    const t = setup({ tracking: { away: 'team_only' } });
    const count = t.send({ type: 'foul', side: 'home', playerId: 'h4' });
    expect(count.nextPrompt).toMatchObject({ kind: 'ftCount' });
    const ft = t.send({ type: 'answer', optionId: '1' });
    expect(ft.nextPrompt).toMatchObject({ kind: 'ft' });
    const made = t.send({ type: 'answer', optionId: 'made' });
    expect(made.emittedEvents).toEqual([expect.objectContaining({ type: 'ft', side: 'away', playerId: null, made: true })]);
  });

  it('ignores substitutions on a team-only side', () => {
    const t = setup({ tracking: { away: 'team_only' } });
    const r = t.send({ type: 'sub', side: 'away', outPlayerId: 'a1' });
    expect(r.nextPrompt).toBeNull();
    expect(r.state.chain).toBeNull();
  });
});

describe('resuming a game', () => {
  it('seeds the tracker from existing events: keeps them, continues the sequence and the period', () => {
    const first = setup();
    first.send({ type: 'setPeriod', period: 2 });
    first.send({ type: 'shot', side: 'home', playerId: 'h1', points: 2, made: true });
    first.send({ type: 'done' });
    const saved = first.state.events;

    const state = initTracker({
      gameId: 'g1', rules: FIBA_RULES, tracking: { home: 'full', away: 'full' }, roster: ROSTER, events: saved,
    });
    expect(state.events).toEqual(saved);
    expect(state.period).toBe(2);
    expect(state.nextSeq).toBe(saved.length + 1);
  });
});

describe('syncEvents (a second device scoring the same game)', () => {
  /** Events as another device would have saved them: its own ids, same game. */
  function remoteEvents(period = 1) {
    const other = setup({ rules: { askFastBreak: false, askAssist: false } });
    if (period > 1) other.send({ type: 'setPeriod', period });
    other.send({ type: 'setClock', clockMs: 300_000 });
    other.send({ type: 'shot', side: 'away', playerId: 'a1', points: 3, made: true });
    return other.state.events.map((e) => ({ ...e, id: `r-${e.id}`, groupId: `r-${e.groupId}` }));
  }

  it('adds the other device\'s events and keeps local ones the server does not list yet', () => {
    const t = setup({ rules: { askFastBreak: false, askAssist: false } });
    t.send({ type: 'shot', side: 'home', playerId: 'h1', points: 2, made: true });
    const local = t.state.events;

    t.send({ type: 'syncEvents', events: remoteEvents() });

    expect(t.state.events.map((e) => e.id)).toEqual([remoteEvents()[0]!.id, ...local.map((e) => e.id)]);
    expect(t.send({ type: 'syncEvents', events: remoteEvents() }).state.events).toHaveLength(2);
  });

  it('never moves the sequence number backwards, so new events do not reuse a seq', () => {
    const t = setup({ rules: { askFastBreak: false, askAssist: false } });
    t.send({ type: 'syncEvents', events: remoteEvents() });
    const r = t.send({ type: 'shot', side: 'home', playerId: 'h1', points: 2, made: true });
    expect(r.emittedEvents[0]!.seq).toBeGreaterThan(Math.max(...remoteEvents().map((e) => e.seq)));
  });

  it('follows a later period and an advanced clock, but not while the local clock runs', () => {
    const t = setup();
    t.send({ type: 'syncEvents', events: remoteEvents(2) });
    expect(t.state).toMatchObject({ period: 2, clockMs: 300_000, clockRunning: false });

    const running = setup();
    running.send({ type: 'setClock', clockMs: 500_000 });
    running.send({ type: 'startClock' });
    running.send({ type: 'syncEvents', events: remoteEvents() });
    expect(running.state.clockMs).toBe(500_000);
  });

  it('keeps an open play and its prompt untouched', () => {
    const t = setup();
    t.send({ type: 'shot', side: 'home', playerId: 'h1', points: 3, made: true });
    const chain = t.state.chain;
    t.send({ type: 'syncEvents', events: remoteEvents() });
    expect(t.state.chain).toEqual(chain);
  });
});

describe('askBlock rule', () => {
  it('goes straight to the rebound after a miss when the block question is off', () => {
    const t = setup({ rules: { askFastBreak: false, askBlock: false } });
    const r = t.send({ type: 'shot', side: 'home', playerId: 'h1', points: 2, made: false });
    expect(r.nextPrompt).toMatchObject({ kind: 'rebound' });
    expect(r.emittedEvents.map((e) => e.type)).toEqual(['shot']);
  });

  it('still asks about a block when the rule is on or missing (older games)', () => {
    for (const askBlock of [true, undefined]) {
      const t = setup({ rules: { askFastBreak: false, ...(askBlock === undefined ? {} : { askBlock }) } });
      const r = t.send({ type: 'shot', side: 'home', playerId: 'h1', points: 2, made: false });
      expect(r.nextPrompt).toMatchObject({ kind: 'block' });
    }
  });
});

describe('foul out', () => {
  function foulUp(t: ReturnType<typeof setup>, playerId: string, times: number) {
    for (let i = 0; i < times; i++) {
      t.send({ type: 'foul', side: 'home', playerId });
      t.send({ type: 'answer', optionId: 'none' });
    }
  }

  it('a player on the foul limit must be replaced, by someone not on court', () => {
    const t = setup();
    foulUp(t, 'h1', 4);
    expect(pendingFoulOutSub(t.state)).toBeNull();
    foulUp(t, 'h1', 1);
    expect(foulsOf(t.state.events, 'h1')).toBe(5);
    expect(pendingFoulOutSub(t.state)).toEqual({ side: 'home', outPlayerId: 'h1', mode: 'replace' });

    const asked = t.send({ type: 'sub', side: 'home', outPlayerId: 'h1' });
    expect(asked.nextPrompt?.options.map((o) => o.id)).toEqual(['player:h6', 'player:h7']);
    t.send({ type: 'answer', optionId: 'player:h6' });
    expect(pendingFoulOutSub(t.state)).toBeNull();
  });

  it('a fouled-out player cannot come back in, and waits while the foul play is open', () => {
    const t = setup();
    foulUp(t, 'h1', 5);
    t.send({ type: 'sub', side: 'home', outPlayerId: 'h1' });
    t.send({ type: 'answer', optionId: 'player:h6' });
    const back = t.send({ type: 'sub', side: 'home', outPlayerId: 'h6' });
    expect(back.nextPrompt?.options.map((o) => o.id)).toEqual(['player:h7']);
    t.send({ type: 'cancel' });

    const open = setup();
    open.send({ type: 'foul', side: 'home', playerId: 'h2' });
    expect(pendingFoulOutSub(open.state)).toBeNull();
  });

  /** Both substitutes get used up and fouled out, so the fifth foul on the last one leaves the bench empty. */
  function benchExhausted(rules = {}) {
    const t = setup({ rules });
    foulUp(t, 'h1', 5);
    t.send({ type: 'sub', side: 'home', outPlayerId: 'h1' });
    t.send({ type: 'answer', optionId: 'player:h6' });
    foulUp(t, 'h6', 5);
    t.send({ type: 'sub', side: 'home', outPlayerId: 'h6' });
    t.send({ type: 'answer', optionId: 'player:h7' });
    foulUp(t, 'h7', 5);
    return t;
  }

  it('FIBA: with nobody left to come in the player leaves and the team plays with four', () => {
    const t = benchExhausted();
    expect(pendingFoulOutSub(t.state)).toEqual({ side: 'home', outPlayerId: 'h7', mode: 'leave' });

    const r = t.send({ type: 'leaveCourt', side: 'home', playerId: 'h7' });
    expect(r.emittedEvents).toEqual([expect.objectContaining({ type: 'sub', outPlayerId: 'h7' })]);
    expect(r.emittedEvents[0]!.inPlayerId).toBeUndefined();
    expect(courtAfter(ROSTER.home.starters, t.state.events, 'home')).toEqual(['h2', 'h3', 'h4', 'h5']);
    expect(pendingFoulOutSub(t.state)).toBeNull();
  });

  it('NBA: no team goes below five, so the fouled-out player stays when nobody can replace him', () => {
    const t = benchExhausted({ playShortHanded: false });
    expect(pendingFoulOutSub(t.state)).toBeNull();
    expect(courtAfter(ROSTER.home.starters, t.state.events, 'home')).toHaveLength(5);
  });

  it('NBA: still asks for a substitute while one is available', () => {
    const t = setup({ rules: { playShortHanded: false } });
    foulUp(t, 'h1', 5);
    expect(pendingFoulOutSub(t.state)).toMatchObject({ mode: 'replace' });
  });

  it('a player leaving with no replacement is not counted for minutes after he goes', () => {
    const t = benchExhausted();
    t.send({ type: 'leaveCourt', side: 'home', playerId: 'h7' });
    expect(activeEvents(t.state.events).at(-1)).toMatchObject({ type: 'sub', outPlayerId: 'h7' });
  });
});

describe('minimum players to continue', () => {
  /** Home runs out of bench players and the last one to foul out leaves, so four stay on court. */
  function shortHanded(rules: object) {
    const t = setup({ rules });
    const foul = (id: string) => {
      for (let i = 0; i < 5; i++) {
        t.send({ type: 'foul', side: 'home', playerId: id });
        t.send({ type: 'answer', optionId: 'none' });
      }
    };
    foul('h1'); t.send({ type: 'sub', side: 'home', outPlayerId: 'h1' }); t.send({ type: 'answer', optionId: 'player:h6' });
    foul('h6'); t.send({ type: 'sub', side: 'home', outPlayerId: 'h6' }); t.send({ type: 'answer', optionId: 'player:h7' });
    foul('h7'); t.send({ type: 'leaveCourt', side: 'home', playerId: 'h7' });
    return t;
  }

  it('the game can go on with four when the minimum is two (FIBA)', () => {
    expect(teamBelowMinimum(shortHanded({ minPlayersToContinue: 2 }).state)).toBeNull();
  });

  it('the game is over for a team that falls under the minimum', () => {
    expect(teamBelowMinimum(shortHanded({ minPlayersToContinue: 5 }).state)).toEqual({ side: 'home', count: 4, min: 5 });
  });

  it('defaults to two when the rule is missing, and undoing the foul brings the player back', () => {
    const t = shortHanded({});
    expect(teamBelowMinimum(t.state)).toBeNull();
    t.send({ type: 'undo' }); // the leave
    t.send({ type: 'undo' }); // the foul that caused it
    expect(courtAfter(ROSTER.home.starters, t.state.events, 'home')).toHaveLength(5);
    expect(pendingFoulOutSub(t.state)).toBeNull();
  });
});
