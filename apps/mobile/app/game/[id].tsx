import { colors } from '@basket-log/ui';
import { Stack, useLocalSearchParams } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect } from 'react';
import { useWindowDimensions, StyleSheet, Text, View, ActivityIndicator } from 'react-native';

import { GameOverDialog } from '@/components/tracker/GameOverDialog';
import { PhoneLandscapeTracker } from '@/components/tracker/PhoneLandscapeTracker';
import { PhoneTracker } from '@/components/tracker/PhoneTracker';
import { TabletTracker } from '@/components/tracker/TabletTracker';
import { isReady } from '@/components/tracker/useTrackerUi';
import { font } from '@/components/wizard/kit';
import { useTracker } from '@/lib/tracker';

// Judge the device by its shorter side: a phone in landscape is 852 wide but only 393 tall.
const TABLET_MIN_SHORT_SIDE = 600;

export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width, height } = useWindowDimensions();
  const isTablet = Math.min(width, height) >= TABLET_MIN_SHORT_SIDE;
  const tracker = useTracker(id);

  // Tablets lock to landscape (court beside the pads); phones rotate freely and get a layout per orientation.
  useEffect(() => {
    if (!isTablet) return;
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    return () => {
      ScreenOrientation.unlockAsync().catch(() => {});
    };
  }, [isTablet]);

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
    body = isTablet ? <TabletTracker t={tracker} /> : width > height ? <PhoneLandscapeTracker t={tracker} /> : <PhoneTracker t={tracker} />;
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: 'Tracker', headerShown: false }} />
      {body}
      {isReady(tracker) ? <GameOverDialog t={tracker} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  title: { fontFamily: font.displayItalic, fontSize: 32, color: colors.ink },
  body: { fontFamily: font.body, fontSize: 16, color: colors.muted, textAlign: 'center' },
});
