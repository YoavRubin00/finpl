import React from 'react';
import { View, Pressable, type ViewStyle, type StyleProp } from 'react-native';
import { STITCH } from '../../../constants/theme';

interface Props {
  children: React.ReactNode;
  /** Vertical accent strip color (right edge in RTL). Omit for no strip. */
  accentColor?: string;
  /** Make the entire card pressable. */
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** Override default padding (16). */
  padding?: number;
  /** Extra style overrides. */
  style?: StyleProp<ViewStyle>;
}

export function FriendsCard({
  children,
  accentColor,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  padding = 16,
  style,
}: Props): React.ReactElement {
  const cardInner = (
    <View
      style={[
        {
          backgroundColor: STITCH.surfaceLowest,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: STITCH.outlineVariant,
          padding,
          shadowColor: STITCH.cardShadow,
          shadowOpacity: 0.6,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 2,
          overflow: 'hidden',
          position: 'relative',
        },
        style,
      ]}
    >
      {accentColor ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            width: 4,
            backgroundColor: accentColor,
          }}
        />
      ) : null}
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        hitSlop={4}
        style={({ pressed }) => ({
          transform: [{ scale: pressed ? 0.98 : 1 }],
          opacity: pressed ? 0.95 : 1,
        })}
      >
        {cardInner}
      </Pressable>
    );
  }
  return cardInner;
}
