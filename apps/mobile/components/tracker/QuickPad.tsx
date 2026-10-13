import type { Side } from '@basket-log/core';
import { colors, radius } from '@basket-log/ui';
import { StyleSheet, Text, View } from 'react-native';

import { font } from '../wizard/kit';
import { playerLabel } from './format';
import { ActionButton, Grid } from './ui';
import type { ReadyTracker, TrackerUi } from './useTrackerUi';

/** Quick-log pad for the selected team/player: shots (no location), rebounds/assists/etc., foul/sub/timeout. */
export function QuickPad({
  t,
  ui,
  showShots = true,
  showUndo = false,
}: {
  t: ReadyTracker;
  ui: TrackerUi;
  showShots?: boolean;
  showUndo?: boolean;
}) {
  const { actions, busy } = ui;
  const full = ui.isFull(ui.side);
  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.heading}>
        QUICK LOG · {full ? playerLabel(t.game, ui.playerId).toUpperCase() : `${t.game.teams[ui.side].abbr} (TEAM)`}
      </Text>
      {showShots ? (
        <Grid columns={2}>
          {[
            <ActionButton key="m2" label="+2 Made" tone="green" height={56} disabled={busy} onPress={() => actions.shot(2, true)} />,
            <ActionButton key="x2" label="2 Miss" tone="miss" height={56} disabled={busy} onPress={() => actions.shot(2, false)} />,
            <ActionButton key="m3" label="+3 Made" tone="green" height={56} disabled={busy} onPress={() => actions.shot(3, true)} />,
            <ActionButton key="x3" label="3 Miss" tone="miss" height={56} disabled={busy} onPress={() => actions.shot(3, false)} />,
            <ActionButton key="f1" label="+1 FT" tone="greenDark" height={56} disabled={busy} onPress={() => actions.ft(true)} />,
            <ActionButton key="fx" label="FT Miss" tone="miss" height={56} disabled={busy} onPress={() => actions.ft(false)} />,
          ]}
        </Grid>
      ) : null}
      <EventGrid ui={ui} columns={3} />
      {showUndo ? <ActionButton label="↶ Undo last play" tone="outline" onPress={actions.undo} /> : null}
    </View>
  );
}

/** OREB DREB AST / STL BLK TOV / FOUL SUB TIMEOUT. */
export function EventGrid({ ui, columns = 3, short = false }: { ui: TrackerUi; columns?: number; short?: boolean }) {
  const { actions, busy } = ui;
  const noPlayer = ui.playerId === null;
  return (
    <Grid columns={columns}>
      {[
        <ActionButton key="oreb" label="OREB" disabled={busy} onPress={() => actions.quick('oreb')} />,
        <ActionButton key="dreb" label="DREB" disabled={busy} onPress={() => actions.quick('dreb')} />,
        <ActionButton key="ast" label="AST" disabled={busy || noPlayer} onPress={() => actions.quick('ast')} />,
        <ActionButton key="stl" label="STL" disabled={busy || noPlayer} onPress={() => actions.quick('stl')} />,
        <ActionButton key="blk" label="BLK" disabled={busy || noPlayer} onPress={() => actions.quick('blk')} />,
        <ActionButton key="tov" label="TOV" disabled={busy} onPress={actions.turnover} />,
        <ActionButton key="foul" label="FOUL" tone="dark" disabled={busy} onPress={actions.foul} />,
        <ActionButton key="sub" label="SUB" tone="dark" disabled={busy || noPlayer} onPress={actions.sub} />,
        <ActionButton key="to" label={short ? 'T.OUT' : 'TIMEOUT'} tone="dark" disabled={busy} onPress={actions.timeout} />,
      ]}
    </Grid>
  );
}

/** One-team mode (2a): the opponent is team-only, so it gets a bar of team-level buttons. */
export function TeamOnlyBar({ t, ui, side }: { t: ReadyTracker; ui: TrackerUi; side: Side }) {
  const a = ui.teamActions(side);
  const { busy } = ui;
  return (
    <View style={styles.bar}>
      <Text style={styles.barTitle}>{t.game.teams[side].name.toUpperCase()} · TEAM ONLY</Text>
      <View style={styles.barRow}>
        <ActionButton label="+2" tone="green" disabled={busy} onPress={() => a.shot(2, true)} style={styles.barBtn} />
        <ActionButton label="+3" tone="green" disabled={busy} onPress={() => a.shot(3, true)} style={styles.barBtn} />
        <ActionButton label="+1 FT" tone="greenDark" disabled={busy} onPress={() => a.ft(true)} style={styles.barBtn} />
        <ActionButton label="Miss" tone="miss" disabled={busy} onPress={() => a.shot(2, false)} style={styles.barBtn} />
        <ActionButton label="FT Miss" tone="miss" disabled={busy} onPress={() => a.ft(false)} style={styles.barBtn} />
        <ActionButton label="TOV" disabled={busy} onPress={a.turnover} style={styles.barBtn} />
        <ActionButton label="Foul" tone="ghost" disabled={busy} onPress={a.foul} style={styles.barBtn} />
        <ActionButton label="T.Out" tone="ghost" disabled={busy} onPress={a.timeout} style={styles.barBtn} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { fontFamily: font.bodyBold, fontSize: 12, letterSpacing: 1.2, color: colors.muted },
  bar: { backgroundColor: colors.ink, borderRadius: radius.card, padding: 12, gap: 8 },
  barTitle: { fontFamily: font.bodyBold, fontSize: 11, letterSpacing: 1.2, color: colors.greenLight },
  barRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  barBtn: { flexGrow: 1, minWidth: 72 },
});
