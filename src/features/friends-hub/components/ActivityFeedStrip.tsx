import React from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { ACTIVITY_FEED_ITEMS, getTypeColor } from '../data/activityFeedData';
import { STITCH } from '../../../constants/theme';
import { PulseDot } from '../shared/PulseDot';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

export function ActivityFeedStrip(): React.ReactElement {
  return (
    <View style={{ marginBottom: 6 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 4, gap: 10, flexDirection: 'row-reverse' }}
        accessibilityLabel="פעילות אחרונה של חברים"
      >
        {ACTIVITY_FEED_ITEMS.map((item, idx) => {
          const typeColor = getTypeColor(item.type);
          return (
            <Pressable
              key={item.id}
              accessibilityRole="text"
              accessibilityLabel={`${item.memberName}, ${item.action}${item.detail ? ' ' + item.detail : ''}, ${item.timestamp}`}
              hitSlop={6}
              style={({ pressed }) => ({
                backgroundColor: pressed ? STITCH.surfaceLow : STITCH.surfaceLowest,
                borderRadius: 14,
                paddingHorizontal: 12,
                paddingVertical: 11,
                width: 156,
                minHeight: 80,
                borderWidth: 1,
                borderColor: STITCH.outlineVariant,
                gap: 5,
                shadowColor: STITCH.cardShadow,
                shadowOpacity: 0.55,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2,
              })}
            >
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 20 }} accessible={false}>{item.memberAvatar}</Text>
                {idx === 0 ? (
                  <PulseDot size={7} color={typeColor} />
                ) : (
                  <View
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 4,
                      backgroundColor: typeColor,
                    }}
                    accessible={false}
                  />
                )}
              </View>
              <Text style={[{ fontSize: 12, fontWeight: '700', color: STITCH.onSurface }, RTL]} numberOfLines={1}>
                {item.memberName}
              </Text>
              <Text style={[{ fontSize: 11, color: STITCH.onSurfaceVariant }, RTL]} numberOfLines={1}>
                {item.action}{item.detail ? ` ${item.detail}` : ''}
              </Text>
              <Text style={{ fontSize: 10, color: STITCH.onSurfaceVariant, writingDirection: 'rtl', textAlign: 'right' }}>
                {item.timestamp}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
