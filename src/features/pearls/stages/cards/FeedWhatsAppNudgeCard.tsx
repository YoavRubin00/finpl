import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Dimensions, Linking } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { tapHaptic, successHaptic } from "../../../../utils/haptics";
import { useSoundEffect } from "../../../../hooks/useSoundEffect";
import { track } from "../../../../lib/analytics/events";
import { loadBarCtas, pickBarCta } from "../../../bar-content/barCtaApi";

/** Official WhatsApp glyph (phone-in-bubble), white on green — keeps CTA
 *  brand-aligned instead of a generic 💬 emoji that read as "chat" rather
 *  than "WhatsApp". Path data is the WhatsApp brand mark normalized to a
 *  24×24 viewBox. */
function WhatsAppLogo({ size = 22, color = "#ffffff" }: { size?: number; color?: string }): React.ReactElement {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityLabel="WhatsApp">
      <Path
        fill={color}
        d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01zM12.04 20.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.26 8.26 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c.02 4.54-3.68 8.23-8.22 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23a7.49 7.49 0 0 1-1.38-1.71c-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.57.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.07-.11-.23-.17-.48-.29z"
      />
    </Svg>
  );
}

/** Hosted on Vercel Blob (1074×1911 portrait poster — phone mockup + shark
 *  + "join the community" headline). Served remotely so the asset can be
 *  swapped without an EAS rebuild. */
const WHATSAPP_CTA_IMAGE = {
  uri: "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/images/cta/whatsapp-community.jpg?v=2026-06-01",
} as const;

/** In-app WhatsApp invite (same group as MoreScreen: chat.whatsapp.com/Clx7…).
 *  ⚠️ DRIFT: the EMAIL path (welcomeEmail / api/email/wa-click) points to a
 *  DIFFERENT group (chat.whatsapp.com/JzyPh…). Consolidating the two is a
 *  product decision (which group is canonical) — left as-is on purpose. */
const WHATSAPP_URL = "https://chat.whatsapp.com/Clx7d0eFQmyHuQPppH6f7m?mode=gi_t";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface Props {
  isActive?: boolean;
  /** Pearl flow: advance to the next stage on skip ("אחר כך" / background tap). */
  onContinue?: () => void;
  /** Pearl flow: fired when the user TAPS the WhatsApp CTA — finalizes the pearl
   *  in-place (close + mark completed) WITHOUT pushing to the next module, so
   *  opening WhatsApp doesn't also shove the user into the next lesson behind it.
   *  Mirrors FeedTradingNudgeCard / FeedReferralNudgeCard. */
  onTapCta?: () => void;
  /** Pearl context — threaded through for typed pearl_cta_tapped /
   *  pearl_cta_dismissed analytics. PearlCtaStage owns the pearl_cta_shown
   *  emit on mount. */
  afterModuleId?: string;
  chapterId?: string;
}

export const FeedWhatsAppNudgeCard = React.memo(function FeedWhatsAppNudgeCard({
  onContinue,
  onTapCta,
  afterModuleId,
  chapterId,
}: Props) {
  const { playSound } = useSoundEffect();
  const mountedAtRef = useRef<number>(Date.now());

  // Bar's cloud WhatsApp CTA (A/B variant) — overrides the bundled poster
  // image + button copy when present (e.g. a fresh Higgsfield community card).
  const [cloudCta, setCloudCta] = useState(() => pickBarCta('whatsapp'));
  useEffect(() => {
    if (cloudCta) return;
    let alive = true;
    loadBarCtas().then(() => { if (alive) setCloudCta(pickBarCta('whatsapp')); });
    return () => { alive = false; };
  }, [cloudCta]);

  // Dedicated whatsapp_cta_shown — measures the community-join funnel
  // independently of the pearl funnel (which PearlCtaStage owns). source
  // splits in-game vs email so we can compare acquisition channels.
  useEffect(() => {
    try {
      track({ name: 'whatsapp_cta_shown', props: { source: 'pearl_feed' } });
    } catch { /* non-fatal */ }
  }, []);

  const handleJoin = useCallback(() => {
    successHaptic();
    playSound("btn_click_soft_1");
    try {
      track({ name: 'whatsapp_cta_tapped', props: { source: 'pearl_feed' } });
    } catch { /* non-fatal */ }
    if (afterModuleId) {
      try {
        track({
          name: 'pearl_cta_tapped',
          props: { after_module_id: afterModuleId, chapter_id: chapterId, cta_kind: 'whatsapp', destination_url: WHATSAPP_URL, cta_variant: cloudCta?.variant },
        });
      } catch { /* non-fatal */ }
    }
    // Finalize the pearl in-place BEFORE opening WhatsApp — onTapCta closes the
    // sheet + marks the pearl completed but does NOT router.push to the next
    // module (which onContinue would). Prevents the next lesson from loading
    // behind WhatsApp. Falls back to onContinue if onTapCta isn't wired (non-
    // pearl usage). Mirrors FeedTradingNudgeCard.
    (onTapCta ?? onContinue)?.();
    Linking.openURL(WHATSAPP_URL).catch(() => {/* user can ignore */});
  }, [onTapCta, onContinue, playSound, afterModuleId, chapterId]);

  const handleBackgroundTap = useCallback(() => {
    tapHaptic();
    if (afterModuleId) {
      try {
        track({
          name: 'pearl_cta_dismissed',
          props: { after_module_id: afterModuleId, chapter_id: chapterId, cta_kind: 'whatsapp', time_open_ms: Date.now() - mountedAtRef.current, cta_variant: cloudCta?.variant },
        });
      } catch { /* non-fatal */ }
    }
    onContinue?.();
  }, [onContinue, afterModuleId, chapterId]);

  return (
    <Pressable style={styles.root} onPress={handleBackgroundTap} accessibilityRole="button" accessibilityLabel="המשך">
      <Animated.View entering={FadeIn.duration(320)} style={styles.imageWrap} pointerEvents="none">
        <ExpoImage
          source={cloudCta?.imageUrl ? { uri: cloudCta.imageUrl } : WHATSAPP_CTA_IMAGE}
          style={styles.image}
          contentFit="contain"
          accessible
          accessibilityLabel="הצטרפו לקהילת FinPlay בוואטסאפ"
        />
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(420).delay(180)} style={styles.ctaWrap} pointerEvents="box-none">
        <Pressable onPress={handleJoin} accessibilityRole="button" accessibilityLabel="הצטרפו לקהילה בוואטסאפ">
          {({ pressed }) => (
            <View style={[styles.cta, pressed && styles.ctaPressed]}>
              <Text style={styles.ctaText}>{cloudCta?.cta ?? "הצטרפו לקהילה"}</Text>
              <WhatsAppLogo size={22} color="#ffffff" />
            </View>
          )}
        </Pressable>
        {/* Explicit blue "המשך" — the previous "tap anywhere to continue"
            hint was easy to miss (user feedback 2026-06-02). Same deep-blue
            palette as the rest of the app's primary CTAs. */}
        {onContinue && (
          <Pressable
            onPress={handleBackgroundTap}
            accessibilityRole="button"
            accessibilityLabel="המשך לשלב הבא"
            style={({ pressed }) => [styles.continueBtn, pressed && styles.continueBtnPressed]}
          >
            <Text style={styles.continueText} allowFontScaling={false}>אחר כך</Text>
          </Pressable>
        )}
      </Animated.View>
    </Pressable>
  );
});

const CTA_GREEN = "#25D366";
const CTA_GREEN_DEEP = "#128C7E";
const CTA_GREEN_SHADOW = "#0d6b5c";

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#7dd3fc",
    alignItems: "center",
    justifyContent: "center",
  },
  imageWrap: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    maxWidth: 540,
  },
  ctaWrap: {
    position: "absolute",
    bottom: 36,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 24,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: CTA_GREEN,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 28,
    minWidth: 240,
    borderWidth: 2,
    borderColor: CTA_GREEN_DEEP,
    borderBottomWidth: 5,
    borderBottomColor: CTA_GREEN_SHADOW,
    shadowColor: CTA_GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  ctaPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  ctaText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#ffffff",
    writingDirection: "rtl",
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // ctaEmoji removed — replaced by inline WhatsAppLogo SVG (brand mark).
  // Explicit blue continue button — matches the deep-blue palette used by
  // TimelineOrderCard "אני אסתדר", CrowdQuestionCard Continue, and
  // DiamondHandsCard Continue. Replaces the easy-to-miss skip hint text.
  // Tertiary "אחר כך" — muted text-only so it doesn't compete with the
  // green WhatsApp CTA above. Was a primary blue button which ate 100%
  // of the CTA conversion (12 cta_shown / 0 cta_tapped in prod).
  continueBtn: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  continueBtnPressed: { opacity: 0.7 },
  continueText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
    writingDirection: "rtl" as const,
  },
});
