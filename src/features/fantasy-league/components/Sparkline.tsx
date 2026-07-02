import React, { useMemo } from 'react';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

interface Props {
  values: number[];
  width?: number;
  height?: number;
  positive: boolean;
}

const COLOR = {
  posLine: '#16a34a',
  posFill: 'rgba(22,163,74,0.18)',
  negLine: '#dc2626',
  negFill: 'rgba(220,38,38,0.18)',
};

export function Sparkline({ values, width = 84, height = 28, positive }: Props): React.ReactElement | null {
  const { linePath, fillPath } = useMemo(() => {
    if (values.length < 2) return { linePath: '', fillPath: '' };

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const stepX = width / (values.length - 1);

    const points = values.map((v, i) => {
      const x = i * stepX;
      const y = height - 2 - ((v - min) / range) * (height - 4);
      return { x, y };
    });

    const linePathStr = points
      .map((p, i) => (i === 0 ? `M${p.x.toFixed(2)},${p.y.toFixed(2)}` : `L${p.x.toFixed(2)},${p.y.toFixed(2)}`))
      .join(' ');

    const fillPathStr = `${linePathStr} L${width.toFixed(2)},${height.toFixed(2)} L0,${height.toFixed(2)} Z`;

    return { linePath: linePathStr, fillPath: fillPathStr };
  }, [values, width, height]);

  if (!linePath) return null;

  const line = positive ? COLOR.posLine : COLOR.negLine;
  const fillId = positive ? 'sparkPosFill' : 'sparkNegFill';
  const fillStop = positive ? COLOR.posFill : COLOR.negFill;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={fillStop} stopOpacity={1} />
          <Stop offset="1" stopColor={fillStop} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={fillPath} fill={`url(#${fillId})`} />
      <Path d={linePath} stroke={line} strokeWidth={1.75} fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}
