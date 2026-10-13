import { colors, radius } from '@basket-log/ui';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button, font } from '@/components/wizard/kit';
import { useAuth } from '@/lib/auth';

/** Game picker entry point. The list of games arrives with the tracker in Phase 3. */
export default function GamesScreen() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  return (
    <View style={styles.root}>
      <Text style={styles.title}>GAMES</Text>
      <View style={styles.card}>
        <Text style={styles.body}>Signed in as {session?.user.email}</Text>
        <Button kind="green" label="New game" onPress={() => router.push('/new-game')} />
        <Button kind="outline" label="Sign out" onPress={signOut} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper, padding: 28, gap: 16 },
  title: { fontFamily: font.displayItalic, fontSize: 40, color: colors.ink },
  card: { backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1.5, borderColor: colors.line, padding: 20, gap: 12, alignSelf: 'flex-start', minWidth: 320 },
  body: { fontFamily: font.body, fontSize: 15, color: colors.muted },
});
