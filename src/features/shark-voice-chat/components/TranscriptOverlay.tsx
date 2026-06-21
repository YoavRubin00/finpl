import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useSharkVoiceStore } from '../useSharkVoiceStore';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'center' as const };

/** Three pulsing dots used for "connecting…" / "thinking…" states. */
function AnimatedDots(): React.ReactElement {
  const a = useSharedValue(0.3);
  const b = useSharedValue(0.3);
  const c = useSharedValue(0.3);

  useEffect(() => {
    const cycle = (sv: ReturnType<typeof useSharedValue<number>>, delay: number) => {
      setTimeout(() => {
        sv.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.3, { duration: 400, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          false,
        );
      }, delay);
    };
    cycle(a, 0);
    cycle(b, 150);
    cycle(c, 300);
  }, [a, b, c]);

  const styleA = useAnimatedStyle(() => ({ opacity: a.value }));
  const styleB = useAnimatedStyle(() => ({ opacity: b.value }));
  const styleC = useAnimatedStyle(() => ({ opacity: c.value }));

  const Dot = ({ style }: { style: ReturnType<typeof useAnimatedStyle> }) => (
    <Animated.View
      style={[
        {
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: '#cbd5e1',
          marginHorizontal: 3,
        },
        style,
      ]}
    />
  );

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
      <Dot style={styleA} />
      <Dot style={styleB} />
      <Dot style={styleC} />
    </View>
  );
}

export function TranscriptOverlay(): React.ReactElement {
  const userTranscript = useSharkVoiceStore((s) => s.userTranscript);
  const sharkText = useSharkVoiceStore((s) => s.sharkText);
  const status = useSharkVoiceStore((s) => s.status);

  const statusLine = (() => {
    switch (status) {
      case 'connecting':
        return 'מתחבר…';
      case 'listening':
        return 'אני מקשיב';
      case 'thinking':
        return null; // show animated dots instead
      case 'speaking':
        return null;
      case 'error':
        return 'משהו השתבש';
      default:
        return 'מוכן לשיחה';
    }
  })();

  const showDots = status === 'thinking' || status === 'connecting';

  return (
    <View
      style={{
        paddingHorizontal: 24,
        gap: 10,
        minHeight: 96,
        justifyContent: 'center',
      }}
    >
      {userTranscript ? (
        <Text
          numberOfLines={2}
          style={[
            RTL,
            { color: '#94a3b8', fontSize: 14, fontWeight: '500' },
          ]}
        >
          {'⁧' + userTranscript + '⁩'}
        </Text>
      ) : null}

      {sharkText && status !== 'thinking' ? (
        <Text
          numberOfLines={3}
          style={[
            RTL,
            { color: '#ffffff', fontSize: 18, fontWeight: '600', lineHeight: 26 },
          ]}
        >
          {'⁧' + sharkText + '⁩'}
        </Text>
      ) : showDots ? (
        <AnimatedDots />
      ) : statusLine ? (
        <Text
          style={[
            RTL,
            { color: '#cbd5e1', fontSize: 16, fontWeight: '500' },
          ]}
        >
          {statusLine}
        </Text>
      ) : null}
    </View>
  );
}
