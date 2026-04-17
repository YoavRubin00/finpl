import React, { useEffect, useRef } from "react";
import { Modal, StyleSheet, Pressable, Dimensions, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
  Easing,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useAccessibleAnimation } from "../../hooks/useAccessibleAnimation";

interface SwipeableModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export function SwipeableModal({ visible, onClose, children }: SwipeableModalProps) {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const { animDuration, shouldAnimate } = useAccessibleAnimation();
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  useEffect(() => {
    if (visible) {
      // Soft, gentle rise — no overshoot, no snap.
      translateY.value = shouldAnimate
        ? withTiming(0, {
            duration: animDuration(420),
            easing: Easing.out(Easing.cubic),
          })
        : 0;
    } else {
      translateY.value = withTiming(SCREEN_HEIGHT, {
        duration: animDuration(280),
        easing: Easing.in(Easing.cubic),
      });
    }
  }, [visible]);

  const handleClose = () => {
    const dur = animDuration(260);
    translateY.value = withTiming(SCREEN_HEIGHT, {
      duration: dur,
      easing: Easing.in(Easing.cubic),
    });
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      onClose();
    }, dur);
  };

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > 150 || e.velocityY > 1000) {
        runOnJS(handleClose)();
      } else {
        translateY.value = withSpring(0, { damping: 24, stiffness: 140 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [0, SCREEN_HEIGHT / 2],
      [1, 0],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  return (
    <Modal visible={visible} transparent onRequestClose={onClose} accessibilityViewIsModal>
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="סגור חלון (או החלק מטה)"
        />
      </Animated.View>
      <View style={styles.contentContainer} pointerEvents="box-none">
        <GestureDetector gesture={panGesture}>
          <Animated.View style={animatedStyle}>
            {children}
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    zIndex: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "flex-end",
    zIndex: 2,
  },
});
