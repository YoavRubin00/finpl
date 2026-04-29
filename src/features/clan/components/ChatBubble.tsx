import React from 'react';
import { View, Text, Image } from 'react-native';
import Animated, { FadeInDown, SlideInRight } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { CLAN } from '../../../constants/theme';
import type { ClanChatTextMessage } from '../clanTypes';

interface ChatBubbleProps {
  message: ClanChatTextMessage;
  isSelf: boolean;
}

function formatTime(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

export function ChatBubble({ message, isSelf }: ChatBubbleProps): React.ReactElement {
  const entering = isSelf
    ? FadeInDown.duration(160)
    : SlideInRight.duration(220);

  return (
    <Animated.View
      entering={entering}
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
          width: 30,
          height: 30,
          borderRadius: 15,
          backgroundColor: 'rgba(255,255,255,0.1)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {message.authorAvatar === '🦈' ? (
          <Image
            source={require('../../../../assets/webp/fin-standard.webp')}
            style={{ width: 22, height: 22 }}
            resizeMode="contain"
          />
        ) : (
          <Text style={{ fontSize: 16 }}>{message.authorAvatar}</Text>
        )}
      </View>

      <View style={{ maxWidth: '72%', alignItems: isSelf ? 'flex-end' : 'flex-start' }}>
        {/* Name */}
        {!isSelf && (
          <Text
            style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.5)',
              marginBottom: 2,
              marginHorizontal: 4,
              writingDirection: 'rtl',
              textAlign: 'right',
            }}
          >
            {message.authorName}
          </Text>
        )}

        {/* Bubble */}
        {isSelf ? (
          <LinearGradient
            colors={CLAN.ownBubble}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 16,
              borderBottomEndRadius: 4,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text
              style={{
                color: '#0a1628',
                fontSize: 14,
                fontWeight: '600',
                writingDirection: 'rtl',
                textAlign: 'right',
              }}
            >
              {message.body}
            </Text>
          </LinearGradient>
        ) : (
          <View
            style={{
              backgroundColor: CLAN.otherBubble,
              borderRadius: 16,
              borderBottomStartRadius: 4,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <Text
              style={{
                color: '#ffffff',
                fontSize: 14,
                writingDirection: 'rtl',
                textAlign: 'right',
              }}
            >
              {message.body}
            </Text>
          </View>
        )}

        {/* Timestamp */}
        <Text
          style={{
            fontSize: 10,
            color: 'rgba(255,255,255,0.3)',
            marginTop: 2,
            marginHorizontal: 4,
          }}
        >
          {formatTime(message.sentAt)}
        </Text>
      </View>
    </Animated.View>
  );
}
