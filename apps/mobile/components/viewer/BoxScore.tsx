import { boxScoreCsv, percentage, teamTotals, type PlayerLine, type Side } from '@basket-log/core';
import type { GameView, ViewPlayer } from '@basket-log/db';
import { colors } from '@basket-log/ui';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { Button, font } from '@/components/wizard/kit';

import { madeOf, pctText } from './format';
import { Card, viewer } from './ui';

const EMPTY: PlayerLine = { pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, tov: 0, pf: 0 };

const NAME_W = 132;
const COL_W = 46;
const WIDE_W = 58;
const COLUMNS = [
  { key: 'MIN', w: COL_W }, { key: 'PTS', w: COL_W }, { key: 'FG', w: WIDE_W }, { key: '3PT', w: WIDE_W }, { key: 'FT', w: WIDE_W },
  { key: 'REB', w: COL_W }, { key: 'AST', w: COL_W }, { key: 'STL', w: COL_W }, { key: 'BLK', w: COL_W }, { key: 'TO', w: COL_W },
  { key: 'PF', w: COL_W }, { key: '+/−', w: COL_W },
] as const;

function cells(l: PlayerLine): string[] {
  return ['–', String(l.pts), madeOf(l.fgm, l.fga), madeOf(l.tpm, l.tpa), madeOf(l.ftm, l.fta), String(l.oreb + l.dreb), String(l.ast), String(l.stl), String(l.blk), String(l.tov), String(l.pf), '–'];
}

function Row({ name, values, bold, onPress, divider }: { name: string; values: string[]; bold?: boolean; onPress?: () => void; divider?: boolean }) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} accessibilityRole={onPress ? 'button' : undefined} style={[styles.row, divider && styles.rowDivider]}>
      <Text style={[styles.name, bold && styles.bold]} numberOfLines={1}>{name}</Text>
      {values.map((v, i) => (
        <Text key={COLUMNS[i]!.key} style={[styles.cell, { width: COLUMNS[i]!.w }, bold && styles.bold]}>{v}</Text>
      ))}
    </Pressable>
  );
}

function TeamTable({ game, side }: { game: GameView; side: Side }) {
  const router = useRouter();
  const roster = game.players.filter((p) => p.side === side);
  const starters = roster.filter((p) => p.starter);
  const bench = roster.filter((p) => !p.starter);
  const line = (p: ViewPlayer) => game.derived.players[p.id] ?? EMPTY;
  const totals = teamTotals(roster.map(line));
  const open = (p: ViewPlayer) => () => router.push({ pathname: '/player-view/[gameId]/[playerId]', params: { gameId: game.id, playerId: p.id } });
  const label = (p: ViewPlayer) => `#${p.number} ${p.displayName}`;

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <View style={[styles.teamBar, { backgroundColor: game.teams[side].color }]}>
        <Text style={styles.teamBarText}>{game.teams[side].name}</Text>
        <Text style={styles.teamBarSub}>
          FG {pctText(percentage(totals.fgm, totals.fga))} · 3P {pctText(percentage(totals.tpm, totals.tpa))} · FT {pctText(percentage(totals.ftm, totals.fta))}
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          <View style={[styles.row, styles.headRow]}>
            <Text style={[styles.name, styles.head]}>PLAYER</Text>
            {COLUMNS.map((c) => (
              <Text key={c.key} style={[styles.cell, styles.head, { width: c.w }]}>{c.key}</Text>
            ))}
          </View>
          {starters.map((p) => <Row key={p.id} name={label(p)} values={cells(line(p))} onPress={open(p)} />)}
          {bench.length ? <Text style={styles.benchLabel}>BENCH</Text> : null}
          {bench.map((p) => <Row key={p.id} name={label(p)} values={cells(line(p))} onPress={open(p)} />)}
          <Row name="TOTAL" values={cells(totals)} bold divider />
        </View>
      </ScrollView>
    </Card>
  );
}

/** Box score tab: one table per team, plus CSV export through the system share sheet. */
export function BoxScore({ game }: { game: GameView }) {
  const exportCsv = async () => {
    const csv = boxScoreCsv({
      teams: { home: { name: game.teams.home.name }, away: { name: game.teams.away.name } },
      players: game.players,
      lines: game.derived.players,
    });
    await Share.share({ title: `${game.teams.home.abbr} vs ${game.teams.away.abbr} box score`, message: csv });
  };

  return (
    <View style={{ gap: 14 }}>
      <TeamTable game={game} side="home" />
      <TeamTable game={game} side="away" />
      <Text style={viewer.muted}>Minutes and plus/minus are not tracked yet. Tap a player for their game.</Text>
      <Button kind="outline" label="Export CSV" onPress={() => void exportCsv()} />
    </View>
  );
}

const styles = StyleSheet.create({
  teamBar: { paddingHorizontal: 12, paddingVertical: 10, gap: 2 },
  teamBarText: { fontFamily: font.displayBold, fontSize: 20, color: colors.card, textTransform: 'uppercase' },
  teamBarSub: { fontFamily: font.body, fontSize: 12, color: colors.card },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: 12 },
  rowDivider: { borderTopWidth: 1.5, borderTopColor: colors.line },
  headRow: { minHeight: 36, backgroundColor: colors.line2 },
  name: { width: NAME_W, fontFamily: font.body, fontSize: 14, color: colors.ink },
  cell: { fontFamily: font.body, fontSize: 14, color: colors.ink, textAlign: 'center' },
  head: { fontFamily: font.bodyBold, fontSize: 11, color: colors.muted, letterSpacing: 0.6 },
  bold: { fontFamily: font.bodyBold },
  benchLabel: { fontFamily: font.bodyBold, fontSize: 11, letterSpacing: 1, color: colors.muted, backgroundColor: colors.line2, paddingHorizontal: 12, paddingVertical: 6 },
});
