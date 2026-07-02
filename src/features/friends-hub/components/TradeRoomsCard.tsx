import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MessagesSquare, ChevronLeft } from 'lucide-react-native';

import { tapHaptic } from '../../../utils/haptics';
import { useTradeRoomsStore } from '../../trade-rooms/useTradeRoomsStore';
import { TRADE_ROOMS, getDailyEventTopic } from '../../trade-rooms/tradeRoomsData';

const TEXT_PRIMARY = '#1f2937';
const TEXT_MUTED = '#6b7280';
const FB_BLUE = '#1877f2';

/**
 * Friends-feed card: a vertical stack of full-width premium room buttons —
 * each room is its own tappable button (fantasy-league button language:
 * gradient + accent border + glow). Tapping the header (or the footer link)
 * opens the rooms list; tapping a room opens that room.
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
          marginBottom: 12,
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
              maxFontSizeMultiplier={1.15}
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
                <Text
                  maxFontSizeMultiplier={1.15}
                  style={{ fontSize: 10, fontWeight: '900', color: '#ffffff' }}
                >
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
              flexShrink: 1,
            }}
          >
            היום מדברים על: {dailyTopic.title}
          </Text>
        </View>
        <ChevronLeft size={20} color={TEXT_MUTED} strokeWidth={2.4} />
      </Pressable>

      {/* Vertical stack of full-width premium room buttons */}
      {allRooms.map((room) => {
        const unread = unreadFor(room.id);
        return (
          <Pressable
            key={room.id}
            onPress={() => openRoom(room.id)}
            accessibilityRole="button"
            accessibilityLabel={`חדר ${room.name}`}
            style={({ pressed }) => ({
              marginHorizontal: 16,
              marginBottom: 10,
              borderRadius: 16,
              shadowColor: room.accentColor,
              shadowOpacity: 0.25,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
              opacity: pressed ? 0.92 : 1,
            })}
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

              {/* Name + tagline */}
              <View style={{ flex: 1 }}>
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
                  {room.tagline}
                </Text>
              </View>

              {/* Unread badge — only when there is something new */}
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
                  <Text
                    maxFontSizeMultiplier={1.15}
                    style={{ fontSize: 11, fontWeight: '900', color: '#ffffff' }}
                  >
                    {unread > 9 ? '9+' : unread}
                  </Text>
                </View>
              )}

              <ChevronLeft size={20} color={room.accentColor} strokeWidth={2.4} />
            </LinearGradient>
          </Pressable>
        );
      })}

      {/* Footer link-row — see all rooms */}
      <Pressable
        onPress={openList}
        accessibilityRole="button"
        accessibilityLabel="כל החדרים"
        style={({ pressed }) => ({
          marginHorizontal: 16,
          marginTop: 2,
          paddingVertical: 10,
          borderRadius: 12,
          alignItems: 'center',
          backgroundColor: pressed ? '#e0f2fe' : 'transparent',
        })}
      >
        <Text
          maxFontSizeMultiplier={1.15}
          style={{
            fontSize: 13,
            fontWeight: '800',
            color: FB_BLUE,
            writingDirection: 'rtl',
          }}
        >
          כל החדרים ›
        </Text>
      </Pressable>
    </View>
  );
}
