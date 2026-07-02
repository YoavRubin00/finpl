import React from 'react';
import { View, Text } from 'react-native';
import { UserRound } from 'lucide-react-native';
import type { AnonAlias } from '../anonAdviceTypes';
import { formatAnonLabel } from '../anonAdviceData';
import { DUO } from '../../../constants/theme';

interface AnonAvatarProps {
  alias: AnonAlias;
  size?: number;
  showLabel?: boolean;
  isSelf?: boolean;
}

export function AnonAvatar({ alias, size = 36, showLabel = true, isSelf = false }: AnonAvatarProps): React.ReactElement {
  return (
    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, flexShrink: 1 }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: isSelf ? DUO.blueSurface : '#f1f5f9',
          borderWidth: isSelf ? 1.5 : 1,
          borderColor: isSelf ? DUO.blue : DUO.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <UserRound size={size * 0.55} color={isSelf ? DUO.blue : '#64748b'} strokeWidth={2.2} />
      </View>
      {showLabel && (
        <Text
          style={{
            fontSize: 13,
            fontWeight: '700',
            color: isSelf ? DUO.blue : DUO.text,
            writingDirection: 'rtl',
            flexShrink: 1,
          }}
          numberOfLines={1}
          maxFontSizeMultiplier={1.15}
        >
          {formatAnonLabel(alias)}
        </Text>
      )}
    </View>
  );
}
