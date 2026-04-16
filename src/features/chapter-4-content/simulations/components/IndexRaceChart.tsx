import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SIM4 } from '../simTheme';
import { INITIAL_INVESTMENT } from '../indexRaceData';
import { formatShekel } from '../../../../utils/format';
import {
  INDEX_RACE_CHART_WIDTH as CHART_WIDTH,
  INDEX_RACE_CHART_HEIGHT as CHART_HEIGHT,
  INDEX_RACE_LINE_COLORS as LINE_COLORS,
} from './indexRaceConstants';

interface DualLineChartProps {
  portfolioValues: number[];
  indexValues: number[];
}

function DualLineChartImpl({ portfolioValues, indexValues }: DualLineChartProps) {
  const allValues = [...portfolioValues, ...indexValues];
  if (allValues.length === 0) return null;

  const maxVal = Math.max(...allValues) * 1.05;
  const minVal = Math.min(...allValues) * 0.95;
  const range = maxVal - minVal || 1;

  const maxPoints = Math.max(portfolioValues.length, indexValues.length);
  const stepX = maxPoints > 1 ? CHART_WIDTH / (maxPoints - 1) : CHART_WIDTH;
  const baselineY =
    CHART_HEIGHT - ((INITIAL_INVESTMENT - minVal) / range) * CHART_HEIGHT;

  const lines: { values: number[]; color: string; label: string }[] = [
    { values: indexValues, color: LINE_COLORS.index, label: 'index' },
    { values: portfolioValues, color: LINE_COLORS.portfolio, label: 'portfolio' },
  ];

  return (
    <View style={chartStyles.container}>
      <View style={chartStyles.yAxis}>
        <Text style={chartStyles.yLabel}>{formatShekel(maxVal)}</Text>
        <Text style={chartStyles.yLabel}>{formatShekel((maxVal + minVal) / 2)}</Text>
        <Text style={chartStyles.yLabel}>{formatShekel(minVal)}</Text>
      </View>

      <View style={chartStyles.chartArea}>
        <View style={[chartStyles.gridLine, { top: 0 }]} />
        <View style={[chartStyles.gridLine, { top: CHART_HEIGHT / 2 }]} />
        <View style={[chartStyles.gridLine, { top: CHART_HEIGHT }]} />
        <View style={[chartStyles.baseline, { top: baselineY }]} />

        {lines.map(({ values, color, label }) => {
          const points = values.map((val, i) => ({
            x: i * stepX,
            y: CHART_HEIGHT - ((val - minVal) / range) * CHART_HEIGHT,
          }));

          return (
            <View key={label}>
              {points.map((point, i) => {
                if (i === 0) return null;
                const prev = points[i - 1];
                const dx = point.x - prev.x;
                const dy = point.y - prev.y;
                const length = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx) * (180 / Math.PI);

                return (
                  <View
                    key={`${label}-seg-${i}`}
                    style={[
                      chartStyles.lineSegment,
                      {
                        left: prev.x,
                        top: prev.y,
                        width: length,
                        height: 3,
                        borderRadius: 1.5,
                        transform: [{ rotate: `${angle}deg` }],
                        backgroundColor: color,
                      },
                    ]}
                  />
                );
              })}

              {points.length > 1 && (
                <View
                  style={[
                    chartStyles.dataPoint,
                    {
                      left: points[points.length - 1].x - 5,
                      top: points[points.length - 1].y - 5,
                      backgroundColor: color,
                      borderColor: SIM4.cardBg,
                    },
                  ]}
                />
              )}
            </View>
          );
        })}

        <View style={chartStyles.xLabelsRow}>
          {Array.from({ length: maxPoints }, (_, i) => {
            if (i !== 0 && i % 2 !== 0 && i !== maxPoints - 1) return null;
            return (
              <Text
                key={`x-${i}`}
                style={[chartStyles.xLabel, { left: i * stepX - 10, width: 20 }]}
              >
                {i === 0 ? 'התחלה' : `${i}`}
              </Text>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export const DualLineChart = React.memo(DualLineChartImpl);

const chartStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: CHART_HEIGHT + 30,
    marginTop: 8,
  },
  yAxis: {
    width: 58,
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
    height: CHART_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
  },
  baseline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: SIM4.cardBorder,
    borderStyle: 'dashed',
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
    transformOrigin: 'left center',
  },
  dataPoint: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  xLabelsRow: {
    position: 'absolute',
    top: CHART_HEIGHT + 4,
    left: 0,
    right: 0,
    height: 20,
  },
  xLabel: {
    position: 'absolute',
    color: SIM4.textMuted,
    fontSize: 8,
    fontWeight: '600',
    textAlign: 'center',
  },
});
