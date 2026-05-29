import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { ZoomIn } from 'react-native-reanimated';
import {
  Calculator,
  PiggyBank,
  Sparkles,
} from 'lucide-react-native';

import { STITCH } from '../../../constants/theme';
import { clamp, formatShekel } from '../../../utils/format';
import { tapHaptic } from '../../../utils/haptics';
import { findTool } from '../toolsRegistry';
import { ToolHeader } from '../components/ToolHeader';
import { ProfileFingerprint } from '../components/ProfileFingerprint';
import { ToolNextStepCard } from '../components/ToolNextStepCard';
import { buildPensionInitial } from '../financialProfile';
import { useFinancialProfileStore } from '../useFinancialProfileStore';
import {
  CalculateButton,
  FinTip,
  LegalDisclaimer,
  MoneyInput,
  MoneySlider,
  SectionLabel,
  StatHero,
} from '../components/atoms';
import { PensionBenchmarkCard } from '../components/PensionBenchmarkCard';

const TOOL = findTool('pension-fees')!;
const NEUTRAL_DIM = '#f3f4f6';
const NEUTRAL_DARK = '#475569';

const RETIREMENT_AGE = 67;
const TOTAL_DEPOSIT_RATE = 0.185; // 6% עובד + 6.5% מעסיק + 6% פיצויים
// Pension conversion factor — updated 2026-05 from Warren research. Modern
// actuarial tables for a 67-y-o male trend toward 185-190 as longevity rises;
// 190 is a current central estimate (older textbook value was 200).
const PAYOUT_FACTOR = 190;

const SALARY_MIN = 5_000;
const SALARY_MAX = 60_000;
const SALARY_STEP = 500;

/**
 * Trivially achievable lowest fees on the Israeli market — caps from the
 * current "default track" (קרן ברירת מחדל) tender that took effect Nov 1 2024
 * and is valid through Nov 30 2028. Winners: Meitav, Altshuler Shacham, Mor,
 * Infinity. Last verified by Warren agent: 2026-05.
 */
const LOWEST_MARKET_DEPOSIT_FEE = 1.0;
const LOWEST_MARKET_ACCUMULATION_FEE = 0.22;

/** Future-value reference return for the "what if you invested the savings" projection. */
const SIDE_RETURN_MONTHLY = 0.07 / 12;

/**
 * Pure month-by-month simulation. Compounds the running balance at the
 * net monthly return (gross return − accumulation-fee drag) and adds the
 * net monthly deposit (after deposit fee) each month.
 */
function simulatePension(
  monthlySalary: number,
  years: number,
  annualReturn: number,
  depositFeeRate: number,
  accumulationFeeRate: number,
): number {
  const monthlyDeposit = monthlySalary * TOTAL_DEPOSIT_RATE;
  const monthlyReturnGross = annualReturn / 100 / 12;
  const monthlyFeeOnAccumulation = accumulationFeeRate / 100 / 12;
  const monthlyReturnNet = monthlyReturnGross - monthlyFeeOnAccumulation;
  const monthlyDepositNet = monthlyDeposit * (1 - depositFeeRate / 100);

  let balance = 0;
  const months = years * 12;
  for (let i = 0; i < months; i++) {
    balance = balance * (1 + monthlyReturnNet) + monthlyDepositNet;
  }
  return balance;
}

interface PensionInput {
  age: number;
  monthlySalary: string;
  currentDepositFee: number;
  currentAccumulationFee: number;
  alternativeDepositFee: number;
  alternativeAccumulationFee: number;
  expectedReturn: number;
}

interface PensionResult {
  yearsToRetirement: number;
  currentTotal: number;
  alternativeTotal: number;
  /** What you'd accumulate with zero fees — reference baseline for `totalFeesPaid`. */
  zeroFeeTotal: number;
  /** Total taken by the *current* fund (vs zero-fee baseline). Shown in StatHero. */
  totalFeesPaid: number;
  /** Extra you'd have if you switched to the alternative low-cost fund. */
  potentialSavings: number;
  monthlyPensionCurrent: number;
  monthlyPensionAlternative: number;
}

const DEFAULT_STATE: PensionInput = {
  age: 30,
  monthlySalary: '15000',
  currentDepositFee: 3.0,
  currentAccumulationFee: 0.3,
  alternativeDepositFee: LOWEST_MARKET_DEPOSIT_FEE,
  alternativeAccumulationFee: LOWEST_MARKET_ACCUMULATION_FEE,
  expectedReturn: 5.0,
};

function computePension(input: PensionInput): PensionResult {
  const salary = Number(input.monthlySalary) || 0;
  const years = Math.max(0, RETIREMENT_AGE - input.age);

  const currentTotal = simulatePension(
    salary,
    years,
    input.expectedReturn,
    input.currentDepositFee,
    input.currentAccumulationFee,
  );
  const alternativeTotal = simulatePension(
    salary,
    years,
    input.expectedReturn,
    input.alternativeDepositFee,
    input.alternativeAccumulationFee,
  );
  // Zero-fee baseline — what the user *could* accumulate if the fund took
  // zero fees. The gap (zeroFee − current) is the "total taken by the
  // investment house" headline.
  const zeroFeeTotal = simulatePension(salary, years, input.expectedReturn, 0, 0);

  return {
    yearsToRetirement: years,
    currentTotal: Math.round(currentTotal),
    alternativeTotal: Math.round(alternativeTotal),
    zeroFeeTotal: Math.round(zeroFeeTotal),
    totalFeesPaid: Math.max(0, Math.round(zeroFeeTotal - currentTotal)),
    potentialSavings: Math.max(0, Math.round(alternativeTotal - currentTotal)),
    monthlyPensionCurrent: Math.round(currentTotal / PAYOUT_FACTOR),
    monthlyPensionAlternative: Math.round(alternativeTotal / PAYOUT_FACTOR),
  };
}

export function PensionFeesComparator(): React.ReactElement {
  // State split — live inputs drive the slider positions + the CALC button
  // preview; committed inputs drive every output card below (StatHero, the
  // current↔alternative comparison columns, PensionBenchmarkCard, savings
  // card). CALC commits live → committed and re-fires the ZoomIn ceremony.
  const initial = useMemo<PensionInput>(() => {
    const overrides = buildPensionInitial(useFinancialProfileStore.getState().profile, {
      age: DEFAULT_STATE.age,
      monthlySalary: DEFAULT_STATE.monthlySalary,
      currentDepositFee: DEFAULT_STATE.currentDepositFee,
      currentAccumulationFee: DEFAULT_STATE.currentAccumulationFee,
    });
    return { ...DEFAULT_STATE, ...overrides };
  }, []);
  const [state, setState] = useState<PensionInput>(initial);
  const [committedState, setCommittedState] = useState<PensionInput>(initial);
  const [commitCount, setCommitCount] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const result: PensionResult = useMemo(() => computePension(committedState), [committedState]);
  const livePreview: PensionResult = useMemo(() => computePension(state), [state]);

  const handleCalculate = useCallback(() => {
    setCommittedState(state);
    setCommitCount((c) => c + 1);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }, 100);
  }, [state]);

  // StatHero headline value — total taken by the current fund (vs zero-fee baseline).
  const hasFees = result.totalFeesPaid > 0;
  const hasPotentialSavings = result.potentialSavings > 0;
  const liveDiffers = livePreview.totalFeesPaid !== result.totalFeesPaid;
  // Slider position must reflect live input — not the frozen committed value.
  const salarySlider = clamp(Number(state.monthlySalary) || SALARY_MIN, SALARY_MIN, SALARY_MAX);

  /**
   * Monthly equivalent of the potential savings (vs the alternative low-cost
   * fund), and the FV-of-annuity projection if that monthly delta were
   * invested in a global index at 7% nominal — used in the savings card to
   * dramatize "what if you switched and reinvested the difference".
   */
  const savings = useMemo(() => {
    const monthsToRetirement = Math.max(1, result.yearsToRetirement * 12);
    const monthlyFeeSavings = Math.max(0, Math.round(result.potentialSavings / monthsToRetirement));
    const savingsGrowth =
      monthlyFeeSavings > 0
        ? Math.round(
            (monthlyFeeSavings * (Math.pow(1 + SIDE_RETURN_MONTHLY, monthsToRetirement) - 1)) /
              SIDE_RETURN_MONTHLY,
          )
        : 0;
    return { monthlyFeeSavings, savingsGrowth };
  }, [result.potentialSavings, result.yearsToRetirement]);
  const { monthlyFeeSavings, savingsGrowth } = savings;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ToolHeader
        title="דמי ניהול פנסיה"
        subtitle="כמה אבד לך לבית ההשקעות לאורך הצבירה?"
        accentColor={TOOL.hue}
        Icon={PiggyBank}
        toolKey="pension-fees"
      />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ProfileFingerprint accentColor={TOOL.hue} />

        {/* ─── INPUTS — top of the screen ─── */}
        <SectionLabel>הנתונים שלך</SectionLabel>

        <View style={styles.inputCard}>
          <MoneyInput
            label="שכר חודשי ברוטו"
            value={state.monthlySalary}
            onChangeText={(v) => setState((p) => ({ ...p, monthlySalary: v }))}
            placeholder="15,000"
            accentColor={TOOL.hue}
            step={500}
            min={SALARY_MIN}
            max={SALARY_MAX}
          />
          <View style={styles.sliderWrap}>
            <MoneySlider
              label="החליקו לבחירת שכר"
              value={salarySlider}
              onChange={(v) => setState((p) => ({ ...p, monthlySalary: String(v) }))}
              min={SALARY_MIN}
              max={SALARY_MAX}
              step={SALARY_STEP}
              unit=" ₪"
              accentColor={TOOL.hue}
              hideValueDisplay
            />
          </View>
        </View>

        <View style={styles.inputCard}>
          <MoneySlider
            label="גיל נוכחי"
            value={state.age}
            onChange={(v) => setState((p) => ({ ...p, age: v }))}
            min={18}
            max={66}
            step={1}
            unit=""
            accentColor={TOOL.hue}
            formatValue={(v) => String(v)}
          />
        </View>

        <SectionLabel>הקרן הנוכחית — דמי ניהול</SectionLabel>

        <View style={styles.feeCard}>
          <MoneySlider
            label="דמי ניהול מהפקדה"
            value={state.currentDepositFee}
            onChange={(v) => setState((p) => ({ ...p, currentDepositFee: v }))}
            min={0}
            max={6}
            step={0.1}
            unit="%"
            accentColor={NEUTRAL_DARK}
          />
          <MoneySlider
            label="דמי ניהול מצבירה (שנתי)"
            value={state.currentAccumulationFee}
            onChange={(v) => setState((p) => ({ ...p, currentAccumulationFee: v }))}
            min={0}
            max={1}
            step={0.05}
            unit="%"
            accentColor={NEUTRAL_DARK}
          />
        </View>

        <View style={styles.cardTitleRow}>
          <View style={[styles.cardTitleBadge, { backgroundColor: TOOL.light }]}>
            <Sparkles size={12} color={TOOL.deep} />
            <Text style={[styles.cardTitleBadgeText, { color: TOOL.deep }]}>שווי שוק 2026</Text>
          </View>
          <SectionLabel>להשוואה — דמי ניהול</SectionLabel>
        </View>

        <View style={styles.feeCard}>
          <MoneySlider
            label="דמי ניהול מהפקדה"
            value={state.alternativeDepositFee}
            onChange={(v) => setState((p) => ({ ...p, alternativeDepositFee: v }))}
            min={0}
            max={6}
            step={0.1}
            unit="%"
            accentColor={TOOL.hue}
          />
          <MoneySlider
            label="דמי ניהול מצבירה (שנתי)"
            value={state.alternativeAccumulationFee}
            onChange={(v) => setState((p) => ({ ...p, alternativeAccumulationFee: v }))}
            min={0}
            max={1}
            step={0.05}
            unit="%"
            accentColor={TOOL.hue}
          />
        </View>

        <SectionLabel>תשואה צפויה</SectionLabel>
        <View style={styles.feeCard}>
          <MoneySlider
            label="תשואה שנתית ברוטו (לפני דמי ניהול)"
            value={state.expectedReturn}
            onChange={(v) => setState((p) => ({ ...p, expectedReturn: v }))}
            min={2}
            max={8}
            step={0.1}
            unit="%"
            accentColor={TOOL.hue}
          />
          <Text style={styles.helper}>
            הממוצע ההיסטורי של קרנות פנסיה בישראל: 4%–5% נטו לשנה.
          </Text>
        </View>

        {/* Primary commit — locks current inputs into the outputs below and
            re-fires the ZoomIn ceremony. Sublabel previews the uncommitted
            fee total so the user sees the impact of their last change. */}
        <CalculateButton
          label="חשב"
          sublabel={
            liveDiffers
              ? `דמי ניהול משוערים: ${formatShekel(livePreview.totalFeesPaid)}`
              : 'תוצאה עדכנית'
          }
          variant="blue"
          iconLeft={<Calculator size={18} color="#ffffff" strokeWidth={2.6} />}
          onPress={handleCalculate}
        />

        {/* ─── OUTPUTS — what your inputs mean ─── */}
        {/* StatHero re-mounted on every commit so the ZoomIn + count-up
            ceremony replays together. */}
        <Animated.View key={commitCount} entering={ZoomIn.springify().damping(8).mass(0.6)}>
          <StatHero
            label={
              hasFees
                ? 'הלכו לבית ההשקעות במקום אליך'
                : 'אין דמי ניהול — מצוין!'
            }
            value={result.totalFeesPaid}
            accentColor={TOOL.hue}
            disableEntering
            sublabel={`סה"כ דמי ניהול לאורך ${result.yearsToRetirement} שנים עד גיל פרישה`}
          />
        </Animated.View>

        {/* Comparison — RTL reading flow: current (before) on the right,
            alternative (after) on the left. */}
        <View style={styles.compareWrap}>
          <ComparisonColumn
            title="הקרן הנוכחית"
            total={result.currentTotal}
            monthly={result.monthlyPensionCurrent}
          />
          <ComparisonColumn
            title="להשוואה"
            total={result.alternativeTotal}
            monthly={result.monthlyPensionAlternative}
            highlight
          />
        </View>

        <PensionBenchmarkCard
          age={committedState.age}
          monthlySalary={Number(committedState.monthlySalary) || 0}
          currentDepositFee={committedState.currentDepositFee}
          currentAccumulationFee={committedState.currentAccumulationFee}
          accentColor={TOOL.hue}
        />

        {hasPotentialSavings && monthlyFeeSavings > 0 ? (
          <View style={styles.savingsCard}>
            <View style={styles.savingsTopRow}>
              <View style={styles.savingsMonthlyWrap}>
                <Text style={styles.savingsMonthlyLabel}>חיסכון פוטנציאלי</Text>
                <Text style={styles.savingsMonthlyValue}>
                  {formatShekel(monthlyFeeSavings)}
                  <Text style={styles.savingsMonthlySuffix}> / חודש</Text>
                </Text>
              </View>
            </View>
            <Text style={styles.savingsCaption}>
              אם תקח את ה-{formatShekel(monthlyFeeSavings)} האלה ותפקיד אותם בקרן מדדים גלובלית
              ב-7% תשואה, ב-{result.yearsToRetirement} שנים זה גדל ל-
              <Text style={styles.savingsCaptionStrong}>{formatShekel(savingsGrowth)}</Text>.
            </Text>
          </View>
        ) : null}

        <FinTip
          kind="secret"
          text='"0.1% דמי ניהול מצבירה זה לא קטן."'
          subtext={`על פני ${Math.max(20, result.yearsToRetirement)} שנה — זה אגף שלם בדירה.`}
        />

        <CalculateButton
          label="חברו את החשבונות שלכם ותראו את הפוטנציאל האמיתי לחסוך"
          sublabel={
            hasPotentialSavings
              ? `פוטנציאל חיסכון משוער ${formatShekel(result.potentialSavings)}`
              : undefined
          }
          variant="pink"
          onPress={() => {
            tapHaptic();
            router.push('/bridge?tab=insurance' as never);
          }}
        />

        <ToolNextStepCard toolKey="pension-fees" accentColor={TOOL.hue} />

        <LegalDisclaimer
          scope="pension"
          extra="המבוסס על הפקדה של 18.5% מהשכר (עובד + מעסיק + פיצויים) ותשואה קבועה לאורך כל התקופה. ממוצעי שוק הם הערכה ועלולים להשתנות."
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function ComparisonColumn({
  title,
  total,
  monthly,
  highlight = false,
}: {
  title: string;
  total: number;
  monthly: number;
  highlight?: boolean;
}): React.ReactElement {
  return (
    <View
      style={[
        styles.compareCol,
        {
          backgroundColor: highlight ? TOOL.light : NEUTRAL_DIM,
          borderColor: highlight ? TOOL.hue : STITCH.surfaceHighest,
        },
      ]}
    >
      <Text
        style={[styles.compareTitle, { color: highlight ? TOOL.deep : NEUTRAL_DARK }]}
      >
        {title}
      </Text>
      <Text
        style={[styles.compareTotal, { color: highlight ? TOOL.deep : STITCH.onSurface }]}
      >
        {formatShekel(total)}
      </Text>
      <Text style={styles.compareTotalLabel}>סה"כ צבירה</Text>
      <View style={styles.compareDivider} />
      <Text
        style={[styles.compareMonthly, { color: highlight ? TOOL.deep : STITCH.onSurface }]}
      >
        {formatShekel(monthly)}
      </Text>
      <Text style={styles.compareMonthlyLabel}>קצבה חודשית</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: STITCH.background },
  scroll: { padding: 16, paddingBottom: 80, gap: 14 },

  compareWrap: { flexDirection: 'row-reverse', gap: 10 },
  compareCol: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: 'flex-end',
  },
  compareTitle: {
    fontSize: 12,
    fontWeight: '700',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  compareTotal: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 6,
    writingDirection: 'rtl',
  },
  compareTotalLabel: {
    fontSize: 11,
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
  },
  compareDivider: {
    alignSelf: 'stretch',
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginVertical: 10,
  },
  compareMonthly: { fontSize: 16, fontWeight: '700', writingDirection: 'rtl' },
  compareMonthlyLabel: {
    fontSize: 11,
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
  },

  // Monthly savings insight card
  savingsCard: {
    backgroundColor: STITCH.surfaceLowest,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: TOOL.hue + '40',
    shadowColor: TOOL.hue,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: 6,
  },
  savingsTopRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  savingsMonthlyWrap: { alignItems: 'flex-end' },
  savingsMonthlyLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
    letterSpacing: 0.3,
  },
  savingsMonthlyValue: {
    fontSize: 26,
    fontWeight: '900',
    color: TOOL.hue,
    letterSpacing: -0.5,
    marginTop: 2,
    writingDirection: 'rtl',
  },
  savingsMonthlySuffix: {
    fontSize: 14,
    fontWeight: '700',
    color: STITCH.onSurfaceVariant,
  },
  savingsCaption: {
    fontSize: 12,
    color: STITCH.onSurface,
    writingDirection: 'rtl',
    textAlign: 'right',
    lineHeight: 19,
    fontWeight: '600',
  },
  savingsCaptionStrong: { color: TOOL.hue, fontWeight: '900' },

  cardTitleRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  cardTitleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    writingDirection: 'rtl',
  },

  inputCard: {
    backgroundColor: STITCH.surfaceLowest,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
    gap: 8,
  },
  sliderWrap: { paddingHorizontal: 2, paddingTop: 4 },
  feeCard: {
    backgroundColor: STITCH.surfaceLowest,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
    gap: 14,
  },
  helper: {
    fontSize: 11,
    color: STITCH.onSurfaceVariant,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  disclaimer: {
    fontSize: 11,
    color: STITCH.onSurfaceVariant,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: 8,
    lineHeight: 16,
  },
});
