import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { FantasyTier, TierConfig } from '../fantasyTypes';
import { LUXE } from '../../../constants/theme';

interface Props {
  config: TierConfig;
  selected: boolean;
  disabled: boolean;
  onSelect: (tier: FantasyTier) => void;
}

const TIER_GRADIENTS: Record<FantasyTier, readonly [string, string, string]> = {
  silver: ['#e2e8f0', '#cbd5e1', '#94a3b8'],
  gold: ['#fcd34d', '#fbbf24', '#d97706'],
  diamond: ['#bae6fd', '#7dd3fc', '#0284c7'],
};

const TIER_GLOW: Record<FantasyTier, string> = {
  silver: 'rgba(203,213,225,0.55)',
  gold: 'rgba(251,191,36,0.55)',
  diamond: 'rgba(125,211,252,0.55)',
};

const TIER_INK: Record<FantasyTier, string> = {
  silver: '#0f172a',
  gold: '#3b1f00',
  diamond: '#0a1e3a',
};

export function TierSelectionCard({ config, selected, disabled, onSelect }: Props): React.ReactElement {
  const gradient = TIER_GRADIENTS[config.id];
  const glow = TIER_GLOW[config.id];
  const ink = TIER_INK[config.id];

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
            color: ink,
            writingDirection: 'rtl',
            textAlign: 'center',
          }}
          numberOfLines={1}
        >
          {config.label}
        </Text>
        {/* Entry cost */}
        <View
          style={{
            backgroundColor: 'rgba(255,255,255,0.40)',
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 4,
            flexDirection: 'row-reverse',
            alignItems: 'center',
            gap: 3,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.55)',
          }}
        >
          <Text style={{ fontSize: 11, color: ink }}>🪙</Text>
          <Text style={{ fontSize: 11, fontWeight: '900', color: ink }}>
            {config.entryCost.toLocaleString('he-IL')}
          </Text>
        </View>
        {/* Top 3 prize breakdown */}
        <View style={{ gap: 2, marginTop: 2, alignItems: 'center' }}>
          {[0, 1, 2].map((i) => {
            const place = i + 1;
            const coins = Math.round(config.entryCost * config.prizeMultipliers[i]);
            const diamonds = config.prizeDiamonds[i];
            const medal = place === 1 ? '🥇' : place === 2 ? '🥈' : '🥉';
            return (
              <View
                key={place}
                style={{
                  flexDirection: 'row-reverse',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                <Text style={{ fontSize: 9 }}>{medal}</Text>
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: '900',
                    color: ink,
                    opacity: 0.85,
                  }}
                >
                  🪙{coins >= 1000 ? `${(coins / 1000).toFixed(coins % 1000 ? 1 : 0)}K` : coins}
                </Text>
                {diamonds > 0 && (
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: '900',
                      color: ink,
                      opacity: 0.85,
                    }}
                  >
                    💎{diamonds}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
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
              borderWidth: 1,
              borderColor: 'rgba(0,0,0,0.1)',
            }}
          >
            <Text style={{ fontSize: 10, color: ink }}>✓</Text>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}
