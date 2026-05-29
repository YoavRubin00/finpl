import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { STITCH } from '../../../../constants/theme';
import { CountUpNumber } from './CountUpNumber';

interface MagnitudeTier {
  /** Tier applies when `value >= threshold`. Sort doesn't matter — the
   *  highest-threshold matching tier wins. */
  threshold: number;
  /** Override `accentColor` when this tier matches (e.g. shift to gold once
   *  the refund crosses a "meaningful" mark). */
  accentColor?: string;
  /** Override `sublabel` when this tier matches. Use for restrained,
   *  magnitude-aware copy (e.g. "זה שלך."). */
  sublabel?: string;
}

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
  /** Optional magnitude-aware tiers — the result's *size* quietly changes
   *  the accent / sublabel without any extra ornament. Highest matching
   *  threshold wins. Use for restrained, "the number is the story" copy. */
  magnitudeTiers?: readonly MagnitudeTier[];
  /** When the parent wraps StatHero in its own keyed Animated.View (e.g. the
   *  "Calculate Ceremony" pattern that bumps a key on commit to re-fire
   *  ZoomIn), pass `true` to suppress the built-in FadeInDown so the two
   *  entering animations don't compose into jitter. */
  disableEntering?: boolean;
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
  magnitudeTiers,
  disableEntering = false,
}: StatHeroProps): React.ReactElement {
  const entering = disableEntering ? undefined : FadeInDown.duration(360);
  const formatter = useCallback(
    (n: number): string =>
      formatValue ? formatValue(n) : `${currency}${Math.round(n).toLocaleString('he-IL')}`,
    [formatValue, currency],
  );
  const deltaDisplay =
    deltaValue !== undefined
      ? `${deltaValue >= 0 ? '+' : '−'}${currency}${Math.round(Math.abs(deltaValue)).toLocaleString('he-IL')}`
      : null;
  // Pick the highest-threshold tier the value satisfies. No tier → defaults
  // win. The "magnitude" lifts only the accent/sublabel — no extra ornament,
  // because the number itself is the celebration here.
  const matchedTier = magnitudeTiers
    ? [...magnitudeTiers]
        .sort((a, b) => b.threshold - a.threshold)
        .find((t) => value >= t.threshold)
    : undefined;
  const effectiveAccent = matchedTier?.accentColor ?? accentColor;
  const effectiveSublabel = matchedTier?.sublabel ?? sublabel;

  if (dark) {
    return (
      <Animated.View entering={entering}>
        <LinearGradient
          colors={[STITCH.premiumDarkBg, STITCH.premiumDarkSurface, STITCH.premiumDarkAccent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, styles.cardDark]}
        >
          {/* Top-left gilt glow */}
          <LinearGradient
            colors={['rgba(233,196,0,0.34)', 'rgba(233,196,0,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.goldHalo}
            pointerEvents="none"
          />
          {/* Bottom-right indigo wash for balanced depth */}
          <LinearGradient
            colors={['rgba(124,58,237,0.32)', 'rgba(124,58,237,0)']}
            start={{ x: 1, y: 1 }}
            end={{ x: 0, y: 0 }}
            style={styles.haloBottom}
            pointerEvents="none"
          />
          <View style={styles.content}>
            <Text style={[styles.label, styles.labelDark]}>{label}</Text>
            <View style={styles.numberRow}>
              <CountUpNumber value={value} format={formatter} durationMs={750} style={styles.numberDark} />
            </View>
            {effectiveSublabel ? (
              <Text style={[styles.sublabel, styles.sublabelDark]}>{effectiveSublabel}</Text>
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
          {/* Hairline gilt sweep at the bottom — gives the card a finished edge */}
          <LinearGradient
            colors={['rgba(233,196,0,0)', 'rgba(233,196,0,0.55)', 'rgba(233,196,0,0)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.bottomSweep}
            pointerEvents="none"
          />
        </LinearGradient>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={entering}
      style={[styles.card, styles.cardLight, { shadowColor: effectiveAccent, borderColor: effectiveAccent + '33' }]}
    >
      {/* Top-left accent halo (gradient) — replaces flat tinted disc */}
      <LinearGradient
        colors={[effectiveAccent + '2E', effectiveAccent + '00']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.halo}
        pointerEvents="none"
      />
      {/* Bottom-right echo halo — balances composition, fakes inner glow */}
      <LinearGradient
        colors={[effectiveAccent + '22', effectiveAccent + '00']}
        start={{ x: 1, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={styles.haloBottom}
        pointerEvents="none"
      />
      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.numberRow}>
          <CountUpNumber
            value={value}
            format={formatter}
            durationMs={750}
            style={[
              styles.number,
              {
                color: effectiveAccent,
                textShadowColor: effectiveAccent + '55',
              },
            ]}
          />
        </View>
        {effectiveSublabel ? <Text style={styles.sublabel}>{effectiveSublabel}</Text> : null}
        {deltaDisplay ? (
          <View
            style={[
              styles.deltaPill,
              {
                backgroundColor: effectiveAccent + '18',
                borderColor: effectiveAccent + '40',
                shadowColor: effectiveAccent,
              },
            ]}
          >
            <Text style={[styles.deltaValue, { color: effectiveAccent }]}>{deltaDisplay}</Text>
            {deltaLabel ? <Text style={styles.deltaLabel}>{deltaLabel}</Text> : null}
          </View>
        ) : null}
      </View>
      {/* Hairline accent sweep at the bottom edge */}
      <LinearGradient
        colors={[effectiveAccent + '00', effectiveAccent + 'AA', effectiveAccent + '00']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.bottomSweep}
        pointerEvents="none"
      />
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
    width: 170,
    height: 170,
    borderRadius: 170,
  },
  haloBottom: {
    position: 'absolute',
    bottom: -60,
    right: -50,
    width: 170,
    height: 170,
    borderRadius: 170,
  },
  goldHalo: {
    position: 'absolute',
    top: -40,
    left: -40,
    width: 180,
    height: 180,
    borderRadius: 180,
  },
  bottomSweep: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
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
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
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
    borderWidth: 1,
    marginTop: 10,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
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
