import type { Side } from '@basket-log/core';
import { colors, radius } from '@basket-log/ui';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { font } from '../wizard/kit';
import { Court } from './Court';
import { PlayerTiles } from './PlayerCards';
import { LastPlayToast, PlayList } from './Plays';
import { PromptPanel } from './PromptPanel';
import { EventGrid, TeamOnlyBar } from './QuickPad';
import { ScoreBar } from './ScoreBar';
import { ShotPopover } from './ShotPopover';
import { ActionButton, Grid, SyncPill, TeamToggle } from './ui';
import { playerLabel } from './format';
import { useTrackerUi, type ReadyTracker } from './useTrackerUi';

type Mode = 'court' | 'buttons' | 'plays';
const MODES: { id: Mode; label: string }[] = [
  { id: 'court', label: 'COURT' },
  { id: 'buttons', label: 'BUTTONS' },
  { id: 'plays', label: 'PLAYS' },
];

/** Phone tracker: 3a (court-first), 1c (buttons-first) and a play list, switched by a toggle. */
export function PhoneTracker({ t }: { t: ReadyTracker }) {
  const ui = useTrackerUi(t);
  const { game, derived } = t;
  const [mode, setMode] = useState<Mode>('court');
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

  return (
    <View style={styles.root}>
      <ScoreBar t={t} compact />
      <View style={styles.woodStrip} />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            {fullSides.length === 2 ? <TeamToggle game={game} side={ui.side} onChange={ui.setSide} /> : null}
          </View>
          <SyncPill sync={t.sync} />
        </View>

        {full ? (
          <>
            <Text style={styles.label}>1 · PLAYER</Text>
            <PlayerTiles t={t} side={ui.side} selectedId={ui.playerId} onSelect={(id) => ui.selectPlayer(ui.side, id)} />
          </>
        ) : (
          <Text style={styles.label}>{game.teams[ui.side].name.toUpperCase()} IS TEAM-ONLY · LOGGING FOR THE TEAM</Text>
        )}

        <View style={styles.modes}>
          {MODES.map((m) => (
            <Pressable
              key={m.id}
              accessibilityRole="button"
              accessibilityState={{ selected: mode === m.id }}
              onPress={() => setMode(m.id)}
              style={[styles.mode, mode === m.id && { backgroundColor: colors.ink }]}>
              <Text style={[styles.modeText, mode === m.id && { color: colors.card }]}>{m.label}</Text>
            </Pressable>
          ))}
        </View>

        {mode === 'court' && fullSides.length > 0 ? (
          <>
            <View>
              <Court
                shots={derived.shots}
                sideColors={sideColors}
                onlySide={ui.side}
                pending={ui.pending}
                onTap={ui.tapCourt}
                disabled={busy}
              />
              <View style={styles.hintPill} pointerEvents="none">
                <Text style={styles.hintText}>Tap the shot spot{ui.playerId ? ` · ${playerLabel(game, ui.playerId)}` : ''}</Text>
              </View>
            </View>
            <Grid columns={4} gap={8}>
              {[
                <ActionButton key="ft" label="+1 FT" tone="greenDark" disabled={busy} onPress={() => actions.ft(true)} />,
                <ActionButton key="fx" label="FT Miss" tone="miss" disabled={busy} onPress={() => actions.ft(false)} />,
                <ActionButton key="o" label="OREB" disabled={busy} onPress={() => actions.quick('oreb')} />,
                <ActionButton key="d" label="DREB" disabled={busy} onPress={() => actions.quick('dreb')} />,
                <ActionButton key="a" label="AST" disabled={busy || !ui.playerId} onPress={() => actions.quick('ast')} />,
                <ActionButton key="s" label="STL" disabled={busy || !ui.playerId} onPress={() => actions.quick('stl')} />,
                <ActionButton key="b" label="BLK" disabled={busy || !ui.playerId} onPress={() => actions.quick('blk')} />,
                <ActionButton key="t" label="TOV" disabled={busy} onPress={actions.turnover} />,
                <ActionButton key="f" label="FOUL" tone="dark" disabled={busy} onPress={actions.foul} />,
                <ActionButton key="su" label="SUB" tone="dark" disabled={busy || !ui.playerId} onPress={actions.sub} />,
                <ActionButton key="to" label="T.OUT" tone="dark" disabled={busy} onPress={actions.timeout} />,
                <ActionButton key="u" label="↶ Undo" tone="outline" onPress={actions.undo} />,
              ]}
            </Grid>
          </>
        ) : null}

        {mode === 'buttons' || (mode === 'court' && fullSides.length === 0) ? (
          <>
            <Text style={styles.label}>2 · EVENT</Text>
            <Grid columns={3} gap={8}>
              {[
                <ActionButton key="m2" label="+2" tone="green" disabled={busy} onPress={() => (full ? actions.shot(2, true) : team.shot(2, true))} />,
                <ActionButton key="m3" label="+3" tone="green" disabled={busy} onPress={() => (full ? actions.shot(3, true) : team.shot(3, true))} />,
                <ActionButton key="f1" label="+1 FT" tone="greenDark" disabled={busy} onPress={() => (full ? actions.ft(true) : team.ft(true))} />,
                <ActionButton key="x2" label="2 Miss" tone="miss" disabled={busy} onPress={() => (full ? actions.shot(2, false) : team.shot(2, false))} />,
                <ActionButton key="x3" label="3 Miss" tone="miss" disabled={busy} onPress={() => (full ? actions.shot(3, false) : team.shot(3, false))} />,
                <ActionButton key="fx" label="FT Miss" tone="miss" disabled={busy} onPress={() => (full ? actions.ft(false) : team.ft(false))} />,
              ]}
            </Grid>
            <EventGrid ui={ui} columns={3} short />
          </>
        ) : null}

        {mode === 'plays' ? <PlayList t={t} /> : null}

        {fullSides.length < 2 && mode !== 'plays'
          ? (['home', 'away'] as const)
              .filter((s) => game.tracking[s] !== 'full' && s !== ui.side)
              .map((s) => <TeamOnlyBar key={s} t={t} ui={ui} side={s} />)
          : null}
      </ScrollView>

      <View style={styles.toastWrap}>
        <LastPlayToast t={t} onUndo={actions.undo} />
      </View>

      {ui.pending ? (
        <View style={styles.sheetWrap}>
          <Pressable style={styles.backdrop} onPress={() => ui.setPending(null)} accessibilityLabel="Close" />
          <View style={styles.sheet}>
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
          <View style={[styles.sheet, { maxHeight: '85%' }]}>
            <ScrollView style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
              <PromptPanel
                t={t}
                variant="sheet"
                onAnswer={actions.answer}
                onDone={actions.done}
                onCancel={actions.cancel}
              />
            </ScrollView>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  woodStrip: { height: 6, backgroundColor: colors.wood },
  body: { padding: 12, gap: 12, paddingBottom: 90 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontFamily: font.bodyBold, fontSize: 11, letterSpacing: 1.1, color: colors.muted },
  modes: { flexDirection: 'row', backgroundColor: colors.line, borderRadius: radius.button, padding: 4 },
  mode: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.small },
  modeText: { fontFamily: font.displayBold, fontSize: 16, color: colors.ink },
  hintPill: { position: 'absolute', left: 8, bottom: 8, backgroundColor: colors.ink, opacity: 0.85, borderRadius: radius.small, paddingHorizontal: 10, paddingVertical: 6 },
  hintText: { fontFamily: font.bodyBold, fontSize: 12, color: colors.card },
  toastWrap: { position: 'absolute', left: 12, right: 12, bottom: 12 },
  sheetWrap: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.ink, opacity: 0.45 },
  sheet: {},
});
