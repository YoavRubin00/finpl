import React from 'react';
import { View, Text } from 'react-native';
import { STITCH } from '../../../constants/theme';

interface Props {
  /** Emoji or short string rendered inside the badge circle. */
  emoji: string;
  /** Background color for the badge circle. */
  badgeColor?: string;
  title: string;
  subtitle?: string;
  /** Optional right-side trailing element (badge, count, chip, etc.). */
  trailing?: React.ReactNode;
}

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

export function FriendsCardHeader({
  emoji,
  badgeColor = STITCH.primaryCyan,
  title,
  subtitle,
  trailing,
}: Props): React.ReactElement {
  return (
    <View
      style={{
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 999,
          backgroundColor: badgeColor,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        accessible={false}
      >
        <Text style={{ fontSize: 20 }}>{emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[{ fontSize: 15, fontWeight: '900', color: STITCH.onSurface }, RTL]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[{ fontSize: 12, fontWeight: '700', color: STITCH.onSurfaceVariant, marginTop: 2 }, RTL]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}
