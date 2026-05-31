import React, { useCallback, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Dimensions, Linking } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { tapHaptic, successHaptic } from "../../../../utils/haptics";
import { useSoundEffect } from "../../../../hooks/useSoundEffect";
import { track } from "../../../../lib/analytics/events";

/** Hosted on Vercel Blob (1074×1911 portrait poster — phone mockup + shark
 *  + "join the community" headline). Served remotely so the asset can be
 *  swapped without an EAS rebuild. */
const WHATSAPP_CTA_IMAGE = {
  uri: "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/images/cta/whatsapp-community.jpg?v=2026-06-01",
} as const;

/** Same official FinPlay WhatsApp invite used in `MoreScreen` and email
 *  templates — keeps a single source of truth (chat.whatsapp.com/Clx7...). */
const WHATSAPP_URL = "https://chat.whatsapp.com/Clx7d0eFQmyHuQPppH6f7m?mode=gi_t";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface Props {
  isActive?: boolean;
  /** Pearl flow: fired when the user advances past this CTA. Any tap on the
   *  poster background calls onContinue; the WhatsApp button calls it after
   *  opening the deeplink (so when the user returns from WhatsApp the pearl
   *  has already advanced). */
  onContinue?: () => void;
  /** Pearl context — threaded through for typed pearl_cta_tapped /
   *  pearl_cta_dismissed analytics. PearlCtaStage owns the pearl_cta_shown
   *  emit on mount. */
  afterModuleId?: string;
  chapterId?: string;
}

export const FeedWhatsAppNudgeCard = React.memo(function FeedWhatsAppNudgeCard({
  onContinue,
  afterModuleId,
  chapterId,
}: Props) {
  const { playSound } = useSoundEffect();
  const mountedAtRef = useRef<number>(Date.now());

  const handleJoin = useCallback(() => {
    successHaptic();
    playSound("btn_click_soft_1");
    if (afterModuleId) {
      try {
        track({
          name: 'pearl_cta_tapped',
          props: { after_module_id: afterModuleId, chapter_id: chapterId, cta_kind: 'whatsapp', destination_url: WHATSAPP_URL },
        });
      } catch { /* non-fatal */ }
    }
    Linking.openURL(WHATSAPP_URL).catch(() => {/* user can ignore — backgroundTap still advances */});
    onContinue?.();
  }, [onContinue, playSound, afterModuleId, chapterId]);

  const handleBackgroundTap = useCallback(() => {
    tapHaptic();
    if (afterModuleId) {
      try {
        track({
          name: 'pearl_cta_dismissed',
          props: { after_module_id: afterModuleId, chapter_id: chapterId, cta_kind: 'whatsapp', time_open_ms: Date.now() - mountedAtRef.current },
        });
      } catch { /* non-fatal */ }
    }
    onContinue?.();
  }, [onContinue, afterModuleId, chapterId]);

  return (
    <Pressable style={styles.root} onPress={handleBackgroundTap} accessibilityRole="button" accessibilityLabel="המשך">
      <Animated.View entering={FadeIn.duration(320)} style={styles.imageWrap} pointerEvents="none">
        <ExpoImage
          source={WHATSAPP_CTA_IMAGE}
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
              <Text style={styles.ctaText}>הצטרפו לקהילה</Text>
              <Text style={styles.ctaEmoji}>💬</Text>
            </View>
          )}
        </Pressable>
        <Text style={styles.skipHint} allowFontScaling={false}>
          לחצו במקום אחר כדי להמשיך
        </Text>
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
  ctaEmoji: {
    fontSize: 22,
    lineHeight: 26,
  },
  skipHint: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(15,23,42,0.55)",
    writingDirection: "rtl",
    textAlign: "center",
  },
});
