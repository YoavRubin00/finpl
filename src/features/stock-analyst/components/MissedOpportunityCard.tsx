import React from 'react';
import { View, Text } from 'react-native';
import { Plus } from 'lucide-react-native';
import type { MissedOpportunity } from '../types';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

interface Props {
  data: MissedOpportunity;
}

/** Green-themed "missed opportunity" card from the mockup. */
export function MissedOpportunityCard({ data }: Props): React.ReactElement {
  return (
    <View
      style={{
        flexDirection: 'row-reverse',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: '#dcfce7',
        borderColor: '#86efac',
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
          backgroundColor: '#16a34a',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Plus size={18} color="#fff" />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[RTL, { color: '#166534', fontWeight: '800', fontSize: 14 }]}>
          הזדמנות שהבחנתי בה
        </Text>
        <Text style={[RTL, { color: '#0f172a', fontSize: 13, fontWeight: '700' }]}>
          {data.ticker} — {data.headline}
        </Text>
        <Text style={[RTL, { color: '#365314', fontSize: 13, lineHeight: 19 }]}>
          {data.detail}
        </Text>
      </View>
    </View>
  );
}
