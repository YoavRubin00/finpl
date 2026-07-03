import React from 'react';
import { ScrollView, View, Text, Pressable, Modal, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight, MessagesSquare, Plus, X } from 'lucide-react-native';

import { tapHaptic } from '../../utils/haptics';
import { useTradeRoomsStore } from './useTradeRoomsStore';
import { TRADE_ROOMS, getDailyEventTopic } from './tradeRoomsData';
import { PremiumRoomButton } from './components/PremiumRoomButton';
import { formatAlias } from '../anon-advice/anonAdviceData';
import type { TradeRoom } from './tradeRoomsTypes';

const FEED_BG = '#f3f4f6';
const TEXT_PRIMARY = '#1f2937';
const TEXT_MUTED = '#6b7280';

function DailyEventCard({
  room,
  unreadCount,
  hasLiveDiscussion,
  onPress,
}: {
  room: TradeRoom;
  unreadCount: number;
  /** True only when real peer messages (not self, not Captain Shark) exist. */
  hasLiveDiscussion: boolean;
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
          numberOfLines={1}
          style={{
            flex: 1,
            minWidth: 0,
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
        numberOfLines={2}
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
        numberOfLines={2}
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

      {/* Honest status line — the green "live" dot appears only when real
          peer messages exist; otherwise an inviting, truthful opener. */}
      <View
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          gap: 4,
          marginTop: 10,
        }}
      >
        {hasLiveDiscussion && (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: '#22c55e',
            }}
          />
        )}
        <Text
          style={{
            fontSize: 12,
            fontWeight: '700',
            color: hasLiveDiscussion ? '#15803d' : '#c2410c',
            flexShrink: 1,
          }}
          maxFontSizeMultiplier={1.15}
        >
          {hasLiveDiscussion ? 'הקהילה מדברת על זה עכשיו' : 'הנושא של היום — פתחו את הדיון'}
        </Text>
      </View>
    </Pressable>
  );
}

const ROOM_EMOJIS = ['💬', '📈', '🏠', '🎓', '🚗', '💼', '🏖️', '💍', '👶', '⚽'] as const;

function CreateRoomModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (roomId: string) => void;
}): React.ReactElement {
  const createRoom = useTradeRoomsStore((s) => s.createRoom);
  const [name, setName] = React.useState('');
  const [emoji, setEmoji] = React.useState<string>('💬');
  const [tagline, setTagline] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const reset = (): void => {
    setName('');
    setEmoji('💬');
    setTagline('');
    setError(null);
  };

  const handleCreate = (): void => {
    const result = createRoom({ name, emoji, tagline });
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    tapHaptic();
    reset();
    onCreated(result.roomId);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top']}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row-reverse',
            alignItems: 'center',
            gap: 10,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#e5e7eb',
          }}
        >
          <Text style={{ flex: 1, fontSize: 17, fontWeight: '900', color: TEXT_PRIMARY, writingDirection: 'rtl', textAlign: 'right' }}>
            חדר חדש
          </Text>
          <Pressable onPress={() => { reset(); onClose(); }} hitSlop={12} accessibilityRole="button" accessibilityLabel="סגירה">
            <X size={22} color={TEXT_MUTED} strokeWidth={2.4} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} showsVerticalScrollIndicator={false}>
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '900', color: TEXT_PRIMARY, writingDirection: 'rtl', textAlign: 'right' }}>
              על מה מדברים בחדר?
            </Text>
            <TextInput
              value={name}
              onChangeText={(t) => {
                setName(t);
                if (error) setError(null);
              }}
              placeholder="למשל: מניות דיבידנד"
              placeholderTextColor="#9ca3af"
              maxLength={24}
              style={{
                backgroundColor: FEED_BG,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 15,
                color: TEXT_PRIMARY,
                writingDirection: 'rtl',
                textAlign: 'right',
              }}
            />
          </View>

          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '900', color: TEXT_PRIMARY, writingDirection: 'rtl', textAlign: 'right' }}>
              אייקון
            </Text>
            <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
              {ROOM_EMOJIS.map((e) => (
                <Pressable
                  key={e}
                  onPress={() => { tapHaptic(); setEmoji(e); }}
                  accessibilityRole="button"
                  accessibilityLabel={`אייקון ${e}`}
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 23,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: emoji === e ? '#e0f2fe' : FEED_BG,
                    borderWidth: 2,
                    borderColor: emoji === e ? '#1877f2' : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 22 }}>{e}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '900', color: TEXT_PRIMARY, writingDirection: 'rtl', textAlign: 'right' }}>
              משפט תיאור (לא חובה)
            </Text>
            <TextInput
              value={tagline}
              onChangeText={setTagline}
              placeholder="מה הולך למצוא כאן מי שנכנס?"
              placeholderTextColor="#9ca3af"
              maxLength={60}
              style={{
                backgroundColor: FEED_BG,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 14,
                color: TEXT_PRIMARY,
                writingDirection: 'rtl',
                textAlign: 'right',
              }}
            />
          </View>

          {error && (
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#b91c1c', writingDirection: 'rtl', textAlign: 'right' }}>
              {error}
            </Text>
          )}

          <Pressable
            onPress={handleCreate}
            disabled={name.trim().length < 2}
            accessibilityRole="button"
            accessibilityLabel="פתיחת החדר"
            style={{
              backgroundColor: name.trim().length >= 2 ? '#1877f2' : '#d1d5db',
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: 'center',
              marginTop: 4,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '900', color: '#ffffff' }}>פתחו את החדר</Text>
          </Pressable>

          <Text style={{ fontSize: 11, color: '#9ca3af', writingDirection: 'rtl', textAlign: 'center', lineHeight: 16 }}>
            קפטן שארק שומר גם על חדרים חדשים — שמות פוגעניים או ספאם לא יעברו.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export function TradeRoomsListScreen(): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Subscribing to the maps keeps rows fresh as messages arrive.
  const messagesByRoom = useTradeRoomsStore((s) => s.messagesByRoom);
  const lastReadAt = useTradeRoomsStore((s) => s.lastReadAt);
  const customRooms = useTradeRoomsStore((s) => s.customRooms);
  const [createOpen, setCreateOpen] = React.useState(false);

  const dailyRoom = TRADE_ROOMS.find((r) => r.isDailyEvent);
  const regularRooms = [...TRADE_ROOMS.filter((r) => !r.isDailyEvent), ...customRooms];

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
          onPress={() => router.replace('/(tabs)/friends' as never)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="חזרה לעמוד החברים"
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
        <Pressable
          onPress={() => {
            tapHaptic();
            setCreateOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="פתיחת חדר חדש"
          style={({ pressed }) => ({
            flexDirection: 'row-reverse',
            alignItems: 'center',
            gap: 4,
            backgroundColor: '#1877f2',
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 8,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Plus size={14} color="#ffffff" strokeWidth={3} />
          <Text style={{ fontSize: 12, fontWeight: '900', color: '#ffffff' }}>חדר חדש</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* Daily event hero */}
        {dailyRoom && (
          <DailyEventCard
            room={dailyRoom}
            unreadCount={unreadFor(dailyRoom.id)}
            hasLiveDiscussion={(messagesByRoom[dailyRoom.id] ?? []).some(
              (m) => !m.isSelf && !m.isShark,
            )}
            onPress={() => openRoom(dailyRoom.id)}
          />
        )}

        {/* Regular rooms — SAME premium buttons as the friends hub, so the
            general rooms page looks exactly like it does from the friends
            screen (Yoav 2026-07-03). Last-message preview rides in as the
            button subtitle when there's real activity. */}
        <View style={{ paddingTop: 6 }}>
          {regularRooms.map((room) => {
            const messages = messagesByRoom[room.id] ?? [];
            const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
            const previewAuthor = lastMessage
              ? lastMessage.isShark
                ? 'קפטן שארק'
                : lastMessage.isSelf
                  ? 'אני'
                  : lastMessage.alias
                    ? formatAlias(lastMessage.alias)
                    : ''
              : '';
            const preview = lastMessage
              ? previewAuthor
                ? `${previewAuthor}: ${lastMessage.body}`
                : lastMessage.body
              : undefined;
            return (
              <PremiumRoomButton
                key={room.id}
                room={room}
                unread={unreadFor(room.id)}
                onPress={() => openRoom(room.id)}
                subtitle={preview}
              />
            );
          })}
        </View>

        <CreateRoomModal
          visible={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={(roomId) => {
            setCreateOpen(false);
            router.push(`/trade-rooms/${roomId}` as never);
          }}
        />

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
