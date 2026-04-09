/**
 * LiveChart — Web stub (Skia/CanvasKit not available on web).
 * Calm dark-gray line with subtle glow — no alarming colors.
 */
import { View, Text } from 'react-native';
import { ChartDataPoint } from './tradingHubTypes';

interface LiveChartProps {
  data: ChartDataPoint[];
  width?: number;
  height?: number;
  isLoading?: boolean;
}

// Calm dark-gray palette — matches native LiveChart.tsx
const UP_COLOR = '#374151';
const DOWN_COLOR = '#6b7280';

export function LiveChart({ data, width = 320, height = 220, isLoading }: LiveChartProps) {
  if (isLoading || !data || data.length < 2) {
    return (
      <View style={{ width, height, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', borderRadius: 12 }}>
        <Text style={{ color: '#64748b', fontSize: 12 }}>{isLoading ? 'טוען...' : 'אין נתונים'}</Text>
      </View>
    );
  }

  const PAD = { top: 16, bottom: 32, left: 8, right: 56 };
  const w = width - PAD.left - PAD.right;
  const h = height - PAD.top - PAD.bottom;

  const prices = data.map((d) => d.price);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;

  const points = data
    .map((d, i) => {
      const x = PAD.left + (i / (data.length - 1)) * w;
      const y = PAD.top + (1 - (d.price - minP) / range) * h;
      return `${x},${y}`;
    })
    .join(' ');

  const isRising = data[data.length - 1].price >= data[0].price;
  const lineColor = isRising ? UP_COLOR : DOWN_COLOR;
  const lastPrice = prices[prices.length - 1];

  return (
    <View style={{ width, height, borderRadius: 12, overflow: 'hidden', backgroundColor: '#f8fafc' }}>
      {/* @ts-ignore */}
      <svg width={width} height={height} style={{ position: 'absolute' }}>
        {/* @ts-ignore */}
        <polyline points={points} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <View style={{ position: 'absolute', right: 4, top: PAD.top + (1 - (lastPrice - minP) / range) * h - 10 }}>
        <Text style={{ color: lineColor, fontSize: 11, fontWeight: '700' }}>
          ${lastPrice.toFixed(2)}
        </Text>
      </View>
    </View>
  );
}
