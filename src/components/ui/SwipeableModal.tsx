import React, { useEffect } from "react";
import { Modal, View, StyleSheet, Pressable, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
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

  useEffect(() => {
    if (visible) {
      translateY.value = shouldAnimate
        ? withSpring(0, { damping: 20, stiffness: 200 })
        : 0;
    } else {
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: animDuration(300) });
    }
  }, [visible]);

  const handleClose = () => {
    const dur = animDuration(250);
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: dur });
    setTimeout(() => {
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
        translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
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
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.contentContainer, animatedStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
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
