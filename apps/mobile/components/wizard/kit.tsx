import { colors, radius } from '@basket-log/ui';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';

export const font = {
  body: 'Barlow_500Medium',
  bodyBold: 'Barlow_700Bold',
  display: 'BarlowCondensed_800ExtraBold',
  displayItalic: 'BarlowCondensed_800ExtraBold_Italic',
  displayBold: 'BarlowCondensed_700Bold',
} as const;

export function Title({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={kit.title}>{title.toUpperCase()}</Text>
      {subtitle ? <Text style={kit.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={kit.label}>{children}</Text>;
}

export function Field({ label, ...props }: { label: string } & TextInputProps) {
  return (
    <View style={{ flex: 1 }}>
      <Label>{label}</Label>
      <TextInput placeholderTextColor={colors.muted} style={kit.input} {...props} />
    </View>
  );
}

export function Button({
  label,
  onPress,
  kind = 'ink',
  disabled,
  style,
}: {
  label: string;
  onPress?: () => void;
  kind?: 'ink' | 'outline' | 'green';
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const bg = disabled ? colors.line3 : kind === 'green' ? colors.green : kind === 'ink' ? colors.ink : colors.card;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      onPress={disabled ? undefined : onPress}
      style={[kit.button, { backgroundColor: bg, borderColor: kind === 'outline' ? colors.ink : bg }, style]}>
      <Text style={[kit.buttonText, { color: kind === 'outline' ? colors.ink : colors.card }]}>{label.toUpperCase()}</Text>
    </Pressable>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={kit.segmented}>
      {options.map((o) => (
        <Pressable
          key={o.value}
          accessibilityRole="button"
          accessibilityState={{ selected: o.value === value }}
          onPress={() => onChange(o.value)}
          style={[kit.segment, o.value === value && { backgroundColor: colors.ink }]}>
          <Text style={[kit.segmentText, { color: o.value === value ? colors.card : colors.ink }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Stepper({
  label,
  value,
  unit,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  unit?: string;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const step = (d: number) => onChange(Math.max(min, Math.min(max, value + d)));
  return (
    <View style={kit.stepper}>
      <Text style={kit.stepperLabel}>{label}</Text>
      <View style={kit.stepperRow}>
        <Pressable accessibilityLabel={`Decrease ${label}`} onPress={() => step(-1)} style={kit.stepButton}>
          <Text style={kit.stepButtonText}>-</Text>
        </Pressable>
        <Text style={kit.stepperValue}>
          {value}
          {unit ? <Text style={kit.stepperUnit}> {unit}</Text> : null}
        </Text>
        <Pressable accessibilityLabel={`Increase ${label}`} onPress={() => step(1)} style={kit.stepButton}>
          <Text style={kit.stepButtonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <View style={kit.toggleRow}>
      <Text style={kit.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.green, false: colors.line3 }} thumbColor={colors.card} />
    </View>
  );
}

export function TeamChip({ abbr, color, size = 44 }: { abbr: string; color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.card, fontFamily: font.display, fontSize: size * 0.34 }}>{abbr}</Text>
    </View>
  );
}

export const kit = StyleSheet.create({
  title: { fontFamily: font.displayItalic, fontSize: 40, color: colors.ink },
  subtitle: { fontFamily: font.body, fontSize: 15, color: colors.muted, marginTop: 2 },
  label: { fontFamily: font.bodyBold, fontSize: 12, letterSpacing: 1, color: colors.muted, textTransform: 'uppercase', marginBottom: 6 },
  input: {
    height: 44,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.small,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    fontFamily: font.body,
    fontSize: 16,
    color: colors.ink,
  },
  button: { height: 48, minWidth: 120, borderRadius: radius.button, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 },
  buttonText: { fontFamily: font.display, fontSize: 18, letterSpacing: 0.5 },
  segmented: { flexDirection: 'row', backgroundColor: colors.line2, borderRadius: radius.button, padding: 4, alignSelf: 'flex-start' },
  segment: { minHeight: 40, paddingHorizontal: 18, borderRadius: radius.small, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontFamily: font.displayBold, fontSize: 17 },
  stepper: { flex: 1, minWidth: 220, backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1.5, borderColor: colors.line, padding: 14 },
  stepperLabel: { fontFamily: font.bodyBold, fontSize: 12, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  stepButton: { width: 48, height: 48, borderRadius: radius.small, backgroundColor: colors.line2, alignItems: 'center', justifyContent: 'center' },
  stepButtonText: { fontFamily: font.displayBold, fontSize: 28, color: colors.ink },
  stepperValue: { fontFamily: font.display, fontSize: 30, color: colors.ink },
  stepperUnit: { fontFamily: font.bodyBold, fontSize: 14, color: colors.muted },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1.5, borderColor: colors.line, paddingHorizontal: 16, minHeight: 56 },
  toggleLabel: { fontFamily: font.bodyBold, fontSize: 16, color: colors.ink },
});
