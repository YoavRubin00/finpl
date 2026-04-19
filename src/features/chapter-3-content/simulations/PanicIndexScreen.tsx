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
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { SimLottieBackground } from '../../../components/ui/SimLottieBackground';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { LottieIcon } from '../../../components/ui/LottieIcon';
import { ConfettiExplosion } from '../../../components/ui/ConfettiExplosion';
import { tapHaptic, successHaptic, heavyHaptic } from '../../../utils/haptics';
import { usePanicIndex } from './usePanicIndex';
import { SIM3, GRADE_COLORS3, GRADE_HEBREW, SHADOW_STRONG, SHADOW_LIGHT, RTL, TYPE3, sim3Styles } from './simTheme';
import type { PanicIndexGrade, MarketSentiment } from './panicIndexTypes';

/* ── Chapter-3 theme (ocean blue), kept for gradient only ── */
const _th3 = getChapterTheme('chapter-3');

/* ── Lottie assets ── */
const LOTTIE_BRAIN = require('../../../../assets/lottie/wired-flat-426-brain-hover-pinch.json');
const LOTTIE_BULB = require('../../../../assets/lottie/wired-flat-36-bulb-hover-blink.json');
const LOTTIE_REPLAY = require('../../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json');
const LOTTIE_PLAY = require('../../../../assets/lottie/wired-flat-29-play-pause-circle-hover-pinch.json');
const LOTTIE_NEWS = require('../../../../assets/lottie/wired-flat-411-news-newspaper-hover-pinch.json');
const LOTTIE_SHIELD = require('../../../../assets/lottie/wired-flat-457-shield-security-hover-pinch.json');
const LOTTIE_ARROW = require('../../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');


const SENTIMENT_COLORS: Record<MarketSentiment, string> = {
  fear: '#ef4444',
  greed: '#22c55e',
  neutral: '#1d4ed8',
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 64; // padding
const CHART_HEIGHT = 160;

/* ================================================================== */
/*  MiniChart, simplified stock chart visualization                    */
/* ================================================================== */

function MiniChart({
  values,
  currentIndex,
  soldAtIndex,
  hasSold,
}: {
  values: number[];
  currentIndex: number;
  soldAtIndex: number;
  hasSold: boolean;
}) {
  if (values.length === 0) return null;

  const displayValues = values.slice(0, currentIndex + 1);
  const minVal = Math.min(...values) * 0.9;
  const maxVal = Math.max(...values) * 1.1;
  const range = maxVal - minVal || 1;

  const getX = (i: number) => (i / (values.length - 1)) * CHART_WIDTH;
  const getY = (val: number) =>
    CHART_HEIGHT - ((val - minVal) / range) * CHART_HEIGHT;

  return (
    <View style={chartStyles.container}>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map((pct) => (
        <View
          key={pct}
          style={[chartStyles.gridLine, { top: CHART_HEIGHT * pct }]}
        />
      ))}

      {/* Line segments */}
      {displayValues.map((val, i) => {
        if (i === 0) return null;
        const prevVal = displayValues[i - 1];
        const x1 = getX(i - 1);
        const y1 = getY(prevVal);
        const x2 = getX(i);
        const y2 = getY(val);

        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        const isAfterSell = hasSold && i > soldAtIndex;
        const isDown = val < prevVal;

        return (
          <Animated.View
            key={i}
            entering={FadeIn.duration(300)}
            style={[
              chartStyles.lineSegment,
              {
                left: x1,
                top: y1,
                width: length,
                backgroundColor: isAfterSell
                  ? 'rgba(255,255,255,0.2)'
                  : isDown
                    ? '#ef4444'
                    : '#22c55e',
                transform: [{ rotate: `${angle}deg` }],
              },
            ]}
          />
        );
      })}

      {/* Current dot */}
      {displayValues.length > 0 && (
        <View
          style={[
            chartStyles.dot,
            {
              left: getX(displayValues.length - 1) - 5,
              top: getY(displayValues[displayValues.length - 1]) - 5,
              backgroundColor: hasSold ? '#ef4444' : '#22c55e',
            },
          ]}
        />
      )}

      {/* Sold marker */}
      {hasSold && soldAtIndex >= 0 && soldAtIndex < displayValues.length && (
        <View
          style={[
            chartStyles.soldMarker,
            {
              left: getX(soldAtIndex) - 8,
              top: getY(displayValues[soldAtIndex]) - 8,
            },
          ]}
        >
          <Text style={chartStyles.soldMarkerText}>✖</Text>
        </View>
      )}

      {/* Initial value label */}
      <Text style={[chartStyles.label, { top: getY(values[0]) - 10, left: -4 }]}>
        ₪{(values[0] / 1000).toFixed(0)}K
      </Text>
    </View>
  );
}

/* ================================================================== */
/*  HeadlineTicker, breaking news headline                             */
/* ================================================================== */

function HeadlineTicker({
  headline,
  sentiment,
}: {
  headline: string;
  sentiment: MarketSentiment;
}) {
  const color = SENTIMENT_COLORS[sentiment];

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      style={[
        tickerStyles.container,
        {
          borderColor: color,
          backgroundColor:
            sentiment === 'fear'
              ? 'rgba(239,68,68,0.08)'
              : sentiment === 'greed'
                ? 'rgba(34,197,94,0.08)'
                : 'rgba(29,78,216,0.08)',
        },
      ]}
    >
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
        <View accessible={false}><LottieIcon source={LOTTIE_NEWS} size={18} /></View>
        <Text style={[tickerStyles.label, { color }]}>חדשות</Text>
      </View>
      <Text style={[tickerStyles.headline, RTL, { color }]}>
        {headline}
      </Text>
    </Animated.View>
  );
}

/* ================================================================== */
/*  SellButton, pulsing red temptation                                 */
/* ================================================================== */

function SellButton({
  onPress,
  disabled,
  isFearEvent,
}: {
  onPress: () => void;
  disabled: boolean;
  isFearEvent: boolean;
}) {
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (isFearEvent && !disabled) {
      // Pulse more aggressively during fear events
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.12, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
    }
  }, [isFearEvent, disabled, pulseScale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <AnimatedPressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={disabled ? 'נמכר' : 'מכור הכל!'}
        accessibilityHint="מוכר את כל התיק ונועל את הערך"
        accessibilityState={{ disabled }}
        style={[
          styles.sellBtn,
          isFearEvent && styles.sellBtnFear,
          disabled && styles.btnDisabled,
        ]}
      >
        <Text style={styles.sellBtnText}>
          {disabled ? 'נמכר' : 'מכור הכל!'}
        </Text>
      </AnimatedPressable>
    </Animated.View>
  );
}

/* ================================================================== */
/*  HoldButton, steady green                                           */
/* ================================================================== */

function HoldButton({
  onPress,
  disabled,
}: {
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={disabled ? 'צופה' : 'החזק בסבלנות'}
      accessibilityHint="ממשיך להחזיק את ההשקעה ועובר לאירוע הבא"
      accessibilityState={{ disabled }}
      style={[styles.holdBtn, disabled && styles.btnDisabled]}
    >
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
        <View accessible={false}><LottieIcon source={LOTTIE_SHIELD} size={22} /></View>
        <Text style={styles.holdBtnText}>
          {disabled ? 'צופה' : 'החזק בסבלנות'}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

/* ================================================================== */
/*  ScoreScreen, results display                                       */
/* ================================================================== */

function ScoreScreen({
  score,
  hasSold,
  initialInvestment,
  onReplay,
  onContinue,
}: {
  score: {
    grade: PanicIndexGrade;
    gradeLabel: string;
    finalValue: number;
    holdDuration: number;
    panicResistance: number;
    potentialValue: number;
  };
  hasSold: boolean;
  initialInvestment: number;
  onReplay: () => void;
  onContinue: () => void;
}) {
  const [showConfetti, setShowConfetti] = useState(score.grade === 'S');
  const gradeColor = GRADE_COLORS3[score.grade] ?? SIM3.textPrimary;
  const gainPct = ((score.finalValue - initialInvestment) / initialInvestment) * 100;
  const potentialGainPct =
    ((score.potentialValue - initialInvestment) / initialInvestment) * 100;

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
      {!hasSold ? (
        <Animated.View entering={FadeInUp.delay(200)}>
          <View style={sim3Styles.scoreCard}>
            <View style={sim3Styles.scoreCardInner}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                <LottieIcon source={LOTTIE_SHIELD} size={28} />
                <Text style={[TYPE3.cardTitle, RTL, { flex: 1 }]}>
                  ברכות! עמדת בלחץ
                </Text>
              </View>
              <Text style={[styles.dramaticValue, { color: '#4ade80' }]}>
                ₪{score.finalValue.toLocaleString('he-IL')}
              </Text>
              <Text style={[styles.dramaticSub, RTL]}>
                ₪{initialInvestment.toLocaleString('he-IL')} → ₪
                {score.finalValue.toLocaleString('he-IL')} (+
                {gainPct.toFixed(0)}%)
              </Text>
            </View>
          </View>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeInUp.delay(200)}>
          <View style={[sim3Styles.scoreCard, { borderColor: SIM3.dangerBorder }]}>
            <View style={sim3Styles.scoreCardInner}>
              <Text style={[TYPE3.cardTitle, RTL]}>
                מכרת ב-₪{score.finalValue.toLocaleString('he-IL')}
              </Text>
              <Text style={styles.dramaticValue}>
                ₪{score.finalValue.toLocaleString('he-IL')}
              </Text>
              <Text style={[styles.dramaticSub, RTL]}>
                אם היית מחזיק מעמד: ₪
                {score.potentialValue.toLocaleString('he-IL')} (+
                {potentialGainPct.toFixed(0)}%)
              </Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Panic resistance */}
      <Animated.View entering={FadeInUp.delay(350)}>
        <View style={[sim3Styles.scoreCard, { marginTop: 14 }]}>
          <View style={sim3Styles.scoreCardInner}>
            <Text style={[TYPE3.cardTitle, RTL]}>עמידות בפאניקה</Text>
            <View style={styles.resistanceRow}>
              <Text
                style={[
                  styles.resistanceValue,
                  {
                    color:
                      score.panicResistance >= 70
                        ? '#4ade80'
                        : score.panicResistance >= 40
                          ? '#facc15'
                          : '#ef4444',
                  },
                ]}
              >
                {score.panicResistance}%
              </Text>
            </View>
            <View style={styles.resistanceTrack}>
              <View
                style={[
                  styles.resistanceFill,
                  {
                    width: `${score.panicResistance}%`,
                    backgroundColor:
                      score.panicResistance >= 70
                        ? '#4ade80'
                        : score.panicResistance >= 40
                          ? '#facc15'
                          : '#ef4444',
                  },
                ]}
              />
            </View>

            <View style={sim3Styles.scoreRow}>
              <Text style={[sim3Styles.scoreRowLabel, RTL]}>אירועים שעמדת בהם</Text>
              <Text style={[sim3Styles.scoreRowValue, { color: '#f59e0b' }]}>{score.holdDuration}</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Key lesson */}
      <Animated.View entering={FadeInUp.delay(500)}>
        <View style={[sim3Styles.scoreCard, { marginTop: 14 }]}>
          <View style={sim3Styles.scoreCardInner}>
            <View style={sim3Styles.insightRow}>
              <LottieIcon source={LOTTIE_BULB} size={22} />
              <Text style={[sim3Styles.insightText, RTL]}>
                האויב הכי גדול הוא הרגשות שלך. קור רוח = כסף.
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Action buttons */}
      <Animated.View entering={FadeInUp.delay(800)} style={sim3Styles.actionsRow}>
        <AnimatedPressable onPress={onReplay} accessibilityRole="button" accessibilityLabel="שחק שוב" accessibilityHint="מתחיל את הסימולציה מחדש" style={sim3Styles.replayBtn}>
          <View accessible={false}><LottieIcon source={LOTTIE_REPLAY} size={18} /></View>
          <Text style={sim3Styles.replayText}>שחק שוב</Text>
        </AnimatedPressable>
        <AnimatedPressable onPress={onContinue} accessibilityRole="button" accessibilityLabel="המשך" accessibilityHint="ממשיך לשלב הבא" style={sim3Styles.continueBtn}>
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
/*  PanicIndexScreen, main component                                   */
/* ================================================================== */

export function PanicIndexScreen({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const {
    state,
    config,
    currentEvent,
    holdValue,
    advanceEvent,
    sell,
    recordPanicMoment,
    startPlaying,
    stopPlaying,
    reset,
    score,
  } = usePanicIndex();

  const rewardsGranted = useRef(false);
  const [showSellConfirm, setShowSellConfirm] = useState(false);

  // Build portfolio value history for chart
  const chartValues = useRef<number[]>([config.initialInvestment]);
  useEffect(() => {
    if (state.currentEventIndex >= 0) {
      // Build full history up to current index
      const values = [config.initialInvestment];
      for (let i = 0; i <= state.currentEventIndex; i++) {
        let val = config.initialInvestment;
        for (let j = 0; j <= i; j++) {
          val *= 1 + config.events[j].marketChange;
        }
        values.push(Math.round(val));
      }
      chartValues.current = values;
    }
  }, [state.currentEventIndex, config]);

  // Animated portfolio value
  const portfolioScale = useSharedValue(1);
  useEffect(() => {
    if (state.currentEventIndex < 0) return;
    const change = currentEvent?.marketChange ?? 0;
    if (change < -0.1) {
      // Crash, screen shake effect
      portfolioScale.value = withSequence(
        withTiming(1.05, { duration: 100 }),
        withSpring(0.98, { damping: 20, stiffness: 300 }),
        withSpring(1, { damping: 22, stiffness: 200 }),
      );
      heavyHaptic();
    } else if (change > 0.1) {
      // Recovery, golden glow pulse
      portfolioScale.value = withSequence(
        withSpring(1.03, { damping: 22, stiffness: 200 }),
        withSpring(1, { damping: 22, stiffness: 150 }),
      );
      successHaptic();
    } else {
      tapHaptic();
    }
  }, [state.currentEventIndex, currentEvent?.marketChange, portfolioScale]);

  const portfolioAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: portfolioScale.value }],
  }));

  // Grant rewards when complete
  useEffect(() => {
    if (state.isComplete && !rewardsGranted.current) {
      rewardsGranted.current = true;
      successHaptic();
    }
  }, [state.isComplete]);

  const handleReplay = useCallback(() => {
    rewardsGranted.current = false;
    chartValues.current = [config.initialInvestment];
    setShowSellConfirm(false);
    reset();
  }, [reset, config.initialInvestment]);

  const handleSellPress = useCallback(() => {
    if (state.hasSold || state.isComplete || state.currentEventIndex < 0) return;
    heavyHaptic();
    recordPanicMoment();
    setShowSellConfirm(true);
  }, [state.hasSold, state.isComplete, state.currentEventIndex, recordPanicMoment]);

  const handleConfirmSell = useCallback(() => {
    heavyHaptic();
    sell();
    setShowSellConfirm(false);
  }, [sell]);

  const handleCancelSell = useCallback(() => {
    tapHaptic();
    setShowSellConfirm(false);
  }, []);

  const handleHold = useCallback(() => {
    tapHaptic();
    advanceEvent();
  }, [advanceEvent]);

  const handleAutoPlay = useCallback(() => {
    heavyHaptic();
    if (state.isPlaying) {
      stopPlaying();
    } else {
      startPlaying();
    }
  }, [state.isPlaying, startPlaying, stopPlaying]);

  // Determine portfolio display color
  const getPortfolioColor = (): string => {
    if (state.hasSold) return '#ef4444';
    if (state.portfolioValue > config.initialInvestment) return '#4ade80';
    if (state.portfolioValue > config.initialInvestment * 0.7) return '#facc15';
    return '#ef4444';
  };

  const progressPct =
    state.currentEventIndex >= 0
      ? ((state.currentEventIndex + 1) / config.events.length) * 100
      : 0;

  const soldAtIndex = state.hasSold ? state.holdStreak : -1;

  /* ---------------------------------------------------------------- */
  /*  Phase: Results                                                    */
  /* ---------------------------------------------------------------- */
  const CH3_LOTTIE: [ReturnType<typeof require>, ReturnType<typeof require>] = [
    require('../../../../assets/lottie/wired-flat-411-news-newspaper-hover-pinch.json'),
    require('../../../../assets/lottie/wired-flat-426-brain-hover-pinch.json'),
  ];

  if (state.isComplete && score) {
    return (
      <SimLottieBackground lottieSources={CH3_LOTTIE} chapterColors={_th3.gradient}>
        <ScoreScreen
          score={score}
          hasSold={state.hasSold}
          initialInvestment={config.initialInvestment}
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
              <View accessible={false}><LottieIcon source={LOTTIE_BRAIN} size={28} /></View>
              <Text accessibilityRole="header" style={[styles.title, RTL]}>מדד הפאניקה</Text>
            </View>
            <Text style={[styles.subtitle, RTL]}>
              האם תצליח להחזיק מעמד כשהשוק קורס?
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(200)}>
            <View style={styles.introCard}>
              <Text style={[styles.introText, RTL]}>
                השקעת ₪{config.initialInvestment.toLocaleString('he-IL')} בשוק
                ההון. עכשיו מתחיל מסע של 8 שנים עם עליות, ירידות, וכותרות
                מפחידות.
              </Text>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <LottieIcon source={LOTTIE_SHIELD} size={22} />
                <Text style={[styles.introText, RTL, { flex: 1 }]}>
                  המשימה שלך: לא להיכנע ללחץ.
                </Text>
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(400)}>
            <AnimatedPressable
              onPress={() => {
                heavyHaptic();
                advanceEvent();
                startPlaying();
              }}
              accessibilityRole="button"
              accessibilityLabel="התחל סימולציה"
              accessibilityHint="מתחיל את סימולציית מדד הפאניקה"
              style={styles.startBtn}
            >
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                <View accessible={false}><LottieIcon source={LOTTIE_PLAY} size={22} /></View>
                <Text style={styles.startBtnText}>התחל סימולציה</Text>
              </View>
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
        {/* Title */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
            <View accessible={false}><LottieIcon source={LOTTIE_BRAIN} size={28} /></View>
            <Text accessibilityRole="header" style={[styles.title, RTL]}>מדד הפאניקה</Text>
          </View>
          {/* Progress bar */}
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>
              שנה {currentEvent?.year ?? 0} / {config.events.length}
            </Text>
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${progressPct}%` }]}
              />
            </View>
          </View>
        </Animated.View>

        {/* Stock chart */}
        <Animated.View entering={FadeInUp.delay(50)}>
          <View style={styles.chartCard}>
            <MiniChart
              values={chartValues.current}
              currentIndex={chartValues.current.length - 1}
              soldAtIndex={soldAtIndex}
              hasSold={state.hasSold}
            />
          </View>
        </Animated.View>

        {/* Portfolio counter */}
        <Animated.View entering={FadeInUp.delay(100)} style={styles.portfolioSection} accessibilityLiveRegion="polite">
          <Animated.View style={portfolioAnimStyle}>
            <Text
              style={[styles.portfolioValue, { color: getPortfolioColor() }]}
            >
              ₪{state.portfolioValue.toLocaleString('he-IL')}
            </Text>
          </Animated.View>
          <Text style={[styles.portfolioLabel, RTL]}>
            {state.hasSold ? 'שווי נעול (מכרת)' : 'שווי תיק ההשקעות'}
          </Text>

          {/* If sold, show hold comparison */}
          {state.hasSold && (
            <Animated.View entering={FadeIn.duration(300)}>
              <Text style={styles.holdCompare}>
                אם היית מחזיק: ₪{holdValue.toLocaleString('he-IL')}
              </Text>
            </Animated.View>
          )}
        </Animated.View>

        {/* Headline ticker */}
        {currentEvent && (
          <HeadlineTicker
            headline={currentEvent.headline}
            sentiment={currentEvent.sentiment}
          />
        )}

        {/* Historical context */}
        {currentEvent && (
          <Animated.View entering={FadeIn.duration(200)}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
              <LottieIcon source={LOTTIE_BULB} size={18} />
              <Text style={[styles.contextText, RTL, { flex: 1 }]}>
                {currentEvent.historicalContext}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Action buttons */}
        {!state.isPlaying ? (
          <Animated.View entering={FadeInUp.delay(150)} style={styles.actionsSection}>
            {/* Sell button */}
            <SellButton
              onPress={handleSellPress}
              disabled={state.hasSold}
              isFearEvent={currentEvent?.sentiment === 'fear' && !state.hasSold}
            />

            {/* Hold / Next button */}
            <HoldButton
              onPress={handleHold}
              disabled={state.isComplete}
            />
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn.duration(200)} style={styles.actionsSection}>
            {/* During auto-play, still show sell if not sold */}
            {!state.hasSold && (
              <SellButton
                onPress={handleSellPress}
                disabled={false}
                isFearEvent={currentEvent?.sentiment === 'fear'}
              />
            )}
          </Animated.View>
        )}

        {/* Auto-play toggle */}
        <Animated.View entering={FadeInUp.delay(200)} style={styles.controlsRow}>
          <AnimatedPressable
            onPress={handleAutoPlay}
            accessibilityRole="button"
            accessibilityLabel={state.isPlaying ? 'עצור' : 'הפעל אוטומטי'}
            accessibilityHint={state.isPlaying ? 'עוצר את ההרצה האוטומטית' : 'מריץ את הסימולציה אוטומטית'}
            style={[
              styles.controlBtn,
              state.isPlaying && styles.controlBtnActive,
            ]}
          >
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
              <View accessible={false}><LottieIcon source={LOTTIE_PLAY} size={18} /></View>
              <Text style={styles.controlBtnText}>
                {state.isPlaying ? 'עצור' : 'הפעל אוטומטי'}
              </Text>
            </View>
          </AnimatedPressable>
        </Animated.View>

        {/* Sell confirmation modal overlay */}
        {showSellConfirm && (
          <Animated.View entering={FadeIn.duration(150)} style={styles.confirmOverlay}>
            <View style={styles.confirmCard}>
              <Text style={[styles.confirmTitle, RTL]}>
                בטוח שאתה רוצה למכור?
              </Text>
              <Text style={[styles.confirmSub, RTL]}>
                תנעל את הערך על ₪
                {state.portfolioValue.toLocaleString('he-IL')} ולא תוכל לחזור
              </Text>
              <View style={styles.confirmBtns}>
                <AnimatedPressable
                  onPress={handleCancelSell}
                  accessibilityRole="button"
                  accessibilityLabel="חזור והחזק"
                  accessibilityHint="מבטל את המכירה וממשיך להחזיק"
                  style={styles.confirmCancelBtn}
                >
                  <Text style={styles.confirmCancelText}>חזור והחזק</Text>
                </AnimatedPressable>
                <AnimatedPressable
                  onPress={handleConfirmSell}
                  accessibilityRole="button"
                  accessibilityLabel="מכור!"
                  accessibilityHint="מאשר מכירה ונועל את הערך"
                  style={styles.confirmSellBtn}
                >
                  <Text style={styles.confirmSellText}>מכור!</Text>
                </AnimatedPressable>
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </SimLottieBackground>
  );
}

/* ================================================================== */
/*  Chart Styles                                                        */
/* ================================================================== */

const chartStyles = StyleSheet.create({
  container: {
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: SIM3.cardBorder,
  },
  lineSegment: {
    position: 'absolute',
    height: 3,
    borderRadius: 1.5,
    transformOrigin: 'left center',
  },
  dot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  soldMarker: {
    position: 'absolute',
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldMarkerText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '900',
  },
  label: {
    position: 'absolute',
    color: SIM3.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
});

/* ================================================================== */
/*  Ticker Styles                                                       */
/* ================================================================== */

const tickerStyles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    backgroundColor: SIM3.cardBg,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
  },
  headline: {
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 26,
  },
});

/* ================================================================== */
/*  Main Styles                                                         */
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
    paddingBottom: 40,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    width: '100%',
  },
  progressLabel: {
    color: SIM3.textOnGradientMuted,
    fontSize: 14,
    fontWeight: '700',
    minWidth: 60,
    ...SHADOW_LIGHT,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: SIM3.trackBg,
    borderRadius: 3,
    overflow: 'hidden',
    transform: [{ scaleX: -1 }],
  },
  progressFill: {
    height: '100%',
    backgroundColor: SIM3.primary,
    borderRadius: 3,
  },

  /* Chart card */
  chartCard: {
    backgroundColor: SIM3.cardBg,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: SIM3.cardBorder,
    padding: 16,
    marginBottom: 14,
    alignItems: 'center',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  /* Portfolio */
  portfolioSection: {
    alignItems: 'center',
    marginBottom: 14,
  },
  portfolioValue: {
    fontSize: 40,
    fontWeight: '900',
    textAlign: 'center',
  },
  portfolioLabel: {
    color: SIM3.textOnGradientMuted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
    ...SHADOW_LIGHT,
  },
  holdCompare: {
    color: '#4ade80',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },

  /* Context */
  contextText: {
    color: SIM3.textOnGradientMuted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 14,
    lineHeight: 20,
    ...SHADOW_LIGHT,
  },

  /* Actions */
  actionsSection: {
    gap: 12,
    marginBottom: 14,
  },
  sellBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  sellBtnFear: {
    backgroundColor: 'rgba(239,68,68,0.35)',
    borderColor: '#f87171',
  },
  sellBtnText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  holdBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  holdBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  btnDisabled: {
    opacity: 0.4,
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

  /* Sell confirmation */
  confirmOverlay: {
    marginTop: 8,
    marginBottom: 16,
  },
  confirmCard: {
    backgroundColor: SIM3.cardBg,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: SIM3.dangerBorder,
    padding: 20,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  confirmTitle: {
    color: '#dc2626',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
  },
  confirmSub: {
    color: SIM3.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    lineHeight: 22,
  },
  confirmBtns: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmCancelBtn: {
    flex: 1,
    backgroundColor: SIM3.successLight,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SIM3.successBorder,
  },
  confirmCancelText: {
    color: SIM3.success,
    fontSize: 14,
    fontWeight: '800',
  },
  confirmSellBtn: {
    flex: 1,
    backgroundColor: SIM3.dangerLight,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SIM3.dangerBorder,
  },
  confirmSellText: {
    color: SIM3.danger,
    fontSize: 14,
    fontWeight: '800',
  },

  /* Intro */
  introCard: {
    backgroundColor: SIM3.cardBg,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: SIM3.cardBorder,
    padding: 20,
    marginBottom: 20,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
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
    paddingBottom: 40,
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
    color: SIM3.textMuted,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  resistanceRow: {
    alignItems: 'center',
    marginBottom: 8,
  },
  resistanceValue: {
    fontSize: 32,
    fontWeight: '900',
  },
  resistanceTrack: {
    height: 10,
    backgroundColor: SIM3.trackBg,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 14,
  },
  resistanceFill: {
    height: '100%',
    borderRadius: 5,
  },
});