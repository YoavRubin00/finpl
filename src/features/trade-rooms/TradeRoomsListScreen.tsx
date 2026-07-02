import React from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight, MessagesSquare } from 'lucide-react-native';

import { tapHaptic } from '../../utils/haptics';
import { useTradeRoomsStore } from './useTradeRoomsStore';
import { TRADE_ROOMS, getDailyEventTopic, getRoomMemberCount } from './tradeRoomsData';
import { RoomRow } from './components/RoomRow';
import type { TradeRoom } from './tradeRoomsTypes';

const FEED_BG = '#f3f4f6';
const TEXT_PRIMARY = '#1f2937';
const TEXT_MUTED = '#6b7280';

function DailyEventCard({
  room,
  unreadCount,
  onPress,
}: {
  room: TradeRoom;
  unreadCount: number;
  onPress: () => void;
}): React.ReactElement {
  const topic = getDailyEventTopic();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`החדר החם של היום: ${topic.title}`}
      style={({ pressed }) => ({
        marginHorizontal: 16,
        marginVertical: 12,
        borderRadius: 20,
        backgroundColor: '#fff7ed',
        borderWidth: 1.5,
        borderColor: '#fdba74',
        padding: 16,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 22 }}>{room.emoji}</Text>
        <Text
          style={{
            flex: 1,
            fontSize: 13,
            fontWeight: '900',
            color: '#c2410c',
            writingDirection: 'rtl',
            textAlign: 'right',
            letterSpacing: 0.2,
          }}
        >
          החדר החם של היום
        </Text>
        {unreadCount > 0 && (
          <View
            style={{
              minWidth: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: '#f97316',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 5,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '900', color: '#ffffff' }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </View>
        )}
      </View>

      <Text
        style={{
          fontSize: 18,
          fontWeight: '900',
          color: TEXT_PRIMARY,
          marginTop: 8,
          writingDirection: 'rtl',
          textAlign: 'right',
        }}
      >
        {topic.title}
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: TEXT_MUTED,
          marginTop: 2,
          writingDirection: 'rtl',
          textAlign: 'right',
        }}
      >
        {topic.subtitle}
      </Text>

      <View
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          gap: 4,
          marginTop: 10,
        }}
      >
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#22c55e',
          }}
        />
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#15803d' }}>
          {getRoomMemberCount(room)} מדברים על זה עכשיו
        </Text>
      </View>
    </Pressable>
  );
}

export function TradeRoomsListScreen(): React.ReactElement {
  const router = useRouter();
  // Subscribing to the maps keeps rows fresh as messages arrive.
  const messagesByRoom = useTradeRoomsStore((s) => s.messagesByRoom);
  const lastReadAt = useTradeRoomsStore((s) => s.lastReadAt);

  const dailyRoom = TRADE_ROOMS.find((r) => r.isDailyEvent);
  const regularRooms = TRADE_ROOMS.filter((r) => !r.isDailyEvent);

  const openRoom = React.useCallback(
    (roomId: string) => {
      tapHaptic();
      router.push(`/trade-rooms/${roomId}` as never);
    },
    [router],
  );

  const unreadFor = React.useCallback(
    (roomId: string): number => {
      const lastRead = lastReadAt[roomId];
      const messages = messagesByRoom[roomId] ?? [];
      if (!lastRead) return Math.min(messages.length, 9);
      return messages.filter((m) => !m.isSelf && m.sentAt > lastRead).length;
    },
    [messagesByRoom, lastReadAt],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: FEED_BG }} edges={['top']}>
      {/* Header */}
      <View
        style={{
          backgroundColor: '#ffffff',
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: 'row-reverse',
          alignItems: 'center',
          gap: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#e5e7eb',
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="חזרה"
        >
          <ChevronRight size={26} color={TEXT_PRIMARY} strokeWidth={2.4} />
        </Pressable>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#e0f2fe',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MessagesSquare size={18} color="#1877f2" strokeWidth={2.4} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            accessibilityRole="header"
            style={{
              fontSize: 20,
              fontWeight: '900',
              color: TEXT_PRIMARY,
              writingDirection: 'rtl',
              textAlign: 'right',
            }}
          >
            חדרי מסחר
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: TEXT_MUTED,
              writingDirection: 'rtl',
              textAlign: 'right',
            }}
          >
            מדברים על השוק, בלי שמות ובלי בושה
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Daily event hero */}
        {dailyRoom && (
          <DailyEventCard
            room={dailyRoom}
            unreadCount={unreadFor(dailyRoom.id)}
            onPress={() => openRoom(dailyRoom.id)}
          />
        )}

        {/* Regular rooms — WhatsApp-style list */}
        <View style={{ backgroundColor: '#ffffff' }}>
          {regularRooms.map((room, idx) => {
            const messages = messagesByRoom[room.id] ?? [];
            const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
            return (
              <View key={room.id}>
                {idx > 0 && (
                  <View style={{ height: 1, backgroundColor: '#f3f4f6', marginRight: 80 }} />
                )}
                <RoomRow
                  room={room}
                  lastMessage={lastMessage}
                  unreadCount={unreadFor(room.id)}
                  onPress={() => openRoom(room.id)}
                />
              </View>
            );
          })}
        </View>

        {/* Community ground rule */}
        <Text
          style={{
            fontSize: 12,
            color: '#9ca3af',
            textAlign: 'center',
            marginTop: 16,
            marginHorizontal: 32,
            writingDirection: 'rtl',
            lineHeight: 18,
          }}
        >
          כולם כאן בכינוי אנונימי. דעות הן של הקהילה — לא ייעוץ השקעות.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
