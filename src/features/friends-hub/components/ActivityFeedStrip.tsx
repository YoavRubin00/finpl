import React from 'react';
import { ScrollView, View, Text } from 'react-native';
import { ACTIVITY_FEED_ITEMS, getTypeColor } from '../data/activityFeedData';

export function ActivityFeedStrip(): React.ReactElement {
  return (
    <View style={{ marginBottom: 4 }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: '700',
          color: '#404752',
          writingDirection: 'rtl',
          textAlign: 'right',
          paddingHorizontal: 16,
          marginBottom: 8,
        }}
      >
        פעילות אחרונה
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, flexDirection: 'row-reverse' }}
      >
        {ACTIVITY_FEED_ITEMS.map((item) => (
          <View
            key={item.id}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              width: 140,
              borderWidth: 1,
              borderColor: '#e0e3e5',
              gap: 4,
            }}
          >
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 18 }}>{item.memberAvatar}</Text>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: getTypeColor(item.type),
                }}
              />
            </View>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: '#191c1e',
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
                color: '#404752',
                writingDirection: 'rtl',
                textAlign: 'right',
              }}
              numberOfLines={1}
            >
              {item.action}{item.detail ? ` ${item.detail}` : ''}
            </Text>
            <Text style={{ fontSize: 10, color: '#94a3b8' }}>{item.timestamp}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
