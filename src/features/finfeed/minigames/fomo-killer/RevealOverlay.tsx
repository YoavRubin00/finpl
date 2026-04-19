import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Svg, { Polyline, Line, Rect, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import Animated, {
  FadeIn,
  FadeInUp,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { TrendingDown } from 'lucide-react-native';
import { FINN_EMPATHIC, FINN_HAPPY, FINN_STANDARD } from '../../../retention-loops/finnMascotConfig';
import { FOMO_TOKENS } from './theme';
import type { FomoSession } from './types';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };
const CENTER_RTL = { writingDirection: 'rtl' as const, textAlign: 'center' as const };
const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = Math.min(SCREEN_WIDTH - 64, 360);
const CHART_HEIGHT = 140;

interface Props {
  session: FomoSession;
  xpEarned: number;
  coinsEarned: number;
  perfect: boolean;
  onClose: () => void;
}

export function RevealOverlay({ session, xpEarned, coinsEarned, perfect, onClose }: Props) {
  const reduceMotion = useReducedMotion();

  const outcome = useMemo(() => computeOutcome(session, perfect), [session, perfect]);
  const [counter, setCounter] = useState(session.portfolio);

  useEffect(() => {
    const target = outcome.finalValue;
    const start = session.portfolio;
    const dur = reduceMotion ? 0 : 800;
    if (dur === 0) {
      setCounter(target);
      return;
    }
    const t0 = Date.now();
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - t0) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setCounter(Math.round(start + (target - start) * eased));
      if (t >= 1) clearInterval(id);
    }, 50);
    return () => clearInterval(id);
  }, [outcome.finalValue, session.portfolio, reduceMotion]);

  return (
    <Animated.View
      entering={FadeIn.duration(450)}
      style={styles.overlay}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.card}>
        <Text style={[styles.title, CENTER_RTL]} allowFontScaling={false}>
          המניה קרסה
        </Text>

        <CrashChart pumpPct={outcome.peakPct} crashPct={outcome.crashPct} reduceMotion={reduceMotion} />

        <View style={styles.deltaRow}>
          <TrendingDown size={18} color={FOMO_TOKENS.revealCrash} strokeWidth={3} />
          <Text style={[styles.deltaText, CENTER_RTL]} allowFontScaling={false}>
            {outcome.crashPct}%
          </Text>
        </View>

        <View style={styles.portfolioBar} accessible accessibilityLabel={`תיק ההשקעות: ${counter} שקלים מתוך ${session.invested} שהושקעו`}>
          <Text style={[styles.portfolioLabel, RTL]} allowFontScaling={false}>שווי תיק</Text>
          <Text style={[styles.portfolioValue, RTL]} allowFontScaling={false}>
            ₪{counter.toLocaleString('he-IL')}
            <Text style={styles.portfolioInvested}>  /  השקעת ₪{session.invested.toLocaleString('he-IL')}</Text>
          </Text>
        </View>

        <SharkCoach session={session} perfect={perfect} />

        <Animated.View
          entering={FadeInUp.duration(300).delay(2800)}
          style={styles.wisdomNote}
          accessibilityLiveRegion="polite"
        >
          <ExpoImage source={FINN_STANDARD} style={styles.wisdomAvatar} contentFit="cover" accessible={false} />
          <Text style={[styles.wisdomText, RTL]} allowFontScaling={false}>
            פעם לא היה מידע. היום יש יותר מדי מידע. זה גם טוב וגם רע.
          </Text>
        </Animated.View>

        <View style={styles.rewardsRow}>
          <View style={styles.rewardPill}>
            <Text style={styles.rewardPillText}>+{xpEarned} XP</Text>
          </View>
          {coinsEarned > 0 && (
            <View style={[styles.rewardPill, { backgroundColor: 'rgba(250,204,21,0.18)' }]}>
              <Text style={[styles.rewardPillText, { color: '#facc15' }]}>+{coinsEarned} 🪙</Text>
            </View>
          )}
        </View>

        <View style={styles.closeWrap}>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="סגור וחזור לפיד"
            hitSlop={10}
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.closeBtnText}>סגור</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

interface Outcome {
  peakPct: number;
  crashPct: number;
  finalValue: number;
}

function computeOutcome(session: FomoSession, _perfect: boolean): Outcome {
  // Peak +120%, then crash to 13% of peak (= -87% from peak).
  // Range aligns with documented meme-stock cycles: $GME -92%, $AMC -88%, $BBBY -75%.
  const peakPct = 120;
  const crashPct = -87;
  // Simplified model: capital rides up to peak (×2.2) and crashes to 13% of peak.
  // Capital added late ("add ₪500") suffers the same crash ratio here, the lesson is
  // that adding at the top meant riding down from a higher basis.
  const finalValue = Math.max(0, Math.round(session.invested * 2.2 * 0.13));
  return { peakPct, crashPct, finalValue };
}

function CrashChart({
  pumpPct,
  crashPct,
  reduceMotion,
}: {
  pumpPct: number;
  crashPct: number;
  reduceMotion: boolean;
}) {
  const dropProgress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      dropProgress.value = 1;
      return;
    }
    dropProgress.value = withDelay(
      1000,
      withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.cubic) }),
      ),
    );
  }, [dropProgress, reduceMotion]);

  const crashBarStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: reduceMotion ? 1 : dropProgress.value }],
  }));

  const points = useMemo(() => {
    // Builds a pump-then-crash polyline.
    const pts: Array<[number, number]> = [];
    const pumpSteps = 14;
    const crashSteps = 6;
    const baselineY = CHART_HEIGHT * 0.8;
    const peakY = CHART_HEIGHT * 0.18;
    const crashFloorY = CHART_HEIGHT * 0.94;
    const pumpEndX = CHART_WIDTH * 0.58;

    for (let i = 0; i <= pumpSteps; i++) {
      const t = i / pumpSteps;
      const x = t * pumpEndX;
      const y = baselineY - (baselineY - peakY) * Math.pow(t, 1.4);
      pts.push([x, y]);
    }
    for (let i = 1; i <= crashSteps; i++) {
      const t = i / crashSteps;
      const x = pumpEndX + (CHART_WIDTH - pumpEndX) * t;
      const y = peakY + (crashFloorY - peakY) * Math.pow(t, 0.7);
      pts.push([x, y]);
    }
    return pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  }, []);

  return (
    <View style={styles.chartWrap}>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        <Defs>
          <SvgLinearGradient id="chartBg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#0f2947" stopOpacity="0.6" />
            <Stop offset="1" stopColor="#020617" stopOpacity="0.9" />
          </SvgLinearGradient>
        </Defs>
        <Rect width={CHART_WIDTH} height={CHART_HEIGHT} fill="url(#chartBg)" rx={10} ry={10} />

        {/* Gridlines */}
        {[0.25, 0.5, 0.75].map((pct, i) => (
          <Line
            key={i}
            x1={0}
            y1={CHART_HEIGHT * pct}
            x2={CHART_WIDTH}
            y2={CHART_HEIGHT * pct}
            stroke="rgba(148,163,184,0.12)"
            strokeWidth={1}
            strokeDasharray="3 4"
          />
        ))}

        <Polyline
          points={points}
          fill="none"
          stroke={FOMO_TOKENS.revealPump}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </Svg>

      {/* Animated crash bar overlay, scales in on the right portion of the chart */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.crashBar,
          {
            left: CHART_WIDTH * 0.58,
            width: CHART_WIDTH * 0.42,
          },
          crashBarStyle,
        ]}
      />

      <View style={styles.chartLabels}>
        <View style={[styles.chartTag, { backgroundColor: 'rgba(34,197,94,0.18)' }]}>
          <Text style={[styles.chartTagText, { color: FOMO_TOKENS.revealPump }]} allowFontScaling={false}>
            הזרמה +{pumpPct}%
          </Text>
        </View>
        <View style={[styles.chartTag, { backgroundColor: 'rgba(220,38,38,0.22)' }]}>
          <Text style={[styles.chartTagText, { color: '#fca5a5' }]} allowFontScaling={false}>
            קריסה {crashPct}%
          </Text>
        </View>
      </View>
    </View>
  );
}

function SharkCoach({ session, perfect }: { session: FomoSession; perfect: boolean }) {
  const { title, body, image } = useMemo(() => {
    if (perfect) {
      return {
        image: FINN_HAPPY,
        title: '💎 חוסן יהלום',
        body: 'זיהית את הדפוס. רגולטורים בישראל ובעולם מעריכים שרוב קבוצות "הסיגנלים" בטלגרם מבוססות על שאיבה ושפיכה. אתה כבר יודע.',
      };
    }
    if (session.added === 0) {
      return {
        image: FINN_STANDARD,
        title: 'עברת את זה',
        body: 'התעלמת מרוב ההייפ. זה בדיוק הקו ההגנתי. בפעם הבאה נסה גם לדווח על ההודעות החשודות.',
      };
    }
    if (session.added === 1) {
      return {
        image: FINN_STANDARD,
        title: 'התפתית פעם אחת',
        body: 'זה מספיק כדי לאבד חלק משמעותי. בפעם הבאה: חשוד קודם, אז שאל.',
      };
    }
    return {
      image: FINN_EMPATHIC,
      title: 'שיחקת עם הכסף שלך',
      body: 'זה התסריט: לווייתן קונה ראשון, מפרסם בקבוצה, ומוכר כשהקטנים נכנסים. אתה היית האחרון.',
    };
  }, [session.added, perfect]);

  return (
    <Animated.View entering={FadeInUp.duration(280).delay(2400)} style={styles.sharkRow}>
      <View style={styles.sharkAvatar}>
        <ExpoImage source={image} style={{ width: 40, height: 40 }} contentFit="cover" accessible={false} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.sharkTitle, RTL]} allowFontScaling={false}>{title}</Text>
        <Text style={[styles.sharkBody, RTL]} allowFontScaling={false}>{body}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: FOMO_TOKENS.revealBg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#0a1729',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(125,211,252,0.15)',
    padding: 18,
    gap: 12,
  },
  title: {
    color: FOMO_TOKENS.revealText,
    fontSize: 22,
    fontWeight: '900',
  },
  chartWrap: {
    height: CHART_HEIGHT,
    alignSelf: 'center',
    width: CHART_WIDTH,
    position: 'relative',
  },
  crashBar: {
    position: 'absolute',
    top: 0,
    height: '100%',
    backgroundColor: 'rgba(220,38,38,0.12)',
    borderLeftWidth: 2,
    borderLeftColor: FOMO_TOKENS.revealCrash,
    borderRadius: 4,
  },
  chartLabels: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  chartTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  chartTagText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  deltaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  deltaText: {
    color: FOMO_TOKENS.revealCrash,
    fontSize: 24,
    fontWeight: '900',
  },
  portfolioBar: {
    backgroundColor: FOMO_TOKENS.hudBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: FOMO_TOKENS.hudBorder,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 2,
  },
  portfolioLabel: {
    fontSize: 11,
    color: FOMO_TOKENS.bubbleMeta,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  portfolioValue: {
    fontSize: 18,
    color: FOMO_TOKENS.hudValue,
    fontWeight: '900',
  },
  portfolioInvested: {
    fontSize: 12,
    color: FOMO_TOKENS.bubbleMeta,
    fontWeight: '700',
  },
  sharkRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: '#0f2947',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(125,211,252,0.15)',
    padding: 12,
  },
  sharkAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1e3a5f',
  },
  sharkTitle: {
    color: FOMO_TOKENS.revealText,
    fontSize: 14,
    fontWeight: '900',
  },
  sharkBody: {
    color: FOMO_TOKENS.bubbleText,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    marginTop: 2,
  },
  wisdomNote: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(125,211,252,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(125,211,252,0.28)',
    borderRightWidth: 4,
    borderRightColor: '#38bdf8',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  wisdomAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0f2947',
    flexShrink: 0,
  },
  wisdomText: {
    flex: 1,
    color: '#e0f2fe',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    includeFontPadding: false,
  },
  rewardsRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    justifyContent: 'center',
  },
  rewardPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(167,139,250,0.22)',
  },
  rewardPillText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#c4b5fd',
  },
  closeWrap: {
    width: '100%',
    alignItems: 'center',
    marginTop: 6,
  },
  closeBtn: {
    minWidth: 160,
    paddingHorizontal: 36,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#0ea5e9',
    borderBottomWidth: 3,
    borderBottomColor: '#0369a1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
});
