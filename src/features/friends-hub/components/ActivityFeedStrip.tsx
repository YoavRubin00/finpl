import React from 'react';
import { ScrollView, View, Text } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { ACTIVITY_FEED_ITEMS, getTypeColor } from '../data/activityFeedData';
import { STITCH } from '../../../constants/theme';

function PulseDot({ color }: { color: string }): React.ReactElement {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(1);

  React.useEffect(() => {
    if (reduced) return;
    opacity.value = withRepeat(
      withTiming(0.35, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [reduced, opacity]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          width: 7,
          height: 7,
          borderRadius: 4,
          backgroundColor: color,
        },
        animStyle,
      ]}
    />
  );
}

export function ActivityFeedStrip(): React.ReactElement {
  return (
    <View style={{ marginBottom: 6 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 4, gap: 10, flexDirection: 'row-reverse' }}
      >
        {ACTIVITY_FEED_ITEMS.map((item, idx) => (
          <View
            key={item.id}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 14,
              paddingHorizontal: 12,
              paddingVertical: 11,
              width: 152,
              borderWidth: 1,
              borderColor: STITCH.surfaceHighest,
              gap: 5,
              shadowColor: '#3e3c8f',
              shadowOpacity: 0.07,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 2 },
              elevation: 2,
            }}
          >
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 20 }}>{item.memberAvatar}</Text>
              {idx === 0 ? (
                <PulseDot color={getTypeColor(item.type)} />
              ) : (
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: getTypeColor(item.type),
                  }}
                />
              )}
            </View>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: STITCH.onSurface,
                writingDirection: 'rtl',
                textAlign: 'right',
              }}
              numberOfLines={1}
            >
              {item.memberName}
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: STITCH.onSurfaceVariant,
                writingDirection: 'rtl',
                textAlign: 'right',
              }}
              numberOfLines={1}
            >
              {item.action}{item.detail ? ` ${item.detail}` : ''}
            </Text>
            <Text style={{ fontSize: 10, color: STITCH.onSurfaceVariant }}>{item.timestamp}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
