import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  /** Single color or gradient stops (2-color array). */
  color: string | readonly [string, string];
  /** Which side to render on. Defaults to 'right' (RTL leading edge). */
  side?: 'left' | 'right';
  width?: number;
}

export function AccentStrip({ color, side = 'right', width = 4 }: Props): React.ReactElement {
  const base = {
    position: 'absolute' as const,
    top: 0,
    bottom: 0,
    width,
    [side]: 0,
  };

  if (typeof color === 'string') {
    return <View style={[base, { backgroundColor: color }]} pointerEvents="none" accessible={false} />;
  }

  return (
    <LinearGradient
      colors={color}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={base}
      pointerEvents="none"
      accessible={false}
    />
  );
}
