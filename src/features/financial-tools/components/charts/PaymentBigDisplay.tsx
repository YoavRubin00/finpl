import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { STITCH } from '../../../../constants/theme';

interface PaymentBigDisplayProps {
  amount: number;
  label: string;
  sublabel?: string;
  /** Accent — tints the gradient halo + currency mark. */
  accentColor?: string;
  /** Subtle background tint behind the card. */
  tintColor?: string;
}

/**
 * Tinted gradient card hosting a single big monthly payment number.
 * Used by the Mortgage tool as the primary result hero.
 */
export function PaymentBigDisplay({
  amount,
  label,
  sublabel,
  accentColor = '#fb923c',
  tintColor = '#fff7ed',
}: PaymentBigDisplayProps): React.ReactElement {
  return (
    <LinearGradient
      colors={['#ffffff', tintColor]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.card,
        {
          shadowColor: accentColor,
          borderColor: accentColor + '33',
        },
      ]}
    >
      <View
        style={[styles.halo, { backgroundColor: accentColor + '24' }]}
        pointerEvents="none"
      />
      <View style={styles.content}>
        <Text style={[styles.label, { color: accentColor }]}>{label}</Text>
        <View style={styles.numberRow}>
          <Text style={styles.number}>
            {Math.round(amount).toLocaleString('he-IL')}
          </Text>
          <Text style={[styles.currency, { color: accentColor }]}>₪</Text>
          <Text style={styles.suffix}>/חודש</Text>
        </View>
        {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 5,
    overflow: 'hidden',
  },
  halo: {
    position: 'absolute',
    top: -40,
    left: -40,
    width: 150,
    height: 150,
    borderRadius: 150,
  },
  content: {
    alignItems: 'flex-end',
  },
  label: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  numberRow: {
    flexDirection: 'row-reverse',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 4,
  },
  number: {
    fontSize: 42,
    fontWeight: '900',
    color: STITCH.onSurface,
    letterSpacing: -1.2,
    lineHeight: 50,
    writingDirection: 'rtl',
  },
  currency: {
    fontSize: 22,
    fontWeight: '800',
  },
  suffix: {
    fontSize: 13,
    fontWeight: '700',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
  },
  sublabel: {
    fontSize: 12,
    fontWeight: '700',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
    textAlign: 'right',
    marginTop: 4,
  },
});
