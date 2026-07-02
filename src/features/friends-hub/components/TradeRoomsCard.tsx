import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { MessagesSquare, ChevronLeft } from 'lucide-react-native';

import { tapHaptic } from '../../../utils/haptics';
import { useTradeRoomsStore } from '../../trade-rooms/useTradeRoomsStore';
import { TRADE_ROOMS, getDailyEventTopic, getRoomMemberCount } from '../../trade-rooms/tradeRoomsData';

const TEXT_PRIMARY = '#1f2937';
const TEXT_MUTED = '#6b7280';
const FB_BLUE = '#1877f2';

/**
 * Friends-feed card: WhatsApp-style strip of the trade rooms.
 * Tapping the header opens the rooms list; tapping a tile opens that room.
 */
export function TradeRoomsCard(): React.ReactElement {
  const router = useRouter();
  const messagesByRoom = useTradeRoomsStore((s) => s.messagesByRoom);
  const lastReadAt = useTradeRoomsStore((s) => s.lastReadAt);
  const customRooms = useTradeRoomsStore((s) => s.customRooms);
  const allRooms = [...TRADE_ROOMS, ...customRooms];

  const dailyTopic = getDailyEventTopic();

  const unreadFor = (roomId: string): number => {
    const lastRead = lastReadAt[roomId];
    const messages = messagesByRoom[roomId] ?? [];
    if (!lastRead) return Math.min(messages.length, 9);
    return messages.filter((m) => !m.isSelf && m.sentAt > lastRead).length;
  };

  const totalUnread = allRooms.reduce((sum, r) => sum + unreadFor(r.id), 0);

  const openList = (): void => {
    tapHaptic();
    router.push('/trade-rooms' as never);
  };

  const openRoom = (roomId: string): void => {
    tapHaptic();
    router.push(`/trade-rooms/${roomId}` as never);
  };

  return (
    <View style={{ paddingVertical: 12 }}>
      {/* Header row */}
      <Pressable
        onPress={openList}
        accessibilityRole="button"
        accessibilityLabel="פתחו את חדרי המסחר"
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 16,
          marginBottom: 10,
        }}
      >
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
          <MessagesSquare size={18} color={FB_BLUE} strokeWidth={2.4} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '900',
                color: TEXT_PRIMARY,
                writingDirection: 'rtl',
                textAlign: 'right',
              }}
            >
              חדרי מסחר
            </Text>
            {totalUnread > 0 && (
              <View
                style={{
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: '#16a34a',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 4,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '900', color: '#ffffff' }}>
                  {totalUnread > 9 ? '9+' : totalUnread}
                </Text>
              </View>
            )}
          </View>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 12,
              color: TEXT_MUTED,
              writingDirection: 'rtl',
              textAlign: 'right',
            }}
          >
            היום מדברים על: {dailyTopic.title}
          </Text>
        </View>
        <ChevronLeft size={20} color={TEXT_MUTED} strokeWidth={2.4} />
      </Pressable>

      {/* Room tiles strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10, flexDirection: 'row-reverse' }}
      >
        {allRooms.map((room) => {
          const unread = unreadFor(room.id);
          return (
            <Pressable
              key={room.id}
              onPress={() => openRoom(room.id)}
              accessibilityRole="button"
              accessibilityLabel={`חדר ${room.name}`}
              style={({ pressed }) => ({
                width: 96,
                borderRadius: 16,
                backgroundColor: room.accentBg,
                paddingVertical: 12,
                paddingHorizontal: 8,
                alignItems: 'center',
                gap: 4,
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <View>
                <Text style={{ fontSize: 28 }}>{room.emoji}</Text>
                {unread > 0 && (
                  <View
                    style={{
                      position: 'absolute',
                      top: -4,
                      left: -10,
                      minWidth: 17,
                      height: 17,
                      borderRadius: 9,
                      backgroundColor: '#16a34a',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 4,
                      borderWidth: 1.5,
                      borderColor: '#ffffff',
                    }}
                  >
                    <Text style={{ fontSize: 9, fontWeight: '900', color: '#ffffff' }}>
                      {unread > 9 ? '9+' : unread}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 12,
                  fontWeight: '800',
                  color: TEXT_PRIMARY,
                  writingDirection: 'rtl',
                  textAlign: 'center',
                }}
              >
                {room.name}
              </Text>
              <Text style={{ fontSize: 10, color: TEXT_MUTED }}>
                {getRoomMemberCount(room)} חברים
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
