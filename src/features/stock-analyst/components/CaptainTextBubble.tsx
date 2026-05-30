import React from 'react';
import { View, Text } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import type { SharkPose } from '../types';

// Excludes `fin-talking-1.webp` — user explicitly removed the "talking"
// pose from the analyst feature (the analyst is a tool, not a dialogue).
// Any incoming `talking` pose falls back to `tablet`, which is the
// canonical mascot for the analyst surface.
const POSE_SOURCES: Record<Exclude<SharkPose, 'talking'>, number> = {
  fire: require('../../../../assets/webp/fin-fire-1.webp'),
  empathic: require('../../../../assets/webp/fin-empathic.webp'),
  happy: require('../../../../assets/webp/fin-happy.webp'),
  tablet: require('../../../../assets/webp/fin-tablet-1.webp'),
  hello: require('../../../../assets/webp/fin-hello.webp'),
  dancing: require('../../../../assets/webp/fin-dancing-1.webp'),
};

function resolveSource(pose: SharkPose | undefined): number {
  if (!pose || pose === 'talking') return POSE_SOURCES.tablet;
  return POSE_SOURCES[pose];
}

interface Props {
  text: string;
  pose?: SharkPose;
}

/** White card-style bubble used when the captain delivers a status note. */
export function CaptainTextBubble({ text, pose = 'tablet' }: Props): React.ReactElement {
  return (
    <View
      style={{
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 10,
        shadowColor: '#0369a1',
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
        borderWidth: 1,
        borderColor: '#e0f2fe',
      }}
    >
      <ExpoImage
        source={resolveSource(pose)}
        style={{ width: 34, height: 34 }}
        contentFit="contain"
      />
      <Text
        style={{
          flex: 1,
          fontSize: 14,
          lineHeight: 22,
          color: '#0f172a',
          writingDirection: 'rtl',
          textAlign: 'right',
        }}
      >
        {text}
      </Text>
    </View>
  );
}
