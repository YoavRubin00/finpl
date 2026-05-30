import React from 'react';
import { View, Text } from 'react-native';
import { Flag } from 'lucide-react-native';
import type { CaptainWarning } from '../types';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

interface Props {
  data: CaptainWarning;
}

/** Amber-themed warning card matching the bottom card in the mockup. */
export function CaptainWarningCard({ data }: Props): React.ReactElement {
  return (
    <View
      style={{
        flexDirection: 'row-reverse',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: '#fef3c7',
        borderColor: '#fcd34d',
        borderWidth: 1,
        borderRadius: 14,
        padding: 12,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          backgroundColor: '#dc2626',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Flag size={18} color="#fff" />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[RTL, { color: '#92400e', fontWeight: '800', fontSize: 14 }]}>
          אזהרת קפטן
        </Text>
        <Text style={[RTL, { color: '#0f172a', fontSize: 13, fontWeight: '700' }]}>
          {data.title}
        </Text>
        <Text style={[RTL, { color: '#78350f', fontSize: 13, lineHeight: 19 }]}>
          {data.detail}
        </Text>
      </View>
    </View>
  );
}
