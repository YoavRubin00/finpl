import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { SECTOR } from '../../../constants/theme';
import { Sparkline } from './Sparkline';
import type { StockCategoryId } from '../fantasyTypes';

interface Props {
  ticker: string;
  name: string;
  sectorLabel: string;
  categoryId: StockCategoryId;
  returnPercent: number;
  series?: number[];
}

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

function deterministicSeries(seed: string, finalChange: number): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h = (h ^ seed.charCodeAt(i)) * 16777619;
  }
  const rand = (n: number): number => {
    h = (h ^ (h << 13)) >>> 0;
    h = (h ^ (h >>> 7)) >>> 0;
    h = (h ^ (h << 17)) >>> 0;
    return ((h % 1000) / 1000 - 0.5) * n;
  };
  const points = 8;
  const out: number[] = [];
  let val = 100;
  for (let i = 0; i < points; i++) {
    const targetProgress = (i / (points - 1)) * finalChange;
    val = 100 + targetProgress + rand(Math.abs(finalChange) * 0.4 + 1.5);
    out.push(val);
  }
  out[out.length - 1] = 100 + finalChange;
  return out;
}

export function PortfolioSlotCard({
  ticker,
  name,
  sectorLabel,
  categoryId,
  returnPercent,
  series,
}: Props): React.ReactElement {
  const positive = returnPercent >= 0;
  const sector = SECTOR[categoryId];

  const sparkValues = useMemo(
    () => series ?? deterministicSeries(ticker, returnPercent),
    [series, ticker, returnPercent],
  );

  const pillBg = positive ? '#dcfce7' : '#fee2e2';
  const pillText = positive ? '#15803d' : '#b91c1c';
  const arrow = positive ? '↗' : '↘';

  return (
    <View
      style={{
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 14,
        gap: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#0f172a',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
      }}
      accessibilityRole="text"
      accessibilityLabel={`${name}, ${sectorLabel}, ${positive ? 'עלייה' : 'ירידה'} של ${Math.abs(returnPercent).toFixed(1)} אחוז`}
    >
      {/* Ticker chip — leftmost in RTL = rightmost visually */}
      <View
        style={{
          backgroundColor: sector.chip,
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 6,
          minWidth: 52,
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 11, fontWeight: '900', color: sector.chipText, letterSpacing: 0.5 }}>
          {ticker}
        </Text>
      </View>

      {/* Name + sector */}
      <View style={{ alignItems: 'flex-end', minWidth: 70 }}>
        <Text style={[{ fontSize: 14, fontWeight: '800', color: '#0f172a' }, RTL]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[{ fontSize: 11, color: '#64748b', marginTop: 2 }, RTL]} numberOfLines={1}>
          {sectorLabel}
        </Text>
      </View>

      {/* Sparkline */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Sparkline values={sparkValues} positive={positive} />
      </View>

      {/* Return pill */}
      <View
        style={{
          backgroundColor: pillBg,
          borderRadius: 999,
          paddingHorizontal: 10,
          paddingVertical: 5,
          flexDirection: 'row-reverse',
          alignItems: 'center',
          gap: 3,
          minWidth: 78,
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: '900', color: pillText }}>
          {positive ? '+' : ''}{returnPercent.toFixed(2)}%
        </Text>
        <Text style={{ fontSize: 10, color: pillText, fontWeight: '900' }}>{arrow}</Text>
      </View>
    </View>
  );
}
