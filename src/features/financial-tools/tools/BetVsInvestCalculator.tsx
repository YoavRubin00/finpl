import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { Calculator, Dices, Share2 } from 'lucide-react-native';

import { STITCH } from '../../../constants/theme';
import { formatShekel } from '../../../utils/format';
import { findTool } from '../toolsRegistry';
import { ToolHeader } from '../components/ToolHeader';
import { ToolNextStepCard } from '../components/ToolNextStepCard';
import { CalculateButton, FinTip, LegalDisclaimer, MoneySlider, SectionLabel } from '../components/atoms';

const TOOL = findTool('bet-vs-invest')!;

// Return-to-player of Israeli sports betting (ווינר): the regulator caps the
// payout ratio; the long-run share of stakes paid back to players is ~70%.
// ⚠️ pending חוקרון confirmation against המועצה להסדר ההימורים בספורט reports.
//  // source: docs/content/FACTS-2026-09-trends.md §5
const BET_RTP = 0.70;
// Long-run equity return used across the app (assetCatalog snp500 default).
const MARKET_RETURN = 0.10;

interface Result {
  totalStaked: number;
  betExpected: number; // expected money left after N years of betting
  investValue: number;
  burned: number;
}

/**
 * Same ₪ every week for N years. BETTING: each week the expected value of the
 * stake is stake × RTP; the "house edge" is gone for good. Losses don't
 * compound — the money just leaves. INVESTING: the same weekly stake buys
 * an index fund and compounds at MARKET_RETURN.
 */
function compute(weekly: number, years: number): Result {
  const weeks = years * 52;
  const totalStaked = weekly * weeks;
  const betExpected = totalStaked * BET_RTP;
  const wr = Math.pow(1 + MARKET_RETURN, 1 / 52) - 1;
  let inv = 0;
  for (let w = 0; w < weeks; w++) inv = inv * (1 + wr) + weekly;
  return {
    totalStaked: Math.round(totalStaked),
    betExpected: Math.round(betExpected),
    investValue: Math.round(inv),
    burned: Math.round(totalStaked - betExpected),
  };
}

export function BetVsInvestCalculator(): React.ReactElement {
  const [weekly, setWeekly] = useState(100);
  const [years, setYears] = useState(10);
  const [committed, setCommitted] = useState({ weekly: 100, years: 10 });
  const [commitCount, setCommitCount] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const result = useMemo(() => compute(committed.weekly, committed.years), [committed]);
  const live = useMemo(() => compute(weekly, years), [weekly, years]);
  const gap = result.investValue - result.betExpected;

  const handleCalculate = useCallback(() => {
    setCommitted({ weekly, years });
    setCommitCount((c) => c + 1);
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 100);
  }, [weekly, years]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ToolHeader
        title="הימור מול השקעה"
        subtitle="אותו כסף כל שבוע. שני עתידים."
        accentColor={TOOL.hue}
        Icon={Dices}
        toolKey="bet-vs-invest"
      />

      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View key={commitCount} entering={ZoomIn.springify().damping(8).mass(0.6)}>
          <View style={[styles.heroCard, { borderColor: TOOL.hue + '55', backgroundColor: TOOL.light }]}>
            <Text style={[styles.heroLabel, { color: TOOL.deep }]}>הפער אחרי {committed.years} שנים</Text>
            <Text style={styles.heroValue}>{formatShekel(gap)}</Text>
            <View style={styles.compareRow}>
              <Tile label="הימורים — מה שנשאר בממוצע" value={result.betExpected} tone="bad" />
              <Tile label="תעודת סל — שווי התיק" value={result.investValue} tone="good" />
            </View>
            <Text style={styles.heroSub}>
              סה"כ שהכנסתם: {formatShekel(result.totalStaked)} · הבית לקח: {formatShekel(result.burned)}
            </Text>
          </View>
        </Animated.View>

        <SectionLabel>כמה וכמה זמן</SectionLabel>
        <View style={styles.inputCard}>
          <MoneySlider label="סכום שבועי" value={weekly} onChange={setWeekly} min={20} max={1_000} step={10} unit=" ₪" accentColor={TOOL.hue} milestones={[50, 100, 250, 500]} />
        </View>
        <View style={styles.inputCard}>
          <MoneySlider label="כמה שנים" value={years} onChange={setYears} min={1} max={30} step={1} formatValue={(v) => `${v} שנ׳`} accentColor={TOOL.hue} milestones={[5, 10, 20]} />
        </View>

        {/* מחקר פרופ' ענת שושני, אונ' רייכמן + ICA, 3,878 נבדקים, 2026 (ynet) —
            FACTS-2026-09 §5 */}
        <FinTip
          kind="tip"
          text="17% מבני הנוער בישראל הימרו על כסף בשנה האחרונה."
          subtext="מחקר אוניברסיטת רייכמן, 2026. זה מתחיל צעיר — ולכן החשבון הזה חשוב דווקא עכשיו."
        />
        <FinTip
          kind="warning"
          text="הבית תמיד מנצח — זה לא מזל, זה מתמטיקה."
          subtext={`על כל ₪100 שמהמרים, בממוצע חוזרים כ-₪${Math.round(BET_RTP * 100)}. הזכייה הגדולה של השכן היא הסטטיסטיקה, לא היוצא מן הכלל.`}
        />
        <FinTip
          kind="grow"
          text="השוק לא מבטיח כלום בשבוע. ב-20 שנה הוא כמעט לא איכזב."
          subtext="ההנחה כאן: 10% בשנה — הממוצע ההיסטורי של ה-S&P 500. שנים רעות כלולות בממוצע הזה."
        />

        <CalculateButton
          label="חשב"
          sublabel={live.investValue !== result.investValue ? `פער משוער: ${formatShekel(live.investValue - live.betExpected)}` : 'תוצאה עדכנית'}
          variant="blue"
          iconLeft={<Calculator size={18} color="#ffffff" strokeWidth={2.6} />}
          onPress={handleCalculate}
        />
        <CalculateButton
          label="שתף עם מי שמהמר"
          sublabel={`${formatShekel(committed.weekly)} בשבוע · ${committed.years} שנים`}
          variant="indigo"
          iconLeft={<Share2 size={18} color="#ffffff" strokeWidth={2.6} />}
          onPress={() => {
            Share.share({
              message: `${formatShekel(committed.weekly)} בשבוע, ${committed.years} שנים.\n\nהימורים: נשאר בממוצע ${formatShekel(result.betExpected)}\nתעודת סל: ${formatShekel(result.investValue)}\n\nהפער: ${formatShekel(gap)}. בדקתי ב-FinPlay`,
            }).catch(() => { /* dismissed */ });
          }}
        />

        <ToolNextStepCard toolKey="bet-vs-invest" accentColor={TOOL.hue} />
        <LegalDisclaimer scope="general" extra="תשואות העבר אינן ערובה לעתיד. ההשוואה מבוססת על תוחלת סטטיסטית ואינה תחזית לתוצאה אישית." />
      </ScrollView>
    </SafeAreaView>
  );
}

function Tile({ label, value, tone }: { label: string; value: number; tone: 'good' | 'bad' }): React.ReactElement {
  return (
    <View style={[styles.tile, tone === 'good' ? styles.tileGood : styles.tileBad]}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={[styles.tileValue, { color: tone === 'good' ? '#15803d' : '#b91c1c' }]}>{formatShekel(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: STITCH.background },
  scroll: { padding: 16, paddingBottom: 120, gap: 14 },
  inputCard: { backgroundColor: STITCH.surfaceLowest, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: STITCH.surfaceHighest },
  heroCard: { borderRadius: 20, borderWidth: 1.5, padding: 16, gap: 8, alignItems: 'center' },
  heroLabel: { fontSize: 13, fontWeight: '900', writingDirection: 'rtl' },
  heroValue: { fontSize: 32, fontWeight: '900', color: STITCH.onSurface, letterSpacing: -0.6, writingDirection: 'rtl' },
  heroSub: { fontSize: 11.5, fontWeight: '600', color: STITCH.onSurfaceVariant, writingDirection: 'rtl', textAlign: 'center' },
  compareRow: { flexDirection: 'row-reverse', gap: 10, width: '100%', marginTop: 4 },
  tile: { flex: 1, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center', borderWidth: 1 },
  tileGood: { backgroundColor: '#f0fdf4', borderColor: '#86efac' },
  tileBad: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  tileLabel: { fontSize: 10.5, fontWeight: '800', color: STITCH.onSurfaceVariant, writingDirection: 'rtl', textAlign: 'center' },
  tileValue: { fontSize: 15, fontWeight: '900', writingDirection: 'rtl', marginTop: 2 },
});
