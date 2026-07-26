/**
 * ProPromoGrantedModal — one-time "קיבלתם Pro במתנה" celebration for users who
 * received a MANUAL RevenueCat promotional entitlement (period_type
 * PROMOTIONAL). Until now these users got Pro silently — no in-app signal at
 * all (Yoav 2026-07-19).
 *
 * Detection: /api/sync/subscription now returns `proSource`; when the
 * subscription query reports isPro + proSource==='promotional' and this grant
 * (keyed by proExpiresAt) hasn't been acknowledged yet — show once.
 *
 * Seen-flag: useUsageStore.promoWelcomeSeenForExpiry, keyed by the grant's
 * expiry so a FUTURE re-grant (different expiry) shows again while the same
 * grant never re-shows. Marked the moment the modal becomes visible.
 *
 * Deliberately a lightweight modal (UpgradeModal styling) and NOT the
 * ProWelcomeScreen route — that screen is the post-purchase paywall
 * celebration wired to returnTo navigation; this is a passive announcement
 * mounted on the learn map, and it must not navigate (app/_layout.tsx is
 * off-limits). Respects the global popup sequencer so it never stacks on the
 * streak popup.
 */
import { useEffect, useRef, useState } from "react";
import { Text, Modal, StyleSheet, Pressable, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Animated, { FadeIn, FadeOut, FadeInUp } from "react-native-reanimated";
import { AnimatedPressable } from "../../components/ui/AnimatedPressable";
import { FINN_HAPPY } from "../retention-loops/finnMascotConfig";
import { useNudgeQueueStore } from "../../stores/useNudgeQueueStore";
import { heavyHaptic } from "../../utils/haptics";
import { captureEvent } from "../../lib/posthog";
import { useSubscription } from "./useSubscription";
import { useUsageStore } from "./useUsageStore";

/** Key identifying a specific grant — its expiry (or explicit "no expiry"). */
function grantKey(proExpiresAt: string | null): string {
  return proExpiresAt ?? "no-expiry";
}

function formatHebrewDate(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const PRESENCE_DELAY_MS = 1_500;

export function ProPromoGrantedModal() {
  const { data: subscription } = useSubscription();
  const seenForExpiry = useUsageStore((s) => s.promoWelcomeSeenForExpiry);
  const markSeen = useUsageStore((s) => s.markPromoWelcomeSeen);

  const [visible, setVisible] = useState(false);
  const shownRef = useRef(false);

  const isPromo =
    subscription?.isPro === true && subscription.proSource === "promotional";
  const expiryKey = grantKey(subscription?.proExpiresAt ?? null);
  const eligible = isPromo && seenForExpiry !== expiryKey && !shownRef.current;

  useEffect(() => {
    if (!eligible) return;

    // Short presence delay, then wait out the global popup stage (streak
    // popup etc.) so we never stack popups on launch.
    let slotTimer: ReturnType<typeof setTimeout> | undefined;
    const presenceTimer = setTimeout(() => {
      const seqDelay = Math.max(0, useNudgeQueueStore.getState().popupBusyUntil - Date.now());
      slotTimer = setTimeout(() => {
        if (shownRef.current) return;
        shownRef.current = true;
        useNudgeQueueStore.getState().takePopupSlot();
        // Mark seen at SHOW time — "shown once" must survive a force-kill.
        markSeen(expiryKey);
        setVisible(true);
        captureEvent("pro_promo_granted_seen", {
          expires_at: subscription?.proExpiresAt ?? null,
        });
      }, seqDelay);
    }, PRESENCE_DELAY_MS);

    return () => {
      clearTimeout(presenceTimer);
      if (slotTimer) clearTimeout(slotTimer);
    };
  }, [eligible, expiryKey, markSeen, subscription?.proExpiresAt]);

  const handleClose = () => {
    heavyHaptic();
    setVisible(false);
  };

  const expiresAt = subscription?.proExpiresAt ?? null;
  const body = expiresAt
    ? `קפטן שארק פתח לכם את המים העמוקים: לבבות בלי סוף, AI בלי הגבלה וכל התכנים.\nהמתנה בתוקף עד ${formatHebrewDate(expiresAt)}.`
    : "קפטן שארק פתח לכם את המים העמוקים: לבבות בלי סוף, AI בלי הגבלה וכל התכנים.";

  return (
    <Modal
      transparent
      animationType="none"
      visible={visible}
      statusBarTranslucent
      onRequestClose={handleClose}
      accessibilityViewIsModal
    >
      <Animated.View
        entering={FadeIn.duration(140)}
        exiting={FadeOut.duration(100)}
        style={styles.overlay}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleClose}
          accessibilityLabel="סגור על ידי נגיעה ברקע"
          accessibilityRole="button"
        />
        <Animated.View entering={FadeInUp.duration(300)} style={styles.card}>
          <ExpoImage
            source={FINN_HAPPY}
            style={styles.mascot}
            contentFit="contain"
            accessible={false}
            pointerEvents="none"
          />

          <Text style={styles.title} accessibilityRole="header" allowFontScaling={false}>
            קיבלתם Pro במתנה
          </Text>

          <Text style={styles.body} allowFontScaling={false}>
            {body}
          </Text>

          {/* CTA — bg on an INNER View (Android Pressable bg-drop guard). */}
          <AnimatedPressable
            onPress={handleClose}
            style={styles.cta}
            accessibilityRole="button"
            accessibilityLabel="צוללים פנימה"
          >
            <View style={styles.ctaInner}>
              <Text style={styles.ctaText} allowFontScaling={false}>
                צוללים פנימה
              </Text>
            </View>
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
    marginBottom: 18,
    writingDirection: "rtl",
  },
  cta: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
  },
  ctaInner: {
    alignItems: "center",
    justifyContent: "center",
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
});
