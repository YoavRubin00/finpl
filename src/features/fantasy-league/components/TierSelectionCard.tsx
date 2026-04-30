import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { FantasyTier, TierConfig } from '../fantasyTypes';
import { CLASH } from '../../../constants/theme';

interface Props {
  config: TierConfig;
  selected: boolean;
  disabled: boolean;
  onSelect: (tier: FantasyTier) => void;
}

const TIER_GRADIENTS: Record<FantasyTier, readonly [string, string]> = {
  silver: ['#64748b', '#334155'],
  gold: ['#d4a017', '#92570a'],
  diamond: ['#38bdf8', '#0369a1'],
};

const TIER_GLOW: Record<FantasyTier, string> = {
  silver: 'rgba(100,116,139,0.4)',
  gold: 'rgba(212,160,23,0.45)',
  diamond: 'rgba(56,189,248,0.4)',
};

export function TierSelectionCard({ config, selected, disabled, onSelect }: Props): React.ReactElement {
  const gradient = TIER_GRADIENTS[config.id];
  const glow = TIER_GLOW[config.id];

  return (
    <Pressable
      onPress={() => !disabled && onSelect(config.id)}
      style={({ pressed }) => ({
        flex: 1,
        opacity: disabled ? 0.45 : pressed ? 0.88 : 1,
      })}
      accessibilityRole="button"
      accessibilityLabel={`${config.label} — ${config.entryCost.toLocaleString('he-IL')} מטבעות`}
      accessibilityState={{ selected, disabled }}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{
          borderRadius: 16,
          padding: 14,
          alignItems: 'center',
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? '#ffffff' : 'rgba(255,255,255,0.15)',
          shadowColor: selected ? glow : 'transparent',
          shadowOpacity: selected ? 1 : 0,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: selected ? 8 : 2,
          gap: 6,
        }}
      >
        <Text style={{ fontSize: 28 }}>{config.emoji}</Text>
        <Text
          style={{
            fontSize: 12,
            fontWeight: '900',
            color: '#ffffff',
            writingDirection: 'rtl',
            textAlign: 'center',
          }}
          numberOfLines={1}
        >
          {config.label}
        </Text>
        <View
          style={{
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 4,
            flexDirection: 'row-reverse',
            alignItems: 'center',
            gap: 3,
          }}
        >
          <Text style={{ fontSize: 11, color: CLASH.goldLight }}>🪙</Text>
          <Text style={{ fontSize: 11, fontWeight: '800', color: CLASH.goldLight }}>
            {config.entryCost.toLocaleString('he-IL')}
          </Text>
        </View>
        {/* Top 5 prize hint */}
        <Text
          style={{
            fontSize: 9,
            color: 'rgba(255,255,255,0.65)',
            writingDirection: 'rtl',
            textAlign: 'center',
          }}
        >
          {'1st: ×' + config.prizeMultipliers[0]}
        </Text>
        {selected && (
          <View
            style={{
              position: 'absolute',
              top: 6,
              left: 6,
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: '#ffffff',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 10 }}>✓</Text>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}
