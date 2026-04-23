import { Text, Modal, StyleSheet, View, Pressable } from "react-native";
import { X } from "lucide-react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { AnimatedPressable } from "../../components/ui/AnimatedPressable";
import { useUpgradeModalStore } from "../../stores/useUpgradeModalStore";
import { heavyHaptic } from "../../utils/haptics";
import { BASIC_LIMITS, type GatedFeature } from "./useSubscriptionStore";

const FEATURE_INFO: Record<GatedFeature, { title: string; body: string }> = {
  simulator: {
    title: "הסימולטור, PRO בלבד",
    body: `משתמשי FREE מקבלים ${BASIC_LIMITS.simulator} הרצות יומיות.\nשדרג ל-PRO לגישה בלתי מוגבלת לכל הסימולציות.`,
  },
  arena: {
    title: "משחקי פיד, PRO בלבד",
    body: `משתמשי FREE מקבלים ${BASIC_LIMITS.arena} משחקים ברצף.\nשדרג ל-PRO למשחקי פיד בלתי מוגבלים + פרסים מוגדלים.`,
  },
  chat: {
    title: "צ'אט AI, הגעת למכסה",
    body: `משתמשי FREE מקבלים ${BASIC_LIMITS.chat} הודעות בצ'אט.\nשדרג ל-PRO לשיחות AI ללא הגבלה עם פינן.`,
  },
  aiInsights: {
    title: "AI Insights, PRO בלבד",
    body: "ניתוח השקעות מבוסס AI זמין לחברי PRO בלבד.\nשדרג כדי לפתוח תובנות מותאמות אישית.",
  },
  saved_items: {
    title: "פריטים שמורים, PRO בלבד",
    body: "שמירת שיעורים ותכנים לגישה מהירה זמינה לחברי PRO בלבד.\nשדרג כדי לשמור תכנים ללא הגבלה.",
  },
};

/** Standalone usage, must be placed once in app/_layout.tsx */
export function GlobalUpgradeModal() {
  const visible = useUpgradeModalStore((s) => s.visible);
  const feature = useUpgradeModalStore((s) => s.feature);
  const hide = useUpgradeModalStore((s) => s.hide);
  return (
    <UpgradeModal
      visible={visible}
      feature={feature ?? "simulator"}
      onDismiss={hide}
    />
  );
}

interface UpgradeModalProps {
  visible: boolean;
  feature: GatedFeature;
  onDismiss: () => void;
}

export function UpgradeModal({ visible, feature, onDismiss }: UpgradeModalProps) {
  const router = useRouter();

  const { title, body } = FEATURE_INFO[feature];

  return (
    <Modal transparent animationType="none" visible={visible} statusBarTranslucent onRequestClose={onDismiss} accessibilityViewIsModal>
      <Animated.View
        entering={FadeIn.duration(120)}
        exiting={FadeOut.duration(80)}
        style={styles.overlay}
      >
        <LinearGradient
          colors={["#0a2540", "#0e3a5c", "#0a2540"]}
          style={styles.card}
        >
          {/* Close button */}
          <Pressable onPress={onDismiss} style={styles.closeBtn} hitSlop={12} accessibilityLabel="סגור" accessibilityRole="button">
            <X size={20} color="#64748b" />
          </Pressable>

          {/* Crown */}
          <Text
            style={styles.crownEmoji}
            accessibilityElementsHidden
            importantForAccessibility="no"
            allowFontScaling={false}
          >👑</Text>

          {/* Title */}
          <Text style={styles.title} accessibilityRole="header">{title}</Text>

          {/* Body */}
          <Text style={styles.body}>{body}</Text>

          {/* PRO benefits row */}
          <View style={styles.benefitsRow}>
            {["👑 לבבות אינסופיים", "⚡ גישה מלאה", "🚫 ללא פרסומות"].map((b) => (
              <View key={b} style={styles.benefitChipWrap}>
                <Text style={styles.benefitChip}>{b}</Text>
              </View>
            ))}
          </View>

          {/* CTA */}
          <AnimatedPressable
            onPress={() => {
              heavyHaptic();
              onDismiss();
              router.push("/pricing" as never);
            }}
            style={styles.cta}
            accessibilityRole="button"
            accessibilityLabel="שדרג ל-PRO"
          >
            <LinearGradient
              colors={["#0a2540", "#164e63", "#0a2540"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaText}>שדרג ל-PRO</Text>
            </LinearGradient>
          </AnimatedPressable>

          {/* Dismiss */}
          <AnimatedPressable onPress={onDismiss} style={styles.dismiss} accessibilityRole="button" accessibilityLabel="המשך מאיפה שהפסקתי">
            <Text style={styles.dismissText}>המשך מאיפה שהפסקתי</Text>
          </AnimatedPressable>
        </LinearGradient>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  card: {
    width: "100%",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(34,211,238,0.25)",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 28,
    alignItems: "center",
    shadowColor: "#22d3ee",
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },
  crownEmoji: {
    fontSize: 88,
    marginTop: 8,
    marginBottom: 8,
    textAlign: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 10,
    writingDirection: "rtl",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  body: {
    fontSize: 14,
    color: "#cbd5e1",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 16,
    writingDirection: "rtl",
  },
  benefitsRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginBottom: 20,
    width: "100%",
  },
  benefitChipWrap: {
    backgroundColor: "rgba(34,211,238,0.12)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(34,211,238,0.2)",
  },
  benefitChip: {
    color: "#22d3ee",
    fontSize: 12,
    fontWeight: "700",
  },
  cta: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#22d3ee",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  ctaGradient: {
    paddingVertical: 16,
    alignItems: "center",
  },
  ctaText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "900",
    writingDirection: "rtl",
  },
  closeBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  dismiss: {
    paddingVertical: 8,
  },
  dismissText: {
    color: "#64748b",
    fontSize: 13,
    writingDirection: "rtl",
  },
});
