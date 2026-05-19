import React from 'react';
import { View, Text } from 'react-native';
import { STITCH } from '../../../constants/theme';

interface Props {
  label: string;
  value: string;
  /** Tone variant for value color and pill tint. */
  tone?: 'neutral' | 'success' | 'warning' | 'info' | 'gold';
}

const RTL = { writingDirection: 'rtl' as const, textAlign: 'center' as const };

const TONE: Record<NonNullable<Props['tone']>, { surface: string; value: string }> = {
  neutral: { surface: STITCH.surfaceContainer, value: STITCH.onSurface },
  success: { surface: '#dcfce7', value: '#15803d' },
  warning: { surface: '#ffedd5', value: '#c2410c' },
  info:    { surface: '#dbeafe', value: '#1d4ed8' },
  gold:    { surface: '#fef3c7', value: '#a16207' },
};

export function StatPill({ label, value, tone = 'neutral' }: Props): React.ReactElement {
  const t = TONE[tone];
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: t.surface,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 6,
        alignItems: 'center',
        gap: 2,
      }}
      accessibilityRole="text"
      accessibilityLabel={`${label}, ${value}`}
    >
      <Text style={[{ fontSize: 16, fontWeight: '900', color: t.value }, RTL]} numberOfLines={1}>
        {value}
      </Text>
      <Text
        style={[{ fontSize: 10, fontWeight: '700', color: STITCH.onSurfaceVariant, opacity: 0.85 }, RTL]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}
