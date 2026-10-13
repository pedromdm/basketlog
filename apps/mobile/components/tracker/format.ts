import type { Derived, GameRules, Play, Prompt, PromptOption, Side } from '@basket-log/core';

import type { SyncInfo, TrackerGame } from '@/lib/tracker/types';

/** m:ss, rounded up like a scoreboard (0:00 only at zero). */
export function clockText(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const shotClockText = (ms: number): string => String(Math.max(0, Math.ceil(ms / 1000)));

export const otherSide = (side: Side): Side => (side === 'home' ? 'away' : 'home');

export function playerName(game: TrackerGame, id: string | null | undefined): string {
  if (!id) return 'Team';
  return game.players[id]?.displayName ?? id;
}

/** "#7 Cruz" */
export function playerLabel(game: TrackerGame, id: string | null | undefined): string {
  if (!id) return 'Team';
  const p = game.players[id];
  return p ? `#${p.number} ${p.displayName}` : id;
}

/** The side of the player an option points at, or null for neutral options (yes/no/skip/team...). */
export function optionSide(game: TrackerGame, option: PromptOption): Side | null {
  const id = option.id.split(':').pop();
  if (!option.id.includes('player:') || !id) return null;
  return game.players[id]?.side ?? null;
}

/** Prompt option ids are raw (`player:h2`, `def:player:a3`, `yes`...); turn them into what the scorekeeper reads. */
export function optionLabel(game: TrackerGame, option: PromptOption): string {
  if (option.id.includes('player:')) return playerLabel(game, option.id.split(':').pop());
  return option.label;
}

/** Same title as the reducer, but with the player id in "Who comes in for h1?" replaced by a name. */
export function promptTitle(game: TrackerGame, prompt: Prompt): string {
  if (prompt.kind !== 'sub') return prompt.title;
  const match = /^Who comes in for (.+)\?$/.exec(prompt.title);
  return match ? `Who comes in for ${playerLabel(game, match[1])}?` : prompt.title;
}

export const isBonus = (rules: GameRules, teamFouls: number): boolean => teamFouls >= rules.teamFoulsBeforeBonus;

export function lastPlays(derived: Derived, count = 8): Play[] {
  return derived.plays.filter((p) => p.text).slice(-count).reverse();
}

export function syncText(sync: SyncInfo, now = Date.now()): string {
  const pending = sync.pending > 0 ? ` · ${sync.pending} pending` : '';
  switch (sync.status) {
    case 'synced': {
      const secs = sync.lastSyncedAt ? Math.max(0, Math.round((now - sync.lastSyncedAt) / 1000)) : 0;
      return `Synced · ${secs}s`;
    }
    case 'syncing':
      return `Syncing${pending}`;
    case 'offline':
      return `Offline${pending}`;
    case 'error':
      return `Sync error${pending}`;
  }
}
