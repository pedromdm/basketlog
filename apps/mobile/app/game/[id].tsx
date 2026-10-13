import { colors } from '@basket-log/ui';
import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { font } from '@/components/wizard/kit';

/** Placeholder: the tracker is built in Phase 3. */
export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: 'Tracker' }} />
      <Text style={styles.title}>GAME STARTED</Text>
      <Text style={styles.body}>The live tracker arrives in Phase 3.</Text>
      <Text style={styles.id}>{id}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper, gap: 8 },
  title: { fontFamily: font.displayItalic, fontSize: 40, color: colors.ink },
  body: { fontFamily: font.body, fontSize: 16, color: colors.muted },
  id: { fontFamily: font.body, fontSize: 12, color: colors.muted },
});
