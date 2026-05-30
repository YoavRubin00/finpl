import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Users } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { STITCH } from '../../../constants/theme';
import {
  AGE_BAND_LABEL,
  SALARY_BAND_LABEL,
  getMarketAverage,
  toAgeBand,
  toSalaryBand,
} from '../data/pensionMarketAverages';

interface PensionBenchmarkCardProps {
  age: number;
  monthlySalary: number;
  /** User's current deposit fee % (e.g. 3.0). */
  currentDepositFee: number;
  /** User's current accumulation fee % (e.g. 0.3). */
  currentAccumulationFee: number;
  /** Accent color from the tool registry (pink for pension). */
  accentColor: string;
}

type Verdict = 'above' | 'at' | 'below';

const DEPOSIT_TOLERANCE = 0.3;
const ACCUM_TOLERANCE = 0.05;

function determineVerdict(
  userDeposit: number,
  userAccum: number,
  avgDeposit: number,
  avgAccum: number,
): Verdict {
  const depositGap = userDeposit - avgDeposit;
  const accumGap = userAccum - avgAccum;
  if (depositGap >= DEPOSIT_TOLERANCE && accumGap >= ACCUM_TOLERANCE) return 'above';
  if (depositGap <= -DEPOSIT_TOLERANCE && accumGap <= -ACCUM_TOLERANCE) return 'below';
  return 'at';
}

const VERDICT_COPY: Record<Verdict, { headline: string; toneColor: string; toneBg: string }> = {
  above: {
    headline: 'אתה משלם יותר מהממוצע — כדאי לבדוק החלפה',
    toneColor: '#b91c1c',
    toneBg: '#fee2e2',
  },
  at: {
    headline: 'אתה בממוצע השוק — יש מקום לחסוך',
    toneColor: '#9a3412',
    toneBg: '#fff7ed',
  },
  below: {
    headline: 'אתה משלם פחות מהממוצע — שמור עליה',
    toneColor: '#15803d',
    toneBg: '#dcfce7',
  },
};

/**
 * "You vs. peers" benchmark for pension fees. Reads age + salary, looks up the
 * market average for the user's segment, and renders two comparison bars —
 * yours vs. peer average — for deposit fee and accumulation fee.
 *
 * The headline color flips by verdict: red when above peer avg, neutral at
 * avg, green when below. Anchors the comparison so the user understands not
 * just "how much can I save" but "how much am I paying vs. everyone like me".
 */
export function PensionBenchmarkCard({
  age,
  monthlySalary,
  currentDepositFee,
  currentAccumulationFee,
  accentColor,
}: PensionBenchmarkCardProps): React.ReactElement {
  const { ageBand, salaryBand, avg, verdict } = useMemo(() => {
    const a = toAgeBand(age);
    const s = toSalaryBand(monthlySalary);
    const m = getMarketAverage(age, monthlySalary);
    const v = determineVerdict(
      currentDepositFee,
      currentAccumulationFee,
      m.depositFee,
      m.accumulationFee,
    );
    return { ageBand: a, salaryBand: s, avg: m, verdict: v };
  }, [age, monthlySalary, currentDepositFee, currentAccumulationFee]);
  const copy = VERDICT_COPY[verdict];

  return (
    <Animated.View entering={FadeInDown.duration(360)} style={styles.card}>
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: accentColor + '22' }]}>
          <Users size={16} color={accentColor} strokeWidth={2.6} />
        </View>
        <Text style={styles.title}>אתה לעומת אנשים כמוך</Text>
      </View>

      <View style={[styles.headlinePill, { backgroundColor: copy.toneBg }]}>
        <Text style={[styles.headlineText, { color: copy.toneColor }]}>
          {copy.headline}
        </Text>
      </View>

      <CompareRow
        label="דמי ניהול מהפקדה"
        userValue={currentDepositFee}
        peerValue={avg.depositFee}
        accent={accentColor}
        unit="%"
      />
      <CompareRow
        label="דמי ניהול מצבירה"
        userValue={currentAccumulationFee}
        peerValue={avg.accumulationFee}
        accent={accentColor}
        unit="%"
      />

      <Text style={styles.footnote}>
        ממוצע השוק לגיל {AGE_BAND_LABEL[ageBand]} · שכר {SALARY_BAND_LABEL[salaryBand]}
      </Text>
    </Animated.View>
  );
}

function CompareRow({
  label,
  userValue,
  peerValue,
  accent,
  unit,
}: {
  label: string;
  userValue: number;
  peerValue: number;
  accent: string;
  unit: string;
}): React.ReactElement {
  const maxValue = Math.max(userValue, peerValue, 0.01);
  const userPct = (userValue / maxValue) * 100;
  const peerPct = (peerValue / maxValue) * 100;
  const userIsHigher = userValue > peerValue;

  return (
    <View style={styles.compareBlock}>
      <Text style={styles.compareLabel}>{label}</Text>

      <View style={styles.barRow}>
        <Text
          style={[
            styles.barValue,
            userIsHigher ? { color: '#b91c1c' } : { color: STITCH.onSurface },
          ]}
        >
          {userValue.toFixed(2)}{unit}
        </Text>
        <Text style={styles.barLeader}>אתה</Text>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              {
                width: `${userPct}%`,
                backgroundColor: userIsHigher ? '#ef4444' : accent,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.barRow}>
        <Text style={[styles.barValue, { color: STITCH.onSurfaceVariant }]}>
          {peerValue.toFixed(2)}{unit}
        </Text>
        <Text style={[styles.barLeader, { color: STITCH.onSurfaceVariant }]}>ממוצע</Text>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              {
                width: `${peerPct}%`,
                backgroundColor: STITCH.outline,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: STITCH.surfaceLowest,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
    gap: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '900',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
  },
  headlinePill: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headlineText: {
    fontSize: 13,
    fontWeight: '900',
    writingDirection: 'rtl',
    textAlign: 'right',
    lineHeight: 18,
  },
  compareBlock: {
    gap: 4,
  },
  compareLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
    textAlign: 'right',
    letterSpacing: 0.3,
  },
  barRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  barLeader: {
    fontSize: 10,
    fontWeight: '900',
    color: STITCH.onSurface,
    width: 38,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: STITCH.surfaceLow,
    borderRadius: 999,
    overflow: 'hidden',
  },
  // RTL: bar fills from the right edge inward.
  barFill: {
    height: '100%',
    borderRadius: 999,
    alignSelf: 'flex-end',
  },
  barValue: {
    fontSize: 12,
    fontWeight: '900',
    width: 60,
    textAlign: 'left',
    writingDirection: 'rtl',
  },
  footnote: {
    fontSize: 10,
    fontWeight: '700',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
    textAlign: 'right',
    marginTop: 2,
  },
});
