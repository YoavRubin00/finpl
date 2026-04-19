import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolate,
  runOnJS,
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SimLottieBackground } from '../../../components/ui/SimLottieBackground';
import { LottieIcon } from '../../../components/ui/LottieIcon';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { ConfettiExplosion } from '../../../components/ui/ConfettiExplosion';
import { SimFeedbackBar } from '../../../components/ui/SimFeedbackBar';
import {
  tapHaptic,
  successHaptic,
  errorHaptic,
  heavyHaptic,
} from '../../../utils/haptics';
import { getChapterTheme } from '../../../constants/theme';
import { useInsuranceShield } from './useInsuranceShield';
import { SIM2, GRADE_COLORS2, GRADE_HEBREW, SHADOW_STRONG, SHADOW_LIGHT, RTL, TYPE2, sim2Styles } from './simTheme';
import { useTimeoutCleanup } from '../../../hooks/useTimeoutCleanup';
import type {
  InsuranceType,
  LifeEvent,
  EventSeverity,
  InsuranceShieldScore,
  InsuranceShieldGrade,
} from './insuranceShieldTypes';

const { width: SCREEN_W } = Dimensions.get('window');
const SWIPE_THRESHOLD = 100;
const SWIPE_OUT_X = SCREEN_W * 1.5;


/* ── Chapter-2 theme (keep only for gradient) ── */
const _th2 = getChapterTheme('chapter-2');

/* ── Lottie assets ── */
const LOTTIE_SHIELD = require('../../../../assets/lottie/wired-flat-457-shield-security-hover-pinch.json');
const LOTTIE_MONEY_BAG = require('../../../../assets/lottie/wired-flat-413-money-bag-hover-shake.json');
const LOTTIE_CROSS = require('../../../../assets/lottie/wired-flat-25-error-cross-hover-pinch.json');
const LOTTIE_CHECK = require('../../../../assets/lottie/wired-flat-24-approved-checked-hover-pinch.json');
const LOTTIE_BULB = require('../../../../assets/lottie/wired-flat-36-bulb-hover-blink.json');
const LOTTIE_REPLAY = require('../../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json');
const LOTTIE_BELL = require('../../../../assets/lottie/wired-flat-193-bell-notification-hover-ring.json');
const LOTTIE_ARROW = require('../../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');

const SEVERITY_CFG: Record<
  EventSeverity,
  { bg: string; border: string; text: string; label: string }
> = {
  minor: {
    bg: 'rgba(56,189,248,0.12)',
    border: 'rgba(56,189,248,0.3)',
    text: '#38bdf8',
    label: 'קל',
  },
  major: {
    bg: 'rgba(250,204,21,0.12)',
    border: 'rgba(250,204,21,0.3)',
    text: '#facc15',
    label: 'משמעותי',
  },
  catastrophic: {
    bg: 'rgba(239,68,68,0.15)',
    border: 'rgba(239,68,68,0.35)',
    text: '#ef4444',
    label: 'קטסטרופלי',
  },
};

/* ------------------------------------------------------------------ */
/*  SwipeInsuranceCard, Tinder style card for shopping phase           */
/* ------------------------------------------------------------------ */

function SwipeInsuranceCard({
  insurance,
  onSwipe,
}: {
  insurance: InsuranceType;
  onSwipe: (dir: 'left' | 'right') => void;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const fireSwipe = useCallback(
    (direction: 'left' | 'right') => {
      onSwipe(direction);
    },
    [onSwipe],
  );

  const gesture = Gesture.Pan()
    .runOnJS(true)
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.3;
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > SWIPE_THRESHOLD) {
        const dir = e.translationX > 0 ? 'right' : 'left';
        translateX.value = withTiming(dir === 'right' ? SWIPE_OUT_X : -SWIPE_OUT_X, { duration: 250 });
        runOnJS(fireSwipe)(dir);
      } else {
        translateX.value = withSpring(0, { damping: 15, stiffness: 200 });
        translateY.value = withSpring(0, { damping: 15, stiffness: 200 });
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(translateX.value, [-SCREEN_W, SCREEN_W], [-15, 15]);
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const takeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], 'clamp'),
  }));

  const passOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], 'clamp'),
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.swipeCard, cardStyle]} accessible accessibilityRole="adjustable">
        <Animated.View style={[styles.swipeOverlay, styles.overlayTake, takeOpacity]}>
          <Text style={[styles.overlayText, { color: '#22c55e' }]}>לוקח</Text>
        </Animated.View>
        <Animated.View style={[styles.swipeOverlay, styles.overlayPass, passOpacity]}>
          <Text style={[styles.overlayText, { color: '#ef4444' }]}>מוותר</Text>
        </Animated.View>

        <View accessible={false} style={{ marginBottom: 24 }}><LottieIcon source={insurance.lottie} size={70} /></View>
        <Text style={[styles.insuranceName, RTL, { fontSize: 24, marginBottom: 8 }]}>{insurance.name}</Text>
        <Text style={[styles.insuranceDesc, RTL, { fontSize: 15, lineHeight: 22, color: '#64748b' }]}>
          {insurance.description}
        </Text>
        <View style={styles.swipeCostBox}>
          <Text style={styles.swipeCostText}>₪{insurance.monthlyCost} / חודש</Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

/* ------------------------------------------------------------------ */
/*  BudgetBar, shows remaining budget                                  */
/* ------------------------------------------------------------------ */

function BudgetBar({
  spent,
  budget,
}: {
  spent: number;
  budget: number;
}) {
  const pct = Math.min(1, spent / budget);
  const barColor =
    pct >= 0.95 ? '#ef4444' : pct >= 0.7 ? '#facc15' : '#4ade80';

  return (
    <View style={styles.budgetContainer} accessibilityLiveRegion="polite">
      <View style={styles.budgetRow}>
        <Text style={[TYPE2.gradientLabel, RTL]}>תקציב חודשי</Text>
        <Text style={[TYPE2.gradientValue, { color: barColor }]}>
          ₪{spent.toLocaleString('he-IL')} / ₪{budget.toLocaleString('he-IL')}
        </Text>
      </View>
      <View style={[styles.budgetTrack, { backgroundColor: SIM2.trackBg }]}>
        <View
          style={[
            styles.budgetFill,
            { width: `${pct * 100}%`, backgroundColor: barColor },
          ]}
        />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  InsuranceCard, toggleable insurance in shopping phase               */
/* ------------------------------------------------------------------ */

function InsuranceCard({
  insurance,
  isActive,
  isDuplicate,
  isDisabled,
  onToggle,
}: {
  insurance: InsuranceType;
  isActive: boolean;
  isDuplicate: boolean;
  isDisabled: boolean;
  onToggle: () => void;
}) {
  const glowScale = useSharedValue(1);

  const handlePress = useCallback(() => {
    tapHaptic();
    glowScale.value = withSequence(
      withSpring(0.98, { damping: 22, stiffness: 200 }),
      withSpring(1, { damping: 22, stiffness: 150 }),
    );
    onToggle();
  }, [onToggle, glowScale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
  }));

  return (
    <Animated.View entering={FadeInUp.delay(50)} style={animStyle}>
      <AnimatedPressable
        onPress={handlePress}
        style={[
          styles.insuranceCard,
          isActive && styles.insuranceCardActive,
          isDisabled && !isActive && styles.insuranceCardDisabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel={insurance.name}
        accessibilityHint={isActive ? 'מסיר ביטוח זה מהבחירה' : 'מוסיף ביטוח זה לבחירה'}
        accessibilityState={{ disabled: isDisabled && !isActive, selected: isActive }}
      >
        {/* Duplicate warning badge */}
        {isDuplicate && isActive && (
          <Animated.View
            entering={FadeIn}
            style={styles.duplicateBadge}
          >
            <Text style={styles.duplicateBadgeText}>כפל!</Text>
          </Animated.View>
        )}

        <View accessible={false} style={{ marginBottom: 2 }}><LottieIcon source={insurance.lottie} size={28} /></View>
        <Text style={[styles.insuranceName, RTL, { color: SIM2.textPrimary }]}>
          {insurance.name}
        </Text>
        <Text style={[styles.insuranceDesc, RTL]} numberOfLines={3}>
          {insurance.description ?? ''}
        </Text>
        <Text style={[styles.insuranceCost, { color: SIM2.primary }]}>
          ₪{insurance.monthlyCost}/חודש
        </Text>

        {/* Active indicator */}
        {isActive && (
          <View style={styles.activeCheck}>
            <LottieIcon source={LOTTIE_CHECK} size={14} />
          </View>
        )}
      </AnimatedPressable>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/*  SavingsBar, health bar showing remaining savings                   */
/* ------------------------------------------------------------------ */

function SavingsBar({
  current,
  max,
}: {
  current: number;
  max: number;
}) {
  const pct = Math.max(0, current / max);
  const barColor =
    pct <= 0.2 ? '#ef4444' : pct <= 0.5 ? '#facc15' : '#4ade80';

  return (
    <View style={styles.savingsContainer} accessibilityLiveRegion="polite">
      <View style={styles.savingsRow}>
        <Text style={[TYPE2.gradientLabel, RTL]}>חסכונות</Text>
        <Text style={[TYPE2.gradientValue, { color: barColor }]}>
          ₪{current.toLocaleString('he-IL')}
        </Text>
      </View>
      <View style={[styles.savingsTrack, { backgroundColor: SIM2.trackBg }]}>
        <View
          style={[
            styles.savingsFill,
            { width: `${pct * 100}%`, backgroundColor: barColor },
          ]}
        />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  EventCard, life event during events phase                          */
/* ------------------------------------------------------------------ */

function EventCard({
  event,
  round,
  total,
}: {
  event: LifeEvent;
  round: number;
  total: number;
}) {
  const sev = SEVERITY_CFG[event.severity];

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(20)}
      style={styles.eventCardOuter}
    >
      <View style={[styles.eventCard, { backgroundColor: SIM2.cardBg, borderColor: sev.border, borderWidth: 1.5 }]}>
        <View style={styles.eventHeader}>
          <View style={[styles.severityBadge, { backgroundColor: sev.bg, borderColor: sev.border }]}>
            <Text style={[styles.severityText, { color: sev.text }]}>
              {sev.label}
            </Text>
          </View>
          <Text style={[styles.eventRound, { color: SIM2.textMuted }]}>
            {round + 1}/{total}
          </Text>
        </View>
        <View accessible={false} style={{ marginVertical: 8 }}><LottieIcon source={event.lottie} size={48} /></View>
        <Text style={[styles.eventDescription, RTL, { color: SIM2.textPrimary }]}>
          {event.description}
        </Text>
        <Text style={[styles.eventDamage, RTL, { color: SIM2.textSecondary }]}>
          נזק פוטנציאלי: ₪{event.damage.toLocaleString('he-IL')}
        </Text>
      </View>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/*  ScoreScreen, results after all events                              */
/* ------------------------------------------------------------------ */

function ScoreScreen({
  score,
  onReplay,
  onContinue,
}: {
  score: InsuranceShieldScore;
  onReplay: () => void;
  onContinue: () => void;
}) {
  const [showConfetti, setShowConfetti] = useState(score.grade === 'S');
  const gradeColor = GRADE_COLORS2[score.grade] ?? '#ffffff';

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 8, paddingHorizontal: 16, gap: 8, paddingBottom: 24 }}>
      {showConfetti && (
        <ConfettiExplosion onComplete={() => setShowConfetti(false)} />
      )}

      {/* Grade banner, compact */}
      <Animated.View
        entering={FadeInDown.springify().damping(22)}
        style={{ alignItems: 'center', marginBottom: 4 }}
      >
        <Text style={{ fontSize: 28, fontWeight: '900', color: gradeColor, letterSpacing: 1, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6, textAlign: 'center' }}>
          {GRADE_HEBREW[score.grade] ?? score.grade}
        </Text>
        <Text style={[sim2Styles.gradeLabel, RTL, { fontSize: 14 }]}>{score.gradeLabel}</Text>
      </Animated.View>

      {/* Main stats, compact card */}
      <Animated.View entering={FadeInUp.delay(150)}>
        <View style={[sim2Styles.scoreCard, { borderColor: SIM2.cardBorder }]}>
          <View style={{ padding: 14, gap: 8 }}>
            <Text style={[TYPE2.cardTitle, RTL, { fontSize: 14, marginBottom: 2 }]}>סיכום מגן הביטוח</Text>

            <View style={sim2Styles.scoreRow}>
              <Text style={[scoreCompact.value, { color: SIM2.success }]}>
                ₪{score.totalDamageBlocked.toLocaleString('he-IL')}
              </Text>
              <View style={scoreCompact.labelRow}>
                <LottieIcon source={LOTTIE_SHIELD} size={16} />
                <Text style={[scoreCompact.label, RTL]}>נזק שנחסם</Text>
              </View>
            </View>

            <View style={sim2Styles.scoreRow}>
              <Text style={[scoreCompact.value, { color: SIM2.danger }]}>
                ₪{score.totalDamageReceived.toLocaleString('he-IL')}
              </Text>
              <View style={scoreCompact.labelRow}>
                <LottieIcon source={LOTTIE_CROSS} size={16} />
                <Text style={[scoreCompact.label, RTL]}>נזק שספגת</Text>
              </View>
            </View>

            <View style={sim2Styles.scoreRow}>
              <Text style={[scoreCompact.value, { color: SIM2.textPrimary }]}>
                ₪{score.totalAnnualPremiums.toLocaleString('he-IL')}
              </Text>
              <View style={scoreCompact.labelRow}>
                <LottieIcon source={LOTTIE_MONEY_BAG} size={16} />
                <Text style={[scoreCompact.label, RTL]}>פרמיה שנתית</Text>
              </View>
            </View>

            <View style={sim2Styles.scoreRow}>
              <Text style={[scoreCompact.value, { color: SIM2.textPrimary }]}>
                {score.eventsFullyBlocked}/{score.eventsFullyBlocked + score.eventsMissed}
              </Text>
              <View style={scoreCompact.labelRow}>
                <LottieIcon source={LOTTIE_CHECK} size={16} />
                <Text style={[scoreCompact.label, RTL]}>אירועים שנחסמו</Text>
              </View>
            </View>

            {score.duplicatesFound > 0 && (
              <View style={sim2Styles.scoreRow}>
                <Text style={[scoreCompact.value, { color: SIM2.warning }]}>
                  {score.duplicatesFound}
                </Text>
                <View style={scoreCompact.labelRow}>
                  <LottieIcon source={LOTTIE_BELL} size={16} />
                  <Text style={[scoreCompact.label, RTL]}>כפילויות (בזבוז!)</Text>
                </View>
              </View>
            )}

            {/* Divider + net outcome */}
            <View style={{ borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 8 }}>
              <Text style={[scoreCompact.label, RTL, { lineHeight: 20 }]}>
                שילמת ₪{score.totalAnnualPremiums.toLocaleString('he-IL')} ביטוח,
                חסכת ₪{score.totalDamageBlocked.toLocaleString('he-IL')}.
                {score.totalDamageReceived > 0
                  ? ` בלי ביטוח, היית מפסיד ₪${(score.totalDamageBlocked + score.totalDamageReceived).toLocaleString('he-IL')}`
                  : ' הביטוח הציל אותך לגמרי!'}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Key lesson, compact */}
      <Animated.View entering={FadeInUp.delay(400)}>
        <View style={[sim2Styles.scoreCard, { borderColor: SIM2.cardBorder, marginTop: 8 }]}>
          <View style={{ padding: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
            <LottieIcon source={LOTTIE_BULB} size={18} />
            <Text style={[scoreCompact.label, RTL, { flex: 1, lineHeight: 20 }]}>
              ביטוח נכון = מגן. כפל ביטוח = בזבוז. תבדקו בהר הביטוח.
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Action buttons */}
      <Animated.View
        entering={FadeInUp.delay(600)}
        style={[sim2Styles.actionsRow, { marginTop: 8 }]}
      >
        <AnimatedPressable onPress={onReplay} style={sim2Styles.replayBtn} accessibilityRole="button" accessibilityLabel="שחק שוב" accessibilityHint="מתחיל את הסימולציה מחדש">
          <View accessible={false}><LottieIcon source={LOTTIE_REPLAY} size={18} /></View>
          <Text style={sim2Styles.replayText}>שחק שוב</Text>
        </AnimatedPressable>
        <AnimatedPressable onPress={onContinue} style={sim2Styles.continueBtn} accessibilityRole="button" accessibilityLabel="המשך" accessibilityHint="ממשיך לשלב הבא">
          <Text style={sim2Styles.continueText}>המשך</Text>
          <View accessible={false}><LottieIcon source={LOTTIE_ARROW} size={22} /></View>
        </AnimatedPressable>
      </Animated.View>
    </ScrollView>
  );
}

const scoreCompact = StyleSheet.create({
  value: { fontSize: 14, fontWeight: '800' },
  label: { fontSize: 13, color: SIM2.textSecondary, fontWeight: '600' },
  labelRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
});

/* ================================================================== */
/*  InsuranceShieldScreen, main component                              */
/* ================================================================== */

export function InsuranceShieldScreen({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const {
    state,
    config,
    currentEvent,
    budgetRemaining,
    duplicates,
    duplicatesWastedAmount,
    toggleInsurance,
    startEvents,
    processEvent,
    isEventCovered,
    score,
    resetGame,
  } = useInsuranceShield();

  const safeTimeout = useTimeoutCleanup();

  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState<{
    covered: boolean;
    damage: number;
  } | null>(null);
  const [showTransition, setShowTransition] = useState(false);
  const rewardsGranted = useRef(false);

  // Shopping phase specific state
  const [shoppingStep, setShoppingStep] = useState<'swipe' | 'review'>('swipe');
  const [swipeIndex, setSwipeIndex] = useState(0);
  const [reviewTab, setReviewTab] = useState<'selected' | 'passed'>('selected');
  const [swipeFeedbackDir, setSwipeFeedbackDir] = useState<'left' | 'right' | null>(null);

  const handleSwipe = useCallback((dir: 'left' | 'right') => {
    const ins = config.availableInsurances[swipeIndex];
    if (!ins) return;

    if (dir === 'right') {
      const isActive = state.activeInsurances.includes(ins.id);
      if (!isActive) {
         toggleInsurance(ins.id);
      }
      successHaptic();
    } else {
      tapHaptic(); // just normal haptic for pass
    }

    setSwipeFeedbackDir(dir);

    safeTimeout(() => {
        setSwipeFeedbackDir(null);
        if (swipeIndex + 1 >= config.availableInsurances.length) {
           setShoppingStep('review');
        } else {
           setSwipeIndex(p => p + 1);
        }
    }, 600);
  }, [swipeIndex, config.availableInsurances, state.activeInsurances, toggleInsurance, safeTimeout]);

  // Grant rewards when game completes
  useEffect(() => {
    if (state.isComplete && !rewardsGranted.current) {
      rewardsGranted.current = true;
      successHaptic();
    }
  }, [state.isComplete]);

  // Duplicate IDs set for quick lookup
  const duplicateIds = new Set(duplicates.flat());

  const handleProcessEvent = useCallback(() => {
    if (!currentEvent) return;
    tapHaptic();

    const covered = isEventCovered(currentEvent);
    setLastResult({ covered, damage: currentEvent.damage });
    setShowResult(true);

    if (covered) {
      successHaptic();
    } else {
      errorHaptic();
      // Extra heavy haptic for catastrophic
      if (currentEvent.severity === 'catastrophic') {
        heavyHaptic();
      }
    }

    processEvent();

    // Auto-dismiss feedback bar after 2.2s
    setTimeout(() => {
      setShowResult(false);
      setLastResult(null);
    }, 2200);
  }, [currentEvent, isEventCovered, processEvent]);

  const handleStartEvents = useCallback(() => {
    heavyHaptic();
    setShowTransition(true);
    setTimeout(() => {
      startEvents();
      setShowTransition(false);
    }, 800);
  }, [startEvents]);

  const handleReplay = useCallback(() => {
    resetGame();
    setShowResult(false);
    setLastResult(null);
  }, [resetGame]);

  const CH2_LOTTIE: [ReturnType<typeof require>, ReturnType<typeof require>] = [
    require('../../../../assets/lottie/wired-flat-457-shield-security-hover-pinch.json'),
    require('../../../../assets/lottie/wired-flat-436-love-care-hover-pinch.json'),
  ];

  /* ---------------------------------------------------------------- */
  /*  Phase: Results                                                    */
  /* ---------------------------------------------------------------- */
  if (state.phase === 'results' && score) {
    return (
      <SimLottieBackground lottieSources={CH2_LOTTIE} chapterColors={_th2.gradient}>
        <ScoreScreen
          score={score}
          onReplay={handleReplay}
          onContinue={onComplete}
        />
      </SimLottieBackground>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Phase: Transition animation                                       */
  /* ---------------------------------------------------------------- */
  if (showTransition) {
    return (
      <SimLottieBackground lottieSources={CH2_LOTTIE} chapterColors={_th2.gradient}>
        <Animated.View entering={FadeIn.duration(300)} style={{ alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <View accessible={false}><LottieIcon source={LOTTIE_SHIELD} size={80} /></View>
          <Text style={[styles.transitionText, RTL]}>
            מגן עולה!
          </Text>
          <Text style={[styles.transitionSub, RTL]}>
            מתכוננים לאירועי חיים...
          </Text>
        </Animated.View>
      </SimLottieBackground>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Phase: Events                                                     */
  /* ---------------------------------------------------------------- */
  if (state.phase === 'events') {
    return (
      <SimLottieBackground lottieSources={CH2_LOTTIE} chapterColors={_th2.gradient}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          {/* Savings bar */}
          <SavingsBar current={state.savingsHealth} max={200_000} />

          {/* Stats row */}
          <View style={styles.eventStatsRow}>
            <View style={styles.eventStatBox}>
              <Text style={[TYPE2.gradientValue, { color: '#4ade80' }]}>
                ₪{state.totalBlocked.toLocaleString('he-IL')}
              </Text>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                <LottieIcon source={LOTTIE_SHIELD} size={18} />
                <Text style={[TYPE2.gradientLabel, RTL]}>נחסם</Text>
              </View>
            </View>
            <View style={styles.eventStatBox}>
              <Text style={[TYPE2.gradientValue, { color: '#ef4444' }]}>
                ₪{state.totalDamage.toLocaleString('he-IL')}
              </Text>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                <LottieIcon source={LOTTIE_CROSS} size={18} />
                <Text style={[TYPE2.gradientLabel, RTL]}>נזק</Text>
              </View>
            </View>
          </View>

          {/* Current event */}
          {currentEvent && !showResult && (
            <>
              <EventCard
                event={currentEvent}
                round={state.round}
                total={config.events.length}
              />

              <AnimatedPressable
                onPress={handleProcessEvent}
                style={[
                  styles.faceEventBtn,
                  currentEvent.severity === 'catastrophic' &&
                    styles.faceEventBtnCatastrophic,
                ]}
                accessibilityRole="button"
                accessibilityLabel={currentEvent.severity === 'catastrophic' ? 'התמודד עם האירוע' : 'התמודד'}
                accessibilityHint="בודק אם הביטוח מכסה את האירוע"
              >
                <Text style={styles.faceEventBtnText}>
                  {currentEvent.severity === 'catastrophic'
                    ? 'התמודד עם האירוע'
                    : 'התמודד'}
                </Text>
              </AnimatedPressable>
            </>
          )}

          {/* Feedback bar */}
          {showResult && lastResult && (
            <SimFeedbackBar
              isCorrect={lastResult.covered}
              accentColor={SIM2.primary}
              message={
                lastResult.covered
                  ? `הביטוח חסם ₪${lastResult.damage.toLocaleString('he-IL')} נזק`
                  : `-₪${lastResult.damage.toLocaleString('he-IL')} מהחסכונות`
              }
            />
          )}
        </ScrollView>
      </SimLottieBackground>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Phase: Shopping                                                   */
  /* ---------------------------------------------------------------- */
  if (shoppingStep === 'swipe') {
    const ins = config.availableInsurances[swipeIndex];
    return (
      <SimLottieBackground lottieSources={CH2_LOTTIE} chapterColors={_th2.gradient}>
        <View style={[styles.flex1, { paddingHorizontal: 16, paddingTop: 16 }]}>
          {/* Title */}
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
            <View accessible={false}><LottieIcon source={LOTTIE_SHIELD} size={28} /></View>
            <Text accessibilityRole="header" style={[TYPE2.title, RTL, { textAlign: 'center', fontSize: 22 }]}>חנות הביטוח</Text>
          </View>
          
          <BudgetBar spent={state.totalPremiums} budget={config.monthlyBudget} />

          <Text style={{ textAlign: 'center', marginVertical: 8, color: '#64748b', fontWeight: '800' }}>
             {Math.min(swipeIndex + 1, config.availableInsurances.length)} מתוך {config.availableInsurances.length} מוצרים
          </Text>

          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {ins ? (
              <SwipeInsuranceCard
                key={ins.id}
                insurance={ins}
                onSwipe={handleSwipe}
              />
            ) : null}

            {swipeFeedbackDir && (
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', zIndex: 50, elevation: 50 }]}>
                <View style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: 30, borderRadius: 100 }}>
                  <LottieIcon source={swipeFeedbackDir === 'right' ? LOTTIE_CHECK : LOTTIE_CROSS} size={150} />
                </View>
              </View>
            )}
          </View>
        </View>
      </SimLottieBackground>
    );
  }

  // Review phase
  const selected = config.availableInsurances.filter(ins => state.activeInsurances.includes(ins.id));
  const passed = config.availableInsurances.filter(ins => !state.activeInsurances.includes(ins.id));
  const displayList = reviewTab === 'selected' ? selected : passed;

  return (
    <SimLottieBackground lottieSources={CH2_LOTTIE} chapterColors={_th2.gradient}>
      <View style={[styles.flex1, { paddingHorizontal: 16 }]}>
        <View style={{ marginTop: 24, marginBottom: 16 }}>
           <BudgetBar spent={state.totalPremiums} budget={config.monthlyBudget} />
        </View>

        <View style={styles.reviewTabs}>
          <Pressable onPress={() => setReviewTab('selected')} accessibilityRole="button" accessibilityLabel="בחרתי" style={[styles.reviewTabBtn, reviewTab === 'selected' && styles.reviewTabBtnActive]}>
             <Text style={[styles.reviewTabText, reviewTab === 'selected' && styles.reviewTabTextActive]}>בחרתי ({selected.length})</Text>
          </Pressable>
          <Pressable onPress={() => setReviewTab('passed')} accessibilityRole="button" accessibilityLabel="ויתרתי" style={[styles.reviewTabBtn, reviewTab === 'passed' && styles.reviewTabBtnActive]}>
             <Text style={[styles.reviewTabText, reviewTab === 'passed' && styles.reviewTabTextActive]}>ויתרתי ({passed.length})</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.reviewList}>
           {displayList.map(ins => {
              const isDup = duplicateIds.has(ins.id);
              const isSelected = reviewTab === 'selected';
              return (
                <Animated.View entering={FadeInUp} key={ins.id} style={styles.reviewCardRow}>
                  <View accessible={false} style={{ marginLeft: 12, marginRight: 8 }}><LottieIcon source={ins.lottie} size={42} /></View>
                  <View style={styles.reviewCardInfo}>
                    <Text style={[styles.insuranceName, RTL, { textAlign: 'right', fontSize: 16 }]}>{ins.name}</Text>
                    <Text style={[styles.insuranceDesc, RTL, { textAlign: 'right', fontSize: 12 }]} numberOfLines={2}>{ins.description}</Text>
                    <Text style={[styles.insuranceCost, { textAlign: 'right', marginTop: 4, color: SIM2.primary }]}>₪{ins.monthlyCost}/חודש</Text>
                    {isDup && isSelected && (
                      <Text style={{ color: '#f97316', fontSize: 12, fontWeight: '700', textAlign: 'right', marginTop: 2 }}>⚠️ כפל ביטוח - בזבוז!</Text>
                    )}
                  </View>
                  <AnimatedPressable
                    onPress={() => toggleInsurance(ins.id)}
                    accessibilityRole="button"
                    accessibilityLabel={isSelected ? `הסר ${ins.name}` : `הוסף ${ins.name}`}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={[styles.reviewCardActionBtn, isSelected ? { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' } : { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)' }]}
                  >
                    <Text style={{ color: isSelected ? '#ef4444' : '#22c55e', fontWeight: '800' }}>{isSelected ? 'הסר' : 'הוסף'}</Text>
                  </AnimatedPressable>
                </Animated.View>
              );
           })}
           {displayList.length === 0 && (
              <Text style={{ textAlign: 'center', marginTop: 40, color: '#64748b', fontSize: 16 }}>אין ביטוחים ברשימה זו</Text>
           )}
        </ScrollView>

        <AnimatedPressable
          onPress={handleStartEvents}
          style={[
            styles.startBtn,
            state.activeInsurances.length === 0 && styles.startBtnDisabled,
          ]}
          disabled={state.activeInsurances.length === 0}
          accessibilityRole="button"
          accessibilityLabel="סיימתי, התחל אירועים"
          accessibilityHint="עובר לשלב אירועי החיים"
          accessibilityState={{ disabled: state.activeInsurances.length === 0 }}
        >
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
            <LottieIcon source={LOTTIE_SHIELD} size={22} />
            <Text style={styles.startBtnText}>סיימתי, התחל אירועים!</Text>
          </View>
        </AnimatedPressable>
      </View>
    </SimLottieBackground>
  );
}

/* ================================================================== */
/*  Styles                                                              */
/* ================================================================== */

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  container: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 16,
  },

  /* Budget bar */
  budgetContainer: { marginBottom: 12 },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  budgetTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    alignItems: 'flex-end',
  },
  budgetFill: {
    height: '100%',
    borderRadius: 4,
  },

  /* Shopping */
  shoppingContent: { paddingBottom: 120, paddingHorizontal: 16 },

  /* Insurance grid */
  insuranceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    rowGap: 8,
    columnGap: 8,
    marginTop: 8,
  },
  insuranceCard: {
    width: '47%',
    backgroundColor: SIM2.cardBg,
    borderRadius: 14,
    padding: 8,
    borderWidth: 1.5,
    borderColor: SIM2.cardBorder,
    alignItems: 'center',
    position: 'relative',
    minHeight: 100,
    shadowColor: SIM2.primary,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  insuranceCardActive: {
    borderColor: SIM2.primary,
    borderWidth: 2,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  insuranceCardDisabled: {
    opacity: 0.4,
  },
  insuranceName: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 2,
  },
  insuranceDesc: {
    color: SIM2.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 14,
    marginBottom: 2,
  },
  insuranceCost: {
    fontSize: 12,
    fontWeight: '700',
  },
  activeCheck: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  duplicateBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#f97316',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  duplicateBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  /* Duplicate warning */
  dupWarning: {
    backgroundColor: 'rgba(249,115,22,0.15)',
    borderColor: 'rgba(249,115,22,0.4)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  dupWarningText: {
    color: '#f97316',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },

  /* Summary */
  summaryBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    padding: 10,
    marginTop: 10,
  },
  summaryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },

  /* Start button */
  startBtn: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: SIM2.btnPrimary,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: SIM2.btnPrimaryBorder,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: SIM2.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  startBtnDisabled: {
    backgroundColor: 'rgba(100,100,100,0.4)',
    borderColor: 'rgba(100,100,100,0.3)',
    shadowOpacity: 0,
  },
  startBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },

  /* Savings bar */
  savingsContainer: { marginBottom: 16 },
  savingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  savingsTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    alignItems: 'flex-end',
  },
  savingsFill: {
    height: '100%',
    borderRadius: 5,
  },

  /* Event stats */
  eventStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  eventStatBox: {
    alignItems: 'center',
  },

  /* Event card */
  eventCardOuter: {
    marginBottom: 16,
  },
  eventCard: {
    padding: 20,
    alignItems: 'center',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  severityBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  severityText: {
    fontSize: 14,
    fontWeight: '700',
  },
  eventRound: {
    fontSize: 14,
    fontWeight: '700',
  },
  eventDescription: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 8,
  },
  eventDamage: {
    fontSize: 16,
    fontWeight: '800',
  },

  /* Face event button */
  faceEventBtn: {
    backgroundColor: SIM2.btnPrimary,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: SIM2.btnPrimaryBorder,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  faceEventBtnCatastrophic: {
    backgroundColor: '#dc2626',
    borderColor: '#ef4444',
  },
  faceEventBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },

  /* Transition */
  transitionText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 12,
    ...SHADOW_STRONG,
  },
  transitionSub: {
    color: SIM2.textOnGradientMuted,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    ...SHADOW_LIGHT,
  },

  /* Score screen */
  scoreContainer: {
    paddingBottom: 40,
    paddingTop: 16,
  },

  /* Swipe Phase */
  swipeCard: {
    width: SCREEN_W - 32,
    backgroundColor: SIM2.cardBg,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: SIM2.cardBorder,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  swipeOverlay: {
    position: 'absolute',
    top: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 3,
    transform: [{ rotate: '-15deg' }],
  },
  overlayTake: {
    left: 24,
    borderColor: '#22c55e',
  },
  overlayPass: {
    right: 24,
    borderColor: '#ef4444',
  },
  overlayText: {
    fontSize: 28,
    fontWeight: '900',
  },
  swipeCostBox: {
    marginTop: 24,
    padding: 12,
    backgroundColor: 'rgba(8,145,178,0.1)',
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  swipeCostText: {
    fontSize: 18,
    color: '#0891b2',
    fontWeight: '800',
  },

  /* Review Phase */
  reviewTabs: {
    flexDirection: 'row-reverse',
    marginBottom: 16,
    backgroundColor: 'rgba(15,23,42,0.4)',
    borderRadius: 16,
    padding: 4,
  },
  reviewTabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  reviewTabBtnActive: {
    backgroundColor: SIM2.primary,
  },
  reviewTabText: {
    color: '#64748b',
    fontWeight: '700',
    fontSize: 16,
  },
  reviewTabTextActive: {
    color: '#ffffff',
  },
  reviewList: {
    paddingBottom: 24,
  },
  reviewCardRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: SIM2.cardBg,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: SIM2.cardBorder,
    padding: 12,
    marginBottom: 10,
  },
  reviewCardInfo: {
    flex: 1,
    marginRight: 12,
  },
  reviewCardActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
});
