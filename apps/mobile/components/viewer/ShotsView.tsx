import { percentage, shotZones, type PlayerLine, type Side } from '@basket-log/core';
import type { GameView } from '@basket-log/db';
import { colors, radius } from '@basket-log/ui';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

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

// where each zone's percentage sits on the half court (500 x 470 units)
const ZONE_SPOTS = { paint: { x: 250, y: 150 }, midRange: { x: 105, y: 255 }, corner3: { x: 435, y: 70 }, aboveBreak3: { x: 250, y: 405 } } as const;

const EMPTY: PlayerLine = { pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, tov: 0, pf: 0 };

/**
 * Shots tab. Portrait: team and player chips, a court of limited size and the four zone cards. `landscape` fills the
 * space it is given without scrolling: players on the left, the court on the right with each zone's percentage on it.
 */
export function ShotsView({ game, landscape = false }: { game: GameView; landscape?: boolean }) {
  const [side, setSide] = useState<Side>('home');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const shots = game.derived.shots;
  const roster = useMemo(() => game.players.filter((p) => p.side === side), [game.players, side]);
  const mine = useMemo(() => shots.filter((s) => s.side === side && (!playerId || s.playerId === playerId)), [shots, side, playerId]);
  const zones = useMemo(() => shotZones(mine), [mine]);
  const fgMade = mine.filter((s) => s.made).length;
  const sideColors = { home: game.teams.home.color, away: game.teams.away.color };
  const summary = mine.length ? `${fgMade}/${mine.length} located shots · ${pctText(percentage(fgMade, mine.length))}` : 'No located shots yet.';
  const lineOf = (id: string): PlayerLine => game.derived.players[id] ?? EMPTY;

  const pickSide = (s: Side) => {
    setSide(s);
    setPlayerId(null);
  };

  const teamChips = (
    <ChipRow>
      {(['home', 'away'] as const).map((s) => (
        <Chip key={s} label={game.teams[s].abbr} active={side === s} onPress={() => pickSide(s)} />
      ))}
    </ChipRow>
  );

  const playerRow = (id: string | null, label: string, meta: string) => {
    const on = playerId === id;
    return (
      <Pressable key={id ?? 'all'} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setPlayerId(id)} style={[styles.player, on && styles.playerOn]}>
        <Text style={[styles.playerName, on && { color: colors.card }]} numberOfLines={1}>{label}</Text>
        <Text style={[styles.playerMeta, on && { color: colors.greenTint }]}>{meta}</Text>
      </Pressable>
    );
  };

  if (landscape) {
    const courtW = Math.max(0, Math.min(box.w, (box.h * 500) / 470));
    const courtH = (courtW * 470) / 500;
    const onLayout = (e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
    return (
      <View style={styles.landscape}>
        <View style={styles.left}>
          {teamChips}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 6 }}>
            {playerRow(null, 'All players', `${fgMade}/${mine.length}`)}
            {roster.map((p) => playerRow(p.id, `#${p.number} ${p.displayName}`, `${lineOf(p.id).fgm}/${lineOf(p.id).fga}`))}
          </ScrollView>
          <Text style={styles.summary} numberOfLines={1}>{summary}</Text>
        </View>
        <View style={styles.right} onLayout={onLayout}>
          {courtW > 0 ? (
            <View style={{ width: courtW, height: courtH }}>
              <Court shots={shots} sideColors={sideColors} onlySide={side} onlyPlayer={playerId} disabled />
              {ZONES.map((z) => {
                const line = zones[z.key];
                const spot = ZONE_SPOTS[z.key];
                return (
                  <View
                    key={z.key}
                    pointerEvents="none"
                    style={[styles.zonePill, { left: (spot.x / 500) * courtW - 34, top: (spot.y / 470) * courtH - 15 }]}>
                    <Text style={styles.zonePillPct}>{pctText(percentage(line.made, line.attempts)).replace('.0%', '%')}</Text>
                    <Text style={styles.zonePillMeta}>{z.label} {line.made}/{line.attempts}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {teamChips}
      <ChipRow>
        <Chip label="All players" active={playerId === null} onPress={() => setPlayerId(null)} />
        {roster.map((p) => (
          <Chip key={p.id} label={`#${p.number} ${p.displayName}`} active={playerId === p.id} onPress={() => setPlayerId(p.id)} />
        ))}
      </ChipRow>
      <View style={{ alignItems: 'center' }}>
        <View style={{ width: '100%', maxWidth: 340 }}>
          <Court shots={shots} sideColors={sideColors} onlySide={side} onlyPlayer={playerId} disabled />
        </View>
      </View>
      <Text style={viewer.muted}>{summary}</Text>
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
  landscape: { flex: 1, flexDirection: 'row', gap: 12 },
  left: { width: 250, gap: 8 },
  right: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  player: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 12, borderRadius: radius.small, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.card },
  playerOn: { backgroundColor: colors.green, borderColor: colors.green },
  playerName: { flex: 1, fontFamily: font.bodyBold, fontSize: 14, color: colors.ink },
  playerMeta: { fontFamily: font.body, fontSize: 12, color: colors.muted },
  summary: { fontFamily: font.body, fontSize: 12, color: colors.muted },
  zonePill: { position: 'absolute', width: 68, alignItems: 'center', backgroundColor: 'rgba(17,19,17,0.78)', borderRadius: 8, paddingVertical: 3 },
  zonePillPct: { fontFamily: font.displayBold, fontSize: 15, lineHeight: 16, color: colors.card },
  zonePillMeta: { fontFamily: font.body, fontSize: 8, color: colors.mutedOnDark },
});
