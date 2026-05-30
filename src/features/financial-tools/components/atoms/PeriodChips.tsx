import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { STITCH } from '../../../../constants/theme';
import { tapHaptic } from '../../../../utils/haptics';

interface PeriodChipsProps<T extends string | number> {
  label?: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  /** Suffix on each chip ("שנים", "%", etc.). */
  unit?: string;
  /** Accent color used on the active chip background. */
  accentColor?: string;
  /** Render each option's label custom (e.g. "3+" for 3). */
  renderLabel?: (v: T) => string;
}

/**
 * Segmented chip selector — sits inside a tinted pill background. RTL.
 * Use for ordinal/categorical choices (years, months, family status).
 */
export function PeriodChips<T extends string | number>({
  label,
  value,
  options,
  onChange,
  unit = '',
  accentColor = STITCH.tertiaryGoldBright,
  renderLabel,
}: PeriodChipsProps<T>): React.ReactElement {
  return (
    <View style={styles.card}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.segment}>
        {options.map((o) => {
          const selected = o === value;
          const txt = renderLabel ? renderLabel(o) : `${o}${unit}`;
          return (
            <Pressable
              key={String(o)}
              onPress={() => {
                tapHaptic();
                onChange(o);
              }}
              style={[
                styles.chip,
                selected && { backgroundColor: accentColor },
              ]}
              accessibilityRole="button"
              accessibilityLabel={txt}
              accessibilityState={{ selected }}
            >
              <Text
                style={[
                  styles.chipText,
                  selected && styles.chipTextActive,
                ]}
              >
                {txt}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: STITCH.surfaceLowest,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: STITCH.onSurfaceVariant,
    letterSpacing: 0.3,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  segment: {
    flexDirection: 'row-reverse',
    backgroundColor: STITCH.surfaceLow,
    borderRadius: 10,
    padding: 3,
    gap: 0,
    flexWrap: 'wrap',
  },
  chip: {
    flex: 1,
    minWidth: 44,
    minHeight: 36,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '900',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
  },
  chipTextActive: {
    color: '#ffffff',
  },
});
