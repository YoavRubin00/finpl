import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Compact horizontal hype meter — a 5-segment bar that lights up segments
 * from right (RTL leading edge) based on the 0-100 hype index. The
 * approach is intentionally not an arc/dial: it renders fast, scales
 * trivially across screen sizes, and reads instantly on small cards.
 *
 * Color bands match the prompt thresholds:
 *   0-20  שקט        →  slate
 *   21-40 רגיל        →  blue
 *   41-60 מעניין      →  amber
 *   61-80 הייפ        →  orange
 *   81-100 פיצוץ      →  red
 */

interface HypeGaugeProps {
  /** 0-100; values outside clamp without error. */
  value: number;
}

const SEGMENTS = 5;

interface Band {
  label: string;
  color: string;
  bg: string;
}

const BANDS: readonly Band[] = [
  { label: 'שקט', color: '#475569', bg: '#e2e8f0' },        // slate
  { label: 'רגיל', color: '#2563eb', bg: '#dbeafe' },        // blue
  { label: 'מעניין', color: '#d97706', bg: '#fef3c7' },     // amber
  { label: 'הייפ', color: '#ea580c', bg: '#ffedd5' },        // orange
  { label: 'פיצוץ 🔥', color: '#dc2626', bg: '#fee2e2' },    // red
];

function bandForValue(v: number): { band: Band; index: number } {
  if (v <= 20) return { band: BANDS[0], index: 0 };
  if (v <= 40) return { band: BANDS[1], index: 1 };
  if (v <= 60) return { band: BANDS[2], index: 2 };
  if (v <= 80) return { band: BANDS[3], index: 3 };
  return { band: BANDS[4], index: 4 };
}

export function HypeGauge({ value }: HypeGaugeProps): React.ReactElement {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const { band, index: activeIndex } = useMemo(() => bandForValue(clamped), [clamped]);

  // How many segments to light up — proportional to value, at least 1 lit.
  const litSegments = Math.max(1, Math.ceil((clamped / 100) * SEGMENTS));

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.value} allowFontScaling={false}>
          {clamped}
        </Text>
        <Text style={styles.label} allowFontScaling={false}>
          מדד הייפ
        </Text>
      </View>
      <View style={styles.barRow}>
        {Array.from({ length: SEGMENTS }, (_, i) => {
          const isLit = i < litSegments;
          return (
            <View
              key={i}
              style={[
                styles.segment,
                isLit ? { backgroundColor: band.color } : styles.segmentDim,
              ]}
            />
          );
        })}
      </View>
      <Text style={[styles.bandLabel, { color: band.color }]} allowFontScaling={false}>
        {band.label}
      </Text>
      {/* activeIndex consumed for future hover/glow if needed. Silence unused warning. */}
      {activeIndex < 0 ? null : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'flex-end',
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'baseline',
    gap: 6,
  },
  value: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    writingDirection: 'rtl',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    writingDirection: 'rtl',
  },
  barRow: {
    flexDirection: 'row-reverse',
    gap: 3,
  },
  segment: {
    width: 14,
    height: 6,
    borderRadius: 2,
  },
  segmentDim: {
    backgroundColor: '#e2e8f0',
  },
  bandLabel: {
    fontSize: 11,
    fontWeight: '800',
    writingDirection: 'rtl',
  },
});
