/**
 * SkiaInteractiveChart — Web stub (Skia/CanvasKit not available on web).
 * Renders a simple SVG polyline fallback.
 */
import { View, Text } from 'react-native';

export interface ChartDataPoint {
  x: number;
  y: number;
  label?: string;
}

interface SkiaInteractiveChartProps {
  data: ChartDataPoint[];
  width?: number;
  height?: number;
  lineColor?: string;
  gradientColors?: [string, string];
  glowColor?: string;
  onScrub?: (normalizedX: number, dataIndex: number) => void;
  hapticMilestone?: number;
}

export function SkiaInteractiveChart({
  data,
  width = 300,
  height = 180,
  lineColor = '#39FF14',
}: SkiaInteractiveChartProps) {
  if (!data || data.length < 2) {
    return (
      <View style={{ width, height, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12 }}>
        <Text style={{ color: '#555', fontSize: 12 }}>אין נתונים</Text>
      </View>
    );
  }

  const PAD = 12;
  const w = width - PAD * 2;
  const h = height - PAD * 2;

  const points = data
    .map((d) => `${PAD + d.x * w},${PAD + (1 - d.y) * h}`)
    .join(' ');

  return (
    <View style={{ width, height, borderRadius: 12, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.2)' }}>
      {/* @ts-ignore — svg works in web Expo */}
      <svg width={width} height={height} style={{ position: 'absolute' }}>
        {/* @ts-ignore */}
        <polyline points={points} fill="none" stroke={lineColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </View>
  );
}
