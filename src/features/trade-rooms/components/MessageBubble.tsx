import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { Heart } from 'lucide-react-native';
import { formatAlias } from '../../anon-advice/anonAdviceData';
import { AvatarImage } from '../../avatars/AvatarImage';
import type { AnonAlias } from '../../anon-advice/anonAdviceTypes';
import type { TradeRoomMessage } from '../tradeRoomsTypes';

const TEXT_PRIMARY = '#1f2937';
const TEXT_MUTED = '#6b7280';
const SELF_BUBBLE = '#d9fdd3'; // WhatsApp-green tint for the user's own messages
const OTHER_BUBBLE = '#ffffff';
const SHARK_BUBBLE = '#eff8ff';
const SHARK_BORDER = '#7dd3fc';
const SHARK_NAME = '#0284c7';
const TIME_COLOR = '#94a3b8';

const R = 18; // bubble corner radius
const TAIL = 6; // sharp "tail" corner on the first bubble of a run

// Stable per-sender name color (Telegram-style colored group names).
const NAME_COLORS = [
  '#d6336c', '#e8590c', '#2f9e44', '#1971c2', '#7048e8',
  '#c2255c', '#0c8599', '#e67700', '#5f3dc4', '#087f5b',
];

function nameColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return NAME_COLORS[Math.abs(hash) % NAME_COLORS.length];
}

function aliasSeed(alias: AnonAlias): string {
  return `${alias.emoji}${alias.noun}${alias.number}`;
}

function formatTime(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

interface MessageBubbleProps {
  message: TradeRoomMessage;
  /** First bubble of a same-sender run — shows the avatar, name and the tail. */
  isFirstInGroup: boolean;
  onToggleLike: (messageId: string) => void;
}

function SentimentTag({ sentiment }: { sentiment: 'bull' | 'bear' }): React.ReactElement {
  const isBull = sentiment === 'bull';
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: isBull ? '#dcfce7' : '#fee2e2',
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 2,
        marginBottom: 4,
      }}
    >
      <Text
        maxFontSizeMultiplier={1.3}
        style={{ fontSize: 11, fontWeight: '800', color: isBull ? '#15803d' : '#b91c1c' }}
      >
        {isBull ? '🐂 שורי' : '🐻 דובי'}
      </Text>
    </View>
  );
}

export const MessageBubble = React.memo(function MessageBubble({
  message,
  isFirstInGroup,
  onToggleLike,
}: MessageBubbleProps): React.ReactElement {
  const { isSelf, isShark } = message;
  const reduced = useReducedMotion();
  const showLikes = message.likes > 0 || message.likedBySelf;

  const bubbleBg = isShark ? SHARK_BUBBLE : isSelf ? SELF_BUBBLE : OTHER_BUBBLE;
  // Server messages carry a chat nickname (display_name); local alias is the fallback.
  const senderName = isShark
    ? 'קפטן שארק'
    : message.displayName ?? (message.alias ? formatAlias(message.alias) : '');
  const senderColor = isShark
    ? SHARK_NAME
    : senderName
      ? nameColor(message.alias ? aliasSeed(message.alias) : senderName)
      : TEXT_MUTED;

  // Physical corners (app runs LTR): self hugs the right, others hug the left.
  const tailOverride = isFirstInGroup
    ? isSelf
      ? { borderTopRightRadius: TAIL }
      : { borderTopLeftRadius: TAIL }
    : null;

  return (
    <Animated.View
      entering={reduced ? undefined : FadeInDown.duration(160)}
      style={{
        flexDirection: isSelf ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        marginTop: isFirstInGroup ? 10 : 2,
        marginHorizontal: 10,
        gap: 6,
      }}
    >
      {/* Avatar gutter — others only; avatar shown on the first bubble of a run */}
      {!isSelf && (
        <View style={{ width: 32, alignSelf: 'flex-end' }}>
          {isFirstInGroup && (
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: isShark ? '#e0f2fe' : '#f1f5f9',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isShark ? (
                <ExpoImage
                  source={require('../../../../assets/webp/fin-standard.webp')}
                  style={{ width: 27, height: 27 }}
                  contentFit="contain"
                  accessible={false}
                  autoplay
                />
              ) : (
                <AvatarImage
                  avatarId={message.avatarId ?? null}
                  size={28}
                  fallbackEmoji={message.alias?.emoji ?? '🐟'}
                />
              )}
            </View>
          )}
        </View>
      )}

      <View style={{ maxWidth: '78%', alignItems: isSelf ? 'flex-end' : 'flex-start' }}>
        {/* Author name — others, first bubble of a run only */}
        {!isSelf && isFirstInGroup && (
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
            style={{
              fontSize: 12,
              fontWeight: isShark ? '900' : '800',
              color: senderColor,
              marginBottom: 2,
              marginHorizontal: 4,
              writingDirection: 'rtl',
              textAlign: 'right',
            }}
          >
            {senderName}
          </Text>
        )}

        {/* Bubble */}
        <Pressable
          onLongPress={() => onToggleLike(message.id)}
          delayLongPress={220}
          style={{
            backgroundColor: bubbleBg,
            borderTopLeftRadius: R,
            borderTopRightRadius: R,
            borderBottomLeftRadius: R,
            borderBottomRightRadius: R,
            ...tailOverride,
            paddingHorizontal: 11,
            paddingTop: 7,
            paddingBottom: 5,
            borderWidth: isShark ? 1 : 0,
            borderColor: isShark ? SHARK_BORDER : 'transparent',
            shadowColor: '#000',
            shadowOpacity: 0.06,
            shadowRadius: 1.5,
            shadowOffset: { width: 0, height: 1 },
            elevation: 1,
          }}
        >
          {message.sentiment && <SentimentTag sentiment={message.sentiment} />}
          {message.ticker && (
            <Text
              maxFontSizeMultiplier={1.3}
              style={{
                fontSize: 11,
                fontWeight: '800',
                color: '#0284c7',
                marginBottom: 2,
                textAlign: 'right',
              }}
            >
              ${message.ticker}
            </Text>
          )}
          <Text
            maxFontSizeMultiplier={1.6}
            style={{
              color: TEXT_PRIMARY,
              fontSize: 14,
              lineHeight: 20,
              fontWeight: isSelf ? '500' : '400',
              writingDirection: 'rtl',
              textAlign: 'right',
            }}
          >
            {message.body}
          </Text>

          {/* Inline timestamp in the bubble's bottom corner */}
          <Text
            maxFontSizeMultiplier={1.3}
            style={{
              alignSelf: 'flex-end',
              fontSize: 10,
              color: TIME_COLOR,
              marginTop: 2,
            }}
          >
            {formatTime(message.sentAt)}
          </Text>
        </Pressable>

        {/* Like reaction chip — appears once the message has a like */}
        {showLikes && (
          <Pressable
            onPress={() => onToggleLike(message.id)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="אהבתי"
            style={{
              flexDirection: 'row-reverse',
              alignItems: 'center',
              gap: 3,
              marginTop: 3,
              marginHorizontal: 2,
              backgroundColor: '#ffffff',
              borderRadius: 999,
              paddingHorizontal: 7,
              paddingVertical: 2,
              borderWidth: 1,
              borderColor: message.likedBySelf ? '#fbcfe0' : '#e5e7eb',
            }}
          >
            <Heart
              size={11}
              color={message.likedBySelf ? '#ef4444' : '#9ca3af'}
              fill={message.likedBySelf ? '#ef4444' : 'transparent'}
              strokeWidth={2.4}
            />
            <Text
              maxFontSizeMultiplier={1.3}
              style={{
                fontSize: 10,
                fontWeight: '800',
                color: message.likedBySelf ? '#ef4444' : '#6b7280',
              }}
            >
              {message.likes}
            </Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
});
