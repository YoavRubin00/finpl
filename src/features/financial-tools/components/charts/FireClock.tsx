import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop, Line } from 'react-native-svg';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { STITCH } from '../../../../constants/theme';

interface FireClockProps {
  yearsLeft: number;
  targetAmount: number;
  currentAmount: number;
  fireAge: number;
}

/**
 * Dark gradient hero with a circular gold gauge showing progress toward
 * the FIRE target, big "years left" number in the center, and a
 * supporting tile of target + current.
 */
export function FireClock({
  yearsLeft,
  targetAmount,
  currentAmount,
  fireAge,
}: FireClockProps): React.ReactElement {
  const R = 64;
  const C = 90;
  const circumference = 2 * Math.PI * R;

  const pct = useMemo(() => {
    if (targetAmount <= 0) return 0;
    return Math.min(100, (currentAmount / targetAmount) * 100);
  }, [currentAmount, targetAmount]);
  const offset = circumference - (pct / 100) * circumference;

  const fmt = (n: number) => Math.round(n).toLocaleString('he-IL');

  return (
    <Animated.View entering={FadeInDown.duration(360)}>
      <LinearGradient
        colors={[STITCH.premiumDarkBg, STITCH.premiumDarkSurface, STITCH.premiumDarkAccent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.goldHalo} pointerEvents="none" />

        <View style={styles.row}>
          <View style={styles.gaugeWrap}>
            <Svg width={180} height={180} viewBox="0 0 180 180">
              <Defs>
                <SvgGradient id="fireG" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#f5c842" />
                  <Stop offset="1" stopColor={STITCH.tertiaryGold} />
                </SvgGradient>
              </Defs>
              <Circle
                cx={C}
                cy={C}
                r={R}
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={10}
              />
              <Circle
                cx={C}
                cy={C}
                r={R}
                fill="none"
                stroke="url(#fireG)"
                strokeWidth={10}
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform={`rotate(-90 ${C} ${C})`}
              />
              {[0, 25, 50, 75].map((p) => {
                const a = (p / 100) * 2 * Math.PI - Math.PI / 2;
                const x1 = C + (R - 8) * Math.cos(a);
                const y1 = C + (R - 8) * Math.sin(a);
                const x2 = C + (R + 8) * Math.cos(a);
                const y2 = C + (R + 8) * Math.sin(a);
                return (
                  <Line
                    key={p}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth={2}
                  />
                );
              })}
            </Svg>
            <View style={styles.gaugeCenter}>
              <Text style={styles.gaugeUnit}>עוד</Text>
              <Text style={styles.gaugeBig}>{Math.max(0, Math.round(yearsLeft))}</Text>
              <Text style={styles.gaugeSub}>שנים לחופש</Text>
            </View>
          </View>

          <View style={styles.meta}>
            <Text style={styles.metaTag}>FIRE · יעד</Text>
            <Text style={styles.metaTarget}>₪{fmt(targetAmount)}</Text>
            <Text style={styles.metaCaption}>
              תגיע לחופש פיננסי{'\n'}בגיל{' '}
              <Text style={styles.metaCaptionStrong}>{fireAge}</Text>
            </Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>
                {Math.round(pct)}% בדרך · ₪{fmt(currentAmount)} צבור
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 18,
    overflow: 'hidden',
    shadowColor: STITCH.premiumDarkBg,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 22,
    elevation: 10,
  },
  goldHalo: {
    position: 'absolute',
    top: -30,
    left: -30,
    width: 180,
    height: 180,
    borderRadius: 180,
    backgroundColor: 'rgba(233,196,0,0.18)',
  },
  row: {
    flexDirection: 'row-reverse',
    gap: 12,
    alignItems: 'center',
  },
  gaugeWrap: {
    width: 180,
    height: 180,
    position: 'relative',
  },
  gaugeCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeUnit: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
    writingDirection: 'rtl',
  },
  gaugeBig: {
    fontSize: 44,
    fontWeight: '900',
    color: STITCH.tertiaryGoldBright,
    letterSpacing: -1,
    lineHeight: 50,
    writingDirection: 'rtl',
  },
  gaugeSub: {
    fontSize: 11,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.9)',
    writingDirection: 'rtl',
  },
  meta: {
    flex: 1,
    alignItems: 'flex-end',
  },
  metaTag: {
    fontSize: 10,
    fontWeight: '800',
    color: STITCH.tertiaryGoldBright,
    letterSpacing: 0.4,
    writingDirection: 'rtl',
  },
  metaTarget: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 4,
    writingDirection: 'rtl',
  },
  metaCaption: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 8,
    lineHeight: 17,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  metaCaptionStrong: {
    color: STITCH.tertiaryGoldBright,
    fontWeight: '900',
  },
  statusPill: {
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(233,196,0,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(233,196,0,0.4)',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: STITCH.tertiaryGoldBright,
    writingDirection: 'rtl',
  },
});
