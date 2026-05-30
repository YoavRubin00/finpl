import { useState, useCallback, useEffect } from "react";
import { Image as ExpoImage } from "expo-image";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Dimensions,
  ActivityIndicator,
  Platform,
  Linking,
} from "react-native";
import LottieView from "lottie-react-native";
import { FINN_DANCING } from "../retention-loops/finnMascotConfig";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  cancelAnimation,
  FadeInDown,
  interpolate,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Check, X } from "lucide-react-native";
import { ScrollView } from "react-native-gesture-handler";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useIsPro, useSyncFromRevenueCat } from "./useSubscription";
import { useUsageStore } from "./useUsageStore";
import { useAuthStore } from "../auth/useAuthStore";
import { getOffering, purchasePackage, RC_ENTITLEMENT_PRO, restorePurchases } from "../../services/revenueCat";
import type { PurchasesPackage } from "../../services/revenueCat";
import { BackButton } from "../../components/ui/BackButton";
import { useTheme } from "../../hooks/useTheme";
import { useMonetizationIntentStore } from "../monetization/useMonetizationIntentStore";
import { useBandit } from "../bandit/useBandit";
import { captureEvent, setPersonProperties } from "../../lib/posthog";
import { logTrialStart, logPurchase } from "../../utils/fbEvents";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Apple's standard EULA URL — required for App Store auto-renewable subscriptions
// (guideline 3.1.2(c)). Must also be set in App Store Connect → App Description.
const APPLE_STD_EULA = "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";

// ── Duolingo-inspired palette ────────────────────────────────────────────
const DUO = {
  gradientTop: "#0a2540",
  gradientBottom: "#164e63",
  green: "#58CC02",
  greenDark: "#46A302",
  blue: "#1CB0F6",
  navy: "#0c4a6e",
  textDark: "#4B4B4B",
  textMuted: "#AFAFAF",
  divider: "#E5E5E5",
  white: "#FFFFFF",
  checkGreen: "#58CC02",
  xGray: "#D1D5DB",
} as const;

// ── Feature comparison data ──────────────────────────────────────────────
interface FeatureRow {
  label: string;
  free: string | boolean;
  pro: string | boolean;
}

// 6 focused rows — Moni 2026-05-30 paywall rebuild. Industry rule of thumb
// (Brawl Pass, Duolingo Super, Spotify Premium): 5-8 rows max. More than
// that → cognitive overload, conversion drops. Every row here answers
// "what am I getting that I can't live without?"
//
// Removed from the previous list:
//  - "משחקי פיד" — feature removed entirely (commit 42286b7)
//  - "ארנה"      — superseded by "סימולציות פרימיום" content lock
//  - "פריטי פרימיום מהחנות" — cosmetic, weak conversion driver
// Intentionally NOT added: shark voice call (feature not yet shipped).
const FEATURES: FeatureRow[] = [
  // The line Yoav specifically asked for — "Financial Tools, limited vs full"
  { label: "כלים פיננסיים מתקדמים", free: "גישה מוגבלת", pro: "גישה מלאה" },
  // AI chat is the real value driver (lifeline + analyst + insights)
  { label: "צ'אט AI עם שארק", free: "2 הודעות ביום", pro: "ללא הגבלה" },
  // Content lock — the 7 Pro-only simulations in proGates.ts
  { label: "7 סימולציות פרימיום", free: false, pro: true },
  // The most viscerally felt daily friction
  { label: "לבבות", free: "5", pro: "אינסוף ♾️" },
  // Universal Pro signal — everyone understands the value
  { label: "ללא פרסומות", free: false, pro: true },
  // Progression boost — small but compounds over time
  { label: "בוסט XP", free: "x1", pro: "x1.5" },
];

// ── Decorative sparkle dots ──────────────────────────────────────────────
const SPARKLES = [
  { top: 30, left: 20, size: 3, opacity: 0.6 },
  { top: 60, right: 35, size: 4, opacity: 0.8 },
  { top: 90, left: 60, size: 2.5, opacity: 0.5 },
  { top: 45, right: 80, size: 3.5, opacity: 0.7 },
  { top: 110, left: 30, size: 2, opacity: 0.4 },
  { top: 75, right: 50, size: 3, opacity: 0.6 },
  { top: 20, left: 100, size: 2.5, opacity: 0.5 },
  { top: 100, right: 25, size: 3, opacity: 0.7 },
];

// ── Feature value cell ───────────────────────────────────────────────────
function FeatureCell({ value, isPro }: { value: string | boolean; isPro?: boolean }) {
  if (value === true) {
    return (
      <View style={{ backgroundColor: "rgba(34,197,94,0.12)", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}>
        <Check size={18} color={DUO.checkGreen} strokeWidth={3} />
      </View>
    );
  }
  if (value === false) {
    return (
      <View style={{ backgroundColor: "rgba(148,163,184,0.1)", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}>
        <X size={16} color={DUO.xGray} strokeWidth={2.5} />
      </View>
    );
  }
  return (
    <View style={{ backgroundColor: isPro ? "rgba(8,145,178,0.1)" : "rgba(148,163,184,0.08)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={[styles.featureLimitText, isPro && styles.featureLimitTextPro]}>
        {value}
      </Text>
    </View>
  );
}

// ── Pulsing CTA glow ────────────────────────────────────────────────────
function useCtaGlow() {
  const glow = useSharedValue(0);
  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200 }),
        withTiming(0, { duration: 1200 }),
      ),
      -1,
      true,
    );
    return () => cancelAnimation(glow);
  }, []);
  return useAnimatedStyle(() => ({
    shadowOpacity: interpolate(glow.value, [0, 1], [0.3, 0.8]),
    shadowRadius: interpolate(glow.value, [0, 1], [8, 24]),
  }));
}

// ── PRO badge pulse ─────────────────────────────────────────────────────
function useProBadgePulse() {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withSpring(1.08, { damping: 8 }),
        withSpring(1, { damping: 8 }),
      ),
      -1,
      true,
    );
    return () => cancelAnimation(scale);
  }, []);
  return useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
}

// ── Main Component ───────────────────────────────────────────────────────
export function PricingScreen() {
  const theme = useTheme();
  const router = useRouter();
  // When opened mid-flow (e.g. the post-mod-0-4 paywall), returnTo holds the
  // route to continue to on dismiss/purchase so the user is never stranded.
  // `source` lets upstream callers (e.g. AppWalkthroughOverlay) tag the
  // funnel so paywall_dismissed events can be sliced separately. Defaults
  // to 'subscription_pricing' when omitted so existing call sites still
  // get a value on the event.
  const { returnTo, source: rawSource } = useLocalSearchParams<{ returnTo?: string; source?: string }>();
  const source = typeof rawSource === 'string' && rawSource ? rawSource : 'subscription_pricing';
  const isCurrentlyPro = useIsPro();
  const hasSeenProWelcome = useUsageStore((s) => s.hasSeenProWelcome);
  const displayName = useAuthStore((s) => s.displayName);
  const [isLoading, setIsLoading] = useState(false);
  const [activePackage, setActivePackage] = useState<PurchasesPackage | null>(null);
  const { mutateAsync: syncFromRC } = useSyncFromRevenueCat();

  const { payload: paywallPayload, trackImpression, trackConversion } = useBandit('upgrade_paywall_headline');

  useEffect(() => {
    useMonetizationIntentStore.getState().trackPricingVisit();
    trackImpression();
    captureEvent('paywall_viewed', { paywall: 'subscription_pricing' });
  }, [trackImpression]);

  // Load offering once so we can show the localized price + period before purchase.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const offering = await getOffering();
        if (!offering || !mounted) return;
        const pkg =
          offering.monthly ?? offering.annual ?? offering.availablePackages[0];
        if (pkg) setActivePackage(pkg);
      } catch {
        // silent, user can still tap CTA which will fetch again
      }
    })();
    return () => { mounted = false; };
  }, []);

  const priceString = activePackage?.product.priceString ?? "";
  const periodLabel = (() => {
    const t = activePackage?.packageType;
    if (t === "ANNUAL") return "לשנה";
    if (t === "MONTHLY") return "לחודש";
    if (t === "WEEKLY") return "לשבוע";
    return "";
  })();

  // Trial detection (Moni 2026-05-30). RevenueCat surfaces the introductory
  // offer via `product.introPrice` once the store-side config is approved
  // (App Store Connect → Subscription → Introductory Offer / Play Console →
  // Base plan → Offer → Free trial). A `price === 0` introPrice IS a free
  // trial; anything else is a discounted intro and we don't want to claim
  // "חינם" then. trialDays is normalized to days regardless of which unit
  // the store reports (Apple usually reports DAYs, Google may report WEEK=1).
  const introPrice = activePackage?.product.introPrice ?? null;
  const trialDays = (() => {
    if (!introPrice || introPrice.price !== 0) return 0;
    const n = introPrice.periodNumberOfUnits;
    switch (introPrice.periodUnit) {
      case 'DAY':   return n;
      case 'WEEK':  return n * 7;
      case 'MONTH': return n * 30;
      case 'YEAR':  return n * 365;
      default:      return 0;
    }
  })();
  const hasTrial = trialDays > 0;

  const insets = useSafeAreaInsets();
  const ctaGlowStyle = useCtaGlow();
  const proBadgeStyle = useProBadgePulse();

  const handleUpgrade = useCallback(async () => {
    if (!displayName) {
      Alert.alert("שגיאה", "יש להתחבר כדי להירשם.");
      return;
    }

    setIsLoading(true);
    try {
      const offering = await getOffering();
      if (!offering) {
        Alert.alert("שגיאה", "לא נמצאו חבילות מנוי. נסה שוב מאוחר יותר.");
        return;
      }

      // Prefer monthly package
      const pkg: PurchasesPackage | undefined =
        offering.monthly ?? offering.annual ?? offering.availablePackages[0];
      if (!pkg) {
        Alert.alert("שגיאה", "לא נמצאה חבילת מנוי.");
        return;
      }

      // Initiate-checkout signal — fires BEFORE the native paywall opens, so we
      // still get attribution even if the user abandons at the system payment sheet.
      logTrialStart(pkg.packageType);

      const customerInfo = await purchasePackage(pkg);
      const entitlement = customerInfo.entitlements.active[RC_ENTITLEMENT_PRO];
      const isPro = entitlement !== undefined;

      if (isPro) {
        // RevenueCat reports periodType per entitlement — TRIAL fires when
        // Apple/Google grants the introductory free-trial offer we
        // configured store-side. Split the analytics event so PostHog can
        // distinguish trial starts from straight purchases (Moni 2026-05-30
        // — separately tracking trial→paid conversion is the whole point).
        const isTrial = entitlement.periodType === 'TRIAL';
        captureEvent(isTrial ? 'trial_started' : 'subscription_purchased', {
          plan: pkg.packageType,
          price: pkg.product.priceString,
          trial_days: isTrial ? trialDays : 0,
        });
        // Patch the PostHog person record so all subsequent insights segment
        // this user as Pro. Without this update, DAU/retention queries with
        // breakdown=is_pro keep returning them as Free even after the purchase.
        setPersonProperties({ is_pro: true });
        await syncFromRC(customerInfo);
        // Standard FB / GA4 purchase event — feeds Meta Ads + Google Ads
        // optimization (App Campaign for Subscribers, Advantage+ Conversion).
        logPurchase(pkg.product.price, pkg.product.currencyCode, {
          plan: pkg.packageType,
          price_string: pkg.product.priceString,
        });
        trackConversion();
        if (!hasSeenProWelcome) {
          // Forward returnTo through pro-welcome so the user lands back in the
          // lesson flow (e.g. mod-0-5) after the welcome screen.
          const dest = returnTo
            ? `/pro-welcome?returnTo=${encodeURIComponent(returnTo)}`
            : "/pro-welcome";
          router.replace(dest as never);
          return;
        }
        // Already saw pro-welcome: continue the flow directly if we have a
        // returnTo, otherwise just confirm.
        if (returnTo) {
          router.replace(returnTo as never);
          return;
        }
        Alert.alert("ברוכים הבאים ל-Pro! 🎉", "גישה מלאה פתוחה. תהנו!");
      }
    } catch (err: unknown) {
      // RevenueCat / native sheets surface user cancellation as several
      // different strings: "PURCHASE_CANCELLED", "Purchase was cancelled.",
      // "User cancelled", and a userCancelled boolean on the error object.
      // Match all of them so cancellations don't get logged as failures.
      const message = err instanceof Error ? err.message : '';
      const userCancelled =
        (err as { userCancelled?: boolean } | null)?.userCancelled === true;
      const isCancelled = userCancelled || /cancel/i.test(message);
      if (isCancelled) {
        captureEvent('subscription_cancelled_at_checkout');
      } else {
        const fallbackMessage = message || "שגיאה לא צפויה";
        captureEvent('subscription_purchase_failed', { error_message: fallbackMessage });
        Alert.alert("שגיאת תשלום", fallbackMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [displayName, syncFromRC, hasSeenProWelcome, router, trackConversion, trialDays, returnTo]);

  const handleRestore = useCallback(async () => {
    setIsLoading(true);
    try {
      const customerInfo = await restorePurchases();
      const restored = customerInfo.entitlements.active[RC_ENTITLEMENT_PRO] !== undefined;
      if (restored) {
        await syncFromRC(customerInfo);
        Alert.alert("שוחזר!", "מנוי PRO שוחזר בהצלחה.");
      } else {
        Alert.alert("לא נמצא", "לא נמצא מנוי פעיל לשחזור.");
      }
    } catch {
      Alert.alert("שגיאה", "לא הצלחנו לשחזר רכישות. נסה שוב.");
    } finally {
      setIsLoading(false);
    }
  }, [syncFromRC]);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={{ flex: 1 }}>
        {/* ── Hero gradient header ── */}
        <LinearGradient
          colors={[DUO.gradientTop, DUO.gradientBottom]}
          style={styles.heroGradient}
        >
          <SafeAreaView edges={["top"]}>
            {/* Back button */}
            <View style={styles.backRow}>
              <BackButton />
            </View>

            {/* Decorative sparkles */}
            {SPARKLES.map((s, i) => (
              <View
                key={i}
                accessible={false}
                style={[
                  styles.sparkle,
                  {
                    top: s.top,
                    left: s.left,
                    right: s.right,
                    width: s.size,
                    height: s.size,
                    opacity: s.opacity,
                  } as Record<string, unknown>,
                ]}
              />
            ))}

            {/* Fin mascot */}
            <View style={styles.mascotContainer}>
              <ExpoImage source={FINN_DANCING}
                style={styles.mascot}
                contentFit="contain"
                accessible={false}
              />
            </View>

            {/* Social proof */}
            <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.proofContainer}>
              <Text style={styles.proofText}>{paywallPayload.proofText}</Text>
            </Animated.View>
            
            {/* Added spacer to let body overlap smoothly without clipping text */}
            <View style={{ height: 12 }} />
          </SafeAreaView>
        </LinearGradient>

        <View style={[styles.body, { backgroundColor: theme.bg }]}>
          <ScrollView 
            style={{ flex: 1, width: '100%' }}
            contentContainerStyle={{ paddingTop: 20, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            {/* ── Column headers ── */}
            <View style={styles.columnHeaders}>
              <Text style={[styles.colHeaderFree, { color: theme.textMuted }]}>חינמי</Text>
              <Animated.View style={[styles.proBadge, proBadgeStyle]}>
                <Text style={styles.proBadgeText}>PRO</Text>
              </Animated.View>
            </View>

            {/* ── Feature comparison rows ── */}
            <Animated.View entering={FadeInDown.delay(300).duration(400)}>
              {FEATURES.map((f, i) => (
                <View
                  key={f.label}
                  style={[
                    styles.featureRow,
                    { borderBottomColor: theme.border },
                    i === 0 && { borderTopWidth: 1, borderTopColor: theme.border },
                  ]}
                >
                  <Text style={[styles.featureLabel, { color: theme.text }]}>{f.label}</Text>
                  <View style={styles.featureCells}>
                    <View style={styles.freeCell}>
                      <FeatureCell value={f.free} />
                    </View>
                    <View style={styles.proCell}>
                      <FeatureCell value={f.pro} isPro />
                    </View>
                  </View>
                </View>
              ))}
            </Animated.View>
          </ScrollView>

          {/* ── CTA section, pinned to bottom ── */}
          <View style={[styles.ctaSection, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            {isCurrentlyPro ? (
              <View style={styles.currentPlanBadge}>
                <Text style={styles.currentPlanText}>✦ אתה כבר PRO</Text>
              </View>
            ) : (
              <>
                <Animated.View style={[styles.ctaWrapper, ctaGlowStyle]}>
                  <Pressable
                    onPress={handleUpgrade}
                    disabled={isLoading}
                    accessibilityRole="button"
                    accessibilityLabel="שדרג עכשיו ל-PRO"
                    accessibilityState={{ disabled: isLoading }}
                    style={({ pressed }) => [
                      styles.ctaButtonBase,
                      pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                      isLoading && { opacity: 0.6 },
                    ]}
                  >
                    <LinearGradient
                      colors={["#0a2540", "#164e63", "#0a2540"]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={styles.ctaButtonGradient}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                          <View accessible={false}>
                            <LottieView
                              source={require("../../../assets/lottie/Pro Animation 3rd.json")}
                              style={styles.ctaLottie}
                              autoPlay
                              loop
                            />
                          </View>
                          <Text style={styles.ctaText}>
                            {hasTrial ? `התחל ניסיון חינם · ${trialDays} ימים` : paywallPayload.ctaText}
                          </Text>
                        </View>
                      )}
                    </LinearGradient>
                  </Pressable>
                </Animated.View>

                {/* Localized price + period (Apple 3.1.2(a)). Trial framing
                    pushes the "after the trial" disclosure into the same
                    line so the user sees the recurring charge clearly. */}
                {priceString ? (
                  <Text style={[styles.priceMain, { color: theme.text }]}>
                    {hasTrial
                      ? `חינם ${trialDays} ימים · אחר כך ${priceString} ${periodLabel}`
                      : `${priceString} ${periodLabel}`}
                  </Text>
                ) : null}
                {hasTrial ? (
                  <Text style={[styles.priceMain, { color: theme.textMuted, fontSize: 12, marginTop: 2 }]}>
                    ביטול חינם בכל עת
                  </Text>
                ) : null}

                {/* Auto-renew disclosure, platform-specific */}
                <Text style={[styles.disclosure, { color: theme.textMuted }]}>
                  {Platform.OS === "ios"
                    ? "המנוי מתחדש אוטומטית בסוף כל תקופה אלא אם בוטל לפחות 24 שעות לפני סוף התקופה. התשלום יחויב דרך חשבון Apple ID. ניתן לנהל ולבטל את המנוי בהגדרות החשבון ב-App Store."
                    : "המנוי מתחדש אוטומטית בסוף כל תקופה אלא אם בוטל לפחות 24 שעות לפני סוף התקופה. התשלום יחויב דרך חשבון Google. ניתן לנהל ולבטל את המנוי בהגדרות המנויים ב-Google Play."}
                </Text>

                {/* Required: Terms of Use (EULA) + Privacy Policy links */}
                <View style={styles.legalRow}>
                  <Pressable
                    onPress={() => router.push("/legal" as never)}
                    accessibilityRole="link"
                    accessibilityLabel="תנאי שימוש"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={[styles.legalLink, { color: theme.textMuted }]}>תנאי שימוש</Text>
                  </Pressable>
                  <Text style={[styles.legalSeparator, { color: theme.textMuted }]}> · </Text>
                  <Pressable
                    onPress={() => router.push("/legal" as never)}
                    accessibilityRole="link"
                    accessibilityLabel="מדיניות פרטיות"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={[styles.legalLink, { color: theme.textMuted }]}>מדיניות פרטיות</Text>
                  </Pressable>
                  <Text style={[styles.legalSeparator, { color: theme.textMuted }]}> · </Text>
                  <Pressable
                    onPress={() => Linking.openURL(APPLE_STD_EULA)}
                    accessibilityRole="link"
                    accessibilityLabel="EULA, תנאי שימוש סטנדרטיים של Apple, נפתח בדפדפן"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={[styles.legalLink, { color: theme.textMuted }]}>EULA</Text>
                  </Pressable>
                </View>

                <Pressable onPress={() => { captureEvent('paywall_dismissed', { paywall: 'subscription_pricing', source }); if (returnTo) { router.replace(returnTo as never); } else if (router.canGoBack()) { router.back(); } else { router.replace('/(tabs)' as never); } }} style={styles.noThanksBtn} accessibilityRole="button" accessibilityLabel="ליציאה" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={[styles.noThanksText, { color: theme.textMuted }]}>ליציאה</Text>
                </Pressable>

                <Pressable onPress={handleRestore} style={styles.noThanksBtn} accessibilityRole="button" accessibilityLabel="שחזור רכישות" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={[styles.noThanksText, { color: theme.textMuted }]}>שחזור רכישות</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: DUO.white,
  },

  // Hero
  heroGradient: {
    paddingBottom: 4,
    minHeight: 160,
    position: "relative",
    overflow: "hidden",
  },
  backRow: {
    paddingHorizontal: 16,
    paddingTop: 4,
    alignItems: "flex-end",
  },
  sparkle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  mascotContainer: {
    alignItems: "center",
    marginTop: -12,
  },
  mascot: {
    width: 160,
    height: 160,
  },
  proofContainer: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingBottom: 8,
    marginTop: -4,
  },
  proofText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
    textAlign: "center",
    lineHeight: 28,
    writingDirection: "rtl" as const,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  proofHighlight: {
    color: DUO.green,
    fontSize: 24,
    fontWeight: "900",
  },

  // Cloud transition
  cloudTransition: {
    height: 40,
    marginTop: -20,
    overflow: "hidden",
    zIndex: 1,
  },
  cloudArc: {
    position: "absolute",
    top: -40,
    left: -60,
    right: -60,
    height: 80,
    borderBottomLeftRadius: SCREEN_WIDTH,
    borderBottomRightRadius: SCREEN_WIDTH,
    backgroundColor: DUO.gradientBottom,
  },

  // Body
  body: {
    backgroundColor: DUO.white,
    paddingHorizontal: 20,
    flex: 1,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    marginTop: -20,
    zIndex: 1,
  },

  // Column headers
  columnHeaders: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 0,
    marginBottom: 8,
    paddingRight: 4,
  },
  colHeaderFree: {
    width: 64,
    fontSize: 13,
    fontWeight: "700",
    color: DUO.textMuted,
    textAlign: "center",
  },
  proBadge: {
    width: 64,
    backgroundColor: DUO.blue,
    borderRadius: 8,
    paddingVertical: 5,
    alignItems: "center",
    shadowColor: DUO.blue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  proBadgeText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: 1,
  },

  // Feature rows
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: DUO.divider,
    paddingVertical: 8,
  },
  featureLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: DUO.textDark,
    writingDirection: "rtl" as const,
    textAlign: "right",
  },
  featureCells: {
    flexDirection: "row",
    alignItems: "center",
  },
  freeCell: {
    width: 64,
    alignItems: "center",
  },
  proCell: {
    width: 64,
    alignItems: "center",
  },
  featureLimitText: {
    fontSize: 11,
    fontWeight: "600",
    color: '#6b7280',
    textAlign: "center",
  },
  featureLimitTextPro: {
    color: DUO.green,
    fontWeight: "700",
  },

  // CTA
  ctaSection: {
    marginTop: 4,
    alignItems: "center",
    paddingBottom: 16,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    writingDirection: 'rtl' as const,
  },
  ctaWrapper: {
    width: "100%",
    maxWidth: 300,
    borderRadius: 100,
    shadowColor: DUO.blue,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 12,
  },
  ctaButtonBase: {
    borderRadius: 100,
    width: "100%",
    overflow: "hidden",
  },
  ctaButtonGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 100,
    minHeight: 66,
  },
  ctaLottie: {
    width: 34,
    height: 34,
  },
  priceMain: {
    fontSize: 22,
    fontWeight: "900",
    marginTop: 10,
    textAlign: "center",
  },
  disclosure: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
    paddingHorizontal: 16,
    textAlign: "center",
    writingDirection: "rtl" as const,
  },
  legalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  legalLink: {
    fontSize: 12,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  legalSeparator: {
    fontSize: 12,
  },
  priceHint: {
    fontSize: 12,
    fontWeight: "600",
    color: DUO.textMuted,
    marginTop: 6,
  },
  noThanksBtn: {
    paddingVertical: 4,
  },
  noThanksText: {
    fontSize: 12,
    fontWeight: "600",
    color: DUO.textMuted,
    textDecorationLine: "underline",
  },
  currentPlanBadge: {
    backgroundColor: DUO.green,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    shadowColor: DUO.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  currentPlanText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#ffffff",
  },
});
