import type { GameRules } from '@basket-log/core';
import { createGame, listCompetitions, listRulePresets, listTeams, type CompetitionTree, type TeamWithPlayers } from '@basket-log/db';
import { colors } from '@basket-log/ui';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, font } from '@/components/wizard/kit';
import { LineupsStep, MatchupStep, ReviewStep, RulesStep } from '@/components/wizard/steps';
import { supabase } from '@/lib/supabase';
import { STEPS, canAdvance, goToStep, groupFor, initialWizard, problems, toNewGameInput, type WizardState } from '@/lib/wizard';

const VIEWS = [MatchupStep, RulesStep, LineupsStep, ReviewStep];

export default function NewGameScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // A phone (either orientation) gets a top step bar instead of the 260 pt side rail; portrait also stacks columns.
  const phone = Math.min(width, height) < 600;
  const narrow = width < 700;
  const [state, setState] = useState<WizardState>(() => initialWizard());
  const [teams, setTeams] = useState<TeamWithPlayers[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionTree[]>([]);
  const [presets, setPresets] = useState<{ name: string; rules: GameRules }[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listTeams(supabase), listRulePresets(supabase), listCompetitions(supabase)])
      .then(([t, p, c]) => {
        setTeams(t);
        setCompetitions(c);
        setPresets(p);
        const fiba = p.find((x) => x.name === 'FIBA');
        if (fiba) setState((s) => ({ ...s, rules: fiba.rules }));
      })
      .catch((e: Error) => setLoadError(e.message))
      .finally(() => setLoaded(true));
  }, []);

  const update = useCallback((next: (s: WizardState) => WizardState) => setState(next), []);
  const issues = problems(state, teams);
  const last = state.step === STEPS.length - 1;

  const start = async (startNow = true) => {
    setStarting(true);
    setStartError(null);
    try {
      const id = await createGame(supabase, { ...toNewGameInput(state, groupFor(competitions, state.roundId, state.teamIds.home)), status: startNow ? 'live' : 'scheduled' });
      if (startNow) router.replace({ pathname: '/game/[id]', params: { id } });
      else router.replace('/');
    } catch (e) {
      setStartError((e as Error).message);
      setStarting(false);
    }
  };

  const View_ = VIEWS[state.step] as (typeof VIEWS)[number];

  return (
    <View style={[styles.root, phone && { flexDirection: 'column' }]}>
      <Stack.Screen options={{ headerShown: false }} />
      {phone ? (
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 8), paddingLeft: Math.max(insets.left, 12), paddingRight: Math.max(insets.right, 12) }]}>
          <Button kind="outline" label="✕" accessibilityLabel="Cancel" onPress={() => router.back()} style={styles.compactButton} />
          <View style={{ flex: 1 }}>
            <Text style={styles.topTitle}>NEW GAME · {STEPS[state.step]?.title.toUpperCase()}</Text>
            <Text style={styles.stepHint}>{STEPS[state.step]?.hint}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {STEPS.map((step, i) => (
              <Pressable
                key={step.id}
                accessibilityRole="button"
                accessibilityLabel={`Step ${i + 1}: ${step.title}`}
                onPress={() => setState((s) => goToStep(s, i))}
                style={[styles.circle, (i === state.step || i < state.step) && { backgroundColor: colors.green }]}>
                <Text style={styles.circleText}>{i < state.step ? '✓' : i + 1}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
      <View style={styles.rail}>
        <Text style={styles.wordmark}>
          BASKET <Text style={{ color: colors.greenLight }}>LOG</Text>
        </Text>
        <Text style={styles.railTitle}>NEW GAME</Text>
        <View style={{ marginTop: 24, gap: 6 }}>
          {STEPS.map((step, i) => {
            const active = i === state.step;
            const done = i < state.step;
            return (
              <Pressable
                key={step.id}
                accessibilityRole="button"
                onPress={() => setState((s) => goToStep(s, i))}
                style={[styles.railStep, active && { backgroundColor: colors.card }]}>
                <View style={[styles.circle, (active || done) && { backgroundColor: colors.green }]}>
                  <Text style={styles.circleText}>{done ? '✓' : i + 1}</Text>
                </View>
                <View>
                  <Text style={[styles.stepTitle, active && { color: colors.ink }]}>{step.title.toUpperCase()}</Text>
                  <Text style={[styles.stepHint, active && { color: colors.muted }]}>{step.hint}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flex: 1 }} />
        <Button kind="outline" label="Cancel" onPress={() => router.back()} />
      </View>
      )}

      <View style={styles.content}>
        <ScrollView contentContainerStyle={[styles.scroll, phone && { paddingHorizontal: Math.max(insets.left, 16), paddingVertical: 16 }]}>
          {!loaded ? (
            <ActivityIndicator color={colors.green} />
          ) : loadError ? (
            <Text style={styles.error}>Could not load teams: {loadError}</Text>
          ) : (
            <View_ state={state} teams={teams} presets={presets} competitions={competitions} update={update} narrow={narrow} />
          )}
        </ScrollView>
        <View style={[styles.footer, phone && { height: 64, paddingHorizontal: Math.max(insets.left, 16), gap: 10, paddingBottom: Math.max(insets.bottom, 0) }]}>
          <Button kind="outline" label={phone ? '←' : '← Back'} accessibilityLabel="Back" disabled={state.step === 0} onPress={() => setState((s) => goToStep(s, s.step - 1))} {...(phone ? { style: styles.compactButton } : {})} />
          <Text numberOfLines={2} style={[styles.status, phone && { fontSize: 12 }, startError ? { color: colors.ink } : null]}>
            {startError ?? (last ? (issues.length ? `${issues.length} to fix before starting` : 'Ready to start') : `Step ${state.step + 1} of ${STEPS.length}`)}
          </Text>
          {last ? (
            <>
              <Button kind="outline" label={phone ? 'Save' : 'Save for later'} disabled={issues.length > 0 || starting} onPress={() => void start(false)} {...(phone ? { style: { minWidth: 70, paddingHorizontal: 12 } } : {})} />
              <Button kind="green" label={starting ? 'Starting…' : 'Start game'} disabled={issues.length > 0 || starting} onPress={() => void start(true)} {...(phone ? { style: { minWidth: 110, paddingHorizontal: 14 } } : {})} />
            </>
          ) : (
            <Button label="Next →" disabled={!canAdvance(state, teams)} onPress={() => setState((s) => goToStep(s, s.step + 1))} {...(phone ? { style: { minWidth: 100, paddingHorizontal: 14 } } : {})} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: colors.paper },
  topBar: { backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 8 },
  topTitle: { fontFamily: font.displayBold, fontSize: 18, color: colors.card },
  compactButton: { minWidth: 48, paddingHorizontal: 0 },
  rail: { width: 260, backgroundColor: colors.ink, padding: 24 },
  wordmark: { fontFamily: font.displayItalic, fontSize: 22, color: colors.card },
  railTitle: { fontFamily: font.displayItalic, fontSize: 36, color: colors.card },
  railStep: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, minHeight: 56 },
  circle: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.ink3, alignItems: 'center', justifyContent: 'center' },
  circleText: { color: colors.card, fontFamily: font.displayBold, fontSize: 16 },
  stepTitle: { fontFamily: font.displayBold, fontSize: 17, color: colors.card },
  stepHint: { fontFamily: font.body, fontSize: 12, color: colors.mutedOnDark },
  content: { flex: 1 },
  scroll: { paddingHorizontal: 36, paddingVertical: 30 },
  footer: { height: 76, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 36 },
  status: { flex: 1, fontFamily: font.body, fontSize: 15, color: colors.muted },
  error: { fontFamily: font.bodyBold, fontSize: 16, color: colors.ink },
});
