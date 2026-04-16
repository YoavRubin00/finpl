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
} from 'react-native-reanimated';

import { errorHaptic, heavyHaptic, successHaptic, tapHaptic } from '../../../../utils/haptics';
import { ConfettiExplosion } from '../../../../components/ui/ConfettiExplosion';
import { FlyingRewards } from '../../../../components/ui/FlyingRewards';
import { FINN_EMPATHIC, FINN_HAPPY, FINN_STANDARD } from '../../../retention-loops/finnMascotConfig';
import { useDailyChallengesStore } from '../../../daily-challenges/use-daily-challenges-store';
import { useDailyLogStore } from '../../../daily-summary/useDailyLogStore';
import { CHALLENGE_COIN_REWARD, CHALLENGE_XP_REWARD, MAX_DAILY_PLAYS } from '../../../daily-challenges/daily-challenge-types';

import { getRandomScenario } from './higherLowerData';
import type { HigherLowerScenario, ScenarioSide } from './types';
import { GlossaryTermPill } from '../shared/GlossaryTermPill';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };
const RTL_CENTER = { writingDirection: 'rtl' as const, textAlign: 'center' as const };
const SCREEN_WIDTH = Dimensions.get('window').width;
const REVEAL_TICKER_DURATION = 1800;

interface Props {
  isActive: boolean;
}

type Phase = 'question' | 'revealing' | 'done';

function formatNumber(n: number): string {
  if (n === 0) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return Math.round(n).toLocaleString('he-IL');
}

function AnimatedValueTicker({
  targetValue,
  label,
  color,
  durationMs,
  startDelay,
}: {
  targetValue: number;
  label: string;
  color: string;
  durationMs: number;
  startDelay: number;
}) {
  const [display, setDisplay] = useState<number>(0);

  useEffect(() => {
    if (targetValue === 0) {
      setDisplay(0);
      return;
    }
    let cancelled = false;
    const startTime = Date.now() + startDelay;
    let raf: ReturnType<typeof setTimeout> | null = null;
    const tick = () => {
      if (cancelled) return;
      const now = Date.now();
      if (now < startTime) {
        raf = setTimeout(tick, 32);
        return;
      }
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      if (!cancelled) setDisplay(Math.round(targetValue * eased));
      if (progress < 1 && !cancelled) {
        raf = setTimeout(tick, 32);
      }
    };
    tick();
    return () => {
      cancelled = true;
      if (raf) clearTimeout(raf);
    };
  }, [targetValue, durationMs, startDelay]);

  return (
    <Text style={[styles.tickerValue, { color }]} accessibilityLiveRegion="polite">
      {formatNumber(display)} {label}
    </Text>
  );
}

function SidePanel({
  side,
  position,
  onPress,
  selected,
  isCorrect,
  phase,
}: {
  side: ScenarioSide;
  position: 'left' | 'right';
  onPress: () => void;
  selected: boolean;
  isCorrect: boolean;
  phase: Phase;
}) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const dim = useSharedValue(1);
  const shouldDim = phase !== 'question' && !isCorrect;
  const shouldGlow = phase !== 'question' && isCorrect;

  useEffect(() => {
    if (reduceMotion) {
      scale.value = shouldGlow ? 1.05 : 1;
      dim.value = shouldDim ? 0.35 : 1;
      return;
    }
    if (shouldDim) {
      dim.value = withTiming(0.35, { duration: 400 });
    }
    if (shouldGlow) {
      scale.value = withSpring(1.05, { damping: 10, stiffness: 140 });
    }
  }, [reduceMotion, shouldDim, shouldGlow, scale, dim]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: dim.value,
  }));

  const borderColor = shouldGlow ? '#16a34a' : selected ? '#f59e0b' : 'rgba(255,255,255,0.15)';

  return (
    <Pressable
      onPress={onPress}
      disabled={phase !== 'question'}
      accessibilityRole="button"
      accessibilityLabel={`אפשרות ${position === 'left' ? 'ימין' : 'שמאל'}: ${side.title}. ${side.subtitle ?? ''}`}
      accessibilityState={{ disabled: phase !== 'question', selected }}
      style={({ pressed }) => [
        styles.sidePressable,
        { opacity: pressed && phase === 'question' ? 0.88 : 1 },
      ]}
    >
      <Animated.View style={[styles.sideCard, { borderColor }, animStyle]}>
        <LinearGradient
          colors={side.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.sideContent}>
          <Text
            style={[styles.sideTitle, RTL_CENTER, { color: side.textColor }]}
            numberOfLines={3}
          >
            {side.title}
          </Text>
          {side.subtitle && (
            <Text
              style={[styles.sideSubtitle, RTL_CENTER, { color: side.textColor, opacity: 0.85 }]}
              numberOfLines={2}
            >
              {side.subtitle}
            </Text>
          )}
          {phase !== 'question' && (
            <Animated.View
              entering={FadeIn.duration(400).delay(400)}
              style={styles.tickerBox}
            >
              <AnimatedValueTicker
                targetValue={side.finalValue}
                label={side.finalValueLabel}
                color={side.textColor}
                durationMs={REVEAL_TICKER_DURATION}
                startDelay={400}
              />
            </Animated.View>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

function CaptainSharkReveal({
  scenario,
  userCorrect,
}: {
  scenario: HigherLowerScenario;
  userCorrect: boolean;
}) {
  const source = userCorrect ? FINN_HAPPY : FINN_EMPATHIC;
  const title = userCorrect ? 'ניחוש חכם' : 'הפעם פספסת — אבל הנה הטוויסט';
  const headerColor = userCorrect ? '#16a34a' : '#dc2626';
  const a11yLabel = `${userCorrect ? 'צדקת.' : 'לא צדקת.'} ${scenario.explanation}`;

  return (
    <Animated.View
      entering={FadeInUp.duration(320).delay(REVEAL_TICKER_DURATION + 400)}
      style={styles.sharkBubble}
      accessibilityLiveRegion="polite"
      accessibilityLabel={a11yLabel}
    >
      <View style={styles.sharkRow}>
        <View style={styles.sharkAvatarWrap}>
          <ExpoImage source={source} style={styles.sharkAvatar} contentFit="cover" accessible={false} />
        </View>
        <View style={styles.sharkTextCol}>
          <Text style={[styles.sharkTitle, RTL, { color: headerColor }]}>{title}</Text>
          <Text style={[styles.sharkBody, RTL]} numberOfLines={6}>
            {scenario.explanation}
          </Text>
          <View style={styles.punchlineRow}>
            <View style={styles.punchlineBar} />
            <Text style={[styles.punchlineText, RTL]} numberOfLines={2}>
              {scenario.punchline}
            </Text>
          </View>
          {scenario.glossaryKeys && scenario.glossaryKeys.length > 0 && (
            <View style={styles.glossaryRow}>
              {scenario.glossaryKeys.map((k) => (
                <GlossaryTermPill key={k} glossaryKey={k} />
              ))}
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

export const HigherLowerCard = React.memo(function HigherLowerCard({ isActive: _isActive }: Props) {
  const playHigherLower = useDailyChallengesStore((s) => s.playHigherLower);
  const hasPlayedToday = useDailyChallengesStore((s) => s.hasHigherLowerPlayedToday());
  const playsToday = useDailyChallengesStore((s) => s.getHigherLowerPlaysToday());

  const [scenario] = useState<HigherLowerScenario>(() => {
    const today = new Date().toISOString().slice(0, 10);
    return getRandomScenario(today, playsToday);
  });
  const [phase, setPhase] = useState<Phase>('question');
  const [userChoice, setUserChoice] = useState<'left' | 'right' | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showFlyingRewards, setShowFlyingRewards] = useState(false);
  const finalizedRef = useRef(false);
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const remainingPlays = Math.max(0, MAX_DAILY_PLAYS - playsToday);

  useEffect(() => () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }, []);

  const finalize = useCallback(
    (wasCorrect: boolean) => {
      if (finalizedRef.current) return;
      finalizedRef.current = true;
      const today = new Date().toISOString().slice(0, 10);
      playHigherLower(today, wasCorrect);

      const log = useDailyLogStore.getState();
      log.logEvent({
        type: 'higher-lower',
        title: 'מי מנצח',
        timestamp: Date.now(),
        xpEarned: wasCorrect ? CHALLENGE_XP_REWARD : 0,
      });
      if (wasCorrect) {
        log.addTodayXP(CHALLENGE_XP_REWARD);
        log.addTodayCoins(CHALLENGE_COIN_REWARD);
        log.addCorrectAnswer();
      }
    },
    [playHigherLower],
  );

  const handleChoice = useCallback(
    (choice: 'left' | 'right') => {
      if (phase !== 'question') return;
      tapHaptic();
      setUserChoice(choice);
      setPhase('revealing');
      const wasCorrect = choice === scenario.correctSide;

      AccessibilityInfo.announceForAccessibility(
        wasCorrect ? 'ניחשת נכון. חושפים את המספרים.' : 'ניחוש שגוי. חושפים את המספרים.',
      );

      timersRef.current.push(setTimeout(() => {
        if (wasCorrect) heavyHaptic();
        else errorHaptic();
      }, 200));

      timersRef.current.push(setTimeout(() => {
        setPhase('done');
        finalize(wasCorrect);
        if (wasCorrect) {
          successHaptic();
          setShowConfetti(true);
          setShowFlyingRewards(true);
          timersRef.current.push(setTimeout(() => setShowConfetti(false), 2400));
        }
      }, REVEAL_TICKER_DURATION + 400));
    },
    [finalize, phase, scenario.correctSide],
  );

  if (hasPlayedToday && phase === 'question') {
    return (
      <View style={styles.container}>
        <View style={styles.cardShell}>
          <ExpoImage source={FINN_STANDARD} style={styles.finLarge} contentFit="contain" accessible={false} />
          <Text style={[styles.doneTitle, RTL_CENTER]}>מי מנצח — הושלם להיום</Text>
          <Text style={[styles.doneSub, RTL_CENTER]}>חזור מחר לתרחיש חדש</Text>
        </View>
      </View>
    );
  }

  const userCorrect = userChoice === scenario.correctSide;

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
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.headerRow}>
          <ExpoImage source={FINN_STANDARD} style={styles.headerAvatar} contentFit="contain" accessible={false} />
          <View style={styles.headerTextCol}>
            <Text style={[styles.headerTitle, RTL]}>מי מנצח</Text>
            <Text style={[styles.headerSub, RTL]}>
              {phase === 'question'
                ? `${remainingPlays}/${MAX_DAILY_PLAYS} סבבים נותרו היום`
                : `סבב ${playsToday + 1}/${MAX_DAILY_PLAYS} הושלם`}
            </Text>
          </View>
        </Animated.View>

        {/* Question */}
        <Text style={[styles.question, RTL_CENTER]}>{scenario.question}</Text>

        {/* Illustration (optional) */}
        {scenario.illustration && (
          <View style={styles.illustrationWrap} accessible={false}>
            <ExpoImage
              source={scenario.illustration}
              style={styles.illustration}
              contentFit="contain"
            />
          </View>
        )}

        {/* Options row */}
        <View style={styles.optionsRow}>
          <SidePanel
            side={scenario.leftSide}
            position="left"
            onPress={() => handleChoice('left')}
            selected={userChoice === 'left'}
            isCorrect={scenario.correctSide === 'left'}
            phase={phase}
          />
          <SidePanel
            side={scenario.rightSide}
            position="right"
            onPress={() => handleChoice('right')}
            selected={userChoice === 'right'}
            isCorrect={scenario.correctSide === 'right'}
            phase={phase}
          />
        </View>

        {/* Prompt or Captain Shark reveal */}
        {phase === 'question' && (
          <Text style={[styles.hint, RTL_CENTER]}>בחר/י בצד שתחזה/י שיניב יותר</Text>
        )}

        {phase === 'done' && (
          <CaptainSharkReveal scenario={scenario} userCorrect={userCorrect} />
        )}

        {phase === 'done' && userCorrect && (
          <Animated.View entering={FadeIn.duration(400).delay(REVEAL_TICKER_DURATION + 800)} style={styles.rewardsRow}>
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
  question: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 26,
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  illustrationWrap: {
    width: '100%',
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustration: {
    width: SCREEN_WIDTH - 72,
    height: 140,
  },
  optionsRow: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  sidePressable: {
    flex: 1,
  },
  sideCard: {
    borderRadius: 18,
    borderWidth: 2.5,
    overflow: 'hidden',
    minHeight: 180,
  },
  sideContent: {
    flex: 1,
    padding: 14,
    gap: 6,
    justifyContent: 'center',
  },
  sideTitle: {
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  sideSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  tickerBox: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 8,
    alignItems: 'center',
  },
  tickerValue: {
    fontSize: 18,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  hint: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
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
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#e0f2fe',
    borderWidth: 1.5,
    borderColor: 'rgba(14,165,233,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sharkAvatar: {
    width: 40,
    height: 40,
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
  punchlineRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  punchlineBar: {
    width: 3,
    height: 18,
    backgroundColor: '#d4a017',
    borderRadius: 2,
  },
  punchlineText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: '#0369a1',
  },
  glossaryRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(14,165,233,0.15)',
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

