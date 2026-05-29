import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Gamepad2 } from 'lucide-react-native';
import { useStockAnalystStore } from '../useStockAnalystStore';
import { tapHaptic } from '../../../utils/haptics';
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

// Expected wall-clock for deep analysis. Real range is 30-120s; 75s is the
// median we've seen in practice. The bar caps at 95% so we never falsely
// claim "done" — when `loading` flips false (revealPendingDeepCard) we jump
// to 100% with a quick 240ms tween.
const EXPECTED_DEEP_MS = 75_000;

interface Props {
  mode: AnalystMode;
  ticker: string;
}

/**
 * Friendly chat-bubble loading state with rotating status text. Deep mode
 * gets a longer rotation because Claude Opus 4.7 with extended thinking
 * legitimately takes 30-90 seconds.
 *
 * Deep mode also surfaces (a) a progress bar that fills over the expected
 * wait and (b) a "play a quick game" button that opens `WaitGameOverlay` —
 * both opt-in to make the long wait feel productive instead of empty.
 */
export function LoadingBubble({ mode, ticker }: Props): React.ReactElement {
  const [idx, setIdx] = useState(0);
  const messages = mode === 'deep' ? DEEP_MESSAGES : QUICK_MESSAGES;
  const dot = useSharedValue(0.3);
  const progress = useSharedValue(0);
  const loading = useStockAnalystStore((s) => s.loading);
  const pendingDeepCard = useStockAnalystStore((s) => s.pendingDeepCard);
  const openWaitOverlay = useStockAnalystStore((s) => s.openWaitOverlay);

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

  // Drive the progress bar — deep mode only. Glides to 95% over EXPECTED_DEEP_MS,
  // then jumps to 100% the moment the analysis lands (pending set OR loading off).
  useEffect(() => {
    if (mode !== 'deep') return;
    progress.value = withTiming(0.95, {
      duration: EXPECTED_DEEP_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [mode, progress]);

  useEffect(() => {
    if (mode !== 'deep') return;
    // Either analysis is done waiting for reveal (pendingDeepCard) OR a
    // non-deferred completion happened (loading=false). Either way: fill it.
    if (pendingDeepCard || !loading) {
      progress.value = withTiming(1, { duration: 240 });
    }
  }, [pendingDeepCard, loading, mode, progress]);

  const dotStyle = useAnimatedStyle(() => ({ opacity: dot.value }));
  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  const isReady = mode === 'deep' && !!pendingDeepCard;

  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: isReady ? '#86efac' : '#bae6fd',
        shadowColor: '#0369a1',
        shadowOpacity: 0.1,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
        <ExpoImage
          source={require('../../../../assets/webp/fin-tablet-1.webp')}
          style={{ width: 40, height: 40 }}
          contentFit="contain"
        />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[RTL, { color: '#0c4a6e', fontSize: 13, fontWeight: '800' }]}>
            {isReady ? `הניתוח של ${ticker} מוכן 🎯` : `בודק את ${ticker}`}
          </Text>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
            <Text style={[RTL, { color: '#475569', fontSize: 13, lineHeight: 19 }]}>
              {isReady ? 'לחץ על "הניתוח מוכן" כדי לראות.' : messages[idx]}
            </Text>
            {!isReady ? (
              <Animated.View
                style={[
                  dotStyle,
                  { width: 5, height: 5, borderRadius: 3, backgroundColor: '#0ea5e9' },
                ]}
              />
            ) : null}
          </View>
        </View>
      </View>

      {/* Deep mode: progress bar + optional "play a game" button. Hidden for
          quick mode where the wait is ~3s and adding chrome would just feel
          like noise. */}
      {mode === 'deep' ? (
        <>
          <View
            accessibilityLabel="התקדמות הניתוח"
            accessibilityRole="progressbar"
            style={{
              height: 4,
              borderRadius: 999,
              backgroundColor: 'rgba(186,230,253,0.5)',
              overflow: 'hidden',
              // RTL: anchor the growing fill to the right edge so the bar
              // grows from right→left as the analysis progresses. Matches the
              // Hebrew reading direction (and the project-wide RTL slider rule).
              flexDirection: 'row-reverse',
            }}
          >
            <Animated.View style={[barStyle, { height: '100%' }]}>
              <LinearGradient
                colors={isReady ? ['#22c55e', '#16a34a'] : ['#38bdf8', '#0369a1']}
                // Gradient direction also flipped — the bright stop now sits
                // on the right (the leading edge of the fill in RTL).
                start={{ x: 1, y: 0 }}
                end={{ x: 0, y: 0 }}
                style={{ flex: 1 }}
              />
            </Animated.View>
          </View>

          {!isReady ? (
            <Pressable
              onPress={() => {
                tapHaptic();
                openWaitOverlay();
              }}
              accessibilityRole="button"
              accessibilityLabel="שחק במשחק קצר בזמן ההמתנה"
              style={({ pressed }) => ({
                flexDirection: 'row-reverse',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 12,
                backgroundColor: 'rgba(14,165,233,0.10)',
                borderWidth: 1,
                borderColor: 'rgba(14,165,233,0.30)',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Gamepad2 size={16} color="#0369a1" strokeWidth={2.6} />
              <Text style={{ color: '#0369a1', fontWeight: '800', fontSize: 13 }}>
                🎮 שחק בינתיים
              </Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
