import React from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOut, useReducedMotion } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronRight, Send, Pin } from 'lucide-react-native';

import { tapHaptic, successHaptic } from '../../utils/haptics';
import { getIsraelDateISO } from '../../utils/israelTime';
import { useTradeRoomsStore } from './useTradeRoomsStore';
import { getRoomById, getDailyEventTopic, MAX_MESSAGE_LENGTH } from './tradeRoomsData';
import { moderateWithSharkBot } from '../moderation/sharkModeratorBot';
import { MessageBubble } from './components/MessageBubble';
import type { TradeRoomId, TradeRoomMessage, MessageSentiment } from './tradeRoomsTypes';

const FEED_BG = '#f3f4f6';
const CHAT_BG = '#e9eef2'; // subtle WhatsApp-style chat wallpaper tint
const TEXT_PRIMARY = '#1f2937';
const TEXT_MUTED = '#6b7280';

// ===== Day grouping + message-run helpers =====
const GROUP_WINDOW_MS = 5 * 60 * 1000;

function dayKeyOf(iso: string): string {
  return getIsraelDateISO(new Date(iso));
}

function dayLabelOf(iso: string): string {
  const key = dayKeyOf(iso);
  const today = getIsraelDateISO();
  const yesterday = getIsraelDateISO(new Date(Date.now() - 86_400_000));
  if (key === today) return 'היום';
  if (key === yesterday) return 'אתמול';
  return new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' });
}

function messageSenderKey(m: TradeRoomMessage): string {
  if (m.isSelf) return 'self';
  if (m.isShark) return 'shark';
  return m.alias ? `a:${m.alias.emoji}${m.alias.noun}${m.alias.number}` : 'anon';
}

function isGroupedWithPrev(prev: TradeRoomMessage | undefined, cur: TradeRoomMessage): boolean {
  if (!prev) return false;
  if (messageSenderKey(prev) !== messageSenderKey(cur)) return false;
  if (dayKeyOf(prev.sentAt) !== dayKeyOf(cur.sentAt)) return false;
  return new Date(cur.sentAt).getTime() - new Date(prev.sentAt).getTime() <= GROUP_WINDOW_MS;
}

function DateSeparator({ label }: { label: string }): React.ReactElement {
  return (
    <View style={{ alignItems: 'center', marginVertical: 10 }}>
      <View
        style={{
          backgroundColor: 'rgba(255,255,255,0.92)',
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 4,
          shadowColor: '#000',
          shadowOpacity: 0.05,
          shadowRadius: 1,
          shadowOffset: { width: 0, height: 1 },
          elevation: 1,
        }}
      >
        <Text
          maxFontSizeMultiplier={1.3}
          style={{ fontSize: 11, fontWeight: '800', color: '#475569', writingDirection: 'rtl' }}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

export function TradeRoomChatScreen(): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ roomId: string }>();
  const roomId = (params.roomId ?? 'wallstreet') as TradeRoomId;
  const customRooms = useTradeRoomsStore((s) => s.customRooms);
  const room = customRooms.find((r) => r.id === roomId) ?? getRoomById(roomId);

  const messagesByRoom = useTradeRoomsStore((s) => s.messagesByRoom);
  const sendMessage = useTradeRoomsStore((s) => s.sendMessage);
  const toggleLike = useTradeRoomsStore((s) => s.toggleLike);
  const markRoomRead = useTradeRoomsStore((s) => s.markRoomRead);
  const getSentimentSummary = useTradeRoomsStore((s) => s.getSentimentSummary);

  const messages = messagesByRoom[roomId] ?? [];
  const sentiment = getSentimentSummary(roomId);

  const reduced = useReducedMotion();
  const [draft, setDraft] = React.useState('');
  const [draftSentiment, setDraftSentiment] = React.useState<MessageSentiment | undefined>(undefined);
  const [error, setError] = React.useState<string | null>(null);
  const [rewardBanner, setRewardBanner] = React.useState<{ coins: number; xp: number } | null>(null);

  const listRef = React.useRef<FlatList<TradeRoomMessage>>(null);

  // Mark read on entry + exit so the unread badge clears.
  React.useEffect(() => {
    markRoomRead(roomId);
    return () => markRoomRead(roomId);
  }, [roomId, markRoomRead]);

  const handleSend = React.useCallback(() => {
    const body = draft.trim();
    if (!body) return;
    const result = sendMessage(roomId, body, draftSentiment);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    tapHaptic();
    setError(null);
    setDraft('');
    setDraftSentiment(undefined);
    if (result.reward) {
      successHaptic();
      setRewardBanner(result.reward);
      setTimeout(() => setRewardBanner(null), 3000);
    }
    // Shark moderator bot reviews async — deletes spam/off-topic/profanity.
    void moderateWithSharkBot(body).then((verdict) => {
      if (!verdict.ok) {
        useTradeRoomsStore.getState().removeMessage(roomId, result.messageId);
        setError(verdict.reason ?? 'ההודעה הוסרה על ידי קפטן שארק.');
      }
    });
  }, [draft, draftSentiment, roomId, sendMessage]);

  const dailyTopic = room.isDailyEvent ? getDailyEventTopic() : null;

  // Honest subtitle: real bull/bear split once enough messages are tagged,
  // otherwise the room's static descriptor — never a fabricated presence count.
  const subtitle =
    sentiment.taggedCount >= 3
      ? `${sentiment.bullPercent}% שוריים · ${100 - sentiment.bullPercent}% דוביים`
      : dailyTopic
        ? dailyTopic.subtitle
        : room.tagline;

  const renderMessage = React.useCallback(
    ({ item, index }: { item: TradeRoomMessage; index: number }) => {
      const prev = index > 0 ? messages[index - 1] : undefined;
      const showDate = !prev || dayKeyOf(prev.sentAt) !== dayKeyOf(item.sentAt);
      const isFirstInGroup = !isGroupedWithPrev(prev, item);
      return (
        <>
          {showDate && <DateSeparator label={dayLabelOf(item.sentAt)} />}
          <MessageBubble
            message={item}
            isFirstInGroup={isFirstInGroup}
            onToggleLike={(id) => toggleLike(roomId, id)}
          />
        </>
      );
    },
    [messages, roomId, toggleLike],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: FEED_BG }} edges={['top']}>
      {/* Header */}
      <View
        style={{
          backgroundColor: '#ffffff',
          paddingHorizontal: 12,
          paddingVertical: 10,
          flexDirection: 'row-reverse',
          alignItems: 'center',
          gap: 10,
          borderBottomWidth: 1,
          borderBottomColor: '#e5e7eb',
        }}
      >
        <Pressable
          onPress={() => router.replace('/trade-rooms' as never)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="חזרה לחדרי המסחר"
        >
          <ChevronRight size={26} color={TEXT_PRIMARY} strokeWidth={2.4} />
        </Pressable>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: room.accentBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 20 }}>{room.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
            style={{
              fontSize: 16,
              fontWeight: '900',
              color: TEXT_PRIMARY,
              writingDirection: 'rtl',
              textAlign: 'right',
            }}
          >
            {dailyTopic ? dailyTopic.title : room.name}
          </Text>
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
            style={{
              fontSize: 11,
              color: TEXT_MUTED,
              writingDirection: 'rtl',
              textAlign: 'right',
            }}
          >
            {subtitle}
          </Text>
        </View>
      </View>

      {/* Pinned Captain Shark ground rule */}
      <View
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          gap: 8,
          backgroundColor: '#eff8ff',
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: '#e0f2fe',
        }}
      >
        <Pin size={13} color="#0284c7" strokeWidth={2.4} />
        <Image
          source={require('../../../assets/webp/fin-standard.webp')}
          style={{ width: 20, height: 20 }}
          resizeMode="contain"
        />
        <Text
          numberOfLines={2}
          style={{
            flex: 1,
            fontSize: 12,
            color: '#075985',
            writingDirection: 'rtl',
            textAlign: 'right',
            lineHeight: 16,
          }}
        >
          {room.pinnedTip}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: CHAT_BG }}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          contentContainerStyle={{ paddingVertical: 10 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        />

        {/* Reward banner — first message of the day */}
        {rewardBanner && (
          <Animated.View
            entering={reduced ? undefined : FadeInDown.duration(200)}
            exiting={reduced ? undefined : FadeOut.duration(200)}
            style={{
              marginHorizontal: 16,
              marginBottom: 6,
              backgroundColor: '#dcfce7',
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: '#86efac',
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '800',
                color: '#15803d',
                writingDirection: 'rtl',
                textAlign: 'center',
              }}
            >
              +{rewardBanner.coins} מטבעות +{rewardBanner.xp}XP על ההודעה הראשונה היום
            </Text>
          </Animated.View>
        )}

        {/* Moderation error */}
        {error && (
          <Text
            style={{
              fontSize: 12,
              color: '#b91c1c',
              writingDirection: 'rtl',
              textAlign: 'right',
              marginHorizontal: 20,
              marginBottom: 4,
            }}
          >
            {error}
          </Text>
        )}

        {/* Composer */}
        <View
          style={{
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#e5e7eb',
            paddingHorizontal: 12,
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom, 12),
            gap: 8,
          }}
        >
          {/* Sentiment chips */}
          <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
            {(
              [
                { key: 'bull' as const, label: '🐂 שורי', activeBg: '#dcfce7', activeText: '#15803d' },
                { key: 'bear' as const, label: '🐻 דובי', activeBg: '#fee2e2', activeText: '#b91c1c' },
              ]
            ).map((chip) => {
              const active = draftSentiment === chip.key;
              return (
                <Pressable
                  key={chip.key}
                  onPress={() => {
                    tapHaptic();
                    setDraftSentiment(active ? undefined : chip.key);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={chip.label}
                  style={{
                    backgroundColor: active ? chip.activeBg : '#f3f4f6',
                    borderRadius: 999,
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderWidth: 1,
                    borderColor: active ? chip.activeText : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '800',
                      color: active ? chip.activeText : TEXT_MUTED,
                    }}
                  >
                    {chip.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ flexDirection: 'row-reverse', alignItems: 'flex-end', gap: 8 }}>
            <TextInput
              value={draft}
              onChangeText={(t) => {
                setDraft(t);
                if (error) setError(null);
              }}
              placeholder="מה דעתכם על השוק?"
              placeholderTextColor="#9ca3af"
              multiline
              onKeyPress={(e) => {
                // Web/desktop: Enter sends, Shift+Enter makes a new line.
                const ne = e.nativeEvent as { key?: string; shiftKey?: boolean };
                if (ne.key === 'Enter' && !ne.shiftKey && Platform.OS === 'web') {
                  e.preventDefault?.();
                  handleSend();
                }
              }}
              maxLength={MAX_MESSAGE_LENGTH}
              style={{
                flex: 1,
                backgroundColor: FEED_BG,
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingTop: 10,
                paddingBottom: 10,
                fontSize: 14,
                color: TEXT_PRIMARY,
                maxHeight: 100,
                writingDirection: 'rtl',
                textAlign: 'right',
              }}
            />
            <Pressable
              onPress={handleSend}
              disabled={draft.trim().length === 0}
              accessibilityRole="button"
              accessibilityLabel="שליחת הודעה"
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: draft.trim().length > 0 ? '#1877f2' : '#cbd5e1',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Send
                size={20}
                color="#ffffff"
                strokeWidth={2.4}
                style={{ transform: [{ scaleX: -1 }], marginRight: 2 }}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
