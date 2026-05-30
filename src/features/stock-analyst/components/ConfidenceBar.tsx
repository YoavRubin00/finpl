import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  /** 0-100 */
  value: number;
  label?: string;
}

/**
 * Confidence bar — 0–100 horizontal gradient. Educational visual,
 * complements the "תובנת השארק" verdict.
 */
export function ConfidenceBar({ value, label = 'רמת ביטחון' }: Props): React.ReactElement {
  const pct = Math.max(0, Math.min(100, value));

  return (
    <View style={{ width: '100%', gap: 6 }}>
      <View
        style={{
          flexDirection: 'row-reverse',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontSize: 12,
            color: '#475569',
            fontWeight: '600',
            writingDirection: 'rtl',
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: '#0f172a',
            fontWeight: '800',
          }}
        >
          {Math.round(pct)}%
        </Text>
      </View>
      <View
        style={{
          width: '100%',
          height: 8,
          borderRadius: 999,
          backgroundColor: '#e2e8f0',
          overflow: 'hidden',
        }}
      >
        <View style={{ width: `${pct}%`, height: '100%' }}>
          <LinearGradient
            colors={['#22d3ee', '#0ea5e9', '#0369a1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1, borderRadius: 999 }}
          />
        </View>
      </View>
    </View>
  );
}
