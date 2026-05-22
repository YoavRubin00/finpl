import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { STITCH } from '../../../../constants/theme';

interface StatHeroProps {
  /** Big number shown in the hero card. */
  value: number;
  /** Optional override for the displayed string (e.g., '₪12,000'). */
  formatValue?: (v: number) => string;
  /** Currency suffix when `formatValue` is not provided. */
  currency?: string;
  /** Label above the number. */
  label: string;
  /** Optional delta value + label (e.g. "+520 הרווח החודשי"). */
  deltaValue?: number;
  deltaLabel?: string;
  /** Optional sub-line under the number. */
  sublabel?: string;
  /** Accent color used for the number (light variant). */
  accentColor?: string;
  /** When true, swap to the premium dark indigo gradient. */
  dark?: boolean;
}

/**
 * Stitch StatHero — large headline result card. Two variants:
 * - **Light** (default): white surface + accent-colored number.
 * - **Dark** (`dark`): indigo→navy gradient with gold radial decoration,
 *   reserved for advanced tools (Compound, FIRE).
 */
export function StatHero({
  value,
  formatValue,
  currency = '₪',
  label,
  deltaValue,
  deltaLabel,
  sublabel,
  accentColor = STITCH.tertiaryGoldBright,
  dark = false,
}: StatHeroProps): React.ReactElement {
  const display = formatValue
    ? formatValue(value)
    : `${currency}${Math.round(value).toLocaleString('he-IL')}`;
  const deltaDisplay =
    deltaValue !== undefined
      ? `${deltaValue >= 0 ? '+' : '−'}${currency}${Math.round(Math.abs(deltaValue)).toLocaleString('he-IL')}`
      : null;

  if (dark) {
    return (
      <Animated.View entering={FadeInDown.duration(360)}>
        <LinearGradient
          colors={[STITCH.premiumDarkBg, STITCH.premiumDarkSurface, STITCH.premiumDarkAccent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, styles.cardDark]}
        >
          <View style={styles.goldHalo} pointerEvents="none" />
          <View style={styles.content}>
            <Text style={[styles.label, styles.labelDark]}>{label}</Text>
            <View style={styles.numberRow}>
              <Text style={[styles.numberDark]}>{display}</Text>
            </View>
            {sublabel ? (
              <Text style={[styles.sublabel, styles.sublabelDark]}>{sublabel}</Text>
            ) : null}
            {deltaDisplay ? (
              <View style={styles.deltaPillDark}>
                <Text style={styles.deltaValueDark}>{deltaDisplay}</Text>
                {deltaLabel ? (
                  <Text style={styles.deltaLabelDark}>{deltaLabel}</Text>
                ) : null}
              </View>
            ) : null}
          </View>
        </LinearGradient>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={FadeInDown.duration(360)}
      style={[styles.card, styles.cardLight, { shadowColor: accentColor, borderColor: accentColor + '33' }]}
    >
      <View style={[styles.halo, { backgroundColor: accentColor + '18' }]} pointerEvents="none" />
      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.numberRow}>
          <Text style={[styles.number, { color: accentColor }]}>{display}</Text>
        </View>
        {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
        {deltaDisplay ? (
          <View style={[styles.deltaPill, { backgroundColor: accentColor + '18' }]}>
            <Text style={[styles.deltaValue, { color: accentColor }]}>{deltaDisplay}</Text>
            {deltaLabel ? <Text style={styles.deltaLabel}>{deltaLabel}</Text> : null}
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 22,
    position: 'relative',
    overflow: 'hidden',
  },
  cardLight: {
    backgroundColor: STITCH.surfaceLowest,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 6,
  },
  cardDark: {
    shadowColor: STITCH.premiumDarkBg,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 22,
    elevation: 10,
  },
  halo: {
    position: 'absolute',
    top: -50,
    left: -50,
    width: 160,
    height: 160,
    borderRadius: 160,
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
  content: {
    alignItems: 'flex-end',
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: STITCH.onSurfaceVariant,
    letterSpacing: 0.4,
    writingDirection: 'rtl',
    textAlign: 'right',
    marginBottom: 6,
  },
  labelDark: {
    color: STITCH.premiumDarkText,
  },
  numberRow: {
    flexDirection: 'row-reverse',
    alignItems: 'baseline',
  },
  number: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -1.2,
    lineHeight: 56,
    writingDirection: 'rtl',
  },
  numberDark: {
    fontSize: 48,
    fontWeight: '900',
    color: STITCH.tertiaryGoldBright,
    letterSpacing: -1.2,
    lineHeight: 56,
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
  sublabelDark: {
    color: STITCH.premiumDarkText,
  },
  deltaPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 10,
  },
  deltaPillDark: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(233,196,0,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(233,196,0,0.4)',
    marginTop: 10,
  },
  deltaValue: {
    fontSize: 13,
    fontWeight: '900',
    writingDirection: 'rtl',
  },
  deltaValueDark: {
    fontSize: 13,
    fontWeight: '900',
    color: STITCH.tertiaryGoldBright,
    writingDirection: 'rtl',
  },
  deltaLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
  },
  deltaLabelDark: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    writingDirection: 'rtl',
  },
});
