/**
 * LiveChart — Bezier-curved line chart with right-side moving price tag.
 * Uses @shopify/react-native-skia for 60fps rendering.
 * Calm dark-gray line with subtle glow.
 */
import { useMemo } from 'react';
import { Dimensions, View, Text, StyleSheet } from 'react-native';
import {
  Canvas,
  Path as SkiaPath,
  LinearGradient as SkiaGradient,
  Line as SkiaLine,
  vec,
  Shadow,
} from '@shopify/react-native-skia';
import Animated, {
  FadeIn,
} from 'react-native-reanimated';
import { ChartDataPoint } from './tradingHubTypes';


const SCREEN_WIDTH = Dimensions.get('window').width;

interface LiveChartProps {
  data: ChartDataPoint[];
  width?: number;
  height?: number;
  isLoading?: boolean;
}

const PADDING = { top: 20, bottom: 36, left: 0, right: 60 };

function formatPriceShort(price: number): string {
  if (price >= 1000000) return `${(price / 1000000).toFixed(1)}M`;
  if (price >= 1000) return `${(price / 1000).toFixed(1)}K`;
  if (price >= 100) return price.toFixed(0);
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

// Calm dark-gray line with subtle glow — no alarming colors
const UP_COLOR = '#374151';
const DOWN_COLOR = '#6b7280';

export function LiveChart({
  data,
  width = SCREEN_WIDTH,
  height = 240,
  isLoading = false,
}: LiveChartProps) {
  const chartW = width - PADDING.left - PADDING.right;
  const chartH = height - PADDING.top - PADDING.bottom;

  const { linePath, fillPath, lineColor, gradientColors, lastPrice, priceY, isRising, gridLines } =
    useMemo(() => {
      if (data.length < 2) {
        return {
          linePath: '',
          fillPath: '',
          lineColor: UP_COLOR,
          gradientColors: ['rgba(55,65,81,0.15)', 'rgba(55,65,81,0)'] as [string, string],
          lastPrice: 0,
          priceY: PADDING.top + chartH / 2,
          isRising: true,
          gridLines: [] as { y: number; label: string }[],
        };
      }

      const prices = data.map((d) => d.price);
      const minP = Math.min(...prices);
      const maxP = Math.max(...prices);
      const range = maxP - minP || 1;

      const firstPrice = data[0].price;
      const currentPrice = data[data.length - 1].price;
      const rising = currentPrice >= firstPrice;
      const color = rising ? UP_COLOR : DOWN_COLOR;

      const normalize = (p: number) => (p - minP) / range;

      const points = data.map((d, i) => ({
        px: PADDING.left + (i / (data.length - 1)) * chartW,
        py: PADDING.top + (1 - normalize(d.price)) * chartH,
      }));

      let lineD = `M ${points[0].px} ${points[0].py}`;
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cpX = (prev.px + curr.px) / 2;
        lineD += ` Q ${cpX} ${prev.py} ${curr.px} ${curr.py}`;
      }

      const last = points[points.length - 1];
      const first = points[0];
      const fD = `${lineD} L ${last.px} ${height - PADDING.bottom} L ${first.px} ${height - PADDING.bottom} Z`;

      const gColors: [string, string] = rising
        ? ['rgba(55,65,81,0.15)', 'rgba(55,65,81,0)']
        : ['rgba(107,114,128,0.12)', 'rgba(107,114,128,0)'];

      // Build 4 horizontal grid lines at equal price intervals
      const gridCount = 4;
      const gridLines = Array.from({ length: gridCount }, (_, i) => {
        const ratio = i / (gridCount - 1);
        const price = minP + ratio * range;
        const y = PADDING.top + (1 - ratio) * chartH;
        return { y, label: formatPriceShort(price) };
      });

      return {
        linePath: lineD,
        fillPath: fD,
        lineColor: color,
        gradientColors: gColors,
        lastPrice: currentPrice,
        priceY: last.py,
        isRising: rising,
        gridLines,
      };
    }, [data, chartW, chartH, height]);

  if (isLoading || data.length < 2) {
    return (
      <View style={[styles.container, { width, height }]}>
        <Text style={styles.loadingText}>טוען נתונים...</Text>
      </View>
    );
  }

  const formatPrice = (price: number): string => {
    if (price >= 10000) return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (price >= 100) return price.toFixed(1);
    if (price >= 1) return price.toFixed(2);
    return price.toFixed(4);
  };

  // Clamp price tag Y so it stays within chart bounds
  const tagY = Math.max(PADDING.top, Math.min(priceY - 12, height - PADDING.bottom - 24));

  return (
    <Animated.View entering={FadeIn.duration(400)} style={{ width, height, position: 'relative' }}>
      <Canvas style={{ width, height }}>
        {/* Horizontal grid lines */}
        {gridLines.map((g, i) => (
          <SkiaLine
            key={i}
            p1={vec(PADDING.left, g.y)}
            p2={vec(width - PADDING.right, g.y)}
            color="rgba(148,163,184,0.15)"
            strokeWidth={1}
          />
        ))}

        {/* Gradient fill under curve */}
        <SkiaPath path={fillPath} style="fill">
          <SkiaGradient
            start={vec(0, PADDING.top)}
            end={vec(0, height - PADDING.bottom)}
            colors={gradientColors}
          />
        </SkiaPath>

        {/* Main line with glow */}
        <SkiaPath
          path={linePath}
          style="stroke"
          strokeWidth={2.5}
          strokeCap="round"
          strokeJoin="round"
          color={lineColor}
        >
          <Shadow dx={0} dy={4} blur={10} color={`${lineColor}60`} />
        </SkiaPath>
      </Canvas>

      {/* Grid price labels — left side */}
      {gridLines.map((g, i) => (
        <Text
          key={`lbl-${i}`}
          style={[styles.gridLabel, { top: g.y - 8 }]}
        >
          {g.label}
        </Text>
      ))}

      {/* Right-side price tag */}
      <View
        style={[
          styles.priceTag,
          {
            top: tagY,
            backgroundColor: isRising ? 'rgba(55,65,81,0.1)' : 'rgba(107,114,128,0.1)',
            borderColor: isRising ? UP_COLOR : DOWN_COLOR,
          },
        ]}
      >
        <Text
          style={[
            styles.priceText,
            { color: isRising ? UP_COLOR : DOWN_COLOR },
          ]}
        >
          {formatPrice(lastPrice)}
        </Text>
      </View>

      {/* Dashed horizontal line at current price */}
      <View
        style={[
          styles.priceLine,
          {
            top: priceY,
            width: chartW + PADDING.left,
            left: 0,
            borderColor: isRising ? `${UP_COLOR}30` : `${DOWN_COLOR}30`,
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    writingDirection: 'rtl',
  },
  gridLabel: {
    position: 'absolute',
    left: 4,
    fontSize: 9,
    fontWeight: '600',
    color: '#94a3b8',
    fontVariant: ['tabular-nums'],
  },
  priceTag: {
    position: 'absolute',
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  priceText: {
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  priceLine: {
    position: 'absolute',
    height: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
});
