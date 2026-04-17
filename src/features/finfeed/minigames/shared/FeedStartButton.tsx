import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInUp, useReducedMotion } from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { heavyHaptic } from '../../../../utils/haptics';

const RTL_CENTER = { writingDirection: 'rtl' as const, textAlign: 'center' as const };

const LOTTIE_ROCKET = require('../../../../../assets/lottie/wired-flat-489-rocket-space-hover-flying.json');

interface Props {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
}

export function FeedStartButton({ label, onPress, accessibilityLabel, disabled = false }: Props) {
  const reduceMotion = useReducedMotion();
  const handlePress = () => {
    heavyHaptic();
    onPress();
  };

  return (
    <Animated.View
      entering={FadeInUp.duration(360).delay(60)}
      style={{ alignSelf: 'stretch', marginTop: 12, marginBottom: 10 }}
    >
      <View style={{ position: 'relative', alignItems: 'stretch' }}>
        {/* 3D depth shadow layer */}
        <View
          style={{
            position: 'absolute',
            top: 6,
            left: 0,
            right: 0,
            bottom: -6,
            borderRadius: 16,
            backgroundColor: disabled ? '#64748b' : '#0369a1',
            opacity: disabled ? 0.5 : 1,
          }}
          pointerEvents="none"
        />

        <Pressable
          onPress={handlePress}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? label}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={({ pressed }) => ({
            flexDirection: 'row-reverse',
            alignSelf: 'stretch',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            borderRadius: 16,
            backgroundColor: disabled ? '#94a3b8' : '#0ea5e9',
            paddingHorizontal: 24,
            paddingVertical: 16,
            shadowColor: '#0284c7',
            shadowOpacity: 0.55,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 4 },
            elevation: 10,
            transform: pressed && !disabled ? [{ translateY: 2 }] : [],
            opacity: disabled ? 0.75 : 1,
          })}
        >
          <View
            style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}
            accessible={false}
          >
            <LottieView
              source={LOTTIE_ROCKET}
              style={{ width: 28, height: 28 }}
              resizeMode="contain"
              autoPlay={!reduceMotion}
              loop={!reduceMotion}
            />
          </View>
          <Text
            style={[RTL_CENTER, {
              fontSize: 18,
              fontWeight: '900',
              color: '#ffffff',
              lineHeight: 22,
              includeFontPadding: false,
            }]}
            numberOfLines={1}
            allowFontScaling={false}
          >
            {label}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}
