import { colors, radius } from '@basket-log/ui';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { font } from '@/components/wizard/kit';

export const dayKey = (d: Date): string => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** The seven days around `anchor` (three before, three after), as on the website. */
export function sevenDays(anchor: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + i - 3));
}

/** Black top bar: wordmark and the section tabs (the Games tab is the current one). */
export function TopBar() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: Math.max(insets.top, 8), paddingLeft: Math.max(insets.left, 16), paddingRight: Math.max(insets.right, 16) }]}>
      <Text style={styles.wordmark}>
        BASKET <Text style={{ color: colors.greenLight }}>LOG</Text>
      </Text>
      <View style={styles.tabs}>
        <View accessibilityRole="tab" accessibilityState={{ selected: true }} style={styles.tabOn}>
          <Text style={styles.tabOnText}>Games</Text>
        </View>
      </View>
    </View>
  );
}

/** "Game night" title with today's date, and the day strip: tap a day to show only its games, tap again to clear. */
export function GamesHeader({
  today,
  selectedDay,
  onSelectDay,
}: {
  today: Date;
  selectedDay: string | null;
  onSelectDay: (key: string | null) => void;
}) {
  const caption = today.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  return (
    <View style={{ gap: 12 }}>
      <View>
        <Text style={styles.caption}>{caption.toUpperCase()}</Text>
        <Text style={styles.title}>GAME NIGHT</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {sevenDays(today).map((d) => {
          const key = dayKey(d);
          const selected = selectedDay === key;
          const isToday = key === dayKey(today);
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
              onPress={() => onSelectDay(selected ? null : key)}
              style={[styles.day, selected && styles.dayOn]}>
              <Text style={[styles.dayName, selected ? { color: colors.greenLight } : isToday && { color: colors.green }]}>
                {d.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase().replace('.', '')}
              </Text>
              <Text style={[styles.dayNum, selected && { color: colors.card }]}>{d.getDate()}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center', gap: 16, paddingBottom: 10 },
  wordmark: { fontFamily: font.displayItalic, fontSize: 24, color: colors.card },
  tabs: { flexDirection: 'row', gap: 8, flex: 1 },
  tabOn: { backgroundColor: colors.card, borderRadius: radius.pill, paddingHorizontal: 16, minHeight: 36, justifyContent: 'center' },
  tabOnText: { fontFamily: font.bodyBold, fontSize: 14, color: colors.ink },
  caption: { fontFamily: font.bodyBold, fontSize: 11, letterSpacing: 1.2, color: colors.muted },
  title: { fontFamily: font.displayItalic, fontSize: 44, lineHeight: 46, color: colors.ink },
  day: { width: 56, height: 64, borderRadius: radius.button, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  dayOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  dayName: { fontFamily: font.bodyBold, fontSize: 10, letterSpacing: 1, color: colors.muted },
  dayNum: { fontFamily: font.display, fontSize: 24, color: colors.ink },
});
