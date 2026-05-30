import React from 'react';
import { View, Text } from 'react-native';
import { Briefcase } from 'lucide-react-native';
import type { PortfolioContextSnapshot } from '../types';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

interface Props {
  data: PortfolioContextSnapshot;
}

/** Bottom block from the mockup — total value + best/worst chips. */
export function PortfolioContextCard({ data }: Props): React.ReactElement {
  const totalUp = data.todayChangePct >= 0;
  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 18,
        padding: 14,
        gap: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
        <Briefcase size={16} color="#0369a1" />
        <Text style={[RTL, { color: '#0c4a6e', fontWeight: '800', fontSize: 14 }]}>
          תיק ההשקעות שלך
        </Text>
      </View>

      {/* Total + today's % */}
      <View style={{ flexDirection: 'row-reverse', alignItems: 'baseline', gap: 10 }}>
        <Text
          style={{
            color: '#0f172a',
            fontSize: 26,
            fontWeight: '900',
            letterSpacing: -0.5,
          }}
        >
          ${data.totalValue.toFixed(1)}
        </Text>
        <Text
          style={{
            color: totalUp ? '#16a34a' : '#dc2626',
            fontSize: 14,
            fontWeight: '700',
          }}
        >
          {totalUp ? '+' : ''}{data.todayChangePct.toFixed(2)}%
        </Text>
        <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '600' }}>היום</Text>
      </View>

      {/* Best / Worst chips */}
      <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
        {data.bestPerformer ? (
          <View
            style={{
              flex: 1,
              backgroundColor: '#dcfce7',
              borderRadius: 10,
              padding: 10,
              gap: 2,
              borderWidth: 1,
              borderColor: '#86efac',
            }}
          >
            <Text style={[RTL, { color: '#166534', fontSize: 11, fontWeight: '700' }]}>הטוב ביותר</Text>
            <Text style={[RTL, { color: '#15803d', fontSize: 14, fontWeight: '900' }]}>
              {data.bestPerformer.ticker} {data.bestPerformer.changePct >= 0 ? '+' : ''}{data.bestPerformer.changePct.toFixed(1)}%
            </Text>
          </View>
        ) : null}
        {data.worstPerformer ? (
          <View
            style={{
              flex: 1,
              backgroundColor: '#fee2e2',
              borderRadius: 10,
              padding: 10,
              gap: 2,
              borderWidth: 1,
              borderColor: '#fca5a5',
            }}
          >
            <Text style={[RTL, { color: '#7f1d1d', fontSize: 11, fontWeight: '700' }]}>הגרוע ביותר</Text>
            <Text style={[RTL, { color: '#b91c1c', fontSize: 14, fontWeight: '900' }]}>
              {data.worstPerformer.ticker} {data.worstPerformer.changePct >= 0 ? '+' : ''}{data.worstPerformer.changePct.toFixed(1)}%
            </Text>
          </View>
        ) : null}
      </View>

      {data.sectorConcentrationWarning ? (
        <Text style={[RTL, { color: '#92400e', fontSize: 12, fontWeight: '600' }]}>
          ⚠️ {data.sectorConcentrationWarning}
        </Text>
      ) : null}
    </View>
  );
}
