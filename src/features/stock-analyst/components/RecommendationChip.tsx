import React from 'react';
import { View, Text } from 'react-native';
import type { StockVerdict } from '../types';

const VERDICT_LABELS_HE: Record<StockVerdict, string> = {
  BUY: 'נטייה חיובית',
  HOLD: 'המתנה',
  SELL: 'נטייה שלילית',
  AVOID: 'דגל אדום',
};

const COLORS: Record<StockVerdict, { bg: string; text: string; border: string }> = {
  BUY: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  HOLD: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  SELL: { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' },
  AVOID: { bg: '#fecaca', text: '#7f1d1d', border: '#f87171' },
};

interface Props {
  verdict: StockVerdict;
  size?: 'sm' | 'md';
}

/**
 * Educational verdict chip. Label intentionally says
 * **"תובנת השארק"** + tone-shifted Hebrew label ("נטייה חיובית" etc.)
 * to keep the framing educational, not as a buy/sell instruction.
 */
export function RecommendationChip({ verdict, size = 'md' }: Props): React.ReactElement {
  const c = COLORS[verdict];
  const py = size === 'sm' ? 4 : 6;
  const px = size === 'sm' ? 10 : 14;
  const fontSize = size === 'sm' ? 12 : 14;

  return (
    <View
      style={{
        backgroundColor: c.bg,
        borderColor: c.border,
        borderWidth: 1,
        paddingVertical: py,
        paddingHorizontal: px,
        borderRadius: 999,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ color: c.text, fontSize, fontWeight: '700', writingDirection: 'rtl' }}>
        {VERDICT_LABELS_HE[verdict]}
      </Text>
    </View>
  );
}
