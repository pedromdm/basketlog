import { colors } from '@basket-log/ui';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useWindowDimensions, StyleSheet, Text, View, ActivityIndicator } from 'react-native';

import { PhoneTracker } from '@/components/tracker/PhoneTracker';
import { TabletTracker } from '@/components/tracker/TabletTracker';
import { isReady } from '@/components/tracker/useTrackerUi';
import { font } from '@/components/wizard/kit';
import { useTracker } from '@/lib/tracker';

const TABLET_MIN_WIDTH = 768;

export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const tracker = useTracker(id);

  let body;
  if (tracker.error) {
    body = (
      <View style={styles.center}>
        <Text style={styles.title}>COULD NOT LOAD THE GAME</Text>
        <Text style={styles.body}>{tracker.error}</Text>
      </View>
    );
  } else if (!isReady(tracker)) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator color={colors.green} />
        <Text style={styles.body}>Loading game…</Text>
      </View>
    );
  } else {
    body = width >= TABLET_MIN_WIDTH ? <TabletTracker t={tracker} /> : <PhoneTracker t={tracker} />;
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: 'Tracker', headerShown: false }} />
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  title: { fontFamily: font.displayItalic, fontSize: 32, color: colors.ink },
  body: { fontFamily: font.body, fontSize: 16, color: colors.muted, textAlign: 'center' },
});
