import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { formatAlias } from '../../anon-advice/anonAdviceData';
import type { TradeRoom, TradeRoomMessage } from '../tradeRoomsTypes';

const TEXT_PRIMARY = '#1f2937';
const TEXT_MUTED = '#6b7280';

function formatListTime(isoStr: string): string {
  const d = new Date(isoStr);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
}

interface RoomRowProps {
  room: TradeRoom;
  lastMessage: TradeRoomMessage | null;
  unreadCount: number;
  onPress: () => void;
}

export function RoomRow({
  room,
  lastMessage,
  unreadCount,
  onPress,
}: RoomRowProps): React.ReactElement {
  const previewAuthor = lastMessage
    ? lastMessage.isShark
      ? 'קפטן שארק'
      : lastMessage.isSelf
        ? 'אני'
        : lastMessage.alias
          ? formatAlias(lastMessage.alias)
          : ''
    : '';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`חדר ${room.name}`}
      style={({ pressed }) => ({
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: pressed ? '#f9fafb' : '#ffffff',
      })}
    >
      {/* Room avatar tile */}
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: room.accentBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 26 }}>{room.emoji}</Text>
      </View>

      {/* Name + preview */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: 16,
              fontWeight: '800',
              color: TEXT_PRIMARY,
              writingDirection: 'rtl',
              textAlign: 'right',
            }}
          >
            {room.name}
          </Text>
          {lastMessage && (
            <Text style={{ fontSize: 11, color: unreadCount > 0 ? '#16a34a' : '#9ca3af', fontWeight: '700' }}>
              {formatListTime(lastMessage.sentAt)}
            </Text>
          )}
        </View>

        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: 13,
              color: TEXT_MUTED,
              writingDirection: 'rtl',
              textAlign: 'right',
            }}
          >
            {lastMessage ? `${previewAuthor}: ${lastMessage.body}` : room.tagline}
          </Text>
          {unreadCount > 0 && (
            <View
              style={{
                minWidth: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: '#16a34a',
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

      </View>
    </Pressable>
  );
}
