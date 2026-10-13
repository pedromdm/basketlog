import { colors, radius } from '@basket-log/ui';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { font } from '@/components/wizard/kit';

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

/** A thin share bar: `value` of `total` filled with `color`. */
export function Bar({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(100, Math.max(0, (value / total) * 100)) : 0;
  return (
    <View style={styles.barTrack}>
      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: radius.pill }} />
    </View>
  );
}

export function Centered({ title, body, loading }: { title?: string; body?: string; loading?: boolean }) {
  return (
    <View style={styles.centered}>
      {loading ? <ActivityIndicator color={colors.green} /> : null}
      {title ? <Text style={styles.centerTitle}>{title}</Text> : null}
      {body ? <Text style={styles.centerBody}>{body}</Text> : null}
    </View>
  );
}

export const viewer = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  muted: { fontFamily: font.body, fontSize: 13, color: colors.muted },
});

const styles = StyleSheet.create({
  chipRow: { gap: 8, paddingVertical: 2 },
  chip: { minHeight: 48, paddingHorizontal: 16, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.line2 },
  chipActive: { backgroundColor: colors.ink },
  chipText: { fontFamily: font.bodyBold, fontSize: 14, color: colors.ink },
  chipTextActive: { color: colors.card },
  card: { backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1.5, borderColor: colors.line, padding: 14, gap: 10 },
  sectionTitle: { fontFamily: font.displayBold, fontSize: 20, letterSpacing: 0.6, color: colors.ink, textTransform: 'uppercase' },
  barTrack: { height: 8, borderRadius: radius.pill, backgroundColor: colors.line2, overflow: 'hidden' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 28, backgroundColor: colors.paper },
  centerTitle: { fontFamily: font.displayItalic, fontSize: 28, color: colors.ink, textAlign: 'center' },
  centerBody: { fontFamily: font.body, fontSize: 15, color: colors.muted, textAlign: 'center' },
});
