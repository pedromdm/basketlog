import { canStartNextPeriod, periodLabel, timeoutsLeft, type Side } from '@basket-log/core';
import { colors } from '@basket-log/ui';
import { StyleSheet, Text, View } from 'react-native';

import { TeamChip, font } from '../wizard/kit';
import { clockText, isBonus, shotClockText } from './format';
import { ActionButton, SyncPill } from './ui';
import type { ReadyTracker } from './useTrackerUi';

function TeamBlock({ t, side, compact }: { t: ReadyTracker; side: Side; compact: boolean }) {
  const { game, state, derived } = t;
  const team = game.teams[side];
  const fouls = derived.teamFouls[side];
  const left = timeoutsLeft(game.rules, state.events, side, state.period);
  const bonus = isBonus(game.rules, fouls);
  const align = side === 'home' ? 'flex-start' : 'flex-end';
  const info = (
    <View style={{ alignItems: align, flexShrink: 1 }}>
      <Text numberOfLines={1} style={[styles.teamName, compact && { fontSize: 16 }]}>
        {(compact ? team.abbr : team.name).toUpperCase()}
      </Text>
      <Text numberOfLines={1} style={styles.teamMeta}>
        Fouls {fouls} · TO left {left}
        {bonus ? ' · Bonus' : ''}
      </Text>
    </View>
  );
  const score = (
    <Text style={[styles.score, compact && { fontSize: 36 }, side === 'away' && { color: colors.line }]}>{derived.score[side]}</Text>
  );
  const chip = <TeamChip abbr={team.abbr} color={team.color} size={compact ? 32 : 46} />;
  return (
    <View style={[styles.team, { justifyContent: side === 'home' ? 'flex-start' : 'flex-end' }]}>
      {side === 'home' ? (
        <>
          {chip}
          {info}
          {score}
        </>
      ) : (
        <>
          {score}
          {info}
          {chip}
        </>
      )}
    </View>
  );
}

/** Score bar: both teams (score, fouls, timeouts left, bonus), period + game clock, shot clock, controls, sync pill. */
export function ScoreBar({ t, compact = false }: { t: ReadyTracker; compact?: boolean }) {
  const { game, state, derived } = t;
  const label = periodLabel(game.rules, state.period);
  const canNext = canStartNextPeriod(game.rules, state.period, state.clockMs, derived.score);
  return (
    <View style={[styles.bar, compact && { paddingVertical: 8, paddingHorizontal: 12 }]}>
      <TeamBlock t={t} side="home" compact={compact} />
      <View style={styles.center}>
        <Text style={[styles.clock, compact && { fontSize: 26 }]}>
          <Text style={{ color: colors.greenLight }}>{label}</Text> {clockText(state.clockMs)}
        </Text>
        <View style={styles.centerRow}>
          <View style={styles.shotClock}>
            <Text style={styles.shotClockText}>SHOT {shotClockText(state.shotClockMs)}</Text>
          </View>
          <ActionButton
            label={state.clockRunning ? 'Pause' : 'Start clock'}
            onPress={t.toggleClock}
            tone={state.clockRunning ? 'green' : 'dark'}
            height={36}
            style={styles.clockButton}
          />
          {canNext ? <ActionButton label="Next period" onPress={t.nextPeriod} tone="green" height={36} style={styles.clockButton} /> : null}
        </View>
        {!compact ? <SyncPill sync={t.sync} /> : null}
      </View>
      <TeamBlock t={t} side="away" compact={compact} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 24, gap: 12 },
  team: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  teamName: { fontFamily: font.displayBold, fontSize: 22, color: colors.card },
  teamMeta: { fontFamily: font.body, fontSize: 12, color: colors.mutedOnDark },
  score: { fontFamily: font.display, fontSize: 56, color: colors.card, minWidth: 64, textAlign: 'center' },
  center: { alignItems: 'center', gap: 4 },
  centerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  clock: { fontFamily: font.displayBold, fontSize: 34, color: colors.card },
  shotClock: { backgroundColor: colors.ink2, borderRadius: 8, paddingHorizontal: 10, minHeight: 36, justifyContent: 'center' },
  shotClockText: { fontFamily: font.bodyBold, fontSize: 12, color: colors.card },
  clockButton: { borderRadius: 8, paddingHorizontal: 12 },
});
