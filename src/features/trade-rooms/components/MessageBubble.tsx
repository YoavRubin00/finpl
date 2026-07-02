import React from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Heart } from 'lucide-react-native';
import { formatAlias } from '../../anon-advice/anonAdviceData';
import { AvatarImage } from '../../avatars/AvatarImage';
import type { TradeRoomMessage } from '../tradeRoomsTypes';

const TEXT_PRIMARY = '#1f2937';
const TEXT_MUTED = '#6b7280';
const SELF_BUBBLE = '#dcf2ff';
const OTHER_BUBBLE = '#ffffff';
const SHARK_BUBBLE = '#eff8ff';
const SHARK_BORDER = '#7dd3fc';

function formatTime(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

interface MessageBubbleProps {
  message: TradeRoomMessage;
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
      <Text style={{ fontSize: 11, fontWeight: '800', color: isBull ? '#15803d' : '#b91c1c' }}>
        {isBull ? '🐂 שורי' : '🐻 דובי'}
      </Text>
    </View>
  );
}

export const MessageBubble = React.memo(function MessageBubble({
  message,
  onToggleLike,
}: MessageBubbleProps): React.ReactElement {
  const { isSelf, isShark } = message;
  const showLikes = message.likes > 0 || message.likedBySelf;

  return (
    <Animated.View
      entering={FadeInDown.duration(180)}
      style={{
        flexDirection: isSelf ? 'row' : 'row-reverse',
        alignItems: 'flex-end',
        marginVertical: 3,
        marginHorizontal: 12,
        gap: 6,
      }}
    >
      {/* Avatar */}
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: isShark ? '#e0f2fe' : '#f3f4f6',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isShark ? (
          <Image
            source={require('../../../../assets/webp/fin-standard.webp')}
            style={{ width: 24, height: 24 }}
            resizeMode="contain"
          />
        ) : (
          <AvatarImage
            avatarId={message.avatarId ?? null}
            size={28}
            fallbackEmoji={message.alias?.emoji ?? '🐟'}
          />
        )}
      </View>

      <View style={{ maxWidth: '76%', alignItems: isSelf ? 'flex-end' : 'flex-start' }}>
        {/* Author name */}
        {!isSelf && (
          <Text
            style={{
              fontSize: 11,
              fontWeight: isShark ? '900' : '700',
              color: isShark ? '#0284c7' : TEXT_MUTED,
              marginBottom: 2,
              marginHorizontal: 4,
              writingDirection: 'rtl',
              textAlign: 'right',
            }}
          >
            {isShark ? 'קפטן שארק' : message.alias ? formatAlias(message.alias) : ''}
          </Text>
        )}

        {/* Bubble */}
        <Pressable
          onLongPress={() => onToggleLike(message.id)}
          style={{
            backgroundColor: isShark ? SHARK_BUBBLE : isSelf ? SELF_BUBBLE : OTHER_BUBBLE,
            borderRadius: 16,
            ...(isSelf ? { borderBottomEndRadius: 4 } : { borderBottomStartRadius: 4 }),
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderWidth: 1,
            borderColor: isShark ? SHARK_BORDER : '#e5e7eb',
          }}
        >
          {message.sentiment && <SentimentTag sentiment={message.sentiment} />}
          {message.ticker && (
            <Text
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
            style={{
              color: TEXT_PRIMARY,
              fontSize: 14,
              lineHeight: 20,
              fontWeight: isSelf ? '600' : '400',
              writingDirection: 'rtl',
              textAlign: 'right',
            }}
          >
            {message.body}
          </Text>
        </Pressable>

        {/* Meta row: time + likes */}
        <View
          style={{
            flexDirection: 'row-reverse',
            alignItems: 'center',
            gap: 8,
            marginTop: 2,
            marginHorizontal: 4,
          }}
        >
          <Text style={{ fontSize: 10, color: '#9ca3af' }}>{formatTime(message.sentAt)}</Text>
          <Pressable
            onPress={() => onToggleLike(message.id)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="אהבתי"
            style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 3 }}
          >
            <Heart
              size={12}
              color={message.likedBySelf ? '#ef4444' : '#9ca3af'}
              fill={message.likedBySelf ? '#ef4444' : 'transparent'}
              strokeWidth={2.4}
            />
            {showLikes && (
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '700',
                  color: message.likedBySelf ? '#ef4444' : '#9ca3af',
                }}
              >
                {message.likes}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
});
