import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { errorHaptic, heavyHaptic, successHaptic, tapHaptic } from '../../../../utils/haptics';
import { ConfettiExplosion } from '../../../../components/ui/ConfettiExplosion';
import { FlyingRewards } from '../../../../components/ui/FlyingRewards';
import { FINN_EMPATHIC, FINN_HAPPY, FINN_STANDARD } from '../../../retention-loops/finnMascotConfig';
import { useDailyChallengesStore } from '../../../daily-challenges/use-daily-challenges-store';
import { useDailyLogStore } from '../../../daily-summary/useDailyLogStore';
import { CHALLENGE_COIN_REWARD, CHALLENGE_XP_REWARD, MAX_DAILY_PLAYS } from '../../../daily-challenges/daily-challenge-types';

import { NINJA_TARGETS, GAME_DURATION_MS, SPAWN_INTERVAL_MS_BASE, FALL_DURATION_MIN_MS_BASE, FALL_DURATION_MAX_MS_BASE, LEVEL_1_SPEED, LEVEL_2_SPEED, SCORE_TIER_EXCELLENT, SCORE_TIER_GOOD, SCORE_TIER_OK, pickRandomKind } from './ninjaData';
import type { FallingTarget, NinjaTargetKind } from './types';
import { FeedStartButton } from '../shared/FeedStartButton';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };
const RTL_CENTER = { writingDirection: 'rtl' as const, textAlign: 'center' as const };
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ARENA_WIDTH = SCREEN_WIDTH - 40;
const ARENA_HEIGHT = Math.max(420, Math.min(SCREEN_HEIGHT * 0.55, 600));
const TARGET_SIZE = 84;

interface Props {
  isActive: boolean;
}

type Phase = 'idle' | 'playing' | 'done';

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function FallingNinjaTarget({
  target,
  onTap,
  onExpire,
}: {
  target: FallingTarget;
  onTap: (id: string) => void;
  onExpire: (id: string, sliced: boolean) => void;
}) {
  const meta = NINJA_TARGETS[target.kind];
  const reduceMotion = useReducedMotion();
  const translateY = useSharedValue(-TARGET_SIZE);
  const rotate = useSharedValue(target.rotationStart);
  const opacity = useSharedValue(1);
  const slicedRef = useRef(false);

  const finishIfActive = useCallback(
    (sliced: boolean) => {
      if (slicedRef.current && !sliced) return;
      if (!slicedRef.current && sliced) return;
      onExpire(target.id, sliced);
    },
    [onExpire, target.id],
  );

  useEffect(() => {
    const dur = reduceMotion ? target.fallDurationMs / 2 : target.fallDurationMs;
    translateY.value = withTiming(
      ARENA_HEIGHT + TARGET_SIZE,
      { duration: dur, easing: Easing.linear },
      (finished) => {
        if (finished && !slicedRef.current) {
          runOnJS(finishIfActive)(false);
        }
      },
    );
    if (!reduceMotion) {
      rotate.value = withTiming(target.rotationEnd, { duration: dur, easing: Easing.linear });
    }
  }, [finishIfActive, reduceMotion, rotate, target.fallDurationMs, target.rotationEnd, translateY]);

  const handlePress = useCallback(() => {
    if (slicedRef.current) return;
    slicedRef.current = true;
    opacity.value = withTiming(0, { duration: 220 });
    translateY.value = withTiming(translateY.value + 40, { duration: 220 });
    onTap(target.id);
    // Notify expiry after burst completes
    withDelay(260, withTiming(0, { duration: 0 }));
    setTimeout(() => finishIfActive(true), 260);
  }, [finishIfActive, onTap, opacity, translateY, target.id]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.fallingWrap,
        { left: target.xPercent * (ARENA_WIDTH - TARGET_SIZE) },
        animStyle,
      ]}
      accessible={false}
    >
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`${meta.isGood ? 'אסוף' : 'הימנע מ'}: ${meta.label}`}
        hitSlop={8}
      >
        <View style={styles.targetCircle}>
          <LinearGradient
            colors={meta.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={[styles.targetLabel, RTL_CENTER, { color: meta.textColor }]} numberOfLines={2}>
            {meta.label}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 0 ? '#16a34a' : '#dc2626';
  return (
    <View style={[styles.scoreBadge, { borderColor: color }]} accessibilityLiveRegion="polite">
      <Text style={[styles.scoreBadgeText, { color }]}>ניקוד: {score}</Text>
    </View>
  );
}

function Countdown({ secondsLeft }: { secondsLeft: number }) {
  const isLow = secondsLeft <= 3;
  return (
    <View style={[styles.timerBadge, isLow && styles.timerBadgeLow]}>
      <Text style={[styles.timerText, isLow && { color: '#dc2626' }]}>⏱ {secondsLeft}s</Text>
    </View>
  );
}

function SharkResult({ score, kindsAllowed }: { score: number; kindsAllowed: boolean }) {
  const tier =
    score >= SCORE_TIER_EXCELLENT
      ? 'excellent'
      : score >= SCORE_TIER_GOOD
        ? 'good'
        : score >= SCORE_TIER_OK
          ? 'ok'
          : 'weak';
  const title =
    tier === 'excellent'
      ? 'מאסטר התקציב'
      : tier === 'good'
        ? 'עין חדה לכסף'
        : tier === 'ok'
          ? 'יש עוד מה ללטש'
          : 'הרעים תפסו אותך';
  const body =
    tier === 'excellent'
      ? 'אספת דיבידנדים וחתכת עמלות, ככה בונים תזרים שעובד בשבילך.'
      : tier === 'good'
        ? 'זיהית את רוב ההזדמנויות. התרגול הבא, להתרחק מהאדומים בלי לפספס אדום אחד.'
        : tier === 'ok'
          ? 'רעש פיננסי הסיח את הדעת. לפעמים לא ללחוץ זה ההחלטה הכי חכמה.'
          : 'הפיתויים האדומים עלו יותר מהריווחים. בתקציב אמיתי, הם שוחקים הרבה יותר מהר.';
  const image = tier === 'weak' ? FINN_EMPATHIC : FINN_HAPPY;

  if (!kindsAllowed) return null;

  return (
    <Animated.View
      entering={FadeInUp.duration(280)}
      style={styles.sharkBubble}
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${title}. ${body}`}
    >
      <View style={styles.sharkRow}>
        <View style={styles.sharkAvatarWrap}>
          <ExpoImage source={image} style={styles.sharkAvatar} contentFit="cover" accessible={false} />
        </View>
        <View style={styles.sharkTextCol}>
          <Text style={[styles.sharkTitle, RTL]}>{title}</Text>
          <Text style={[styles.sharkBody, RTL]} numberOfLines={4}>
            {body}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

export const BudgetNinjaCard = React.memo(function BudgetNinjaCard({ isActive: _isActive }: Props) {
  const playBudgetNinja = useDailyChallengesStore((s) => s.playBudgetNinja);
  const hasPlayedToday = useDailyChallengesStore((s) => s.hasBudgetNinjaPlayedToday());
  const playsToday = useDailyChallengesStore((s) => s.getBudgetNinjaPlaysToday());

  const [phase, setPhase] = useState<Phase>('idle');
  const [targets, setTargets] = useState<FallingTarget[]>([]);
  const [score, setScore] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(Math.round(GAME_DURATION_MS / 1000));
  const [showConfetti, setShowConfetti] = useState(false);
  const [showFlyingRewards, setShowFlyingRewards] = useState(false);
  const [currentLevel, setCurrentLevel] = useState<1 | 2>(1);

  const tickersRef = useRef<{ spawn: ReturnType<typeof setInterval> | null; count: ReturnType<typeof setInterval> | null; end: ReturnType<typeof setTimeout> | null; confetti: ReturnType<typeof setTimeout> | null }>({
    spawn: null,
    count: null,
    end: null,
    confetti: null,
  });
  const finalizedRef = useRef(false);
  const remainingPlays = Math.max(0, MAX_DAILY_PLAYS - playsToday);

  const clearAllTickers = useCallback(() => {
    const t = tickersRef.current;
    if (t.spawn) clearInterval(t.spawn);
    if (t.count) clearInterval(t.count);
    if (t.end) clearTimeout(t.end);
    if (t.confetti) clearTimeout(t.confetti);
    tickersRef.current = { spawn: null, count: null, end: null, confetti: null };
  }, []);

  useEffect(() => () => clearAllTickers(), [clearAllTickers]);

  const finalize = useCallback(
    (finalScore: number) => {
      if (finalizedRef.current) return;
      finalizedRef.current = true;
      const today = new Date().toISOString().slice(0, 10);
      playBudgetNinja(today, finalScore);

      const log = useDailyLogStore.getState();
      log.logEvent({
        type: 'budget-ninja',
        title: 'נינג׳ת התקציב',
        timestamp: Date.now(),
        xpEarned: finalScore > 0 ? CHALLENGE_XP_REWARD : 0,
      });
      if (finalScore > 0) {
        log.addTodayXP(CHALLENGE_XP_REWARD);
        log.addTodayCoins(CHALLENGE_COIN_REWARD);
        log.addCorrectAnswer();
      }

      if (finalScore >= SCORE_TIER_GOOD) {
        successHaptic();
        setShowConfetti(true);
        setShowFlyingRewards(true);
        tickersRef.current.confetti = setTimeout(() => setShowConfetti(false), 2400);
      }
    },
    [playBudgetNinja],
  );

  const startGame = useCallback((level: 1 | 2 = 1) => {
    if (phase === 'playing' || hasPlayedToday) return;
    tapHaptic();
    setCurrentLevel(level);
    setPhase('playing');
    setScore(0);
    setTargets([]);
    setSecondsLeft(Math.round(GAME_DURATION_MS / 1000));
    finalizedRef.current = false;

    const speed = level === 2 ? LEVEL_2_SPEED : LEVEL_1_SPEED;
    const spawnInterval = SPAWN_INTERVAL_MS_BASE / speed;
    const fallMin = FALL_DURATION_MIN_MS_BASE / speed;
    const fallMax = FALL_DURATION_MAX_MS_BASE / speed;

    tickersRef.current.spawn = setInterval(() => {
      const kind: NinjaTargetKind = pickRandomKind();
      const spawn: FallingTarget = {
        id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        kind,
        spawnedAt: Date.now(),
        xPercent: Math.random(),
        fallDurationMs: randRange(fallMin, fallMax),
        rotationStart: randRange(-8, 8),
        rotationEnd: randRange(-30, 30),
      };
      setTargets((prev) => [...prev, spawn]);
    }, spawnInterval);

    tickersRef.current.count = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);

    tickersRef.current.end = setTimeout(() => {
      if (tickersRef.current.spawn) clearInterval(tickersRef.current.spawn);
      if (tickersRef.current.count) clearInterval(tickersRef.current.count);
      setPhase('done');
      setTargets([]);
      setScore((s) => {
        finalize(s);
        return s;
      });
    }, GAME_DURATION_MS);
  }, [finalize, hasPlayedToday, phase]);

  const handleTap = useCallback((id: string) => {
    setTargets((prev) => {
      const target = prev.find((t) => t.id === id);
      if (!target) return prev;
      const meta = NINJA_TARGETS[target.kind];
      if (meta.isGood) heavyHaptic();
      else errorHaptic();
      setScore((s) => s + meta.scoreOnHit);
      return prev;
    });
  }, []);

  const handleExpire = useCallback((id: string, sliced: boolean) => {
    setTargets((prev) => {
      const target = prev.find((t) => t.id === id);
      if (!target) return prev.filter((t) => t.id !== id);
      if (!sliced) {
        const meta = NINJA_TARGETS[target.kind];
        setScore((s) => s + meta.scoreOnMiss);
      }
      return prev.filter((t) => t.id !== id);
    });
  }, []);

  if (hasPlayedToday && phase === 'idle') {
    return (
      <View style={styles.container}>
        <View style={styles.cardShell}>
          <ExpoImage source={FINN_STANDARD} style={styles.finLarge} contentFit="contain" accessible={false} />
          <Text style={[styles.doneTitle, RTL_CENTER]}>נינג׳ת התקציב, הושלם להיום</Text>
          <Text style={[styles.doneSub, RTL_CENTER]}>חזור מחר לזירה חדשה</Text>
        </View>
      </View>
    );
  }

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
            <Text style={[styles.headerTitle, RTL]}>נינג׳ת התקציב</Text>
            <Text style={[styles.headerSub, RTL]}>
              {phase === 'playing'
                ? 'אסוף טובים, הימנע מהאדומים'
                : phase === 'done'
                  ? `ניקוד סופי: ${score}`
                  : `${remainingPlays}/${MAX_DAILY_PLAYS} סבבים נותרו היום`}
            </Text>
          </View>
        </Animated.View>

        {phase === 'idle' && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.idleBlock}>
            <Text style={[styles.idleDesc, RTL_CENTER]}>
              12 שניות. לחץ על מטבעות וגרפים ירוקים, דלג על אינפלציה, מסים ועמלות.
            </Text>
            <FeedStartButton
              label="בואו נתחיל!"
              onPress={() => startGame(1)}
              accessibilityLabel="התחל נינג׳ת תקציב"
            />
            <Text style={[styles.startMeta, RTL_CENTER]}>
              12 שניות • {remainingPlays}/{MAX_DAILY_PLAYS} סבבים
            </Text>
          </Animated.View>
        )}

        {phase !== 'idle' && (
          <View style={styles.hudRow}>
            <ScoreBadge score={score} />
            {phase === 'playing' && <Countdown secondsLeft={secondsLeft} />}
          </View>
        )}

        {(phase === 'playing' || (phase === 'done' && targets.length > 0)) && (
          <View
            style={styles.arena}
            accessibilityRole="none"
            accessibilityLabel="זירת משחק. אובייקטים נופלים מלמעלה"
          >
            {targets.map((t) => (
              <FallingNinjaTarget key={t.id} target={t} onTap={handleTap} onExpire={handleExpire} />
            ))}
          </View>
        )}

        {phase === 'done' && <SharkResult score={score} kindsAllowed />}

        {phase === 'done' && score >= SCORE_TIER_GOOD && currentLevel === 1 && remainingPlays > 0 && (
          <Animated.View entering={FadeInUp.duration(300).delay(400)} style={styles.level2Block}>
            <Text style={[styles.level2Label, RTL_CENTER]}>מוכן לאתגר?</Text>
            <Pressable
              onPress={() => startGame(2)}
              accessibilityRole="button"
              accessibilityLabel="התחל רמה 2, מהירות כפולה"
              style={({ pressed }) => [styles.level2Button, pressed && { transform: [{ scale: 0.97 }] }]}
            >
              <LinearGradient
                colors={['#dc2626', '#991b1b']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.level2ButtonText}>רמה 2, מהירות גבוהה</Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  cardShell: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(14,165,233,0.25)',
    backgroundColor: '#f0f9ff',
    gap: 14,
    minHeight: SCREEN_HEIGHT * 0.72,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatar: {
    width: 72,
    height: 72,
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
  idleBlock: {
    gap: 20,
    alignItems: 'center',
    paddingVertical: 24,
    paddingTop: 40,
  },
  idleDesc: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  startMeta: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 4,
  },
  level2Block: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
  },
  level2Label: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748b',
  },
  level2Button: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
    shadowColor: '#991b1b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  level2ButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  hudRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  scoreBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: '#ffffff',
  },
  scoreBadgeText: {
    fontSize: 14,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  timerBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(14,165,233,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.2)',
  },
  timerBadgeLow: {
    backgroundColor: 'rgba(220,38,38,0.1)',
    borderColor: 'rgba(220,38,38,0.3)',
  },
  timerText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0369a1',
    fontVariant: ['tabular-nums'],
  },
  arena: {
    width: ARENA_WIDTH,
    height: ARENA_HEIGHT,
    alignSelf: 'center',
    backgroundColor: 'rgba(14,165,233,0.05)',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  fallingWrap: {
    position: 'absolute',
    top: 0,
    width: TARGET_SIZE,
    height: TARGET_SIZE,
  },
  targetCircle: {
    width: TARGET_SIZE,
    height: TARGET_SIZE,
    borderRadius: TARGET_SIZE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  targetLabel: {
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 4,
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
  sharkAvatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: '#e0f2fe',
    borderWidth: 1.5,
    borderColor: 'rgba(14,165,233,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sharkAvatar: {
    width: 74,
    height: 74,
  },
  sharkTextCol: {
    flex: 1,
    gap: 6,
  },
  sharkTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0369a1',
  },
  sharkBody: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
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
