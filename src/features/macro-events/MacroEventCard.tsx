import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Image as ExpoImage } from "expo-image";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  interpolateColor,
} from 'react-native-reanimated';
import {
  TrendingUp, TrendingDown, Zap, Lightbulb, Crown,
} from 'lucide-react-native';
import LottieView from 'lottie-react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ConfettiExplosion } from '../../components/ui/ConfettiExplosion';
import { FlyingRewards } from '../../components/ui/FlyingRewards';
import { useEconomyStore } from '../economy/useEconomyStore';
import { useModifiersStore } from '../economy/useModifiersStore';
import { useMacroEventStore, MACRO_COOLDOWN_MS } from './useMacroEventStore';
import {
  MACRO_CATEGORY_ICONS,
  MACRO_CATEGORY_LABELS,
  type MacroEvent,
} from './types';
import {
  getFinnImage,
  type FinnAnimationState,
} from '../retention-loops/finnMascotConfig';
import { useSubscriptionStore } from '../subscription/useSubscriptionStore';
import { macroEventsData } from './macroEventsData';
import { tapHaptic, successHaptic, errorHaptic } from '../../utils/haptics';

export interface FeedMacroEventItem {
  id: string;
  type: 'macro-event';
  event: MacroEvent;
}

interface Props {
  item: FeedMacroEventItem;
  isActive: boolean;
  onAnswer?: () => void;
}

type AnswerState = 'idle' | 'correct' | 'wrong';

export const MacroEventCard = React.memo(function MacroEventCard({ item, isActive, onAnswer }: Props) {
  const [currentEvent, setCurrentEvent] = useState<MacroEvent>(item.event);
  const event = currentEvent;
  const seenIdsRef = useRef<Set<string>>(new Set([item.event.id]));
  const router = useRouter();

  const recordAnswer = useMacroEventStore((s) => s.recordAnswer);
  const currentStreak = useMacroEventStore((s) => s.currentStreak);
  const canAnswerMacro = useMacroEventStore((s) => s.canAnswerMacro);
  const resetSessionIfCooldownElapsed = useMacroEventStore((s) => s.resetSessionIfCooldownElapsed);
  const lastMacroSessionTime = useMacroEventStore((s) => s.lastMacroSessionTime);
  const isPro = useSubscriptionStore((s) => s.tier === 'pro' && s.status === 'active');

  useEffect(() => { resetSessionIfCooldownElapsed(); }, [isActive]);

  // Countdown timer for blocked state
  const [cooldownLeft, setCooldownLeft] = useState('');
  const isBlocked = !canAnswerMacro(isPro);

  useEffect(() => {
    if (!isBlocked) return;
    function tick() {
      const remaining = Math.max(0, MACRO_COOLDOWN_MS - (Date.now() - lastMacroSessionTime));
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      setCooldownLeft(`${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isBlocked, lastMacroSessionTime]);

  const [answerState, setAnswerState] = useState<AnswerState>('idle');

  // Premium lock
  const [isUnlockedPremium, setIsUnlockedPremium] = useState(false);
  const gems = useEconomyStore((s) => s.gems);
  const spendGems = useEconomyStore((s) => s.spendGems);
  const addModifier = useModifiersStore((s) => s.addModifier);
  const showPremiumLock = event.isPremium && !isUnlockedPremium && answerState === 'idle';

  const handleUnlockPremium = useCallback(() => {
    if (gems >= 2) {
      tapHaptic();
      spendGems(2);
      setIsUnlockedPremium(true);
      successHaptic();
    } else {
      errorHaptic();
      // Need 2 gems
    }
  }, [gems, spendGems]);
  const [chosenDirection, setChosenDirection] = useState<'up' | 'down' | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [streakBonusVisible, setStreakBonusVisible] = useState(false);
  const [finnState, setFinnState] = useState<FinnAnimationState>('idle');
  const [flyingXp, setFlyingXp] = useState(0);
  const [flyingCoins, setFlyingCoins] = useState(0);

  const scrollRef = useRef<ScrollView>(null);
  const finnSource = getFinnImage(finnState);
  const finnY = useSharedValue(0);
  const xpY = useSharedValue(0);
  const xpOpacity = useSharedValue(0);
  const upScale = useSharedValue(1);
  const downScale = useSharedValue(1);
  const upFill = useSharedValue(0);
  const downFill = useSharedValue(0);
  const flashOpacity = useSharedValue(0);

  const upScaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: upScale.value }] }));
  const downScaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: downScale.value }] }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));
  const finnAnimStyle = useAnimatedStyle(() => ({ transform: [{ translateY: finnY.value }] }));
  const xpPopStyle = useAnimatedStyle(() => ({
    opacity: xpOpacity.value,
    transform: [{ translateY: xpY.value }],
  }));

  const upBgStyle = useAnimatedStyle(() => {
    const isChosenUp = chosenDirection === 'up';
    if (!isChosenUp) {
      const shouldReveal = answerState !== 'idle' && event.direction === 'up';
      return {
        backgroundColor: shouldReveal ? '#dcfce7' : '#f0fdf4',
        borderColor: '#22c55e',
        borderWidth: shouldReveal ? 2.5 : 2,
        opacity: answerState !== 'idle' ? 0.65 : 1,
      };
    }
    const wasCorrect = answerState === 'correct';
    return {
      backgroundColor: interpolateColor(upFill.value, [0, 1], ['#f0fdf4', wasCorrect ? '#dcfce7' : '#ecfeff']),
      borderColor: wasCorrect ? '#22c55e' : '#0891b2',
      borderWidth: 2.5,
      opacity: 1,
    };
  });

  const downBgStyle = useAnimatedStyle(() => {
    const isChosenDown = chosenDirection === 'down';
    if (!isChosenDown) {
      const shouldReveal = answerState !== 'idle' && event.direction === 'down';
      return {
        backgroundColor: shouldReveal ? '#dcfce7' : '#f0f9ff',
        borderColor: shouldReveal ? '#22c55e' : '#0891b2',
        borderWidth: shouldReveal ? 2.5 : 2,
        opacity: answerState !== 'idle' ? 0.65 : 1,
      };
    }
    const wasCorrect = answerState === 'correct';
    return {
      backgroundColor: interpolateColor(downFill.value, [0, 1], ['#fef2f2', wasCorrect ? '#dcfce7' : '#ecfeff']),
      borderColor: wasCorrect ? '#22c55e' : '#0891b2',
      borderWidth: 2.5,
      opacity: 1,
    };
  });

  // finnSource is derived reactively from finnState above

  useEffect(() => {
    if (isActive && answerState === 'idle') setFinnState('idle');
  }, [isActive]);

  function handleGuess(direction: 'up' | 'down') {
    if (answerState !== 'idle' || isBlocked || showPremiumLock) return;
    tapHaptic();

    const correct = direction === event.direction;
    setChosenDirection(direction);
    setAnswerState(correct ? 'correct' : 'wrong');

    const targetScale = direction === 'up' ? upScale : downScale;
    targetScale.value = withSequence(
      withSpring(1.08, { damping: 5, stiffness: 300 }),
      withSpring(1, { damping: 12, stiffness: 150 }),
    );
    const targetFill = direction === 'up' ? upFill : downFill;
    targetFill.value = withTiming(1, { duration: 400 });

    if (correct) {
      if (event.isPremium) {
        addModifier('salary_boost', 0.25, 48);
      }
      flashOpacity.value = withSequence(
        withTiming(0.18, { duration: 80 }),
        withTiming(0.18, { duration: 300 }),
        withTiming(0, { duration: 500 }),
      );
      successHaptic();
      setFinnState('celebrate');
      finnY.value = withSequence(
        withSpring(-36, { damping: 5, stiffness: 200 }),
        withSpring(0, { damping: 12, stiffness: 120 }),
      );
      xpOpacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withDelay(1400, withTiming(0, { duration: 500 })),
      );
      xpY.value = withSequence(
        withSpring(-42, { damping: 8, stiffness: 160 }),
        withDelay(1400, withTiming(-70, { duration: 500 })),
      );
      setTimeout(() => setShowConfetti(true), 250);
      // Trigger flying rewards like learning modules
      setTimeout(() => { setFlyingXp(10); setFlyingCoins(5); }, 400);
      setTimeout(() => setFinnState('idle'), 1800);
    } else {
      errorHaptic();
      setFinnState('empathy');
      finnY.value = withSequence(
        withSpring(22, { damping: 5, stiffness: 150 }),
        withSpring(0, { damping: 14, stiffness: 100 }),
      );
      setTimeout(() => setFinnState('idle'), 1800);
    }

    onAnswer?.();
    const { streakBonus } = recordAnswer(event.id, correct);
    if (streakBonus) {
      setStreakBonusVisible(true);
      setTimeout(() => setStreakBonusVisible(false), 2500);
    }

    // Auto-scroll to reveal explanation and next button, multiple attempts for reliability
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 400);
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 800);
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 1500);
  }

  const handleNext = useCallback(() => {
    tapHaptic();
    // After advancing, session count was already incremented by recordAnswer.
    // canAnswerMacro is checked on next render, if blocked, the blocked UI shows.
    const unseen = macroEventsData.filter((e) => !seenIdsRef.current.has(e.id));
    const pool = unseen.length > 0 ? unseen : macroEventsData.filter((e) => e.id !== currentEvent.id);
    if (pool.length > 0) {
      const next = pool[Math.floor(Math.random() * pool.length)];
      seenIdsRef.current.add(next.id);
      setCurrentEvent(next);
      setAnswerState('idle');
      setChosenDirection(null);
      setShowConfetti(false);
      setStreakBonusVisible(false);
      setIsUnlockedPremium(false);
      upFill.value = 0;
      downFill.value = 0;
    }
  }, [currentEvent]);

  const isAnswered = answerState !== 'idle';
  const wasCorrect = answerState === 'correct';
  const categoryIcon = MACRO_CATEGORY_ICONS[event.category];
  const categoryLabel = MACRO_CATEGORY_LABELS[event.category];
  const difficultyStars = '★'.repeat(event.difficulty) + '☆'.repeat(3 - event.difficulty);

  return (
    <View style={styles.container}>
      {/* Flash */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(34,197,94,1)', zIndex: 5 }, flashStyle]}
        pointerEvents="none"
      />
      {showConfetti && (
        <View style={styles.confettiLayer}>
          <ConfettiExplosion onComplete={() => setShowConfetti(false)} />
        </View>
      )}
      {flyingXp > 0 && <FlyingRewards type="xp" amount={flyingXp} onComplete={() => setFlyingXp(0)} />}
      {flyingCoins > 0 && <FlyingRewards type="coins" amount={flyingCoins} onComplete={() => setFlyingCoins(0)} />}
      {streakBonusVisible && (
        <Animated.View style={styles.streakBanner}>
          <LottieView source={require("../../../assets/lottie/wired-flat-2804-fire-flame-hover-pinch.json")} style={{ width: 18, height: 18 }} autoPlay loop />
          <Text style={styles.streakBannerText}>רצף של 5! +15 מטבעות בונוס</Text>
        </Animated.View>
      )}

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
      <Animated.View>
        {/* Top row */}
        <View style={styles.topRow}>
          <Text style={styles.difficulty}>{difficultyStars}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{categoryIcon} {categoryLabel}</Text>
          </View>
          {event.isPremium && (
            <View style={[styles.categoryBadge, { borderColor: '#7dd3fc', backgroundColor: '#f0f9ff' }]}>
              <Text style={[styles.categoryText, { color: '#0369a1' }]}>💎 פרימיום</Text>
            </View>
          )}
        </View>

        <Text style={styles.year}>{event.year}</Text>
        <Text style={styles.headline}>{event.headline}</Text>
        {/* Hide context after answering to make room for explanation */}
        {!isAnswered && <Text style={styles.context}>{event.context}</Text>}

        {/* Premium Lock UI */}
        {showPremiumLock && (
          <Animated.View style={styles.premiumLockContainer}>
            <Text style={{ fontSize: 40, textAlign: 'center' }}>💎</Text>
            <Text style={styles.premiumLockTitle}>אירוע פרימיום חסוי!</Text>
            <Text style={styles.premiumLockDesc}>
              גלה מה קרה בשוק ופתח תרחיש בלעדי! פתיחה דורשת 2 יהלומים.
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.premiumUnlockBtn,
                gems < 2 && styles.premiumUnlockBtnDisabled,
                pressed && { opacity: 0.85 }
              ]}
              onPress={handleUnlockPremium}
            >
              <LinearGradient
                colors={gems >= 2 ? ['#0284c7', '#0ea5e9', '#0369a1'] : ['#f8fafc', '#f1f5f9', '#f8fafc']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.premiumUnlockGradient, gems < 2 && { borderWidth: 1, borderColor: '#e2e8f0' }]}
              >
                <Text style={[styles.premiumUnlockBtnText, gems < 2 && { color: '#64748b' }]}>
                  {gems >= 2 ? '2 יהלומים וגלה' : 'אין מספיק יהלומים'} 💎
                </Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}

        {/* Pre-answer: buttons */}
        {!isAnswered && !isBlocked && !showPremiumLock && (
          <>
            <View style={styles.questionRow}>
              <Zap size={14} color="#0891b2" fill="#0891b2" />
              <Text style={styles.questionText}>{event.question}</Text>
            </View>
            <View style={styles.buttonsRow}>
              <Animated.View style={[upScaleStyle, { flex: 1 }]}>
                <Animated.View style={[styles.btn, upBgStyle]}>
                  <Pressable style={styles.btnInner} onPress={() => handleGuess('up')}>
                    <TrendingUp size={22} color="#16a34a" />
                    <Text style={[styles.btnText, { color: '#16a34a' }]}>📈 עלה</Text>
                  </Pressable>
                </Animated.View>
              </Animated.View>
              <Animated.View style={[downScaleStyle, { flex: 1 }]}>
                <Animated.View style={[styles.btn, downBgStyle]}>
                  <Pressable style={styles.btnInner} onPress={() => handleGuess('down')}>
                    <TrendingDown size={22} color="#0891b2" />
                    <Text style={[styles.btnText, { color: '#0891b2' }]}>📉 ירד</Text>
                  </Pressable>
                </Animated.View>
              </Animated.View>
            </View>
          </>
        )}

        {/* Post-answer: compact button row */}
        {isAnswered && (
          <Animated.View style={styles.buttonsRow}>
            <View style={{ flex: 1, borderRadius: 16, borderWidth: 1.5, borderColor: event.direction === 'up' ? '#86efac' : '#e5e7eb', backgroundColor: event.direction === 'up' ? 'rgba(34,197,94,0.08)' : '#f9fafb', paddingVertical: 10, alignItems: 'center' }}>
              <Text style={[styles.btnText, { color: event.direction === 'up' ? '#16a34a' : '#64748b' }]}>
                {event.direction === 'up' ? '✅ 📈 עלה' : '📈 עלה'}
              </Text>
            </View>
            <View style={{ flex: 1, borderRadius: 16, borderWidth: 1.5, borderColor: event.direction === 'down' ? '#86efac' : '#e5e7eb', backgroundColor: event.direction === 'down' ? 'rgba(34,197,94,0.08)' : '#f9fafb', paddingVertical: 10, alignItems: 'center' }}>
              <Text style={[styles.btnText, { color: event.direction === 'down' ? '#16a34a' : '#64748b' }]}>
                {event.direction === 'down' ? '✅ 📉 ירד' : '📉 ירד'}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Pre-answer: Finn + speech bubble */}
        {!isAnswered && !isBlocked && !showPremiumLock && (
          <View style={styles.finnSection}>
            <View style={styles.finnAvatarRight}>
              <Animated.View style={finnAnimStyle}>
                <ExpoImage source={finnSource}
                  style={styles.finnLottieSmall}
                  contentFit="contain"
                 />
              </Animated.View>
            </View>
            <View style={styles.speechBubble}>
              <View style={styles.speechArrow} />
              <Text style={styles.speechBubbleQuestion}>מה דעתך? 🤔</Text>
            </View>
          </View>
        )}

        {/* Post-answer: Finn + explanation */}
        {isAnswered && (
          <View style={styles.finnSection}>
            <View style={styles.finnAvatarRight}>
              <Animated.View style={finnAnimStyle}>
                <ExpoImage source={finnSource}
                  style={styles.finnLottieSmall}
                  contentFit="contain"
                 />
              </Animated.View>

            </View>
            <Animated.View
              style={[styles.explanationCard, wasCorrect ? styles.speechBubbleCorrect : styles.speechBubbleWrong]}
            >
              <View style={styles.speechHeaderRow}>
                <Lightbulb size={13} color={wasCorrect ? '#0369a1' : '#0369a1'} />
                <Text style={[styles.speechTitle, { color: '#0369a1' }]}>
                  {wasCorrect ? 'למה זה קרה?' : 'הנה מה שקרה'}
                </Text>

              </View>
              <Text style={styles.speechBody}>{event.explanation}</Text>
              
              {event.isPremium && wasCorrect && (
                <View style={styles.premiumWonBanner}>
                  <Text style={{ color: '#0369a1', fontWeight: '800', textAlign: 'center', writingDirection: 'rtl' as const }}>
                    💎 כל הכבוד! פתחת תרחיש פרימיום וענית נכון!
                  </Text>
                </View>
              )}

              {event.lesson && (
                <>
                  <View style={styles.speechDivider} />
                  <Text style={[styles.speechBody, { color: '#0c4a6e', fontWeight: '600' }]}>
                    💡 הלקח: {event.lesson}
                  </Text>
                </>
              )}
            </Animated.View>
          </View>
        )}

        {/* Blocked state bubble */}
        {isBlocked && !isAnswered && (
          <View style={styles.finnSection}>
            <View style={[styles.speechBubble, styles.speechBubbleBlocked]}>
              <View style={[styles.speechArrow, { borderBottomColor: '#e0f2fe' }]} />
              <Text style={[styles.speechTitle, { color: '#0369a1' }]}>הגבלת אירועים ⏳</Text>
              <Text style={[styles.speechBody, { color: '#0c4a6e' }]}>חזור בעוד {cooldownLeft}</Text>
            </View>
          </View>
        )}

        {/* "לאירוע הבא" button, shown after answering */}
        {isAnswered && (
          <Animated.View>
            {currentStreak >= 3 && (
              <View style={styles.streakPill}>
                <LottieView source={require("../../../assets/lottie/wired-flat-2804-fire-flame-hover-pinch.json")} style={{ width: 16, height: 16 }} autoPlay loop />
                <Text style={styles.streakPillText}>{currentStreak} נכון ברציפות!</Text>
              </View>
            )}
            <Pressable
              style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.85 }]}
              onPress={handleNext}
            >
              <Text style={styles.nextBtnText}>‹ לאירוע הבא</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Blocked PRO upgrade */}
        {isBlocked && (
          <Animated.View style={styles.blockedFooter}>
            <Pressable
              style={({ pressed }) => [styles.proBtn, pressed && { opacity: 0.85 }]}
              onPress={() => { tapHaptic(); router.push('/pricing' as never); }}
            >
              <LinearGradient
                colors={['#0891b2', '#0284c7', '#0369a1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.proBtnGradient}
              >
                <Crown size={14} color="#facc15" />
                <Text style={styles.proBtnText}>שדרג לPRO, ללא הגבלה</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}

        <View style={{ height: 20 }} />
      </Animated.View>
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { paddingVertical: 20, backgroundColor: '#f8fafc' },
  confettiLayer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50 },
  streakBanner: {
    position: 'absolute', top: 60, alignSelf: 'center',
    backgroundColor: '#ecfeff', borderWidth: 1.5, borderColor: '#0891b2',
    borderRadius: 999, paddingHorizontal: 20, paddingVertical: 10,
    zIndex: 100, flexDirection: 'row', alignItems: 'center', gap: 6,
    shadowColor: '#0891b2', shadowOpacity: 0.2, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 6,
  },
  streakBannerText: { color: '#0e7490', fontWeight: '800', fontSize: 14 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 60 },
  topRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 6 },
  categoryBadge: {
    backgroundColor: '#ecfeff', borderWidth: 1, borderColor: '#a5f3fc',
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
  },
  categoryText: { color: '#0e7490', fontWeight: '700', fontSize: 11 },
  difficulty: { color: '#0891b2', fontSize: 11 },
  year: {
    fontSize: 42, fontWeight: '900', color: '#0891b2',
    textShadowColor: 'rgba(8,145,178,0.2)', textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8, alignSelf: 'flex-end', lineHeight: 48,
  },
  headline: {
    fontSize: 16, fontWeight: '800', color: '#111827',
    textAlign: 'right', writingDirection: 'rtl', lineHeight: 24, marginBottom: 4,
  },
  context: {
    fontSize: 13, color: '#6b7280',
    textAlign: 'right', writingDirection: 'rtl', lineHeight: 20, marginBottom: 10,
  },
  questionRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
    alignSelf: 'stretch', marginBottom: 8,
  },
  questionText: { flex: 1, fontSize: 14, fontWeight: '800', color: '#1f2937', writingDirection: 'rtl', textAlign: 'right' },
  buttonsRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  btn: {
    borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  btnInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, paddingHorizontal: 10,
  },
  btnText: { fontSize: 15, fontWeight: '900', writingDirection: 'rtl' },

  // Finn section
  finnSection: { marginVertical: 10 },
  finnAvatarRight: { alignItems: 'flex-end', paddingRight: 8, marginBottom: -4 },
  finnLottieSmall: { width: 112, height: 112 },
  xpPop: {
    position: 'absolute', top: 0, alignSelf: 'center',
    backgroundColor: '#ecfeff', borderWidth: 1.5, borderColor: '#0891b2',
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
    zIndex: 30, shadowColor: '#0891b2', shadowOpacity: 0.3,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 6,
  },
  xpPopText: { color: '#0e7490', fontWeight: '900', fontSize: 12 },

  // Speech bubble
  speechBubble: {
    backgroundColor: '#eff6ff', borderWidth: 1.5, borderColor: '#bfdbfe',
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, gap: 6,
  },
  explanationCard: {
    borderWidth: 1.5,
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, gap: 6,
    marginTop: 12,
  },
  speechBubbleCorrect: { backgroundColor: '#e0f2fe', borderColor: '#7dd3fc' },
  speechBubbleWrong: { backgroundColor: '#e0f2fe', borderColor: '#7dd3fc' },
  speechBubbleBlocked: { backgroundColor: '#e0f2fe', borderColor: '#7dd3fc' },
  speechArrow: {
    position: 'absolute', top: -7, right: 24, width: 0, height: 0,
    borderLeftWidth: 7, borderRightWidth: 7, borderBottomWidth: 7,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderBottomColor: '#eff6ff',
  },
  speechBubbleQuestion: {
    fontSize: 15, fontWeight: '800', color: '#1e40af',
    writingDirection: 'rtl', textAlign: 'right',
  },
  speechHeaderRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6, flexWrap: 'wrap',
  },
  speechTitle: { fontSize: 13, fontWeight: '900', writingDirection: 'rtl' },
  xpInline: {
    backgroundColor: '#ecfeff', borderRadius: 999, borderWidth: 1,
    borderColor: '#a5f3fc', paddingHorizontal: 8, paddingVertical: 2,
  },
  xpInlineText: { fontSize: 11, fontWeight: '800', color: '#0e7490' },
  speechBody: {
    fontSize: 13, color: '#374151',
    textAlign: 'right', writingDirection: 'rtl', lineHeight: 20,
  },
  speechDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.08)' },

  // Next / streak
  streakPill: {
    alignSelf: 'flex-end', backgroundColor: '#ecfeff', borderWidth: 1,
    borderColor: '#67e8f9', borderRadius: 999, paddingHorizontal: 14,
    paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 4,
    marginBottom: 8,
  },
  streakPillText: { color: '#0891b2', fontWeight: '700', fontSize: 13, writingDirection: 'rtl' },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#3b82f6', borderRadius: 18, paddingVertical: 16,
    borderBottomWidth: 4, borderBottomColor: '#1d4ed8',
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  nextBtnText: { fontSize: 18, fontWeight: '900', color: '#fff', writingDirection: 'rtl' },

  // Premium Lock
  premiumLockContainer: {
    backgroundColor: '#f0f9ff', borderWidth: 2, borderColor: '#7dd3fc',
    borderRadius: 20, padding: 20, alignItems: 'center', gap: 12,
    marginBottom: 20, shadowColor: '#0ea5e9', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5,
  },
  premiumLockTitle: {
    fontSize: 20, fontWeight: '900', color: '#0369a1', writingDirection: 'rtl',
  },
  premiumLockDesc: {
    fontSize: 14, color: '#0c4a6e', textAlign: 'center', writingDirection: 'rtl', lineHeight: 22,
  },
  premiumUnlockBtn: { 
    width: '100%', 
    borderRadius: 999, 
    overflow: 'hidden', 
    marginTop: 8,
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  premiumUnlockBtnDisabled: {
    shadowColor: '#cbd5e1',
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  premiumUnlockGradient: { paddingVertical: 14, alignItems: 'center', borderRadius: 999 },
  premiumUnlockBtnText: { fontSize: 16, fontWeight: '900', color: '#fff', writingDirection: 'rtl' },
  premiumWonBanner: {
    backgroundColor: '#e0f2fe', borderWidth: 1, borderColor: '#7dd3fc', borderRadius: 12, padding: 12, marginTop: 8,
  },

  // Blocked
  blockedFooter: { marginTop: 12, alignItems: 'center' },
  proBtn: {
    borderRadius: 999, overflow: 'hidden',
    shadowColor: '#0a2540', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  proBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999,
  },
  proBtnText: { fontSize: 13, fontWeight: '800', color: '#facc15', writingDirection: 'rtl' },
});
