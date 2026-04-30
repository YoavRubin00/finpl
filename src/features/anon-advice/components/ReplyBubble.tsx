import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { AnonAdviceReply } from '../anonAdviceTypes';
import { AnonAvatar } from './AnonAvatar';
import { DUO } from '../../../constants/theme';

interface ReplyBubbleProps {
  reply: AnonAdviceReply;
  index?: number;
}

export function ReplyBubble({ reply, index = 0 }: ReplyBubbleProps): React.ReactElement {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 40).duration(220)}
      style={{
        marginHorizontal: 16,
        marginBottom: 10,
        backgroundColor: reply.isSelf ? DUO.blueSurface : '#ffffff',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: reply.isSelf ? DUO.blue : DUO.border,
        padding: 12,
      }}
    >
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 8 }}>
        <AnonAvatar alias={reply.alias} size={28} isSelf={reply.isSelf} />
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
    </Animated.View>
  );
}