import React from 'react';
import { View, Text } from 'react-native';
import type { AnonAlias } from '../anonAdviceTypes';
import { formatAlias } from '../anonAdviceData';
import { DUO } from '../../../constants/theme';

interface AnonAvatarProps {
  alias: AnonAlias;
  size?: number;
  showLabel?: boolean;
  isSelf?: boolean;
}

export function AnonAvatar({ alias, size = 36, showLabel = true, isSelf = false }: AnonAvatarProps): React.ReactElement {
  return (
    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: isSelf ? DUO.blueSurface : '#eef2f7',
          borderWidth: isSelf ? 1.5 : 1,
          borderColor: isSelf ? DUO.blue : DUO.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: size * 0.55 }}>{alias.emoji}</Text>
      </View>
      {showLabel && (
        <Text
          style={{
            fontSize: 13,
            fontWeight: '700',
            color: isSelf ? DUO.blue : DUO.text,
            writingDirection: 'rtl',
          }}
          numberOfLines={1}
        >
          {formatAlias(alias)}
        </Text>
      )}
    </View>
  );
}
