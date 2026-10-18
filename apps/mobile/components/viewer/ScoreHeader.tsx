import { timeoutsLeft, type Side } from '@basket-log/core';
import type { GameView } from '@basket-log/db';
import { colors } from '@basket-log/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { isBonus } from '@/components/tracker/format';
import { TeamChip, font } from '@/components/wizard/kit';
import { useFollowedTeams } from '@/lib/push';

import { latestPosition, startsAtText } from './format';

const SIDES = ['home', 'away'] as const;

/**
 * Dark header of the game page: status pill, both teams with the score, where and when it is played, and a strip with
 * team fouls, timeouts left and who is in the bonus.
 */
export function ScoreHeader({ game, compact = false }: { game: GameView; compact?: boolean }) {
  const { score, teamFouls } = game.derived;
  const follows = useFollowedTeams();
  const scheduled = game.status === 'scheduled';
  const position = latestPosition(game.rules, game.events);
  const period = game.events.reduce((max, e) => Math.max(max, e.period), 1);
  const lead = score.home === score.away ? null : score.home > score.away ? 'home' : 'away';
  const status = game.status === 'live' ? `LIVE${position ? ` · ${position}` : ''}` : game.status === 'final' ? 'FINAL' : 'UPCOMING';
  const where = [game.competition, game.venue, startsAtText(game.startsAt)].filter(Boolean).join(' · ');
  const left = (side: Side) => timeoutsLeft(game.rules, game.events, side, period);
  const bonus = SIDES.filter((s) => isBonus(game.rules, teamFouls[s]));

  if (compact) {
    // phone in landscape: one thin row so the content below keeps the height
    return (
      <View style={styles.compactRow}>
        <TeamChip abbr={game.teams.home.abbr} color={game.teams.home.color} size={32} />
        <Text style={[styles.compactScore, lead === 'away' && styles.scoreDim]}>{scheduled ? '–' : score.home}</Text>
        <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
          <View style={[styles.pill, game.status === 'live' && styles.pillLive, { paddingVertical: 3 }]}>
            {game.status === 'live' ? <View style={styles.dot} /> : null}
            <Text style={styles.pillText}>{status}</Text>
          </View>
          {where ? <Text style={styles.where} numberOfLines={1}>{where}</Text> : null}
        </View>
        <Text style={[styles.compactScore, lead === 'home' && styles.scoreDim]}>{scheduled ? '–' : score.away}</Text>
        <TeamChip abbr={game.teams.away.abbr} color={game.teams.away.color} size={32} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.pillRow}>
        <View style={[styles.pill, game.status === 'live' && styles.pillLive]}>
          {game.status === 'live' ? <View style={styles.dot} /> : null}
          <Text style={styles.pillText}>{status}</Text>
        </View>
      </View>

      <View style={styles.scoreRow}>
        {SIDES.map((side) => (
          <View key={side} style={styles.side}>
            <TeamChip abbr={game.teams[side].abbr} color={game.teams[side].color} size={56} />
            <Text style={styles.teamName} numberOfLines={1}>{game.teams[side].name}</Text>
            {game.teams[side].city ? <Text style={styles.city} numberOfLines={1}>{game.teams[side].city}</Text> : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => void follows.toggle(game.teams[side].id)}
              style={[styles.follow, follows.isFollowing(game.teams[side].id) && styles.following]}>
              <Text style={styles.followText}>{follows.isFollowing(game.teams[side].id) ? 'Following' : 'Follow'}</Text>
            </Pressable>
          </View>
        ))}
        <View style={styles.scores} pointerEvents="none">
          <Text style={[styles.score, lead === 'away' && styles.scoreDim]}>{scheduled ? '–' : score.home}</Text>
          <Text style={styles.dash}>–</Text>
          <Text style={[styles.score, lead === 'home' && styles.scoreDim]}>{scheduled ? '–' : score.away}</Text>
        </View>
      </View>

      {where ? <Text style={styles.where}>{where}</Text> : null}

      {scheduled ? null : (
        <View style={styles.strip}>
          <View style={[styles.cell, styles.cellRule]}>
            <Text style={styles.cellValue}>{teamFouls.home} – {teamFouls.away}</Text>
            <Text style={styles.cellLabel}>TEAM FOULS</Text>
          </View>
          <View style={[styles.cell, styles.cellRule]}>
            <Text style={styles.cellValue}>{left('home')} – {left('away')}</Text>
            <Text style={styles.cellLabel}>TIMEOUTS LEFT</Text>
          </View>
          <View style={styles.cell}>
            <Text style={[styles.cellValue, bonus.length > 0 && { color: colors.greenLight }]}>
              {bonus.length ? bonus.map((s) => game.teams[s].abbr).join(' · ') : '–'}
            </Text>
            <Text style={styles.cellLabel}>IN BONUS</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.ink, paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  compactRow: { backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 8 },
  compactScore: { fontFamily: font.display, fontSize: 34, color: colors.card, minWidth: 36, textAlign: 'center' },
  pillRow: { alignItems: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.ink2, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 5 },
  pillLive: { backgroundColor: colors.green },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.card },
  pillText: { fontFamily: font.bodyBold, fontSize: 12, letterSpacing: 1.2, color: colors.card },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  side: { width: 112, alignItems: 'center', gap: 4 },
  teamName: { fontFamily: font.displayBold, fontSize: 18, color: colors.card, textTransform: 'uppercase' },
  city: { fontFamily: font.body, fontSize: 11, color: colors.mutedOnDark },
  scores: { position: 'absolute', left: 0, right: 0, top: 4, height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  score: { fontFamily: font.display, fontSize: 64, lineHeight: 66, color: colors.card },
  scoreDim: { color: colors.line },
  dash: { fontFamily: font.display, fontSize: 28, color: colors.muted },
  where: { fontFamily: font.body, fontSize: 12, color: colors.mutedOnDark, textAlign: 'center' },
  follow: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, marginTop: 2, borderRadius: 22, borderWidth: 1.5, borderColor: colors.muted },
  following: { backgroundColor: colors.green, borderColor: colors.green },
  followText: { fontFamily: font.bodyBold, fontSize: 12, color: colors.card },
  strip: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.ink2, marginHorizontal: -16 },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  cellRule: { borderRightWidth: 1, borderRightColor: colors.ink2 },
  cellValue: { fontFamily: font.displayBold, fontSize: 18, color: colors.card },
  cellLabel: { fontFamily: font.bodyBold, fontSize: 10, letterSpacing: 1.2, color: colors.mutedOnDark },
});
