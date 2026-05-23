import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HardHat, Home, Info, Share2 } from 'lucide-react-native';

import { STITCH } from '../../../constants/theme';
import { clamp, formatPercent, formatShekel } from '../../../utils/format';
import { findTool } from '../toolsRegistry';
import { ToolHeader } from '../components/ToolHeader';
import { ProfileFingerprint } from '../components/ProfileFingerprint';
import { ToolNextStepCard } from '../components/ToolNextStepCard';
import { buildMortgageInitial } from '../financialProfile';
import { useFinancialProfileStore } from '../useFinancialProfileStore';
import {
  CalculateButton,
  FinTip,
  LegalDisclaimer,
  MoneyInput,
  MoneySlider,
  PeriodChips,
  SectionLabel,
} from '../components/atoms';
import { MortgageBreakdown, PaymentBigDisplay } from '../components/charts';

const TOOL = findTool('mortgage')!;

const PRICE_MIN = 500_000;
const PRICE_MAX = 5_000_000;
const PRICE_STEP = 50_000;

const DOWN_MIN = 0;
const DOWN_MAX = 2_500_000;
const DOWN_STEP = 25_000;

const INCOME_MIN = 5_000;
const INCOME_MAX = 50_000;
const INCOME_STEP = 500;

const RATE_OPTIONS: readonly number[] = [3.5, 4.0, 4.5, 5.0, 5.5, 6.0];
const YEARS_OPTIONS: readonly number[] = [15, 20, 25, 30];

const pct1 = (n: number) => formatPercent(n, 1);

interface MortgageInput {
  propertyPrice: string;
  downPayment: string;
  annualRate: number;
  years: number;
  householdIncome: string;
}

interface MortgageResult {
  loanAmount: number;
  monthlyPayment: number;
  totalInterest: number;
  totalPaid: number;
  incomeRatio: number;
  isApproved: boolean;
  downPaymentRatio: number;
  meetsDownPaymentReq: boolean;
}

const DEFAULT_STATE: MortgageInput = {
  propertyPrice: '2000000',
  downPayment: '500000',
  annualRate: 5.0,
  years: 25,
  householdIncome: '20000',
};

export function MortgageCalculator(): React.ReactElement {
  const [state, setState] = useState<MortgageInput>(() =>
    buildMortgageInitial(useFinancialProfileStore.getState().profile, DEFAULT_STATE),
  );

  const result: MortgageResult = useMemo(() => {
    const price = Number(state.propertyPrice) || 0;
    const down = Number(state.downPayment) || 0;
    const income = Number(state.householdIncome) || 0;

    const loanAmount = Math.max(0, price - down);
    const monthlyRate = state.annualRate / 100 / 12;
    const n = state.years * 12;

    let monthlyPayment = 0;
    if (loanAmount > 0 && n > 0) {
      monthlyPayment =
        monthlyRate === 0
          ? loanAmount / n
          : (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, n)) /
            (Math.pow(1 + monthlyRate, n) - 1);
    }

    const totalPaid = monthlyPayment * n;
    const totalInterest = totalPaid - loanAmount;
    const incomeRatio = income > 0 ? monthlyPayment / income : 0;
    const isApproved = incomeRatio <= 0.4 && incomeRatio > 0;
    const downPaymentRatio = price > 0 ? down / price : 0;
    const meetsDownPaymentReq = downPaymentRatio >= 0.25;

    return {
      loanAmount,
      monthlyPayment: Math.round(monthlyPayment),
      totalInterest: Math.round(totalInterest),
      totalPaid: Math.round(totalPaid),
      incomeRatio,
      isApproved,
      downPaymentRatio,
      meetsDownPaymentReq,
    };
  }, [state]);

  const approvalStatus = result.isApproved && result.meetsDownPaymentReq;
  const interestHeavy = result.totalInterest > result.loanAmount * 0.5;

  const priceSliderValue = clamp(Number(state.propertyPrice) || PRICE_MIN, PRICE_MIN, PRICE_MAX);
  const downSliderValue = clamp(Number(state.downPayment) || DOWN_MIN, DOWN_MIN, DOWN_MAX);
  const incomeSliderValue = clamp(Number(state.householdIncome) || INCOME_MIN, INCOME_MIN, INCOME_MAX);

  /**
   * "Shorten-by-5" — what happens if you cut the loan term by 5 years?
   * Higher monthly payment but big interest savings. The eye-opener is the
   * total-interest delta, which most people massively underestimate.
   */
  const shortenInsight = useMemo(() => {
    const shortenedYears = Math.max(5, state.years - 5);
    if (shortenedYears === state.years || result.loanAmount <= 0) return null;
    const nShort = shortenedYears * 12;
    const monthlyRate = state.annualRate / 100 / 12;
    const monthlyShort =
      monthlyRate === 0
        ? result.loanAmount / nShort
        : (result.loanAmount * monthlyRate * Math.pow(1 + monthlyRate, nShort)) /
          (Math.pow(1 + monthlyRate, nShort) - 1);
    const totalInterestShort = monthlyShort * nShort - result.loanAmount;
    return {
      years: shortenedYears,
      extraMonthly: Math.round(monthlyShort - result.monthlyPayment),
      interestSaved: Math.round(result.totalInterest - totalInterestShort),
    };
  }, [state.years, state.annualRate, result.loanAmount, result.monthlyPayment, result.totalInterest]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ToolHeader
        title="מחשבון משכנתא"
        subtitle="האם אני יכול להרשות לעצמי?"
        accentColor={TOOL.hue}
        Icon={Home}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ProfileFingerprint accentColor={TOOL.hue} />

        <PaymentBigDisplay
          amount={result.monthlyPayment}
          label="החזר חודשי משוער"
          sublabel={`למשך ${state.years} שנים · ${state.annualRate}% ריבית שנתית`}
          accentColor={TOOL.hue}
          tintColor={TOOL.light}
        />

        {result.loanAmount > 0 ? (
          <View
            style={[
              styles.statusBadge,
              approvalStatus ? styles.statusOk : styles.statusBad,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                approvalStatus ? styles.statusOkText : styles.statusBadText,
              ]}
            >
              {approvalStatus
                ? '🟢 עוברת תקרות בנק ישראל'
                : '🔴 לא עוברת תקרות בנק ישראל'}
            </Text>
          </View>
        ) : null}

        <SectionLabel>הנתונים שלך</SectionLabel>

        <View style={styles.inputCard}>
          <MoneyInput
            label="מחיר הדירה"
            value={state.propertyPrice}
            onChangeText={(v) => setState({ ...state, propertyPrice: v })}
            placeholder="2,000,000"
            accentColor={TOOL.hue}
            step={PRICE_STEP}
            min={PRICE_MIN}
            max={PRICE_MAX}
          />
          <View style={styles.sliderWrap}>
            <MoneySlider
              label="החליקו לבחירה"
              value={priceSliderValue}
              onChange={(v) => setState((p) => ({ ...p, propertyPrice: String(v) }))}
              min={PRICE_MIN}
              max={PRICE_MAX}
              step={PRICE_STEP}
              unit=" ₪"
              accentColor={TOOL.hue}
              hideValueDisplay
            />
          </View>
        </View>

        <View style={styles.inputCard}>
          <MoneyInput
            label={`הון עצמי · ${pct1(result.downPaymentRatio)} מהדירה`}
            value={state.downPayment}
            onChangeText={(v) => setState({ ...state, downPayment: v })}
            placeholder="500,000"
            accentColor={TOOL.hue}
            step={DOWN_STEP}
            min={DOWN_MIN}
            max={DOWN_MAX}
            hint={
              !result.meetsDownPaymentReq && result.loanAmount > 0
                ? 'דרוש לפחות 25% הון עצמי לדירה ראשונה'
                : undefined
            }
          />
          <View style={styles.sliderWrap}>
            <MoneySlider
              label="החליקו לבחירה"
              value={downSliderValue}
              onChange={(v) => setState((p) => ({ ...p, downPayment: String(v) }))}
              min={DOWN_MIN}
              max={DOWN_MAX}
              step={DOWN_STEP}
              unit=" ₪"
              accentColor={TOOL.hue}
              hideValueDisplay
            />
          </View>
          {!result.meetsDownPaymentReq && result.loanAmount > 0 ? (
            <View style={[styles.infoBox, { backgroundColor: TOOL.light, borderColor: TOOL.hue + '40' }]}>
              <HardHat size={16} color={TOOL.hue} />
              <Text style={styles.infoText}>
                חסר הון? היום אפשר להשלים עם{' '}
                <Text style={[styles.infoTextStrong, { color: TOOL.hue }]}>הלוואת קבלן</Text> או{' '}
                <Text style={[styles.infoTextStrong, { color: TOOL.hue }]}>מימון משלים</Text> מחוץ למשכנתא.
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.inputCard}>
          <MoneyInput
            label="הכנסה חודשית משק בית"
            value={state.householdIncome}
            onChangeText={(v) => setState({ ...state, householdIncome: v })}
            placeholder="20,000"
            accentColor={TOOL.hue}
            step={INCOME_STEP}
            min={INCOME_MIN}
            max={INCOME_MAX}
            hint={
              result.incomeRatio > 0
                ? `יחס החזר/הכנסה: ${pct1(result.incomeRatio)} (תקרת בנק ישראל 40%)`
                : undefined
            }
          />
          <View style={styles.sliderWrap}>
            <MoneySlider
              label="החליקו לבחירה"
              value={incomeSliderValue}
              onChange={(v) => setState((p) => ({ ...p, householdIncome: String(v) }))}
              min={INCOME_MIN}
              max={INCOME_MAX}
              step={INCOME_STEP}
              unit=" ₪"
              accentColor={TOOL.hue}
              hideValueDisplay
            />
          </View>
        </View>

        <PeriodChips
          label="ריבית שנתית"
          value={state.annualRate}
          options={RATE_OPTIONS}
          onChange={(v) => setState({ ...state, annualRate: v })}
          unit="%"
          accentColor={TOOL.hue}
        />

        <PeriodChips
          label="תקופת החזר"
          value={state.years}
          options={YEARS_OPTIONS}
          onChange={(v) => setState({ ...state, years: v })}
          renderLabel={(v) => `${v} שנ׳`}
          accentColor={TOOL.hue}
        />

        {result.loanAmount > 0 ? (
          <>
            <SectionLabel>פירוט</SectionLabel>
            <MortgageBreakdown
              principal={result.loanAmount}
              interest={result.totalInterest}
            />
            {shortenInsight && shortenInsight.interestSaved > 0 ? (
              <View style={styles.shortenCard}>
                <View style={styles.shortenHeader}>
                  <View style={styles.shortenBadge}>
                    <Text style={styles.shortenBadgeText}>תקצר ב-5 שנים</Text>
                  </View>
                  <Text style={styles.shortenTitle}>
                    החזר על פני {shortenInsight.years} שנים במקום {state.years}
                  </Text>
                </View>
                <View style={styles.shortenTilesRow}>
                  <View style={styles.shortenTile}>
                    <Text style={styles.shortenTileLabel}>תשלום חודשי</Text>
                    <Text style={[styles.shortenTileValue, { color: '#b91c1c' }]}>
                      +{formatShekel(shortenInsight.extraMonthly)}
                    </Text>
                  </View>
                  <View style={styles.shortenTile}>
                    <Text style={styles.shortenTileLabel}>חיסכון בריבית</Text>
                    <Text style={[styles.shortenTileValue, { color: '#15803d' }]}>
                      −{formatShekel(shortenInsight.interestSaved)}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}
            {interestHeavy ? (
              <FinTip
                kind="warning"
                text="ריבית = הרוויח הבנק. אצלך הוא גדול מהקרן."
                subtext="כדאי לבדוק אם תוכל לקצר את התקופה או להגדיל את ההון העצמי."
              />
            ) : null}
          </>
        ) : null}

        <View style={[styles.tipCard, { borderColor: TOOL.hue + '40', backgroundColor: TOOL.light, shadowColor: TOOL.hue }]}>
          <Info size={16} color={TOOL.hue} />
          <Text style={styles.tipText}>
            <Text style={[styles.tipTextStrong, { color: TOOL.hue }]}>טיפ 2026:</Text> אפשר להשלים
            את ההון העצמי דרך הלוואת קבלן (לרוב נדחית עד כניסה לדירה) או מימון משלים מחוץ למשכנתא —
            שניהם נחשבים כחלק מהיחס הכולל ומשנים את ה-DSR.
          </Text>
        </View>

        <CalculateButton
          label="שתף תוצאה"
          sublabel={`${formatShekel(result.monthlyPayment)}/חודש · ${state.years} שנים`}
          variant="indigo"
          iconLeft={<Share2 size={18} color="#ffffff" strokeWidth={2.6} />}
          onPress={() =>
            Alert.alert(
              'שיתוף',
              `החזר חודשי ${formatShekel(result.monthlyPayment)} למשך ${state.years} שנים — סך ריבית ${formatShekel(result.totalInterest)}`,
            )
          }
        />

        <ToolNextStepCard toolKey="mortgage" accentColor={TOOL.hue} />

        <LegalDisclaimer
          scope="mortgage"
          extra="תקרות בנק ישראל בתוקף (DSR 40%, הון עצמי 25% לדירה ראשונה, 30% לחליפית, 50% להשקעה). הלוואות קבלן ומימון משלים זמינים בשוק 2026 אך מצריכים תכנון תזרים נפרד."
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: STITCH.background },
  scroll: { padding: 16, paddingBottom: 80, gap: 14 },

  statusBadge: {
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginTop: -4,
  },
  statusOk: { backgroundColor: '#dcfce7' },
  statusBad: { backgroundColor: '#fee2e2' },
  statusText: { fontSize: 13, fontWeight: '800', writingDirection: 'rtl' },
  statusOkText: { color: '#15803d' },
  statusBadText: { color: '#b91c1c' },

  inputCard: {
    backgroundColor: STITCH.surfaceLowest,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
    gap: 8,
  },
  sliderWrap: { paddingHorizontal: 2, paddingTop: 4 },

  infoBox: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: STITCH.onSurface,
    writingDirection: 'rtl',
    textAlign: 'right',
    fontWeight: '600',
  },
  infoTextStrong: { fontWeight: '900' },

  tipCard: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 19,
    color: STITCH.onSurface,
    writingDirection: 'rtl',
    textAlign: 'right',
    fontWeight: '600',
  },
  tipTextStrong: { fontWeight: '900' },

  // Shorten-by-5-years insight card
  shortenCard: {
    backgroundColor: STITCH.surfaceLowest,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: TOOL.hue + '40',
    gap: 10,
  },
  shortenHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shortenTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
    textAlign: 'right',
    flexShrink: 1,
  },
  shortenBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: TOOL.light,
    borderWidth: 1,
    borderColor: TOOL.hue + '40',
  },
  shortenBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: TOOL.deep,
    writingDirection: 'rtl',
  },
  shortenTilesRow: { flexDirection: 'row-reverse', gap: 8 },
  shortenTile: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    backgroundColor: STITCH.surfaceLow,
    alignItems: 'flex-end',
    gap: 2,
  },
  shortenTileLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
  },
  shortenTileValue: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
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
