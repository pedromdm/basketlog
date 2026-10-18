import type { Side } from '@basket-log/core';
import { colors, radius } from '@basket-log/ui';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { font } from '../wizard/kit';
import { Court } from './Court';
import { PlayerTiles } from './PlayerCards';
import { PlayList } from './Plays';
import { PromptPanel } from './PromptPanel';
import { EventGrid, TeamOnlyBar } from './QuickPad';
import { ScoreBar } from './ScoreBar';
import { ShotPopover } from './ShotPopover';
import { TrackerMenu } from './TrackerMenu';
import { ActionButton, Grid } from './ui';
import { lastPlays } from './format';
import { useTrackerUi, type ReadyTracker } from './useTrackerUi';

const GAP = 6;

/**
 * Phone in portrait (iPhone 15: 393 x 852), court first: score bar (tap a team to track it), court, the five
 * on-court players, shots, events, and a last-play bar with Undo. It is sized to fit without scrolling; the
 * ScrollView only catches smaller phones. The shot spot and the chained-play questions open as bottom sheets.
 */
export function PhoneTracker({ t }: { t: ReadyTracker }) {
  const ui = useTrackerUi(t);
  const insets = useSafeAreaInsets();
  const { game, derived } = t;
  const [showPlays, setShowPlays] = useState(false);
  const [menu, setMenu] = useState(false);
  const fullSides = (['home', 'away'] as const).filter((s) => game.tracking[s] === 'full');
  const onlyFull: Side | undefined = fullSides.length === 1 ? fullSides[0] : undefined;
  const full = ui.isFull(ui.side);

  const { side, setSide } = ui;
  useEffect(() => {
    if (onlyFull && side !== onlyFull) setSide(onlyFull);
  }, [onlyFull, side, setSide]);

  const sideColors = { home: game.teams.home.color, away: game.teams.away.color };
  const { actions, busy } = ui;
  const team = ui.teamActions(ui.side);
  const last = lastPlays(derived, 1)[0];
  const shot = (points: 2 | 3, made: boolean) => (full ? actions.shot(points, made) : team.shot(points, made));
  const ft = (made: boolean) => (full ? actions.ft(made) : team.ft(made));

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 8) }]}>
      <ScoreBar t={t} compact onMenu={() => setMenu(true)} selectedSide={ui.side} {...(fullSides.length === 2 ? { onSelectSide: ui.setSide } : {})} />
      <ScrollView contentContainerStyle={styles.body}>
        {fullSides.length > 0 ? (
          <View>
            <Court
              shots={derived.shots}
              sideColors={sideColors}
              onlySide={ui.side}
                  onlyPlayer={ui.playerId}
              pending={ui.pending}
              onTap={ui.tapCourt}
              disabled={busy}
            />
            <View style={styles.hintPill} pointerEvents="none">
              <Text style={styles.hintText}>Tap the shot spot</Text>
            </View>
          </View>
        ) : null}

        {full ? (
          <PlayerTiles t={t} side={ui.side} selectedId={ui.playerId} onSelect={(id) => ui.selectPlayer(ui.side, id)} />
        ) : (
          <Text style={styles.label}>{game.teams[ui.side].name.toUpperCase()} IS TEAM-ONLY · LOGGING FOR THE TEAM</Text>
        )}

        <Grid columns={3} gap={GAP}>
          {[
            <ActionButton key="m2" label="+2 Made" tone="green" disabled={busy} onPress={() => shot(2, true)} />,
            <ActionButton key="m3" label="+3 Made" tone="green" disabled={busy} onPress={() => shot(3, true)} />,
            <ActionButton key="f1" label="+1 FT" tone="greenDark" disabled={busy} onPress={() => ft(true)} />,
            <ActionButton key="x2" label="2 Miss" tone="miss" disabled={busy} onPress={() => shot(2, false)} />,
            <ActionButton key="x3" label="3 Miss" tone="miss" disabled={busy} onPress={() => shot(3, false)} />,
            <ActionButton key="fx" label="FT Miss" tone="miss" disabled={busy} onPress={() => ft(false)} />,
          ]}
        </Grid>
        <EventGrid ui={ui} columns={5} short gap={GAP} />

        {fullSides.length < 2
          ? (['home', 'away'] as const)
              .filter((s) => game.tracking[s] !== 'full' && s !== ui.side)
              .map((s) => <TeamOnlyBar key={s} t={t} ui={ui} side={s} />)
          : null}
      </ScrollView>

      <TrackerMenu t={t} visible={menu} onClose={() => setMenu(false)} />
      <View style={styles.lastBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Show all plays" onPress={() => setShowPlays(true)} style={{ flex: 1 }}>
          <Text numberOfLines={1} style={styles.lastText}>
            <Text style={{ fontFamily: font.bodyBold }}>Last · </Text>
            {last ? last.text : 'No plays yet'}
          </Text>
        </Pressable>
        <ActionButton label="Plays" tone="ghost" onPress={() => setShowPlays(true)} style={styles.lastButton} />
        <ActionButton label="Undo" tone="ghost" onPress={actions.undo} style={styles.lastButton} />
      </View>

      {showPlays ? (
        <View style={styles.sheetWrap}>
          <Pressable style={styles.backdrop} onPress={() => setShowPlays(false)} accessibilityLabel="Close" />
          <View style={[styles.sheet, { maxHeight: '75%' }]}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>PLAYS</Text>
              <ActionButton label="Close" tone="outline" onPress={() => setShowPlays(false)} style={{ paddingHorizontal: 14 }} />
            </View>
            <ScrollView contentContainerStyle={{ padding: 12 }}>
              <PlayList t={t} />
            </ScrollView>
          </View>
        </View>
      ) : null}

      {ui.pending ? (
        <View style={styles.sheetWrap}>
          <Pressable style={styles.backdrop} onPress={() => ui.setPending(null)} accessibilityLabel="Close" />
          <View style={styles.popoverSheet}>
            <ShotPopover
              key={`${ui.pending.x}-${ui.pending.y}`}
              t={t}
              ui={ui}
              location={ui.pending}
              initialSide={ui.side}
              allowedSides={fullSides}
              onClose={() => ui.setPending(null)}
            />
          </View>
        </View>
      ) : null}

      {t.prompt ? (
        <View style={styles.sheetWrap}>
          <View style={styles.backdrop} />
          <View style={[styles.popoverSheet, { maxHeight: '85%' }]}>
            <ScrollView style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
              <PromptPanel t={t} variant="sheet" onAnswer={actions.answer} onDone={actions.done} onCancel={actions.cancel} />
            </ScrollView>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  body: { padding: 8, gap: 8 },
  label: { fontFamily: font.bodyBold, fontSize: 11, letterSpacing: 1.1, color: colors.muted },
  hintPill: { position: 'absolute', left: 8, bottom: 8, backgroundColor: colors.ink, opacity: 0.85, borderRadius: radius.small, paddingHorizontal: 10, paddingVertical: 6 },
  hintText: { fontFamily: font.bodyBold, fontSize: 12, color: colors.card },
  lastBar: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 8, backgroundColor: colors.ink, borderRadius: radius.small, paddingLeft: 12, paddingRight: 4, paddingVertical: 4 },
  lastText: { fontFamily: font.body, fontSize: 12, color: colors.card },
  lastButton: { paddingHorizontal: 12, minHeight: 36 },
  sheetWrap: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.ink, opacity: 0.45 },
  popoverSheet: {},
  sheet: { backgroundColor: colors.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, paddingBottom: 0 },
  sheetTitle: { fontFamily: font.displayBold, fontSize: 22, color: colors.ink },
});
