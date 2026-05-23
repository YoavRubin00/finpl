import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { STITCH } from '../../../constants/theme';
import { formatShekel } from '../../../utils/format';

interface NetWorthSummaryProps {
  totalValue: number;
  totalLiquid: number;
  monthlyDeposit: number;
  annualGrowth: number;
  yoyDeltaPct: number;
}

/**
 * Premium-dark hero card for the dashboard. Big net-worth number + 3 sub-tiles
 * (liquid, monthly deposit, projected annual growth). Visual mirrors
 * `StatHero dark` but specialized for 4-stat layout.
 */
export function NetWorthSummary({
  totalValue,
  totalLiquid,
  monthlyDeposit,
  annualGrowth,
  yoyDeltaPct,
}: NetWorthSummaryProps): React.ReactElement {
  const yoyPctText = (yoyDeltaPct * 100).toFixed(1);
  return (
    <Animated.View entering={FadeInDown.duration(360)}>
      <LinearGradient
        colors={[STITCH.premiumDarkBg, STITCH.premiumDarkSurface, STITCH.premiumDarkAccent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.goldHalo} pointerEvents="none" />

        <View style={styles.content}>
          <Text style={styles.label}>שווי נכסים כולל</Text>
          <Text style={styles.value}>{formatShekel(totalValue)}</Text>
          {annualGrowth > 0 ? (
            <View style={styles.deltaPill}>
              <Text style={styles.deltaText}>
                ↗ +{yoyPctText}% השנה הקרובה · +{formatShekel(annualGrowth)}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.tilesRow}>
          <Tile label="נזיל" value={formatShekel(totalLiquid)} />
          <Tile label="הפקדה / חודש" value={formatShekel(monthlyDeposit)} />
          <Tile
            label="צמיחה שנתית"
            value={formatShekel(annualGrowth)}
            sub={annualGrowth > 0 ? `+${yoyPctText}% / שנה` : undefined}
            highlight
          />
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

function Tile({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}): React.ReactElement {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={[styles.tileValue, highlight && styles.tileValueGold]}>{value}</Text>
      {sub ? <Text style={styles.tileSub}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 18,
    overflow: 'hidden',
    shadowColor: STITCH.premiumDarkBg,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 22,
    elevation: 10,
    gap: 14,
  },
  goldHalo: {
    position: 'absolute',
    top: -40,
    left: -40,
    width: 180,
    height: 180,
    borderRadius: 180,
    backgroundColor: 'rgba(233,196,0,0.16)',
  },
  content: { alignItems: 'flex-end' },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: STITCH.premiumDarkText,
    letterSpacing: 0.4,
    writingDirection: 'rtl',
  },
  value: {
    fontSize: 38,
    fontWeight: '900',
    color: STITCH.tertiaryGoldBright,
    letterSpacing: -0.8,
    marginTop: 2,
    writingDirection: 'rtl',
  },
  deltaPill: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(134,239,172,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(134,239,172,0.4)',
  },
  deltaText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#86efac',
    writingDirection: 'rtl',
  },
  tilesRow: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  tile: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'flex-end',
  },
  tileLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: STITCH.premiumDarkText,
    writingDirection: 'rtl',
  },
  tileValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 2,
    writingDirection: 'rtl',
  },
  tileValueGold: { color: STITCH.tertiaryGoldBright },
  tileSub: {
    fontSize: 10,
    fontWeight: '800',
    color: '#86efac',
    marginTop: 2,
    writingDirection: 'rtl',
  },
});
