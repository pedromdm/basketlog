import { teamBelowMinimum } from '@basket-log/core';
import { colors, radius } from '@basket-log/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Modal, StyleSheet, Text, View } from 'react-native';

import { font } from '../wizard/kit';
import { ActionButton } from './ui';
import type { ReadyTracker } from './useTrackerUi';

/**
 * Blocks the tracker when a team is left with fewer players on court than the rules allow to continue (FIBA: with
 * one player left the team forfeits). The scorekeeper finishes the game, or undoes the foul that caused it.
 */
export function GameOverDialog({ t }: { t: ReadyTracker }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const below = teamBelowMinimum(t.state);
  if (!below || t.game.status === 'final') return null;

  const team = t.game.teams[below.side];
  const finish = async () => {
    setBusy(true);
    try {
      await t.finishGame();
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (e) {
      Alert.alert('Could not finish the game', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  // the last play is the player leaving, the one before is the foul that made him leave
  const undoFoul = () => {
    t.dispatch({ type: 'undo' });
    t.dispatch({ type: 'undo' });
  };

  return (
    <Modal visible transparent animationType="fade" supportedOrientations={['portrait', 'landscape']} onRequestClose={() => {}}>
      <View style={styles.wrap}>
        <View style={styles.card}>
          <Text style={styles.title}>GAME CANNOT CONTINUE</Text>
          <Text style={styles.body}>
            {team.name} has {below.count} {below.count === 1 ? 'player' : 'players'} left on court. The minimum to continue is {below.min}, so the
            game is over for {team.name}.
          </Text>
          <ActionButton label={busy ? 'Finishing…' : 'Finish game'} tone="dark" disabled={busy} onPress={() => void finish()} />
          <ActionButton label="Undo the last foul" tone="outline" disabled={busy} onPress={undoFoul} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17,19,17,0.7)', padding: 24 },
  card: { width: '100%', maxWidth: 380, backgroundColor: colors.paper, borderRadius: radius.card, padding: 18, gap: 10 },
  title: { fontFamily: font.displayBold, fontSize: 26, color: colors.ink },
  body: { fontFamily: font.body, fontSize: 15, lineHeight: 21, color: colors.ink, marginBottom: 6 },
});
