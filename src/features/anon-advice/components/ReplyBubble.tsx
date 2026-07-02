import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ThumbsUp } from 'lucide-react-native';
import type { AnonAdviceReply } from '../anonAdviceTypes';
import { AnonAvatar } from './AnonAvatar';
import { DUO } from '../../../constants/theme';

interface ReplyBubbleProps {
  reply: AnonAdviceReply;
  index?: number;
  /** True for the highest-upvoted reply — shows the "top answer" badge. */
  isTopAnswer?: boolean;
  upvotedBySelf?: boolean;
  onToggleUpvote?: (replyId: string) => void;
}

export function ReplyBubble({
  reply,
  index = 0,
  isTopAnswer = false,
  upvotedBySelf = false,
  onToggleUpvote,
}: ReplyBubbleProps): React.ReactElement {
  const upvotes = reply.upvotes ?? 0;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 40).duration(220)}
      style={{
        marginHorizontal: 16,
        marginBottom: 10,
        backgroundColor: reply.isSelf ? DUO.blueSurface : '#ffffff',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: isTopAnswer ? '#f59e0b' : reply.isSelf ? DUO.blue : DUO.border,
        padding: 12,
      }}
    >
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 8, gap: 6 }}>
        <AnonAvatar alias={reply.alias} size={28} isSelf={reply.isSelf} />
        {isTopAnswer && (
          <View
            style={{
              backgroundColor: '#fef3c7',
              borderRadius: 10,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '900', color: '#b45309' }}>
              ⭐ תשובה מובילה
            </Text>
          </View>
        )}
        <View style={{ flex: 1 }} />
        {reply.agreedWith !== undefined && (
          <View
            style={{
              backgroundColor: reply.agreedWith === 0 ? DUO.blue : DUO.green,
              borderRadius: 10,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#ffffff' }}>
              מסכים עם {reply.agreedWith === 0 ? 'א׳' : 'ב׳'}
            </Text>
          </View>
        )}
      </View>
      <Text
        style={{
          fontSize: 14,
          color: DUO.text,
          writingDirection: 'rtl',
          textAlign: 'right',
          lineHeight: 20,
        }}
      >
        {reply.body}
      </Text>

      {/* Helpful vote */}
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', marginTop: 8 }}>
        <Pressable
          onPress={() => onToggleUpvote?.(reply.id)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="תשובה מועילה"
          style={({ pressed }) => ({
            flexDirection: 'row-reverse',
            alignItems: 'center',
            gap: 5,
            backgroundColor: upvotedBySelf ? '#e0f2fe' : '#f3f4f6',
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 5,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <ThumbsUp
            size={13}
            color={upvotedBySelf ? DUO.blue : DUO.textMuted}
            fill={upvotedBySelf ? DUO.blue : 'transparent'}
            strokeWidth={2.2}
          />
          <Text
            style={{
              fontSize: 12,
              fontWeight: '800',
              color: upvotedBySelf ? DUO.blue : DUO.textMuted,
            }}
          >
            {upvotes > 0 ? `מועיל · ${upvotes}` : 'מועיל'}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}