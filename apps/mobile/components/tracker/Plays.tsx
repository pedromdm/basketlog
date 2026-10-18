import { colors, radius } from '@basket-log/ui';
import { StyleSheet, Text, View } from 'react-native';

import { font } from '../wizard/kit';
import { clockText, lastPlays } from './format';
import { ActionButton, TeamDot } from './ui';
import type { ReadyTracker } from './useTrackerUi';

/** The latest plays as text lines, newest first: clock, team colour bar, play text (tablet right column, under Undo). */
export function RecentPlays({ t, count = 5 }: { t: ReadyTracker; count?: number }) {
  const plays = lastPlays(t.derived, count);
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.footerLabel}>LAST {count} PLAYS</Text>
      {plays.length === 0 ? <Text style={styles.empty}>No plays yet</Text> : null}
      {plays.map((p) => (
        <View key={p.groupId} style={styles.recent}>
          <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: t.game.teams[p.side].color }} />
          <Text style={styles.recentClock}>{clockText(p.clockMs)}</Text>
          <Text style={[styles.recentText, p.points > 0 && { fontFamily: font.bodyBold }]}>{p.text}</Text>
        </View>
      ))}
    </View>
  );
}

/** Full play-by-play list, newest first (phone "Plays" view). */
export function PlayList({ t }: { t: ReadyTracker }) {
  const plays = lastPlays(t.derived, 200);
  return (
    <View style={{ gap: 6 }}>
      {plays.length === 0 ? <Text style={styles.empty}>No plays yet</Text> : null}
      {plays.map((p) => (
        <View key={p.groupId} style={styles.row}>
          <Text style={styles.rowClock}>{clockText(p.clockMs)}</Text>
          <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: t.game.teams[p.side].color }} />
          <Text style={[styles.rowText, p.points > 0 && { fontFamily: font.bodyBold }]}>{p.text}</Text>
          <Text style={styles.rowScore}>
            {p.scoreAfter.home}–{p.scoreAfter.away}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Phone toast: the last play with UNDO. */
export function LastPlayToast({ t, onUndo }: { t: ReadyTracker; onUndo: () => void }) {
  const last = lastPlays(t.derived, 1)[0];
  return (
    <View style={styles.toast}>
      <TeamDot color={colors.greenLight} />
      <Text numberOfLines={2} style={styles.toastText}>
        <Text style={{ fontFamily: font.bodyBold }}>Last · </Text>
        {last ? last.text : 'No plays yet'}
      </Text>
      <ActionButton label="Undo" tone="ghost" onPress={onUndo} style={{ paddingHorizontal: 14 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  footerLabel: { fontFamily: font.bodyBold, fontSize: 11, letterSpacing: 1.1, color: colors.muted },
  empty: { fontFamily: font.body, fontSize: 13, color: colors.muted },
  recent: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  recentClock: { fontFamily: font.bodyBold, fontSize: 12, color: colors.muted, width: 38 },
  recentText: { flex: 1, fontFamily: font.body, fontSize: 13, color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: radius.small, padding: 10 },
  rowClock: { fontFamily: font.bodyBold, fontSize: 13, color: colors.muted, width: 40 },
  rowText: { flex: 1, fontFamily: font.body, fontSize: 14, color: colors.ink },
  rowScore: { fontFamily: font.displayBold, fontSize: 18, color: colors.ink },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.ink, borderRadius: radius.button, padding: 10 },
  toastText: { flex: 1, fontFamily: font.body, fontSize: 13, color: colors.card },
});
