import React from 'react';
import { View, Text } from 'react-native';

interface Prize {
  emoji: string;
  amount: string;
  label: string;
  bg: string;
  color: string;
}

interface Props {
  xpAmount: number;
  diamondsAmount: number;
  coinsAmount: number;
}

const RTL = { writingDirection: 'rtl' as const, textAlign: 'center' as const };

export function PrizesGrid({ xpAmount, diamondsAmount, coinsAmount }: Props): React.ReactElement {
  const prizes: Prize[] = [
    { emoji: '⚡', amount: `${xpAmount}+`, label: 'XP', bg: '#ede9fe', color: '#6d28d9' },
    { emoji: '💎', amount: `${diamondsAmount}+`, label: 'יהלומים', bg: '#dbeafe', color: '#1d4ed8' },
    { emoji: '💰', amount: coinsAmount.toLocaleString('he-IL') + '+', label: 'מזומן', bg: '#fef3c7', color: '#a16207' },
  ];

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 14,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#0f172a',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
      }}
    >
      <Text
        style={[
          { fontSize: 13, fontWeight: '900', color: '#0f172a', marginBottom: 12 },
          { writingDirection: 'rtl' as const, textAlign: 'right' as const },
        ]}
      >
        הפרסים שלך
      </Text>
      <View style={{ flexDirection: 'row-reverse', gap: 10 }}>
        {prizes.map((p) => (
          <View
            key={p.label}
            style={{
              flex: 1,
              backgroundColor: p.bg,
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
              gap: 4,
            }}
            accessibilityRole="text"
            accessibilityLabel={`${p.amount} ${p.label}`}
          >
            <Text style={{ fontSize: 22 }}>{p.emoji}</Text>
            <Text style={[{ fontSize: 18, fontWeight: '900', color: p.color }, RTL]}>{p.amount}</Text>
            <Text style={[{ fontSize: 11, color: p.color, fontWeight: '700', opacity: 0.85 }, RTL]}>{p.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
