/**
 * SIM: בנה תיק לפי גראהם (Graham Portfolio Builder)
 * Screen: pick from 10 stocks, allocate up to 40% each, score by Graham criteria.
 */

import { useState, useCallback, useMemo, useEffect, memo } from 'react';
import { Image as ExpoImage } from "expo-image";
import {
  View,
  Text,
  Image,
  ScrollView,
  Modal,
  StyleSheet,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import Slider from '@react-native-community/slider';
import { SimLottieBackground } from '../../../components/ui/SimLottieBackground';
import { LottieIcon } from '../../../components/ui/LottieIcon';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { GlowCard } from '../../../components/ui/GlowCard';
import { ConfettiExplosion } from '../../../components/ui/ConfettiExplosion';
import { tapHaptic, heavyHaptic } from '../../../utils/haptics';
import { formatShekel } from '../../../utils/format';
import { getChapterTheme } from '../../../constants/theme';
import { SIM_LOTTIE } from '../../shared-sim/simLottieMap';
import { FINN_STANDARD, FINN_HAPPY } from '../../retention-loops/finnMascotConfig';
import { useGrahamPortfolio } from './useGrahamPortfolio';
import { GRAHAM_STOCKS, BUDGET, STOCK_COLORS } from './grahamPortfolioData';
import type { GrahamStock, GrahamResult } from './grahamPortfolioTypes';
import {
  SIM4,
  TYPE4,
  sim4Styles,
  GRADE_COLORS4,
  GRADE_HEBREW,
  SHADOW_STRONG,
  SHADOW_LIGHT,
  RTL,
} from './simTheme';


const _th4 = getChapterTheme('chapter-4');

/* ── Lottie assets ── */
const LOTTIE_PROCESS = require('../../../../assets/lottie/wired-flat-974-process-flow-game-plan-hover-pinch.json');

const CH4_LOTTIE: [ReturnType<typeof require>, ReturnType<typeof require>] = [
  SIM_LOTTIE.portfolio,
  LOTTIE_PROCESS,
];

const GRADE_LOTTIES: Record<string, ReturnType<typeof require>> = {
  S: SIM_LOTTIE.trophy,
  A: SIM_LOTTIE.star,
  B: SIM_LOTTIE.check,
  C: SIM_LOTTIE.cross,
  F: SIM_LOTTIE.cross,
};

const GRADE_LABELS_TEXT: Record<string, string> = {
  S: 'משקיע ערך אגדי!',
  A: 'תיק גראהם מצוין',
  B: 'תיק סביר',
  C: 'יותר מדי סיכון',
  F: 'גראהם לא מאשר',
};

const GRAHAM_QUOTES: Record<string, string> = {
  S: '"המשקיע החכם הוא ריאליסט שמוכר לאופטימיסטים וקונה מפסימיסטים."',
  A: '"מרווח הביטחון הוא ההבדל בין השקעה לספקולציה."',
  B: '"בטווח הקצר השוק הוא מכונת הצבעה, בטווח הארוך — מכונת שקילה."',
  C: '"הסיכון הגדול ביותר הוא לא תנודתיות, אלא אובדן הון קבוע."',
  F: '"הסכנה האמיתית היא לשלם מחיר גבוה מדי עבור מניה באיכות נמוכה."',
};

// ── Graham criteria check helpers ───────────────────────────────────────

interface CriteriaCheck {
  label: string;
  passed: boolean;
}

function getGrahamCriteria(stock: GrahamStock): CriteriaCheck[] {
  return [
    { label: `שווי שוק > $1B`, passed: stock.marketCapBillion > 1 },
    { label: `יחס שוטף > 2`, passed: stock.currentRatio > 2 },
    { label: `רווחים 10+ שנים`, passed: stock.yearsOfProfits >= 10 },
    { label: `דיבידנד 20+ שנים`, passed: stock.dividendYears >= 20 },
    { label: `צמיחת רווח > 33%`, passed: stock.earningsGrowth5y > 33 },
    { label: `מכפיל < 15`, passed: stock.pe > 0 && stock.pe < 15 },
    { label: `P/E×P/B < 22.5`, passed: stock.pe > 0 && stock.pe * stock.pb < 22.5 },
  ];
}

// ── Sub-components ──────────────────────────────────────────────────────

interface StockSliderCardProps {
  stock: GrahamStock;
  percent: number;
  onChangePercent: (stockId: string, value: number) => void;
}

const StockSliderCard = memo(function StockSliderCard({ stock, percent, onChangePercent }: StockSliderCardProps) {
  const [expanded, setExpanded] = useState(false);
  const criteria = useMemo(() => getGrahamCriteria(stock), [stock]);
  const passCount = criteria.filter((c) => c.passed).length;
  const color = STOCK_COLORS[stock.id] ?? SIM4.primary;

  const handleToggle = useCallback(() => {
    tapHaptic();
    setExpanded((prev) => !prev);
  }, []);

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={cardStyles.container}>
      {/* Header row */}
      <AnimatedPressable onPress={handleToggle} style={cardStyles.header} accessibilityRole="button" accessibilityLabel={`${stock.name} — ${expanded ? 'סגור פרטים' : 'הצג פרטים'}`}>
        <Text style={cardStyles.emoji}>{stock.emoji}</Text>
        <View style={cardStyles.nameCol}>
          <Text style={[cardStyles.name, RTL]}>{stock.name}</Text>
          <Text style={[cardStyles.sector, RTL]}>{stock.sector}</Text>
        </View>
        <View style={cardStyles.criteriaTag}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
            {passCount >= 5 && <LottieIcon source={SIM_LOTTIE.shield} size={16} />}
            <Text style={[cardStyles.criteriaText, { color: passCount >= 5 ? SIM4.success : passCount >= 3 ? SIM4.warning : SIM4.danger }]}>
              {passCount}/7
            </Text>
          </View>
        </View>
      </AnimatedPressable>

      {/* Key metrics row */}
      <View style={cardStyles.metricsRow}>
        <MetricBadge label="P/E" value={stock.pe === 0 ? 'N/A' : String(stock.pe)} good={stock.pe > 0 && stock.pe < 15} />
        <MetricBadge label="P/B" value={stock.pb.toFixed(1)} good={stock.pe > 0 && stock.pe * stock.pb < 22.5} />
        <MetricBadge label="דיבידנד" value={`${stock.dividendYears} שנים`} good={stock.dividendYears >= 20} />
        <MetricBadge label="חוב/הון" value={stock.debtToEquity.toFixed(1)} good={stock.debtToEquity < 1} />
      </View>

      {/* Expanded criteria */}
      {expanded && (
        <Animated.View entering={FadeIn.duration(250)} style={cardStyles.criteriaList}>
          {criteria.map((c, i) => (
            <View key={i} style={cardStyles.criteriaRow}>
              <LottieIcon source={c.passed ? SIM_LOTTIE.check : SIM_LOTTIE.cross} size={16} />
              <Text style={[cardStyles.criteriaLabel, RTL, { color: c.passed ? SIM4.success : SIM4.danger }]}>
                {c.label}
              </Text>
            </View>
          ))}
        </Animated.View>
      )}

      {/* Slider */}
      <View style={cardStyles.sliderSection}>
        <View style={cardStyles.sliderLabelRow}>
          <Text style={[cardStyles.sliderLabel, RTL]}>הקצאה</Text>
          <Text style={[cardStyles.sliderPercent, { color }]}>{percent}%</Text>
        </View>
        <View style={cardStyles.trackContainer}>
          <View style={[cardStyles.fillBar, { width: `${(percent / 40) * 100}%`, backgroundColor: color }]} />
        </View>
        <Slider
          style={cardStyles.slider}
          minimumValue={0}
          maximumValue={40}
          step={5}
          value={percent}
          onValueChange={(val: number) => onChangePercent(stock.id, val)}
          minimumTrackTintColor="transparent"
          maximumTrackTintColor="transparent"
          thumbTintColor={color}
          accessibilityRole="adjustable"
          accessibilityLabel={`הקצאה ל-${stock.name}`}
          accessibilityValue={{ min: 0, max: 40, now: percent, text: `${percent}%` }}
        />
      </View>
    </Animated.View>
  );
});

function MetricBadge({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <View style={[cardStyles.metricBadge, { borderColor: good ? SIM4.successBorder : SIM4.dangerBorder, backgroundColor: good ? SIM4.successLight : SIM4.dangerLight }]}>
      <Text style={[cardStyles.metricValue, { color: good ? SIM4.success : SIM4.danger }]}>{value}</Text>
      <Text style={[cardStyles.metricLabel, RTL]}>{label}</Text>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: SIM4.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: SIM4.cardBorder,
    padding: 14,
    marginBottom: 12,
    shadowColor: SIM4.dark,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 10,
  },
  emoji: {
    fontSize: 28,
    marginLeft: 10,
  },
  nameCol: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: SIM4.textPrimary,
  },
  sector: {
    fontSize: 12,
    fontWeight: '600',
    color: SIM4.textSecondary,
  },
  criteriaTag: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  criteriaText: {
    fontSize: 14,
    fontWeight: '800',
  },
  metricsRow: {
    flexDirection: 'row-reverse',
    gap: 6,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  metricBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    minWidth: 60,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: SIM4.textMuted,
  },
  criteriaList: {
    borderTopWidth: 1,
    borderTopColor: SIM4.cardBorder,
    paddingTop: 8,
    marginBottom: 8,
  },
  criteriaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  criteriaIcon: {
    width: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  criteriaLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  sliderSection: {
    borderTopWidth: 1,
    borderTopColor: SIM4.cardBorder,
    paddingTop: 8,
  },
  sliderLabelRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  sliderLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: SIM4.textSecondary,
  },
  sliderPercent: {
    fontSize: 16,
    fontWeight: '800',
    minWidth: 44,
    textAlign: 'center',
  },
  trackContainer: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  fillBar: {
    height: '100%',
    borderRadius: 3,
  },
  slider: {
    width: '100%',
    height: 30,
    marginTop: -4,
  },
});

// ── Allocation bar ──────────────────────────────────────────────────────

function AllocationBar({ allocations }: { allocations: { stockId: string; percent: number }[] }) {
  const active = allocations.filter((a) => a.percent > 0);
  const total = allocations.reduce((s, a) => s + a.percent, 0);

  if (active.length === 0) {
    return (
      <View style={barStyles.container}>
        <View style={barStyles.empty}>
          <Text style={barStyles.emptyText}>הקצה תקציב למניות</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={barStyles.container}>
      <View style={barStyles.bar}>
        {active.map((a, i) => (
          <View
            key={a.stockId}
            style={[
              barStyles.slice,
              {
                flex: a.percent,
                backgroundColor: STOCK_COLORS[a.stockId] ?? SIM4.primary,
                borderTopLeftRadius: i === 0 ? 6 : 0,
                borderBottomLeftRadius: i === 0 ? 6 : 0,
                borderTopRightRadius: i === active.length - 1 ? 6 : 0,
                borderBottomRightRadius: i === active.length - 1 ? 6 : 0,
              },
            ]}
          />
        ))}
        {total < 100 && (
          <View style={[barStyles.slice, { flex: 100 - total, backgroundColor: 'rgba(255,255,255,0.15)', borderTopRightRadius: 6, borderBottomRightRadius: 6 }]} />
        )}
      </View>
      <Text style={barStyles.totalText}>
        {total}% מוקצה · {formatShekel(BUDGET * (total / 100))} מתוך {formatShekel(BUDGET)}
      </Text>
    </View>
  );
}

const barStyles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  empty: {
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: SIM4.textOnGradientMuted,
    ...SHADOW_LIGHT,
  },
  bar: {
    height: 24,
    borderRadius: 6,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  slice: {
    height: '100%',
  },
  totalText: {
    fontSize: 13,
    fontWeight: '700',
    color: SIM4.textOnGradientMuted,
    textAlign: 'center',
    marginTop: 6,
    ...SHADOW_LIGHT,
  },
});

// ── Result modal ────────────────────────────────────────────────────────

interface ResultModalProps {
  visible: boolean;
  result: GrahamResult;
  onReplay: () => void;
  onContinue: () => void;
}

function ResultModal({ visible, result, onReplay, onContinue }: ResultModalProps) {

  const gradeColor = GRADE_COLORS4[result.grade] ?? SIM4.textPrimary;
  const gradeLottie = GRADE_LOTTIES[result.grade] ?? SIM_LOTTIE.chart;
  const gradeLabel = GRADE_LABELS_TEXT[result.grade] ?? '';
  const quote = GRAHAM_QUOTES[result.grade] ?? '';

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={modalStyles.backdrop}>
        <ScrollView style={modalStyles.scrollOuter} contentContainerStyle={modalStyles.scrollContent}>
          <ConfettiExplosion />

          {/* Finn celebration */}
          <Animated.View entering={FadeInDown.duration(400)} style={{ alignItems: 'center' }}>
            <ExpoImage source={FINN_HAPPY} accessible={false} style={{ width: 80, height: 80 }} contentFit="contain" />
          </Animated.View>

          {/* Grade banner */}
          <Animated.View entering={FadeInDown.duration(600)} style={sim4Styles.gradeContainer}>
            <Text accessibilityLiveRegion="polite" style={[sim4Styles.gradeText, { color: gradeColor }]}>
              {GRADE_HEBREW[result.grade] ?? result.grade}
            </Text>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
              <LottieIcon source={gradeLottie} size={28} />
              <Text style={[sim4Styles.gradeLabel, { color: gradeColor }]}>{gradeLabel}</Text>
            </View>
          </Animated.View>

          {/* Total score */}
          <Animated.View entering={FadeInDown.duration(600).delay(200)}>
            <GlowCard glowColor={`${gradeColor}40`} style={sim4Styles.scoreCard}>
              <View style={sim4Styles.scoreCardInner}>
                <Text style={[TYPE4.cardTitle, RTL]}>ציון כולל</Text>
                <Text style={[modalStyles.heroScore, { color: gradeColor }]}>{result.totalScore}</Text>
                <Text style={[TYPE4.cardBody, RTL, { textAlign: 'center' }]}>מתוך 100</Text>
              </View>
            </GlowCard>
          </Animated.View>

          {/* Score breakdown */}
          <Animated.View entering={FadeInDown.duration(600).delay(300)}>
            <GlowCard glowColor="rgba(96,165,250,0.2)" style={sim4Styles.scoreCard}>
              <View style={sim4Styles.scoreCardInner}>
                <Text style={[TYPE4.cardTitle, RTL]}>פירוט ציונים</Text>

                <View style={sim4Styles.scoreRow}>
                  <View style={sim4Styles.scoreRowLeft}>
                    <LottieIcon source={SIM_LOTTIE.shield} size={18} />
                    <Text style={[sim4Styles.scoreRowLabel, RTL]}>ציון ערך</Text>
                  </View>
                  <Text style={[sim4Styles.scoreRowValue, { color: result.valueScore >= 25 ? SIM4.success : SIM4.warning }]}>
                    {result.valueScore}/40
                  </Text>
                </View>

                <View style={sim4Styles.scoreRow}>
                  <View style={sim4Styles.scoreRowLeft}>
                    <LottieIcon source={SIM_LOTTIE.check} size={18} />
                    <Text style={[sim4Styles.scoreRowLabel, RTL]}>ציון בטיחות</Text>
                  </View>
                  <Text style={[sim4Styles.scoreRowValue, { color: result.safetyScore >= 25 ? SIM4.success : SIM4.warning }]}>
                    {result.safetyScore}/40
                  </Text>
                </View>

                <View style={sim4Styles.scoreRow}>
                  <View style={sim4Styles.scoreRowLeft}>
                    <LottieIcon source={SIM_LOTTIE.chart} size={18} />
                    <Text style={[sim4Styles.scoreRowLabel, RTL]}>ציון פיזור</Text>
                  </View>
                  <Text style={[sim4Styles.scoreRowValue, { color: result.diversificationScore >= 15 ? SIM4.success : SIM4.warning }]}>
                    {result.diversificationScore}/20
                  </Text>
                </View>
              </View>
            </GlowCard>
          </Animated.View>

          {/* Feedback */}
          <Animated.View entering={FadeInDown.duration(600).delay(400)}>
            <GlowCard glowColor="rgba(212,175,55,0.2)" style={sim4Styles.scoreCard}>
              <View style={sim4Styles.scoreCardInner}>
                <View style={sim4Styles.insightRow}>
                  <LottieIcon source={SIM_LOTTIE.bulb} size={22} />
                  <Text style={[sim4Styles.insightText, RTL]}>{result.feedback}</Text>
                </View>
              </View>
            </GlowCard>
          </Animated.View>

          {/* Graham quote */}
          <Animated.View entering={FadeInDown.duration(600).delay(500)}>
            <GlowCard glowColor="rgba(139,92,246,0.15)" style={sim4Styles.scoreCard}>
              <View style={sim4Styles.scoreCardInner}>
                <Text style={[TYPE4.cardTitle, RTL]}>גראהם אומר...</Text>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 8 }}>
                  <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 40, height: 40 }} contentFit="contain" />
                  <Text style={[modalStyles.quoteText, RTL, { flex: 1 }]}>{quote}</Text>
                </View>
              </View>
            </GlowCard>
          </Animated.View>

          {/* Actions */}
          <Animated.View entering={FadeInUp.duration(600).delay(700)} style={sim4Styles.actionsRow}>
            <AnimatedPressable onPress={onReplay} style={sim4Styles.replayBtn} accessibilityRole="button" accessibilityLabel="שחק שוב">
              <View accessible={false}><LottieIcon source={SIM_LOTTIE.replay} size={18} /></View>
              <Text style={sim4Styles.replayText}>שחק שוב</Text>
            </AnimatedPressable>
            <AnimatedPressable onPress={onContinue} style={sim4Styles.continueBtn} accessibilityRole="button" accessibilityLabel="המשך">
              <Text style={sim4Styles.continueText}>המשך</Text>
              <View style={{ position: 'absolute', left: 16 }} accessible={false}>
                <LottieIcon source={SIM_LOTTIE.arrowLeft} size={22} />
              </View>
            </AnimatedPressable>
          </Animated.View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  scrollOuter: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
    gap: 16,
  },
  heroScore: {
    fontSize: 52,
    fontWeight: '900',
    textAlign: 'center',
    ...SHADOW_STRONG,
  },
  quoteText: {
    fontSize: 15,
    fontWeight: '600',
    color: SIM4.textSecondary,
    lineHeight: 24,
    fontStyle: 'italic',
  },
});

// ── Main screen ─────────────────────────────────────────────────────────

interface GrahamPortfolioScreenProps {
  onComplete?: (score: number) => void;
}

export function GrahamPortfolioScreen({ onComplete }: GrahamPortfolioScreenProps) {
  const {
    allocations,
    isComplete,
    result,
    setAllocation,
    submit,
    reset,
    totalAllocated,
  } = useGrahamPortfolio();

  const total = totalAllocated();
  const canSubmit = total === 100;

  // Finn notification when hitting 100%
  const [showFullNotif, setShowFullNotif] = useState(false);
  useEffect(() => {
    if (total >= 100 && !isComplete) {
      setShowFullNotif(true);
      const t = setTimeout(() => setShowFullNotif(false), 3000);
      return () => clearTimeout(t);
    }
  }, [total, isComplete]);


  const handleSliderChange = useCallback(
    (stockId: string, value: number) => {
      tapHaptic();
      setAllocation(stockId, value);
    },
    [setAllocation],
  );

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    heavyHaptic();
    submit();
  }, [canSubmit, submit]);

  const handleReplay = useCallback(() => {
    reset();
  }, [reset]);

  const handleContinue = useCallback(() => {
    onComplete?.(result?.totalScore ?? 0);
  }, [onComplete, result]);

  return (
    <SimLottieBackground lottieSources={CH4_LOTTIE} chapterColors={_th4.gradient}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.headerContainer}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
            <LottieIcon source={SIM_LOTTIE.portfolio} size={32} />
            <Text accessibilityRole="header" style={[TYPE4.title, RTL]}>בנה תיק לפי גראהם</Text>
            <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 32, height: 32 }} contentFit="contain" />
          </View>
          <Text style={[TYPE4.subtitle, RTL, { marginTop: 6 }]}>
            הקצה {formatShekel(BUDGET)} ל-10 מניות. גראהם ישפוט את הבחירות שלך.
          </Text>
        </Animated.View>

        {/* Budget bar */}
        <Animated.View entering={FadeIn.duration(400).delay(100)}>
          <AllocationBar allocations={allocations} />
        </Animated.View>

        {/* Remaining / Over budget warning */}
        {total > 100 && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.warningBanner}>
            <Text style={styles.warningText}>חריגה מהתקציב! הורד הקצאות ({total}%)</Text>
          </Animated.View>
        )}

        {/* Stock cards */}
        {GRAHAM_STOCKS.map((stock, i) => {
          const alloc = allocations.find((a) => a.stockId === stock.id);
          return (
            <StockSliderCard
              key={stock.id}
              stock={stock}
              percent={alloc?.percent ?? 0}
              onChangePercent={handleSliderChange}
            />
          );
        })}

        {/* Submit button */}
        <Animated.View entering={FadeInUp.duration(500).delay(200)} style={styles.submitContainer}>
          <AnimatedPressable
            onPress={handleSubmit}
            style={[
              sim4Styles.continueBtn,
              !canSubmit && styles.submitDisabled,
            ]}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityLabel={canSubmit ? 'בדוק את התיק' : `${total}% מתוך 100% מוקצה`}
            accessibilityState={{ disabled: !canSubmit }}
          >
            <Text style={sim4Styles.continueText}>
              {canSubmit ? 'בדוק את התיק' : `${total}% מתוך 100% מוקצה`}
            </Text>
          </AnimatedPressable>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Result modal */}
      {result && (
        <ResultModal
          visible={isComplete}
          result={result}
          onReplay={handleReplay}
          onContinue={handleContinue}
        />
      )}
      {/* Finn 100% notification */}
      {showFullNotif && (
        <Animated.View entering={FadeInUp.duration(400)} style={{ position: 'absolute', bottom: 16, left: 12, right: 12, zIndex: 50 }}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: '#ffffff', borderRadius: 14, padding: 12, borderWidth: 1.5, borderColor: '#bae6fd', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 6 }}>
            <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 36, height: 36 }} contentFit="contain" />
            <Text style={[RTL, { flex: 1, fontSize: 13, color: '#0369a1', fontWeight: '700' }]}>
              הגעת ל-100%! שנה את התמהיל או לחץ "בדוק את התיק"
            </Text>
          </View>
        </Animated.View>
      )}
    </SimLottieBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  headerContainer: {
    marginBottom: 16,
  },
  warningBanner: {
    backgroundColor: SIM4.dangerLight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: SIM4.dangerBorder,
    padding: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  warningText: {
    fontSize: 14,
    fontWeight: '700',
    color: SIM4.danger,
  },
  submitContainer: {
    marginTop: 8,
  },
  submitDisabled: {
    opacity: 0.5,
  },
});
