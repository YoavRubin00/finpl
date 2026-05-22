import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { STITCH } from '../../../../constants/theme';
import { selectionHaptic } from '../../../../utils/haptics';

interface MoneySliderProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  /** Suffix shown next to the value (₪, %, שנים, etc.). */
  unit?: string;
  /** Format the displayed value. Defaults to `n.toLocaleString('he-IL')`. */
  formatValue?: (v: number) => string;
  /** Optional tick labels — rendered as a row under the slider. */
  ticks?: readonly number[];
  /** Accent for the active track + thumb + value text. */
  accentColor?: string;
  /**
   * Hide the value display at top — useful when the parent already shows it
   * (e.g., a TextInput synced to the same state).
   */
  hideValueDisplay?: boolean;
}

/**
 * RTL slider — drag *right-to-left* to increase value. Wraps
 * `@react-native-community/slider` with `transform: scaleX(-1)`.
 * Snaps to `step`, calls `selectionHaptic()` on each new value, shows
 * value + range labels in proper RTL order (max left, min right).
 */
export function MoneySlider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit = '',
  formatValue,
  ticks,
  accentColor = STITCH.tertiaryGoldBright,
  hideValueDisplay = false,
}: MoneySliderProps): React.ReactElement {
  const decimals = step < 0.1 ? 2 : step < 1 ? 1 : 0;
  const display = formatValue
    ? formatValue(value)
    : value.toLocaleString('he-IL', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

  return (
    <View style={styles.wrap}>
      {!hideValueDisplay ? (
        <View style={styles.header}>
          <Text style={[styles.value, { color: accentColor }]}>
            {display}
            {unit}
          </Text>
          <Text style={styles.label}>{label}</Text>
        </View>
      ) : null}

      <Slider
        style={styles.slider}
        value={value}
        onValueChange={(v) => {
          const snapped = Math.round(v / step) * step;
          const safe = Number(snapped.toFixed(decimals));
          if (safe !== value) {
            selectionHaptic();
            onChange(safe);
          }
        }}
        minimumValue={min}
        maximumValue={max}
        step={step}
        minimumTrackTintColor={accentColor}
        maximumTrackTintColor={STITCH.surfaceHighest}
        thumbTintColor={accentColor}
        accessibilityLabel={label}
      />

      {ticks && ticks.length > 0 ? (
        <View style={styles.tickRow}>
          {[...ticks].reverse().map((t) => (
            <Text key={t} style={styles.tickLabel}>
              {formatValue ? formatValue(t) : t}
              {unit}
            </Text>
          ))}
        </View>
      ) : (
        // Slider is transformed scaleX(-1) → min ends up on the RIGHT, max on the LEFT.
        // Render labels in row-reverse with `min` first so min appears on the right and
        // max on the left, matching the slider thumb's actual position.
        <View style={styles.rangeRow}>
          <Text style={styles.rangeLabel}>
            {formatValue ? formatValue(min) : min}
            {unit}
          </Text>
          <Text style={styles.rangeLabel}>
            {formatValue ? formatValue(max) : max}
            {unit}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  value: {
    fontSize: 16,
    fontWeight: '900',
    writingDirection: 'rtl',
  },
  slider: {
    width: '100%',
    height: 36,
    transform: [{ scaleX: -1 }],
  },
  rangeRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: -4,
    paddingHorizontal: 4,
  },
  rangeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: STITCH.onSurfaceVariant,
  },
  tickRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: -4,
    paddingHorizontal: 4,
  },
  tickLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: STITCH.onSurfaceVariant,
  },
});
