import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { STITCH } from '../../../../constants/theme';

interface MortgageBreakdownProps {
  principal: number;
  interest: number;
}

/**
 * Horizontal stacked bar showing principal vs interest over the loan
 * lifetime, with two metric tiles below. Surfaces the "how much of your
 * payment is actually the bank's profit" insight.
 */
export function MortgageBreakdown({
  principal,
  interest,
}: MortgageBreakdownProps): React.ReactElement {
  const total = principal + interest;
  const safePct = total > 0 ? (principal / total) * 100 : 0;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>סך התשלום על המשכנתא</Text>

      <View style={styles.totalRow}>
        <Text style={styles.totalNumber}>
          {Math.round(total).toLocaleString('he-IL')}
        </Text>
        <Text style={styles.totalCurrency}>₪</Text>
      </View>

      <View style={styles.bar}>
        <LinearGradient
          colors={['#005bb1', '#1e40af']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.barSegment, { flex: safePct }]}
        >
          <Text style={styles.barText}>קרן {Math.round(safePct)}%</Text>
        </LinearGradient>
        <LinearGradient
          colors={['#ea580c', '#c2410c']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.barSegment, { flex: 100 - safePct }]}
        >
          <Text style={styles.barText}>ריבית {Math.round(100 - safePct)}%</Text>
        </LinearGradient>
      </View>

      <View style={styles.tilesRow}>
        <View style={[styles.tile, { backgroundColor: '#005bb10c', borderColor: '#005bb125' }]}>
          <Text style={[styles.tileLabel, { color: '#005bb1' }]}>קרן</Text>
          <View style={styles.tileNumberRow}>
            <Text style={styles.tileNumber}>
              {Math.round(principal).toLocaleString('he-IL')}
            </Text>
            <Text style={[styles.tileCurrency, { color: '#005bb1' }]}>₪</Text>
          </View>
        </View>
        <View style={[styles.tile, { backgroundColor: '#ea580c0c', borderColor: '#ea580c25' }]}>
          <Text style={[styles.tileLabel, { color: '#ea580c' }]}>ריבית</Text>
          <View style={styles.tileNumberRow}>
            <Text style={styles.tileNumber}>
              {Math.round(interest).toLocaleString('he-IL')}
            </Text>
            <Text style={[styles.tileCurrency, { color: '#ea580c' }]}>₪</Text>
          </View>
        </View>
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
  title: {
    fontSize: 11,
    fontWeight: '900',
    color: STITCH.onSurfaceVariant,
    letterSpacing: 0.4,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row-reverse',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 6,
    marginBottom: 12,
  },
  totalNumber: {
    fontSize: 26,
    fontWeight: '900',
    color: STITCH.onSurface,
    letterSpacing: -0.5,
    writingDirection: 'rtl',
  },
  totalCurrency: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ea580c',
  },
  bar: {
    flexDirection: 'row-reverse',
    height: 28,
    borderRadius: 10,
    overflow: 'hidden',
  },
  barSegment: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  barText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ffffff',
    writingDirection: 'rtl',
  },
  tilesRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginTop: 10,
  },
  tile: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  tileLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  tileNumberRow: {
    flexDirection: 'row-reverse',
    alignItems: 'baseline',
    gap: 3,
    marginTop: 2,
  },
  tileNumber: {
    fontSize: 16,
    fontWeight: '900',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
  },
  tileCurrency: {
    fontSize: 11,
    fontWeight: '800',
  },
});
