import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useEconomyStore } from "../economy/useEconomyStore";
import { FINN_EMPATHIC } from "../retention-loops/finnMascotConfig";
import { successHaptic } from "../../utils/haptics";

interface StreakFreezeSaveModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export function StreakFreezeSaveModal({ visible, onDismiss }: StreakFreezeSaveModalProps) {
  const router = useRouter();
  const streakFreezes = useEconomyStore((s) => s.streakFreezes);

  const handleContinue = () => {
    successHaptic();
    onDismiss();
  };

  const handleBuyMore = () => {
    onDismiss();
    router.push("/shop" as never);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Animated.View entering={FadeIn.duration(300)} style={styles.content}>
            {/* Finn empathic */}
            <ExpoImage
              source={FINN_EMPATHIC}
              style={styles.finn}
              contentFit="contain"
              accessible={false}
            />

            {/* Title */}
            <Animated.Text
              entering={FadeInDown.delay(100).duration(300)}
              style={styles.title}
            >
              Finn הציל לך את הרצף 🥶❄️
            </Animated.Text>

            {/* Subtitle */}
            <Text style={styles.subtitle}>
              עכשיו נשארו לך {streakFreezes} מגיני רצף. שמור אותם טוב.
            </Text>

            {/* Primary CTA */}
            <Pressable onPress={handleContinue} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>המשך ללמוד</Text>
            </Pressable>

            {/* Secondary CTA */}
            <Pressable onPress={handleBuyMore} style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>קנה עוד מגינים</Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  sheet: {
    width: "85%",
    maxWidth: 340,
  },
  content: {
    backgroundColor: "#0f172a",
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#38bdf8",
    padding: 28,
    alignItems: "center",
  },
  finn: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#e0f2fe",
    textAlign: "center",
    writingDirection: "rtl" as const,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#94a3b8",
    textAlign: "center",
    writingDirection: "rtl" as const,
    lineHeight: 22,
    marginBottom: 24,
  },
  primaryBtn: {
    width: "100%",
    backgroundColor: "#0ea5e9",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
    borderBottomWidth: 3,
    borderBottomColor: "#0284c7",
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
    writingDirection: "rtl" as const,
  },
  secondaryBtn: {
    width: "100%",
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#38bdf8",
    writingDirection: "rtl" as const,
  },
});
