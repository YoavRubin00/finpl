import React, { useEffect, useRef } from 'react';
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

const SOURCES: Record<SharkExpression, number> = {
  'idle': require('../../../../assets/webp/fin-standard.webp'),
  'listening': require('../../../../assets/webp/fin-empathic.webp'),
  'thinking': require('../../../../assets/webp/fin-tablet-1.webp'),
  'talking-1': require('../../../../assets/webp/fin-talking-1.webp'),
  'talking-2': require('../../../../assets/webp/fin-hello.webp'),
  'talking-3': require('../../../../assets/webp/fin-happy.webp'),
  'empathic': require('../../../../assets/webp/fin-empathic.webp'),
  'victory': require('../../../../assets/webp/fin-victory.webp'),
};

const GLOW_BY_STATUS: Record<string, string> = {
  idle: DUO.blueSurface,
  connecting: DUO.blueSurface,
  listening: '#86efac', // green-300
  thinking: '#fde68a', // amber-200
  speaking: '#fdba74', // orange-300
  error: '#fca5a5', // red-300
};

interface SharkAvatarProps {
  size?: number;
}

export function SharkAvatar({ size = 280 }: SharkAvatarProps): React.ReactElement {
  const expression = useSharkAvatarState();
  const status = useSharkVoiceStore((s) => s.status);

  const previousExpression = useRef<SharkExpression>(expression);
  const layerA = useSharedValue(1);
  const layerB = useSharedValue(0);
  const showA = useRef(true);
  const sourceA = useRef(SOURCES[expression]);
  const sourceB = useRef(SOURCES[expression]);

  const pulse = useSharedValue(1);

  useEffect(() => {
    if (status === 'listening' || status === 'speaking') {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.04, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      pulse.value = withTiming(1, { duration: 250 });
    }
  }, [status, pulse]);

  useEffect(() => {
    if (expression === previousExpression.current) return;
    previousExpression.current = expression;
    if (showA.current) {
      sourceB.current = SOURCES[expression];
      layerB.value = withTiming(1, { duration: 250 });
      layerA.value = withTiming(0, { duration: 250 });
    } else {
      sourceA.current = SOURCES[expression];
      layerA.value = withTiming(1, { duration: 250 });
      layerB.value = withTiming(0, { duration: 250 });
    }
    showA.current = !showA.current;
  }, [expression, layerA, layerB]);

  const animatedA = useAnimatedStyle(() => ({ opacity: layerA.value }));
  const animatedB = useAnimatedStyle(() => ({ opacity: layerB.value }));
  const animatedScale = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const glowColor = GLOW_BY_STATUS[status] ?? DUO.blueSurface;

  return (
    <Animated.View style={[{ width: size, height: size }, animatedScale]}>
      <View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: glowColor,
            borderRadius: size / 2,
            opacity: 0.35,
            transform: [{ scale: 1.1 }],
          },
        ]}
      />
      <Animated.View style={[StyleSheet.absoluteFillObject, animatedA]} pointerEvents="none">
        <ExpoImage source={sourceA.current} style={{ width: size, height: size }} contentFit="contain" />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFillObject, animatedB]} pointerEvents="none">
        <ExpoImage source={sourceB.current} style={{ width: size, height: size }} contentFit="contain" />
      </Animated.View>
    </Animated.View>
  );
}
