import { periodLabel } from '@basket-log/core';
import type { GameView } from '@basket-log/db';
import { colors, radius } from '@basket-log/ui';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { font } from '@/components/wizard/kit';

import { feedPeriods, feedRows, type FeedRow } from './format';
import { Chip, ChipRow, Card, viewer } from './ui';

export function PlayFeedRow({ row, color }: { row: FeedRow; color: string }) {
  const scoring = row.points > 0;
  return (
    <View style={styles.row}>
      <Text style={styles.clock}>{row.clock}</Text>
      <View style={[styles.bar, { backgroundColor: color }]} />
      <View style={styles.body}>
        <Text style={[styles.text, scoring && styles.textScoring]}>{row.text}</Text>
        {scoring ? (
          <View style={styles.tag}>
            <Text style={styles.tagText}>+{row.points}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.score, scoring && styles.scoreScoring]}>{row.score}</Text>
    </View>
  );
}

/** Plays tab: period chips, then the feed newest first. */
export function PlayFeed({ game }: { game: GameView }) {
  const rows = useMemo(() => feedRows(game.derived.plays), [game.derived.plays]);
  const periods = useMemo(() => feedPeriods(rows), [rows]);
  const [period, setPeriod] = useState<number | null>(null);
  const shown = period === null ? rows : rows.filter((r) => r.period === period);

  if (!rows.length) {
    return <Text style={viewer.muted}>No plays yet.</Text>;
  }
  return (
    <View style={{ gap: 12 }}>
      <ChipRow>
        <Chip label="All" active={period === null} onPress={() => setPeriod(null)} />
        {periods.map((p) => (
          <Chip key={p} label={periodLabel(game.rules, p)} active={period === p} onPress={() => setPeriod(p)} />
        ))}
      </ChipRow>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {shown.map((row) => (
          <PlayFeedRow key={row.groupId} row={row} color={game.teams[row.side].color} />
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.line2, minHeight: 48 },
  clock: { width: 44, fontFamily: font.displayBold, fontSize: 16, color: colors.muted, alignSelf: 'center' },
  bar: { width: 4, borderRadius: 2 },
  body: { flex: 1, gap: 4, justifyContent: 'center' },
  text: { fontFamily: font.body, fontSize: 14, color: colors.ink },
  textScoring: { fontFamily: font.bodyBold },
  tag: { alignSelf: 'flex-start', backgroundColor: colors.greenTint, borderRadius: radius.badge, paddingHorizontal: 6, paddingVertical: 1 },
  tagText: { fontFamily: font.bodyBold, fontSize: 11, color: colors.greenDark },
  score: { fontFamily: font.displayBold, fontSize: 16, color: colors.muted, alignSelf: 'center' },
  scoreScoring: { color: colors.ink },
});
