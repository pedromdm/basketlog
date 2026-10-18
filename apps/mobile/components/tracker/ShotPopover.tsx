import type { ShotLocation, Side } from '@basket-log/core';
import { colors, radius } from '@basket-log/ui';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { font } from '../wizard/kit';
import { playerName } from './format';
import { ActionButton } from './ui';
import type { ReadyTracker, TrackerUi } from './useTrackerUi';

/**
 * Opens after a court tap: shooter picker (on-court players of either team, preselected = last shooter of the
 * selected team), then MADE / MISSED. A team-only side has no shooter, so its buttons log a team-level shot.
 */
export function ShotPopover({
  t,
  ui,
  location,
  initialSide,
  onClose,
  allowedSides,
}: {
  t: ReadyTracker;
  ui: TrackerUi;
  location: ShotLocation;
  initialSide: Side;
  onClose: () => void;
  /** Sides that can take the shot from the court (a one-team game only offers the tracked side). */
  allowedSides: Side[];
}) {
  const { game, derived } = t;
  const [side, setSide] = useState<Side>(allowedSides.includes(initialSide) ? initialSide : (allowedSides[0] ?? 'home'));
  const [chosen, setChosen] = useState<string | null>(null);
  const full = game.tracking[side] === 'full';
  const court = derived.onCourt[side];
  const shooter = full ? (chosen && court.includes(chosen) ? chosen : ui.playerFor(side)) : null;
  const heading = full ? `#${game.players[shooter ?? '']?.number ?? '?'} ${playerName(game, shooter).toUpperCase()}` : `${game.teams[side].abbr} TEAM`;

  return (
    <View style={styles.popover}>
      <Text style={styles.name}>{heading}</Text>
      <Text style={styles.detail}>
        {location.points}PT · {location.distanceFt} ft
      </Text>
      {allowedSides.length > 1 ? (
        <View style={styles.row}>
          {allowedSides.map((s) => (
            <Pressable
              key={s}
              accessibilityRole="button"
              accessibilityState={{ selected: s === side }}
              onPress={() => {
                setSide(s);
                setChosen(null);
              }}
              style={[styles.chip, s === side && { backgroundColor: game.teams[s].color, borderColor: game.teams[s].color }]}>
              <Text style={styles.chipText}>{game.teams[s].abbr}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {full ? (
        <View style={styles.row}>
          {court.map((id) => (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityState={{ selected: id === shooter }}
              accessibilityLabel={`#${game.players[id]?.number} ${playerName(game, id)}`}
              onPress={() => setChosen(id)}
              style={[styles.chip, id === shooter && styles.chipOn]}>
              <Text style={[styles.chipText, id === shooter && { color: colors.ink }]}>{game.players[id]?.number}</Text>
              <Text numberOfLines={1} style={[styles.chipName, id === shooter && { color: colors.ink }]}>{playerName(game, id)}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <ActionButton label="Made" tone="green" style={{ flex: 1 }} onPress={() => ui.commitPending(side, shooter, true)} />
        <ActionButton label="Missed" tone="miss" style={{ flex: 1 }} onPress={() => ui.commitPending(side, shooter, false)} />
      </View>
      <ActionButton label="Cancel" tone="ghost" onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  popover: { backgroundColor: colors.ink, borderRadius: radius.card, padding: 14, gap: 10 },
  name: { fontFamily: font.displayBold, fontSize: 24, color: colors.card },
  detail: { fontFamily: font.bodyBold, fontSize: 14, color: colors.greenLight },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    minWidth: 64,
    maxWidth: 108,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: radius.button,
    borderWidth: 1.5,
    borderColor: colors.muted,
  },
  chipOn: { backgroundColor: colors.card, borderColor: colors.card },
  chipName: { fontFamily: font.body, fontSize: 11, color: colors.card },
  chipText: { fontFamily: font.displayBold, fontSize: 20, color: colors.card },
});
