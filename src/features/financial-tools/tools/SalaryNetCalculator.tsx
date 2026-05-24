import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Coins, Share2 } from 'lucide-react-native';

import {
  calculateNet,
  type MaritalStatus,
  type TaxCalculationResult,
} from '../utils/taxBrackets2026';
import { STITCH } from '../../../constants/theme';
import { clamp, formatShekel } from '../../../utils/format';
import { findTool } from '../toolsRegistry';
import { ToolHeader } from '../components/ToolHeader';
import { ProfileFingerprint } from '../components/ProfileFingerprint';
import { ToolNextStepCard } from '../components/ToolNextStepCard';
import { buildSalaryNetInitial } from '../financialProfile';
import { useFinancialProfileStore } from '../useFinancialProfileStore';
import {
  CalculateButton,
  FinTip,
  LegalDisclaimer,
  MoneyInput,
  MoneySlider,
  PeriodChips,
  SectionLabel,
  StatHero,
} from '../components/atoms';

const TOOL = findTool('salary-net')!;

const SALARY_MIN = 4000;
const SALARY_MAX = 50000;
const SALARY_STEP = 250;

/**
 * Employer-side costs on top of gross salary (Israel 2026):
 *   - Employer pension contribution: 6.5% (חוק פנסיה חובה — 6.5% on gross up to ~₪50k cap)
 *   - Severance reserve: 6.0% (השלמה לפיצויים — 6% standard; can be 8.33% in new tracks)
 *   - Employer Bituach Leumi: 3.55% up to BL break, 7.6% above it (employer-only rates)
 * Sum ≈ 16-17% on top of gross — the gap between "ברוטו" and "עלות מעסיק".
 */
const EMPLOYER_PENSION = 0.065;
const EMPLOYER_SEVERANCE = 0.06;
const EMPLOYER_BL_LOW = 0.0355;
const EMPLOYER_BL_HIGH = 0.076;
const BL_MONTHLY_BREAK = 7522;

function employerBlCost(monthlyGross: number): number {
  if (monthlyGross <= 0) return 0;
  if (monthlyGross <= BL_MONTHLY_BREAK) return monthlyGross * EMPLOYER_BL_LOW;
  return BL_MONTHLY_BREAK * EMPLOYER_BL_LOW + (monthlyGross - BL_MONTHLY_BREAK) * EMPLOYER_BL_HIGH;
}

interface CalculatorState {
  monthlyGross: string;
  creditPoints: number;
  status: MaritalStatus;
}

const INITIAL_STATE: CalculatorState = {
  monthlyGross: '12000',
  creditPoints: 2.25,
  status: 'single',
};

const CREDIT_PRESETS: readonly { label: string; value: number }[] = [
  { label: 'רווק/ה', value: 2.25 },
  { label: 'נשוי/אה', value: 2.75 },
  { label: 'חד־הורי', value: 3.25 },
  { label: 'נשוי + ילד', value: 4.25 },
];

const CREDIT_VALUES = CREDIT_PRESETS.map((p) => p.value);

export function SalaryNetCalculator(): React.ReactElement {
  const [state, setState] = useState<CalculatorState>(() =>
    buildSalaryNetInitial(useFinancialProfileStore.getState().profile, INITIAL_STATE),
  );

  const result: TaxCalculationResult = useMemo(() => {
    const monthlyGross = Number(state.monthlyGross) || 0;
    const grossAnnual = monthlyGross * 12;
    return calculateNet({
      grossAnnual,
      creditPoints: state.creditPoints,
      age: 30,
      status: state.status,
    });
  }, [state]);

  const derived = useMemo(() => {
    const monthlyGrossNum = Number(state.monthlyGross) || 0;
    const monthlyDeductions =
      (result.incomeTax + result.bituachLeumi + result.masBriut) / 12;
    const sliderValue = clamp(
      monthlyGrossNum || SALARY_MIN,
      SALARY_MIN,
      SALARY_MAX,
    );
    const employerPension = monthlyGrossNum * EMPLOYER_PENSION;
    const employerSeverance = monthlyGrossNum * EMPLOYER_SEVERANCE;
    const employerBl = employerBlCost(monthlyGrossNum);
    const employerExtraCost = employerPension + employerSeverance + employerBl;
    return {
      monthlyGrossNum,
      monthlyDeductions,
      sliderValue,
      employerPension,
      employerSeverance,
      employerBl,
      employerExtraCost,
      totalEmployerCost: monthlyGrossNum + employerExtraCost,
      employerMarkupPct: monthlyGrossNum > 0 ? employerExtraCost / monthlyGrossNum : 0,
    };
  }, [state.monthlyGross, result.incomeTax, result.bituachLeumi, result.masBriut]);
  const {
    monthlyGrossNum,
    monthlyDeductions,
    sliderValue,
    employerPension,
    employerSeverance,
    employerBl,
    totalEmployerCost,
    employerMarkupPct,
  } = derived;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ToolHeader
        title="שכר ברוטו ↔ נטו"
        subtitle="כמה נכנס לך לכיס באמת"
        accentColor={TOOL.hue}
        Icon={Coins}
        toolKey="salary-net"
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ProfileFingerprint accentColor={TOOL.hue} />

        <StatHero
          label="נטו לכיס בחודש"
          value={result.netMonthly}
          accentColor={TOOL.hue}
          sublabel={`${result.effectiveRate.toFixed(1)}% מס אפקטיבי · ${formatShekel(monthlyDeductions)} ניכויים`}
        />

        <SectionLabel>הנתונים שלך</SectionLabel>

        <View style={styles.inputCard}>
          <MoneyInput
            label="שכר ברוטו חודשי"
            value={state.monthlyGross}
            onChangeText={(v) => setState({ ...state, monthlyGross: v })}
            placeholder="12,000"
            accentColor={TOOL.hue}
            step={500}
            min={SALARY_MIN}
            max={SALARY_MAX}
          />
          <View style={styles.sliderWrap}>
            <MoneySlider
              label="החליקו לבחירת שכר"
              value={sliderValue}
              onChange={(v) => setState((p) => ({ ...p, monthlyGross: String(v) }))}
              min={SALARY_MIN}
              max={SALARY_MAX}
              step={SALARY_STEP}
              unit=" ₪"
              accentColor={TOOL.hue}
              hideValueDisplay
            />
          </View>
        </View>

        <PeriodChips
          label="נקודות זיכוי"
          value={state.creditPoints}
          options={CREDIT_VALUES}
          onChange={(v) => setState({ ...state, creditPoints: v })}
          renderLabel={(v) =>
            CREDIT_PRESETS.find((p) => p.value === v)?.label ?? String(v)
          }
          accentColor={TOOL.hue}
        />

        <SectionLabel>פירוט ניכויים חודשי</SectionLabel>

        <View style={styles.breakdownCard}>
          <BreakdownRow label="מס הכנסה" amount={result.incomeTax / 12} />
          <BreakdownRow label="ביטוח לאומי" amount={result.bituachLeumi / 12} />
          <BreakdownRow label="מס בריאות" amount={result.masBriut / 12} />
          <View style={styles.divider} />
          <BreakdownRow label="סך הכל ניכויים" amount={monthlyDeductions} bold />
        </View>

        <CalculateButton
          label="שתף תוצאה"
          sublabel={`נטו: ${formatShekel(result.netMonthly)}/חודש`}
          variant="green"
          iconLeft={<Share2 size={18} color="#ffffff" strokeWidth={2.6} />}
          onPress={() =>
            Alert.alert(
              'שיתוף',
              `הנטו שלי: ${formatShekel(result.netMonthly)}/חודש`,
            )
          }
        />

        <SectionLabel>עלות מעסיק חודשית</SectionLabel>

        <View style={styles.employerCard}>
          <View style={styles.employerTopRow}>
            <View style={styles.employerTotalWrap}>
              <Text style={styles.employerTotalLabel}>סך עלות לעסיק</Text>
              <Text style={styles.employerTotalValue}>{formatShekel(totalEmployerCost)}</Text>
            </View>
            <View style={styles.employerMarkupPill}>
              <Text style={styles.employerMarkupText}>
                +{(employerMarkupPct * 100).toFixed(1)}% מעל הברוטו
              </Text>
            </View>
          </View>
          <View style={styles.employerDivider} />
          <BreakdownRow label="ברוטו (השכר שלך)" amount={monthlyGrossNum} />
          <BreakdownRow label="הפקדה לפנסיה (מעסיק 6.5%)" amount={employerPension} />
          <BreakdownRow label="פיצויים (6%)" amount={employerSeverance} />
          <BreakdownRow label="ביטוח לאומי מעסיק" amount={employerBl} />
        </View>

        <FinTip
          kind="tip"
          text={`עלות מעסיק = ₪${Math.round(totalEmployerCost).toLocaleString('he-IL')} — כשמשווים שכר עצמאי לעיר שכיר, זה הסכום הרלוונטי.`}
          subtext="המס השולי שלך עולה עם השכר — לכן חשוב לדעת איפה אתה במדרגות."
        />

        <ToolNextStepCard toolKey="salary-net" accentColor={TOOL.hue} />

        <LegalDisclaimer scope="tax" extra="נכון לשנת המס 2026." />
      </ScrollView>
    </SafeAreaView>
  );
}

function BreakdownRow({
  label,
  amount,
  bold,
}: {
  label: string;
  amount: number;
  bold?: boolean;
}): React.ReactElement {
  return (
    <View style={styles.breakdownRow}>
      <Text style={[styles.breakdownLabel, bold && styles.breakdownBold]}>{label}</Text>
      <Text style={[styles.breakdownAmount, bold && styles.breakdownBold]}>
        {formatShekel(amount)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: STITCH.background },
  scroll: { padding: 16, paddingBottom: 80, gap: 14 },
  inputCard: {
    backgroundColor: STITCH.surfaceLowest,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
    gap: 8,
  },
  sliderWrap: { paddingHorizontal: 2, paddingTop: 4 },
  breakdownCard: {
    backgroundColor: STITCH.surfaceLowest,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
    gap: 2,
  },
  breakdownRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  breakdownLabel: {
    fontSize: 13,
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
  },
  breakdownAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: STITCH.onSurface,
  },
  breakdownBold: {
    fontWeight: '900',
    color: STITCH.onSurface,
    fontSize: 15,
  },
  divider: {
    height: 1,
    backgroundColor: STITCH.surfaceHighest,
    marginVertical: 4,
  },
  employerCard: {
    backgroundColor: STITCH.surfaceLowest,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
    gap: 2,
  },
  employerTopRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  employerTotalWrap: { alignItems: 'flex-end' },
  employerTotalLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
    letterSpacing: 0.3,
  },
  employerTotalValue: {
    fontSize: 22,
    fontWeight: '900',
    color: STITCH.onSurface,
    marginTop: 2,
    letterSpacing: -0.4,
    writingDirection: 'rtl',
  },
  employerMarkupPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
  },
  employerMarkupText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#15803d',
    writingDirection: 'rtl',
  },
  employerDivider: {
    height: 1,
    backgroundColor: STITCH.surfaceHighest,
    marginVertical: 8,
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
