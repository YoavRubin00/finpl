import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { fetchLatestPrice, fetchPreviousClose, isMarketOpen } from './marketApiService';
import { ASSET_BY_ID } from './tradingHubData';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

interface MarketStatusBarProps {
  /** Currently selected asset ID, used to override message when crypto is selected. */
  selectedAssetId?: string;
}

interface SnapshotState {
  price: number;
  previousClose: number | null;
}

export function MarketStatusBar({ selectedAssetId }: MarketStatusBarProps) {
  const [snapshot, setSnapshot] = useState<SnapshotState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const [price, previousClose] = await Promise.all([
        fetchLatestPrice('SPY'),
        fetchPreviousClose('SPY'),
      ]);
      if (!active) return;
      setSnapshot({ price, previousClose });
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const usMarketOpen = isMarketOpen('SPY');
  const selectedAsset = selectedAssetId ? ASSET_BY_ID.get(selectedAssetId) : null;
  const showCryptoNote = selectedAsset?.type === 'crypto';

  if (loading) {
    return (
      <View style={styles.bar} accessibilityRole="text" accessibilityLabel="טוען מצב שוק">
        <ActivityIndicator size="small" color="#64748b" />
        <Text style={[RTL, styles.message, { color: '#94a3b8' }]}>טוען מצב שוק...</Text>
      </View>
    );
  }

  if (!snapshot || snapshot.previousClose === null || snapshot.previousClose === 0) {
    // Real fetch failed; show neutral status without %
    return (
      <View style={styles.bar} accessibilityRole="text">
        <Text style={styles.statusDot}>{usMarketOpen ? '🟢' : '🌙'}</Text>
        <Text style={[RTL, styles.message]}>
          {usMarketOpen ? 'השוק האמריקאי פתוח' : 'השוק האמריקאי סגור'}
        </Text>
      </View>
    );
  }

  const delta = snapshot.price - snapshot.previousClose;
  const deltaPct = (delta / snapshot.previousClose) * 100;
  const rising = delta >= 0;
  const pctText = `${rising ? '+' : ''}${deltaPct.toFixed(2)}%`;
  const pctColor = rising ? '#16a34a' : '#dc2626';

  // When viewing a crypto asset, lead with "crypto is 24/7" so the user isn't
  // misled by a "US market closed" headline on a BTC chart.
  if (showCryptoNote) {
    const accLabel = `קריפטו פתוח 24/7. S&P 500 ${pctText} ${usMarketOpen ? 'היום' : 'בסגירה'}`;
    return (
      <View style={styles.bar} accessibilityRole="text" accessibilityLabel={accLabel}>
        <Text style={styles.statusDot}>🟢</Text>
        <Text style={[RTL, styles.message]} numberOfLines={1}>
          <Text style={styles.headline}>קריפטו פתוח 24/7</Text>
          <Text style={styles.separator}> · </Text>
          <Text style={styles.spyText}>S&P 500 </Text>
          <Text style={[styles.pct, { color: pctColor }]}>{pctText}</Text>
        </Text>
      </View>
    );
  }

  const dot = usMarketOpen ? '🟢' : '🌙';
  const headline = usMarketOpen ? 'השוק האמריקאי פתוח' : 'השוק האמריקאי סגור';
  const stateText = usMarketOpen ? `${pctText} היום` : `נסגר ב-${pctText}`;
  const accLabel = `${headline}. S&P 500 ${stateText}`;

  return (
    <View style={styles.bar} accessibilityRole="text" accessibilityLabel={accLabel}>
      <Text style={styles.statusDot}>{dot}</Text>
      <Text style={[RTL, styles.message]} numberOfLines={1}>
        <Text style={styles.headline}>{headline}</Text>
        <Text style={styles.separator}> · </Text>
        <Text style={styles.spyText}>S&P 500 </Text>
        <Text style={[styles.pct, { color: pctColor }]}>{pctText}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  statusDot: {
    fontSize: 12,
  },
  message: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  headline: {
    color: '#0f172a',
    fontWeight: '800',
  },
  separator: {
    color: '#94a3b8',
    fontWeight: '700',
  },
  spyText: {
    color: '#475569',
    fontWeight: '700',
  },
  pct: {
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  cryptoBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0e7490',
    backgroundColor: '#cffafe',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
});
