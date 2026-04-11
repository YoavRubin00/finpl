import { Modal, View, Pressable, Text, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Image as ExpoImage } from "expo-image";
import { X } from "lucide-react-native";
import { FINN_HAPPY } from "../retention-loops/finnMascotConfig";
import { useFunStore } from "../../stores/useFunStore";

interface FinnMailModalProps {
  visible: boolean;
  onClose: () => void;
}

export function FinnMailModal({ visible, onClose }: FinnMailModalProps) {
  const mailContent = useFunStore((s) => s.mailContent);
  const openMail = useFunStore((s) => s.openMail);

  const handleClose = () => {
    onClose();
  };

  // Mark mail as read when modal becomes visible
  if (visible && useFunStore.getState().hasUnreadMail) {
    openMail();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
      accessibilityViewIsModal
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose}>
          <Animated.View entering={FadeIn.duration(250)} style={styles.backdrop} />
        </Pressable>

        {/* Card */}
        <Animated.View
          entering={FadeInDown.duration(400).springify().damping(40).stiffness(200)}
          style={styles.card}
        >
          {/* Close button */}
          <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={12}>
            <X size={18} color="#64748b" />
          </Pressable>

          {/* Mail header image */}
          <ExpoImage
            source={require("../../../assets/IMAGES/fun/finn_mail.png")}
            style={{ width: "100%", height: 120, borderRadius: 16, marginBottom: 8 }}
            contentFit="cover"
          />

          {/* Finn avatar */}
          <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.avatarWrap}>
            <ExpoImage
              source={FINN_HAPPY} accessible={false}
              style={styles.avatar}
              contentFit="contain"
            />
          </Animated.View>

          {/* Title */}
          <Animated.View entering={FadeInDown.delay(150).duration(300)}>
            <Text style={styles.title}>דואר מקפטן שארק</Text>
          </Animated.View>

          {/* Joke — speech bubble style */}
          {mailContent?.joke ? (
            <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.speechBubble}>
              <Text style={styles.speechText}>{mailContent.joke}</Text>
              <View style={styles.speechTail} />
            </Animated.View>
          ) : null}

          {/* Fun fact — info card style */}
          {mailContent?.fact ? (
            <Animated.View entering={FadeInDown.delay(300).duration(300)} style={styles.factCard}>
              <Text style={styles.factLabel}>ידעת?</Text>
              <Text style={styles.factText}>{mailContent.fact}</Text>
            </Animated.View>
          ) : null}

          {/* Close CTA */}
          <Animated.View entering={FadeInDown.delay(400).duration(300)}>
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [
                styles.ctaBtn,
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              ]}
            >
              <Text style={styles.ctaBtnText}>סגור</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
  },
  card: {
    position: "absolute",
    backgroundColor: "#ffffff",
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    width: "85%",
    alignItems: "center",
    shadowColor: "#0c4a6e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
  },
  closeBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  avatarWrap: {
    marginBottom: 8,
  },
  avatar: {
    width: 100,
    height: 100,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0c4a6e",
    textAlign: "center",
    writingDirection: "rtl",
    marginBottom: 14,
  },
  speechBubble: {
    backgroundColor: "#f0f9ff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#bae6fd",
    paddingVertical: 14,
    paddingHorizontal: 18,
    width: "100%",
    marginBottom: 12,
    position: "relative",
  },
  speechText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0369a1",
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 22,
  },
  speechTail: {
    position: "absolute",
    top: -8,
    alignSelf: "center",
    left: "50%",
    marginLeft: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#bae6fd",
  },
  factCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 14,
    paddingHorizontal: 18,
    width: "100%",
    marginBottom: 16,
    gap: 4,
  },
  factLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0ea5e9",
    textAlign: "right",
    writingDirection: "rtl",
    letterSpacing: 0.3,
  },
  factText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#334155",
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 20,
  },
  ctaBtn: {
    backgroundColor: "#0ea5e9",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#0ea5e9",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#ffffff",
  },
});
