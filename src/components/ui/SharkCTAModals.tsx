/**
 * SharkCTAModals, Professional Captain Shark nudge notifications
 *
 * Two variants:
 *   1. BridgeCTA , every 4 modules: nudge to visit the bridge page
 *   2. ReferralCTA, every 5 modules + dividend content: invite-friends nudge
 *
 * Duolingo A/B learnings applied:
 *   • Copy rotation (3 variants per CTA)
 *   • Reciprocity framing on Referral ("+50 coins per friend")
 *   • Streak pill on Bridge ("X מודולים ברצף")
 *   • Action-verb CTAs with concrete numbers
 *   • Loss-aversion variant for Bridge (cycles in)
 *   • 48h cooldown after 2 dismisses
 *   • Session lock, no duplicate in same session
 *   • Record engagement (dismiss vs. act) for intelligent suppression
 *
 * Design: Clean toast-style bottom cards, professional tone, no emojis in titles.
 */
import { useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Animated, {
  FadeOutDown,
  SlideInDown,
} from "react-native-reanimated";
import { X, ArrowLeft, Users, Flame } from "lucide-react-native";
import { FINN_HAPPY } from "../../features/retention-loops/finnMascotConfig";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNudgeQueueStore } from "../../stores/useNudgeQueueStore";
import { STITCH } from "../../constants/theme";
import { useBandit } from "../../features/bandit/useBandit";

/* ────────────────────────────────────────────────────────────────────────────
   BridgeCTA, "למדנו יפה. עכשיו הזמן לעבור לעולם האמיתי."
   ──────────────────────────────────────────────────────────────────────────── */

interface BridgeCTAProps {
  visible: boolean;
  onGoBridge: () => void;
  onDismiss: () => void;
  /** Module count that triggered this CTA (4, 8, 12...). Used to select copy variant. */
  moduleCount?: number;
  /** When true, shows fixed Cover insurance copy instead of bandit-selected copy. */
  coverMode?: boolean;
}

export function SharkBridgeCTA({ visible, onGoBridge, onDismiss, moduleCount = 0, coverMode = false }: BridgeCTAProps) {
  const insets = useSafeAreaInsets();
  const canShow = useNudgeQueueStore((s) => s.canShow);
  const recordDismiss = useNudgeQueueStore((s) => s.recordDismiss);
  const recordAct = useNudgeQueueStore((s) => s.recordAct);
  const recordShown = useNudgeQueueStore((s) => s.recordShown);

  const { payload: v, trackImpression, trackConversion, trackDismiss: banditDismiss } = useBandit('bridge_momentum_cta');
  const { payload: socialProof } = useBandit('bridge_social_proof');

  // Register the impression when first shown
  useEffect(() => {
    if (visible) {
      recordShown('bridge');
      trackImpression();
    }
  }, [visible, recordShown, trackImpression]);

  // Respect session lock + 48h cooldown
  if (!visible || !canShow('bridge')) return null;

  const handleAct = () => {
    recordAct('bridge');
    trackConversion();
    onGoBridge();
  };

  const handleDismiss = () => {
    recordDismiss('bridge');
    banditDismiss();
    onDismiss();
  };

  return (
    <View style={[s.toastContainer, { bottom: Math.max(insets.bottom, 16) + 16 }]} pointerEvents="box-none">
      <Animated.View
        entering={SlideInDown.springify().damping(18).stiffness(140)}
        exiting={FadeOutDown.duration(250)}
        style={s.toastCard}
      >
        <View style={[s.accentLine, { backgroundColor: STITCH.primaryCyan }]} />

        <View style={s.contentRow}>
          <View style={s.avatarWrap}>
            <ExpoImage source={FINN_HAPPY} accessible={false} style={s.avatar} contentFit="contain" />
          </View>

          <View style={s.textBlock}>
            {/* Social proof pill — skipped in coverMode */}
            {!coverMode && moduleCount > 0 && (
              <View style={s.streakPill}>
                <Flame size={11} color={STITCH.tertiaryGold} fill={STITCH.tertiaryGoldBright} />
                <Text style={s.streakText}>
                  {socialProof.framingType === 'achievement'
                    ? socialProof.badgeText.replace('{count}', String(moduleCount))
                    : socialProof.badgeText}
                </Text>
              </View>
            )}

            <Text style={s.nudgeTitle}>
              {coverMode ? 'רוצה לראות את כל החסכונות\nוהביטוחים שלך במקום אחד?' : v.title}
            </Text>
            {!coverMode && <Text style={s.nudgeBody}>{v.body}</Text>}

            <Pressable
              onPress={handleAct}
              style={s.ctaBtn}
              accessibilityRole="button"
              accessibilityLabel={coverMode ? 'בואו לגשר' : v.cta}
            >
              <ArrowLeft size={18} color="#ffffff" />
              <Text style={s.ctaBtnText}>{coverMode ? 'בואו לגשר 🛡️' : v.cta}</Text>
            </Pressable>
          </View>

          <Pressable onPress={handleDismiss} hitSlop={12} style={s.dismissX} accessibilityRole="button" accessibilityLabel="סגור">
            <X size={15} color={STITCH.outlineVariant} />
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   ReferralCTA, "הזמינו עוד חברים"
   ──────────────────────────────────────────────────────────────────────────── */

interface ReferralCTAProps {
  visible: boolean;
  onGoReferral: () => void;
  onDismiss: () => void;
  /** Module count at trigger time. Used to select copy variant. */
  moduleCount?: number;
  /** True if this fired because the module mentioned dividends (affects copy tone). */
  triggeredByDividend?: boolean;
}

const COINS_PER_FRIEND = 50;
const DEFAULT_INVITE_TARGET = 3;

export function SharkReferralCTA({
  visible,
  onGoReferral,
  onDismiss,
  moduleCount: _moduleCount = 0,
  triggeredByDividend = false,
}: ReferralCTAProps) {
  const insets = useSafeAreaInsets();
  const canShow = useNudgeQueueStore((s) => s.canShow);
  const recordDismiss = useNudgeQueueStore((s) => s.recordDismiss);
  const recordAct = useNudgeQueueStore((s) => s.recordAct);
  const recordShown = useNudgeQueueStore((s) => s.recordShown);

  const { payload: v, trackImpression, trackConversion, trackDismiss: banditDismiss } = useBandit('referral_cta');

  useEffect(() => {
    if (visible) {
      recordShown('referral');
      trackImpression();
    }
  }, [visible, recordShown, trackImpression]);

  if (!visible || !canShow('referral')) return null;

  // triggeredByDividend still influences caller logic but bandit selects the copy
  // (v1 'dividend' framing will naturally win if dividend-triggered users convert better)
  void triggeredByDividend;

  const handleAct = () => {
    recordAct('referral');
    trackConversion();
    onGoReferral();
  };

  const handleDismiss = () => {
    recordDismiss('referral');
    banditDismiss();
    onDismiss();
  };

  return (
    <View style={[s.toastContainer, { bottom: Math.max(insets.bottom, 16) + 16 }]} pointerEvents="box-none">
      <Animated.View
        entering={SlideInDown.springify().damping(18).stiffness(140)}
        exiting={FadeOutDown.duration(250)}
        style={[s.toastCard, { borderColor: STITCH.ghostBorder }]}
      >
        <View style={[s.accentLine, { backgroundColor: STITCH.secondaryPurpleDark }]} />

        <View style={s.contentRow}>
          <View style={s.avatarWrap}>
            <ExpoImage source={FINN_HAPPY} accessible={false} style={s.avatar} contentFit="contain" />
            <View style={s.usersBadge}>
              <Users size={10} color={STITCH.secondaryPurpleDark} />
            </View>
          </View>

          <View style={s.textBlock}>
            <Text style={s.nudgeTitle}>{v.title}</Text>
            <Text style={s.nudgeBody}>{v.body}</Text>

            {/* Reciprocity chip, explicit "what you get" boosts A/B CTR ~28% */}
            <View style={s.reciprocityChip}>
              <Text style={s.reciprocityIcon}>🪙</Text>
              <Text style={s.reciprocityText}>+{COINS_PER_FRIEND} מטבעות לכל חבר שמפעיל</Text>
            </View>

            <Pressable
              onPress={handleAct}
              style={[s.pillBtn, { backgroundColor: STITCH.secondaryPurpleDark }]}
              accessibilityRole="button"
              accessibilityLabel={v.cta}
            >
              <Text style={[s.pillBtnText, { color: STITCH.surfaceLowest }]}>{v.cta}</Text>
              <ArrowLeft size={14} color={STITCH.surfaceLowest} />
            </Pressable>
          </View>

          <Pressable onPress={handleDismiss} hitSlop={12} style={s.dismissX} accessibilityRole="button" accessibilityLabel="סגור">
            <X size={15} color={STITCH.outlineVariant} />
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Helper: detect dividend content in module
   ──────────────────────────────────────────────────────────────────────────── */

export function moduleHasDividendContent(_moduleId: string, flashcardTexts: string[]): boolean {
  return flashcardTexts.some((text) => text.includes("דיבידנד"));
}

/* Pricing constants re-exported for telemetry / other consumers */
export { COINS_PER_FRIEND, DEFAULT_INVITE_TARGET };

/* ────────────────────────────────────────────────────────────────────────────
   Styles
   ──────────────────────────────────────────────────────────────────────────── */

const s = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9990,
    alignItems: "center",
  },
  toastCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: STITCH.surfaceLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: STITCH.ghostBorder,
    overflow: "hidden",
    shadowColor: STITCH.primaryCyan,
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  accentLine: {
    height: 3,
    width: "100%",
  },
  contentRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    padding: 16,
    gap: 12,
  },
  avatarWrap: {
    position: "relative",
    flexShrink: 0,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  usersBadge: {
    position: "absolute",
    bottom: -2,
    left: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: STITCH.secondaryPurple,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: STITCH.surfaceLowest,
  },
  textBlock: {
    flex: 1,
    gap: 6,
  },
  streakPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-end",
    backgroundColor: STITCH.tertiaryGoldLight,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: STITCH.tertiaryGoldBright,
    marginBottom: 2,
  },
  streakText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: STITCH.tertiaryGold,
    writingDirection: "rtl",
    letterSpacing: 0.2,
  },
  nudgeTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: STITCH.onSurface,
    writingDirection: "rtl",
    textAlign: "right",
  },
  nudgeBody: {
    fontSize: 13,
    fontWeight: "500",
    color: STITCH.onSurfaceVariant,
    writingDirection: "rtl",
    textAlign: "right",
    lineHeight: 20,
  },
  dividendMini: {
    backgroundColor: STITCH.tertiaryGoldLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-end",
  },
  dividendMiniText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: STITCH.tertiaryGold,
    writingDirection: "rtl",
  },
  reciprocityChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(233,196,0,0.18)", // tertiaryGoldBright
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-end",
    borderWidth: 1,
    borderColor: "rgba(233,196,0,0.35)",
  },
  reciprocityIcon: {
    fontSize: 14,
  },
  reciprocityText: {
    fontSize: 12,
    fontWeight: "800",
    color: STITCH.tertiaryGold,
    writingDirection: "rtl",
  },
  pillBtn: {
    flexDirection: "row-reverse",
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 16,
    alignSelf: "flex-end",
    alignItems: "center",
    gap: 6,
  },
  pillBtnText: {
    fontSize: 13.5,
    fontWeight: "800",
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    backgroundColor: "#1cb0f6",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 4,
    borderBottomColor: "#0a8fc4",
    marginTop: 4,
    shadowColor: "#1cb0f6",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaBtnText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#ffffff",
    writingDirection: "rtl",
    textAlign: "center",
  },
  dismissX: {
    position: "absolute",
    top: 12,
    left: 12,
    padding: 4,
    borderRadius: 10,
  },
});
