import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeIn, useSharedValue, withRepeat, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import { useLiveMarketStore } from '../../../stores/useLiveMarketStore';
import type { RateItem } from '../liveMarketTypes';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

function formatAge(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'עכשיו';
  if (diff === 1) return 'לפני דקה';
  if (diff < 60) return `לפני ${diff} דקות`;
  const h = Math.floor(diff / 60);
  return h === 1 ? 'לפני שעה' : `לפני ${h} שעות`;
}

function Arrow({ dir }: { dir: RateItem['direction'] }) {
  if (dir === 'up') return <Text style={styles.arrowUp}>▲</Text>;
  if (dir === 'down') return <Text style={styles.arrowDown}>▼</Text>;
  return <Text style={styles.arrowStable}>—</Text>;
}

function RateCell({ item }: { item: RateItem }) {
  const hasChange = item.changePct !== 0;
  return (
    <View style={styles.cell}>
      <View style={styles.cellHeader}>
        <Arrow dir={item.direction} />
        <Text style={styles.cellLabel} numberOfLines={1}>{item.label}</Text>
      </View>
      <Text style={styles.cellValue} numberOfLines={1}>{item.value}</Text>
      {hasChange && (
        <Text style={[styles.cellChange, item.direction === 'up' ? styles.changeUp : styles.changeDown]}>
          {item.changePct > 0 ? '+' : ''}{item.changePct.toFixed(1)}%
        </Text>
      )}
    </View>
  );
}

const FALLBACK_RATES: RateItem[] = [
  { value: '₪3.65', numericValue: 3.65, changePct: 0, direction: 'stable', label: 'דולר / שקל', symbol: '$' },
  { value: '$65,000', numericValue: 65000, changePct: 0, direction: 'stable', label: 'ביטקוין', symbol: '₿' },
  { value: '2,100', numericValue: 2100, changePct: 0, direction: 'stable', label: 'ת"א 125', symbol: '📈' },
  { value: '4.50%', numericValue: 4.5, changePct: 0, direction: 'stable', label: 'ריבית בנק ישראל', symbol: '🏦' },
  { value: '₪4.00', numericValue: 4.0, changePct: 0, direction: 'stable', label: 'יורו / שקל', symbol: '€' },
];

/**
 * Returns a monotonically increasing day-index that increments at 21:00 Israel
 * summer time (IDT = UTC+3). Uses 18:00 UTC as the boundary, which equals
 * 21:00 IDT (summer) and 20:00 IST (winter — 1 h early, acceptable).
 * Epoch-based to avoid month-rollover parity flips.
 */
function israelRotationIndex(): number {
  const BOUNDARY_UTC_MS = 18 * 60 * 60 * 1000; // 18:00 UTC = 21:00 IDT
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.floor((Date.now() - BOUNDARY_UTC_MS) / MS_PER_DAY);
}

/**
 * Rotates slot 0 daily at 21:00 Israel time:
 *   Even index → [USD/ILS, BTC, TA-125, Interest Rate]
 *   Odd  index → [EUR/ILS, BTC, TA-125, Interest Rate]
 * ריבית בנק ישראל stays pinned in slot 3 (important stable Israeli metric).
 * BTC and TA-125 always in slots 1-2.
 */
function selectDisplayRates(rates: RateItem[], rotIdx: number): RateItem[] {
  if (rates.length < 5) return rates.slice(0, 4);
  const slot0 = rotIdx % 2 === 0 ? rates[0] : rates[4]; // USD/ILS or EUR/ILS
  return [slot0, rates[1], rates[2], rates[3]];
}

export function LiveMarketCard() {
  const { data, loading, error, fetch } = useLiveMarketStore();
  const [rotIdx, setRotIdx] = useState(israelRotationIndex);

  useEffect(() => { fetch(); }, [fetch]);

  // Re-evaluate rotation every minute so the swap happens at 21:00 Israel time
  // even if the app is already open.
  useEffect(() => {
    const t = setInterval(() => setRotIdx(israelRotationIndex()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Pulsing LIVE dot
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.2, { duration: 900 }), -1, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const dotStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.liveRow}>
          <Animated.View style={[styles.liveDot, dotStyle]} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        <Text style={[styles.title, RTL]}>מדדים בזמן אמת</Text>
      </View>

      {/* Grid */}
      {loading && !data ? (
        <View style={styles.loadingBox}>
          <Text style={styles.loadingText}>טוען נתונים...</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {selectDisplayRates(data?.rates ?? FALLBACK_RATES, rotIdx).map((item, idx) => (
            <RateCell key={idx} item={item} />
          ))}
        </View>
      )}

      {/* Footer */}
      {error && !data ? (
        <Pressable onPress={() => fetch()} accessibilityRole="button" accessibilityLabel="נסה שוב" hitSlop={8}>
          <Text style={[styles.footer, RTL]}>נתונים לא זמינים · לחץ לנסות שוב</Text>
        </Pressable>
      ) : data?.fetchedAt ? (
        <Pressable
          onPress={() => fetch()}
          accessibilityRole="button"
          accessibilityLabel="רענן נתוני שוק"
          hitSlop={8}
        >
          <Text style={[styles.footer, RTL]}>
            עודכן {formatAge(data.fetchedAt)} · לחץ לרענון
          </Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 18,
    gap: 14,
    borderWidth: 1.5,
    borderColor: '#1e3a5f',
    shadowColor: '#38bdf8',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: '#f1f5f9',
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1e3a5f',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: '#f87171',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#f87171',
    letterSpacing: 1.5,
  },
  grid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
  },
  cell: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cellHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
  },
  cellLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    writingDirection: 'rtl',
    textAlign: 'right',
    flex: 1,
  },
  cellValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#f1f5f9',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  cellChange: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  changeUp: { color: '#34d399' },
  changeDown: { color: '#f87171' },
  arrowUp: { fontSize: 12, color: '#34d399' },
  arrowDown: { fontSize: 12, color: '#f87171' },
  arrowStable: { fontSize: 12, color: '#64748b' },
  loadingBox: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
    writingDirection: 'rtl',
  },
  footer: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
});