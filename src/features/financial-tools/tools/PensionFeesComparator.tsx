import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, PiggyBank, Share2 } from 'lucide-react-native';

import { STITCH } from '../../../constants/theme';
import { formatShekel } from '../../../utils/format';
import { ToolHeader } from '../components/ToolHeader';
import { ToolSharkTip } from '../components/ToolSharkTip';

/**
 * Chunks 4.1 (Schema) + 4.2 (Logic) + 4.3 (UI).
 *
 * `monthlySalary` is a string because it binds to a `TextInput` —
 * coercion to number happens inside `useMemo`. Fee fields stay numeric
 * for the sliders.
 *
 * Convention: `currentDepositFee` / `alternativeDepositFee` are דמי ניהול
 * מהפקדה (% of each deposit). `currentAccumulationFee` /
 * `alternativeAccumulationFee` are דמי ניהול מצבירה (% of total balance,
 * annually). `expectedReturn` is annual gross return before fees (%).
 */

const ACCENT = '#ec4899';      // pink-500
const ACCENT_DIM = '#fce7f3';  // pink-100
const ACCENT_DARK = '#be185d'; // pink-700
const NEUTRAL_DIM = '#f3f4f6'; // gray-100 (for "current/expensive" side)
const NEUTRAL_DARK = '#475569';

const RETIREMENT_AGE = 67;
const TOTAL_DEPOSIT_RATE = 0.185; // 6% עובד + 6.5% מעסיק + 6% פיצויים
const PAYOUT_FACTOR = 200;        // מקדם המרה לקצבה (פישוט)

/**
 * Pure month-by-month simulation. Compounds the running balance at the
 * net monthly return (gross return − accumulation-fee drag) and adds the
 * net monthly deposit (after deposit fee) each month.
 *
 * Safe by construction for `years === 0` (loop skipped → returns 0) and
 * `annualReturn === 0` / `accumulationFeeRate === 0` (multiplier stays
 * finite — never produces NaN).
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
  lostToFees: number;
  monthlyPensionCurrent: number;
  monthlyPensionAlternative: number;
}

const DEFAULT_STATE: PensionInput = {
  age: 30,
  monthlySalary: '15000',
  currentDepositFee: 3.0,
  currentAccumulationFee: 0.3,
  alternativeDepositFee: 1.5,
  alternativeAccumulationFee: 0.15,
  expectedReturn: 5.0,
};

export type { PensionInput, PensionResult };

export function PensionFeesComparator(): React.ReactElement {
  const [state, setState] = useState<PensionInput>(DEFAULT_STATE);

  const result: PensionResult = useMemo(() => {
    const salary = Number(state.monthlySalary) || 0;
    const years = Math.max(0, RETIREMENT_AGE - state.age);

    const currentTotal = simulatePension(
      salary,
      years,
      state.expectedReturn,
      state.currentDepositFee,
      state.currentAccumulationFee,
    );
    const alternativeTotal = simulatePension(
      salary,
      years,
      state.expectedReturn,
      state.alternativeDepositFee,
      state.alternativeAccumulationFee,
    );

    return {
      yearsToRetirement: years,
      currentTotal: Math.round(currentTotal),
      alternativeTotal: Math.round(alternativeTotal),
      lostToFees: Math.round(alternativeTotal - currentTotal),
      monthlyPensionCurrent: Math.round(currentTotal / PAYOUT_FACTOR),
      monthlyPensionAlternative: Math.round(alternativeTotal / PAYOUT_FACTOR),
    };
  }, [state]);

  const hasLoss = result.lostToFees > 0;
  const lostPositive = Math.max(0, result.lostToFees);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ToolHeader
        title="דמי ניהול פנסיה"
        subtitle="כמה אבד לך לבית ההשקעות לאורך הצבירה?"
        accentColor={ACCENT}
        Icon={PiggyBank}
      />

      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Primary result card */}
        <Animated.View entering={FadeInDown.duration(360)} style={s.resultCard}>
          <Text style={s.resultLabel}>
            {hasLoss
              ? 'הלכו לבית ההשקעות במקום אליך'
              : 'הקרן הנוכחית שלך זולה יותר — שמור עליה'}
          </Text>
          <Text style={s.resultNumber}>{formatShekel(lostPositive)}</Text>
          <Text style={s.resultUnit}>
            במשך {result.yearsToRetirement} שנים עד גיל פרישה
          </Text>
        </Animated.View>

        {/* Comparison — RTL reading flow: current (before) on the right,
            alternative (after) on the left. */}
        <View style={s.compareWrap}>
          <ComparisonColumn
            title="הקרן הנוכחית"
            total={result.currentTotal}
            monthly={result.monthlyPensionCurrent}
          />
          <ComparisonColumn
            title="קרן זולה"
            total={result.alternativeTotal}
            monthly={result.monthlyPensionAlternative}
            highlight
          />
        </View>

        {/* Personal inputs */}
        <View style={s.card}>
          <Text style={s.cardTitle}>הנתונים שלך</Text>

          <View style={s.field}>
            <Text style={s.label}>שכר חודשי ברוטו (₪)</Text>
            <TextInput
              style={s.input}
              value={state.monthlySalary}
              onChangeText={(v) =>
                setState((p) => ({ ...p, monthlySalary: v }))
              }
              keyboardType="numeric"
              accessibilityLabel="שכר חודשי ברוטו בשקלים"
            />
          </View>

          <View style={s.field}>
            <View style={s.sliderHeader}>
              <Text style={s.sliderValue}>{state.age}</Text>
              <Text style={s.label}>גיל נוכחי</Text>
            </View>
            <Slider
              value={state.age}
              onValueChange={(v) =>
                setState((p) => ({ ...p, age: Math.round(v) }))
              }
              minimumValue={18}
              maximumValue={66}
              step={1}
              minimumTrackTintColor={ACCENT}
              maximumTrackTintColor={STITCH.surfaceHighest}
              thumbTintColor={ACCENT}
              accessibilityLabel="גיל נוכחי"
            />
            <View style={s.sliderRangeRow}>
              <Text style={s.sliderRange}>66</Text>
              <Text style={s.sliderRange}>18</Text>
            </View>
          </View>
        </View>

        {/* Current fund fees */}
        <View style={s.card}>
          <Text style={s.cardTitle}>הקרן הנוכחית — דמי ניהול</Text>

          <FeeSlider
            label="דמי ניהול מהפקדה"
            value={state.currentDepositFee}
            onChange={(v) =>
              setState((p) => ({ ...p, currentDepositFee: v }))
            }
            min={0}
            max={6}
            step={0.1}
            unit="%"
            color={NEUTRAL_DARK}
          />

          <FeeSlider
            label="דמי ניהול מצבירה (שנתי)"
            value={state.currentAccumulationFee}
            onChange={(v) =>
              setState((p) => ({ ...p, currentAccumulationFee: v }))
            }
            min={0}
            max={1}
            step={0.05}
            unit="%"
            color={NEUTRAL_DARK}
          />
        </View>

        {/* Alternative fund fees */}
        <View style={s.card}>
          <Text style={s.cardTitle}>קרן זולה — דמי ניהול</Text>

          <FeeSlider
            label="דמי ניהול מהפקדה"
            value={state.alternativeDepositFee}
            onChange={(v) =>
              setState((p) => ({ ...p, alternativeDepositFee: v }))
            }
            min={0}
            max={6}
            step={0.1}
            unit="%"
            color={ACCENT}
          />

          <FeeSlider
            label="דמי ניהול מצבירה (שנתי)"
            value={state.alternativeAccumulationFee}
            onChange={(v) =>
              setState((p) => ({ ...p, alternativeAccumulationFee: v }))
            }
            min={0}
            max={1}
            step={0.05}
            unit="%"
            color={ACCENT}
          />
        </View>

        {/* Expected return */}
        <View style={s.card}>
          <Text style={s.cardTitle}>תשואה צפויה</Text>
          <FeeSlider
            label="תשואה שנתית ברוטו (לפני דמי ניהול)"
            value={state.expectedReturn}
            onChange={(v) =>
              setState((p) => ({ ...p, expectedReturn: v }))
            }
            min={2}
            max={8}
            step={0.1}
            unit="%"
            color={ACCENT}
          />
          <Text style={s.helper}>
            הממוצע ההיסטורי של קרנות פנסיה בישראל: 4%–5% נטו לשנה.
          </Text>
        </View>

        {/* Shark tip — once per tool */}
        <ToolSharkTip
          text='"0.1% דמי ניהול מצבירה זה לא קטן."'
          subtext="על פני 35 שנה — זה אגף שלם בדירה."
          mood="talking"
          accentColor={ACCENT_DARK}
          accentSurface={ACCENT_DIM}
        />

        {/* Share */}
        <Pressable
          style={s.shareBtn}
          onPress={() =>
            Alert.alert('שיתוף', 'שיתוף התוצאה יתווסף בקרוב.')
          }
          accessibilityRole="button"
          accessibilityLabel="שתף את התוצאה"
        >
          <Text style={s.shareText}>שתף תוצאה</Text>
          <Share2 size={18} color={ACCENT_DARK} />
        </Pressable>

        {/* CTA לשיעור */}
        <Pressable
          style={s.ctaBtn}
          onPress={() =>
            Alert.alert('שיעור', 'הפניה לשיעור על דמי ניהול תתווסף בקרוב.')
          }
          accessibilityRole="button"
          accessibilityLabel="המשך לשיעור על דמי ניהול ופנסיה"
        >
          <ChevronLeft size={20} color="#ffffff" />
          <Text style={s.ctaText}>למד איך להחליף קרן ולחסוך</Text>
        </Pressable>

        {/* Disclaimer */}
        <Text style={s.disclaimer}>
          הערכה בלבד, לא תחליף לייעוץ פנסיוני. מבוסס על הפקדה של 18.5% מהשכר
          (עובד + מעסיק + פיצויים) ותשואה קבועה לאורך כל התקופה.
        </Text>
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
        s.compareCol,
        {
          backgroundColor: highlight ? ACCENT_DIM : NEUTRAL_DIM,
          borderColor: highlight ? ACCENT : STITCH.surfaceHighest,
        },
      ]}
    >
      <Text
        style={[
          s.compareTitle,
          { color: highlight ? ACCENT_DARK : NEUTRAL_DARK },
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          s.compareTotal,
          { color: highlight ? ACCENT_DARK : STITCH.onSurface },
        ]}
      >
        {formatShekel(total)}
      </Text>
      <Text style={s.compareTotalLabel}>סה"כ צבירה</Text>
      <View style={s.compareDivider} />
      <Text
        style={[
          s.compareMonthly,
          { color: highlight ? ACCENT_DARK : STITCH.onSurface },
        ]}
      >
        {formatShekel(monthly)}
      </Text>
      <Text style={s.compareMonthlyLabel}>קצבה חודשית</Text>
    </View>
  );
}

function FeeSlider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  color,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  color: string;
}): React.ReactElement {
  const decimals = step < 0.1 ? 2 : step < 1 ? 1 : 0;
  return (
    <View style={s.field}>
      <View style={s.sliderHeader}>
        <Text style={[s.sliderValue, { color }]}>
          {value.toFixed(decimals)}{unit}
        </Text>
        <Text style={s.label}>{label}</Text>
      </View>
      <Slider
        value={value}
        onValueChange={(v) => {
          const snapped = Math.round(v / step) * step;
          onChange(Number(snapped.toFixed(decimals)));
        }}
        minimumValue={min}
        maximumValue={max}
        step={step}
        minimumTrackTintColor={color}
        maximumTrackTintColor={STITCH.surfaceHighest}
        thumbTintColor={color}
        accessibilityLabel={label}
      />
      <View style={s.sliderRangeRow}>
        <Text style={s.sliderRange}>{max}{unit}</Text>
        <Text style={s.sliderRange}>{min}{unit}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: STITCH.background,
  },
  scroll: {
    padding: 16,
    paddingBottom: 48,
    gap: 16,
  },
  // Primary result card
  resultCard: {
    backgroundColor: STITCH.surfaceLowest,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  resultLabel: {
    fontSize: 13,
    color: STITCH.onSurfaceVariant,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  resultNumber: {
    fontSize: 56,
    fontWeight: '900',
    color: ACCENT,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 4,
    letterSpacing: -1,
  },
  resultUnit: {
    fontSize: 13,
    color: STITCH.onSurfaceVariant,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 2,
  },

  // Comparison
  compareWrap: {
    flexDirection: 'row-reverse',
    gap: 12,
  },
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
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  compareDivider: {
    alignSelf: 'stretch',
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginVertical: 10,
  },
  compareMonthly: {
    fontSize: 16,
    fontWeight: '700',
    writingDirection: 'rtl',
  },
  compareMonthlyLabel: {
    fontSize: 11,
    color: STITCH.onSurfaceVariant,
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  // Generic card
  card: {
    backgroundColor: STITCH.surfaceLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: STITCH.onSurface,
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  // Field
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: STITCH.onSurfaceVariant,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    color: STITCH.onSurface,
    backgroundColor: STITCH.surfaceLow,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  helper: {
    fontSize: 12,
    color: STITCH.onSurfaceVariant,
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  // Slider
  sliderHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: '700',
    writingDirection: 'rtl',
  },
  sliderRangeRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: -4,
  },
  sliderRange: {
    fontSize: 11,
    color: STITCH.onSurfaceVariant,
  },

  // Share
  shareBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ACCENT_DARK,
    backgroundColor: STITCH.surfaceLowest,
  },
  shareText: {
    fontSize: 14,
    fontWeight: '700',
    color: ACCENT_DARK,
    writingDirection: 'rtl',
  },

  // CTA
  ctaBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: ACCENT,
    shadowColor: ACCENT,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    writingDirection: 'rtl',
  },

  // Disclaimer
  disclaimer: {
    fontSize: 11,
    color: STITCH.onSurfaceVariant,
    textAlign: 'center',
    writingDirection: 'rtl',
    paddingHorizontal: 12,
    marginTop: 4,
    lineHeight: 16,
  },
});
