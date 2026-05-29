import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import Slider from '@react-native-community/slider';
import { STITCH } from '../../../../constants/theme';
import { mediumHaptic, selectionHaptic } from '../../../../utils/haptics';

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
  /** Round thresholds that, when crossed in either direction, swap the soft
   *  selection-tick haptic for a stronger medium one + briefly pulse the value
   *  text. Makes the slider feel like a journey instead of a metronome. */
  milestones?: readonly number[];
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
  milestones,
}: MoneySliderProps): React.ReactElement {
  const decimals = step < 0.1 ? 2 : step < 1 ? 1 : 0;
  const display = formatValue
    ? formatValue(value)
    : value.toLocaleString('he-IL', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

  // Grab feedback: soft accent halo + 2% scale on the slider row while the
  // user is actively dragging. Released on sliding-complete.
  const grabbed = useSharedValue(0);
  // Milestone pulse: brief value-text scale-up when the user crosses a
  // configured round threshold.
  const milestonePulse = useSharedValue(0);

  const grabRowStyle = useAnimatedStyle(() => ({
    shadowColor: accentColor,
    shadowOpacity: grabbed.value * 0.45,
    shadowRadius: 6 + grabbed.value * 8,
    shadowOffset: { width: 0, height: 0 },
    transform: [{ scale: 1 + grabbed.value * 0.02 }],
  }));
  const milestoneValueStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + milestonePulse.value * 0.08 }],
  }));

  return (
    <View style={styles.wrap}>
      {!hideValueDisplay ? (
        <View style={styles.header}>
          <Animated.Text style={[styles.value, { color: accentColor }, milestoneValueStyle]}>
            {display}
            {unit}
          </Animated.Text>
          <Text style={styles.label}>{label}</Text>
        </View>
      ) : null}

      <Animated.View style={grabRowStyle}>
        <Slider
          style={styles.slider}
          value={value}
          onValueChange={(v) => {
            const snapped = Math.round(v / step) * step;
            const safe = Number(snapped.toFixed(decimals));
            if (safe === value) return;
            const crossedMilestone = milestones?.some(
              (m) => (value < m && safe >= m) || (value > m && safe <= m),
            );
            if (crossedMilestone) {
              mediumHaptic();
              milestonePulse.value = withSequence(
                withTiming(1, { duration: 90 }),
                withTiming(0, { duration: 240 }),
              );
            } else {
              selectionHaptic();
            }
            onChange(safe);
          }}
          onSlidingStart={() => {
            grabbed.value = withTiming(1, { duration: 140 });
          }}
          onSlidingComplete={() => {
            grabbed.value = withSpring(0, { damping: 16, stiffness: 200 });
          }}
          minimumValue={min}
          maximumValue={max}
          step={step}
          minimumTrackTintColor={accentColor}
          maximumTrackTintColor={STITCH.surfaceHighest}
          thumbTintColor={accentColor}
          accessibilityLabel={label}
        />
      </Animated.View>

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
