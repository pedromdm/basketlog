import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GameCard } from '@/components/viewer/GameCard';
import { Centered, SectionTitle, viewer } from '@/components/viewer/ui';
import { useGamesList, type ListGame } from '@/components/viewer/useGamesList';
import { Button, font } from '@/components/wizard/kit';
import { useAuth } from '@/lib/auth';
import { colors } from '@basket-log/ui';

const GROUPS: { status: ListGame['status']; title: string }[] = [
  { status: 'live', title: 'Live now' },
  { status: 'scheduled', title: 'Upcoming' },
  { status: 'final', title: 'Final' },
];

/** Games tab: live / upcoming / final score cards. A tap opens the viewer; New game starts the wizard. */
export default function GamesScreen() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const { games, loading, refreshing, error, refresh } = useGamesList();

  if (loading) return <Centered loading body="Loading games…" />;

  return (
    <ScrollView
      style={viewer.screen}
      contentContainerStyle={viewer.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}>
      <Text style={styles.title}>GAMES</Text>
      <Button kind="green" label="New game" onPress={() => router.push('/new-game')} />

      {error ? <Text style={viewer.muted}>Could not load games: {error}</Text> : null}
      {!error && games.length === 0 ? <Text style={viewer.muted}>No games yet. Start one with New game.</Text> : null}

      {GROUPS.map((group) => {
        const inGroup = games.filter((g) => g.status === group.status);
        if (!inGroup.length) return null;
        return (
          <View key={group.status} style={{ gap: 10 }}>
            <SectionTitle>{group.title}</SectionTitle>
            {inGroup.map((game) => (
              <GameCard key={game.id} game={game} onPress={() => router.push({ pathname: '/game-view/[id]', params: { id: game.id } })} />
            ))}
          </View>
        );
      })}

      <View style={styles.account}>
        <Text style={viewer.muted}>Signed in as {session?.user.email}</Text>
        <Button kind="outline" label="Sign out" onPress={signOut} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: font.displayItalic, fontSize: 40, color: colors.ink },
  account: { gap: 10, marginTop: 12 },
});
