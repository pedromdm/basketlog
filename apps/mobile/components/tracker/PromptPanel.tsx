import { colors, radius } from '@basket-log/ui';
import { StyleSheet, Text, View } from 'react-native';

import { font } from '../wizard/kit';
import { optionLabel, optionSide, promptTitle } from './format';
import { ActionButton, Grid } from './ui';
import type { ReadyTracker } from './useTrackerUi';

/**
 * The chained play: events logged so far, the open question, answer buttons, and Done / Cancel.
 * `variant="sheet"` rounds the top corners for the phone bottom sheet.
 */
export function PromptPanel({
  t,
  onAnswer,
  onDone,
  onCancel,
  variant = 'panel',
}: {
  t: ReadyTracker;
  onAnswer: (optionId: string) => void;
  onDone: () => void;
  onCancel: () => void;
  variant?: 'panel' | 'sheet';
}) {
  const { prompt, game, state, derived } = t;
  if (!prompt) return null;
  const groupId = state.chain?.groupId;
  const logged = groupId ? derived.plays.find((p) => p.groupId === groupId)?.text.split(' → ') : undefined;
  const step = (groupId ? state.events.filter((e) => e.groupId === groupId).length : 0) + 1;
  const neutral = prompt.options.filter((o) => !optionSide(game, o));
  const players = prompt.options.filter((o) => optionSide(game, o));

  return (
    <View
      accessibilityLabel={promptTitle(game, prompt)}
      style={[styles.panel, variant === 'sheet' && { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderRadius: undefined }]}>
      <Text style={styles.kicker}>CHAINED PLAY · STEP {step}</Text>
      {logged?.map((line, i) => (
        <Text key={i} style={styles.logged}>
          ✓ {line}
        </Text>
      ))}
      <Text style={styles.question}>{promptTitle(game, prompt).toUpperCase()}</Text>
      {players.length ? (
        <Grid columns={2}>
          {players.map((o) => {
            const home = optionSide(game, o) === 'home';
            return (
              <ActionButton
                key={o.id}
                label={optionLabel(game, o)}
                tone={home ? 'green' : 'miss'}
                height={50}
                onPress={() => onAnswer(o.id)}
              />
            );
          })}
        </Grid>
      ) : null}
      {neutral.length ? (
        <Grid columns={neutral.length <= 2 || players.length === 0 ? 2 : 1}>
          {neutral.map((o) => (
            <ActionButton key={o.id} label={optionLabel(game, o)} tone="ghost" height={50} onPress={() => onAnswer(o.id)} />
          ))}
        </Grid>
      ) : null}
      <ActionButton label="Done — save play" tone="green" onPress={onDone} />
      <ActionButton label="Cancel play" tone="ghost" onPress={onCancel} />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: colors.ink, borderRadius: radius.panel, padding: 18, gap: 10 },
  kicker: { fontFamily: font.bodyBold, fontSize: 11, letterSpacing: 1.1, color: colors.greenLight },
  logged: { fontFamily: font.body, fontSize: 13, color: colors.mutedOnDark },
  question: { fontFamily: font.displayBold, fontSize: 26, color: colors.card },
});
