import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable, AccessibilityInfo } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  Extrapolation,
  interpolate,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { errorHaptic, heavyHaptic, successHaptic, tapHaptic } from '../../../../utils/haptics';
import { ConfettiExplosion } from '../../../../components/ui/ConfettiExplosion';
import { FlyingRewards } from '../../../../components/ui/FlyingRewards';
import { FINN_EMPATHIC, FINN_HAPPY, FINN_STANDARD } from '../../../retention-loops/finnMascotConfig';
import { useDailyChallengesStore } from '../../../daily-challenges/use-daily-challenges-store';
import { useDailyLogStore } from '../../../daily-summary/useDailyLogStore';
import { CHALLENGE_COIN_REWARD, CHALLENGE_XP_REWARD, MAX_DAILY_PLAYS } from '../../../daily-challenges/daily-challenge-types';

import { computeAccuracy, getRandomPriceItem } from './priceSliderData';
import type { PriceSliderItem } from './types';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };
const RTL_CENTER = { writingDirection: 'rtl' as const, textAlign: 'center' as const };
const SCREEN_WIDTH = Dimensions.get('window').width;
const SLIDER_WIDTH = SCREEN_WIDTH - 120;
const THUMB_SIZE = 44;
const TRACK_HEIGHT = 12;

interface Props {
  isActive: boolean;
}

type Phase = 'guessing' | 'revealing' | 'done';

function formatILS(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M ₪`;
  if (value >= 1_000) return `${Math.round(value).toLocaleString('he-IL')} ₪`;
  return `${value.toFixed(value < 10 ? 2 : 0)} ₪`;
}

function PriceSlider({
  item,
  guessValue,
  onChange,
  disabled,
}: {
  item: PriceSliderItem;
  guessValue: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  const percent = (guessValue - item.minGuess) / (item.maxGuess - item.minGuess);
  const translateX = useSharedValue(percent * SLIDER_WIDTH);
  const start = useSharedValue(0);

  useEffect(() => {
    if (disabled) return;
    translateX.value = percent * SLIDER_WIDTH;
  }, [disabled, percent, translateX]);

  const update = useCallback(
    (tx: number) => {
      const clamped = Math.max(0, Math.min(SLIDER_WIDTH, tx));
      const ratio = clamped / SLIDER_WIDTH;
      const v = item.minGuess + ratio * (item.maxGuess - item.minGuess);
      onChange(v);
    },
    [item.maxGuess, item.minGuess, onChange],
  );

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .onStart(() => {
      start.value = translateX.value;
    })
    .onUpdate((e) => {
      const tx = start.value + e.translationX;
      translateX.value = Math.max(0, Math.min(SLIDER_WIDTH, tx));
      runOnJS(update)(translateX.value);
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value - THUMB_SIZE / 2 }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: translateX.value,
  }));

  return (
    <View
      style={styles.sliderShell}
      accessibilityRole="adjustable"
      accessibilityLabel={`מחוון ניחוש. ערך נוכחי: ${formatILS(guessValue)}`}
      accessibilityValue={{ min: item.minGuess, max: item.maxGuess, now: guessValue }}
    >
      <View style={styles.track}>
        <Animated.View style={[styles.trackFill, fillStyle]} />
      </View>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.thumb, thumbStyle]}>
          <LinearGradient
            colors={['#d4a017', '#92400e']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </GestureDetector>
      <View style={styles.sliderBoundsRow}>
        <Text style={styles.sliderBoundText}>{formatILS(item.maxGuess)}</Text>
        <Text style={styles.sliderBoundText}>{formatILS(item.minGuess)}</Text>
      </View>
    </View>
  );
}

function ValueTicker({ target, color, delayMs }: { target: number; color: string; delayMs: number }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let raf: ReturnType<typeof setTimeout> | null = null;
    const startAt = Date.now() + delayMs;
    const dur = 1400;
    const tick = () => {
      if (cancelled) return;
      const now = Date.now();
      if (now < startAt) {
        raf = setTimeout(tick, 32);
        return;
      }
      const elapsed = now - startAt;
      const p = Math.min(1, elapsed / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      if (!cancelled) setValue(target * eased);
      if (p < 1 && !cancelled) raf = setTimeout(tick, 32);
    };
    tick();
    return () => {
      cancelled = true;
      if (raf) clearTimeout(raf);
    };
  }, [target, delayMs]);

  return (
    <Text style={[styles.revealValue, { color }]} accessibilityLiveRegion="polite">
      {formatILS(value)}
    </Text>
  );
}

export const PriceSliderCard = React.memo(function PriceSliderCard({ isActive: _isActive }: Props) {
  const playPriceSlider = useDailyChallengesStore((s) => s.playPriceSlider);
  const hasPlayedToday = useDailyChallengesStore((s) => s.hasPriceSliderPlayedToday());
  const playsToday = useDailyChallengesStore((s) => s.getPriceSliderPlaysToday());

  const [item] = useState<PriceSliderItem>(() => {
    const today = new Date().toISOString().slice(0, 10);
    return getRandomPriceItem(today, playsToday);
  });
  const [guess, setGuess] = useState<number>(() => (item.minGuess + item.maxGuess) / 2);
  const [phase, setPhase] = useState<Phase>('guessing');
  const [accuracy, setAccuracy] = useState<number>(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showFlyingRewards, setShowFlyingRewards] = useState(false);
  const reduceMotion = useReducedMotion();
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const finalizedRef = useRef(false);
  const remainingPlays = Math.max(0, MAX_DAILY_PLAYS - playsToday);

  useEffect(() => () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }, []);

  const sharkScale = useSharedValue(0.8);
  const sharkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sharkScale.value }],
  }));

  useEffect(() => {
    if (phase === 'done') {
      sharkScale.value = reduceMotion
        ? 1
        : withSpring(1, { damping: 8, stiffness: 120 });
    }
  }, [phase, reduceMotion, sharkScale]);

  const finalize = useCallback(
    (finalAccuracy: number) => {
      if (finalizedRef.current) return;
      finalizedRef.current = true;
      const today = new Date().toISOString().slice(0, 10);
      playPriceSlider(today, finalAccuracy);

      const log = useDailyLogStore.getState();
      log.logEvent({
        type: 'price-slider',
        title: 'תמחור המציאות',
        timestamp: Date.now(),
        xpEarned: CHALLENGE_XP_REWARD,
      });
      log.addTodayXP(CHALLENGE_XP_REWARD);
      if (finalAccuracy >= 60) {
        log.addTodayCoins(CHALLENGE_COIN_REWARD);
        log.addCorrectAnswer();
      }

      if (finalAccuracy >= 80) {
        successHaptic();
        setShowConfetti(true);
        setShowFlyingRewards(true);
        timersRef.current.push(setTimeout(() => setShowConfetti(false), 2400));
      }
    },
    [playPriceSlider],
  );

  const handleReveal = useCallback(() => {
    if (phase !== 'guessing') return;
    tapHaptic();
    const acc = computeAccuracy(guess, item.actualPriceILS);
    setAccuracy(acc);
    setPhase('revealing');

    AccessibilityInfo.announceForAccessibility(
      `חשיפת מחיר. דיוק הניחוש: ${acc} אחוז.`,
    );

    timersRef.current.push(setTimeout(() => {
      if (acc >= 80) heavyHaptic();
      else if (acc < 40) errorHaptic();
    }, 200));

    timersRef.current.push(setTimeout(() => {
      setPhase('done');
      finalize(acc);
    }, 1800));
  }, [finalize, guess, item.actualPriceILS, phase]);

  if (hasPlayedToday && phase === 'guessing') {
    return (
      <View style={styles.container}>
        <View style={styles.cardShell}>
          <ExpoImage source={FINN_STANDARD} style={styles.finLarge} contentFit="contain" accessible={false} />
          <Text style={[styles.doneTitle, RTL_CENTER]}>תמחור המציאות — הושלם להיום</Text>
          <Text style={[styles.doneSub, RTL_CENTER]}>חזור מחר למוצר חדש</Text>
        </View>
      </View>
    );
  }

  const tierColor = accuracy >= 80 ? '#16a34a' : accuracy >= 60 ? '#d4a017' : accuracy >= 40 ? '#ea580c' : '#dc2626';
  const tierLabel = accuracy >= 80 ? 'בול בול' : accuracy >= 60 ? 'קרוב מאוד' : accuracy >= 40 ? 'בערך' : 'רחוק מהמטרה';
  const sharkImage = accuracy >= 60 ? FINN_HAPPY : FINN_EMPATHIC;
  const diffRatio = item.currentPriceILS > 0 ? item.currentPriceILS / item.actualPriceILS : 0;

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiExplosion />}
      {showFlyingRewards && (
        <FlyingRewards
          type="coins"
          amount={CHALLENGE_COIN_REWARD}
          onComplete={() => setShowFlyingRewards(false)}
        />
      )}

      <View style={styles.cardShell}>
        <Animated.View entering={FadeInDown.duration(300)} style={styles.headerRow}>
          <ExpoImage source={FINN_STANDARD} style={styles.headerAvatar} contentFit="contain" accessible={false} />
          <View style={styles.headerTextCol}>
            <Text style={[styles.headerTitle, RTL]}>תמחור המציאות</Text>
            <Text style={[styles.headerSub, RTL]}>
              {phase === 'guessing'
                ? `${remainingPlays}/${MAX_DAILY_PLAYS} סבבים נותרו היום`
                : `דיוק: ${accuracy}%`}
            </Text>
          </View>
        </Animated.View>

        <View style={styles.questionBox}>
          <Text style={[styles.questionTitle, RTL_CENTER]}>
            כמה עלה {item.productName} בשנת {item.year}?
          </Text>
          <Text style={[styles.hint, RTL_CENTER]}>{item.hint}</Text>
        </View>

        {item.image && (
          <View style={styles.imageWrap} accessible={false}>
            <ExpoImage source={item.image} style={styles.productImage} contentFit="contain" />
          </View>
        )}

        <View style={styles.guessBox}>
          <Text style={[styles.guessLabel, RTL_CENTER]}>הניחוש שלך</Text>
          <Text style={[styles.guessValue, RTL_CENTER]}>{formatILS(guess)}</Text>
        </View>

        <PriceSlider
          item={item}
          guessValue={guess}
          onChange={setGuess}
          disabled={phase !== 'guessing'}
        />

        {phase === 'guessing' && (
          <Pressable
            onPress={handleReveal}
            accessibilityRole="button"
            accessibilityLabel="חשוף את המחיר האמיתי"
            style={({ pressed }) => [styles.revealButton, pressed && { opacity: 0.85 }]}
          >
            <LinearGradient
              colors={['#d4a017', '#92400e']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.revealButtonText}>חשוף את המחיר</Text>
          </Pressable>
        )}

        {phase !== 'guessing' && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.revealBox}>
            <View style={[styles.revealRow, { borderColor: '#16a34a' }]}>
              <Text style={[styles.revealRowLabel, RTL]}>מחיר אמיתי ב-{item.year}</Text>
              <ValueTicker target={item.actualPriceILS} color="#16a34a" delayMs={0} />
            </View>
            <View style={[styles.revealRow, { borderColor: '#0369a1' }]}>
              <Text style={[styles.revealRowLabel, RTL]}>מחיר היום (2025)</Text>
              <ValueTicker target={item.currentPriceILS} color="#0369a1" delayMs={900} />
            </View>
            {diffRatio > 0 && (
              <Animated.View entering={FadeIn.duration(400).delay(2000)} style={styles.inflationPill}>
                <Text style={[styles.inflationPillText, RTL]}>
                  פי {diffRatio.toFixed(1)} יותר יקר היום
                </Text>
              </Animated.View>
            )}
          </Animated.View>
        )}

        {phase === 'done' && (
          <Animated.View entering={FadeInUp.duration(320)} style={[styles.sharkBubble, sharkStyle]}>
            <View style={styles.sharkRow}>
              <ExpoImage source={sharkImage} style={styles.sharkAvatar} contentFit="contain" accessible={false} />
              <View style={styles.sharkTextCol}>
                <Text style={[styles.sharkTitle, RTL, { color: tierColor }]}>{tierLabel}</Text>
                <Text style={[styles.sharkBody, RTL]} numberOfLines={5}>
                  {item.sharkExplanation}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {phase === 'done' && accuracy >= 60 && (
          <Animated.View entering={FadeIn.duration(400).delay(2400)} style={styles.rewardsRow}>
            <View style={styles.rewardPill}>
              <Text style={styles.rewardPillText}>+{CHALLENGE_XP_REWARD} XP</Text>
            </View>
            <View style={[styles.rewardPill, { backgroundColor: 'rgba(250,204,21,0.15)' }]}>
              <Text style={[styles.rewardPillText, { color: '#d4a017' }]}>+{CHALLENGE_COIN_REWARD}</Text>
            </View>
          </Animated.View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cardShell: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(14,165,233,0.25)',
    backgroundColor: '#f0f9ff',
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 44,
    height: 44,
  },
  headerTextCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0369a1',
  },
  headerSub: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  questionBox: {
    gap: 6,
  },
  questionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
    lineHeight: 24,
  },
  hint: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  imageWrap: {
    alignItems: 'center',
    width: '100%',
  },
  productImage: {
    width: SCREEN_WIDTH - 92,
    height: 140,
  },
  guessBox: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  guessLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  guessValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0369a1',
    fontVariant: ['tabular-nums'],
  },
  sliderShell: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  track: {
    width: SLIDER_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: 'rgba(14,165,233,0.18)',
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    backgroundColor: '#d4a017',
  },
  thumb: {
    position: 'absolute',
    top: 4,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  sliderBoundsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: SLIDER_WIDTH,
  },
  sliderBoundText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  revealButton: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
  },
  revealButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  revealBox: {
    gap: 8,
    paddingVertical: 4,
  },
  revealRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: '#ffffff',
  },
  revealRowLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  revealValue: {
    fontSize: 18,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  inflationPill: {
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(220,38,38,0.12)',
  },
  inflationPillText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#dc2626',
  },
  sharkBubble: {
    marginTop: 4,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(14,165,233,0.25)',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  sharkRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    alignItems: 'flex-start',
  },
  sharkAvatar: {
    width: 52,
    height: 52,
  },
  sharkTextCol: {
    flex: 1,
    gap: 6,
  },
  sharkTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  sharkBody: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  rewardsRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    justifyContent: 'center',
    marginTop: 4,
  },
  rewardPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(167,139,250,0.18)',
  },
  rewardPillText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#7c3aed',
  },
  finLarge: {
    width: 96,
    height: 96,
    alignSelf: 'center',
  },
  doneTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0369a1',
  },
  doneSub: {
    fontSize: 14,
    color: '#64748b',
  },
});
