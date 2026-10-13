import { percentage, shotZones, type Side } from '@basket-log/core';
import type { GameView } from '@basket-log/db';
import { colors } from '@basket-log/ui';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Court } from '@/components/tracker/Court';
import { font } from '@/components/wizard/kit';

import { pctText } from './format';
import { Bar, Card, Chip, ChipRow, SectionTitle, viewer } from './ui';

const ZONES = [
  { key: 'paint', label: 'Paint' },
  { key: 'midRange', label: 'Mid-range' },
  { key: 'corner3', label: 'Corner 3' },
  { key: 'aboveBreak3', label: 'Above-break 3' },
] as const;

/** Shots tab: team chips, the court with that team's shots, and the four zone cards. */
export function ShotsView({ game }: { game: GameView }) {
  const [side, setSide] = useState<Side>('home');
  const shots = game.derived.shots;
  const mine = useMemo(() => shots.filter((s) => s.side === side), [shots, side]);
  const zones = useMemo(() => shotZones(mine), [mine]);
  const fgMade = mine.filter((s) => s.made).length;

  return (
    <View style={{ gap: 12 }}>
      <ChipRow>
        {(['home', 'away'] as const).map((s) => (
          <Chip key={s} label={game.teams[s].abbr} active={side === s} onPress={() => setSide(s)} />
        ))}
      </ChipRow>
      <Court shots={shots} sideColors={{ home: game.teams.home.color, away: game.teams.away.color }} onlySide={side} disabled />
      <Text style={viewer.muted}>
        {mine.length ? `${fgMade}/${mine.length} located shots · ${pctText(percentage(fgMade, mine.length))}` : 'No located shots yet.'}
      </Text>
      <SectionTitle>Zones</SectionTitle>
      <View style={styles.grid}>
        {ZONES.map((z) => {
          const line = zones[z.key];
          return (
            <Card key={z.key} style={styles.zone}>
              <Text style={styles.zoneLabel}>{z.label}</Text>
              <Text style={styles.zonePct}>{pctText(percentage(line.made, line.attempts))}</Text>
              <Bar value={line.made} total={line.attempts} color={game.teams[side].color} />
              <Text style={viewer.muted}>{line.made}/{line.attempts} FG</Text>
            </Card>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  zone: { flexBasis: '47%', flexGrow: 1 },
  zoneLabel: { fontFamily: font.bodyBold, fontSize: 12, letterSpacing: 0.8, color: colors.muted, textTransform: 'uppercase' },
  zonePct: { fontFamily: font.display, fontSize: 30, color: colors.ink },
});
