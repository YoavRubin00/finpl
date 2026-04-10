import { View, Text, Pressable, StyleSheet, Modal , Image } from "react-native";
import { Image as ExpoImage } from "expo-image";
import LottieView from "lottie-react-native";
import { useRouter } from "expo-router";
import { FINN_STANDARD } from "../retention-loops/finnMascotConfig";
import { useAuthStore } from "./useAuthStore";

interface GuestProgressGateProps {
  visible: boolean;
  onClose: () => void;
}

/** Modal shown when a guest tries to access a blocked feature */
export function GuestProgressGate({ visible, onClose }: GuestProgressGateProps) {
  const router = useRouter();

  function handleRegister() {
    onClose();
    router.push("/(auth)/register" as never);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ExpoImage source={FINN_STANDARD} accessible={false}
            style={styles.finn} contentFit="contain" />

          <Text style={styles.title} accessibilityRole="header">רוצה להמשיך?</Text>
          <Text style={styles.sub}>
            הירשם כדי לשמור את ההתקדמות שלך ולפתוח את כל הפיצ'רים!
          </Text>

          <Pressable onPress={handleRegister} style={styles.registerBtn} accessibilityRole="button" accessibilityLabel="הירשם בחינם">
            <Text style={styles.registerText}>הירשם בחינם</Text>
          </Pressable>

          <Pressable onPress={onClose} style={styles.laterBtn} accessibilityRole="button" accessibilityLabel="אחר כך" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.laterText}>אחר כך</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/** Hook to check guest status and show gate */
export function useGuestGate() {
  const isGuest = useAuthStore((s) => s.isGuest);
  return { isGuest };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#18181b",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#27272a",
    padding: 28,
    alignItems: "center",
  },
  finn: {
    width: 160,
    height: 160,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 8,
  },
  sub: {
    fontSize: 14,
    fontWeight: "500",
    color: "#71717a",
    textAlign: "center",
    writingDirection: "rtl" as const,
    lineHeight: 22,
    marginBottom: 24,
  },
  registerBtn: {
    width: "100%",
    backgroundColor: "#7c3aed",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 12,
  },
  registerText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#ffffff",
  },
  laterBtn: {
    paddingVertical: 10,
  },
  laterText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#52525b",
  },
});
