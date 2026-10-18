import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, View, useWindowDimensions } from 'react-native';

import { BoxScore } from '@/components/viewer/BoxScore';
import { LeadersView } from '@/components/viewer/LeadersView';
import { OverviewView } from '@/components/viewer/OverviewView';
import { PlayFeed } from '@/components/viewer/PlayFeed';
import { ScoreHeader } from '@/components/viewer/ScoreHeader';
import { ShotsView } from '@/components/viewer/ShotsView';
import { Centered, Chip, ChipRow, viewer } from '@/components/viewer/ui';
import { useCanScore } from '@/components/viewer/useCanScore';
import { useGameView } from '@/components/viewer/useGameView';
import { Button } from '@/components/wizard/kit';
import { supabase } from '@/lib/supabase';

const TABS = [
  { key: 'overview', label: 'Overview' },
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
  const [tab, setTab] = useState<TabKey>('overview');
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  // a phone in landscape has little height: thin header, and the Shots tab fills the screen without scrolling
  const phoneLandscape = landscape && Math.min(width, height) < 600;
  const canScore = useCanScore(id);
  const [opening, setOpening] = useState(false);

  // An upcoming game goes live when its scorekeeper opens the tracker.
  const openTracker = async () => {
    setOpening(true);
    if (game?.status === 'scheduled') await supabase.from('games').update({ status: 'live' }).eq('id', id);
    setOpening(false);
    router.push({ pathname: '/game/[id]', params: { id } });
  };

  if (loading) return <Centered loading body="Loading game…" />;
  if (error || !game) return <Centered title="Could not load the game" body={error ?? 'Game not found'} />;

  const tabs = (
    <View style={{ padding: 12, backgroundColor: viewer.screen.backgroundColor }}>
      <ChipRow>
        {TABS.map((t) => (
          <Chip key={t.key} label={t.label} active={tab === t.key} onPress={() => setTab(t.key)} />
        ))}
      </ChipRow>
    </View>
  );

  if (landscape && tab === 'shots') {
    return (
      <View style={viewer.screen}>
        <Stack.Screen options={{ title: `${game.teams.home.abbr} vs ${game.teams.away.abbr}` }} />
        <ScoreHeader game={game} compact={phoneLandscape} />
        {tabs}
        <View style={{ flex: 1, paddingHorizontal: 12, paddingBottom: 12 }}>
          <ShotsView game={game} landscape />
        </View>
      </View>
    );
  }

  return (
    <View style={viewer.screen}>
      <Stack.Screen options={{ title: `${game.teams.home.abbr} vs ${game.teams.away.abbr}` }} />
      <ScrollView
        stickyHeaderIndices={[1]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
        contentContainerStyle={{ paddingBottom: 40 }}>
        <View>
          <ScoreHeader game={game} compact={phoneLandscape} />
          {canScore && game.status !== 'final' ? (
            <View style={{ padding: 12 }}>
              <Button
                kind="green"
                disabled={opening}
                label={game.status === 'scheduled' ? 'Start game and open tracker' : 'Open tracker'}
                onPress={() => void openTracker()}
              />
            </View>
          ) : null}
        </View>
        {tabs}
        <View style={viewer.content}>
          {tab === 'overview' && <OverviewView game={game} onOpenTab={setTab} />}
          {tab === 'plays' && <PlayFeed game={game} />}
          {tab === 'box' && <BoxScore game={game} />}
          {tab === 'shots' && <ShotsView game={game} />}
          {tab === 'leaders' && <LeadersView game={game} />}
        </View>
      </ScrollView>
    </View>
  );
}
