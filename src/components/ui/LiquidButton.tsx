import React, { useState } from 'react';
import { View, Pressable, StyleSheet, StyleProp, ViewStyle, LayoutChangeEvent } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { tapHaptic } from '../../utils/haptics';
import { useAccessibleAnimation } from '../../hooks/useAccessibleAnimation';

interface LiquidButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  color: string;
  disabled?: boolean;
}

export function LiquidButton({ onPress, children, style, color, disabled }: LiquidButtonProps) {
  const contentScale = useSharedValue(1);
  const rippleScale = useSharedValue(0);
  const rippleOpacity = useSharedValue(0);
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const { shouldAnimate, animDuration } = useAccessibleAnimation();

  const handlePressIn = () => {
    if (disabled || !shouldAnimate) return;

    // Scale down the button slightly
    contentScale.value = withSpring(0.96, { damping: 20, stiffness: 200 });

    // Fire the liquid ripple
    rippleScale.value = 0.1;
    rippleOpacity.value = 0.4;
    rippleScale.value = withTiming(3, { duration: animDuration(600) });
    rippleOpacity.value = withTiming(0, { duration: animDuration(600) });
  };

  const handlePressOut = () => {
    if (disabled || !shouldAnimate) return;
    // Scale back up
    contentScale.value = withSpring(1, { damping: 20, stiffness: 200 });
  };

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: contentScale.value }],
  }));

  const rippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rippleScale.value }],
    opacity: rippleOpacity.value,
  }));

  const maxDim = Math.max(layout.width, layout.height);
  const rippleSize = maxDim > 0 ? maxDim : 100; // fallback if layout not yet fired

  return (
    <Animated.View style={containerStyle}>
      <Pressable
        onPress={() => {
          if (!disabled) {
            tapHaptic();
            onPress();
          }
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLayout={(e: LayoutChangeEvent) => {
           setLayout({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });
        }}
        style={[
           styles.innerButton,
           { backgroundColor: color },
           style,
           disabled && { opacity: 0.6 }
        ]}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled }}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ripple,
            { 
               backgroundColor: '#ffffff', 
               width: rippleSize, 
               height: rippleSize, 
               borderRadius: rippleSize / 2,
               // Center the ripple inside the button
               left: (layout.width - rippleSize) / 2,
               top: (layout.height - rippleSize) / 2,
            },
            rippleStyle
          ]}
        />
        <View style={styles.content}>
          {children}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  innerButton: {
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  ripple: {
    position: 'absolute',
  },
  content: {
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  }
});
