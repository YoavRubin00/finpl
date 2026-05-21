import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Home, Share2 } from 'lucide-react-native';

import { STITCH } from '../../../constants/theme';
import { tapHaptic } from '../../../utils/haptics';
import { ToolHeader } from '../components/ToolHeader';

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

const ACCENT = '#6366f1';
const RATE_OPTIONS = [3.5, 4.0, 4.5, 5.0, 5.5, 6.0];
const YEARS_OPTIONS = [15, 20, 25, 30];

function formatShekel(n: number): string {
  return '₪' + Math.round(n).toLocaleString('he-IL');
}

function formatPercent(n: number): string {
  return (n * 100).toFixed(1) + '%';
}

export function MortgageCalculator(): React.ReactElement {
  const [state, setState] = useState<MortgageInput>(DEFAULT_STATE);

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
    const isApproved = incomeRatio <= 0.40 && incomeRatio > 0;
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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ToolHeader
        title="מחשבון משכנתא"
        subtitle="האם אני יכול להרשות לעצמי?"
        accentColor={ACCENT}
        Icon={Home}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(360)} style={styles.resultCard}>
          <Text style={styles.resultLabel}>החזר חודשי משוער</Text>
          <Text style={styles.resultBig} numberOfLines={1} adjustsFontSizeToFit>
            {formatShekel(result.monthlyPayment)}
          </Text>
          <Text style={styles.resultSub}>למשך {state.years} שנים</Text>
          {result.loanAmount > 0 ? (
            <View style={[styles.statusBadge, approvalStatus ? styles.statusOk : styles.statusBad]}>
              <Text style={[styles.statusBadgeText, approvalStatus ? styles.statusOkText : styles.statusBadText]}>
                {approvalStatus ? '🟢 עוברת תקרות בנק ישראל' : '🔴 לא עוברת תקרות בנק ישראל'}
              </Text>
            </View>
          ) : null}
        </Animated.View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>מחיר הדירה</Text>
          <TextInput
            style={styles.input}
            value={state.propertyPrice}
            onChangeText={(v) => setState({ ...state, propertyPrice: v.replace(/[^0-9]/g, '') })}
            keyboardType="numeric"
            placeholder="2,000,000"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardLabel}>הון עצמי</Text>
            <Text style={[styles.cardSubLabel, !result.meetsDownPaymentReq && styles.warn]}>
              {formatPercent(result.downPaymentRatio)} (דרוש ≥25%)
            </Text>
          </View>
          <TextInput
            style={styles.input}
            value={state.downPayment}
            onChangeText={(v) => setState({ ...state, downPayment: v.replace(/[^0-9]/g, '') })}
            keyboardType="numeric"
            placeholder="500,000"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>הכנסה חודשית משק בית</Text>
          <TextInput
            style={styles.input}
            value={state.householdIncome}
            onChangeText={(v) => setState({ ...state, householdIncome: v.replace(/[^0-9]/g, '') })}
            keyboardType="numeric"
            placeholder="20,000"
            placeholderTextColor="#94a3b8"
          />
          {result.incomeRatio > 0 ? (
            <Text style={[styles.cardSubLabel, !result.isApproved && styles.warn]}>
              יחס החזר/הכנסה: {formatPercent(result.incomeRatio)} (תקרת בנק ישראל 40%)
            </Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>ריבית שנתית</Text>
          <View style={styles.row}>
            {RATE_OPTIONS.map((r) => {
              const selected = state.annualRate === r;
              return (
                <Pressable
                  key={r}
                  onPress={() => {
                    tapHaptic();
                    setState({ ...state, annualRate: r });
                  }}
                  style={[styles.chip, selected && styles.chipActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`ריבית ${r} אחוז`}
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextActive]}>{r}%</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>תקופת החזר</Text>
          <View style={styles.row}>
            {YEARS_OPTIONS.map((y) => {
              const selected = state.years === y;
              return (
                <Pressable
                  key={y}
                  onPress={() => {
                    tapHaptic();
                    setState({ ...state, years: y });
                  }}
                  style={[styles.chip, selected && styles.chipActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`${y} שנים`}
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextActive]}>{y} שנ׳</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {result.loanAmount > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>פירוט</Text>
            <BreakdownRow label="גובה הלוואה" amount={result.loanAmount} />
            <BreakdownRow label="סך תשלום לאורך התקופה" amount={result.totalPaid} />
            <BreakdownRow
              label={interestHeavy ? 'סך ריבית 🔥' : 'סך ריבית'}
              amount={result.totalInterest}
              warn={interestHeavy}
            />
          </View>
        ) : null}

        <Pressable
          style={styles.shareBtn}
          onPress={() => {
            tapHaptic();
            Alert.alert(
              'שיתוף',
              `החזר חודשי ${formatShekel(result.monthlyPayment)} למשך ${state.years} שנים — סך ריבית ${formatShekel(result.totalInterest)}`,
            );
          }}
          accessibilityRole="button"
          accessibilityLabel="שתף תוצאה"
        >
          <Share2 size={18} color="#fff" />
          <Text style={styles.shareText}>שתף תוצאה</Text>
        </Pressable>

        <Text style={styles.disclaimer}>
          הערכה בלבד, לא תחליף ליועץ משכנתאות. תקרות בנק ישראל בתוקף (DSR 40%, הון עצמי 25% לדירה ראשונה). הריבית בפועל תיקבע ע"י הבנק.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function BreakdownRow({ label, amount, warn }: { label: string; amount: number; warn?: boolean }) {
  return (
    <View style={styles.breakdownRow}>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <Text style={[styles.breakdownAmount, warn && styles.warn]}>{formatShekel(amount)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: STITCH.background },
  scroll: { padding: 16, paddingBottom: 80, gap: 14 },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  resultLabel: { fontSize: 13, color: STITCH.onSurfaceVariant, writingDirection: 'rtl', marginBottom: 4 },
  resultBig: { fontSize: 52, fontWeight: '900', color: ACCENT, lineHeight: 60, letterSpacing: -1 },
  resultSub: { fontSize: 13, color: STITCH.onSurfaceVariant, writingDirection: 'rtl', marginTop: 4 },
  statusBadge: { marginTop: 14, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  statusOk: { backgroundColor: '#dcfce7' },
  statusBad: { backgroundColor: '#fee2e2' },
  statusBadgeText: { fontSize: 13, fontWeight: '800', writingDirection: 'rtl' },
  statusOkText: { color: '#15803d' },
  statusBadText: { color: '#b91c1c' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
    gap: 10,
  },
  rowBetween: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { fontSize: 13, fontWeight: '800', color: STITCH.onSurface, textAlign: 'right', writingDirection: 'rtl' },
  cardSubLabel: { fontSize: 12, color: STITCH.onSurfaceVariant, writingDirection: 'rtl' },
  warn: { color: '#b91c1c' },
  input: {
    backgroundColor: STITCH.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 22,
    fontWeight: '800',
    color: STITCH.onSurface,
    textAlign: 'right',
    writingDirection: 'rtl',
    minHeight: 50,
  },
  row: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  chip: {
    minWidth: 64,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: STITCH.surfaceHighest,
    backgroundColor: STITCH.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { borderColor: ACCENT, backgroundColor: '#eef2ff' },
  chipText: { fontSize: 14, fontWeight: '800', color: STITCH.onSurface, writingDirection: 'rtl' },
  chipTextActive: { color: ACCENT },
  breakdownRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  breakdownLabel: { fontSize: 13, color: STITCH.onSurfaceVariant, writingDirection: 'rtl' },
  breakdownAmount: { fontSize: 14, fontWeight: '700', color: STITCH.onSurface },
  shareBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 14,
    minHeight: 50,
  },
  shareText: { color: '#fff', fontSize: 15, fontWeight: '900', writingDirection: 'rtl' },
  disclaimer: { fontSize: 11, color: STITCH.onSurfaceVariant, textAlign: 'center', writingDirection: 'rtl', marginTop: 8, lineHeight: 16 },
});
