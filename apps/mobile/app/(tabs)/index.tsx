import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { GameCard } from '@/components/viewer/GameCard';
import { GamesHeader, TopBar, dayKey } from '@/components/viewer/GamesHeader';
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

type Filter = 'all' | ListGame['status'];

/**
 * Games tab, as on the website: black top bar, "Game night" with the day strip, status filters, then the game cards
 * (live / upcoming / final). A tap opens the viewer; New game starts the wizard.
 */
export default function GamesScreen() {
  const router = useRouter();
  const { width: screen } = useWindowDimensions();
  const { session, signOut } = useAuth();
  const { games: all, loading, refreshing, error, refresh } = useGamesList();
  // fixed once per mount so the day strip does not shift while the screen is open
  const [today] = useState(() => new Date());
  const [filter, setFilter] = useState<Filter>('all');
  const [day, setDay] = useState<string | null>(null);

  const games = useMemo(
    () => all.filter((g) => (filter === 'all' || g.status === filter) && (!day || (g.startsAt !== null && dayKey(new Date(g.startsAt)) === day))),
    [all, filter, day],
  );
  const count = (s: ListGame['status']) => all.filter((g) => g.status === s).length;
  const chips: { id: Filter; label: string; n: number }[] = [
    { id: 'all', label: 'All games', n: all.length },
    { id: 'live', label: 'Live', n: count('live') },
    { id: 'final', label: 'Final', n: count('final') },
    { id: 'scheduled', label: 'Upcoming', n: count('scheduled') },
  ];

  // Cards in a row-wrapping grid, equal height within a row: 1 per row on a phone, 2 on a tablet, 3 on a wide tablet.
  const PADDING = 16;
  const GAP = 12;
  const cols = screen >= 1000 ? 3 : screen >= 600 ? 2 : 1;
  const cardWidth = Math.floor((screen - PADDING * 2 - GAP * (cols - 1)) / cols);

  if (loading) {
    return (
      <View style={viewer.screen}>
        <TopBar />
        <Centered loading body="Loading games…" />
      </View>
    );
  }

  return (
    <View style={viewer.screen}>
      <TopBar />
      <ScrollView
        style={viewer.screen}
        contentContainerStyle={viewer.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}>
        <GamesHeader today={today} selectedDay={day} onSelectDay={setDay} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {chips.map((c) => (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === c.id }}
              onPress={() => setFilter(c.id)}
              style={[styles.chip, filter === c.id && styles.chipOn]}>
              <Text style={[styles.chipText, filter === c.id && { color: colors.card }]}>
                {c.label} · {c.n}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Button kind="green" label="New game" onPress={() => router.push('/new-game')} />

        {error ? <Text style={viewer.muted}>Could not load games: {error}</Text> : null}
        {!error && games.length === 0 ? (
          <Text style={viewer.muted}>{all.length ? 'No games match.' : 'No games yet. Start one with New game.'}</Text>
        ) : null}

        {GROUPS.map((group) => {
          const inGroup = games.filter((g) => g.status === group.status);
          if (!inGroup.length) return null;
          return (
            <View key={group.status} style={{ gap: 10 }}>
              <SectionTitle>{group.title}</SectionTitle>
              <View style={[styles.grid, { gap: GAP }]}>
                {inGroup.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    width={cardWidth}
                    onPress={() => router.push({ pathname: '/game-view/[id]', params: { id: game.id } })}
                  />
                ))}
              </View>
            </View>
          );
        })}

        <View style={styles.account}>
          <Text style={viewer.muted}>Signed in as {session?.user.email}</Text>
          <Button kind="outline" label="Sign out" onPress={signOut} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { minHeight: 44, borderRadius: 999, borderWidth: 1, borderColor: colors.line3, backgroundColor: colors.card, paddingHorizontal: 16, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { fontFamily: font.bodyBold, fontSize: 14, color: colors.ink },
  account: { gap: 10, marginTop: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
});
