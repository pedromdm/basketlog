// Contract between the tracker data layer (lib/tracker/*) and the views (components/tracker/*, app/game/[id].tsx).
import type { Derived, GameEvent, GameRules, Prompt, Side, TrackerAction, TrackerState, TrackingMode } from '@basket-log/core';

export interface TrackerTeam {
  id: string;
  name: string;
  abbr: string;
  color: string;
}

export interface TrackerPlayer {
  id: string;
  side: Side;
  number: number;
  /** Short name shown in trackers (game_rosters.display_name snapshot). */
  displayName: string;
  starter: boolean;
}

export interface TrackerGame {
  id: string;
  status: 'scheduled' | 'live' | 'final';
  rules: GameRules;
  tracking: Record<Side, TrackingMode>;
  teams: Record<Side, TrackerTeam>;
  players: Record<string, TrackerPlayer>;
}

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

export interface SyncInfo {
  status: SyncStatus;
  /** Events saved locally and not yet confirmed by the server. */
  pending: number;
  lastSyncedAt: number | null;
}

export interface TrackerApi {
  loading: boolean;
  error: string | null;
  game: TrackerGame | null;
  state: TrackerState | null;
  /** derive() of state.events with the game's setup; null until loaded. */
  derived: Derived | null;
  /** The question being asked for the open play, or null. Option labels are raw ids: views must render names. */
  prompt: Prompt | null;
  sync: SyncInfo;
  /** Runs the reducer, stores emitted events locally first (offline queue), haptic feedback, then syncs. */
  dispatch: (action: TrackerAction) => void;
  /** Convenience over dispatch({type:'startClock'|'pauseClock'}); the data layer owns the 100 ms clock tick. */
  toggleClock: () => void;
  /** Ends the period: dispatches setPeriod(period + 1) and resets the clock when canStartNextPeriod() allows. */
  nextPeriod: () => void;
  /** Marks the game final (games.status = 'final'). */
  finishGame: () => Promise<void>;
  events: GameEvent[];
}
