import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import type { TradeRoom } from '../tradeRoomsTypes';

const TEXT_PRIMARY = '#1f2937';
const TEXT_MUTED = '#6b7280';

/**
 * One full-width premium room button — the single shared visual for a trade
 * room, used BOTH on the friends hub (`TradeRoomsCard`) and the full rooms list
 * (`TradeRoomsListScreen`) so the "general page" looks exactly like it does from
 * the friends screen (Yoav 2026-07-03). Deliberately has **no chevron arrow** —
 * the whole tile IS the button ("לחצן ולא חץ"). Each tile owns its own
 * press-scale (respecting reduced-motion) so the hooks rule stays satisfied
 * inside a `.map`.
 */
export function PremiumRoomButton({
  room,
  unread,
  onPress,
  subtitle,
}: {
  room: TradeRoom;
  unread: number;
  onPress: () => void;
  /** Optional override for the second line (e.g. the last-message preview on the
   *  rooms list). Falls back to the room's tagline. */
  subtitle?: string;
}): React.ReactElement {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const onIn = (): void => {
    if (!reduced) scale.value = withTiming(0.97, { duration: 90 });
  };
  const onOut = (): void => {
    if (!reduced) scale.value = withTiming(1, { duration: 130 });
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onIn}
      onPressOut={onOut}
      accessibilityRole="button"
      accessibilityLabel={unread > 0 ? `${room.name}, ${unread} הודעות חדשות` : `חדר ${room.name}`}
      style={{ marginHorizontal: 16, marginBottom: 10 }}
    >
      <Animated.View
        style={[
          {
            borderRadius: 16,
            shadowColor: room.accentColor,
            shadowOpacity: 0.25,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
          },
          animStyle,
        ]}
      >
        <LinearGradient
          colors={[room.accentBg, '#ffffff']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 0 }}
          style={{
            flexDirection: 'row-reverse',
            alignItems: 'center',
            gap: 12,
            minHeight: 64,
            paddingHorizontal: 12,
            paddingVertical: 12,
            borderRadius: 16,
            borderWidth: 1.5,
            borderColor: room.accentColor + '55',
            overflow: 'hidden',
          }}
        >
          {/* Emoji in a white circle with accent border */}
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#ffffff',
              borderWidth: 1.5,
              borderColor: room.accentColor,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 20 }}>{room.emoji}</Text>
          </View>

          {/* Name + subtitle (tagline or last-message preview) */}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.15}
              style={{
                fontSize: 15,
                fontWeight: '900',
                color: TEXT_PRIMARY,
                writingDirection: 'rtl',
                textAlign: 'right',
              }}
            >
              {room.name}
            </Text>
            <Text
              numberOfLines={1}
              style={{
                fontSize: 11,
                color: TEXT_MUTED,
                writingDirection: 'rtl',
                textAlign: 'right',
                flexShrink: 1,
                marginTop: 1,
              }}
            >
              {subtitle ?? room.tagline}
            </Text>
          </View>

          {/* Unread badge — only ever shows on genuine peer activity */}
          {unread > 0 && (
            <View
              style={{
                minWidth: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: room.accentColor,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 5,
              }}
            >
              <Text maxFontSizeMultiplier={1.15} style={{ fontSize: 11, fontWeight: '900', color: '#ffffff' }}>
                {unread > 9 ? '9+' : unread}
              </Text>
            </View>
          )}
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}
