import { colors, radius } from '@basket-log/ui';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { Side } from '@basket-log/core';

import type { SyncInfo, TrackerGame } from '@/lib/tracker/types';

import { syncText } from './format';
import { font } from '../wizard/kit';

export const MIN_TARGET = 48;

type Tone = 'green' | 'greenDark' | 'miss' | 'neutral' | 'dark' | 'outline' | 'ghost';

const toneStyle: Record<Tone, { bg: string; fg: string; border: string }> = {
  green: { bg: colors.green, fg: colors.card, border: colors.green },
  greenDark: { bg: colors.greenDark, fg: colors.card, border: colors.greenDark },
  miss: { bg: colors.card, fg: colors.ink, border: colors.line3 },
  neutral: { bg: colors.line, fg: colors.ink, border: colors.line },
  dark: { bg: colors.ink, fg: colors.card, border: colors.ink },
  outline: { bg: colors.card, fg: colors.ink, border: colors.ink },
  ghost: { bg: 'transparent', fg: colors.card, border: colors.muted },
};

/** Big pad button; at least 48pt tall. */
export function ActionButton({
  label,
  onPress,
  tone = 'neutral',
  disabled,
  height = MIN_TARGET,
  style,
  accessibilityLabel,
}: {
  label: string;
  onPress?: () => void;
  tone?: Tone;
  disabled?: boolean;
  height?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const t = toneStyle[tone];
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        { minHeight: Math.max(height, MIN_TARGET), backgroundColor: t.bg, borderColor: t.border, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 },
        style,
      ]}>
      <Text style={[styles.btnText, { color: t.fg }]}>{label.toUpperCase()}</Text>
    </Pressable>
  );
}

export function Grid({ columns, gap = 8, children }: { columns: number; gap?: number; children: ReactNode[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -gap / 2 }}>
      {children.map((child, i) => (
        <View key={i} style={{ width: `${100 / columns}%`, padding: gap / 2 }}>
          {child}
        </View>
      ))}
    </View>
  );
}

export function SyncPill({ sync }: { sync: SyncInfo }) {
  const tone =
    sync.status === 'synced'
      ? { dot: colors.greenLight, bg: colors.ink2 }
      : sync.status === 'syncing'
        ? { dot: colors.wood, bg: colors.ink2 }
        : { dot: colors.card, bg: colors.ink3 };
  return (
    <View accessibilityLabel={syncText(sync)} style={[styles.pill, { backgroundColor: tone.bg }]}>
      <View style={[styles.dot, { backgroundColor: tone.dot }]} />
      <Text style={styles.pillText}>{syncText(sync)}</Text>
    </View>
  );
}

export function TeamDot({ color, size = 10 }: { color: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
}

/** Home / away segmented control; the active segment takes the team colour. */
export function TeamToggle({ game, side, onChange }: { game: TrackerGame; side: Side; onChange: (side: Side) => void }) {
  return (
    <View style={styles.toggle}>
      {(['home', 'away'] as const).map((s) => {
        const active = s === side;
        return (
          <Pressable
            key={s}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(s)}
            style={[styles.segment, active && { backgroundColor: game.teams[s].color }]}>
            <Text style={[styles.segmentText, { color: active ? colors.card : colors.ink }]}>{game.teams[s].name.toUpperCase()}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', backgroundColor: colors.line, borderRadius: radius.button, padding: 4 },
  segment: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.small },
  segmentText: { fontFamily: font.displayBold, fontSize: 18, letterSpacing: 0.3 },
  btn: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.button, borderWidth: 1.5, paddingHorizontal: 8 },
  btnText: { fontFamily: font.displayBold, fontSize: 18, letterSpacing: 0.3 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.pill, paddingHorizontal: 10, minHeight: 28 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pillText: { fontFamily: font.bodyBold, fontSize: 12, color: colors.card },
});
