import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

interface Props {
  data: Array<{ t: number; p: number }>;
  width?: number;
  height?: number;
  direction?: 'up' | 'down' | 'flat';
}

const COLORS_UP = { line: '#16a34a', fill: '#22c55e' };
const COLORS_DOWN = { line: '#dc2626', fill: '#ef4444' };
const COLORS_FLAT = { line: '#64748b', fill: '#94a3b8' };

/**
 * Mini sparkline (~100×40 by default), drawn with react-native-svg.
 *
 * Originally used @shopify/react-native-skia for 60fps, but Skia's web
 * runtime errors out with "Cannot read properties of undefined (reading
 * 'PictureRecorder')" unless the host calls LoadSkiaWeb() ahead of time.
 * The sparkline is decorative — SVG renders fine at 60fps for ~30 points
 * and works seamlessly on web without extra init.
 */
export function SparkLine({
  data,
  width = 280,
  height = 60,
  direction,
}: Props): React.ReactElement {
  const { linePath, fillPath, colors, gradientId } = useMemo(() => {
    const id = `spark-grad-${Math.random().toString(36).slice(2, 7)}`;
    if (data.length < 2) {
      return { linePath: '', fillPath: '', colors: COLORS_FLAT, gradientId: id };
    }

    const prices = data.map((d) => d.p);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const stepX = width / (data.length - 1);

    const points = data.map((d, i) => ({
      x: i * stepX,
      y: height - ((d.p - min) / range) * height,
    }));

    let line = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i += 1) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpX = (prev.x + curr.x) / 2;
      line += ` C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    const fill = `${line} L ${width} ${height} L 0 ${height} Z`;

    const auto =
      data[data.length - 1].p > data[0].p
        ? 'up'
        : data[data.length - 1].p < data[0].p
        ? 'down'
        : 'flat';
    const dir = direction ?? auto;
    const colorSet = dir === 'up' ? COLORS_UP : dir === 'down' ? COLORS_DOWN : COLORS_FLAT;

    return { linePath: line, fillPath: fill, colors: colorSet, gradientId: id };
  }, [data, width, height, direction]);

  if (!linePath) {
    return <View style={{ width, height }} />;
  }

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.fill} stopOpacity={0.35} />
            <Stop offset="1" stopColor={colors.fill} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={fillPath} fill={`url(#${gradientId})`} />
        <Path d={linePath} stroke={colors.line} strokeWidth={2.5} fill="none" />
      </Svg>
    </View>
  );
}
