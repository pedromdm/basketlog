import { colors, radius } from '@basket-log/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TeamChip, font } from '@/components/wizard/kit';

import { startsAtText, statusLabel } from './format';
import type { ListGame } from './useGamesList';

export function GameCard({ game, onPress }: { game: ListGame; onPress: () => void }) {
  const scheduled = game.status === 'scheduled';
  const lead = game.score.home === game.score.away ? null : game.score.home > game.score.away ? 'home' : 'away';
  const caption = scheduled ? startsAtText(game.startsAt) : game.competition ?? '';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${game.teams.home.name} versus ${game.teams.away.name}, ${statusLabel(game.status)}`}
      onPress={onPress}
      style={styles.card}>
      {game.status === 'live' ? <View style={styles.strip} /> : null}
      <View style={styles.head}>
        <Text style={[styles.status, game.status === 'live' && styles.statusLive]}>{statusLabel(game.status)}</Text>
        {caption ? <Text style={styles.caption} numberOfLines={1}>{caption}</Text> : null}
      </View>
      {(['home', 'away'] as const).map((side) => (
        <View key={side} style={styles.row}>
          <TeamChip abbr={game.teams[side].abbr} color={game.teams[side].color} size={36} />
          <Text style={styles.name} numberOfLines={1}>{game.teams[side].name}</Text>
          <Text style={[styles.score, !scheduled && lead && lead !== side && styles.scoreLoser]}>{scheduled ? '–' : game.score[side]}</Text>
        </View>
      ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1.5, borderColor: colors.line, padding: 14, gap: 8, overflow: 'hidden', minHeight: 48 },
  strip: { position: 'absolute', top: 0, left: 0, right: 0, height: 6, backgroundColor: colors.wood },
  head: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 4 },
  status: { fontFamily: font.bodyBold, fontSize: 12, letterSpacing: 1, color: colors.muted },
  statusLive: { color: colors.green },
  caption: { fontFamily: font.body, fontSize: 12, color: colors.muted, flexShrink: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { flex: 1, fontFamily: font.displayBold, fontSize: 22, color: colors.ink, textTransform: 'uppercase' },
  score: { fontFamily: font.display, fontSize: 32, color: colors.ink, minWidth: 40, textAlign: 'right' },
  scoreLoser: { color: colors.muted },
});
