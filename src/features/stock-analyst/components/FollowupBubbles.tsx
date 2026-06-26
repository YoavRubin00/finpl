import React from 'react';
import { View, Text } from 'react-native';
import { Image as ExpoImage } from 'expo-image';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

/** User-side follow-up question bubble — small grey pill on the right (RTL). */
export function FollowupQuestionBubble({ text }: { text: string }): React.ReactElement {
  return (
    <View style={{ flexDirection: 'row-reverse', justifyContent: 'flex-end' }}>
      <View
        style={{
          backgroundColor: '#1e293b',
          paddingHorizontal: 14,
          paddingVertical: 9,
          borderRadius: 16,
          borderBottomRightRadius: 4,
          maxWidth: '85%',
        }}
      >
        <Text
          style={[
            RTL,
            { color: '#f1f5f9', fontSize: 14, fontWeight: '600' },
          ]}
        >
          {text}
        </Text>
      </View>
    </View>
  );
}

/** Shark answer bubble — white card with tablet avatar. */
export function FollowupAnswerBubble({ text }: { text: string }): React.ReactElement {
  return (
    <View
      style={{
        flexDirection: 'row-reverse',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        borderBottomLeftRadius: 4,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#e0f2fe',
        shadowColor: '#0369a1',
        shadowOpacity: 0.1,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      <ExpoImage
        source={require('../../../../assets/webp/fin-tablet-1.webp')}
        style={{ width: 34, height: 34 }}
        contentFit="contain"
      />
      {/* flex:1 belongs on the WRAPPING View, not on the Text. In a row-reverse
          flexbox, `flex:1` on a Text mis-measures the wrapped height and CLIPS
          long answers (Yoav 2026-06-26: deep-report answer cut off, only the top
          shown). Same proven pattern as SharkCommentaryBlock. */}
      <View style={{ flex: 1 }}>
        <Text
          style={[
            RTL,
            {
              fontSize: 14,
              lineHeight: 22,
              color: '#0f172a',
            },
          ]}
        >
          {text}
        </Text>
      </View>
    </View>
  );
}

/** Compact typing-indicator bubble while the shark is composing an answer. */
export function FollowupLoadingBubble(): React.ReactElement {
  return (
    <View
      style={{
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        borderBottomLeftRadius: 4,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#e0f2fe',
      }}
    >
      <ExpoImage
        source={require('../../../../assets/webp/fin-tablet-1.webp')}
        style={{ width: 30, height: 30 }}
        contentFit="contain"
      />
      <Text style={[RTL, { color: '#64748b', fontSize: 13, fontStyle: 'italic' }]}>
        השארק מקליד…
      </Text>
    </View>
  );
}
