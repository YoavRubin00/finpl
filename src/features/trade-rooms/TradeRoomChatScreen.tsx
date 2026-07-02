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
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronRight, Send, Pin } from 'lucide-react-native';

import { tapHaptic, successHaptic } from '../../utils/haptics';
import { useTradeRoomsStore } from './useTradeRoomsStore';
import { getRoomById, getDailyEventTopic, MAX_MESSAGE_LENGTH } from './tradeRoomsData';
import { moderateWithSharkBot } from '../moderation/sharkModeratorBot';
import { MessageBubble } from './components/MessageBubble';
import type { TradeRoomId, TradeRoomMessage, MessageSentiment } from './tradeRoomsTypes';

const FEED_BG = '#f3f4f6';
const TEXT_PRIMARY = '#1f2937';
const TEXT_MUTED = '#6b7280';

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

  const renderMessage = React.useCallback(
    ({ item }: { item: TradeRoomMessage }) => (
      <MessageBubble message={item} onToggleLike={(id) => toggleLike(roomId, id)} />
    ),
    [roomId, toggleLike],
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
          <Text style={{ fontSize: 20 }}>{room.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
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
            style={{
              fontSize: 11,
              color: TEXT_MUTED,
              writingDirection: 'rtl',
              textAlign: 'right',
            }}
          >
            {sentiment.taggedCount >= 3 ? `${sentiment.bullPercent}% שוריים` : ''}
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
        style={{ flex: 1 }}
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
            entering={FadeInDown.duration(200)}
            exiting={FadeOut.duration(200)}
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
                flexDirection: 'row-reverse',
                alignItems: 'center',
                gap: 6,
                borderRadius: 22,
                paddingHorizontal: 16,
                height: 44,
                backgroundColor: draft.trim().length > 0 ? '#1877f2' : '#cbd5e1',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ fontSize: 14, fontWeight: '900', color: '#ffffff' }}>שליחה</Text>
              <Send size={16} color="#ffffff" strokeWidth={2.4} style={{ transform: [{ scaleX: -1 }] }} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
