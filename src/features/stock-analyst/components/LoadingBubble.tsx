import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import type { AnalystMode } from '../types';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

const QUICK_MESSAGES = [
  'בודק את הציטוט האחרון…',
  'מסתכל על המגמה הקרובה…',
  'מסכם את התמונה…',
];

const DEEP_MESSAGES = [
  'מנתח דוחות כספיים…',
  'בודק מתחרים בסקטור…',
  'סוקר פעילות פנים ופטנטים…',
  'מחפש סיכונים נסתרים…',
  'מתכנן יעדי מחיר חינוכיים…',
  'מסכם את התמונה המלאה…',
];

interface Props {
  mode: AnalystMode;
  ticker: string;
}

/**
 * Friendly chat-bubble loading state with rotating status text. Deep mode
 * gets a longer rotation because Claude Opus 4.7 with extended thinking
 * legitimately takes 30-90 seconds.
 */
export function LoadingBubble({ mode, ticker }: Props): React.ReactElement {
  const [idx, setIdx] = useState(0);
  const messages = mode === 'deep' ? DEEP_MESSAGES : QUICK_MESSAGES;
  const dot = useSharedValue(0.3);

  useEffect(() => {
    const i = setInterval(() => {
      setIdx((v) => (v + 1) % messages.length);
    }, mode === 'deep' ? 5000 : 2000);
    return () => clearInterval(i);
  }, [mode, messages.length]);

  useEffect(() => {
    dot.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [dot]);

  const dotStyle = useAnimatedStyle(() => ({ opacity: dot.value }));

  return (
    <View
      style={{
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 12,
        borderWidth: 1,
        borderColor: '#bae6fd',
        shadowColor: '#0369a1',
        shadowOpacity: 0.1,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      <ExpoImage
        source={require('../../../../assets/webp/fin-tablet-1.webp')}
        style={{ width: 40, height: 40 }}
        contentFit="contain"
      />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[RTL, { color: '#0c4a6e', fontSize: 13, fontWeight: '800' }]}>
          בודק את {ticker}
        </Text>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
          <Text style={[RTL, { color: '#475569', fontSize: 13, lineHeight: 19 }]}>
            {messages[idx]}
          </Text>
          <Animated.View
            style={[
              dotStyle,
              { width: 5, height: 5, borderRadius: 3, backgroundColor: '#0ea5e9' },
            ]}
          />
        </View>
      </View>
    </View>
  );
}
