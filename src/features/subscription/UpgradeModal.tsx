import { useEffect, useRef } from "react";
import { Text, Modal, StyleSheet, View, Pressable } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { X, Heart, Zap, Ban, ChevronLeft, type LucideIcon } from "lucide-react-native";
import Animated, { FadeIn, FadeOut, FadeInUp } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { AnimatedPressable } from "../../components/ui/AnimatedPressable";
import { FINN_HAPPY } from "../retention-loops/finnMascotConfig";
import { useUpgradeModalStore } from "../../stores/useUpgradeModalStore";
import { heavyHaptic } from "../../utils/haptics";
import { track } from "../../lib/analytics/events";
import { BASIC_LIMITS, PRO_LIMITS, type GatedFeature } from "./subscriptionConstants";

const FEATURE_INFO: Record<GatedFeature, { title: string; body: string }> = {
  simulator: {
    title: "הסימולטור, PRO בלבד",
    body: `משתמשי FREE מקבלים ${BASIC_LIMITS.simulator} הרצות יומיות.\nשדרגו ל-PRO לגישה בלתי מוגבלת לכל הסימולציות.`,
  },
  arena: {
    title: "משחקי פיד, PRO בלבד",
    body: `משתמשי FREE מקבלים ${BASIC_LIMITS.arena} משחקים ברצף.\nשדרגו ל-PRO למשחקי פיד בלתי מוגבלים + פרסים מוגדלים.`,
  },
  chat: {
    title: "צ'אט AI, הגעתם למכסה",
    body: `משתמשי FREE מקבלים ${BASIC_LIMITS.chat} הודעות בצ'אט.\nשדרגו ל-PRO לשיחות AI ללא הגבלה עם קפטן שארק.`,
  },
  aiInsights: {
    title: "תובנות AI, הגעתם למכסה החודשית",
    body: `ב‑Free יש לכם ${BASIC_LIMITS.aiInsights} תובנה אמיתית בחודש.\nב‑PRO תובנות מותאמות אישית ללא הגבלה — חדשות כל שבוע.`,
  },
  saved_items: {
    title: "פריטים שמורים, PRO בלבד",
    body: "שמירת שיעורים ותכנים לגישה מהירה זמינה לחברי PRO בלבד.\nשדרגו כדי לשמור תכנים ללא הגבלה.",
  },
  "breaking-news": {
    title: "תיבת הבונוס של ה‑Pro",
    body: "הצפת האקטואליה הפיננסית פתוחה לכולם. תיבת הבונוס היומית עם XP ומטבעות נוספים שמורה לחברי PRO.\nשדרגו כדי לפתוח אותה כל יום.",
  },
  "shark-voice": {
    title: "שיחת קול עם קפטן שארק, PRO בלבד",
    body: "ב‑Free יש לכם דקת ניסיון אחת. ב‑PRO מקבלים עד 10 דקות שיחה ביום עם קפטן שארק על כל דבר פיננסי.",
  },
  "analyst-quick": {
    title: "אנליסט מניות מהיר, הגעתם למכסה היומית",
    body: `ב‑Free מקבלים ${BASIC_LIMITS["analyst-quick"]} ניתוחים מהירים ביום.\nב‑PRO ניתוחים ללא הגבלה — כל מניה, כל שאלה.`,
  },
  "analyst-deep": {
    title: "ניתוח עומק AI, הגעתם למכסה השבועית",
    body: `ב‑Free מקבלים ${BASIC_LIMITS["analyst-deep"]} ניתוח עומק בשבוע, כולל follow-up, מצגי תזרים ובדיקות שווי.\nב‑PRO מקבלים ${PRO_LIMITS["analyst-deep"]} בשבוע — פי 5.`,
  },
  payslip: {
    title: "ניתוח תלוש שכר, הגעתם למכסה החודשית",
    body: `ב‑Free מקבלים ${BASIC_LIMITS.payslip} ניתוח תלוש בחודש.\nב‑PRO תוכלו לנתח תלוש בכל פעם שתרצו — כל חודש, כל בונוס, כל שינוי במשרה.`,
  },
  "lesson-report": {
    title: "דוח סיכום שיעור, הגעתם למכסה השבועית",
    body: `ב‑Free מקבלים ${BASIC_LIMITS["lesson-report"]} דוח סיכום שיעור בשבוע.\nב‑PRO מקבלים דוח הבנה איכותי אחרי כל שיעור — עם נקודות לשיפור ושיחה עם קפטן שארק על הדוח.`,
  },
};

// PRO perks, icon-driven (no emojis) so the chips read as native app UI rather
// than a sticker row. lucide icons + sky-blue tint match the app's component set.
const PRO_BENEFITS: { Icon: LucideIcon; label: string }[] = [
  { Icon: Heart, label: "לבבות אינסופיים" },
  { Icon: Zap, label: "גישה מלאה" },
  { Icon: Ban, label: "ללא פרסומות" },
];

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

  // Track dismissal outcome so unmount doesn't fire pro_gate_dismissed when
  // the user actually pressed the CTA (which also calls onDismiss).
  const outcomeRef = useRef<'pending' | 'cta' | 'dismissed'>('pending');
  // Previous-visible guard. Without this, the useEffect below fires
  // `pro_gate_dismissed` on the initial mount (visible=false, outcomeRef
  // initialized to 'pending'), which inflated dismiss counts in PostHog and
  // made the funnel impossible to interpret. Only fire on a real true→false
  // transition.
  const prevVisibleRef = useRef(false);

  // Fire pro_gate_shown once per open. Without this, every Pro-gated tap
  // (locked sim, AI Insights, out-of-hearts) was invisible to PostHog.
  useEffect(() => {
    if (visible) {
      outcomeRef.current = 'pending';
      track({ name: 'pro_gate_shown', props: { feature } });
    } else if (prevVisibleRef.current && outcomeRef.current === 'pending') {
      // Modal closed without an explicit choice (back gesture, hardware back),
      // AND it was actually showing the moment before.
      track({ name: 'pro_gate_dismissed', props: { feature, via: 'system' } });
    }
    prevVisibleRef.current = visible;
  }, [visible, feature]);

  const handleDismiss = (via: 'close_x' | 'continue_text' | 'backdrop') => {
    outcomeRef.current = 'dismissed';
    track({ name: 'pro_gate_dismissed', props: { feature, via } });
    onDismiss();
  };

  const handleUpgrade = () => {
    outcomeRef.current = 'cta';
    track({ name: 'pro_gate_cta_clicked', props: { feature } });
    heavyHaptic();
    onDismiss();
    // Pass source so paywall_viewed on /pricing carries the originating
    // gate. The source breakdown in PostHog uses this property.
    router.push(`/pricing?source=pro_gate_${feature}` as never);
  };

  return (
    <Modal transparent animationType="none" visible={visible} statusBarTranslucent onRequestClose={onDismiss} accessibilityViewIsModal>
      <Animated.View
        entering={FadeIn.duration(140)}
        exiting={FadeOut.duration(100)}
        style={styles.overlay}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => handleDismiss('backdrop')}
          accessibilityLabel="סגור על ידי נגיעה ברקע"
          accessibilityRole="button"
        />
        <Animated.View entering={FadeInUp.duration(300)} style={styles.card}>
          {/* Close button */}
          <Pressable onPress={() => handleDismiss('close_x')} style={styles.closeBtn} hitSlop={12} accessibilityLabel="סגור" accessibilityRole="button">
            <X size={20} color="#0c4a6e" />
          </Pressable>

          {/* Captain Shark mascot — the app's CTA mascot, replaces the old crown emoji */}
          <ExpoImage
            source={FINN_HAPPY}
            style={styles.mascot}
            contentFit="contain"
            accessible={false}
            pointerEvents="none"
          />

          {/* Title */}
          <Text style={styles.title} accessibilityRole="header" allowFontScaling={false}>{title}</Text>

          {/* Body */}
          <Text style={styles.body} allowFontScaling={false}>{body}</Text>

          {/* PRO benefits row */}
          <View style={styles.benefitsRow}>
            {PRO_BENEFITS.map(({ Icon, label }) => (
              <View key={label} style={styles.benefitChip}>
                <Icon size={13} color="#0369a1" />
                <Text style={styles.benefitChipText} allowFontScaling={false}>{label}</Text>
              </View>
            ))}
          </View>

          {/* CTA — bg on an INNER View so a function/animated-style Pressable can't
              drop backgroundColor on Android (the white-on-white bug). */}
          <AnimatedPressable
            onPress={handleUpgrade}
            style={styles.cta}
            accessibilityRole="button"
            accessibilityLabel="שדרגו ל-PRO"
          >
            <View style={styles.ctaInner}>
              <Text style={styles.ctaText} allowFontScaling={false}>שדרגו ל-PRO</Text>
              <ChevronLeft size={18} color="#ffffff" />
            </View>
          </AnimatedPressable>

          {/* Dismiss */}
          <AnimatedPressable onPress={() => handleDismiss('continue_text')} style={styles.dismiss} accessibilityRole="button" accessibilityLabel="המשך מאיפה שהפסקתי">
            <Text style={styles.dismissText} allowFontScaling={false}>המשך מאיפה שהפסקתי</Text>
          </AnimatedPressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(8,47,73,0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#f7fbff",
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#7dd3fc",
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 22,
    alignItems: "center",
    shadowColor: "#0ea5e9",
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },
  mascot: {
    width: 124,
    height: 124,
    marginTop: 4,
    marginBottom: 4,
    backgroundColor: "transparent", // black-box fix for transparent webp
  },
  title: {
    fontSize: 21,
    fontWeight: "900",
    color: "#0c4a6e",
    textAlign: "center",
    marginBottom: 8,
    writingDirection: "rtl",
  },
  body: {
    fontSize: 14,
    color: "#0369a1",
    textAlign: "center",
    lineHeight: 21,
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
  benefitChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(14,165,233,0.10)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(14,165,233,0.22)",
  },
  benefitChipText: {
    color: "#0369a1",
    fontSize: 12,
    fontWeight: "800",
    writingDirection: "rtl",
  },
  cta: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 8,
  },
  ctaInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0ea5e9",
    borderRadius: 16,
    paddingVertical: 16,
    borderBottomWidth: 4,
    borderBottomColor: "#0284c7",
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
    backgroundColor: "rgba(2,132,199,0.10)",
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
    textAlign: "center",
  },
});
