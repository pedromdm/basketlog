import type { Side } from '@basket-log/core';
import { colors, radius } from '@basket-log/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { font } from '../wizard/kit';
import { playerName } from './format';
import type { ReadyTracker } from './useTrackerUi';

/** The five on-court players of a side as selectable cards (tablet left column). */
export function PlayerCards({
  t,
  side,
  selectedId,
  onSelect,
}: {
  t: ReadyTracker;
  side: Side;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { game, derived } = t;
  return (
    <View style={{ gap: 8 }}>
      {derived.onCourt[side].map((id) => {
        const p = game.players[id];
        const line = derived.players[id];
        const selected = id === selectedId;
        const pf = line?.pf ?? 0;
        return (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`#${p?.number} ${playerName(game, id)}`}
            onPress={() => onSelect(id)}
            style={[styles.card, selected && styles.cardSelected]}>
            <Text style={[styles.number, selected && styles.onSelected]}>{p?.number}</Text>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={[styles.name, selected && styles.onSelected]}>
                {playerName(game, id)}
              </Text>
              <Text style={[styles.meta, selected && { color: colors.greenTint }]}>{line?.pts ?? 0} PTS</Text>
            </View>
            <View style={[styles.pf, pf >= game.rules.foulsToFoulOut && { backgroundColor: colors.ink }]}>
              <Text style={[styles.pfText, pf >= game.rules.foulsToFoulOut && { color: colors.card }]}>{pf} PF</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Compact player tiles for the phone layouts (height 64). */
export function PlayerTiles({
  t,
  side,
  selectedId,
  onSelect,
}: {
  t: ReadyTracker;
  side: Side;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { game, derived } = t;
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {derived.onCourt[side].map((id) => {
        const selected = id === selectedId;
        return (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`#${game.players[id]?.number} ${playerName(game, id)}`}
            onPress={() => onSelect(id)}
            style={[styles.tile, selected && styles.cardSelected]}>
            <Text style={[styles.tileNumber, selected && styles.onSelected]}>{game.players[id]?.number}</Text>
            <Text numberOfLines={1} style={[styles.tileName, selected && styles.onSelected]}>
              {playerName(game, id).toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.button,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  cardSelected: { backgroundColor: colors.green, borderColor: colors.green },
  onSelected: { color: colors.card },
  number: { fontFamily: font.displayBold, fontSize: 32, color: colors.ink, minWidth: 40 },
  name: { fontFamily: font.bodyBold, fontSize: 15, color: colors.ink },
  meta: { fontFamily: font.body, fontSize: 12, color: colors.muted },
  pf: { backgroundColor: colors.line2, borderRadius: radius.badge, paddingHorizontal: 6, paddingVertical: 2 },
  pfText: { fontFamily: font.bodyBold, fontSize: 11, color: colors.muted },
  tile: {
    flex: 1,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.button,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  tileNumber: { fontFamily: font.displayBold, fontSize: 24, color: colors.ink },
  tileName: { fontFamily: font.bodyBold, fontSize: 10, color: colors.muted },
});
