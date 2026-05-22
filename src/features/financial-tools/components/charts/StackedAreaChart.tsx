import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Line, Circle } from 'react-native-svg';
import { STITCH } from '../../../../constants/theme';

interface StackedAreaChartProps {
  /** Year-indexed cumulative contributions (yearly snapshot). */
  contributions: readonly number[];
  /** Year-indexed cumulative interest (yearly snapshot). */
  interest: readonly number[];
  /** Accent for the total (top) area. */
  accentColor?: string;
  /** Base color for the contributions (bottom) area. */
  baseColor?: string;
  width?: number;
  height?: number;
}

/**
 * Two-layer stacked SVG area chart — bottom = contributions,
 * top = contributions + interest. Drawn in LTR coordinates with the
 * end-point on the right; the parent container is RTL so the legend
 * appears on the right naturally.
 */
export function StackedAreaChart({
  contributions,
  interest,
  accentColor = '#16a34a',
  baseColor = '#005bb1',
  width = 320,
  height = 160,
}: StackedAreaChartProps): React.ReactElement {
  const P = 24;
  const n = contributions.length;
  const last = n - 1;

  const total = useMemo(
    () => contributions.map((c, i) => c + (interest[i] ?? 0)),
    [contributions, interest],
  );

  const maxV = Math.max(...total, 1);

  const xs = (i: number) => P + (i / Math.max(1, last)) * (width - P * 2);
  const ys = (v: number) => height - P - (v / maxV) * (height - P * 2);

  const contPath = contributions
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xs(i)} ${ys(v)}`)
    .join(' ');
  const contArea = `${contPath} L ${xs(last)} ${height - P} L ${xs(0)} ${height - P} Z`;

  const totalPath = total
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xs(i)} ${ys(v)}`)
    .join(' ');
  const totalArea = `${totalPath} L ${xs(last)} ${height - P} L ${xs(0)} ${height - P} Z`;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: accentColor }]} />
            <Text style={styles.legendText}>רווח</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: baseColor }]} />
            <Text style={styles.legendText}>הפקדות</Text>
          </View>
        </View>
        <Text style={styles.title}>צמיחת התיק</Text>
      </View>

      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
      >
        <Defs>
          <LinearGradient id="totalG" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={accentColor} stopOpacity={0.55} />
            <Stop offset="1" stopColor={accentColor} stopOpacity={0.08} />
          </LinearGradient>
          <LinearGradient id="contG" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={baseColor} stopOpacity={0.55} />
            <Stop offset="1" stopColor={baseColor} stopOpacity={0.18} />
          </LinearGradient>
        </Defs>

        {[0.25, 0.5, 0.75].map((g) => (
          <Line
            key={g}
            x1={P}
            y1={P + (height - P * 2) * g}
            x2={width - P}
            y2={P + (height - P * 2) * g}
            stroke={STITCH.surfaceHighest}
            strokeDasharray="3 3"
          />
        ))}

        <Path d={totalArea} fill="url(#totalG)" />
        <Path d={totalPath} stroke={accentColor} strokeWidth={2.5} fill="none" strokeLinejoin="round" />
        <Path d={contArea} fill="url(#contG)" />
        <Path d={contPath} stroke={baseColor} strokeWidth={2} fill="none" strokeLinejoin="round" strokeDasharray="4 3" />
        <Circle cx={xs(last)} cy={ys(total[last] ?? 0)} r={5} fill="#ffffff" stroke={accentColor} strokeWidth={2.5} />
      </Svg>

      <View style={styles.axisRow}>
        <Text style={styles.axisText}>שנה {last}</Text>
        <Text style={styles.axisText}>היום</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: STITCH.surfaceLowest,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '900',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
  },
  legendRow: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '700',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
  },
  axisRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  axisText: {
    fontSize: 9,
    fontWeight: '700',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
  },
});
