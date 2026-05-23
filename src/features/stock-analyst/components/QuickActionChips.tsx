import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Plus, Briefcase, Sparkles, Target } from 'lucide-react-native';
import { tapHaptic } from '../../../utils/haptics';

interface Chip {
  label: string;
  Icon?: typeof Plus;
  onPress: () => void;
}

interface Props {
  onAnalyzeNvda: () => void;
  onWhatToBuy: () => void;
  onPortfolioStatus: () => void;
}

/**
 * Horizontal chip strip above the input, matching the mockup. Provides
 * canned starter prompts so the user has a one-tap way to begin the
 * conversation without typing a ticker.
 */
export function QuickActionChips({
  onAnalyzeNvda,
  onWhatToBuy,
  onPortfolioStatus,
}: Props): React.ReactElement {
  const chips: Chip[] = [
    { label: 'מצב התיק', Icon: Briefcase, onPress: onPortfolioStatus },
    { label: 'מה כדאי לקנות היום?', Icon: Sparkles, onPress: onWhatToBuy },
    { label: 'נתח את NVDA', Icon: Target, onPress: onAnalyzeNvda },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        flexDirection: 'row-reverse',
        gap: 8,
        paddingHorizontal: 4,
      }}
    >
      {chips.map((c) => (
        <Pressable
          key={c.label}
          onPress={() => {
            tapHaptic();
            c.onPress();
          }}
          accessibilityRole="button"
          accessibilityLabel={c.label}
          style={{
            flexDirection: 'row-reverse',
            alignItems: 'center',
            gap: 6,
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderColor: 'rgba(255,255,255,0.18)',
            borderWidth: 1,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 999,
          }}
        >
          {c.Icon ? <c.Icon size={13} color="#fbbf24" /> : null}
          <Text
            style={{
              color: '#f1f5f9',
              fontSize: 12,
              fontWeight: '700',
              writingDirection: 'rtl',
            }}
          >
            {c.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
