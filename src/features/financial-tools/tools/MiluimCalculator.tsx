import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { Calculator, CheckCircle2, Share2, Shield } from 'lucide-react-native';

import { STITCH } from '../../../constants/theme';
import { formatShekel } from '../../../utils/format';
import { findTool } from '../toolsRegistry';
import { ToolHeader } from '../components/ToolHeader';
import { ToolNextStepCard } from '../components/ToolNextStepCard';
import {
  CalculateButton,
  FinTip,
  LegalDisclaimer,
  MoneySlider,
  PeriodChips,
  SectionLabel,
} from '../components/atoms';
import { PaymentBigDisplay } from '../components/charts';
import {
  MILUIM_BENEFITS,
  MILUIM_FACTS_ASOF,
  MILUIM_ROLE_LABEL,
  type MiluimRole,
  computeMiluim,
} from '../data/miluimData';

const TOOL = findTool('miluim')!;

const DAYS_MIN = 0;
const DAYS_MAX = 200;
const DAYS_STEP = 1;

const ROLES: readonly MiluimRole[] = ['combat', 'combat_support', 'rear'];

/**
 * מחשבון מילואימניק — "מפת הכסף" של מי ששירת.
 *
 * WHY (Yoav 18.9.26): ₪6.2B of 2026 reservist benefits, and the app had ZERO
 * words about reserve duty — while the user base (21–30) IS the reservist
 * population. Days served → tax-credit points → shekels, plus the grant
 * ladder and the benefits most people never claim.
 *
 * Every number lives in `data/miluimData.ts` with its source; this screen is
 * presentation only.
 */
export function MiluimCalculator(): React.ReactElement {
  const [days, setDays] = useState(45);
  const [role, setRole] = useState<MiluimRole>('combat');
  const [committed, setCommitted] = useState({ days: 45, role: 'combat' as MiluimRole });
  const [commitCount, setCommitCount] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const result = useMemo(() => computeMiluim(committed.days, committed.role), [committed]);
  const live = useMemo(() => computeMiluim(days, role), [days, role]);
  const liveDiffers = live.totalValue !== result.totalValue;

  const handleCalculate = useCallback(() => {
    setCommitted({ days, role });
    setCommitCount((c) => c + 1);
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 100);
  }, [days, role]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ToolHeader
        title="מחשבון מילואימניק"
        subtitle="כמה כסף מגיע לכם על הימים ששירתתם"
        accentColor={TOOL.hue}
        Icon={Shield}
        toolKey="miluim"
      />

      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View key={commitCount} entering={ZoomIn.springify().damping(8).mass(0.6)}>
          <PaymentBigDisplay
            amount={result.totalValue}
            label="שווי ההטבות המשוער לשנה"
            sublabel={`${committed.days} ימי שירות · ${MILUIM_ROLE_LABEL[committed.role]}`}
            accentColor={TOOL.hue}
            tintColor={TOOL.light}
          />
        </Animated.View>

        <SectionLabel>הנתונים שלכם</SectionLabel>

        <View style={styles.inputCard}>
          <MoneySlider
            label="ימי מילואים בשנה הקודמת (2025)"
            value={days}
            onChange={setDays}
            min={DAYS_MIN}
            max={DAYS_MAX}
            step={DAYS_STEP}
            unit=" ימים"
            accentColor={TOOL.hue}
            milestones={[30, 50, 90, 150]}
          />
        </View>

        <View style={styles.inputCard}>
          <PeriodChips<MiluimRole>
            label="סוג השירות"
            value={role}
            options={ROLES}
            onChange={setRole}
            renderLabel={(r) => MILUIM_ROLE_LABEL[r]}
            accentColor={TOOL.hue}
          />
        </View>

        <SectionLabel>מה מגיע לכם</SectionLabel>

        <View style={styles.breakdownCard}>
          <Row
            label="נקודות זיכוי במס"
            value={result.creditPoints > 0 ? `${result.creditPoints} נק׳ · ${formatShekel(result.creditPointsValue)}` : 'עוד לא — מ-30 ימים ומעלה'}
            strong={result.creditPoints > 0}
          />
          <Row
            label="תגמול נוסף (ביטוח לאומי)"
            value={result.grant > 0 ? formatShekel(result.grant) : 'מ-10 ימים ומעלה'}
            strong={result.grant > 0}
          />
          {result.notes.map((n) => (
            <Text key={n} style={styles.noteText}>{n}</Text>
          ))}
        </View>

        <SectionLabel>הטבות שרוב האנשים לא מממשים</SectionLabel>
        <View style={styles.benefitsCard}>
          {MILUIM_BENEFITS.map((b) => (
            <View key={b.title} style={styles.benefitRow}>
              <CheckCircle2 size={16} color={TOOL.hue} strokeWidth={2.6} />
              <View style={styles.benefitTextWrap}>
                <Text style={styles.benefitTitle}>{b.title}</Text>
                <Text style={styles.benefitBody}>{b.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <FinTip
          kind="secret"
          text="נקודות הזיכוי לא מגיעות לבד."
          subtext="הן נכנסות רק אם מעדכנים את המעסיק (טופס 101) או מגישים דוח שנתי. שנה שלא מימשתם — אפשר לדרוש עד 6 שנים אחורה."
        />

        <CalculateButton
          label="חשב"
          sublabel={liveDiffers ? `שווי משוער: ${formatShekel(live.totalValue)}` : 'תוצאה עדכנית'}
          variant="blue"
          iconLeft={<Calculator size={18} color="#ffffff" strokeWidth={2.6} />}
          onPress={handleCalculate}
        />

        <CalculateButton
          label="שלחו לחבר מהפלוגה"
          sublabel={`${formatShekel(result.totalValue)} על ${committed.days} ימים`}
          variant="indigo"
          iconLeft={<Share2 size={18} color="#ffffff" strokeWidth={2.6} />}
          onPress={() => {
            Share.share({
              message: `בדקתי ב-FinPlay כמה מגיע לי על המילואים\n\n${committed.days} ימי שירות → ${formatShekel(result.totalValue)} בשנה (נקודות זיכוי + מענקים)\n\nרוב האנשים לא מממשים. תבדוק גם אתה ב-FinPlay`,
            }).catch(() => { /* dismissed */ });
          }}
        />

        <ToolNextStepCard toolKey="miluim" accentColor={TOOL.hue} />

        <LegalDisclaimer scope="tax" extra={`הנתונים נכונים ל-${MILUIM_FACTS_ASOF}. הזכאות הסופית נקבעת על ידי צה"ל, ביטוח לאומי ורשות המסים.`} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }): React.ReactElement {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowValue, strong && { color: '#15803d' }]}>{value}</Text>
      <Text style={styles.rowLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: STITCH.background },
  scroll: { padding: 16, paddingBottom: 120, gap: 14 },
  inputCard: {
    backgroundColor: STITCH.surfaceLowest,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
  },
  breakdownCard: {
    backgroundColor: STITCH.surfaceLowest,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
    gap: 10,
  },
  row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  rowLabel: { fontSize: 13, fontWeight: '800', color: STITCH.onSurface, writingDirection: 'rtl', textAlign: 'right' },
  rowValue: { fontSize: 13, fontWeight: '900', color: STITCH.onSurfaceVariant, writingDirection: 'rtl' },
  noteText: { fontSize: 11.5, fontWeight: '600', color: STITCH.onSurfaceVariant, writingDirection: 'rtl', textAlign: 'right', lineHeight: 17 },
  benefitsCard: {
    backgroundColor: STITCH.surfaceLowest,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
    gap: 12,
  },
  benefitRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10 },
  benefitTextWrap: { flex: 1 },
  benefitTitle: { fontSize: 13, fontWeight: '900', color: STITCH.onSurface, writingDirection: 'rtl', textAlign: 'right' },
  benefitBody: { fontSize: 12, fontWeight: '600', color: STITCH.onSurfaceVariant, writingDirection: 'rtl', textAlign: 'right', lineHeight: 17, marginTop: 2 },
});
