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
  calculateNet,
  type MaritalStatus,
  type TaxCalculationResult,
} from '../utils/taxBrackets2026';
import { STITCH } from '../../../constants/theme';
import { tapHaptic } from '../../../utils/haptics';

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

const CREDIT_PRESETS: { label: string; value: number }[] = [
  { label: 'רווק/ה', value: 2.25 },
  { label: 'נשוי/אה', value: 2.75 },
  { label: 'חד-הורי', value: 3.25 },
  { label: 'נשוי + ילד', value: 4.25 },
];

const ACCENT = '#22c55e';

function formatShekel(n: number): string {
  return '₪' + Math.round(n).toLocaleString('he-IL');
}

export function SalaryNetCalculator(): React.ReactElement {
  const router = useRouter();
  const [state, setState] = useState<CalculatorState>(INITIAL_STATE);

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

  const monthlyDeductions =
    (result.incomeTax + result.bituachLeumi + result.masBriut) / 12;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="חזרה">
          <ChevronLeft size={24} color={STITCH.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>שכר ברוטו ↔ נטו</Text>
          <Text style={styles.headerSubtitle}>כמה נכנס לך לכיס באמת</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(360)} style={styles.resultCard}>
          <Text style={styles.resultLabel}>נטו לכיס</Text>
          <Text style={styles.resultBig} numberOfLines={1} adjustsFontSizeToFit>
            {formatShekel(result.netMonthly)}
          </Text>
          <Text style={styles.resultSub}>בחודש</Text>
          <View style={styles.resultMetaRow}>
            <Text style={styles.resultMeta}>{formatShekel(monthlyDeductions)} ניכויים</Text>
            <Text style={styles.resultMetaDot}>•</Text>
            <Text style={styles.resultMeta}>{result.effectiveRate.toFixed(1)}% אפקטיבי</Text>
          </View>
        </Animated.View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>שכר ברוטו חודשי</Text>
          <TextInput
            style={styles.input}
            value={state.monthlyGross}
            onChangeText={(v) => setState({ ...state, monthlyGross: v.replace(/[^0-9]/g, '') })}
            keyboardType="numeric"
            placeholder="12,000"
            placeholderTextColor="#94a3b8"
            accessibilityLabel="שכר ברוטו חודשי"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>נקודות זיכוי</Text>
          <View style={styles.presetRow}>
            {CREDIT_PRESETS.map((p) => {
              const selected = state.creditPoints === p.value;
              return (
                <Pressable
                  key={p.value}
                  onPress={() => {
                    tapHaptic();
                    setState({ ...state, creditPoints: p.value });
                  }}
                  style={[styles.preset, selected && styles.presetActive]}
                  accessibilityRole="button"
                  accessibilityLabel={p.label}
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.presetText, selected && styles.presetTextActive]}>{p.label}</Text>
                  <Text style={[styles.presetValue, selected && styles.presetValueActive]}>{p.value}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>פירוט הניכויים (חודשי)</Text>
          <BreakdownRow label="מס הכנסה" amount={result.incomeTax / 12} />
          <BreakdownRow label="ביטוח לאומי" amount={result.bituachLeumi / 12} />
          <BreakdownRow label="מס בריאות" amount={result.masBriut / 12} />
          <View style={styles.divider} />
          <BreakdownRow label="סך הכל ניכויים" amount={monthlyDeductions} bold />
        </View>

        <Pressable
          style={styles.shareBtn}
          onPress={() => {
            tapHaptic();
            Alert.alert('שיתוף', `הנטו שלי: ${formatShekel(result.netMonthly)}/חודש`);
          }}
          accessibilityRole="button"
          accessibilityLabel="שתף תוצאה"
        >
          <Share2 size={18} color="#fff" />
          <Text style={styles.shareText}>שתף תוצאה</Text>
        </Pressable>

        <Text style={styles.disclaimer}>
          הערכה בלבד, לא תחליף לתלוש שכר ממשי או ייעוץ מקצועי. נכון לשנת המס 2026.
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
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  resultLabel: { fontSize: 13, color: STITCH.onSurfaceVariant, writingDirection: 'rtl', marginBottom: 4 },
  resultBig: { fontSize: 56, fontWeight: '900', color: ACCENT, lineHeight: 64, letterSpacing: -1 },
  resultSub: { fontSize: 13, color: STITCH.onSurfaceVariant, writingDirection: 'rtl', marginTop: 4 },
  resultMetaRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginTop: 12 },
  resultMeta: { fontSize: 13, fontWeight: '700', color: STITCH.onSurface, writingDirection: 'rtl' },
  resultMetaDot: { color: STITCH.onSurfaceVariant },
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
  presetRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  preset: {
    flexBasis: '47%',
    flexGrow: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: STITCH.surfaceHighest,
    backgroundColor: STITCH.background,
    minHeight: 44,
    alignItems: 'center',
    gap: 2,
  },
  presetActive: { borderColor: ACCENT, backgroundColor: '#f0fdf4' },
  presetText: { fontSize: 12, color: STITCH.onSurfaceVariant, writingDirection: 'rtl', fontWeight: '600' },
  presetTextActive: { color: ACCENT },
  presetValue: { fontSize: 16, fontWeight: '900', color: STITCH.onSurface },
  presetValueActive: { color: ACCENT },
  breakdownRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  breakdownLabel: { fontSize: 13, color: STITCH.onSurfaceVariant, writingDirection: 'rtl' },
  breakdownAmount: { fontSize: 14, fontWeight: '700', color: STITCH.onSurface },
  breakdownBold: { fontWeight: '900', color: STITCH.onSurface, fontSize: 15 },
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
