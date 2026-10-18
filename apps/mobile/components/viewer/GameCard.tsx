import { colors, radius } from '@basket-log/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TeamChip, font } from '@/components/wizard/kit';

import type { ListGame } from './useGamesList';

const KICKOFF = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : 'TBD');
const DAY = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : 'Date TBD');

const leaderText = (l: ListGame['leaders']['home']): string => (l ? `${l.number === null ? '' : `#${l.number} `}${l.name} - ${l.points}pts` : '');

/**
 * A game card: status and competition, both teams with score, points per period and each side's top scorer. Its height
 * follows the content; cards in the same grid row are stretched to the tallest one (the row's default align-items).
 */
export function GameCard({ game, onPress, width }: { game: ListGame; onPress: () => void; width: number }) {
  const scheduled = game.status === 'scheduled';
  const live = game.status === 'live';
  const lead = game.score.home === game.score.away ? null : game.score.home > game.score.away ? 'home' : 'away';
  const status = live
    ? `● LIVE${game.liveLabel ? ` · ${game.liveLabel}` : ''}`
    : scheduled
      ? DAY(game.startsAt).toUpperCase()
      : `FINAL${game.overtime ? ' / OT' : ''}`;
  const periods = game.periods.map((p) => `${p.label} ${p.home}–${p.away}`).join(' | ');
  const leaders = (['home', 'away'] as const).filter((s) => game.leaders[s]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${game.teams.home.name} versus ${game.teams.away.name}, ${status}`}
      onPress={onPress}
      style={[styles.card, { width }]}>
      {live ? <View style={styles.strip} /> : null}
      <View style={styles.body}>
        <View style={styles.head}>
          <Text style={[styles.status, live && styles.statusLive]} numberOfLines={1}>{status}</Text>
          {game.competition ? <Text style={styles.caption} numberOfLines={1}>{game.competition}</Text> : null}
        </View>

        {scheduled ? (
          <>
            <Text style={styles.kickoff}>{KICKOFF(game.startsAt)}</Text>
            {game.venue ? <Text style={styles.venue} numberOfLines={1}>{game.venue}</Text> : null}
          </>
        ) : null}

        {(['home', 'away'] as const).map((side) => (
          <View key={side} style={styles.row}>
            <TeamChip abbr={game.teams[side].abbr} color={game.teams[side].color} size={40} />
            <View style={{ flex: 1 }}>
              {game.teams[side].city ? <Text style={styles.city} numberOfLines={1}>{game.teams[side].city}</Text> : null}
              <Text style={styles.name} numberOfLines={1}>{game.teams[side].name}</Text>
            </View>
            {scheduled ? null : <Text style={[styles.score, lead && lead !== side && styles.scoreLoser]}>{game.score[side]}</Text>}
          </View>
        ))}

        {!scheduled && (game.startsAt || game.venue) ? (
          <Text style={styles.when} numberOfLines={2}>
            {[game.startsAt ? `${DAY(game.startsAt)}, ${KICKOFF(game.startsAt)}` : null, game.venue].filter(Boolean).join(' | ')}
          </Text>
        ) : null}
        {!scheduled && periods ? (
          <View style={styles.periods}>
            <Text style={styles.periodsText} numberOfLines={1}>{periods}</Text>
          </View>
        ) : null}
        {!scheduled && leaders.length ? (
          <View>
            {leaders.map((s) => (
              <Text key={s} style={styles.leader} numberOfLines={1}>
                <Text style={{ fontFamily: font.bodyBold }}>{game.teams[s].abbr}</Text>
                {` - ${leaderText(game.leaders[s])}`}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>{scheduled ? 'Preview ›' : 'Box score · Play-by-play ›'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1.5, borderColor: colors.line, overflow: 'hidden' },
  strip: { height: 6, backgroundColor: colors.wood },
  body: { flex: 1, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, gap: 8 },
  head: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  status: { fontFamily: font.bodyBold, fontSize: 11, letterSpacing: 1, color: colors.muted },
  statusLive: { color: colors.green },
  caption: { fontFamily: font.body, fontSize: 12, color: colors.muted, flexShrink: 1 },
  kickoff: { fontFamily: font.display, fontSize: 44, lineHeight: 46, color: colors.ink },
  venue: { fontFamily: font.body, fontSize: 12, color: colors.muted },
  when: { fontFamily: font.body, fontSize: 11, color: colors.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  city: { fontFamily: font.body, fontSize: 11, color: colors.muted },
  name: { fontFamily: font.displayBold, fontSize: 21, color: colors.ink, textTransform: 'uppercase' },
  score: { fontFamily: font.display, fontSize: 40, color: colors.ink, minWidth: 44, textAlign: 'right' },
  scoreLoser: { color: colors.muted },
  periods: { backgroundColor: colors.paper, borderRadius: radius.small, paddingHorizontal: 10, paddingVertical: 6 },
  periodsText: { fontFamily: font.bodyBold, fontSize: 11, color: colors.ink3 },
  leader: { fontFamily: font.body, fontSize: 11, lineHeight: 16, color: colors.ink3 },
  footer: { height: 40, borderTopWidth: 1, borderTopColor: colors.line2, justifyContent: 'center', paddingHorizontal: 14 },
  footerText: { fontFamily: font.bodyBold, fontSize: 12, color: colors.green },
});
