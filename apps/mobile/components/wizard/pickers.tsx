import { colors, radius } from '@basket-log/ui';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { HOURS, MINUTES, monthGrid, parseHm, parseIsoDate, toHm, toIsoDate } from '@/lib/calendar';

import { Button, Label, font, kit } from './kit';

const MONTH = (year: number, month: number) => new Date(year, month, 1).toLocaleDateString('en', { month: 'long', year: 'numeric' });
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** A field that looks like the other wizard inputs and opens `children` in a centred card. */
function PickerField({
  label,
  text,
  placeholder,
  containerStyle,
  open,
  setOpen,
  children,
}: {
  label: string;
  text: string;
  placeholder: string;
  containerStyle: ViewStyle | undefined;
  open: boolean;
  setOpen: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <View style={[{ flex: 1 }, containerStyle]}>
      <Label>{label}</Label>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => setOpen(true)} style={[kit.input, { justifyContent: 'center' }]}>
        <Text style={{ fontFamily: font.body, fontSize: 16, color: text ? colors.ink : colors.muted }}>{text || placeholder}</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)} supportedOrientations={['portrait', 'landscape']}>
        <View style={styles.wrap}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel="Close" />
          <View style={styles.card}>{children}</View>
        </View>
      </Modal>
    </View>
  );
}

/** Date as YYYY-MM-DD, picked from a month calendar in the app's own style. */
export function DateField({
  label,
  value,
  onChange,
  containerStyle,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  containerStyle?: ViewStyle;
}) {
  const [open, setOpen] = useState(false);
  const picked = parseIsoDate(value);
  const today = new Date();
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });

  const show = (next: boolean) => {
    if (next) setView(picked ? { year: picked.year, month: picked.month } : { year: today.getFullYear(), month: today.getMonth() });
    setOpen(next);
  };
  const shift = (delta: number) =>
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  const pick = (iso: string) => {
    onChange(iso);
    setOpen(false);
  };

  return (
    <PickerField
      label={label}
      text={picked ? new Date(picked.year, picked.month, picked.day).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : ''}
      placeholder="Choose a date"
      containerStyle={containerStyle}
      open={open}
      setOpen={show}>
      <View style={styles.monthRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => shift(-1)} style={styles.nav}>
          <Text style={styles.navText}>‹</Text>
        </Pressable>
        <Text style={styles.month}>{MONTH(view.year, view.month).toUpperCase()}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => shift(1)} style={styles.nav}>
          <Text style={styles.navText}>›</Text>
        </Pressable>
      </View>
      <View style={styles.weekRow}>
        {WEEKDAYS.map((d, i) => (
          <Text key={i} style={styles.weekday}>{d}</Text>
        ))}
      </View>
      {monthGrid(view.year, view.month).map((week, w) => (
        <View key={w} style={styles.weekRow}>
          {week.map((day, i) => {
            if (day === null) return <View key={i} style={styles.cell} />;
            const iso = toIsoDate(view.year, view.month, day);
            const selected = iso === value;
            const isToday = iso === toIsoDate(today.getFullYear(), today.getMonth(), today.getDate());
            return (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={iso}
                onPress={() => pick(iso)}
                style={[styles.cell, styles.day, isToday && styles.today, selected && styles.selected]}>
                <Text style={[styles.dayText, selected && { color: colors.card }]}>{day}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
      <View style={styles.actions}>
        <Button kind="outline" label="Clear" onPress={() => pick('')} style={styles.action} />
        <Button kind="outline" label="Today" onPress={() => pick(toIsoDate(today.getFullYear(), today.getMonth(), today.getDate()))} style={styles.action} />
      </View>
    </PickerField>
  );
}

/** Time as HH:mm (24 h, hours 0 to 23, minutes in steps of 5), picked from a grid in the app's own style. */
export function TimeField({
  label,
  value,
  onChange,
  containerStyle,
}: {
  label: string;
  value: string;
  onChange: (hm: string) => void;
  containerStyle?: ViewStyle;
}) {
  const [open, setOpen] = useState(false);
  const picked = parseHm(value);
  // an hour chosen before any minute starts at :00
  const set = (hour: number, minute: number) => onChange(toHm(hour, minute));

  return (
    <PickerField label={label} text={value} placeholder="Choose a time" containerStyle={containerStyle} open={open} setOpen={setOpen}>
      <Text style={styles.month}>HOUR</Text>
      <View style={styles.grid}>
        {HOURS.map((h) => {
          const selected = picked?.hour === h;
          return (
            <Pressable
              key={h}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${h} hours`}
              onPress={() => set(h, picked?.minute ?? 0)}
              style={[styles.slot, selected && styles.selected]}>
              <Text style={[styles.dayText, selected && { color: colors.card }]}>{String(h).padStart(2, '0')}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.month, { marginTop: 12 }]}>MINUTES</Text>
      <View style={styles.grid}>
        {MINUTES.map((m) => {
          const selected = picked?.minute === m;
          return (
            <Pressable
              key={m}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${m} minutes`}
              onPress={() => set(picked?.hour ?? 12, m)}
              style={[styles.slot, selected && styles.selected]}>
              <Text style={[styles.dayText, selected && { color: colors.card }]}>{String(m).padStart(2, '0')}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.actions}>
        <Button kind="outline" label="Clear" onPress={() => { onChange(''); setOpen(false); }} style={styles.action} />
        <Button kind="green" label="Done" onPress={() => setOpen(false)} style={styles.action} />
      </View>
    </PickerField>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17,19,17,0.55)', padding: 16 },
  card: { width: '100%', maxWidth: 360, backgroundColor: colors.paper, borderRadius: radius.card, padding: 14, gap: 6 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  month: { fontFamily: font.displayBold, fontSize: 20, color: colors.ink },
  nav: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.small, backgroundColor: colors.card },
  navText: { fontFamily: font.bodyBold, fontSize: 24, color: colors.ink },
  weekRow: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontFamily: font.bodyBold, fontSize: 11, letterSpacing: 1, color: colors.muted, paddingVertical: 4 },
  cell: { flex: 1, aspectRatio: 1, maxHeight: 44 },
  day: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.small, margin: 1 },
  today: { borderWidth: 1.5, borderColor: colors.green },
  selected: { backgroundColor: colors.green },
  dayText: { fontFamily: font.bodyBold, fontSize: 15, color: colors.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  slot: { width: '15%', flexGrow: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.small, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.line },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  action: { flex: 1, minWidth: 0 },
});
