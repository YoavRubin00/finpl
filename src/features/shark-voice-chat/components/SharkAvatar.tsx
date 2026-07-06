import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useSharkAvatarState, type SharkExpression } from '../hooks/useSharkAvatarState';
import { useSharkVoiceStore } from '../useSharkVoiceStore';
import { DUO } from '../../../constants/theme';

// Purpose-built live-call loops (Higgsfield Seedance → chroma-key, 2026-06-21).
// The shark's mouth genuinely moves in the talking loops so the call feels live.
// ONE talking loop (`talking-1`) is held for the entire reply — no mid-turn
// cycling (Yoav 2026-07-06); talking-2/3 stay mapped only so the type is total.
const SOURCES: Record<SharkExpression, number> = {
  'idle': require('../../../../assets/webp/shark-call-listening.webp'),
  'listening': require('../../../../assets/webp/shark-call-listening.webp'),
  'thinking': require('../../../../assets/webp/shark-call-thinking.webp'),
  'talking-1': require('../../../../assets/webp/shark-call-talking-1.webp'),
  'talking-2': require('../../../../assets/webp/shark-call-talking-2.webp'),
  'talking-3': require('../../../../assets/webp/shark-call-talking-3.webp'),
  'empathic': require('../../../../assets/webp/shark-call-listening.webp'),
  'victory': require('../../../../assets/webp/fin-victory.webp'),
};

const GLOW_BY_STATUS: Record<string, string> = {
  idle: DUO.blueSurface,
  connecting: DUO.blueSurface,
  listening: '#86efac',
  thinking: '#fde68a',
  speaking: '#fdba74',
  error: '#fca5a5',
};

interface SharkAvatarProps {
  size?: number;
}

export function SharkAvatar({ size = 280 }: SharkAvatarProps): React.ReactElement {
  const expression = useSharkAvatarState();
  const status = useSharkVoiceStore((s) => s.status);

  const [layerASource, setLayerASource] = useState<number>(SOURCES[expression]);
  const [layerBSource, setLayerBSource] = useState<number>(SOURCES[expression]);
  const showALayerRef = useRef(true);
  const prevExpressionRef = useRef<SharkExpression>(expression);

  const layerAOpacity = useSharedValue(1);
  const layerBOpacity = useSharedValue(0);
  const pulse = useSharedValue(1);

  // Cross-fade between two image layers whenever the expression changes —
  // putting sources in useState (instead of refs) forces ExpoImage to
  // re-render with the new source while the opacity animation plays.
  useEffect(() => {
    if (expression === prevExpressionRef.current) return;
    prevExpressionRef.current = expression;
    const nextSource = SOURCES[expression];
    if (showALayerRef.current) {
      setLayerBSource(nextSource);
      layerBOpacity.value = withTiming(1, { duration: 250 });
      layerAOpacity.value = withTiming(0, { duration: 250 });
    } else {
      setLayerASource(nextSource);
      layerAOpacity.value = withTiming(1, { duration: 250 });
      layerBOpacity.value = withTiming(0, { duration: 250 });
    }
    showALayerRef.current = !showALayerRef.current;
  }, [expression, layerAOpacity, layerBOpacity]);

  // Subtle pulse while actively listening or speaking
  useEffect(() => {
    const active = status === 'listening' || status === 'speaking';
    pulse.value = active
      ? withRepeat(
          withSequence(
            withTiming(1.05, { duration: 700, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          false,
        )
      : withTiming(1, { duration: 300 });
  }, [status, pulse]);

  const animatedA = useAnimatedStyle(() => ({ opacity: layerAOpacity.value }));
  const animatedB = useAnimatedStyle(() => ({ opacity: layerBOpacity.value }));
  const animatedScale = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const glowColor = GLOW_BY_STATUS[status] ?? DUO.blueSurface;

  return (
    <Animated.View style={[{ width: size, height: size }, animatedScale]}>
      {/* Soft glow behind the shark */}
      <View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: glowColor,
            borderRadius: size / 2,
            opacity: 0.32,
            transform: [{ scale: 1.08 }],
          },
        ]}
      />
      {/* Zoom + downward shift: the source WebPs have generous whitespace
          padding above the captain's head. Scaling the image up by 1.22 and
          nudging it down ~12px brings the face into the visual center of
          the avatar circle without changing the outer container size. The
          parent clips the overflow via the wrapping View. */}
      <Animated.View
        style={[StyleSheet.absoluteFillObject, animatedA, styles.imageClip]}
        pointerEvents="none"
      >
        <ExpoImage
          source={layerASource}
          style={[styles.imageInner, { width: size, height: size }]}
          contentFit="contain"
        />
      </Animated.View>
      <Animated.View
        style={[StyleSheet.absoluteFillObject, animatedB, styles.imageClip]}
        pointerEvents="none"
      >
        <ExpoImage
          source={layerBSource}
          style={[styles.imageInner, { width: size, height: size }]}
          contentFit="contain"
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  imageClip: {
    overflow: 'visible',
  },
  imageInner: {
    // The shark-call WebPs already frame the captain large and centered, so
    // only a gentle fill is needed (the old 1.22/+14 was tuned for the older
    // fin-*.webp loops that carried lots of head-room whitespace).
    transform: [{ scale: 1.05 }],
  },
});
