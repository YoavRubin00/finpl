import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { getChapterTheme } from '../../../constants/theme';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SimLottieBackground } from '../../../components/ui/SimLottieBackground';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { LottieIcon } from '../../../components/ui/LottieIcon';
import { ConfettiExplosion } from '../../../components/ui/ConfettiExplosion';
import { SimFeedbackBar } from '../../../components/ui/SimFeedbackBar';
import { tapHaptic, successHaptic, heavyHaptic } from '../../../utils/haptics';
import { useInvestmentPath } from './useInvestmentPath';
import { SIM3, GRADE_COLORS3, GRADE_HEBREW, SHADOW_STRONG, SHADOW_LIGHT, RTL, TYPE3, sim3Styles } from './simTheme';
import type { InvestmentPathGrade, PathEventType } from './investmentPathTypes';

/* ── Chapter-3 theme (ocean blue) — kept for gradient ── */
const _th3 = getChapterTheme('chapter-3');

/* ── Lottie assets ── */
const LOTTIE_COMPASS = require('../../../../assets/lottie/wired-flat-782-compass-hover-pinch.json');
const LOTTIE_TROPHY = require('../../../../assets/lottie/wired-flat-3263-trophy-circle-hover-roll.json');
const LOTTIE_REPLAY = require('../../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json');
const LOTTIE_PLAY = require('../../../../assets/lottie/wired-flat-29-play-pause-circle-hover-pinch.json');
const LOTTIE_ROCKET = require('../../../../assets/lottie/wired-flat-489-rocket-space-hover-flying.json');
const LOTTIE_CLOCK = require('../../../../assets/lottie/wired-flat-45-clock-time-hover-pinch.json');
const LOTTIE_ARROW = require('../../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');

const SCREEN_WIDTH = Dimensions.get('window').width;

const EVENT_TYPE_COLORS: Record<PathEventType, string> = {
  dip: '#ef4444',
  temptation: '#f97316',
  growth: '#22c55e',
  milestone: '#93c5fd',
};

const EVENT_TYPE_BG: Record<PathEventType, string> = {
  dip: 'rgba(239,68,68,0.15)',
  temptation: 'rgba(249,115,22,0.15)',
  growth: 'rgba(34,197,94,0.15)',
  milestone: 'rgba(147,197,253,0.15)',
};

/* ================================================================== */
/*  PathVisualization — winding road with waypoints                      */
/* ================================================================== */

function PathVisualization({
  totalEvents,
  currentIndex,
  hasWithdrawn,
  withdrawnIndex,
}: {
  totalEvents: number;
  currentIndex: number;
  hasWithdrawn: boolean;
  withdrawnIndex: number;
}) {
  const pathWidth = SCREEN_WIDTH - 64;
  const segmentWidth = pathWidth / totalEvents;

  return (
    <View style={pathStyles.container}>
      {/* Path segments */}
      <View style={pathStyles.track}>
        {Array.from({ length: totalEvents }).map((_, i) => {
          const isReached = i <= currentIndex;
          const isWithdrawnSegment = hasWithdrawn && i > withdrawnIndex;
          const isCurrent = i === currentIndex;

          return (
            <View key={i} style={[pathStyles.segment, { width: segmentWidth }]}>
              {/* Line */}
              <View
                style={[
                  pathStyles.line,
                  {
                    backgroundColor: isWithdrawnSegment
                      ? SIM3.trackBg
                      : isReached
                        ? '#4ade80'
                        : SIM3.cardBorder,
                  },
                ]}
              />
              {/* Waypoint dot */}
              <View
                style={[
                  pathStyles.waypoint,
                  {
                    backgroundColor: isWithdrawnSegment
                      ? SIM3.trackBg
                      : isReached
                        ? '#4ade80'
                        : SIM3.cardBorder,
                    borderColor: isCurrent ? '#fff' : 'transparent',
                    borderWidth: isCurrent ? 2 : 0,
                    width: isCurrent ? 16 : 10,
                    height: isCurrent ? 16 : 10,
                    borderRadius: isCurrent ? 8 : 5,
                  },
                ]}
              />
              {/* Year label (every other) */}
              {i % 2 === 0 && (
                <Text style={pathStyles.yearLabel}>שנה {i + 1}</Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Ghost path (dotted) */}
      {hasWithdrawn && (
        <View style={pathStyles.ghostTrack}>
          {Array.from({ length: totalEvents - withdrawnIndex - 1 }).map((_, i) => (
            <View
              key={`ghost-${i}`}
              style={[
                pathStyles.ghostDot,
                { right: (withdrawnIndex + 1 + i) * segmentWidth + segmentWidth / 2 },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

/* ================================================================== */
/*  EventCard — event description with choice options                    */
/* ================================================================== */

function EventCard({
  emoji,
  description,
  type,
  year,
}: {
  emoji: string;
  description: string;
  type: PathEventType;
  year: number;
}) {
  const borderColor = EVENT_TYPE_COLORS[type];

  return (
    <Animated.View entering={FadeInDown.springify().damping(20)}>
      <View style={[eventStyles.card, { borderColor, backgroundColor: SIM3.cardBg }]}>
        <View style={eventStyles.headerRow}>
          <Text style={eventStyles.emoji}>{emoji}</Text>
          <Text style={[eventStyles.yearBadge, { backgroundColor: borderColor }]}>
            שנה {year}
          </Text>
        </View>
        <Text style={[eventStyles.description, RTL]}>{description}</Text>
      </View>
    </Animated.View>
  );
}

/* ================================================================== */
/*  ChoiceButton — path fork option                                      */
/* ================================================================== */

function ChoiceButton({
  label,
  effect,
  onPress,
  disabled,
  selected,
}: {
  label: string;
  effect: 'withdraw' | 'continue' | 'add-more';
  onPress: () => void;
  disabled: boolean;
  selected: boolean;
}) {
  const isWithdraw = effect === 'withdraw';
  const isAddMore = effect === 'add-more';

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      accessibilityState={{ disabled, selected }}
      style={[
        choiceStyles.btn,
        isWithdraw && choiceStyles.withdrawBtn,
        !isWithdraw && choiceStyles.continueBtn,
        isAddMore && choiceStyles.addMoreBtn,
        selected && choiceStyles.selectedBtn,
        disabled && !selected && choiceStyles.disabledBtn,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={isWithdraw ? 'מושך את הכסף מהקופה' : isAddMore ? 'מוסיף עוד כסף לקופה' : 'ממשיך להחזיק את הכסף בקופה'}
    >
      <Text
        style={[
          choiceStyles.btnText,
          RTL,
          isWithdraw && choiceStyles.withdrawText,
          !isWithdraw && choiceStyles.continueText,
          isAddMore && choiceStyles.addMoreText,
        ]}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

/* ================================================================== */
/*  ScoreScreen — results display                                        */
/* ================================================================== */

function ScoreScreen({
  score,
  hasWithdrawn,
  initialDeposit,
  onReplay,
  onContinue,
}: {
  score: {
    grade: InvestmentPathGrade;
    gradeLabel: string;
    finalBalance: number;
    totalDeposited: number;
    totalGains: number;
    taxPaid: number;
    potentialBalance: number;
    withdrawnAtYear: number;
  };
  hasWithdrawn: boolean;
  initialDeposit: number;
  onReplay: () => void;
  onContinue: () => void;
}) {
  const [showConfetti, setShowConfetti] = useState(score.grade === 'S');
  const gradeColor = GRADE_COLORS3[score.grade];
  const gainPct =
    score.totalDeposited > 0
      ? ((score.finalBalance - score.totalDeposited) / score.totalDeposited) * 100
      : 0;

  return (
    <ScrollView
      style={styles.flex1}
      contentContainerStyle={styles.scoreContainer}
    >
      {showConfetti && (
        <ConfettiExplosion onComplete={() => setShowConfetti(false)} />
      )}

      {/* Grade banner */}
      <Animated.View
        entering={FadeInDown.springify().damping(22)}
        style={sim3Styles.gradeContainer}
      >
        <Text style={[sim3Styles.gradeText, { color: gradeColor }]}>
          {GRADE_HEBREW[score.grade] ?? score.grade}
        </Text>
        <Text style={[sim3Styles.gradeLabel, RTL]}>{score.gradeLabel}</Text>
      </Animated.View>

      {/* Main result */}
      {!hasWithdrawn ? (
        <Animated.View entering={FadeInUp.delay(200)}>
          <View style={sim3Styles.scoreCard}>
            <View style={sim3Styles.scoreCardInner}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                <LottieIcon source={LOTTIE_TROPHY} size={28} />
                <Text style={[TYPE3.cardTitle, RTL, { flex: 1 }]}>
                  סבלנות משתלמת! 15 שנים של צמיחה
                </Text>
              </View>
              <Text style={[styles.dramaticValue, { color: '#4ade80', marginTop: 10 }]}>
                ₪{score.finalBalance.toLocaleString('he-IL')}
              </Text>
              <Text style={[styles.dramaticSub, RTL]}>
                הפקדת ₪{score.totalDeposited.toLocaleString('he-IL')} → קיבלת ₪
                {score.finalBalance.toLocaleString('he-IL')} (+{gainPct.toFixed(0)}%)
              </Text>
            </View>
          </View>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeInUp.delay(200)}>
          <View style={sim3Styles.scoreCard}>
            <View style={sim3Styles.scoreCardInner}>
              <Text style={[TYPE3.cardTitle, RTL]}>
                משכת בשנה {score.withdrawnAtYear}
              </Text>
              <Text style={styles.dramaticValue}>
                ₪{score.finalBalance.toLocaleString('he-IL')}
              </Text>
              <Text style={[styles.dramaticSub, RTL]}>
                אם היית ממשיך: ₪{score.potentialBalance.toLocaleString('he-IL')}
              </Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Stats breakdown */}
      <Animated.View entering={FadeInUp.delay(350)}>
        <View style={[sim3Styles.scoreCard, { marginTop: 14 }]}>
          <View style={sim3Styles.scoreCardInner}>
            <Text style={[TYPE3.cardTitle, RTL]}>פירוט</Text>

            <View style={sim3Styles.scoreRow}>
              <Text style={sim3Styles.scoreRowValue}>
                ₪{score.totalDeposited.toLocaleString('he-IL')}
              </Text>
              <Text style={[sim3Styles.scoreRowLabel, RTL]}>סה״כ הופקד</Text>
            </View>

            <View style={sim3Styles.scoreRow}>
              <Text
                style={[
                  sim3Styles.scoreRowValue,
                  { color: score.totalGains >= 0 ? '#4ade80' : '#ef4444' },
                ]}
              >
                ₪{score.totalGains.toLocaleString('he-IL')}
              </Text>
              <Text style={[sim3Styles.scoreRowLabel, RTL]}>רווח/הפסד</Text>
            </View>

            {score.taxPaid > 0 && (
              <View style={sim3Styles.scoreRow}>
                <Text style={[sim3Styles.scoreRowValue, { color: '#ef4444' }]}>
                  -₪{score.taxPaid.toLocaleString('he-IL')}
                </Text>
                <Text style={[sim3Styles.scoreRowLabel, RTL]}>
                  מס על משיכה מוקדמת (25%)
                </Text>
              </View>
            )}

            {hasWithdrawn && (
              <View style={sim3Styles.scoreRow}>
                <Text style={[sim3Styles.scoreRowValue, { color: '#4ade80' }]}>
                  ₪{score.potentialBalance.toLocaleString('he-IL')}
                </Text>
                <Text style={[sim3Styles.scoreRowLabel, RTL]}>
                  אם היית ממשיך עד שנה 15
                </Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>

      {/* Pros & Cons */}
      <Animated.View entering={FadeInUp.delay(500)}>
        <View style={[sim3Styles.scoreCard, { marginTop: 14 }]}>
          <View style={{ padding: 16 }}>
            <Text style={[styles.prosConsTitle, RTL]}>היתרונות ברורים:</Text>
            <Text style={[styles.prosItem, RTL]}>✅ נזילות מלאה — אפשר למשוך בכל עת</Text>
            <Text style={[styles.prosItem, RTL]}>✅ משיכה כקצבה בגיל 60+ = פטור ממס רווחי הון</Text>
            <Text style={[styles.prosItem, RTL]}>✅ דחיית מס — מעבר בין מסלולים בלי אירוע מס</Text>
            <Text style={[styles.prosItem, RTL]}>✅ הלוואה כנגד הקופה בריבית נמוכה</Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(650)}>
        <View style={[sim3Styles.scoreCard, { marginTop: 14 }]}>
          <View style={{ padding: 16 }}>
            <Text style={[styles.prosConsTitle, RTL]}>מה חשוב לדעת:</Text>
            <Text style={[styles.consItem, RTL]}>⚠️ דמי ניהול: 0.6%-0.8% מצבירה (ניתן להתמקח!)</Text>
            <Text style={[styles.consItem, RTL]}>⚠️ תקרת הפקדה שנתית (~83,640 ש"ח ב-2026)</Text>
            <Text style={[styles.consItem, RTL]}>⚠️ משיכה הונית לפני 60 = 25% מס נומינלי על הרווחים</Text>
            <Text style={[styles.consItem, RTL]}>⚠️ אין רכיב ביטוחי (נכות/שאירים) — זהו מכשיר השקעה בלבד</Text>
          </View>
        </View>
      </Animated.View>

      {/* Action buttons */}
      <Animated.View entering={FadeInUp.delay(800)} style={sim3Styles.actionsRow}>
        <AnimatedPressable onPress={onReplay} style={sim3Styles.replayBtn} accessibilityRole="button" accessibilityLabel="שחק שוב" accessibilityHint="מתחיל את הסימולציה מחדש">
          <View accessible={false}><LottieIcon source={LOTTIE_REPLAY} size={18} /></View>
          <Text style={sim3Styles.replayText}>שחק שוב</Text>
        </AnimatedPressable>
        <AnimatedPressable onPress={onContinue} style={sim3Styles.continueBtn} accessibilityRole="button" accessibilityLabel="המשך" accessibilityHint="ממשיך לשלב הבא">
          <Text style={sim3Styles.continueText}>המשך</Text>
          <View style={{ position: 'absolute', left: 16 }} accessible={false}>
            <LottieIcon source={LOTTIE_ARROW} size={22} />
          </View>
        </AnimatedPressable>
      </Animated.View>
    </ScrollView>
  );
}

/* ================================================================== */
/*  InvestmentPathScreen — main component                                */
/* ================================================================== */

export function InvestmentPathScreen({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const {
    state,
    config,
    currentEvent,
    selectedOption,
    advanceToNextEvent,
    selectOption,
    startPlaying,
    stopPlaying,
    reset,
    score,
  } = useInvestmentPath();

  const rewardsGranted = useRef(false);
  const [feedbackDismissed, setFeedbackDismissed] = useState(false);

  // Auto-dismiss feedback after 3 seconds
  useEffect(() => {
    if (selectedOption) {
      setFeedbackDismissed(false);
      const timer = setTimeout(() => setFeedbackDismissed(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [selectedOption]);

  // Animated balance value
  const balanceScale = useSharedValue(1);
  const prevBalance = useRef(state.balance);
  useEffect(() => {
    if (state.balance !== prevBalance.current) {
      const diff = state.balance - prevBalance.current;
      if (diff < -1000) {
        // Dip — shake
        balanceScale.value = withSequence(
          withTiming(1.05, { duration: 100 }),
          withSpring(0.98, { damping: 20, stiffness: 300 }),
          withSpring(1, { damping: 22, stiffness: 200 }),
        );
        heavyHaptic();
      } else if (diff > 1000) {
        // Growth — pulse
        balanceScale.value = withSequence(
          withSpring(1.03, { damping: 22, stiffness: 200 }),
          withSpring(1, { damping: 22, stiffness: 150 }),
        );
        successHaptic();
      } else {
        tapHaptic();
      }
      prevBalance.current = state.balance;
    }
  }, [state.balance, balanceScale]);

  const balanceAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: balanceScale.value }],
  }));

  // Grant rewards when complete
  useEffect(() => {
    if ((state.isComplete || state.hasWithdrawn) && !rewardsGranted.current) {
      rewardsGranted.current = true;
      successHaptic();
    }
  }, [state.isComplete, state.hasWithdrawn]);

  const handleReplay = useCallback(() => {
    rewardsGranted.current = false;
    prevBalance.current = config.initialDeposit;
    reset();
  }, [reset, config.initialDeposit]);

  const handleSelectOption = useCallback(
    (optionId: string) => {
      tapHaptic();
      selectOption(optionId);
    },
    [selectOption],
  );

  const handleAdvance = useCallback(() => {
    tapHaptic();
    advanceToNextEvent();
  }, [advanceToNextEvent]);

  const handleAutoPlay = useCallback(() => {
    heavyHaptic();
    if (state.isPlaying) {
      stopPlaying();
    } else {
      startPlaying();
    }
  }, [state.isPlaying, startPlaying, stopPlaying]);

  // Balance display color
  const getBalanceColor = (): string => {
    if (state.hasWithdrawn) return '#ef4444';
    if (state.balance > state.totalDeposited) return '#4ade80';
    if (state.balance > state.totalDeposited * 0.8) return '#facc15';
    return '#ef4444';
  };

  const progressPct =
    state.currentEventIndex >= 0
      ? ((state.currentEventIndex + 1) / config.events.length) * 100
      : 0;

  const withdrawnIndex = state.hasWithdrawn ? state.currentEventIndex : -1;

  /* ---------------------------------------------------------------- */
  /*  Phase: Results                                                    */
  /* ---------------------------------------------------------------- */
  const CH3_LOTTIE: [ReturnType<typeof require>, ReturnType<typeof require>] = [
    require('../../../../assets/lottie/wired-flat-782-compass-hover-pinch.json'),
    require('../../../../assets/lottie/wired-flat-458-goal-target-hover-hit.json'),
  ];

  if ((state.isComplete || state.hasWithdrawn) && score) {
    return (
      <SimLottieBackground lottieSources={CH3_LOTTIE} chapterColors={_th3.gradient}>
        <ScoreScreen
          score={score}
          hasWithdrawn={state.hasWithdrawn}
          initialDeposit={config.initialDeposit}
          onReplay={handleReplay}
          onContinue={onComplete}
        />
      </SimLottieBackground>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Phase: Not started                                                */
  /* ---------------------------------------------------------------- */
  if (state.currentEventIndex < 0) {
    return (
      <SimLottieBackground lottieSources={CH3_LOTTIE} chapterColors={_th3.gradient}>
        <ScrollView
          style={styles.flex1}
          contentContainerStyle={styles.playContainer}
        >
          <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
              <View accessible={false}><LottieIcon source={LOTTIE_COMPASS} size={28} /></View>
              <Text accessibilityRole="header" style={[styles.title, RTL]}>מסלול המכשולים</Text>
            </View>
            <Text style={[styles.subtitle, RTL]}>
              15 שנים של חיסכון בקופת גמל. האם תחזיק מעמד?
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(200)}>
            <View style={[sim3Styles.scoreCard, { marginBottom: 20 }]}>
              <View style={styles.introCard}>
                <Text style={[styles.introText, RTL]}>
                  הפקדת ₪{config.initialDeposit.toLocaleString('he-IL')} לקופת גמל,
                  עם הפקדה חודשית של ₪
                  {config.monthlyDeposit.toLocaleString('he-IL')}.
                </Text>
                <Text style={[styles.introText, RTL, { marginTop: 10 }]}>
                  בדרך יהיו מכשולים: ירידות שוק, פיתויים, ולחץ למשוך. כל משיכה
                  מוקדמת = 25% מס על הרווחים!
                </Text>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <LottieIcon source={LOTTIE_ROCKET} size={22} />
                  <Text style={[styles.introText, RTL, { flex: 1 }]}>
                    המטרה: להגיע לשנה 15 בלי למשוך.
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(400)}>
            <AnimatedPressable
              onPress={() => {
                heavyHaptic();
                advanceToNextEvent();
              }}
              style={styles.startBtn}
              accessibilityRole="button"
              accessibilityLabel="התחל מסע"
              accessibilityHint="מתחיל את סימולציית קופת הגמל"
            >
              <Text style={styles.startBtnText}>התחל מסע</Text>
            </AnimatedPressable>
          </Animated.View>
        </ScrollView>
      </SimLottieBackground>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Phase: Playing                                                    */
  /* ---------------------------------------------------------------- */
  return (
    <SimLottieBackground lottieSources={CH3_LOTTIE} chapterColors={_th3.gradient}>
      <ScrollView
        style={styles.flex1}
        contentContainerStyle={styles.playContainer}
      >
        {/* Title + Progress */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
            <View accessible={false}><LottieIcon source={LOTTIE_COMPASS} size={28} /></View>
            <Text accessibilityRole="header" style={[styles.title, RTL]}>מסלול המכשולים</Text>
          </View>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>
              שנה {state.year} / 15
            </Text>
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${progressPct}%` }]}
              />
            </View>
          </View>
        </Animated.View>

        {/* Path visualization */}
        <Animated.View entering={FadeInUp.delay(50)}>
          <PathVisualization
            totalEvents={config.events.length}
            currentIndex={state.currentEventIndex}
            hasWithdrawn={state.hasWithdrawn}
            withdrawnIndex={withdrawnIndex}
          />
        </Animated.View>

        {/* Balance display */}
        <Animated.View entering={FadeInUp.delay(100)} style={styles.balanceSection} accessibilityLiveRegion="polite">
          <Animated.View style={balanceAnimStyle}>
            <Text style={[styles.balanceValue, { color: getBalanceColor() }]}>
              ₪{state.balance.toLocaleString('he-IL')}
            </Text>
          </Animated.View>
          <Text style={[styles.balanceLabel, RTL]}>
            {state.hasWithdrawn ? 'סכום שנמשך (אחרי מס)' : 'יתרה בקופת גמל'}
          </Text>

          {/* Ghost balance comparison */}
          {state.hasWithdrawn && (
            <Animated.View entering={FadeIn.duration(300)}>
              <Text style={styles.ghostCompare}>
                אם היית ממשיך: ₪{state.ghostBalance.toLocaleString('he-IL')}
              </Text>
            </Animated.View>
          )}

          {/* Deposited so far */}
          <Text style={styles.depositedLabel}>
            הופקד: ₪{state.totalDeposited.toLocaleString('he-IL')}
          </Text>
        </Animated.View>

        {/* Current event card */}
        {currentEvent && (
          <EventCard
            emoji={currentEvent.emoji}
            description={currentEvent.description}
            type={currentEvent.type}
            year={currentEvent.year}
          />
        )}

        {/* Feedback from selected option — rendered at bottom via SimFeedbackBar */}

        {/* Choice buttons (only if no option selected yet and not withdrawn) */}
        {currentEvent && state.selectedOptionId === null && !state.hasWithdrawn && (
          <Animated.View entering={FadeInUp.delay(200)} style={styles.choicesSection}>
            {currentEvent.options.map((option) => (
              <ChoiceButton
                key={option.id}
                label={option.label}
                effect={option.effect}
                onPress={() => handleSelectOption(option.id)}
                disabled={false}
                selected={false}
              />
            ))}
          </Animated.View>
        )}

        {/* Selected choices (show which was picked) */}
        {currentEvent && state.selectedOptionId !== null && !state.hasWithdrawn && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.choicesSection}>
            {currentEvent.options.map((option) => (
              <ChoiceButton
                key={option.id}
                label={option.label}
                effect={option.effect}
                onPress={() => {}}
                disabled={true}
                selected={option.id === state.selectedOptionId}
              />
            ))}
          </Animated.View>
        )}

        {/* Next event button removed as per user request — advancement is automatic on tap */}

        {/* Auto-play toggle */}
        {!state.hasWithdrawn && !state.isComplete && (
          <Animated.View entering={FadeInUp.delay(250)} style={styles.controlsRow}>
            <AnimatedPressable
              onPress={handleAutoPlay}
              style={[
                styles.controlBtn,
                state.isPlaying && styles.controlBtnActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel={state.isPlaying ? 'עצור' : 'הפעל אוטומטי'}
            >
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                <LottieIcon source={LOTTIE_PLAY} size={18} />
                <Text style={styles.controlBtnText}>
                  {state.isPlaying ? 'עצור' : 'הפעל אוטומטי'}
                </Text>
              </View>
            </AnimatedPressable>
          </Animated.View>
        )}
      </ScrollView>

      {/* Feedback bar — tap to dismiss or auto-dismiss after 3s */}
      {selectedOption && !feedbackDismissed && (
        <AnimatedPressable
          onPress={() => {
            if (!state.isComplete && !state.hasWithdrawn) handleAdvance();
            else setFeedbackDismissed(true);
          }}
          style={styles.feedbackTapZone}
          accessibilityRole="button"
          accessibilityLabel="לחצו בכל מקום כדי להמשיך"
        >
          <SimFeedbackBar
            isCorrect={selectedOption.effect !== 'withdraw'}
            message={selectedOption.feedback}
          />
        </AnimatedPressable>
      )}
    </SimLottieBackground>
  );
}

/* ================================================================== */
/*  Path Visualization Styles                                            */
/* ================================================================== */

const pathStyles = StyleSheet.create({
  container: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  track: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    height: 50,
  },
  segment: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    position: 'absolute',
    top: 14,
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 1.5,
  },
  waypoint: {
    zIndex: 1,
  },
  yearLabel: {
    color: SIM3.textOnGradientMuted,
    fontSize: 9,
    fontWeight: '600',
    marginTop: 4,
    ...SHADOW_LIGHT,
  },
  ghostTrack: {
    position: 'absolute',
    top: 14,
    left: 0,
    right: 0,
    height: 3,
  },
  ghostDot: {
    position: 'absolute',
    top: 0,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(74,222,128,0.3)',
  },
});

/* ================================================================== */
/*  Event Card Styles                                                    */
/* ================================================================== */

const eventStyles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: SIM3.dark,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  emoji: {
    fontSize: 28,
  },
  yearBadge: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  description: {
    color: SIM3.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 24,
  },
});

/* ================================================================== */
/*  Choice Button Styles                                                 */
/* ================================================================== */

const choiceStyles = StyleSheet.create({
  btn: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderWidth: 2,
    marginBottom: 10,
    borderColor: SIM3.cardBorder,
  },
  continueBtn: {
    backgroundColor: '#dcfce7',
    borderColor: '#bbf7d0',
  },
  withdrawBtn: {
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
  },
  addMoreBtn: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
  },
  selectedBtn: {
    opacity: 1,
    borderWidth: 3,
  },
  disabledBtn: {
    opacity: 0.35,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '800',
  },
  continueText: {
    color: '#16a34a',
  },
  withdrawText: {
    color: '#dc2626',
  },
  addMoreText: {
    color: '#d97706',
  },
});

/* ================================================================== */
/*  Main Styles                                                          */
/* ================================================================== */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  flex1: { flex: 1 },

  /* Play screen */
  playContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  header: {
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    color: SIM3.textOnGradient,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    ...SHADOW_STRONG,
  },
  subtitle: {
    color: SIM3.textOnGradientMuted,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
    ...SHADOW_LIGHT,
  },

  /* Progress */
  progressRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    width: '100%',
  },
  progressLabel: {
    color: SIM3.textOnGradientMuted,
    fontSize: 14,
    fontWeight: '700',
    minWidth: 70,
    ...SHADOW_LIGHT,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: SIM3.trackBg,
    borderRadius: 3,
    overflow: 'hidden',
    flexDirection: 'row-reverse',
  },
  progressFill: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: SIM3.primary,
    borderRadius: 3,
  },

  /* Balance */
  balanceSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceValue: {
    fontSize: 40,
    fontWeight: '900',
    textAlign: 'center',
  },
  balanceLabel: {
    color: SIM3.textOnGradientMuted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
    ...SHADOW_LIGHT,
  },
  ghostCompare: {
    color: '#4ade80',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  depositedLabel: {
    color: SIM3.textOnGradientMuted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
    ...SHADOW_LIGHT,
  },

  /* Choices */
  choicesSection: {
    marginBottom: 12,
  },

  /* Next button */
  feedbackTapZone: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    zIndex: 10,
  },
  nextBtn: {
    backgroundColor: SIM3.btnPrimary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 120,
    borderWidth: 1.5,
    borderColor: SIM3.btnPrimaryBorder,
  },
  nextBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },

  /* Controls */
  controlsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  controlBtn: {
    flex: 1,
    backgroundColor: SIM3.cardBg,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SIM3.cardBorder,
  },
  controlBtnActive: {
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderColor: SIM3.primary,
  },
  controlBtnText: {
    color: SIM3.dark,
    fontSize: 14,
    fontWeight: '700',
  },

  /* Intro */
  introCard: {
    padding: 20,
  },
  introText: {
    color: SIM3.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 26,
  },
  startBtn: {
    backgroundColor: SIM3.btnPrimary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: SIM3.btnPrimaryBorder,
  },
  startBtnText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },

  /* Score screen */
  scoreContainer: {
    paddingBottom: 100,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  dramaticValue: {
    color: '#ef4444',
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
  },
  dramaticSub: {
    color: SIM3.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  lessonCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: SIM3.cardBorder,
    backgroundColor: SIM3.cardBg,
    padding: 16,
    marginBottom: 14,
  },
  lessonText: {
    color: SIM3.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 24,
  },
  rewardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 20,
  },
  rewardBadge: {
    backgroundColor: 'rgba(167,139,250,0.2)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  coinBadge: {
    backgroundColor: 'rgba(250,204,21,0.2)',
  },
  rewardText: {
    color: SIM3.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  prosConsTitle: {
    color: SIM3.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  prosItem: {
    color: '#16a34a',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 2,
  },
  consItem: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 2,
  },
});