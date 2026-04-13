/**
 * SIM: מחשבון מרווח ביטחון (Margin of Safety Calculator)
 * Screen: analyse 5 stocks using Benjamin Graham's value investing criteria.
 */

import { useCallback } from 'react';
import { Image as ExpoImage } from "expo-image";
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SimLottieBackground } from '../../../components/ui/SimLottieBackground';
import { LottieIcon } from '../../../components/ui/LottieIcon';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { GlowCard } from '../../../components/ui/GlowCard';
import { ConfettiExplosion } from '../../../components/ui/ConfettiExplosion';
import { tapHaptic } from '../../../utils/haptics';
import { SIM_LOTTIE } from '../../shared-sim/simLottieMap';
import { FINN_STANDARD, FINN_HAPPY } from '../../retention-loops/finnMascotConfig';
import { useMarginSafety } from './useMarginSafety';
import { EXAMPLE_STOCKS } from './marginSafetyData';
import type { SafetyGrade, CriterionResult, StockInput } from './marginSafetyTypes';
import {
  SIM4,
  TYPE4,
  sim4Styles,
  GRADE_COLORS4,
  GRADE_HEBREW,
  RTL,
  SHADOW_STRONG,
  SHADOW_LIGHT,
} from './simTheme';
import { getChapterTheme } from '../../../constants/theme';


const _th4 = getChapterTheme('chapter-4');

const CH4_LOTTIE: [ReturnType<typeof require>, ReturnType<typeof require>] = [
  SIM_LOTTIE.chart,
  SIM_LOTTIE.chartGrowth,
];

/* ── Color helpers ── */

const SAFETY_COLORS: Record<SafetyGrade, { bg: string; border: string; text: string; label: string }> = {
  green: { bg: SIM4.successLight, border: SIM4.successBorder, text: SIM4.success, label: 'מוערך בחסר' },
  yellow: { bg: SIM4.warningLight, border: SIM4.warningBorder, text: SIM4.warning, label: 'שווי הוגן' },
  red: { bg: SIM4.dangerLight, border: SIM4.dangerBorder, text: SIM4.danger, label: 'מוערך ביתר' },
};

const TRAFFIC_LIGHT_COLORS: Record<SafetyGrade, string> = {
  green: '#16a34a',
  yellow: '#d97706',
  red: '#dc2626',
};

const GRADE_MAP: Record<SafetyGrade, string> = {
  green: 'A',
  yellow: 'B',
  red: 'F',
};

const GRAHAM_SUMMARY: Record<SafetyGrade, string> = {
  green: 'גראהם אומר: "מניה זולה עם מרווח ביטחון גבוה. שווה לבדוק לעומק!"',
  yellow: 'גראהם אומר: "המחיר סביר, אבל אין מספיק מרווח ביטחון. היזהר."',
  red: 'גראהם אומר: "המניה יקרה מדי. חכה למחיר נמוך יותר."',
};

/* ── Sub-components ── */

interface StockCardProps {
  stock: StockInput;
  isSelected: boolean;
  isCompleted: boolean;
  onPress: (stock: StockInput) => void;
}

function StockCard({ stock, isSelected, isCompleted, onPress }: StockCardProps) {
  return (
    <Pressable
      onPress={() => {
        tapHaptic();
        onPress(stock);
      }}
      style={[
        cardStyles.stockCard,
        isSelected && { borderColor: SIM4.primary, borderWidth: 2 },
        isCompleted && { opacity: 0.7 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={stock.name}
    >
      <Text style={cardStyles.stockEmoji}>{stock.emoji}</Text>
      <Text style={[cardStyles.stockName, RTL]} numberOfLines={1}>{stock.name}</Text>
      {isCompleted && (
        <View style={cardStyles.checkBadge}>
          <Text style={cardStyles.checkText}>✅</Text>
        </View>
      )}
    </Pressable>
  );
}

const cardStyles = StyleSheet.create({
  stockCard: {
    backgroundColor: SIM4.cardBg,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: SIM4.cardBorder,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    minWidth: 100,
    marginLeft: 10,
  },
  stockEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  stockName: {
    fontSize: 13,
    fontWeight: '700',
    color: SIM4.textPrimary,
    textAlign: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
  },
  checkText: {
    fontSize: 14,
  },
});

/* ── Metric Row ── */

function MetricRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={metricStyles.row}>
      <Text style={[metricStyles.label, RTL]}>{label}</Text>
      <Text style={[metricStyles.value, color ? { color } : undefined]}>{value}</Text>
    </View>
  );
}

const metricStyles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: SIM4.textSecondary,
  },
  value: {
    fontSize: 15,
    fontWeight: '800',
    color: SIM4.textPrimary,
  },
});

/* ── Criterion Check Item ── */

function CriterionItem({ criterion }: { criterion: CriterionResult }) {
  return (
    <View style={criterionStyles.row}>
      <Text style={criterionStyles.icon}>{criterion.passed ? '✅' : '❌'}</Text>
      <View style={criterionStyles.textCol}>
        <Text style={[criterionStyles.label, RTL]}>
          {criterion.label}: {criterion.value}
        </Text>
        <Text style={[criterionStyles.threshold, RTL]}>
          גראהם: {criterion.threshold}
        </Text>
      </View>
    </View>
  );
}

const criterionStyles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
  },
  icon: {
    fontSize: 18,
  },
  textCol: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: SIM4.textPrimary,
  },
  threshold: {
    fontSize: 12,
    fontWeight: '600',
    color: SIM4.textMuted,
  },
});

/* ── Score Screen ── */

function ScoreScreen({
  averageScore,
  onReplay,
  onContinue,
}: {
  averageScore: number;
  onReplay: () => void;
  onContinue: () => void;
}) {
  const grade = averageScore >= 80 ? 'S' : averageScore >= 60 ? 'A' : averageScore >= 40 ? 'B' : 'C';
  const gradeColor = GRADE_COLORS4[grade] || SIM4.textPrimary;

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 }]}>
      <ConfettiExplosion />

      {/* Grade card — white, clean */}
      <Animated.View entering={FadeInDown.duration(500)}>
        <View style={{
          backgroundColor: '#ffffff',
          borderRadius: 24,
          padding: 24,
          alignItems: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
          marginBottom: 14,
        }}>
          <ExpoImage source={FINN_HAPPY} accessible={false} style={{ width: 64, height: 64, marginBottom: 8 }} contentFit="contain" />
          <Text accessibilityLiveRegion="polite" style={{ fontSize: 42, fontWeight: '900', color: '#0c4a6e', marginBottom: 4 }}>
            {GRADE_HEBREW[grade] ?? grade}
          </Text>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#64748b', textAlign: 'center', writingDirection: 'rtl' }}>
            ניתחת מניות בשיטת גראהם
          </Text>
          <View style={{ backgroundColor: '#f0f9ff', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, marginTop: 12, borderWidth: 1, borderColor: '#bae6fd' }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#0369a1' }}>{averageScore} / 100</Text>
          </View>
        </View>
      </Animated.View>

      {/* Per-stock summary — white card */}
      <Animated.View entering={FadeInDown.duration(500).delay(200)}>
        <View style={{
          backgroundColor: '#ffffff',
          borderRadius: 20,
          padding: 16,
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 3 },
          elevation: 4,
          marginBottom: 14,
        }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a', textAlign: 'right', writingDirection: 'rtl', marginBottom: 10 }}>סיכום מניות</Text>
          {EXAMPLE_STOCKS.map((stock) => {
            const intrinsic = (stock.eps * (8.5 + 2 * stock.growthRate) * 4.4) / stock.aaaYield;
            const mos = ((intrinsic - stock.price) / intrinsic) * 100;
            const g: SafetyGrade = mos > 30 ? 'green' : mos >= 0 ? 'yellow' : 'red';
            const badgeColor = g === 'green' ? '#dcfce7' : g === 'yellow' ? '#fef3c7' : '#fee2e2';
            const badgeBorder = g === 'green' ? '#bbf7d0' : g === 'yellow' ? '#fde68a' : '#fecaca';
            const badgeText = g === 'green' ? '#166534' : g === 'yellow' ? '#92400e' : '#991b1b';
            const sc = SAFETY_COLORS[g];
            return (
              <View key={stock.id} style={{ flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 8 }}>
                <View style={{ backgroundColor: '#0c4a6e', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>{stock.id}</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: '#1e293b', writingDirection: 'rtl', textAlign: 'right' }}>{stock.name}</Text>
                <View style={{ backgroundColor: badgeColor, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: badgeBorder }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: badgeText }}>{sc.label}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </Animated.View>

      {/* Finn lesson */}
      <Animated.View entering={FadeInDown.duration(500).delay(350)}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10, backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: '#bae6fd', marginBottom: 14 }}>
          <LottieIcon source={SIM_LOTTIE.bulb} size={24} />
          <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: '#0c4a6e', lineHeight: 22, writingDirection: 'rtl', textAlign: 'right' }}>
            מרווח ביטחון הוא הסוד להשקעה חכמה. קנה רק כשהמחיר נמוך מהשווי האמיתי.
          </Text>
        </View>
      </Animated.View>

      {/* Actions */}
      <Animated.View entering={FadeInUp.duration(500).delay(500)} style={sim4Styles.actionsRow}>
        <AnimatedPressable onPress={onReplay} style={sim4Styles.replayBtn} accessibilityRole="button" accessibilityLabel="שחק שוב">
          <View accessible={false}><LottieIcon source={SIM_LOTTIE.replay} size={18} /></View>
          <Text style={sim4Styles.replayText}>שחק שוב</Text>
        </AnimatedPressable>
        <AnimatedPressable onPress={onContinue} style={sim4Styles.continueBtn} accessibilityRole="button" accessibilityLabel="המשך">
          <Text style={sim4Styles.continueText}>המשך</Text>
        </AnimatedPressable>
      </Animated.View>
    </ScrollView>
  );
}

/* ── Main Screen ── */

interface MarginSafetyScreenProps {
  onComplete?: (score: number) => void;
}

export function MarginSafetyScreen({ onComplete }: MarginSafetyScreenProps) {
  const {
    selectedStock,
    completedIds,
    valuation,
    allComplete,
    averageScore,
    selectStock,
    markCompleted,
    skipToSummary,
    reset,
  } = useMarginSafety();


  // Mark current stock as completed when user views its valuation and taps "next"
  const handleNextStock = useCallback(() => {
    tapHaptic();
    markCompleted();
  }, [markCompleted]);

  const handleReplay = useCallback(() => {
    reset();
  }, [reset]);

  const handleContinue = useCallback(() => {
    onComplete?.(averageScore);
  }, [onComplete, averageScore]);

  // Score screen
  if (allComplete) {
    return (
      <SimLottieBackground lottieSources={CH4_LOTTIE} chapterColors={_th4.gradient}>
        <ScoreScreen
          averageScore={averageScore}
          onReplay={handleReplay}
          onContinue={handleContinue}
        />
      </SimLottieBackground>
    );
  }

  const safetyStyle = valuation ? SAFETY_COLORS[valuation.grade] : null;
  const passedCount = valuation
    ? valuation.criteriaResults.filter((c) => c.passed).length
    : 0;

  return (
    <SimLottieBackground lottieSources={CH4_LOTTIE} chapterColors={_th4.gradient}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
            <LottieIcon source={SIM_LOTTIE.shield} size={28} style={{ marginTop: 2 }} />
            <Text accessibilityRole="header" style={[TYPE4.title, RTL]}>מחשבון מרווח ביטחון</Text>
          </View>
          <Text style={[TYPE4.subtitle, RTL]}>
            בחר מניה וגלה אם גראהם היה קונה אותה
          </Text>
        </Animated.View>

        {/* Progress bar — RTL */}
        <Animated.View entering={FadeInDown.duration(500).delay(50)} style={{ transform: [{ scaleX: -1 }] }}>
          <View style={sim4Styles.progressTrack}>
            <LinearGradient
              colors={[SIM4.gradient[0], SIM4.gradient[1]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                sim4Styles.progressFill,
                { width: `${(completedIds.size / EXAMPLE_STOCKS.length) * 100}%` },
              ]}
            />
          </View>
        </Animated.View>

        {/* Stock selector */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)}>
          <Text style={[TYPE4.gradientLabel, RTL, { marginTop: 16, marginBottom: 8 }]}>
            בחר מניה לניתוח:
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stockRow}
          >
            {EXAMPLE_STOCKS.map((stock) => (
              <StockCard
                key={stock.id}
                stock={stock}
                isSelected={selectedStock?.id === stock.id}
                isCompleted={completedIds.has(stock.id)}
                onPress={selectStock}
              />
            ))}
          </ScrollView>
        </Animated.View>

        {/* Selected stock details */}
        {selectedStock && valuation && safetyStyle && (
          <Animated.View entering={FadeIn.duration(400)}>
            {/* Input summary card */}
            <GlowCard glowColor="rgba(96, 165, 250, 0.2)" style={[sim4Styles.scoreCard, { marginTop: 16 }]}>
              <View style={sim4Styles.scoreCardInner}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 24 }}>{selectedStock.emoji}</Text>
                  <Text style={[TYPE4.cardTitle, RTL]}>{selectedStock.name}</Text>
                </View>
                <MetricRow label="מחיר שוק" value={`$${selectedStock.price}`} />
                <MetricRow label="רווח למניה (EPS)" value={`$${selectedStock.eps}`} />
                <MetricRow label="שווי בספרים" value={`$${selectedStock.bookValue}`} />
                <MetricRow label="תשואת דיבידנד" value={`${selectedStock.dividendYield}%`} />
                <MetricRow label="חוב/הון" value={selectedStock.debtToEquity.toFixed(2)} />
                <MetricRow label="שנות רווחיות" value={`${selectedStock.yearsProfitable}`} />
                <MetricRow label="צמיחה צפויה" value={`${selectedStock.growthRate}%`} />
              </View>
            </GlowCard>

            {/* Traffic light + grade */}
            <Animated.View entering={FadeInDown.duration(400).delay(100)}>
              <GlowCard
                glowColor={`${TRAFFIC_LIGHT_COLORS[valuation.grade]}33`}
                style={[sim4Styles.scoreCard, { marginTop: 12 }]}
              >
                <View style={sim4Styles.scoreCardInner}>
                  <View style={styles.trafficLightRow}>
                    <View
                      style={[
                        styles.trafficDot,
                        {
                          backgroundColor: TRAFFIC_LIGHT_COLORS[valuation.grade],
                          shadowColor: TRAFFIC_LIGHT_COLORS[valuation.grade],
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.gradeLabel,
                        RTL,
                        { color: safetyStyle.text },
                      ]}
                    >
                      {safetyStyle.label}
                    </Text>
                  </View>

                  {/* Margin of Safety - hero number */}
                  <View style={styles.mosHero}>
                    <Text
                      style={[
                        styles.mosValue,
                        { color: TRAFFIC_LIGHT_COLORS[valuation.grade] },
                      ]}
                    >
                      {valuation.marginOfSafety > 0 ? '+' : ''}{valuation.marginOfSafety}%
                    </Text>
                    <Text style={[TYPE4.smallLabel, RTL]}>מרווח ביטחון</Text>
                  </View>
                </View>
              </GlowCard>
            </Animated.View>

            {/* P/E and P/B badges */}
            <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: valuation.pe < 15 ? SIM4.successLight : SIM4.dangerLight, borderColor: valuation.pe < 15 ? SIM4.successBorder : SIM4.dangerBorder }]}>
                <Text style={[styles.badgeValue, { color: valuation.pe < 15 ? SIM4.success : SIM4.danger }]}>
                  P/E {valuation.pe.toFixed(1)}
                </Text>
                <Text style={[styles.badgeHint, RTL]}>גראהם המליץ מתחת ל-15</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: valuation.pb < 1.5 ? SIM4.successLight : SIM4.dangerLight, borderColor: valuation.pb < 1.5 ? SIM4.successBorder : SIM4.dangerBorder }]}>
                <Text style={[styles.badgeValue, { color: valuation.pb < 1.5 ? SIM4.success : SIM4.danger }]}>
                  P/B {valuation.pb.toFixed(2)}
                </Text>
                <Text style={[styles.badgeHint, RTL]}>גראהם המליץ מתחת ל-1.5</Text>
              </View>
            </Animated.View>

            {/* Graham Number + Intrinsic Value */}
            <Animated.View entering={FadeInDown.duration(400).delay(300)}>
              <GlowCard glowColor="rgba(212, 175, 55, 0.2)" style={[sim4Styles.scoreCard, { marginTop: 12 }]}>
                <View style={sim4Styles.scoreCardInner}>
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                    <LottieIcon source={SIM_LOTTIE.money} size={22} style={{ marginTop: 2 }} />
                    <Text style={[TYPE4.cardTitle, RTL]}>הערכות שווי</Text>
                  </View>
                  <MetricRow
                    label="מספר גראהם"
                    value={`$${valuation.grahamNumber.toFixed(2)}`}
                    color={valuation.grahamNumber > selectedStock.price ? SIM4.success : SIM4.danger}
                  />
                  <MetricRow
                    label="שווי פנימי (נוסחת גראהם)"
                    value={`$${valuation.intrinsicValue.toFixed(2)}`}
                    color={valuation.intrinsicValue > selectedStock.price ? SIM4.success : SIM4.danger}
                  />
                  <MetricRow label="מחיר שוק" value={`$${selectedStock.price}`} />
                </View>
              </GlowCard>
            </Animated.View>

            {/* 6 Criteria checklist */}
            <Animated.View entering={FadeInDown.duration(400).delay(400)}>
              <GlowCard glowColor="rgba(96, 165, 250, 0.15)" style={[sim4Styles.scoreCard, { marginTop: 12 }]}>
                <View style={sim4Styles.scoreCardInner}>
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                    <LottieIcon source={SIM_LOTTIE.chart} size={22} style={{ marginTop: 2 }} />
                    <Text style={[TYPE4.cardTitle, RTL]}>
                      קריטריונים של גראהם ({passedCount}/6)
                    </Text>
                  </View>
                  {valuation.criteriaResults.map((c, i) => (
                    <CriterionItem key={i} criterion={c} />
                  ))}
                </View>
              </GlowCard>
            </Animated.View>

            {/* Graham says... */}
            <Animated.View entering={FadeInDown.duration(400).delay(500)}>
              <GlowCard
                glowColor={`${TRAFFIC_LIGHT_COLORS[valuation.grade]}22`}
                style={[sim4Styles.scoreCard, { marginTop: 12 }]}
              >
                <View style={sim4Styles.scoreCardInner}>
                  <View style={sim4Styles.insightRow}>
                    <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 36, height: 36 }} contentFit="contain" />
                    <LottieIcon source={SIM_LOTTIE.bulb} size={22} style={{ marginTop: 2 }} />
                    <Text style={sim4Styles.insightText}>
                      {GRAHAM_SUMMARY[valuation.grade]}
                    </Text>
                  </View>
                </View>
              </GlowCard>
            </Animated.View>

            {/* Next stock button */}
            <Animated.View entering={FadeInUp.duration(400).delay(600)} style={{ marginTop: 16 }}>
              {completedIds.has(selectedStock.id) ? (
                <Text style={[TYPE4.gradientValue, { textAlign: 'center' }]}>
                  מניה זו כבר נותחה - בחר מניה אחרת
                </Text>
              ) : (
                <View style={{ gap: 10 }}>
                  <AnimatedPressable onPress={handleNextStock} style={sim4Styles.continueBtn} accessibilityRole="button" accessibilityLabel="המניה הבאה">
                    <Text style={sim4Styles.continueText}>המניה הבאה</Text>
                  </AnimatedPressable>
                  {completedIds.size >= 1 && (
                    <AnimatedPressable onPress={() => { tapHaptic(); markCompleted(); skipToSummary(); }} style={sim4Styles.replayBtn} accessibilityRole="button" accessibilityLabel="לסיכום">
                      <Text style={sim4Styles.replayText}>לסיכום →</Text>
                    </AnimatedPressable>
                  )}
                </View>
              )}
            </Animated.View>
          </Animated.View>
        )}

        {/* Prompt to select if nothing chosen */}
        {!selectedStock && (
          <Animated.View entering={FadeIn.duration(400)} style={styles.emptyPrompt}>
            <LottieIcon source={SIM_LOTTIE.chart} size={48} />
            <Text style={[TYPE4.gradientValue, RTL, { textAlign: 'center', marginTop: 12 }]}>
              בחר מניה מהרשימה למעלה
            </Text>
            <Text style={[TYPE4.gradientLabel, RTL, { textAlign: 'center', marginTop: 4 }]}>
              נבדוק אותה לפי שיטת בנג׳מין גראהם
            </Text>
          </Animated.View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SimLottieBackground>
  );
}

/* ── Styles ── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 60,
  },
  header: {
    marginBottom: 16,
  },
  progressRow: {
    marginBottom: 6,
  },
  stockRow: {
    paddingVertical: 8,
    paddingRight: 4,
  },
  trafficLightRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  trafficDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  gradeLabel: {
    fontSize: 18,
    fontWeight: '900',
  },
  mosHero: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  mosValue: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 1,
  },
  badgeRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginTop: 12,
  },
  badge: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  badgeValue: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 2,
  },
  badgeHint: {
    fontSize: 11,
    fontWeight: '600',
    color: SIM4.textMuted,
    textAlign: 'center',
  },
  heroValue: {
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    marginVertical: 6,
  },
  emptyPrompt: {
    alignItems: 'center',
    marginTop: 40,
  },
  summaryRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
  },
  summaryEmoji: {
    fontSize: 20,
  },
  summaryName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: SIM4.textPrimary,
  },
  summaryBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  summaryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
