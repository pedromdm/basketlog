import type { Side } from '@basket-log/core';
import { colors } from '@basket-log/ui';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { font } from '../wizard/kit';
import { Court } from './Court';
import { PlayerCards } from './PlayerCards';
import { LastPlays } from './Plays';
import { PromptPanel } from './PromptPanel';
import { QuickPad, TeamOnlyBar } from './QuickPad';
import { ScoreBar } from './ScoreBar';
import { ShotPopover } from './ShotPopover';
import { ActionButton, TeamToggle } from './ui';
import { playerLabel } from './format';
import { useTrackerUi, type ReadyTracker } from './useTrackerUi';

const POPOVER_W = 236;
const POPOVER_H = 290;

/** Tablet tracker: 1b (two tracked teams) or 2a (one tracked team, the other logged at team level). */
export function TabletTracker({ t }: { t: ReadyTracker }) {
  const ui = useTrackerUi(t);
  const { game, derived } = t;
  const fullSides = (['home', 'away'] as const).filter((s) => game.tracking[s] === 'full');
  const teamOnlySides = (['home', 'away'] as const).filter((s) => game.tracking[s] !== 'full');
  const oneTeam = fullSides.length === 1;
  const onlyFull: Side | undefined = oneTeam ? fullSides[0] : undefined;
  const [courtSize, setCourtSize] = useState({ w: 0, h: 0 });

  // one-team mode always works on the tracked team
  const { side, setSide } = ui;
  useEffect(() => {
    if (onlyFull && side !== onlyFull) setSide(onlyFull);
  }, [onlyFull, side, setSide]);

  const courtShots = derived.shots;
  const sideColors = { home: game.teams.home.color, away: game.teams.away.color };
  const pendingPx = ui.pending && courtSize.w ? { x: (ui.pending.x / 500) * courtSize.w, y: (ui.pending.y / 470) * courtSize.h } : null;
  const popoverLeft = pendingPx ? (pendingPx.x > courtSize.w / 2 ? Math.max(8, pendingPx.x - POPOVER_W - 28) : Math.min(courtSize.w - POPOVER_W - 8, pendingPx.x + 28)) : 0;
  const popoverTop = pendingPx ? Math.max(8, Math.min(courtSize.h - POPOVER_H, pendingPx.y - 60)) : 0;
  const onLayout = (e: LayoutChangeEvent) => setCourtSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  return (
    <View style={styles.root}>
      <ScoreBar t={t} />
      <View style={styles.body}>
        <ScrollView style={styles.left} contentContainerStyle={{ gap: 12 }}>
          {!oneTeam && fullSides.length === 2 ? <TeamToggle game={game} side={ui.side} onChange={ui.setSide} /> : null}
          {fullSides.length > 0 ? (
            <>
              <Text style={styles.label}>ON COURT · TAP TO SELECT</Text>
              <PlayerCards t={t} side={ui.side} selectedId={ui.playerId} onSelect={(id) => ui.selectPlayer(ui.side, id)} />
              <ActionButton
                label={ui.playerId ? `Sub out ${playerLabel(game, ui.playerId)}` : 'Sub out'}
                tone="outline"
                disabled={ui.busy || !ui.playerId}
                onPress={ui.actions.sub}
              />
            </>
          ) : (
            <Text style={styles.label}>BOTH TEAMS ARE TEAM-ONLY</Text>
          )}
        </ScrollView>

        <ScrollView style={styles.centre} contentContainerStyle={{ gap: 12 }}>
          {fullSides.length > 0 ? (
            <>
              <View style={styles.hintRow}>
                <Text style={styles.hint}>Tap where the shot was taken. 2PT or 3PT is detected from the spot.</Text>
                <Text style={styles.hintStrong}>
                  {game.teams[ui.side].name} shots: {courtShots.filter((s) => s.side === ui.side).length}
                </Text>
              </View>
              <View onLayout={onLayout}>
                <Court
                  shots={courtShots}
                  sideColors={sideColors}
                  onlySide={ui.side}
                  pending={ui.pending}
                  onTap={ui.tapCourt}
                  disabled={ui.busy}
                />
                {ui.pending && pendingPx ? (
                  <View style={{ position: 'absolute', left: popoverLeft, top: popoverTop, width: POPOVER_W }}>
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
                ) : null}
              </View>
            </>
          ) : null}
          {teamOnlySides.map((s) => (
            <TeamOnlyBar key={s} t={t} ui={ui} side={s} />
          ))}
        </ScrollView>

        <ScrollView style={styles.right} contentContainerStyle={{ gap: 12 }}>
          {t.prompt ? (
            <PromptPanel t={t} onAnswer={ui.actions.answer} onDone={ui.actions.done} onCancel={ui.actions.cancel} />
          ) : fullSides.length > 0 ? (
            <QuickPad t={t} ui={ui} showUndo />
          ) : (
            <ActionButton label="↶ Undo last play" tone="outline" onPress={ui.actions.undo} />
          )}
        </ScrollView>
      </View>
      <LastPlays t={t} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  body: { flex: 1, flexDirection: 'row', padding: 20, gap: 20 },
  left: { width: 220, flexGrow: 0 },
  centre: { flex: 1 },
  right: { width: 300, flexGrow: 0 },
  label: { fontFamily: font.bodyBold, fontSize: 11, letterSpacing: 1.1, color: colors.muted },
  hintRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  hint: { flex: 1, fontFamily: font.body, fontSize: 13, color: colors.muted },
  hintStrong: { fontFamily: font.bodyBold, fontSize: 13, color: colors.ink },
});
