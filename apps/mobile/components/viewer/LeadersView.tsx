import { percentage, teamLeaders, teamTotals, type PlayerLine, type Side } from '@basket-log/core';
import type { GameView } from '@basket-log/db';
import { colors } from '@basket-log/ui';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TeamChip, font } from '@/components/wizard/kit';

import { pctText } from './format';
import { Bar, Card, SectionTitle } from './ui';

const CATEGORIES = [
  { key: 'pts', label: 'PTS' },
  { key: 'reb', label: 'REB' },
  { key: 'ast', label: 'AST' },
] as const;

const COMPARE: { label: string; value: (l: ReturnType<typeof teamTotals>) => number; percent?: boolean }[] = [
  { label: 'FG%', value: (t) => percentage(t.fgm, t.fga) ?? 0, percent: true },
  { label: '3P%', value: (t) => percentage(t.tpm, t.tpa) ?? 0, percent: true },
  { label: 'FT%', value: (t) => percentage(t.ftm, t.fta) ?? 0, percent: true },
  { label: 'Rebounds', value: (t) => t.reb },
  { label: 'Assists', value: (t) => t.ast },
  { label: 'Steals', value: (t) => t.stl },
  { label: 'Blocks', value: (t) => t.blk },
  { label: 'Turnovers', value: (t) => t.tov },
];

/** Leaders tab: best scorer, rebounder and passer per team, then a team comparison. */
export function LeadersView({ game }: { game: GameView }) {
  const router = useRouter();
  const lines = (side: Side): Record<string, PlayerLine> =>
    Object.fromEntries(game.players.filter((p) => p.side === side).map((p) => [p.id, game.derived.players[p.id]!]).filter(([, l]) => l));
  const totals = { home: teamTotals(Object.values(lines('home'))), away: teamTotals(Object.values(lines('away'))) };
  const name = (id: string) => {
    const p = game.players.find((x) => x.id === id);
    return p ? `#${p.number} ${p.displayName}` : id;
  };

  return (
    <View style={{ gap: 14 }}>
      {(['home', 'away'] as const).map((side) => {
        const leaders = teamLeaders(lines(side));
        return (
          <Card key={side}>
            <View style={styles.teamRow}>
              <TeamChip abbr={game.teams[side].abbr} color={game.teams[side].color} size={32} />
              <SectionTitle>{game.teams[side].name}</SectionTitle>
            </View>
            {CATEGORIES.map((c) => {
              const leader = leaders[c.key];
              return (
                <Pressable
                  key={c.key}
                  disabled={!leader}
                  accessibilityRole="button"
                  onPress={() => leader && router.push({ pathname: '/player-view/[gameId]/[playerId]', params: { gameId: game.id, playerId: leader.playerId } })}
                  style={styles.leader}>
                  <Text style={styles.leaderValue}>{leader?.value ?? 0}</Text>
                  <Text style={styles.leaderCat}>{c.label}</Text>
                  <Text style={styles.leaderName} numberOfLines={1}>{leader && leader.value > 0 ? name(leader.playerId) : '–'}</Text>
                </Pressable>
              );
            })}
          </Card>
        );
      })}
      <SectionTitle>Team comparison</SectionTitle>
      <Card>
        {COMPARE.map((row) => {
          const h = row.value(totals.home);
          const a = row.value(totals.away);
          const show = (v: number) => (row.percent ? pctText(v) : String(v));
          return (
            <View key={row.label} style={{ gap: 4 }}>
              <View style={styles.compareHead}>
                <Text style={styles.compareValue}>{show(h)}</Text>
                <Text style={styles.compareLabel}>{row.label}</Text>
                <Text style={styles.compareValue}>{show(a)}</Text>
              </View>
              <View style={styles.compareBars}>
                <View style={{ flex: Math.max(h, 0.001) }}><Bar value={1} total={1} color={game.teams.home.color} /></View>
                <View style={{ flex: Math.max(a, 0.001) }}><Bar value={1} total={1} color={game.teams.away.color} /></View>
              </View>
            </View>
          );
        })}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  leader: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, borderTopWidth: 1, borderTopColor: colors.line2 },
  leaderValue: { width: 44, fontFamily: font.display, fontSize: 30, color: colors.ink },
  leaderCat: { width: 36, fontFamily: font.bodyBold, fontSize: 12, letterSpacing: 0.8, color: colors.muted },
  leaderName: { flex: 1, fontFamily: font.bodyBold, fontSize: 15, color: colors.ink },
  compareHead: { flexDirection: 'row', justifyContent: 'space-between' },
  compareValue: { fontFamily: font.bodyBold, fontSize: 14, color: colors.ink },
  compareLabel: { fontFamily: font.bodyBold, fontSize: 12, letterSpacing: 0.8, color: colors.muted, textTransform: 'uppercase' },
  compareBars: { flexDirection: 'row', gap: 4 },
});
