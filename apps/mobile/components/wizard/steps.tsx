import type { GameRules, Side } from '@basket-log/core';
import type { TeamWithPlayers } from '@basket-log/db';
import { colors, radius } from '@basket-log/ui';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  applyPreset,
  problems,
  rulesSummary,
  selectTeam,
  setRule,
  setTimeouts,
  setTracking,
  teamOf,
  toggleStarter,
  type WizardState,
} from '@/lib/wizard';
import { Field, Label, Segmented, Stepper, TeamChip, Title, Toggle, font } from './kit';
import { DateField, TimeField } from './pickers';

export interface StepProps {
  state: WizardState;
  teams: TeamWithPlayers[];
  presets: { name: string; rules: GameRules }[];
  update: (next: (s: WizardState) => WizardState) => void;
  /** Narrow screen (phone portrait): columns stack and fields go one per row. */
  narrow?: boolean;
}

const SIDES: { side: Side; title: string }[] = [
  { side: 'home', title: 'Home' },
  { side: 'away', title: 'Away' },
];

export function MatchupStep({ state, teams, update, narrow = false }: StepProps) {
  const col = narrow ? { flex: 0 } : undefined;
  return (
    <View>
      <Title title="Matchup" subtitle="Pick the home and away teams. Teams and rosters are managed on the website." />
      <View style={{ flexDirection: narrow ? 'column' : 'row', gap: 20 }}>
        {SIDES.map(({ side, title }) => (
          <View key={side} style={{ flex: narrow ? 0 : 1, gap: 10 }}>
            <Label>{title}</Label>
            {teams.map((team) => {
              const selected = state.teamIds[side] === team.id;
              return (
                <Pressable
                  key={team.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => update((s) => selectTeam(s, side, team.id))}
                  style={[styles.teamCard, selected && { backgroundColor: colors.ink, borderColor: colors.ink }]}>
                  <TeamChip abbr={team.abbr} color={team.color_primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.teamName, selected && { color: colors.card }]}>{team.name}</Text>
                    <Text style={[styles.teamMeta, selected && { color: colors.mutedOnDark }]}>
                      {[team.city, `${team.players.length} players`].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  {selected ? <Text style={styles.check}>✓</Text> : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: narrow ? 'column' : 'row', gap: 14, marginTop: 22 }}>
        <Field {...(col ? { containerStyle: col } : {})} label="Competition" value={state.competition} onChangeText={(competition) => update((s) => ({ ...s, competition }))} placeholder="League, cup, friendly" />
        <Field {...(col ? { containerStyle: col } : {})} label="Venue" value={state.venue} onChangeText={(venue) => update((s) => ({ ...s, venue }))} placeholder="Arena" />
        <DateField {...(col ? { containerStyle: col } : {})} label="Date" value={state.date} onChange={(date) => update((s) => ({ ...s, date }))} />
        <TimeField {...(col ? { containerStyle: col } : {})} label="Time" value={state.time} onChange={(time) => update((s) => ({ ...s, time }))} />
      </View>
    </View>
  );
}

export function RulesStep({ state, presets, update }: StepProps) {
  const { rules } = state;
  const preset = presets.find((p) => p.name === rules.preset);
  return (
    <View style={{ gap: 18 }}>
      <Title title="Rules" subtitle="Pick a preset, then adjust. Any change switches the preset to Custom." />
      <Segmented
        value={rules.preset}
        options={[...presets.map((p) => ({ value: p.name as GameRules['preset'], label: p.name })), { value: 'Custom' as const, label: 'Custom' }]}
        onChange={(name) => {
          const next = presets.find((p) => p.name === name);
          update((s) => applyPreset(s, next ?? 'Custom'));
        }}
      />
      {preset ? null : <Text style={styles.note}>Custom rules</Text>}

      <Label>Game format</Label>
      <View style={styles.grid}>
        <Stepper label="Periods" value={rules.periods} min={1} max={8} onChange={(periods) => update((s) => setRule(s, { periods }))} />
        <Stepper label="Period length" unit="min" value={rules.periodMinutes} min={1} max={20} onChange={(periodMinutes) => update((s) => setRule(s, { periodMinutes }))} />
        <Stepper label="Overtime" unit="min" value={rules.overtimeMinutes} min={1} max={10} onChange={(overtimeMinutes) => update((s) => setRule(s, { overtimeMinutes }))} />
        <Stepper label="Players on court" value={rules.playersOnCourt} min={3} max={5} onChange={(playersOnCourt) => update((s) => setRule(s, { playersOnCourt }))} />
        <Stepper label="Min. players to continue" value={rules.minPlayersToContinue ?? 2} min={1} max={rules.playersOnCourt} onChange={(minPlayersToContinue) => update((s) => setRule(s, { minPlayersToContinue }))} />
        <Stepper label="Fouls to foul out" value={rules.foulsToFoulOut} min={3} max={10} onChange={(foulsToFoulOut) => update((s) => setRule(s, { foulsToFoulOut }))} />
        <Stepper label="Team fouls before bonus" value={rules.teamFoulsBeforeBonus} min={1} max={10} onChange={(teamFoulsBeforeBonus) => update((s) => setRule(s, { teamFoulsBeforeBonus }))} />
        <Stepper label="Shot clock" unit="s" value={rules.shotClock} min={10} max={40} onChange={(shotClock) => update((s) => setRule(s, { shotClock }))} />
        <Stepper label="Shot clock after off. rebound" unit="s" value={rules.shotClockResetOffReb} min={10} max={40} onChange={(shotClockResetOffReb) => update((s) => setRule(s, { shotClockResetOffReb }))} />
      </View>

      <Label>Timeouts</Label>
      <Segmented
        value={rules.timeoutMode}
        options={[
          { value: 'perHalf', label: 'Per half' },
          { value: 'perPeriod', label: 'Per period' },
          { value: 'perGame', label: 'Per game' },
        ]}
        onChange={(timeoutMode) => update((s) => setRule(s, { timeoutMode }))}
      />
      <View style={styles.grid}>
        <Stepper label={rules.timeoutMode === 'perHalf' ? 'First half' : rules.timeoutMode === 'perGame' ? 'Per game' : 'Per period'} value={rules.timeouts.first} min={0} max={10} onChange={(first) => update((s) => setTimeouts(s, { first }))} />
        {rules.timeoutMode === 'perHalf' ? (
          <Stepper label="Second half" value={rules.timeouts.second ?? 0} min={0} max={10} onChange={(second) => update((s) => setTimeouts(s, { second }))} />
        ) : null}
        <Stepper label="Overtime" value={rules.timeouts.overtime} min={0} max={5} onChange={(overtime) => update((s) => setTimeouts(s, { overtime }))} />
      </View>

      <Label>Scorekeeper questions</Label>
      <View style={{ gap: 8 }}>
        <Toggle label="Ask: was it a fast break?" value={rules.askFastBreak} onChange={(askFastBreak) => update((s) => setRule(s, { askFastBreak }))} />
        <Toggle label="Ask: was it blocked?" value={rules.askBlock !== false} onChange={(askBlock) => update((s) => setRule(s, { askBlock }))} />
        <Toggle label="Ask: who assisted?" value={rules.askAssist} onChange={(askAssist) => update((s) => setRule(s, { askAssist }))} />
        <Toggle
          label="Fouled-out player leaves if no substitute"
          hint="On: the team plays short (FIBA). Off: he stays in, no team goes below five (NBA)."
          value={rules.playShortHanded !== false}
          onChange={(playShortHanded) => update((s) => setRule(s, { playShortHanded }))}
        />
        <Toggle label="Fouls stop the game clock" value={rules.stopClockOnFoul} onChange={(stopClockOnFoul) => update((s) => setRule(s, { stopClockOnFoul }))} />
      </View>

      <Label>Tracking detail</Label>
      <View style={{ flexDirection: 'row', gap: 24, flexWrap: 'wrap' }}>
        {SIDES.map(({ side, title }) => (
          <View key={side} style={{ gap: 6 }}>
            <Text style={styles.teamMeta}>{title}</Text>
            <Segmented
              value={state.tracking[side]}
              options={[
                { value: 'full', label: 'Full detail' },
                { value: 'team_only', label: 'Team only' },
              ]}
              onChange={(mode) => update((s) => setTracking(s, side, mode))}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const TILE_MIN = 150;
const TILE_GAP = 8;
const COLUMN_GAP = 24;

export function LineupsStep({ state, teams, update }: StepProps) {
  const n = state.rules.playersOnCourt;
  // Tiles are sized from the measured width, not from percentages: teams go side by side only when each column fits
  // two tiles, otherwise they stack, and a column holds as many tiles of at least TILE_MIN as fit, sharing the width.
  const [width, setWidth] = useState(0);
  const sideBySide = width >= 2 * (2 * TILE_MIN + TILE_GAP) + COLUMN_GAP;
  const columnWidth = sideBySide ? (width - COLUMN_GAP) / 2 : width;
  const perRow = Math.max(1, Math.floor((columnWidth + TILE_GAP) / (TILE_MIN + TILE_GAP)));
  const tileWidth = Math.floor((columnWidth - TILE_GAP * (perRow - 1)) / perRow);
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Title title="Lineups" subtitle={`Tap players to mark the starters. The count follows "Players on court" in Rules (${n}).`} />
      <View style={{ flexDirection: sideBySide ? 'row' : 'column', gap: COLUMN_GAP }}>
        {SIDES.map(({ side, title }) => {
          const team = teamOf(teams, state.teamIds[side]);
          const picked = state.starters[side];
          if (!team) return <View key={side} style={{ flex: sideBySide ? 1 : 0 }} />;
          if (state.tracking[side] === 'team_only') {
            return (
              <View key={side} style={{ flex: sideBySide ? 1 : 0 }}>
                <Text style={styles.teamName}>{team.name}</Text>
                <Text style={styles.note}>{title} is tracked team-only: no lineup needed.</Text>
              </View>
            );
          }
          return (
            <View key={side} style={{ flex: sideBySide ? 1 : 0 }}>
              <View style={styles.lineupHeader}>
                <TeamChip abbr={team.abbr} color={team.color_primary} size={32} />
                <Text style={[styles.teamName, { flex: 1 }]}>{team.name.toUpperCase()}</Text>
                <View style={[styles.pill, picked.length === n && { backgroundColor: colors.greenTint }]}>
                  <Text style={styles.pillText}>
                    {picked.length} / {n} starters
                  </Text>
                </View>
              </View>
              <View style={styles.tiles}>
                {team.players.length === 0 ? <Text style={styles.note}>No active players on this team. Add players on the website (Teams).</Text> : null}
                {team.players.map((p) => {
                  const on = picked.includes(p.id);
                  return (
                    <Pressable
                      key={p.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      onPress={() => update((s) => toggleStarter(s, side, p.id))}
                      style={[styles.tile, { width: tileWidth }, on && { backgroundColor: team.color_primary, borderColor: team.color_primary }]}>
                      <Text style={[styles.tileNumber, on && { color: colors.card }]}>{p.number}</Text>
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={[styles.tileFirst, on && { color: colors.card }]}>{p.first_name}</Text>
                        <Text numberOfLines={1} style={[styles.tileLast, on && { color: colors.card }]}>{p.last_name}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function ReviewStep({ state, teams, narrow = false }: StepProps) {
  const issues = problems(state, teams);
  return (
    <View style={{ gap: 18 }}>
      <Title title="Review" subtitle="Check everything, then start the game." />
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {SIDES.map(({ side }, i) => {
            const team = teamOf(teams, state.teamIds[side]);
            return (
              <View key={side} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, justifyContent: i ? 'flex-end' : 'flex-start' }}>
                {team ? <TeamChip abbr={team.abbr} color={team.color_primary} /> : null}
                <Text style={styles.teamName}>{team?.name ?? 'No team'}</Text>
              </View>
            );
          })}
        </View>
        <Text style={[styles.teamMeta, { marginTop: 8 }]}>
          {[state.competition, state.venue, state.date].filter(Boolean).join(' · ') || 'No competition, venue or date'}
        </Text>
      </View>

      <View style={styles.card}>
        <Label>{state.rules.preset} rules</Label>
        {rulesSummary(state.rules).map((line) => (
          <Text key={line} style={styles.bullet}>• {line}</Text>
        ))}
      </View>

      <View style={{ flexDirection: narrow ? 'column' : 'row', gap: 14 }}>
        {SIDES.map(({ side, title }) => {
          const team = teamOf(teams, state.teamIds[side]);
          const names = state.starters[side].map((id) => team?.players.find((p) => p.id === id)).filter(Boolean).map((p) => `${p?.number} ${p?.display_name}`);
          return (
            <View key={side} style={[styles.card, { flex: narrow ? 0 : 1 }]}>
              <Label>{`${title} · ${state.tracking[side] === 'full' ? 'Full detail' : 'Team only'}`}</Label>
              <Text style={styles.bullet}>{state.tracking[side] === 'full' ? names.join(', ') || 'No starters picked' : 'No lineup needed'}</Text>
            </View>
          );
        })}
      </View>

      {issues.length ? (
        <View style={[styles.card, { borderColor: colors.ink }]}>
          <Label>Fix before starting</Label>
          {issues.map((issue) => (
            <Text key={issue} style={styles.bullet}>• {issue}</Text>
          ))}
        </View>
      ) : (
        <Text style={styles.note}>Everything looks good. Full detail on both teams works best on a tablet.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  teamCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1.5, borderColor: colors.line, padding: 12, minHeight: 68 },
  teamName: { fontFamily: font.display, fontSize: 20, color: colors.ink },
  teamMeta: { fontFamily: font.body, fontSize: 13, color: colors.muted },
  check: { color: colors.greenLight, fontSize: 22, fontFamily: font.bodyBold },
  note: { fontFamily: font.body, fontSize: 14, color: colors.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  lineupHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  pill: { backgroundColor: colors.line2, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4 },
  pillText: { fontFamily: font.bodyBold, fontSize: 12, color: colors.ink },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: TILE_GAP },
  tile: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.button, paddingHorizontal: 14 },
  tileNumber: { fontFamily: font.display, fontSize: 32, color: colors.ink, minWidth: 40 },
  tileFirst: { fontFamily: font.body, fontSize: 14, color: colors.muted },
  tileLast: { fontFamily: font.bodyBold, fontSize: 17, color: colors.ink },
  card: { backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1.5, borderColor: colors.line, padding: 16 },
  bullet: { fontFamily: font.body, fontSize: 15, color: colors.ink, marginTop: 4 },
});
