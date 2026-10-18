import { colors, radius } from '@basket-log/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { font } from '../wizard/kit';
import { syncText } from './format';
import { ActionButton } from './ui';
import type { ReadyTracker } from './useTrackerUi';

/** Menu of the tracker: leave the screen (events are already saved and keep syncing) or finish the game. */
export function TrackerMenu({ t, visible, onClose }: { t: ReadyTracker; visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const final = t.game.status === 'final';

  const leave = () => {
    onClose();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const finish = () => {
    Alert.alert('Finish game?', 'The game becomes final and no more events can be added.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Finish game',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await t.finishGame();
            leave();
          } catch (e) {
            Alert.alert('Could not finish the game', e instanceof Error ? e.message : String(e));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']}>
      <View style={styles.wrap}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close menu" />
        <View style={styles.card}>
          <Text style={styles.title}>
            {t.game.teams.home.abbr} vs {t.game.teams.away.abbr}
          </Text>
          <Text style={styles.sync}>{syncText(t.sync)}</Text>
          <ActionButton label="Back to games" tone="outline" onPress={leave} />
          {final ? null : <ActionButton label="Finish game" tone="dark" disabled={busy} onPress={finish} />}
          <ActionButton label="Resume tracking" tone="green" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17,19,17,0.55)', padding: 24 },
  card: { width: '100%', maxWidth: 360, backgroundColor: colors.paper, borderRadius: radius.card, padding: 16, gap: 10 },
  title: { fontFamily: font.displayBold, fontSize: 26, color: colors.ink },
  sync: { fontFamily: font.body, fontSize: 13, color: colors.muted, marginBottom: 4 },
});
