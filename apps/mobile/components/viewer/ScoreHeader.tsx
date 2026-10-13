import type { GameView } from '@basket-log/db';
import { colors } from '@basket-log/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TeamChip, font } from '@/components/wizard/kit';
import { useFollowedTeams } from '@/lib/push';

import { latestPosition, startsAtText, statusLabel } from './format';

/** Green live header of the game viewer: both scores, status and the latest period/clock. */
export function ScoreHeader({ game }: { game: GameView }) {
  const { score } = game.derived;
  const follows = useFollowedTeams();
  const scheduled = game.status === 'scheduled';
  const position = latestPosition(game.rules, game.events);
  const caption = scheduled ? startsAtText(game.startsAt) : position ?? '';

  return (
    <View style={styles.root}>
      <View style={styles.statusRow}>
        <Text style={[styles.status, game.status === 'live' && styles.live]}>{statusLabel(game.status)}</Text>
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </View>
      <View style={styles.scoreRow}>
        {(['home', 'away'] as const).map((side) => (
          <View key={side} style={styles.side}>
            <TeamChip abbr={game.teams[side].abbr} color={game.teams[side].color} size={40} />
            <Text style={styles.teamName} numberOfLines={1}>{game.teams[side].name}</Text>
            <Text style={styles.score}>{scheduled ? '–' : score[side]}</Text>
            {!scheduled ? <Text style={styles.fouls}>{game.derived.teamFouls[side]} team fouls</Text> : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => void follows.toggle(game.teams[side].id)}
              style={[styles.follow, follows.isFollowing(game.teams[side].id) && styles.following]}
            >
              <Text style={styles.followText}>{follows.isFollowing(game.teams[side].id) ? 'Following' : 'Follow'}</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.ink, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, gap: 10 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between' },
  status: { fontFamily: font.bodyBold, fontSize: 12, letterSpacing: 1, color: colors.mutedOnDark },
  live: { color: colors.greenLight },
  caption: { fontFamily: font.displayBold, fontSize: 16, color: colors.card },
  scoreRow: { flexDirection: 'row', gap: 12 },
  side: { flex: 1, alignItems: 'center', gap: 2 },
  teamName: { fontFamily: font.displayBold, fontSize: 16, color: colors.card, textTransform: 'uppercase' },
  score: { fontFamily: font.display, fontSize: 36, color: colors.card },
  follow: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, marginTop: 6, borderRadius: 24, borderWidth: 1.5, borderColor: colors.mutedOnDark },
  following: { backgroundColor: colors.green, borderColor: colors.green },
  followText: { fontFamily: font.bodyBold, fontSize: 13, color: colors.card },
  fouls: { fontFamily: font.body, fontSize: 11, color: colors.mutedOnDark },
});
