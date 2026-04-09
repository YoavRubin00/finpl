import { useEffect } from "react";
import { Image as ExpoImage } from "expo-image";
import { Text, Image, Modal, Pressable, StyleSheet, ImageSourcePropType } from "react-native";
import Animated, { FadeIn, FadeOut, SlideInUp, SlideOutDown } from "react-native-reanimated";
import LottieView from "lottie-react-native";
import { FINN_STANDARD } from "../../features/retention-loops/finnMascotConfig";

interface TransitionOverlayProps {
  visible: boolean;
  message: string;
  onDismiss: () => void;
  autoNavigateMs?: number;
  /** Optional image displayed below the message text */
  image?: ImageSourcePropType;
}

export function TransitionOverlay({
  visible,
  message,
  onDismiss,
  autoNavigateMs = 2500,
  image,
}: TransitionOverlayProps) {
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onDismiss, autoNavigateMs);
    return () => clearTimeout(timer);
  }, [visible, onDismiss, autoNavigateMs]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
      accessibilityViewIsModal={true}
      accessibilityLabel="מעבר בין מסכים"
    >
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessibilityRole="button" accessibilityLabel="סגור" />
        <Animated.View entering={SlideInUp.duration(400)} exiting={SlideOutDown.duration(200)} style={styles.card}>
          <ExpoImage source={FINN_STANDARD} style={{ width: 144, height: 144 }} contentFit="contain" />
          <Text style={styles.message}>{message}</Text>
          {image && (
            <Image source={image} style={styles.heroImage} resizeMode="cover" />
          )}
          <Pressable onPress={onDismiss} style={styles.goBtn} accessibilityRole="button" accessibilityLabel="יאללה!">
            <Text style={styles.goBtnText}>יאללה!</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#f0f9ff",
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 24,
    marginHorizontal: 32,
    alignItems: "center",
    gap: 14,
    borderWidth: 1.5,
    borderColor: "rgba(14,165,233,0.3)",
    shadowColor: "#0ea5e9",
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  message: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0c4a6e",
    textAlign: "center",
    writingDirection: "rtl",
    lineHeight: 26,
  },
  goBtn: {
    backgroundColor: "#0ea5e9",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 36,
    marginTop: 4,
  },
  goBtnText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#fff",
  },
  heroImage: {
    width: 130,
    height: 110,
    borderRadius: 16,
  },
});
