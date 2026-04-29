import React from 'react';
import { View, Text } from 'react-native';
import type { ClanChatSystemMessage } from '../clanTypes';

interface ChatSystemMessageProps {
  message: ClanChatSystemMessage;
}

export function ChatSystemMessage({ message }: ChatSystemMessageProps): React.ReactElement {
  return (
    <View
      style={{
        alignItems: 'center',
        marginVertical: 6,
        marginHorizontal: 24,
      }}
    >
      <View
        style={{
          backgroundColor: 'rgba(255,255,255,0.06)',
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 4,
        }}
      >
        <Text
          style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.45)',
            textAlign: 'center',
            writingDirection: 'rtl',
          }}
        >
          {message.body}
        </Text>
      </View>
    </View>
  );
}
