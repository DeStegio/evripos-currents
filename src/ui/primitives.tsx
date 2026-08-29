import React, { ReactNode, useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextStyle, View } from 'react-native';

import {
  GUTTER, INK, LABEL, MUTED, NORTH, PAPER, RULE, SANS, SERIF,
} from './theme';

/** Section eyebrow — uppercase, wide tracking, above every block. */
export function Label({ children, style }: { children: ReactNode; style?: TextStyle }) {
  return <Text style={[LABEL, style]}>{children}</Text>;
}

/** One half of a two-up statistic row, divided by a vertical hairline. */
export function StatCell({
  label, value, unit, divider = false,
}: {
  label: string; value: string; unit?: string; divider?: boolean;
}) {
  return (
    <View style={[styles.statCell, divider && styles.statDivider]}>
      <Label>{label}</Label>
      <View style={styles.statValueRow}>
        <Text style={styles.statValue}>{value}</Text>
        {unit ? <Text style={styles.statUnit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

/**
 * Square toggle from the v2 spec. Replaces the platform Switch, whose pill shape
 * and stock colours are the only things in the interface that still read as rounded.
 */
export function Toggle({
  value, onToggle, disabled, label, hint,
}: {
  value: boolean; onToggle: () => void; disabled?: boolean; label: string; hint?: string;
}) {
  const [slide] = useState(() => new Animated.Value(value ? 1 : 0));
  useEffect(() => {
    Animated.timing(slide, { toValue: value ? 1 : 0, duration: 200, useNativeDriver: true }).start();
  }, [slide, value]);
  const translateX = slide.interpolate({ inputRange: [0, 1], outputRange: [0, 18] });
  return (
    <Pressable
      accessibilityHint={hint}
      accessibilityLabel={label}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={onToggle}
      style={[styles.track, { backgroundColor: value ? NORTH : RULE }, disabled && styles.dimmed]}
    >
      <Animated.View style={[styles.knob, { transform: [{ translateX }] }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  statCell: { flex: 1, minWidth: 0, paddingHorizontal: GUTTER, paddingVertical: 16 },
  statDivider: { borderRightWidth: StyleSheet.hairlineWidth * 2, borderRightColor: RULE },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 6 },
  statValue: { flexShrink: 1, color: INK, fontFamily: SERIF, fontSize: 22, lineHeight: 26, letterSpacing: -0.4 },
  statUnit: { color: MUTED, fontFamily: SANS, fontSize: 13, fontWeight: '600' },

  track: { width: 42, height: 24, padding: 3, flex: 0 },
  knob: { width: 18, height: 18, backgroundColor: PAPER },
  dimmed: { opacity: 0.45 },
});

