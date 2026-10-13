import { Stack, useLocalSearchParams } from 'expo-router';
import { RefreshControl, ScrollView, View } from 'react-native';

import { PlayerDetail } from '@/components/viewer/PlayerDetail';
import { Centered, viewer } from '@/components/viewer/ui';
import { useGameView } from '@/components/viewer/useGameView';

/** A player's game: header, PTS/REB/AST, splits, mini court and their plays (phone layout 1h). */
export default function PlayerViewScreen() {
  const { gameId, playerId } = useLocalSearchParams<{ gameId: string; playerId: string }>();
  const { game, loading, refreshing, error, refresh } = useGameView(gameId);

  if (loading) return <Centered loading body="Loading player…" />;
  if (error || !game) return <Centered title="Could not load the game" body={error ?? 'Game not found'} />;
  const player = game.players.find((p) => p.id === playerId);
  if (!player) return <Centered title="Player not found" body="This player is not on the game roster." />;

  return (
    <View style={viewer.screen}>
      <Stack.Screen options={{ title: `#${player.number} ${player.displayName}` }} />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
        contentContainerStyle={viewer.content}>
        <PlayerDetail game={game} player={player} />
      </ScrollView>
    </View>
  );
}
