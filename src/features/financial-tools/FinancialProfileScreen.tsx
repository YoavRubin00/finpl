import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserCog, Check } from 'lucide-react-native';

import { STITCH } from '../../constants/theme';
import { tapHaptic } from '../../utils/haptics';
import { useFinancialProfileStore, type MaritalStatus } from './useFinancialProfileStore';
import { ToolHeader } from './components/ToolHeader';
import { CalculateButton } from './components/atoms/CalculateButton';

const ACCENT = STITCH.primary;

const MARITAL_OPTIONS: { value: MaritalStatus; label: string }[] = [
  { value: 'single', label: 'רווק/ה' },
  { value: 'married', label: 'נשוי/אה' },
  { value: 'divorced', label: 'גרוש/ה' },
  { value: 'widowed', label: 'אלמן/ה' },
];

interface DraftState {
  monthlySalaryGross: string;
  monthlyTaxPaid: string;
  creditPoints: string;
  maritalStatus: MaritalStatus | null;
  kidsCount: string;
  monthsWorkedThisYear: string;
  householdMonthlyIncome: string;
  currentPensionDepositFee: string;
  currentPensionAccumulationFee: string;
}

function num(s: string): number | undefined {
  const t = s.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

export function FinancialProfileScreen(): React.ReactElement {
  const profile = useFinancialProfileStore((s) => s.profile);
  const updateFinancialProfile = useFinancialProfileStore((s) => s.update);
  const [saved, setSaved] = useState(false);

  const [draft, setDraft] = useState<DraftState>(() => ({
    monthlySalaryGross: profile.monthlySalaryGross
      ? String(profile.monthlySalaryGross)
      : '',
    monthlyTaxPaid: profile.monthlyTaxPaid ? String(profile.monthlyTaxPaid) : '',
    creditPoints: profile.creditPoints !== undefined ? String(profile.creditPoints) : '',
    maritalStatus: profile.maritalStatus ?? null,
    kidsCount: profile.kidsCount !== undefined ? String(profile.kidsCount) : '',
    monthsWorkedThisYear: profile.monthsWorkedThisYear !== undefined
      ? String(profile.monthsWorkedThisYear)
      : '',
    householdMonthlyIncome: profile.householdMonthlyIncome
      ? String(profile.householdMonthlyIncome)
      : '',
    currentPensionDepositFee: profile.currentPensionDepositFee !== undefined
      ? String(profile.currentPensionDepositFee)
      : '',
    currentPensionAccumulationFee: profile.currentPensionAccumulationFee !== undefined
      ? String(profile.currentPensionAccumulationFee)
      : '',
  }));

  const handleSave = () => {
    tapHaptic();
    updateFinancialProfile({
      monthlySalaryGross: num(draft.monthlySalaryGross),
      monthlyTaxPaid: num(draft.monthlyTaxPaid),
      creditPoints: num(draft.creditPoints),
      maritalStatus: draft.maritalStatus ?? undefined,
      kidsCount: num(draft.kidsCount),
      monthsWorkedThisYear: num(draft.monthsWorkedThisYear),
      householdMonthlyIncome: num(draft.householdMonthlyIncome),
      currentPensionDepositFee: num(draft.currentPensionDepositFee),
      currentPensionAccumulationFee: num(draft.currentPensionAccumulationFee),
    });
    setSaved(true);
    // Reset the success badge after 2s so a repeat save still gives feedback.
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ToolHeader
        title="פרופיל פיננסי"
        subtitle="הנתונים שלך — מילוי חד-פעמי, כל הכלים יודעים"
        accentColor={ACCENT}
        Icon={UserCog}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionLabel}>הכנסות</Text>

        <Field
          label="שכר ברוטו חודשי (₪)"
          value={draft.monthlySalaryGross}
          onChangeText={(v) => setDraft({ ...draft, monthlySalaryGross: digits(v) })}
          placeholder="12000"
        />
        <Field
          label="הכנסה חודשית של משק הבית (₪)"
          value={draft.householdMonthlyIncome}
          onChangeText={(v) => setDraft({ ...draft, householdMonthlyIncome: digits(v) })}
          placeholder="20000"
          hint="כולל שכר של בן/בת הזוג"
        />

        <Text style={styles.sectionLabel}>מס</Text>

        <Field
          label='מס שנוכה חודשי בממוצע (₪)'
          value={draft.monthlyTaxPaid}
          onChangeText={(v) => setDraft({ ...draft, monthlyTaxPaid: digits(v) })}
          placeholder="1100"
        />
        <Field
          label="נקודות זיכוי"
          value={draft.creditPoints}
          onChangeText={(v) => setDraft({ ...draft, creditPoints: numeric(v) })}
          placeholder="2.25"
        />
        <Field
          label="חודשי עבודה השנה"
          value={draft.monthsWorkedThisYear}
          onChangeText={(v) => setDraft({ ...draft, monthsWorkedThisYear: digits(v) })}
          placeholder="12"
        />

        <Text style={styles.sectionLabel}>משק בית</Text>

        <View style={styles.card}>
          <Text style={styles.label}>מצב משפחתי</Text>
          <View style={styles.chipRow}>
            {MARITAL_OPTIONS.map((o) => {
              const selected = draft.maritalStatus === o.value;
              return (
                <Pressable
                  key={o.value}
                  onPress={() => {
                    tapHaptic();
                    setDraft({ ...draft, maritalStatus: o.value });
                  }}
                  style={[styles.chip, selected && styles.chipActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                    {o.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Field
          label="מספר ילדים"
          value={draft.kidsCount}
          onChangeText={(v) => setDraft({ ...draft, kidsCount: digits(v) })}
          placeholder="0"
        />

        <Text style={styles.sectionLabel}>פנסיה</Text>

        <Field
          label="דמי ניהול מהפקדה (%)"
          value={draft.currentPensionDepositFee}
          onChangeText={(v) => setDraft({ ...draft, currentPensionDepositFee: numeric(v) })}
          placeholder="3.0"
        />
        <Field
          label="דמי ניהול מצבירה שנתי (%)"
          value={draft.currentPensionAccumulationFee}
          onChangeText={(v) => setDraft({ ...draft, currentPensionAccumulationFee: numeric(v) })}
          placeholder="0.3"
        />

        <View style={styles.saveWrap}>
          <CalculateButton
            label={saved ? 'נשמר ✓' : 'שמור פרופיל'}
            variant="blue"
            onPress={handleSave}
            iconLeft={<Check size={18} color="#ffffff" strokeWidth={2.6} />}
            accessibilityLabel="שמור פרופיל"
          />
        </View>

        <Text style={styles.disclaimer}>
          הנתונים נשמרים במכשיר ומסונכרנים לחשבון שלך. ניתן לעדכן בכל זמן.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// Small input field used throughout the profile form.
function Field({
  label,
  value,
  onChangeText,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        accessibilityLabel={label}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

function digits(s: string): string {
  return s.replace(/[^0-9]/g, '');
}

function numeric(s: string): string {
  return s.replace(/[^0-9.]/g, '');
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: STITCH.background },
  scroll: { padding: 16, paddingBottom: 80, gap: 10 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: STITCH.onSurfaceVariant,
    textAlign: 'right',
    writingDirection: 'rtl',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 2,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: STITCH.onSurface,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  input: {
    backgroundColor: STITCH.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: '800',
    color: STITCH.onSurface,
    textAlign: 'right',
    writingDirection: 'rtl',
    minHeight: 44,
  },
  hint: {
    fontSize: 11,
    color: STITCH.onSurfaceVariant,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  chipRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexBasis: '47%',
    flexGrow: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: STITCH.surfaceHighest,
    backgroundColor: STITCH.background,
    alignItems: 'center',
    minHeight: 40,
    justifyContent: 'center',
  },
  chipActive: { borderColor: ACCENT, backgroundColor: ACCENT + '14' },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
  },
  chipTextActive: { color: ACCENT },
  saveWrap: { marginTop: 8 },
  disclaimer: {
    fontSize: 11,
    color: STITCH.onSurfaceVariant,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: 6,
    lineHeight: 16,
  },
});
