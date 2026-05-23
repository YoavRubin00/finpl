import React, { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight, Clock } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { tapHaptic } from '../../../utils/haptics';

const RTL = { writingDirection: 'rtl' as const };

interface Props {
  loading: boolean;
  onOpenHistory: () => void;
  historyCount?: number;
}

/**
 * Polished top bar matching the mockup:
 *   ←  ⋯           [קפטן שארק 🦈 AI · מחובר 🟢]
 * Centered title block with status pill, framed by minimal nav controls.
 */
export function SharkTabletHeader({ loading, onOpenHistory, historyCount = 0 }: Props): React.ReactElement {
  const dot = useSharedValue(1);

  useEffect(() => {
    dot.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [dot]);

  const dotStyle = useAnimatedStyle(() => ({ opacity: dot.value }));

  const handleClose = () => {
    tapHaptic();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/tools' as never);
    }
  };

  return (
    <View
      style={{
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 10,
      }}
    >
      {/* RTL right (visually right): centered title block — actually placed
          in the middle by using flex space-between with two side buttons */}
      <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
          <Text style={[RTL, { color: '#ffffff', fontSize: 16, fontWeight: '900' }]}>
            קפטן שארק
          </Text>
          <View
            style={{
              backgroundColor: '#fde68a',
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 6,
            }}
          >
            <Text style={{ color: '#78350f', fontSize: 9, fontWeight: '900' }}>AI ✨</Text>
          </View>
        </View>
        <View
          style={{
            flexDirection: 'row-reverse',
            alignItems: 'center',
            gap: 6,
            backgroundColor: 'rgba(34,197,94,0.18)',
            paddingHorizontal: 10,
            paddingVertical: 3,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: 'rgba(34,197,94,0.4)',
          }}
        >
          <Animated.View
            style={[
              dotStyle,
              { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
            ]}
          />
          <Text style={{ color: '#86efac', fontSize: 11, fontWeight: '700' }}>
            {loading ? 'מנתח…' : 'מחובר'}
          </Text>
        </View>
      </View>

      {/* RTL convention: back button sits on the visually-right side (the
          natural "back" direction for RTL text). The 'more' menu goes left. */}
      <View
        style={{
          position: 'absolute',
          right: 14,
          top: 10,
        }}
      >
        <Pressable
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="חזרה"
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: 'rgba(255,255,255,0.1)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronRight size={20} color="#cbd5e1" />
        </Pressable>
      </View>
      <View
        style={{
          position: 'absolute',
          left: 14,
          top: 10,
        }}
      >
        <Pressable
          onPress={() => { tapHaptic(); onOpenHistory(); }}
          accessibilityRole="button"
          accessibilityLabel={`היסטוריית ניתוחים (${historyCount})`}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: 'rgba(255,255,255,0.1)',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <Clock size={18} color="#cbd5e1" />
          {historyCount > 0 ? (
            <View
              style={{
                position: 'absolute',
                top: -3,
                left: -3,
                minWidth: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: '#0ea5e9',
                paddingHorizontal: 5,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: '#0b1735',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>
                {historyCount > 99 ? '99+' : historyCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}
