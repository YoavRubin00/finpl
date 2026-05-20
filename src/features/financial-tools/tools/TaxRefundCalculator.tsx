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
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, Share2 } from 'lucide-react-native';

import {
  calculateIncomeTax,
  type MaritalStatus,
} from '../utils/taxBrackets2026';
import { STITCH } from '../../../constants/theme';
import { tapHaptic } from '../../../utils/haptics';

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

const ACCENT = '#fb923c';

const STATUS_OPTIONS: { value: MaritalStatus; label: string }[] = [
  { value: 'single', label: 'רווק/ה' },
  { value: 'married', label: 'נשוי/אה' },
  { value: 'divorced', label: 'גרוש/ה' },
  { value: 'widowed', label: 'אלמן/ה' },
];

const MONTHS_OPTIONS = [6, 9, 12];
const KIDS_OPTIONS = [0, 1, 2, 3];

function formatShekel(n: number): string {
  return '₪' + Math.round(n).toLocaleString('he-IL');
}

function getCreditPoints(status: MaritalStatus, kids: number): number {
  const base = status === 'divorced' ? 3.25 : 2.25;
  return base + kids;
}

export function TaxRefundCalculator(): React.ReactElement {
  const router = useRouter();
  const [state, setState] = useState<TaxRefundInput>(DEFAULT_STATE);

  const result: TaxRefundResult = useMemo(() => {
    const annualGross = Number(state.annualGross) || 0;
    const actualTax = Number(state.taxPaid) || 0;
    const extraDeposits = Number(state.extraDeposits) || 0;

    const totalCreditPoints = getCreditPoints(state.status, state.kidsCount);
    const annualizedGross =
      state.monthsWorked < 12 && state.monthsWorked > 0
        ? (annualGross / state.monthsWorked) * 12
        : annualGross;
    const theoreticalTaxFull = calculateIncomeTax(annualizedGross, totalCreditPoints);
    const theoreticalTaxProRata = theoreticalTaxFull * (state.monthsWorked / 12);
    const depositCredit = Math.min(extraDeposits * 0.35, 7_700);
    const refund = Math.max(0, actualTax - theoreticalTaxProRata) + depositCredit;

    return {
      estimatedRefund: Math.round(refund),
      theoreticalTax: Math.round(theoreticalTaxProRata),
      actualTax,
      depositCredit: Math.round(depositCredit),
    };
  }, [state]);

  const hasInput = (Number(state.annualGross) || 0) > 0 && (Number(state.taxPaid) || 0) > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="חזרה">
          <ChevronLeft size={24} color={STITCH.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>החזר מס</Text>
          <Text style={styles.headerSubtitle}>8 מתוך 10 ישראלים זכאים — ממוצע ₪10,500</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(360)} style={styles.resultCard}>
          <Text style={styles.resultLabel}>
            {hasInput ? 'אולי מחכים לך' : 'מלא את הפרטים כדי לראות הערכה'}
          </Text>
          <Text style={styles.resultBig} numberOfLines={1} adjustsFontSizeToFit>
            {formatShekel(result.estimatedRefund)}
          </Text>
          {hasInput ? (
            <Text style={styles.resultSub}>
              🦈 תיגש לקחת — זה הכסף שלך
            </Text>
          ) : null}
        </Animated.View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>ברוטו שנתי (סך טופס 106)</Text>
          <TextInput
            style={styles.input}
            value={state.annualGross}
            onChangeText={(v) => setState({ ...state, annualGross: v.replace(/[^0-9]/g, '') })}
            keyboardType="numeric"
            placeholder="120,000"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>מס שנוכה בפועל</Text>
          <TextInput
            style={styles.input}
            value={state.taxPaid}
            onChangeText={(v) => setState({ ...state, taxPaid: v.replace(/[^0-9]/g, '') })}
            keyboardType="numeric"
            placeholder="13,000"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>חודשי עבודה השנה</Text>
          <View style={styles.row}>
            {MONTHS_OPTIONS.map((m) => {
              const selected = state.monthsWorked === m;
              return (
                <Pressable
                  key={m}
                  onPress={() => {
                    tapHaptic();
                    setState({ ...state, monthsWorked: m });
                  }}
                  style={[styles.chip, selected && styles.chipActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`${m} חודשי עבודה`}
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextActive]}>{m}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>ילדים</Text>
          <View style={styles.row}>
            {KIDS_OPTIONS.map((k) => {
              const selected = state.kidsCount === k;
              return (
                <Pressable
                  key={k}
                  onPress={() => {
                    tapHaptic();
                    setState({ ...state, kidsCount: k });
                  }}
                  style={[styles.chip, selected && styles.chipActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`${k} ילדים`}
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextActive]}>{k === 3 ? '3+' : k}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>מצב משפחתי</Text>
          <View style={styles.row}>
            {STATUS_OPTIONS.map((s) => {
              const selected = state.status === s.value;
              return (
                <Pressable
                  key={s.value}
                  onPress={() => {
                    tapHaptic();
                    setState({ ...state, status: s.value });
                  }}
                  style={[styles.chipWide, selected && styles.chipActive]}
                  accessibilityRole="button"
                  accessibilityLabel={s.label}
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextActive]}>{s.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>הפקדות עצמאיות לקופ"ג (לא דרך תלוש)</Text>
          <TextInput
            style={styles.input}
            value={state.extraDeposits}
            onChangeText={(v) => setState({ ...state, extraDeposits: v.replace(/[^0-9]/g, '') })}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#94a3b8"
          />
        </View>

        {hasInput ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>פירוט</Text>
            <BreakdownRow label="מס שנוכה בפועל" amount={result.actualTax} />
            <BreakdownRow label="מס תיאורטי לחודשי עבודה" amount={result.theoreticalTax} />
            {result.depositCredit > 0 ? (
              <BreakdownRow label="זיכוי על הפקדות (35%)" amount={result.depositCredit} />
            ) : null}
            <View style={styles.divider} />
            <BreakdownRow label="החזר משוער" amount={result.estimatedRefund} bold />
          </View>
        ) : null}

        <Pressable
          style={styles.shareBtn}
          onPress={() => {
            tapHaptic();
            Alert.alert('שיתוף', `מגיע לי החזר מס משוער של ${formatShekel(result.estimatedRefund)}!`);
          }}
          accessibilityRole="button"
          accessibilityLabel="שתף תוצאה"
        >
          <Share2 size={18} color="#fff" />
          <Text style={styles.shareText}>שתף תוצאה</Text>
        </Pressable>

        <Text style={styles.disclaimer}>
          הערכה בלבד, לא תחליף לייעוץ מס אישי. החזר בפועל מחושב ע"י רשות המסים על סמך טפסי 106 והכנסות נוספות.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function BreakdownRow({ label, amount, bold }: { label: string; amount: number; bold?: boolean }) {
  return (
    <View style={styles.breakdownRow}>
      <Text style={[styles.breakdownLabel, bold && styles.breakdownBold]}>{label}</Text>
      <Text style={[styles.breakdownAmount, bold && styles.breakdownBold]}>{formatShekel(amount)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: STITCH.background },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: STITCH.surfaceHighest,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', transform: [{ scaleX: -1 }] },
  headerTitle: { fontSize: 20, fontWeight: '900', color: STITCH.onSurface, textAlign: 'right', writingDirection: 'rtl' },
  headerSubtitle: { fontSize: 12, color: STITCH.onSurfaceVariant, textAlign: 'right', writingDirection: 'rtl', marginTop: 2 },
  scroll: { padding: 16, paddingBottom: 80, gap: 14 },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  resultLabel: { fontSize: 13, color: STITCH.onSurfaceVariant, writingDirection: 'rtl', marginBottom: 4, textAlign: 'center' },
  resultBig: { fontSize: 56, fontWeight: '900', color: ACCENT, lineHeight: 64, letterSpacing: -1 },
  resultSub: { fontSize: 14, color: STITCH.onSurface, writingDirection: 'rtl', marginTop: 8, fontWeight: '700' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
    gap: 10,
  },
  cardLabel: { fontSize: 13, fontWeight: '800', color: STITCH.onSurface, textAlign: 'right', writingDirection: 'rtl' },
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
    minWidth: 60,
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
  chipWide: {
    flexBasis: '47%',
    flexGrow: 1,
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
  chipActive: { borderColor: ACCENT, backgroundColor: '#fff7ed' },
  chipText: { fontSize: 15, fontWeight: '800', color: STITCH.onSurface, writingDirection: 'rtl' },
  chipTextActive: { color: ACCENT },
  breakdownRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  breakdownLabel: { fontSize: 13, color: STITCH.onSurfaceVariant, writingDirection: 'rtl' },
  breakdownAmount: { fontSize: 14, fontWeight: '700', color: STITCH.onSurface },
  breakdownBold: { fontWeight: '900', color: ACCENT, fontSize: 16 },
  divider: { height: 1, backgroundColor: STITCH.surfaceHighest, marginVertical: 4 },
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
