import React from 'react';
import { View, Text } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import type { SharkCommentary, SharkPose, SharkVariant } from '../types';

// Map every pose EXCEPT `talking`. User explicitly removed the talking
// WebP from the analyst feature — any incoming `talking` pose falls back
// to `tablet`, which is the canonical analyst mascot.
const POSE_SOURCES: Record<Exclude<SharkPose, 'talking'>, number> = {
  fire: require('../../../../assets/webp/fin-fire-1.webp'),
  empathic: require('../../../../assets/webp/fin-empathic.webp'),
  happy: require('../../../../assets/webp/fin-happy.webp'),
  tablet: require('../../../../assets/webp/fin-tablet-1.webp'),
  hello: require('../../../../assets/webp/fin-hello.webp'),
  dancing: require('../../../../assets/webp/fin-dancing-1.webp'),
};

function resolveSource(pose: SharkPose): number {
  if (pose === 'talking') return POSE_SOURCES.tablet;
  return POSE_SOURCES[pose];
}

const VARIANT_STYLES: Record<SharkVariant, { bg: string; border: string; text: string }> = {
  info: { bg: '#f0f9ff', border: '#7dd3fc', text: '#0c4a6e' },
  positive: { bg: '#dcfce7', border: '#86efac', text: '#166534' },
  warning: { bg: '#fef3c7', border: '#fcd34d', text: '#92400e' },
  danger: { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b' },
};

interface Props {
  data: SharkCommentary;
  size?: number;
}

/**
 * Inline Captain Shark callout used inside Deep analysis sections.
 * Renders a shark WebP next to a colored note bubble. Never renders the
 * `talking` pose — that's reserved for live chat / voice interactions.
 */
export function SharkCommentaryBlock({ data, size = 44 }: Props): React.ReactElement {
  const variant = data.variant ?? 'info';
  const tone = VARIANT_STYLES[variant];
  const source = resolveSource(data.pose);

  return (
    <View
      style={{
        flexDirection: 'row-reverse',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: tone.bg,
        borderColor: tone.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 12,
      }}
    >
      <ExpoImage
        source={source}
        style={{ width: size, height: size }}
        contentFit="contain"
      />
      <View style={{ flex: 1, gap: 4 }}>
        {data.title ? (
          <Text
            style={{
              fontSize: 13,
              color: tone.text,
              fontWeight: '800',
              writingDirection: 'rtl',
              textAlign: 'right',
            }}
          >
            {data.title}
          </Text>
        ) : null}
        <Text
          style={{
            fontSize: 14,
            color: tone.text,
            lineHeight: 21,
            writingDirection: 'rtl',
            textAlign: 'right',
          }}
        >
          {data.message}
        </Text>
      </View>
    </View>
  );
}
