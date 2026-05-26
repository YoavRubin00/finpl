import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { STITCH } from '../../../../constants/theme';
import { tapHaptic } from '../../../../utils/haptics';

interface PercentInputProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  /** Preset chips shown to the left of the value. */
  presets?: readonly number[];
  /** Decimal places to render. */
  decimals?: number;
  accentColor?: string;
}

/**
 * Stitch-style percent input — large number with `%` suffix and preset chips.
 * Used when the user can both type AND tap a common value.
 */
export function PercentInput({
  label,
  value,
  onChange,
  presets = [5, 7, 10],
  decimals = 1,
  accentColor = STITCH.tertiaryGoldBright,
}: PercentInputProps): React.ReactElement {
  return (
    <View style={styles.card}>
      <LinearGradient
        colors={[STITCH.surfaceLowest, accentColor + '0A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <View style={styles.valueWrap}>
          <Text style={styles.value}>{value.toFixed(decimals)}</Text>
          <Text style={[styles.suffix, { color: accentColor }]}>%</Text>
        </View>
        <View style={styles.segment}>
          {presets.map((p) => {
            const selected = Math.abs(p - value) < 0.001;
            return (
              <Pressable
                key={p}
                onPress={() => {
                  tapHaptic();
                  onChange(p);
                }}
                style={[
                  styles.chip,
                  selected && {
                    backgroundColor: accentColor,
                    shadowColor: accentColor,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${p} אחוז`}
                accessibilityState={{ selected }}
              >
                <Text
                  style={[
                    styles.chipText,
                    selected && styles.chipTextActive,
                  ]}
                >
                  {p}%
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <LinearGradient
        colors={[accentColor + '00', accentColor + '88', accentColor + '00']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.bottomSweep}
        pointerEvents="none"
      />
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
    overflow: 'hidden',
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: STITCH.onSurfaceVariant,
    letterSpacing: 0.3,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  valueWrap: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    fontSize: 26,
    fontWeight: '900',
    color: STITCH.onSurface,
    letterSpacing: -0.5,
  },
  suffix: {
    fontSize: 16,
    fontWeight: '800',
  },
  segment: {
    flexDirection: 'row-reverse',
    backgroundColor: STITCH.surfaceLow,
    borderRadius: 8,
    padding: 2,
    gap: 0,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 32,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 0,
  },
  bottomSweep: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '900',
    color: STITCH.onSurfaceVariant,
  },
  chipTextActive: {
    color: '#ffffff',
  },
});
