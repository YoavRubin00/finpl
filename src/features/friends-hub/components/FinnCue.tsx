import React from 'react';
import { View, Text } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { DUO } from '../../../constants/theme';
import {
  FINN_HELLO,
  FINN_HAPPY,
  FINN_EMPATHIC,
  FINN_STANDARD,
  FINN_FIRE,
  FINN_TALKING,
  FINN_TABLET,
  FINN_DANCING,
} from '../../retention-loops/finnMascotConfig';
import type { ImageSource } from 'expo-image';

export type FinnCueVariant =
  | 'hello'
  | 'happy'
  | 'empathic'
  | 'standard'
  | 'fire'
  | 'talking'
  | 'tablet'
  | 'dancing';

export type FinnCueTone = 'blue' | 'orange' | 'green' | 'gold' | 'purple';

interface Props {
  variant: FinnCueVariant;
  text: string;
  size?: 'sm' | 'md';
  tone?: FinnCueTone;
}

const VARIANT_TO_SOURCE: Record<FinnCueVariant, ImageSource> = {
  hello: FINN_HELLO,
  happy: FINN_HAPPY,
  empathic: FINN_EMPATHIC,
  standard: FINN_STANDARD,
  fire: FINN_FIRE,
  talking: FINN_TALKING,
  tablet: FINN_TABLET,
  dancing: FINN_DANCING,
};

const TONE_PALETTE: Record<FinnCueTone, { bg: string; text: string; badge: string }> = {
  blue:   { bg: DUO.blueSurface,                  text: DUO.blue,   badge: 'rgba(56,189,248,0.18)' },
  orange: { bg: 'rgba(234,88,12,0.10)',           text: '#ea580c',  badge: 'rgba(234,88,12,0.18)' },
  green:  { bg: 'rgba(22,163,74,0.10)',           text: '#16a34a',  badge: 'rgba(22,163,74,0.18)' },
  gold:   { bg: 'rgba(212,160,23,0.10)',          text: '#a16207',  badge: 'rgba(212,160,23,0.18)' },
  purple: { bg: 'rgba(124,58,237,0.10)',          text: '#7c3aed',  badge: 'rgba(124,58,237,0.18)' },
};

export function FinnCue({ variant, text, size = 'sm', tone = 'blue' }: Props): React.ReactElement {
  const palette = TONE_PALETTE[tone];
  const finnSize = size === 'md' ? 36 : 28;
  const badgeSize = finnSize + 8;

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`קפטן שארק: ${text}`}
      style={{
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
        backgroundColor: palette.bg,
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 8,
      }}
    >
      <View
        style={{
          width: badgeSize,
          height: badgeSize,
          borderRadius: badgeSize / 2,
          backgroundColor: palette.badge,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ExpoImage
          source={VARIANT_TO_SOURCE[variant]}
          style={{ width: finnSize, height: finnSize }}
          contentFit="contain"
          accessible={false}
        />
      </View>
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          fontSize: 12,
          fontStyle: 'italic',
          fontWeight: '600',
          color: palette.text,
          writingDirection: 'rtl',
          textAlign: 'right',
        }}
      >
        {text}
      </Text>
    </View>
  );
}
