import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MessagesSquare, ChevronLeft } from 'lucide-react-native';

import { tapHaptic } from '../../../utils/haptics';
import { useTradeRoomsStore } from '../../trade-rooms/useTradeRoomsStore';
import {
  TRADE_ROOMS,
  getDailyEventTopic,
  DAILY_FIRST_MESSAGE_COINS,
} from '../../trade-rooms/tradeRoomsData';
import { PremiumRoomButton } from '../../trade-rooms/components/PremiumRoomButton';

const TEXT_PRIMARY = '#1f2937';
const TEXT_MUTED = '#6b7280';
const FB_BLUE = '#1877f2';

/**
 * Friends-feed card: a vertical stack of full-width premium room buttons.
 * Tapping the header (or the footer link) opens the rooms list; tapping a room
 * opens that room. No fabricated activity: the unread badge counts genuine peer
 * messages only, and quiet rooms say so honestly.
 */
export function TradeRoomsCard(): React.ReactElement {
  const router = useRouter();
  const messagesByRoom = useTradeRoomsStore((s) => s.messagesByRoom);
  const lastReadAt = useTradeRoomsStore((s) => s.lastReadAt);
  const customRooms = useTradeRoomsStore((s) => s.customRooms);
  const chatRewardDate = useTradeRoomsStore((s) => s.chatRewardDate);
  const allRooms = [...TRADE_ROOMS, ...customRooms];

  const dailyTopic = getDailyEventTopic();

  // Unread = genuine peer messages after lastRead. The Captain Shark opener
  // (isShark) and the user's own messages never count → no fake FOMO.
  const unreadFor = (roomId: string): number => {
    const lastRead = lastReadAt[roomId];
    const peers = (messagesByRoom[roomId] ?? []).filter((m) => !m.isSelf && !m.isShark);
    if (!lastRead) return Math.min(peers.length, 9);
    return peers.filter((m) => m.sentAt > lastRead).length;
  };

  const totalUnread = allRooms.reduce((sum, r) => sum + unreadFor(r.id), 0);

  // A room stays "quiet" only while the sole message is Captain Shark's opener.
  // Once anyone (the user included) has actually posted, the discussion has begun.
  const anyRealActivity = allRooms.some((r) =>
    (messagesByRoom[r.id] ?? []).some((m) => !m.isShark),
  );

  // A6 — real state of the daily first-message reward (from the store).
  const todayStr = new Date().toISOString().slice(0, 10);
  const rewardCollected = chatRewardDate === todayStr;

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
        hitSlop={8}
        accessibilityRole="button"
        // C4: the header's total-unread count is announced.
        accessibilityLabel={
          totalUnread > 0
            ? `פתחו את חדרי המסחר, ${totalUnread} הודעות חדשות`
            : 'פתחו את חדרי המסחר'
        }
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
            נושא היום: {dailyTopic.title}
          </Text>
        </View>
        <ChevronLeft size={20} color={TEXT_MUTED} strokeWidth={2.4} />
      </Pressable>

      {/* A6 — daily first-message reward chip (real state from the store) */}
      <View
        style={{
          paddingHorizontal: 16,
          marginBottom: anyRealActivity ? 12 : 8,
          flexDirection: 'row-reverse',
        }}
      >
        <View
          accessible
          accessibilityLabel={
            rewardCollected
              ? 'תגמול ההודעה הראשונה היום כבר נאסף'
              : `הודעה ראשונה היום בחדרים מזכה ב-${DAILY_FIRST_MESSAGE_COINS} מטבעות`
          }
          style={{
            flexDirection: 'row-reverse',
            alignItems: 'center',
            backgroundColor: rewardCollected ? '#dcfce7' : '#fef3c7',
            borderRadius: 999,
            paddingVertical: 5,
            paddingHorizontal: 10,
            borderWidth: 1,
            borderColor: rewardCollected ? '#86efac' : '#fde68a',
          }}
        >
          <Text
            maxFontSizeMultiplier={1.2}
            style={{
              fontSize: 12,
              fontWeight: '900',
              color: rewardCollected ? '#15803d' : '#b45309',
              writingDirection: 'rtl',
              textAlign: 'right',
            }}
          >
            {rewardCollected
              ? 'נאסף היום ✓'
              : `הודעה ראשונה היום = +${DAILY_FIRST_MESSAGE_COINS} מטבעות`}
          </Text>
        </View>
      </View>

      {/* C0-tr — honest empty state for quiet rooms (Captain Shark voice, plural) */}
      {!anyRealActivity && (
        <Text
          maxFontSizeMultiplier={1.3}
          style={{
            paddingHorizontal: 16,
            marginBottom: 12,
            fontSize: 12.5,
            lineHeight: 18,
            color: TEXT_MUTED,
            writingDirection: 'rtl',
            textAlign: 'right',
          }}
        >
          החדרים שקטים כרגע — היכנסו ופתחו את הדיון. אתם קובעים את הטון.
        </Text>
      )}

      {/* Vertical stack of full-width premium room buttons (shared with the
          rooms-list screen so both surfaces look identical) */}
      {allRooms.map((room) => (
        <PremiumRoomButton
          key={room.id}
          room={room}
          unread={unreadFor(room.id)}
          onPress={() => openRoom(room.id)}
        />
      ))}

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
