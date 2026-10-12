import { activeEvents, courtAfter } from './derive';
import type { GameRules } from './rules';
import type { GameEvent, Side, TrackingMode } from './types';

export interface Lineup {
  starters: string[];
  bench: string[];
}

export interface TrackerConfig {
  gameId: string;
  rules: GameRules;
  tracking: Record<Side, TrackingMode>;
  roster: Record<Side, Lineup>;
  period?: number;
  clockMs?: number;
}

export interface TrackerState {
  gameId: string;
  rules: GameRules;
  tracking: Record<Side, TrackingMode>;
  roster: Record<Side, Lineup>;
  period: number;
  clockMs: number;
  shotClockMs: number;
  clockRunning: boolean;
  events: GameEvent[];
  nextSeq: number;
  /** The play currently being built, or null when idle. */
  chain: Chain | null;
}

/** What the scorekeeper is being asked next, plus the data needed to apply the answer. */
type Step =
  | { kind: 'fastBreak'; next: Step | null }
  | { kind: 'assist'; side: Side; shooterId: string }
  | { kind: 'block'; side: Side }
  | { kind: 'rebound'; side: Side }
  | { kind: 'steal'; side: Side }
  | { kind: 'sub'; side: Side; outId: string }
  | { kind: 'fouled'; side: Side }
  | { kind: 'ftCount'; side: Side; shooterId: string | null }
  | { kind: 'ft'; side: Side; shooterId: string | null; i: number; n: number };

export interface Chain {
  groupId: string;
  /** Events built but not yet emitted (the shot waits for its fast-break answer). */
  held: GameEvent[];
  step: Step;
}

export interface ReduceEnv {
  newId: () => string;
  now: () => string;
  userId: string;
}

export type TrackerAction =
  | { type: 'setClock'; clockMs: number; shotClockMs?: number }
  | {
      type: 'shot';
      side: Side;
      playerId: string | null;
      points: 2 | 3;
      made: boolean;
      x?: number;
      y?: number;
      distanceFt?: number;
    }
  | { type: 'setPeriod'; period: number }
  | { type: 'done' }
  | { type: 'undo' }
  | { type: 'cancel' }
  | { type: 'quick'; event: 'oreb' | 'dreb' | 'ast' | 'stl' | 'blk'; side: Side; playerId: string | null }
  | { type: 'sub'; side: Side; outPlayerId: string }
  | { type: 'timeout'; side: Side }
  | { type: 'startClock' }
  | { type: 'pauseClock' }
  | { type: 'foul'; side: Side; playerId: string | null }
  | { type: 'turnover'; side: Side; playerId: string | null }
  | { type: 'ft'; side: Side; playerId: string | null; made: boolean }
  | { type: 'answer'; optionId: string };

export interface PromptOption {
  id: string;
  label: string;
}

export interface Prompt {
  kind: Step['kind'];
  title: string;
  options: PromptOption[];
}

export interface ReduceResult {
  state: TrackerState;
  emittedEvents: GameEvent[];
  nextPrompt: Prompt | null;
}

export function initTracker(config: TrackerConfig): TrackerState {
  return {
    gameId: config.gameId,
    rules: config.rules,
    tracking: config.tracking,
    roster: config.roster,
    period: config.period ?? 1,
    clockMs: config.clockMs ?? config.rules.periodMinutes * 60_000,
    shotClockMs: config.rules.shotClock * 1000,
    clockRunning: false,
    events: [],
    nextSeq: 1,
    chain: null,
  };
}

function makeEvent(
  state: TrackerState,
  env: ReduceEnv,
  groupId: string,
  partial: Pick<GameEvent, 'type' | 'side'> & Partial<GameEvent>,
): GameEvent {
  return {
    playerId: null,
    ...partial,
    id: env.newId(),
    gameId: state.gameId,
    groupId,
    seq: state.nextSeq,
    period: state.period,
    clockMs: state.clockMs,
    createdBy: env.userId,
    createdAt: env.now(),
  };
}

function emit(state: TrackerState, events: GameEvent[]): TrackerState {
  return { ...state, events: [...state.events, ...events], nextSeq: state.nextSeq + events.length };
}

const opposite = (side: Side): Side => (side === 'home' ? 'away' : 'home');

function voidGroup(state: TrackerState, env: ReduceEnv, groupId: string): GameEvent {
  const target = state.events.find((e) => e.groupId === groupId);
  return makeEvent(state, env, env.newId(), {
    type: 'void', side: target?.side ?? 'home', voidsGroupId: groupId,
  });
}

function onCourt(state: TrackerState, side: Side): string[] {
  return courtAfter(state.roster[side].starters, state.events, side);
}

function benchFor(state: TrackerState, side: Side): string[] {
  const court = onCourt(state, side);
  const { starters, bench } = state.roster[side];
  return [...starters, ...bench].filter((id) => !court.includes(id));
}

function buildPrompt(state: TrackerState, step: Step): Prompt {
  switch (step.kind) {
    case 'fastBreak':
      return {
        kind: 'fastBreak',
        title: 'Was it a fast break?',
        options: [
          { id: 'yes', label: 'Yes — fast break' },
          { id: 'no', label: 'No' },
        ],
      };
    case 'assist':
      return {
        kind: 'assist',
        title: 'Assisted by?',
        options: [
          ...onCourt(state, step.side)
            .filter((id) => id !== step.shooterId)
            .map((id) => ({ id: `player:${id}`, label: id })),
          { id: 'none', label: 'No assist' },
        ],
      };
    case 'block':
      return {
        kind: 'block',
        title: 'Was it blocked?',
        options: [
          ...(state.tracking[opposite(step.side)] === 'full'
            ? onCourt(state, opposite(step.side)).map((id) => ({ id: `player:${id}`, label: id }))
            : [{ id: 'team', label: 'Blocked by team' }]),
          { id: 'none', label: 'Not blocked' },
        ],
      };
    case 'sub':
      return {
        kind: 'sub',
        title: `Who comes in for ${step.outId}?`,
        options: benchFor(state, step.side).map((id) => ({ id: `player:${id}`, label: id })),
      };
    case 'fouled':
      return {
        kind: 'fouled',
        title: 'Who was fouled?',
        options: [
          ...onCourt(state, step.side).map((id) => ({ id: `player:${id}`, label: id })),
          { id: 'none', label: 'No free throws' },
        ],
      };
    case 'ftCount':
      return {
        kind: 'ftCount',
        title: 'Free throws?',
        options: [
          { id: '1', label: '1 FT' },
          { id: '2', label: '2 FT' },
          { id: '3', label: '3 FT' },
          { id: 'none', label: 'No free throws' },
        ],
      };
    case 'ft':
      return {
        kind: 'ft',
        title: `FT ${step.i} of ${step.n}`,
        options: [
          { id: 'made', label: 'Made' },
          { id: 'missed', label: 'Missed' },
        ],
      };
    case 'steal':
      return {
        kind: 'steal',
        title: 'Stolen by?',
        options: [
          ...onCourt(state, step.side).map((id) => ({ id: `player:${id}`, label: id })),
          { id: 'none', label: 'No steal' },
        ],
      };
    case 'rebound': {
      const off = step.side;
      const def = opposite(off);
      const players = (side: Side, prefix: string) =>
        state.tracking[side] === 'full'
          ? onCourt(state, side).map((id) => ({ id: `${prefix}:player:${id}`, label: id }))
          : [];
      return {
        kind: 'rebound',
        title: 'Who got the rebound?',
        options: [
          ...players(off, 'off'),
          ...players(def, 'def'),
          { id: 'off:team', label: 'Offensive team rebound' },
          { id: 'def:team', label: 'Defensive team rebound' },
          { id: 'skip', label: 'Skip' },
        ],
      };
    }
  }
}

/** Applies a shot's follow-up questions to the shot just taken. */
function afterShot(state: TrackerState, side: Side, playerId: string | null, points: 2 | 3, made: boolean): Step | null {
  let step: Step | null = null;
  const full = state.tracking[side] === 'full';
  if (made && full && state.rules.askAssist && playerId !== null) step = { kind: 'assist', side, shooterId: playerId };
  if (!made) step = { kind: 'block', side };
  if (full && state.rules.askFastBreak) step = { kind: 'fastBreak', next: step };
  return step;
}

function idle(state: TrackerState, emitted: GameEvent[] = []): ReduceResult {
  return { state: { ...state, chain: null }, emittedEvents: emitted, nextPrompt: null };
}

function advance(state: TrackerState, chain: Chain, emitted: GameEvent[], next: Step | null): ReduceResult {
  if (!next) return idle(state, emitted);
  return {
    state: { ...state, chain: { ...chain, step: next } },
    emittedEvents: emitted,
    nextPrompt: buildPrompt(state, next),
  };
}

const STARTS_PLAY = new Set<TrackerAction['type']>(['shot', 'ft', 'turnover', 'foul', 'sub', 'timeout', 'quick']);

export function reduce(state: TrackerState, action: TrackerAction, env: ReduceEnv): ReduceResult {
  if (state.chain && STARTS_PLAY.has(action.type)) {
    return { state, emittedEvents: [], nextPrompt: buildPrompt(state, state.chain.step) };
  }
  switch (action.type) {
    case 'setClock':
      return {
        state: { ...state, clockMs: action.clockMs, shotClockMs: action.shotClockMs ?? state.shotClockMs },
        emittedEvents: [],
        nextPrompt: null,
      };
    case 'shot': {
      const groupId = env.newId();
      const event = makeEvent(state, env, groupId, {
        type: 'shot', side: action.side, playerId: action.playerId, points: action.points, made: action.made,
        x: action.x, y: action.y, distanceFt: action.distanceFt,
      });
      const base: TrackerState = action.made
        ? { ...state, shotClockMs: state.rules.shotClock * 1000 }
        : state;
      const step = afterShot(state, action.side, action.playerId, action.points, action.made);
      if (step?.kind === 'fastBreak') {
        const chain: Chain = { groupId, held: [event], step };
        return { state: { ...base, chain }, emittedEvents: [], nextPrompt: buildPrompt(base, step) };
      }
      const chain: Chain = { groupId, held: [], step: step ?? { kind: 'fastBreak', next: null } };
      const emitted = emit(base, [event]);
      return step ? advance(emitted, chain, [event], step) : idle(emitted, [event]);
    }
    case 'undo': {
      if (state.chain) return reduce(state, { type: 'cancel' }, env);
      const last = activeEvents(state.events).at(-1);
      const base: TrackerState = { ...state, chain: null };
      if (!last) return idle(base);
      const event = voidGroup(state, env, last.groupId);
      return idle(emit(base, [event]), [event]);
    }
    case 'setPeriod':
      return { state: { ...state, period: action.period }, emittedEvents: [], nextPrompt: null };
    case 'done': {
      const chain = state.chain;
      if (!chain) return idle(state);
      return idle(emit(state, chain.held), chain.held);
    }
    case 'cancel': {
      const chain = state.chain;
      if (!chain) return idle(state);
      const logged = state.events.some((e) => e.groupId === chain.groupId);
      if (!logged) return idle(state);
      const event = voidGroup(state, env, chain.groupId);
      return idle(emit(state, [event]), [event]);
    }
    case 'quick': {
      const spec = {
        oreb: { type: 'reb', offensive: true, shotClock: state.rules.shotClockResetOffReb },
        dreb: { type: 'reb', offensive: false, shotClock: state.rules.shotClock },
        ast: { type: 'ast' },
        stl: { type: 'stl', shotClock: state.rules.shotClock },
        blk: { type: 'blk' },
      }[action.event] as { type: GameEvent['type']; offensive?: boolean; shotClock?: number };
      const event = makeEvent(state, env, env.newId(), {
        type: spec.type, side: action.side, playerId: action.playerId,
        ...(spec.offensive === undefined ? {} : { offensive: spec.offensive }),
      });
      const next = emit(state, [event]);
      return idle(spec.shotClock === undefined ? next : { ...next, shotClockMs: spec.shotClock * 1000 }, [event]);
    }
    case 'sub': {
      if (state.tracking[action.side] === 'team_only') return idle(state);
      const step: Step = { kind: 'sub', side: action.side, outId: action.outPlayerId };
      return advance(state, { groupId: env.newId(), held: [], step }, [], step);
    }
    case 'timeout': {
      const event = makeEvent(state, env, env.newId(), { type: 'timeout', side: action.side });
      return idle({ ...emit(state, [event]), clockRunning: false }, [event]);
    }
    case 'startClock':
      return { state: { ...state, clockRunning: true }, emittedEvents: [], nextPrompt: null };
    case 'pauseClock':
      return { state: { ...state, clockRunning: false }, emittedEvents: [], nextPrompt: null };
    case 'foul': {
      const groupId = env.newId();
      const event = makeEvent(state, env, groupId, { type: 'foul', side: action.side, playerId: action.playerId });
      const next = { ...emit(state, [event]), clockRunning: state.rules.stopClockOnFoul ? false : state.clockRunning };
      const fouledSide = opposite(action.side);
      const step: Step =
        state.tracking[fouledSide] === 'full'
          ? { kind: 'fouled', side: fouledSide }
          : { kind: 'ftCount', side: fouledSide, shooterId: null };
      return advance(next, { groupId, held: [], step }, [event], step);
    }
    case 'turnover': {
      const groupId = env.newId();
      const event = makeEvent(state, env, groupId, { type: 'tov', side: action.side, playerId: action.playerId });
      const next = { ...emit(state, [event]), shotClockMs: state.rules.shotClock * 1000 };
      const stealer = opposite(action.side);
      const step: Step | null = state.tracking[stealer] === 'full' ? { kind: 'steal', side: stealer } : null;
      return advance(next, { groupId, held: [], step: step ?? { kind: 'steal', side: stealer } }, [event], step);
    }
    case 'ft': {
      const groupId = env.newId();
      const event = makeEvent(state, env, groupId, {
        type: 'ft', side: action.side, playerId: action.playerId, points: 1, made: action.made,
      });
      const next = emit(state, [event]);
      if (action.made) return idle(next, [event]);
      const step: Step = { kind: 'rebound', side: action.side };
      return advance(next, { groupId, held: [], step }, [event], step);
    }
    case 'answer': {
      const chain = state.chain;
      if (!chain) return idle(state);
      const { step } = chain;
      switch (step.kind) {
        case 'fastBreak': {
          const held = chain.held.map((e) => (e.type === 'shot' ? { ...e, fastBreak: action.optionId === 'yes' } : e));
          const next = emit(state, held);
          return advance(next, { ...chain, held: [] }, held, step.next);
        }
        case 'assist': {
          if (!action.optionId.startsWith('player:')) return idle(state);
          const assister = action.optionId.slice('player:'.length);
          const event = makeEvent(state, env, chain.groupId, { type: 'ast', side: step.side, playerId: assister });
          return idle(emit(state, [event]), [event]);
        }
        case 'block': {
          const rebound: Step = { kind: 'rebound', side: step.side };
          if (action.optionId !== 'team' && !action.optionId.startsWith('player:')) {
            return advance(state, chain, [], rebound);
          }
          const blocker = action.optionId === 'team' ? null : action.optionId.slice('player:'.length);
          const event = makeEvent(state, env, chain.groupId, { type: 'blk', side: opposite(step.side), playerId: blocker });
          return advance(emit(state, [event]), chain, [event], rebound);
        }
        case 'sub': {
          if (!action.optionId.startsWith('player:')) return idle(state);
          const event = makeEvent(state, env, chain.groupId, {
            type: 'sub', side: step.side, playerId: step.outId, outPlayerId: step.outId,
            inPlayerId: action.optionId.slice('player:'.length),
          });
          return idle(emit(state, [event]), [event]);
        }
        case 'fouled': {
          if (!action.optionId.startsWith('player:')) return idle(state);
          const shooterId = action.optionId.slice('player:'.length);
          return advance(state, chain, [], { kind: 'ftCount', side: step.side, shooterId });
        }
        case 'ftCount': {
          const n = Number(action.optionId);
          if (!(n >= 1 && n <= 3)) return idle(state);
          return advance(state, chain, [], { kind: 'ft', side: step.side, shooterId: step.shooterId, i: 1, n });
        }
        case 'ft': {
          const made = action.optionId === 'made';
          const event = makeEvent(state, env, chain.groupId, {
            type: 'ft', side: step.side, playerId: step.shooterId, points: 1, made,
          });
          const next: Step | null =
            step.i < step.n
              ? { ...step, i: step.i + 1 }
              : made
                ? null
                : { kind: 'rebound', side: step.side };
          return advance(emit(state, [event]), chain, [event], next);
        }
        case 'steal': {
          if (!action.optionId.startsWith('player:')) return idle(state);
          const event = makeEvent(state, env, chain.groupId, {
            type: 'stl', side: step.side, playerId: action.optionId.slice('player:'.length),
          });
          return idle(emit(state, [event]), [event]);
        }
        case 'rebound': {
          if (action.optionId === 'skip') return idle(state);
          const [kind, target, id] = action.optionId.split(':');
          const offensive = kind === 'off';
          const side = offensive ? step.side : opposite(step.side);
          const event = makeEvent(state, env, chain.groupId, {
            type: 'reb', side, playerId: target === 'player' ? (id ?? null) : null, offensive,
          });
          const shotClock = offensive ? state.rules.shotClockResetOffReb : state.rules.shotClock;
          return idle({ ...emit(state, [event]), shotClockMs: shotClock * 1000 }, [event]);
        }
      }
    }
  }
}
