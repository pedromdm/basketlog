import { canStartNextPeriod, periodLabel, timeoutsLeft, type Side } from '@basket-log/core';
import { colors } from '@basket-log/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TeamChip, font } from '../wizard/kit';
import { clockText, isBonus, shotClockText } from './format';
import { ActionButton, SyncPill } from './ui';
import type { ReadyTracker } from './useTrackerUi';

function TeamBlock({ t, side, compact, selected, onSelect }: { t: ReadyTracker; side: Side; compact: boolean; selected?: boolean; onSelect?: () => void }) {
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
        {compact ? `F ${fouls} · TO ${left}${bonus ? ' · Bonus' : ''}` : `Fouls ${fouls} · TO left ${left}${bonus ? ' · Bonus' : ''}`}
      </Text>
    </View>
  );
  const score = (
    <Text style={[styles.score, compact && { fontSize: 34, minWidth: 34 }, side === 'away' && { color: colors.line }]}>{derived.score[side]}</Text>
  );
  const chip = <TeamChip abbr={team.abbr} color={team.color} size={compact ? 26 : 46} />;
  return (
    <Pressable
      disabled={!onSelect}
      onPress={onSelect}
      accessibilityRole={onSelect ? 'button' : undefined}
      accessibilityLabel={onSelect ? `Track ${team.name}` : undefined}
      accessibilityState={onSelect ? { selected: !!selected } : undefined}
      style={[
        styles.team,
        compact && { gap: 6, minWidth: 0 },
        { justifyContent: side === 'home' ? 'flex-start' : 'flex-end' },
        onSelect && { borderRadius: 10, borderWidth: 2, borderColor: selected ? colors.greenLight : 'transparent', padding: 4 },
      ]}>
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
    </Pressable>
  );
}

/** Score bar: both teams (score, fouls, timeouts left, bonus), period + game clock, shot clock, controls, sync pill. */
export function ScoreBar({
  t,
  compact = false,
  selectedSide,
  onSelectSide,
  onMenu,
}: {
  t: ReadyTracker;
  compact?: boolean;
  /** With `onSelectSide`, the team blocks become buttons that pick the team being tracked (phone portrait). */
  selectedSide?: Side;
  onSelectSide?: (side: Side) => void;
  /** Opens the tracker menu (leave / finish game). */
  onMenu?: () => void;
}) {
  const { game, state, derived } = t;
  const label = periodLabel(game.rules, state.period);
  const canNext = canStartNextPeriod(game.rules, state.period, state.clockMs, derived.score);
  const home = (
    <TeamBlock t={t} side="home" compact={compact} selected={selectedSide === 'home'} {...(onSelectSide ? { onSelect: () => onSelectSide('home') } : {})} />
  );
  const away = (
    <TeamBlock t={t} side="away" compact={compact} selected={selectedSide === 'away'} {...(onSelectSide ? { onSelect: () => onSelectSide('away') } : {})} />
  );
  const centre = (
    <View style={compact ? styles.centerCompact : styles.center}>
      <Text style={[styles.clock, compact && { fontSize: 26 }]}>
        <Text style={{ color: colors.greenLight }}>{label}</Text> {clockText(state.clockMs)}
      </Text>
      <View style={[styles.centerRow, compact && { flexWrap: 'wrap', justifyContent: 'center' }]}>
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
        {compact ? <SyncPill sync={t.sync} /> : null}
      </View>
      {!compact ? <SyncPill sync={t.sync} /> : null}
    </View>
  );

  // Compact (phone portrait): exactly two lines. Line 1: chip, score and fouls per team around the clock.
  // Line 2: shot clock, clock controls and sync status.
  if (compact) {
    const side = (s: Side) => {
      const team = game.teams[s];
      const score = (
        <Text style={[styles.score, { fontSize: 34, minWidth: 34 }, s === 'away' && { color: colors.line }]}>{derived.score[s]}</Text>
      );
      const fouls = <Text style={[styles.foulsTag, s === 'away' && { textAlign: 'right' }]}>F{derived.teamFouls[s]}</Text>;
      const chip = <TeamChip abbr={team.abbr} color={team.color} size={26} />;
      const selected = selectedSide === s;
      return (
        <Pressable
          disabled={!onSelectSide}
          onPress={() => onSelectSide?.(s)}
          accessibilityRole={onSelectSide ? 'button' : undefined}
          accessibilityLabel={`Track ${team.name}, ${derived.teamFouls[s]} team fouls`}
          accessibilityState={onSelectSide ? { selected } : undefined}
          style={[
            styles.compactTeam,
            { justifyContent: s === 'home' ? 'flex-start' : 'flex-end' },
            onSelectSide && { borderColor: selected ? colors.greenLight : 'transparent' },
          ]}>
          {s === 'home' ? (
            <>
              {chip}
              {score}
              {fouls}
            </>
          ) : (
            <>
              {fouls}
              {score}
              {chip}
            </>
          )}
        </Pressable>
      );
    };
    return (
      <View style={[styles.bar, { flexDirection: 'column', alignItems: 'stretch', paddingVertical: 6, paddingHorizontal: 10, gap: 6 }]}>
        <View style={styles.line}>
          {side('home')}
          <Text style={[styles.clock, { fontSize: 26 }]}>
            <Text style={{ color: colors.greenLight }}>{label}</Text> {clockText(state.clockMs)}
          </Text>
          {side('away')}
        </View>
        <View style={[styles.line, { height: 40, gap: 8 }]}>
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
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
            <SyncPill sync={t.sync} />
            {onMenu ? <ActionButton label="☰" accessibilityLabel="Menu" tone="ghost" onPress={onMenu} style={styles.menuButton} /> : null}
          </View>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.bar}>
      {onMenu ? <ActionButton label="☰" accessibilityLabel="Menu" tone="ghost" onPress={onMenu} style={styles.menuButton} /> : null}
      {home}
      {centre}
      {away}
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
  line: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 6 },
  compactTeam: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, borderWidth: 2, paddingHorizontal: 2, minWidth: 0 },
  foulsTag: { fontFamily: font.bodyBold, fontSize: 10, color: colors.mutedOnDark, minWidth: 18 },
  centerCompact: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 10 },
  centerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  clock: { fontFamily: font.displayBold, fontSize: 34, color: colors.card },
  shotClock: { backgroundColor: colors.ink2, borderRadius: 8, paddingHorizontal: 10, minHeight: 36, justifyContent: 'center' },
  shotClockText: { fontFamily: font.bodyBold, fontSize: 12, color: colors.card },
  menuButton: { width: 44, paddingHorizontal: 0, borderRadius: 8 },
  clockButton: { borderRadius: 8, paddingHorizontal: 12 },
});
