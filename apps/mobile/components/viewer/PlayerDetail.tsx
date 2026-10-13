import { percentage, type PlayerLine } from '@basket-log/core';
import type { GameView, ViewPlayer } from '@basket-log/db';
import { colors } from '@basket-log/ui';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Court } from '@/components/tracker/Court';
import { TeamChip, font } from '@/components/wizard/kit';

import { feedRows, madeOf, pctText, playsOfPlayer, statusLabel } from './format';
import { PlayFeedRow } from './PlayFeed';
import { Bar, Card, SectionTitle, viewer } from './ui';

const EMPTY: PlayerLine = { pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, tov: 0, pf: 0 };

function Split({ label, made, attempts, color }: { label: string; made: number; attempts: number; color: string }) {
  return (
    <Card style={styles.split}>
      <Text style={styles.splitLabel}>{label}</Text>
      <Text style={styles.splitValue}>{madeOf(made, attempts)}</Text>
      <Bar value={made} total={attempts} color={color} />
      <Text style={viewer.muted}>{pctText(percentage(made, attempts))}</Text>
    </Card>
  );
}

/** Phone layout 1h: header, PTS/REB/AST, split cards, mini court, the player's plays. */
export function PlayerDetail({ game, player }: { game: GameView; player: ViewPlayer }) {
  const line = game.derived.players[player.id] ?? EMPTY;
  const team = game.teams[player.side];
  const reb = line.oreb + line.dreb;
  const shots = useMemo(() => game.derived.shots.filter((s) => s.playerId === player.id), [game.derived.shots, player.id]);
  const rows = useMemo(() => feedRows(playsOfPlayer(game, player.id)), [game, player.id]);
  const { score } = game.derived;
  const gameLine = `${game.teams.home.abbr} ${score.home}–${score.away} ${game.teams.away.abbr} · ${statusLabel(game.status)}`;

  return (
    <View style={{ gap: 14 }}>
      <View style={[styles.header, { backgroundColor: colors.green }]}>
        <TeamChip abbr={team.abbr} color={team.color} size={56} />
        <View style={{ flex: 1 }}>
          <Text style={styles.headNumber}>#{player.number}</Text>
          <Text style={styles.headName} numberOfLines={1}>{player.displayName}</Text>
          <Text style={styles.headGame}>{team.name} · {gameLine}</Text>
        </View>
      </View>

      <View style={styles.statRow}>
        {([['PTS', line.pts], ['REB', reb], ['AST', line.ast]] as const).map(([label, value]) => (
          <View key={label} style={styles.stat}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.splitRow}>
        <Split label="FG" made={line.fgm} attempts={line.fga} color={team.color} />
        <Split label="3PT" made={line.tpm} attempts={line.tpa} color={team.color} />
        <Split label="FT" made={line.ftm} attempts={line.fta} color={team.color} />
      </View>

      <Card>
        <View style={styles.otherRow}>
          {([['STL', line.stl], ['BLK', line.blk], ['TO', line.tov], ['PF', line.pf]] as const).map(([label, value]) => (
            <View key={label} style={{ alignItems: 'center', flex: 1 }}>
              <Text style={styles.otherValue}>{value}</Text>
              <Text style={styles.statLabelDark}>{label}</Text>
            </View>
          ))}
        </View>
      </Card>

      <SectionTitle>Shots</SectionTitle>
      {shots.length ? (
        <Court shots={shots} sideColors={{ home: game.teams.home.color, away: game.teams.away.color }} disabled />
      ) : (
        <Text style={viewer.muted}>No located shots.</Text>
      )}

      <SectionTitle>Plays</SectionTitle>
      {rows.length ? (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {rows.map((row) => (
            <PlayFeedRow key={row.groupId} row={row} color={game.teams[row.side].color} />
          ))}
        </Card>
      ) : (
        <Text style={viewer.muted}>No plays involving {player.displayName} yet.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16 },
  headNumber: { fontFamily: font.display, fontSize: 28, color: colors.card },
  headName: { fontFamily: font.displayBold, fontSize: 26, color: colors.card, textTransform: 'uppercase' },
  headGame: { fontFamily: font.body, fontSize: 13, color: colors.greenTint },
  statRow: { flexDirection: 'row', backgroundColor: colors.ink, borderRadius: 16, paddingVertical: 14 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: font.display, fontSize: 48, lineHeight: 52, color: colors.card },
  statLabel: { fontFamily: font.bodyBold, fontSize: 12, letterSpacing: 1, color: colors.mutedOnDark },
  statLabelDark: { fontFamily: font.bodyBold, fontSize: 12, letterSpacing: 1, color: colors.muted },
  splitRow: { flexDirection: 'row', gap: 8 },
  split: { flex: 1, padding: 12 },
  splitLabel: { fontFamily: font.bodyBold, fontSize: 12, letterSpacing: 1, color: colors.muted },
  splitValue: { fontFamily: font.display, fontSize: 26, color: colors.ink },
  otherRow: { flexDirection: 'row' },
  otherValue: { fontFamily: font.display, fontSize: 28, color: colors.ink },
});
