import { canStartNextPeriod, periodLabel, type Side } from '@basket-log/core';
import { colors, radius } from '@basket-log/ui';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TeamChip, font } from '../wizard/kit';
import { Court } from './Court';
import { clockText, lastPlays, playerName, shotClockText } from './format';
import { PromptPanel } from './PromptPanel';
import { EventGrid } from './QuickPad';
import { ShotPopover } from './ShotPopover';
import { TrackerMenu } from './TrackerMenu';
import { ActionButton, FoulBadge, Grid, TeamToggle } from './ui';
import { useTrackerUi, type ReadyTracker } from './useTrackerUi';

const GAP = 6;

/**
 * Phone in landscape (iPhone 15: 852 x 393): a 44 pt score bar, players on the left, the court filling the middle
 * and the shot / event pad on the right, so nothing scrolls. The chained-play questions replace the pad.
 */
export function PhoneLandscapeTracker({ t }: { t: ReadyTracker }) {
  const ui = useTrackerUi(t);
  const insets = useSafeAreaInsets();
  const { game, state, derived } = t;
  const { actions, busy } = ui;
  const fullSides = (['home', 'away'] as const).filter((s) => game.tracking[s] === 'full');
  const onlyFull: Side | undefined = fullSides.length === 1 ? fullSides[0] : undefined;
  const full = ui.isFull(ui.side);
  const team = ui.teamActions(ui.side);
  const [area, setArea] = useState({ w: 0, h: 0 });
  const [menu, setMenu] = useState(false);

  const { side, setSide } = ui;
  useEffect(() => {
    if (onlyFull && side !== onlyFull) setSide(onlyFull);
  }, [onlyFull, side, setSide]);

  // the biggest 500:470 court that fits the middle column, so there is nothing to scroll
  const courtW = Math.max(0, Math.min(area.w, (area.h * 500) / 470));
  const courtH = (courtW * 470) / 500;
  const onAreaLayout = (e: LayoutChangeEvent) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  const sideColors = { home: game.teams.home.color, away: game.teams.away.color };
  const last = lastPlays(derived, 1)[0];
  const label = periodLabel(game.rules, state.period);
  const canNext = canStartNextPeriod(game.rules, state.period, state.clockMs, derived.score);
  const shot = (points: 2 | 3, made: boolean) => (full ? actions.shot(points, made) : team.shot(points, made));
  const ft = (made: boolean) => (full ? actions.ft(made) : team.ft(made));

  return (
    <View style={[styles.root, { paddingLeft: Math.max(insets.left, 12), paddingRight: Math.max(insets.right, 12), paddingBottom: Math.max(insets.bottom, 8) }]}>
      <TrackerMenu t={t} visible={menu} onClose={() => setMenu(false)} />
      <View style={styles.bar}>
        <ActionButton label="☰" accessibilityLabel="Menu" tone="ghost" onPress={() => setMenu(true)} style={[styles.barButton, { width: 40, paddingHorizontal: 0 }]} />
        <TeamChip abbr={game.teams.home.abbr} color={game.teams.home.color} size={30} />
        <Text style={styles.score}>{derived.score.home}</Text>
        <Text numberOfLines={2} style={styles.fouls}>{derived.teamFouls.home} team fouls</Text>
        <View style={styles.barCentre}>
          <Text style={styles.clock}>
            <Text style={{ color: colors.greenLight }}>{label}</Text> {clockText(state.clockMs)}
          </Text>
          <View style={styles.shotClock}>
            <Text style={styles.shotClockText}>Shot {shotClockText(state.shotClockMs)}</Text>
          </View>
          <ActionButton
            label={state.clockRunning ? 'Pause' : 'Start'}
            onPress={t.toggleClock}
            tone={state.clockRunning ? 'green' : 'dark'}
            style={styles.barButton}
          />
          {canNext ? <ActionButton label="Next period" onPress={t.nextPeriod} tone="green" style={styles.barButton} /> : null}
        </View>
        <Text numberOfLines={2} style={[styles.fouls, { textAlign: 'right' }]}>{derived.teamFouls.away} team fouls</Text>
        <Text style={[styles.score, { color: colors.line }]}>{derived.score.away}</Text>
        <TeamChip abbr={game.teams.away.abbr} color={game.teams.away.color} size={30} />
        <ActionButton label="↶ Undo" tone="ghost" onPress={actions.undo} style={styles.barButton} />
      </View>

      <View style={styles.body}>
        <View style={styles.left}>
          {fullSides.length === 2 ? <TeamToggle game={game} side={ui.side} onChange={ui.setSide} /> : null}
          {full ? (
            derived.onCourt[ui.side].map((id) => {
              const selected = id === ui.playerId;
              const line = derived.players[id];
              return (
                <Pressable
                  key={id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => ui.selectPlayer(ui.side, id)}
                  style={[styles.tile, selected && styles.tileOn]}>
                  <Text style={[styles.tileNumber, selected && styles.onGreen]}>{game.players[id]?.number}</Text>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={[styles.tileName, selected && styles.onGreen]}>{playerName(game, id)}</Text>
                    <Text numberOfLines={1} style={[styles.tileMeta, selected && { color: colors.greenTint }]}>
                      {line?.pts ?? 0} PTS · {line?.pf ?? 0} PF
                    </Text>
                  </View>
                  <FoulBadge fouls={line?.pf ?? 0} limit={game.rules.foulsToFoulOut} />
                </Pressable>
              );
            })
          ) : (
            <Text style={styles.teamOnly}>{game.teams[ui.side].name.toUpperCase()} IS TEAM-ONLY</Text>
          )}
        </View>

        <View style={styles.centre}>
          <View style={styles.courtArea} onLayout={onAreaLayout}>
            {fullSides.length > 0 && courtW > 0 ? (
              <View style={{ width: courtW, height: courtH }}>
                <Court
                  shots={derived.shots}
                  sideColors={sideColors}
                  onlySide={ui.side}
                  onlyPlayer={ui.playerId}
                  pending={ui.pending}
                  onTap={ui.tapCourt}
                  disabled={busy}
                />
              </View>
            ) : null}
          </View>
          <Text numberOfLines={1} style={styles.lastPlay}>
            <Text style={{ fontFamily: font.bodyBold }}>Last · </Text>
            {last ? last.text : 'No plays yet'}
          </Text>
        </View>

        <View style={styles.right}>
          {ui.pending ? (
            <ScrollView>
              <ShotPopover
                key={`${ui.pending.x}-${ui.pending.y}`}
                t={t}
                ui={ui}
                location={ui.pending}
                initialSide={ui.side}
                allowedSides={fullSides}
                onClose={() => ui.setPending(null)}
              />
            </ScrollView>
          ) : t.prompt ? (
            <ScrollView>
              <PromptPanel t={t} onAnswer={actions.answer} onDone={actions.done} onCancel={actions.cancel} />
            </ScrollView>
          ) : (
            <>
              <Grid columns={2} gap={GAP}>
                {[
                  <ActionButton key="m2" label="+2 Made" tone="green" disabled={busy} onPress={() => shot(2, true)} />,
                  <ActionButton key="x2" label="2 Miss" tone="miss" disabled={busy} onPress={() => shot(2, false)} />,
                  <ActionButton key="m3" label="+3 Made" tone="green" disabled={busy} onPress={() => shot(3, true)} />,
                  <ActionButton key="x3" label="3 Miss" tone="miss" disabled={busy} onPress={() => shot(3, false)} />,
                  <ActionButton key="f1" label="+1 FT" tone="greenDark" disabled={busy} onPress={() => ft(true)} />,
                  <ActionButton key="fx" label="FT Miss" tone="miss" disabled={busy} onPress={() => ft(false)} />,
                ]}
              </Grid>
              <EventGrid ui={ui} columns={3} short gap={GAP} />
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper, paddingTop: 8, gap: 8 },
  bar: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.ink, borderRadius: radius.button, paddingHorizontal: 10 },
  score: { fontFamily: font.display, fontSize: 32, color: colors.card, minWidth: 38, textAlign: 'center' },
  fouls: { width: 44, fontFamily: font.body, fontSize: 10, lineHeight: 12, color: colors.mutedOnDark },
  barCentre: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  clock: { fontFamily: font.displayBold, fontSize: 24, color: colors.card },
  shotClock: { backgroundColor: colors.ink2, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  shotClockText: { fontFamily: font.bodyBold, fontSize: 12, color: colors.card },
  barButton: { borderRadius: 8, paddingHorizontal: 12, minHeight: 34 },
  body: { flex: 1, flexDirection: 'row', gap: 8 },
  left: { width: 118, gap: 4 },
  centre: { flex: 1, gap: 4 },
  courtArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  lastPlay: { height: 14, fontFamily: font.body, fontSize: 11, color: colors.muted },
  right: { width: 300 },
  tile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    borderRadius: radius.small,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  tileOn: { backgroundColor: colors.green, borderColor: colors.green },
  tileNumber: { width: 28, fontFamily: font.displayBold, fontSize: 24, color: colors.ink },
  tileName: { fontFamily: font.bodyBold, fontSize: 13, color: colors.ink },
  tileMeta: { fontFamily: font.body, fontSize: 10, color: colors.muted },
  onGreen: { color: colors.card },
  teamOnly: { fontFamily: font.bodyBold, fontSize: 11, letterSpacing: 1, color: colors.muted },
});
