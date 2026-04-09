import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { GlowCard } from '../../../components/ui/GlowCard';
import { ConfettiExplosion } from '../../../components/ui/ConfettiExplosion';
import { LottieIcon } from '../../../components/ui/LottieIcon';
import { tapHaptic, successHaptic, heavyHaptic } from '../../../utils/haptics';
import { SPRING_SNAPPY } from '../../../utils/animations';
import { SimLottieBackground } from '../../../components/ui/SimLottieBackground';
import { getChapterTheme } from '../../../constants/theme';
import { useETFBuilder } from './useETFBuilder';
import { SIM4, GRADE_COLORS4, GRADE_HEBREW, SHADOW_STRONG, SHADOW_LIGHT, RTL, TYPE4, sim4Styles } from './simTheme';
import type { ETFProduct } from './etfBuilderTypes';
import { useSimReward } from '../../../hooks/useSimReward';

const SIM_COMPLETE_XP = 30;
const SIM_COMPLETE_COINS = 40;

/* ── Chapter 4 gradient (for SimLottieBackground) ── */
const _th4 = getChapterTheme('chapter-4');

/* ── Lottie assets ── */
const LOTTIE_BRIEFCASE = require('../../../../assets/lottie/wired-flat-1023-portfolio-hover-pinch.json');
const LOTTIE_CHART = require('../../../../assets/lottie/wired-flat-153-bar-chart-hover-pinch.json');
const LOTTIE_BULB = require('../../../../assets/lottie/wired-flat-36-bulb-hover-blink.json');
const LOTTIE_TROPHY = require('../../../../assets/lottie/wired-flat-3263-trophy-circle-hover-roll.json');
const LOTTIE_STAR = require('../../../../assets/lottie/wired-flat-237-star-rating-hover-pinch.json');
const LOTTIE_CHECK = require('../../../../assets/lottie/wired-flat-24-approved-checked-hover-pinch.json');
const LOTTIE_CROSS = require('../../../../assets/lottie/wired-flat-25-error-cross-hover-pinch.json');
const LOTTIE_SHIELD = require('../../../../assets/lottie/wired-flat-457-shield-security-hover-pinch.json');
const LOTTIE_REPLAY = require('../../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json');
const LOTTIE_SEARCH = require('../../../../assets/lottie/wired-flat-69-eye-hover-blink.json');
const LOTTIE_ARROW = require('../../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');

const GRADE_LABELS: Record<string, string> = {
  S: 'תיק מנצח!',
  A: 'תיק מצוין',
  B: 'תיק טוב',
  C: 'חסר פיזור',
  F: 'מרוכז מדי',
};

const GRADE_LOTTIES: Record<string, ReturnType<typeof require>> = {
  S: LOTTIE_TROPHY,
  A: LOTTIE_STAR,
  B: LOTTIE_CHECK,
  C: LOTTIE_SEARCH,
  F: LOTTIE_CROSS,
};

const TYPE_LABELS: Record<string, string> = {
  stocks: 'מניות',
  bonds: 'אג"ח',
  'real-estate': 'נדל"ן',
  emerging: 'שווקים מתפתחים',
};

const TYPE_COLORS: Record<string, string> = {
  stocks: '#4ade80',
  bonds: '#818cf8',
  'real-estate': '#f97316',
  emerging: '#e879f9',
};

interface ETFBuilderScreenProps {
  onComplete?: () => void;
}

// ---------- Sub-components ----------

function ETFCard({
  etf,
  isSelected,
  onPress,
}: {
  etf: ETFProduct;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable onPress={onPress} accessibilityRole="button" accessibilityLabel={etf.name} style={styles.etfCard}>
      <View
        style={[
          styles.etfCardInner,
          isSelected && styles.etfCardSelected,
          { borderLeftColor: TYPE_COLORS[etf.type] || '#666' },
        ]}
      >
        <View style={styles.etfCardHeader}>
          <Text style={styles.etfEmoji}>{etf.emoji}</Text>
          <View style={styles.etfCardInfo}>
            <Text style={[styles.etfName, RTL]} numberOfLines={1}>
              {etf.name}
            </Text>
            <Text style={[styles.etfType, RTL]}>
              {TYPE_LABELS[etf.type] || etf.type}
            </Text>
          </View>
          {isSelected ? (
            <View style={styles.checkBadge}>
              <LottieIcon source={LOTTIE_CHECK} size={18} />
            </View>
          ) : (
            <View style={styles.addBadge}>
              <Text style={styles.addText}>+</Text>
            </View>
          )}
        </View>
        <View style={styles.etfCardStats}>
          <View style={styles.etfStat}>
            <Text style={styles.etfStatLabel}>תשואה</Text>
            <Text style={[styles.etfStatValue, { color: '#4ade80' }]}>
              {(etf.annualReturn * 100).toFixed(0)}%
            </Text>
          </View>
          <View style={styles.etfStat}>
            <Text style={styles.etfStatLabel}>סיכון</Text>
            <Text style={styles.etfStatValue}>
              {'★'.repeat(etf.riskLevel)}
              {'☆'.repeat(5 - etf.riskLevel)}
            </Text>
          </View>
          <View style={styles.etfStat}>
            <Text style={styles.etfStatLabel}>עמלה</Text>
            <Text style={styles.etfStatValue}>
              {(etf.expenseRatio * 100).toFixed(2)}%
            </Text>
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
}

function HoldingsDrawer({ etf }: { etf: ETFProduct }) {
  return (
    <Animated.View entering={FadeInDown.duration(300)} style={styles.holdingsDrawer}>
      <Text style={[styles.holdingsTitle, RTL]}>
        מה בתוך ה-{etf.emoji} {etf.name.split('—')[0].trim()}?
      </Text>
      {etf.topHoldings.map((holding, i) => (
        <View key={i} style={styles.holdingRow}>
          <Text style={[styles.holdingText, RTL]}>{holding}</Text>
        </View>
      ))}
    </Animated.View>
  );
}

function DiversificationMeter({ score }: { score: number }) {
  const fillWidth = useSharedValue(0);

  useEffect(() => {
    fillWidth.value = withSpring(score / 100, SPRING_SNAPPY);
  }, [score, fillWidth]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillWidth.value * 100}%`,
  }));

  const fillColor =
    score >= 75 ? '#4ade80' : score >= 50 ? '#fbbf24' : score >= 25 ? '#f97316' : '#ef4444';

  return (
    <View style={styles.meterContainer}>
      <View style={styles.meterLabelRow}>
        <Text style={[styles.meterLabel, RTL]}>פיזור</Text>
        <Text style={[styles.meterValue, { color: fillColor }]}>{score}/100</Text>
      </View>
      <View style={styles.meterTrack}>
        <Animated.View style={[styles.meterFill, fillStyle, { backgroundColor: fillColor }]} />
      </View>
    </View>
  );
}

function PieChart({
  slices,
}: {
  slices: { percent: number; color: string; label: string }[];
}) {
  // Simple horizontal stacked bar as pie approximation (works cross-platform)
  if (slices.length === 0) {
    return (
      <View style={styles.pieContainer}>
        <View style={styles.pieEmpty}>
          <Text style={styles.pieEmptyText}>הסל ריק</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.pieContainer}>
      <View style={styles.pieBar}>
        {slices.map((slice, i) => (
          <Animated.View
            key={i}
            entering={FadeIn.duration(300).delay(i * 50)}
            style={[
              styles.pieSlice,
              {
                flex: slice.percent,
                backgroundColor: slice.color,
                borderTopLeftRadius: i === 0 ? 8 : 0,
                borderBottomLeftRadius: i === 0 ? 8 : 0,
                borderTopRightRadius: i === slices.length - 1 ? 8 : 0,
                borderBottomRightRadius: i === slices.length - 1 ? 8 : 0,
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.pieLegend}>
        {slices.map((slice, i) => (
          <View key={i} style={styles.pieLegendItem}>
            <View style={[styles.pieLegendDot, { backgroundColor: slice.color }]} />
            <Text style={styles.pieLegendText}>
              {slice.label} {slice.percent.toFixed(0)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ConcentrationWarning({ types }: { types: Set<string> }) {
  if (types.size > 1) return null;
  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.warningBanner}>
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
        <LottieIcon source={LOTTIE_CROSS} size={18} />
        <Text style={[styles.warningText, RTL]}>
          הסל שלך מרוכז מדי! נסה להוסיף סוגי נכסים שונים
        </Text>
      </View>
    </Animated.View>
  );
}

// ---------- Score Screen ----------

function ScoreScreen({
  score,
  state,
  totalExpenseRatio,
  config,
  onReplay,
  onContinue,
}: {
  score: NonNullable<ReturnType<typeof useETFBuilder>['score']>;
  state: ReturnType<typeof useETFBuilder>['state'];
  totalExpenseRatio: number;
  config: ReturnType<typeof useETFBuilder>['config'];
  onReplay: () => void;
  onContinue: () => void;
}) {
  const gradeColor = GRADE_COLORS4[score.grade] || SIM4.textPrimary;
  const gradeLabel = GRADE_LABELS[score.grade] || '';
  const gradeLottie = GRADE_LOTTIES[score.grade] || LOTTIE_CHART;

  const selectedETFNames = state.selectedETFs
    .map((a) => {
      const etf = config.availableETFs.find((e) => e.id === a.etfId);
      return etf ? `${etf.emoji} ${etf.name.split('—')[0].trim()}` : a.etfId;
    })
    .join(', ');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <ConfettiExplosion />

      {/* Grade banner */}
      <Animated.View entering={FadeInDown.duration(600)} style={sim4Styles.gradeContainer}>
        <Text accessibilityLiveRegion="polite" style={[sim4Styles.gradeText, { color: gradeColor }]}>
          {GRADE_HEBREW[score.grade] ?? score.grade}
        </Text>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
          <LottieIcon source={gradeLottie} size={28} />
          <Text style={[sim4Styles.gradeLabel, { color: gradeColor }]}>{gradeLabel}</Text>
        </View>
      </Animated.View>

      {/* Summary */}
      <Animated.View entering={FadeInDown.duration(600).delay(200)}>
        <GlowCard glowColor="rgba(74, 222, 128, 0.3)" style={{ ...styles.summaryCard, backgroundColor: SIM4.cardBg }}>
          <Text style={[styles.summaryTitle, RTL]}>הסל שלך</Text>
          <Text style={[styles.summaryText, RTL]}>{selectedETFNames}</Text>
        </GlowCard>
      </Animated.View>

      {/* Stats */}
      <Animated.View entering={FadeInDown.duration(600).delay(400)} style={styles.statsRow}>
        <GlowCard glowColor="rgba(96, 165, 250, 0.3)" style={{ ...styles.miniStatCard, backgroundColor: SIM4.cardBg }}>
          <Text style={styles.miniStatValue}>{score.diversification}</Text>
          <Text style={[styles.miniStatLabel, RTL]}>ציון פיזור</Text>
        </GlowCard>
        <GlowCard glowColor="rgba(96, 165, 250, 0.3)" style={{ ...styles.miniStatCard, backgroundColor: SIM4.cardBg }}>
          <Text style={styles.miniStatValue}>{score.assetTypeSpread}/4</Text>
          <Text style={[styles.miniStatLabel, RTL]}>סוגי נכסים</Text>
        </GlowCard>
        <GlowCard glowColor="rgba(96, 165, 250, 0.3)" style={{ ...styles.miniStatCard, backgroundColor: SIM4.cardBg }}>
          <Text style={styles.miniStatValue}>{score.geographicSpread}/4</Text>
          <Text style={[styles.miniStatLabel, RTL]}>אזורים</Text>
        </GlowCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(600).delay(500)} style={styles.statsRow}>
        <GlowCard glowColor="rgba(74, 222, 128, 0.2)" style={{ ...styles.miniStatCard, backgroundColor: SIM4.cardBg }}>
          <Text style={[styles.miniStatValue, { color: '#4ade80' }]}>
            {(state.estimatedReturn * 100).toFixed(1)}%
          </Text>
          <Text style={[styles.miniStatLabel, RTL]}>תשואה צפויה</Text>
        </GlowCard>
        <GlowCard glowColor="rgba(249, 115, 22, 0.2)" style={{ ...styles.miniStatCard, backgroundColor: SIM4.cardBg }}>
          <Text style={styles.miniStatValue}>{state.estimatedRisk.toFixed(1)}/5</Text>
          <Text style={[styles.miniStatLabel, RTL]}>סיכון</Text>
        </GlowCard>
        <GlowCard glowColor="rgba(251, 191, 36, 0.2)" style={{ ...styles.miniStatCard, backgroundColor: SIM4.cardBg }}>
          <Text style={styles.miniStatValue}>
            {(totalExpenseRatio * 100).toFixed(2)}%
          </Text>
          <Text style={[styles.miniStatLabel, RTL]}>עמלה</Text>
        </GlowCard>
      </Animated.View>

      {/* Key lesson */}
      <Animated.View entering={FadeInDown.duration(600).delay(600)}>
        <GlowCard glowColor="rgba(212, 175, 55, 0.3)" style={{ ...styles.lessonCard, backgroundColor: SIM4.cardBg }}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
            <LottieIcon source={LOTTIE_BULB} size={22} />
            <Text style={[styles.lessonText, RTL, { flex: 1 }]}>
              ETF = סל של 500+ מניות בעמלה זעירה. פיזור = הגנה.
            </Text>
          </View>
        </GlowCard>
      </Animated.View>

      {/* Actions */}
      <Animated.View entering={FadeInUp.duration(600).delay(800)} style={sim4Styles.actionsRow}>
        <AnimatedPressable onPress={onReplay} accessibilityRole="button" accessibilityLabel="שחק שוב" style={sim4Styles.replayBtn}>
          <View accessible={false}><LottieIcon source={LOTTIE_REPLAY} size={18} /></View>
          <Text style={sim4Styles.replayText}>שחק שוב</Text>
        </AnimatedPressable>
        <AnimatedPressable onPress={onContinue} accessibilityRole="button" accessibilityLabel="המשך" style={sim4Styles.continueBtn}>
          <Text style={sim4Styles.continueText}>המשך</Text>
          <View style={{ position: 'absolute', left: 16 }} accessible={false}>
            <LottieIcon source={LOTTIE_ARROW} size={22} />
          </View>
        </AnimatedPressable>
      </Animated.View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ---------- Main Screen ----------

export function ETFBuilderScreen({ onComplete }: ETFBuilderScreenProps) {
  const { state, config, totalExpenseRatio, score, addETF, removeETF, complete, reset } =
    useETFBuilder();
  useSimReward(state.isComplete, SIM_COMPLETE_XP, SIM_COMPLETE_COINS);
  const [expandedETF, setExpandedETF] = useState<string | null>(null);
  const rewardsGranted = useRef(false);

  // Reward granting
  useEffect(() => {
    if (state.isComplete && !rewardsGranted.current) {
      rewardsGranted.current = true;
      successHaptic();
    }
  }, [state.isComplete]);

  const handleToggleETF = useCallback(
    (etfId: string) => {
      const isSelected = state.selectedETFs.some((a) => a.etfId === etfId);
      if (isSelected) {
        removeETF(etfId);
        if (expandedETF === etfId) setExpandedETF(null);
      } else {
        addETF(etfId);
        setExpandedETF(etfId);
      }
      tapHaptic();
    },
    [state.selectedETFs, addETF, removeETF, expandedETF],
  );

  const handleComplete = useCallback(() => {
    if (state.selectedETFs.length === 0) return;
    heavyHaptic();
    complete();
  }, [state.selectedETFs.length, complete]);

  const handleReplay = useCallback(() => {
    rewardsGranted.current = false;
    setExpandedETF(null);
    reset();
  }, [reset]);

  const handleContinue = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  const CH4_LOTTIE: [ReturnType<typeof require>, ReturnType<typeof require>] = [
    require('../../../../assets/lottie/wired-flat-1023-portfolio-hover-pinch.json'),
    require('../../../../assets/lottie/wired-flat-166-bar-chart-diversified-double-hover-growth.json'),
  ];

  // Score screen
  if (state.isComplete && score) {
    return (
      <SimLottieBackground lottieSources={CH4_LOTTIE} chapterColors={_th4.gradient}>
      <ScoreScreen
        score={score}
        state={state}
        totalExpenseRatio={totalExpenseRatio}
        config={config}
        onReplay={handleReplay}
        onContinue={handleContinue}
      />
      </SimLottieBackground>
    );
  }

  // Compute selected ETF IDs for quick lookup
  const selectedIds = new Set(state.selectedETFs.map((a) => a.etfId));

  // Compute asset types in basket for concentration warning
  const selectedTypes = new Set(
    state.selectedETFs
      .map((a) => config.availableETFs.find((e) => e.id === a.etfId)?.type)
      .filter(Boolean) as string[],
  );

  // Pie chart slices
  const pieSlices = state.selectedETFs.map((a) => {
    const etf = config.availableETFs.find((e) => e.id === a.etfId);
    return {
      percent: a.percent,
      color: TYPE_COLORS[etf?.type || 'stocks'] || '#666',
      label: etf?.emoji || '',
    };
  });

  // Currently expanded ETF data
  const expandedETFData = expandedETF
    ? config.availableETFs.find((e) => e.id === expandedETF)
    : null;

  return (
    <SimLottieBackground lottieSources={CH4_LOTTIE} chapterColors={_th4.gradient}>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
      {/* Title */}
      <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
          <View accessible={false}><LottieIcon source={LOTTIE_BRIEFCASE} size={28} /></View>
          <Text accessibilityRole="header" style={[styles.title, RTL]}>בנה את הסל</Text>
        </View>
        <Text style={[styles.subtitle, RTL]}>
          בחר עד {config.maxETFs} קרנות סל ובנה תיק מפוזר
        </Text>
      </Animated.View>

      {/* Pie chart */}
      <Animated.View entering={FadeInDown.duration(500).delay(100)}>
        <PieChart slices={pieSlices} />
      </Animated.View>

      {/* Diversification meter */}
      <Animated.View entering={FadeInDown.duration(500).delay(150)}>
        <DiversificationMeter score={state.diversificationScore} />
      </Animated.View>

      {/* Concentration warning */}
      {state.selectedETFs.length >= 2 && <ConcentrationWarning types={selectedTypes} />}

      {/* Stats panel */}
      {state.selectedETFs.length > 0 && (
        <Animated.View entering={FadeIn.duration(400)} style={styles.statsRow}>
          <GlowCard glowColor="rgba(74, 222, 128, 0.2)" style={{ ...styles.miniStatCard, backgroundColor: SIM4.cardBg }}>
            <Text style={[styles.miniStatValue, { color: '#4ade80' }]}>
              {(state.estimatedReturn * 100).toFixed(1)}%
            </Text>
            <Text style={[styles.miniStatLabel, RTL]}>תשואה</Text>
          </GlowCard>
          <GlowCard glowColor="rgba(249, 115, 22, 0.2)" style={{ ...styles.miniStatCard, backgroundColor: SIM4.cardBg }}>
            <Text style={styles.miniStatValue}>
              {state.estimatedRisk.toFixed(1)}/5
            </Text>
            <Text style={[styles.miniStatLabel, RTL]}>סיכון</Text>
          </GlowCard>
          <GlowCard glowColor="rgba(251, 191, 36, 0.2)" style={{ ...styles.miniStatCard, backgroundColor: SIM4.cardBg }}>
            <Text style={styles.miniStatValue}>
              {(totalExpenseRatio * 100).toFixed(2)}%
            </Text>
            <Text style={[styles.miniStatLabel, RTL]}>עמלה</Text>
          </GlowCard>
        </Animated.View>
      )}

      {/* Holdings drawer */}
      {expandedETFData && selectedIds.has(expandedETFData.id) && (
        <HoldingsDrawer etf={expandedETFData} />
      )}

      {/* ETF shelf */}
      <Animated.View entering={FadeInDown.duration(500).delay(200)}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
          <LottieIcon source={LOTTIE_CHART} size={22} />
          <Text style={[styles.shelfTitle, RTL]}>
            מדף הקרנות ({selectedIds.size}/{config.maxETFs})
          </Text>
        </View>
        {config.availableETFs.map((etf) => (
          <ETFCard
            key={etf.id}
            etf={etf}
            isSelected={selectedIds.has(etf.id)}
            onPress={() => handleToggleETF(etf.id)}
          />
        ))}
      </Animated.View>

      {/* Complete button */}
      <Animated.View entering={FadeInUp.duration(500).delay(300)} style={styles.completeArea}>
        <AnimatedPressable
          onPress={handleComplete}
          accessibilityRole="button"
          accessibilityLabel={`נעל את הסל — ${state.selectedETFs.length} קרנות`}
          accessibilityHint="נועל את הסל ומציג תוצאות"
          accessibilityState={{ disabled: state.selectedETFs.length === 0 }}
          style={[
            styles.completeBtn,
            state.selectedETFs.length === 0 && styles.completeBtnDisabled,
          ]}
          disabled={state.selectedETFs.length === 0}
        >
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
            <LottieIcon source={LOTTIE_SHIELD} size={22} />
            <Text style={styles.completeBtnText}>
              נעל את הסל ({state.selectedETFs.length} קרנות)
            </Text>
          </View>
        </AnimatedPressable>
      </Animated.View>

      <View style={{ height: 40 }} />
    </ScrollView>
    </SimLottieBackground>
  );
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 50,
  },

  // Header
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: SIM4.textOnGradient,
    marginBottom: 6,
    ...SHADOW_STRONG,
  },
  subtitle: {
    fontSize: 15,
    color: SIM4.textOnGradientMuted,
    ...SHADOW_LIGHT,
  },

  // ETF card
  etfCard: {
    marginBottom: 10,
  },
  etfCardInner: {
    backgroundColor: SIM4.cardBg,
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#666',
    borderWidth: 1,
    borderColor: SIM4.cardBorder,
  },
  etfCardSelected: {
    backgroundColor: 'rgba(74, 222, 128, 0.08)',
    borderColor: 'rgba(74, 222, 128, 0.3)',
    borderWidth: 1,
  },
  etfCardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 8,
  },
  etfEmoji: {
    fontSize: 28,
    marginLeft: 10,
  },
  etfCardInfo: {
    flex: 1,
  },
  etfName: {
    fontSize: 14,
    fontWeight: '700',
    color: SIM4.textPrimary,
  },
  etfType: {
    fontSize: 12,
    color: SIM4.textMuted,
    marginTop: 2,
  },
  checkBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4ade80',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkText: {
    color: "#fff",
    fontWeight: '800',
    fontSize: 16,
  },
  addBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: SIM4.cardBg,
    borderWidth: 1,
    borderColor: SIM4.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  addText: {
    color: SIM4.textPrimary,
    fontWeight: '700',
    fontSize: 18,
  },
  etfCardStats: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
  },
  etfStat: {
    alignItems: 'center',
  },
  etfStatLabel: {
    fontSize: 11,
    color: SIM4.textMuted,
    marginBottom: 2,
  },
  etfStatValue: {
    fontSize: 13,
    fontWeight: '700',
    color: SIM4.textPrimary,
  },

  // Holdings drawer
  holdingsDrawer: {
    backgroundColor: SIM4.cardBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: SIM4.cardBorder,
  },
  holdingsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: SIM4.textPrimary,
    marginBottom: 10,
  },
  holdingRow: {
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: SIM4.cardBorder,
  },
  holdingText: {
    fontSize: 13,
    color: SIM4.textPrimary,
  },

  // Diversification meter
  meterContainer: {
    marginBottom: 16,
  },
  meterLabelRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  meterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: SIM4.textOnGradientMuted,
    ...SHADOW_LIGHT,
  },
  meterValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  meterTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: SIM4.trackBg,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 5,
  },

  // Warning
  warningBanner: {
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)',
  },
  warningText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f97316',
    flex: 1,
  },

  // Pie chart
  pieContainer: {
    marginBottom: 16,
  },
  pieEmpty: {
    height: 24,
    borderRadius: 8,
    backgroundColor: SIM4.trackBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieEmptyText: {
    fontSize: 13,
    color: SIM4.textMuted,
  },
  pieBar: {
    height: 24,
    borderRadius: 8,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  pieSlice: {
    height: '100%',
  },
  pieLegend: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  pieLegendItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  pieLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 4,
  },
  pieLegendText: {
    fontSize: 11,
    color: SIM4.textOnGradientMuted,
    ...SHADOW_LIGHT,
  },

  // Shelf
  shelfTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: SIM4.textOnGradient,
    marginBottom: 12,
    marginTop: 4,
    ...SHADOW_STRONG,
  },

  // Stats
  statsRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: 14,
  },
  miniStatCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    backgroundColor: SIM4.cardBg,
  },
  miniStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: SIM4.textPrimary,
    marginBottom: 4,
  },
  miniStatLabel: {
    fontSize: 11,
    color: SIM4.textMuted,
  },

  // Complete
  completeArea: {
    marginTop: 10,
    alignItems: 'center',
  },
  completeBtn: {
    backgroundColor: SIM4.btnPrimary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: SIM4.btnPrimaryBorder,
  },
  completeBtnDisabled: {
    backgroundColor: SIM4.trackBg,
    borderColor: SIM4.cardBorder,
  },
  completeBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: "#fff",
  },

  // Score screen
  summaryCard: {
    marginBottom: 14,
    padding: 16,
    backgroundColor: SIM4.cardBg,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: SIM4.textPrimary,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: SIM4.textPrimary,
    lineHeight: 22,
  },
  lessonCard: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: SIM4.cardBg,
  },
  lessonText: {
    fontSize: 15,
    fontWeight: '600',
    color: SIM4.textPrimary,
    lineHeight: 24,
  },

  // Rewards
  rewardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 20,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SIM4.cardBg,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: SIM4.cardBorder,
  },
  rewardIcon: {
    fontSize: 18,
  },
  rewardValue: {
    fontSize: 15,
    fontWeight: '700',
    color: SIM4.textPrimary,
  },
});
