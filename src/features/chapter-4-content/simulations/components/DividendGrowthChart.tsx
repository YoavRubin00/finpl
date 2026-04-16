import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { GlowCard } from '../../../../components/ui/GlowCard';
import { LottieIcon } from '../../../../components/ui/LottieIcon';
import { SIM4, RTL } from '../simTheme';
import { formatShekel } from '../../../../utils/format';
import { DIVIDEND_COLORS as COLORS } from './dividendTreeConstants';

const SCREEN_WIDTH = Dimensions.get('window').width;

const LOTTIE_CHART = require('../../../../../assets/lottie/wired-flat-153-bar-chart-hover-pinch.json');
const LOTTIE_GROWTH = require('../../../../../assets/lottie/wired-flat-161-growth-hover-pinch.json');
const LOTTIE_DECREASE = require('../../../../../assets/lottie/wired-flat-162-decrease-hover-pinch.json');

interface GrowthChartProps {
  eatHistory: Array<{ year: number; treeValue: number }>;
  plantHistory: Array<{ year: number; treeValue: number }>;
  initialInvestment: number;
}

function GrowthChartImpl({ eatHistory, plantHistory, initialInvestment }: GrowthChartProps) {
  if (eatHistory.length < 2) return null;

  const chartWidth = SCREEN_WIDTH - 80;
  const chartHeight = 120;

  const allValues = [
    initialInvestment,
    ...eatHistory.map((y) => y.treeValue),
    ...plantHistory.map((y) => y.treeValue),
  ];
  const maxVal = Math.max(...allValues) * 1.05;
  const minVal = Math.min(...allValues) * 0.95;
  const range = maxVal - minVal || 1;

  const totalYears = 20;
  const stepX = chartWidth / totalYears;

  const getY = (val: number) => chartHeight - ((val - minVal) / range) * chartHeight;

  const eatPoints = [
    { x: 0, y: getY(initialInvestment) },
    ...eatHistory.map((yr) => ({ x: yr.year * stepX, y: getY(yr.treeValue) })),
  ];
  const plantPoints = [
    { x: 0, y: getY(initialInvestment) },
    ...plantHistory.map((yr) => ({ x: yr.year * stepX, y: getY(yr.treeValue) })),
  ];

  return (
    <Animated.View entering={FadeInUp.delay(100)}>
      <GlowCard glowColor="rgba(34,197,94,0.12)" style={{ ...chartCardStyles.card, backgroundColor: SIM4.cardBg }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
          <LottieIcon source={LOTTIE_CHART} size={22} />
          <Text style={[chartCardStyles.title, RTL]}>השוואת צמיחה</Text>
        </View>
        <View style={chartCardStyles.chartContainer}>
          <View style={chartCardStyles.yAxis}>
            <Text style={chartCardStyles.yLabel}>{formatShekel(maxVal)}</Text>
            <Text style={chartCardStyles.yLabel}>{formatShekel((maxVal + minVal) / 2)}</Text>
            <Text style={chartCardStyles.yLabel}>{formatShekel(minVal)}</Text>
          </View>
          <View style={[chartCardStyles.chartArea, { height: chartHeight }]}>
            <View style={[chartCardStyles.gridLine, { top: 0 }]} />
            <View style={[chartCardStyles.gridLine, { top: chartHeight / 2 }]} />
            <View style={[chartCardStyles.gridLine, { top: chartHeight }]} />

            {eatPoints.map((point, i) => {
              if (i === 0) return null;
              const prev = eatPoints[i - 1];
              const dx = point.x - prev.x;
              const dy = point.y - prev.y;
              const length = Math.sqrt(dx * dx + dy * dy);
              const angle = Math.atan2(dy, dx) * (180 / Math.PI);
              return (
                <View
                  key={`eat-${i}`}
                  style={[
                    chartCardStyles.lineSegment,
                    {
                      left: prev.x,
                      top: prev.y,
                      width: length,
                      transform: [{ rotate: `${angle}deg` }],
                      backgroundColor: COLORS.red,
                      opacity: 0.7,
                    },
                  ]}
                />
              );
            })}

            {plantPoints.map((point, i) => {
              if (i === 0) return null;
              const prev = plantPoints[i - 1];
              const dx = point.x - prev.x;
              const dy = point.y - prev.y;
              const length = Math.sqrt(dx * dx + dy * dy);
              const angle = Math.atan2(dy, dx) * (180 / Math.PI);
              return (
                <View
                  key={`plant-${i}`}
                  style={[
                    chartCardStyles.lineSegment,
                    {
                      left: prev.x,
                      top: prev.y,
                      width: length,
                      transform: [{ rotate: `${angle}deg` }],
                      backgroundColor: COLORS.green,
                    },
                  ]}
                />
              );
            })}

            {eatPoints.length > 1 && (
              <View
                style={[
                  chartCardStyles.dot,
                  {
                    left: eatPoints[eatPoints.length - 1].x - 4,
                    top: eatPoints[eatPoints.length - 1].y - 4,
                    backgroundColor: COLORS.red,
                  },
                ]}
              />
            )}
            {plantPoints.length > 1 && (
              <View
                style={[
                  chartCardStyles.dot,
                  {
                    left: plantPoints[plantPoints.length - 1].x - 4,
                    top: plantPoints[plantPoints.length - 1].y - 4,
                    backgroundColor: COLORS.green,
                  },
                ]}
              />
            )}
          </View>
        </View>

        <View style={chartCardStyles.legend}>
          <View style={chartCardStyles.legendItem}>
            <View style={[chartCardStyles.legendDot, { backgroundColor: COLORS.red }]} />
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
              <LottieIcon source={LOTTIE_DECREASE} size={16} />
              <Text style={chartCardStyles.legendText}>אוכל</Text>
            </View>
          </View>
          <View style={chartCardStyles.legendItem}>
            <View style={[chartCardStyles.legendDot, { backgroundColor: COLORS.green }]} />
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
              <LottieIcon source={LOTTIE_GROWTH} size={16} />
              <Text style={chartCardStyles.legendText}>שותל</Text>
            </View>
          </View>
        </View>
      </GlowCard>
    </Animated.View>
  );
}

export const GrowthChart = React.memo(GrowthChartImpl);

const chartCardStyles = StyleSheet.create({
  card: {
    marginTop: 12,
    padding: 16,
    backgroundColor: SIM4.cardBg,
  },
  title: {
    color: SIM4.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  chartContainer: {
    flexDirection: 'row',
    height: 140,
  },
  yAxis: {
    width: 55,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  yLabel: {
    color: SIM4.textMuted,
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'right',
  },
  chartArea: {
    flex: 1,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: SIM4.cardBorder,
  },
  lineSegment: {
    position: 'absolute',
    height: 2.5,
    borderRadius: 1.25,
    transformOrigin: 'left center',
  },
  dot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: SIM4.cardBg,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: SIM4.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
});
