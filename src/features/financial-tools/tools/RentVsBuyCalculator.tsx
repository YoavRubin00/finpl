import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { Calculator, KeyRound, Share2 } from 'lucide-react-native';

import { STITCH } from '../../../constants/theme';
import { clamp, formatShekel } from '../../../utils/format';
import { findTool } from '../toolsRegistry';
import { ToolHeader } from '../components/ToolHeader';
import { ToolNextStepCard } from '../components/ToolNextStepCard';
import {
  CalculateButton,
  FinTip,
  LegalDisclaimer,
  MoneyInput,
  MoneySlider,
  SectionLabel,
} from '../components/atoms';

const TOOL = findTool('rent-vs-buy')!;

// Defaults — Israeli 2026 norms. Sources:
//   home appreciation 3.5%/yr → assetCatalog.ts real_estate default (blended national CAGR)
//   mortgage 4.75% → prime after the 1.9.2026 BoI cut to 3.25% (FACTS-2026-09 §6)
//   alt. return 8% → assetCatalog equity default
//   rent growth 3%/yr → CBS Aug-2026: renewals +2.6%, new tenants +4.4%
//   purchase costs 2% → lawyer + broker + fees (single-home purchase tax ≈ 0 below the first bracket)
const DEFAULTS = {
  price: 1_800_000,
  rent: 5_500,
  downPct: 25,
  mortgageRate: 4.75,
  years: 10,
  homeGrowth: 3.5,
  altReturn: 8,
  rentGrowth: 3,
  purchaseCostPct: 2,
};

interface Inputs {
  price: string;
  rent: string;
  downPct: number;
  mortgageRate: number;
  years: number;
  homeGrowth: number;
  altReturn: number;
  rentGrowth: number;
}

interface Result {
  buyNetWorth: number;
  rentNetWorth: number;
  monthlyMortgage: number;
  delta: number; // buy − rent
  downPayment: number;
}

/**
 * Both paths start with the same cash (the down payment). BUY: pay purchase
 * costs, take a mortgage, home appreciates, loan amortizes → equity after N
 * years. RENT: invest the down payment + every month invest the difference
 * between the mortgage payment and rent (when rent is cheaper) — or, when
 * rent is dearer, the buyer pockets the difference instead. Net worth is
 * compared apples-to-apples at year N.
 */
function compute(i: Inputs): Result {
  const price = Number(i.price) || 0;
  const rent0 = Number(i.rent) || 0;
  const downPayment = price * (i.downPct / 100);
  const loan = Math.max(0, price - downPayment);
  const n = i.years * 12;
  const mr = i.mortgageRate / 100 / 12;
  const N_LOAN = 25 * 12;
  const monthlyMortgage =
    loan <= 0 ? 0 : mr === 0 ? loan / N_LOAN : (loan * mr * Math.pow(1 + mr, N_LOAN)) / (Math.pow(1 + mr, N_LOAN) - 1);

  // Remaining loan after n payments
  let balance = loan;
  for (let m = 0; m < n; m++) {
    const interest = balance * mr;
    balance = Math.max(0, balance - (monthlyMortgage - interest));
  }
  const homeValue = price * Math.pow(1 + i.homeGrowth / 100, i.years);
  const buyNetWorth = homeValue - balance - price * (DEFAULTS.purchaseCostPct / 100);

  // Renter: down payment invested + monthly (mortgage − rent) invested when positive.
  const altM = i.altReturn / 100 / 12;
  let portfolio = downPayment;
  let buyerSideCash = 0; // when rent > mortgage, the buyer saves the gap
  let rent = rent0;
  for (let m = 0; m < n; m++) {
    if (m > 0 && m % 12 === 0) rent *= 1 + i.rentGrowth / 100;
    portfolio *= 1 + altM;
    const gap = monthlyMortgage - rent;
    if (gap > 0) portfolio += gap;
    else {
      buyerSideCash *= 1 + altM;
      buyerSideCash += -gap;
    }
  }
  const rentNetWorth = portfolio;
  const buyTotal = buyNetWorth + buyerSideCash;
  return {
    buyNetWorth: Math.round(buyTotal),
    rentNetWorth: Math.round(rentNetWorth),
    monthlyMortgage: Math.round(monthlyMortgage),
    delta: Math.round(buyTotal - rentNetWorth),
    downPayment,
  };
}

const INITIAL: Inputs = {
  price: String(DEFAULTS.price),
  rent: String(DEFAULTS.rent),
  downPct: DEFAULTS.downPct,
  mortgageRate: DEFAULTS.mortgageRate,
  years: DEFAULTS.years,
  homeGrowth: DEFAULTS.homeGrowth,
  altReturn: DEFAULTS.altReturn,
  rentGrowth: DEFAULTS.rentGrowth,
};

export function RentVsBuyCalculator(): React.ReactElement {
  const [state, setState] = useState<Inputs>(INITIAL);
  const [committed, setCommitted] = useState<Inputs>(INITIAL);
  const [commitCount, setCommitCount] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const result = useMemo(() => compute(committed), [committed]);
  const live = useMemo(() => compute(state), [state]);
  const buyWins = result.delta > 0;

  const handleCalculate = useCallback(() => {
    setCommitted(state);
    setCommitCount((c) => c + 1);
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 100);
  }, [state]);

  const priceVal = clamp(Number(state.price) || 500_000, 500_000, 6_000_000);
  const rentVal = clamp(Number(state.rent) || 2_000, 2_000, 20_000);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ToolHeader
        title="שכירות מול קנייה"
        subtitle="אחרי X שנים — למי יש יותר כסף?"
        accentColor={TOOL.hue}
        Icon={KeyRound}
        toolKey="rent-vs-buy"
      />

      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View key={commitCount} entering={ZoomIn.springify().damping(8).mass(0.6)}>
          <View style={[styles.verdictCard, { borderColor: TOOL.hue + '55', backgroundColor: TOOL.light }]}>
            <Text style={[styles.verdictTitle, { color: TOOL.deep }]}>
              {buyWins ? 'אחרי ' : 'אחרי '}
              {committed.years} שנים — {buyWins ? 'לקנות' : 'לשכור ולהשקיע'} מוביל
            </Text>
            <Text style={styles.verdictDelta}>
              ב-{formatShekel(Math.abs(result.delta))}
            </Text>
            <View style={styles.compareRow}>
              <Compare label="קנייה" value={result.buyNetWorth} win={buyWins} />
              <Compare label="שכירות + השקעה" value={result.rentNetWorth} win={!buyWins} />
            </View>
            <Text style={styles.verdictSub}>
              החזר משכנתא משוער: {formatShekel(result.monthlyMortgage)}/חודש · הון עצמי {formatShekel(result.downPayment)}
            </Text>
          </View>
        </Animated.View>

        <SectionLabel>הדירה</SectionLabel>
        <View style={styles.inputCard}>
          <MoneyInput
            label="מחיר הדירה"
            value={state.price}
            onChangeText={(v) => setState({ ...state, price: v })}
            placeholder="1,800,000"
            accentColor={TOOL.hue}
            step={50_000}
            min={500_000}
            max={6_000_000}
          />
          <View style={styles.sliderWrap}>
            <MoneySlider label="החליקו לבחירה" value={priceVal} onChange={(v) => setState((p) => ({ ...p, price: String(v) }))} min={500_000} max={6_000_000} step={50_000} unit=" ₪" accentColor={TOOL.hue} hideValueDisplay />
          </View>
        </View>

        <View style={styles.inputCard}>
          <MoneyInput
            label="שכר דירה חודשי לדירה דומה"
            value={state.rent}
            onChangeText={(v) => setState({ ...state, rent: v })}
            placeholder="5,500"
            accentColor={TOOL.hue}
            step={250}
            min={2_000}
            max={20_000}
          />
          <View style={styles.sliderWrap}>
            <MoneySlider label="החליקו לבחירה" value={rentVal} onChange={(v) => setState((p) => ({ ...p, rent: String(v) }))} min={2_000} max={20_000} step={250} unit=" ₪" accentColor={TOOL.hue} hideValueDisplay />
          </View>
        </View>

        <View style={styles.inputCard}>
          <MoneySlider label="הון עצמי" value={state.downPct} onChange={(v) => setState((p) => ({ ...p, downPct: v }))} min={25} max={70} step={5} unit="%" accentColor={TOOL.hue} />
        </View>
        <View style={styles.inputCard}>
          <MoneySlider label="ריבית משכנתא" value={state.mortgageRate} onChange={(v) => setState((p) => ({ ...p, mortgageRate: v }))} min={2.5} max={8} step={0.1} unit="%" formatValue={(v) => v.toFixed(1)} accentColor={TOOL.hue} />
        </View>
        <View style={styles.inputCard}>
          <MoneySlider label="אופק זמן" value={state.years} onChange={(v) => setState((p) => ({ ...p, years: v }))} min={3} max={25} step={1} formatValue={(v) => `${v} שנ׳`} accentColor={TOOL.hue} />
        </View>

        <SectionLabel>ההנחות (אפשר לשנות)</SectionLabel>
        <View style={styles.inputCard}>
          <MoneySlider label="עליית ערך הדירה בשנה" value={state.homeGrowth} onChange={(v) => setState((p) => ({ ...p, homeGrowth: v }))} min={0} max={8} step={0.5} unit="%" formatValue={(v) => v.toFixed(1)} accentColor={TOOL.hue} />
        </View>
        <View style={styles.inputCard}>
          <MoneySlider label="תשואה על ההשקעה החלופית" value={state.altReturn} onChange={(v) => setState((p) => ({ ...p, altReturn: v }))} min={2} max={12} step={0.5} unit="%" formatValue={(v) => v.toFixed(1)} accentColor={TOOL.hue} />
        </View>
        <View style={styles.inputCard}>
          <MoneySlider label="עליית שכר הדירה בשנה" value={state.rentGrowth} onChange={(v) => setState((p) => ({ ...p, rentGrowth: v }))} min={0} max={8} step={0.5} unit="%" formatValue={(v) => v.toFixed(1)} accentColor={TOOL.hue} />
        </View>

        <FinTip
          kind="tip"
          text="התשובה תלויה בשלושה מספרים, לא בדעה."
          subtext="עליית ערך הדירה, תשואת ההשקעה החלופית, וכמה שנים נשארים. שנו אותם ותראו איך המנצח מתחלף."
        />

        <CalculateButton
          label="חשב"
          sublabel={live.delta !== result.delta ? `פער משוער: ${formatShekel(Math.abs(live.delta))} לטובת ${live.delta > 0 ? 'קנייה' : 'שכירות'}` : 'תוצאה עדכנית'}
          variant="blue"
          iconLeft={<Calculator size={18} color="#ffffff" strokeWidth={2.6} />}
          onPress={handleCalculate}
        />
        <CalculateButton
          label="שתף תוצאה"
          sublabel={`${buyWins ? 'קנייה' : 'שכירות'} מובילה ב-${formatShekel(Math.abs(result.delta))}`}
          variant="indigo"
          iconLeft={<Share2 size={18} color="#ffffff" strokeWidth={2.6} />}
          onPress={() => {
            Share.share({
              message: `בדקתי ב-FinPlay: לשכור או לקנות?\n\nדירה ב-${formatShekel(Number(committed.price))}, שכירות ${formatShekel(Number(committed.rent))}/חודש\nאחרי ${committed.years} שנים: ${buyWins ? 'קנייה' : 'שכירות + השקעה'} מובילה ב-${formatShekel(Math.abs(result.delta))}\n\nתבדוק גם אתה ב-FinPlay`,
            }).catch(() => { /* dismissed */ });
          }}
        />

        <ToolNextStepCard toolKey="rent-vs-buy" accentColor={TOOL.hue} />
        <LegalDisclaimer scope="mortgage" extra="ההשוואה מניחה תשואות קבועות ואינה כוללת מס רכישה מעל מדרגת הפטור, שיפוצים, ועד בית ותקופות ללא שוכר." />
      </ScrollView>
    </SafeAreaView>
  );
}

function Compare({ label, value, win }: { label: string; value: number; win: boolean }): React.ReactElement {
  return (
    <View style={[styles.compareTile, win && styles.compareTileWin]}>
      <Text style={styles.compareLabel}>{label}</Text>
      <Text style={[styles.compareValue, win && { color: '#15803d' }]}>{formatShekel(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: STITCH.background },
  scroll: { padding: 16, paddingBottom: 120, gap: 14 },
  inputCard: { backgroundColor: STITCH.surfaceLowest, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: STITCH.surfaceHighest },
  sliderWrap: { marginTop: 8 },
  verdictCard: { borderRadius: 20, borderWidth: 1.5, padding: 16, gap: 8, alignItems: 'center' },
  verdictTitle: { fontSize: 16, fontWeight: '900', writingDirection: 'rtl', textAlign: 'center' },
  verdictDelta: { fontSize: 30, fontWeight: '900', color: STITCH.onSurface, letterSpacing: -0.5, writingDirection: 'rtl' },
  verdictSub: { fontSize: 11.5, fontWeight: '600', color: STITCH.onSurfaceVariant, writingDirection: 'rtl', textAlign: 'center' },
  compareRow: { flexDirection: 'row-reverse', gap: 10, width: '100%', marginTop: 4 },
  compareTile: { flex: 1, backgroundColor: '#ffffff', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center', borderWidth: 1, borderColor: STITCH.surfaceHighest },
  compareTileWin: { borderColor: '#86efac', backgroundColor: '#f0fdf4' },
  compareLabel: { fontSize: 11, fontWeight: '800', color: STITCH.onSurfaceVariant, writingDirection: 'rtl' },
  compareValue: { fontSize: 15, fontWeight: '900', color: STITCH.onSurface, writingDirection: 'rtl', marginTop: 2 },
});
