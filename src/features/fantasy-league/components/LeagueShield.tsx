import React from 'react';
import { View, Text } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { FANTASY_ASSETS } from '../cloudAssets';

export type LeagueShieldPosition = 'bronze' | 'silver' | 'gold';

interface Props {
  position: LeagueShieldPosition;
  size?: number;
}

const FALLBACK_CONFIG: Record<LeagueShieldPosition, { colors: [string, string]; border: string; emoji: string }> = {
  bronze: { colors: ['#a16207', '#78350f'], border: '#92400e', emoji: '⭐' },
  silver: { colors: ['#cbd5e1', '#94a3b8'], border: '#64748b', emoji: '🌿' },
  gold:   { colors: ['#facc15', '#d4a017'], border: '#a16207', emoji: '👑' },
};

const URL_KEY: Record<LeagueShieldPosition, keyof typeof FANTASY_ASSETS> = {
  bronze: 'shieldBronze',
  silver: 'shieldSilver',
  gold:   'shieldGold',
};

export function LeagueShield({ position, size = 28 }: Props): React.ReactElement {
  const url = FANTASY_ASSETS[URL_KEY[position]];

  if (url) {
    return (
      <ExpoImage
        source={{ uri: url }}
        style={{ width: size, height: size }}
        contentFit="contain"
        cachePolicy="disk"
        accessible={false}
      />
    );
  }

  const cfg = FALLBACK_CONFIG[position];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 4,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: cfg.border,
      }}
    >
      <LinearGradient
        colors={cfg.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ fontSize: size * 0.5 }}>{cfg.emoji}</Text>
      </LinearGradient>
    </View>
  );
}