import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { BoxScore } from '@/components/viewer/BoxScore';
import { LeadersView } from '@/components/viewer/LeadersView';
import { PlayFeed } from '@/components/viewer/PlayFeed';
import { ScoreHeader } from '@/components/viewer/ScoreHeader';
import { ShotsView } from '@/components/viewer/ShotsView';
import { Centered, Chip, viewer } from '@/components/viewer/ui';
import { useGameView } from '@/components/viewer/useGameView';

const TABS = [
  { key: 'plays', label: 'Plays' },
  { key: 'box', label: 'Box' },
  { key: 'shots', label: 'Shots' },
  { key: 'leaders', label: 'Leaders' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

/** Game viewer: live header and the Plays / Box / Shots / Leaders tabs (phone layout 1d). */
export default function GameViewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { game, loading, refreshing, error, refresh } = useGameView(id);
  const [tab, setTab] = useState<TabKey>('plays');

  if (loading) return <Centered loading body="Loading game…" />;
  if (error || !game) return <Centered title="Could not load the game" body={error ?? 'Game not found'} />;

  return (
    <View style={viewer.screen}>
      <Stack.Screen options={{ title: `${game.teams.home.abbr} vs ${game.teams.away.abbr}` }} />
      <ScrollView
        stickyHeaderIndices={[1]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
        contentContainerStyle={{ paddingBottom: 40 }}>
        <ScoreHeader game={game} />
        <View style={{ flexDirection: 'row', gap: 8, padding: 12, backgroundColor: viewer.screen.backgroundColor }}>
          {TABS.map((t) => (
            <Chip key={t.key} label={t.label} active={tab === t.key} onPress={() => setTab(t.key)} />
          ))}
        </View>
        <View style={viewer.content}>
          {tab === 'plays' && <PlayFeed game={game} />}
          {tab === 'box' && <BoxScore game={game} />}
          {tab === 'shots' && <ShotsView game={game} />}
          {tab === 'leaders' && <LeadersView game={game} />}
        </View>
      </ScrollView>
    </View>
  );
}
