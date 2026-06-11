import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { Calculator, Minus, Plus, ReceiptText, Share2 } from 'lucide-react-native';

import { tapHaptic } from '../../../utils/haptics';

import {
  calculateIncomeTax,
  type MaritalStatus,
} from '../utils/taxBrackets2026';
import { STITCH } from '../../../constants/theme';
import { clamp, formatShekel } from '../../../utils/format';
import { findTool } from '../toolsRegistry';
import { ToolHeader } from '../components/ToolHeader';
import { ProfileFingerprint } from '../components/ProfileFingerprint';
import { ToolNextStepCard } from '../components/ToolNextStepCard';
import { buildTaxRefundInitial } from '../financialProfile';
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

const TOOL = findTool('tax-refund')!;

const ANNUAL_MIN = 30_000;
const ANNUAL_MAX = 800_000;
const ANNUAL_STEP = 5_000;

interface TaxRefundInput {
  annualGross: string;
  monthsWorked: number;
  taxPaid: string;
  kidsCount: number;
  status: MaritalStatus;
  extraDeposits: string;
}

interface TaxRefundResult {
  estimatedRefund: number;
  theoreticalTax: number;
  actualTax: number;
  depositCredit: number;
}

const DEFAULT_STATE: TaxRefundInput = {
  annualGross: '120000',
  monthsWorked: 12,
  taxPaid: '13000',
  kidsCount: 0,
  status: 'single',
  extraDeposits: '0',
};

const STATUS_OPTIONS: readonly { value: MaritalStatus; label: string }[] = [
  { value: 'single', label: 'רווק/ה' },
  { value: 'married', label: 'נשוי/אה' },
  { value: 'divorced', label: 'גרוש/ה' },
  { value: 'widowed', label: 'אלמן/ה' },
];

const MONTHS_OPTIONS: readonly number[] = [6, 9, 12];

function getCreditPoints(status: MaritalStatus, kids: number): number {
  const base = status === 'divorced' ? 3.25 : 2.25;
  return base + kids;
}

function computeRefund(input: TaxRefundInput): TaxRefundResult {
  const annualGross = Number(input.annualGross) || 0;
  const actualTax = Number(input.taxPaid) || 0;
  const extraDeposits = Number(input.extraDeposits) || 0;

  const totalCreditPoints = getCreditPoints(input.status, input.kidsCount);
  const annualizedGross =
    input.monthsWorked < 12 && input.monthsWorked > 0
      ? (annualGross / input.monthsWorked) * 12
      : annualGross;
  const theoreticalTaxFull = calculateIncomeTax(annualizedGross, totalCreditPoints);
  const theoreticalTaxProRata = theoreticalTaxFull * (input.monthsWorked / 12);
  // 2026 annual זיכוי cap on קופ"ג deposits — re-indexed ~3% from 2025 (₪7,700).
  const depositCredit = Math.min(extraDeposits * 0.35, 7_920);
  const refund = Math.max(0, actualTax - theoreticalTaxProRata) + depositCredit;

  return {
    estimatedRefund: Math.round(refund),
    theoreticalTax: Math.round(theoreticalTaxProRata),
    actualTax,
    depositCredit: Math.round(depositCredit),
  };
}

export function TaxRefundCalculator(): React.ReactElement {
  // State split — live inputs drive sliders + the CALC button preview,
  // committed inputs drive the result hero + breakdown. CALC commits live
  // → committed and bumps `commitCount` to re-fire the ZoomIn ceremony.
  const initial = useMemo(
    () => buildTaxRefundInitial(useFinancialProfileStore.getState().profile, DEFAULT_STATE),
    [],
  );
  const [state, setState] = useState<TaxRefundInput>(initial);
  const [committedState, setCommittedState] = useState<TaxRefundInput>(initial);
  const [commitCount, setCommitCount] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const result: TaxRefundResult = useMemo(() => computeRefund(committedState), [committedState]);
  const livePreview: TaxRefundResult = useMemo(() => computeRefund(state), [state]);

  const handleCalculate = useCallback(() => {
    setCommittedState(state);
    setCommitCount((c) => c + 1);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }, 100);
  }, [state]);

  const hasInput =
    (Number(state.annualGross) || 0) > 0 && (Number(state.taxPaid) || 0) > 0;
  const liveDiffers = livePreview.estimatedRefund !== result.estimatedRefund;
  const sliderValue = clamp(
    Number(state.annualGross) || ANNUAL_MIN,
    ANNUAL_MIN,
    ANNUAL_MAX,
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ToolHeader
        title="החזר מס"
        subtitle="8 מתוך 10 ישראלים זכאים, ממוצע ₪10,500"
        accentColor={TOOL.hue}
        Icon={ReceiptText}
        toolKey="tax-refund"
      />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <ProfileFingerprint accentColor={TOOL.hue} />

        {/* Result hero, re-mounted on every commit so ZoomIn + the inner
            count-up replay together as the "Calculate Ceremony". */}
        <Animated.View key={commitCount} entering={ZoomIn.springify().damping(8).mass(0.6)}>
          <StatHero
            label={hasInput ? 'החזר משוער' : 'מלא את הפרטים כדי לראות הערכה'}
            value={result.estimatedRefund}
            accentColor={TOOL.hue}
            disableEntering
            magnitudeTiers={
              hasInput
                ? [
                    { threshold: 500, sublabel: 'זה שלך.' },
                    { threshold: 5000, sublabel: 'זה שלך. שווה לבדוק.', accentColor: '#e9c400' },
                  ]
                : undefined
            }
          />
        </Animated.View>

        {hasInput ? (
          <FinTip
            kind="grow"
            text="תגשו לקחת, זה הכסף שלכם."
            subtext="החזר מס מוגש דרך אזור אישי של רשות המסים — בלי תור בסניף."
          />
        ) : null}

        <SectionLabel>הנתונים שלך</SectionLabel>

        <View style={styles.inputCard}>
          <MoneyInput
            label="ברוטו שנתי (סך טופס 106)"
            value={state.annualGross}
            onChangeText={(v) => setState({ ...state, annualGross: v })}
            placeholder="120,000"
            accentColor={TOOL.hue}
            step={5000}
            min={ANNUAL_MIN}
            max={ANNUAL_MAX}
          />
          <View style={styles.sliderWrap}>
            <MoneySlider
              label="החליקו לבחירת ברוטו שנתי"
              value={sliderValue}
              onChange={(v) => setState((p) => ({ ...p, annualGross: String(v) }))}
              min={ANNUAL_MIN}
              max={ANNUAL_MAX}
              step={ANNUAL_STEP}
              unit=" ₪"
              accentColor={TOOL.hue}
              hideValueDisplay
            />
          </View>
        </View>

        <MoneyInput
          label="מס שנוכה בפועל"
          value={state.taxPaid}
          onChangeText={(v) => setState({ ...state, taxPaid: v })}
          placeholder="13,000"
          accentColor={TOOL.hue}
          step={500}
          min={0}
          max={200_000}
        />

        <PeriodChips
          label="חודשי עבודה השנה"
          value={state.monthsWorked}
          options={MONTHS_OPTIONS}
          onChange={(v) => setState({ ...state, monthsWorked: v })}
          unit=""
          accentColor={TOOL.hue}
        />

        <KidsStepper
          value={state.kidsCount}
          onChange={(v) => setState({ ...state, kidsCount: v })}
          accentColor={TOOL.hue}
        />

        <PeriodChips
          label="מצב משפחתי"
          value={state.status}
          options={STATUS_OPTIONS.map((s) => s.value)}
          onChange={(v) => setState({ ...state, status: v })}
          renderLabel={(v) =>
            STATUS_OPTIONS.find((s) => s.value === v)?.label ?? String(v)
          }
          accentColor={TOOL.hue}
        />

        <MoneyInput
          label='הפקדות עצמאיות לקופ"ג (לא דרך תלוש)'
          value={state.extraDeposits}
          onChangeText={(v) => setState({ ...state, extraDeposits: v })}
          placeholder="0"
          accentColor={TOOL.hue}
          step={1000}
          min={0}
          max={100_000}
          hint="זיכוי של 35% עד תקרה שנתית"
        />

        {hasInput ? (
          <>
            <SectionLabel>פירוט החישוב</SectionLabel>
            <View style={styles.breakdownCard}>
              <BreakdownRow label="מס שנוכה בפועל" amount={result.actualTax} />
              <BreakdownRow label="מס תיאורטי לחודשי עבודה" amount={result.theoreticalTax} />
              {result.depositCredit > 0 ? (
                <BreakdownRow label="זיכוי על הפקדות (35%)" amount={result.depositCredit} />
              ) : null}
              <View style={styles.divider} />
              <BreakdownRow
                label="החזר משוער"
                amount={result.estimatedRefund}
                bold
                accent={TOOL.hue}
              />
            </View>
          </>
        ) : null}

        {/* Primary commit — locks the current inputs into the result hero
            above and re-fires the ZoomIn ceremony. Sublabel previews the
            uncommitted value so the user knows what the tap will produce. */}
        <CalculateButton
          label="חשב"
          sublabel={
            liveDiffers
              ? `תוצאה משוערת: ${formatShekel(livePreview.estimatedRefund)}`
              : 'תוצאה עדכנית'
          }
          variant="blue"
          iconLeft={<Calculator size={18} color="#ffffff" strokeWidth={2.6} />}
          onPress={handleCalculate}
        />

        <CalculateButton
          label="שתף תוצאה"
          sublabel={`מגיע לי ${formatShekel(result.estimatedRefund)} החזר`}
          variant="orange"
          iconLeft={<Share2 size={18} color="#ffffff" strokeWidth={2.6} />}
          onPress={() => {
            Share.share({
              message: `🧾 בדקתי החזר מס ב-FinPlay\n\nמגיע לי החזר מס משוער של ${formatShekel(result.estimatedRefund)}!\n\nתבדוק גם אתה ב-FinPlay`,
            }).catch(() => { /* user dismissed — non-fatal */ });
          }}
        />

        <ToolNextStepCard toolKey="tax-refund" accentColor={TOOL.hue} />

        <LegalDisclaimer
          scope="tax"
          extra="החזר בפועל מחושב ע״י רשות המסים על סמך טפסי 106 והכנסות נוספות."
        />
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Compact +/- stepper for the kids count — replaces the full-width
 * PeriodChips row so the input feels less like a tax form. Range 0..3 with
 * "3+" displayed at the top end.
 */
function KidsStepper({
  value,
  onChange,
  accentColor,
}: {
  value: number;
  onChange: (v: number) => void;
  accentColor: string;
}): React.ReactElement {
  const handleDec = () => {
    if (value <= 0) return;
    tapHaptic();
    onChange(value - 1);
  };
  const handleInc = () => {
    if (value >= 3) return;
    tapHaptic();
    onChange(value + 1);
  };
  return (
    <View style={styles.stepperRow}>
      <Text style={styles.stepperLabel}>ילדים</Text>
      <View style={styles.stepperControls}>
        <Pressable
          onPress={handleDec}
          disabled={value === 0}
          style={({ pressed }) => [
            styles.stepperBtn,
            { borderColor: accentColor + '33' },
            value === 0 && styles.stepperBtnDisabled,
            pressed && { opacity: 0.7 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="פחות ילדים"
          hitSlop={6}
        >
          <Minus
            size={16}
            color={value === 0 ? STITCH.onSurfaceVariant : accentColor}
            strokeWidth={2.6}
          />
        </Pressable>
        <Text style={[styles.stepperValue, { color: accentColor }]}>
          {value === 3 ? '3+' : value}
        </Text>
        <Pressable
          onPress={handleInc}
          disabled={value === 3}
          style={({ pressed }) => [
            styles.stepperBtn,
            { borderColor: accentColor + '33' },
            value === 3 && styles.stepperBtnDisabled,
            pressed && { opacity: 0.7 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="עוד ילדים"
          hitSlop={6}
        >
          <Plus
            size={16}
            color={value === 3 ? STITCH.onSurfaceVariant : accentColor}
            strokeWidth={2.6}
          />
        </Pressable>
      </View>
    </View>
  );
}

function BreakdownRow({
  label,
  amount,
  bold,
  accent,
}: {
  label: string;
  amount: number;
  bold?: boolean;
  accent?: string;
}): React.ReactElement {
  return (
    <View style={styles.breakdownRow}>
      <Text style={[styles.breakdownLabel, bold && styles.breakdownLabelBold]}>{label}</Text>
      <Text
        style={[
          styles.breakdownAmount,
          bold && styles.breakdownAmountBold,
          bold && accent ? { color: accent } : null,
        ]}
      >
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
  stepperRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  stepperLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
  },
  stepperControls: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    backgroundColor: '#ffffff',
  },
  stepperBtnDisabled: {
    opacity: 0.4,
  },
  stepperValue: {
    fontSize: 16,
    fontWeight: '900',
    minWidth: 28,
    textAlign: 'center',
  },
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
  breakdownLabelBold: {
    fontWeight: '900',
    color: STITCH.onSurface,
  },
  breakdownAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: STITCH.onSurface,
  },
  breakdownAmountBold: {
    fontWeight: '900',
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: STITCH.surfaceHighest,
    marginVertical: 4,
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
