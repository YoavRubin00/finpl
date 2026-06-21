import { useState, useCallback, useEffect, useRef } from "react";
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
import { ParentalConsentGate } from "../legal/ParentalConsentGate";
import { ParentalEmailModal } from "../legal/ParentalEmailModal";
import { selectHasActiveParentalConsent, useParentalConsentStore } from "../legal/useParentalConsent";
import { getOffering, purchasePackage, RC_ENTITLEMENT_PRO, restorePurchases, isPurchaseCancelledError, purchaseErrorCode } from "../../services/revenueCat";
import type { PurchasesPackage } from "../../services/revenueCat";
import { BackButton } from "../../components/ui/BackButton";
import { useTheme } from "../../hooks/useTheme";
import { useMonetizationIntentStore } from "../monetization/useMonetizationIntentStore";
import { useBandit } from "../bandit/useBandit";
import { setPersonProperties, captureEvent } from "../../lib/posthog";
import { track } from "../../lib/analytics/events";
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
  { label: "אנרגיה", free: "20", pro: "אינסוף ♾️" },
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
  const isGuest = useAuthStore((s) => s.isGuest);
  // Minor users (ageGroup === 'minor' = 16-17) take one of two flows:
  //
  //   • Hybrid (default) — quick email modal collects parent's address,
  //     purchase proceeds immediately, parent gets a post-purchase email
  //     with a one-click revoke link. UX-friendly.
  //
  //   • Hard gate (fallback) — full ParentalConsentGate: parent must
  //     click an emailed confirm link BEFORE purchase. Used only after
  //     a previous revoke (parent already showed they want upfront control).
  const isMinor = useAuthStore((s) => s.profile?.ageGroup === 'minor');
  const hasParentalConsent = useParentalConsentStore(selectHasActiveParentalConsent);
  const consentStatus = useParentalConsentStore((s) => s.status);
  const notifyPurchase = useParentalConsentStore((s) => s.notifyPurchase);
  const refreshConsentStatus = useParentalConsentStore((s) => s.refreshStatus);
  // After a previous revoke, fall back to Hard gate (parent already proved
  // they want upfront control). Any other state (none/pending/expired/
  // confirmed) uses Hybrid.
  const useHardGateFallback = isMinor && consentStatus === 'revoked';
  const minorNeedsHybridModal = isMinor && !hasParentalConsent && !useHardGateFallback;
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [pendingPurchaseAfterEmail, setPendingPurchaseAfterEmail] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch latest consent state on mount so we route correctly even after the
  // user navigates away and comes back.
  useEffect(() => {
    if (isMinor) void refreshConsentStatus({ force: true });
  }, [isMinor, refreshConsentStatus]);
  const [activePackage, setActivePackage] = useState<PurchasesPackage | null>(null);
  // Offering availability state machine. Drives the CTA so the user can NEVER
  // tap into a raw error: 'loading' shows a spinner, 'unavailable' turns the
  // CTA into a silent retry, only 'ready' exposes the real purchase button.
  // App Review 2.1a rejected 1.3.3 for an error alert on a purchase attempt —
  // when offerings don't load in the review sandbox the old code popped
  // Alert("שגיאה","לא נמצאו חבילות מנוי"). This makes that impossible.
  const [offerState, setOfferState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  // Soft, non-blocking notice for a genuine (non-cancel) purchase failure —
  // replaces the old Alert("שגיאת תשלום", rawSdkString).
  const [purchaseNotice, setPurchaseNotice] = useState<string | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  const { mutateAsync: syncFromRC } = useSyncFromRevenueCat();

  const { payload: paywallPayload, trackImpression, trackConversion, trackDismiss } = useBandit('upgrade_paywall_headline');

  useEffect(() => {
    useMonetizationIntentStore.getState().trackPricingVisit();
    trackImpression();
    track({ name: 'paywall_viewed', props: { paywall: 'subscription_pricing', source } });
  }, [trackImpression, source]);

  // Load the offering so we can show the localized price + gate the CTA on a
  // real, purchasable package. Reused as the 'unavailable' retry handler.
  const loadOffering = useCallback(async () => {
    if (mountedRef.current) setOfferState('loading');
    try {
      const offering = await getOffering();
      const pkg =
        offering?.monthly ?? offering?.annual ?? offering?.availablePackages?.[0] ?? null;
      if (!mountedRef.current) return;
      if (pkg) {
        setActivePackage(pkg);
        setOfferState('ready');
      } else {
        // Offerings empty / not loaded (the classic App Review sandbox case) —
        // degrade to a silent retry CTA, never a raw error alert.
        setOfferState('unavailable');
      }
    } catch {
      if (mountedRef.current) setOfferState('unavailable');
    }
  }, []);

  useEffect(() => {
    void loadOffering();
  }, [loadOffering]);

  // Diagnostic (Moni 2026-06-13): report whether the user actually got a buyable
  // CTA. 137 paywall views / 0 purchase signals could mean "offerings never load
  // → purchase impossible" (the App Review 2.1a path) rather than low intent.
  // Fire once per settled state so PostHog can show the 'unavailable' rate.
  const ctaStateTrackedRef = useRef<'ready' | 'unavailable' | null>(null);
  useEffect(() => {
    if (offerState === 'loading') return;
    if (ctaStateTrackedRef.current === offerState) return;
    ctaStateTrackedRef.current = offerState;
    track({ name: 'paywall_cta_state', props: { state: offerState, source } });
  }, [offerState, source]);

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
    // #9 (Yoav 2026-06-15): a guest can't really go Pro — their RevenueCat
    // app_user_id is anonymous, so a purchase can't be attributed to an account
    // and is lost on reinstall. Send them to register first, then bounce back
    // to THIS paywall as a real user to complete the purchase.
    if (isGuest) {
      captureEvent('register_cta_shown', { source: 'pro_purchase' });
      Alert.alert(
        'רגע לפני Pro',
        'כדי לפתוח את Pro צריך חשבון — ההרשמה חינמית ולוקחת שנייה. נרשמים, וחוזרים בדיוק לכאן.',
        [
          { text: 'אולי אחר כך', style: 'cancel', onPress: () => captureEvent('register_cta_dismissed', { source: 'pro_purchase' }) },
          {
            text: 'הרשמה והמשך',
            onPress: () => {
              captureEvent('register_cta_accepted', { source: 'pro_purchase' });
              const back = `/pricing?source=${encodeURIComponent(source)}`;
              router.replace(`/(auth)/register?returnTo=${encodeURIComponent(back)}` as never);
            },
          },
        ],
      );
      return;
    }
    if (!displayName) {
      Alert.alert("שגיאה", "יש להתחבר כדי להירשם.");
      return;
    }
    // Hard-gate fallback (after a previous revoke): the parent must click
    // the confirm link in their email BEFORE we let the purchase happen.
    // The CTA is replaced by ParentalConsentGate in this case, but we
    // guard the action too in case a future call-site bypasses the UI.
    if (useHardGateFallback && !hasParentalConsent) {
      Alert.alert(
        "נדרש אישור הורה",
        "רכישת מנוי לגיל 16–17 דורשת אישור הורה. השלם/השלימי את האישור בלוח הירוק למטה.",
        [{ text: "הבנתי" }],
      );
      return;
    }
    // Hybrid flow: minor without an active consent row → first collect
    // the parent's email via the modal. After submission, this same
    // handleUpgrade is called again with the consent row in place, and
    // we fall through to RevenueCat. Set the pending flag so the modal's
    // success callback knows to fire RC immediately.
    if (minorNeedsHybridModal) {
      setPendingPurchaseAfterEmail(true);
      setEmailModalVisible(true);
      return;
    }

    setIsLoading(true);
    setPurchaseNotice(null);
    try {
      // The CTA only reaches here when offerState === 'ready', so activePackage
      // is already a valid purchasable package. Re-fetch only as a fallback
      // (e.g. the minor email-modal path re-invokes this). If still nothing,
      // flip to the 'unavailable' retry state — NO raw error alert. This is the
      // path App Review hit on 1.3.3 (empty offerings → Alert popup).
      let pkg: PurchasesPackage | null = activePackage;
      if (!pkg) {
        const offering = await getOffering();
        pkg = offering?.monthly ?? offering?.annual ?? offering?.availablePackages?.[0] ?? null;
      }
      if (!pkg) {
        setOfferState('unavailable');
        return;
      }

      // Initiate-checkout signal — fires BEFORE the native paywall opens, so we
      // still get attribution even if the user abandons at the system payment sheet.
      logTrialStart(pkg.packageType);
      // PostHog funnel step (Moni 2026-06-13): the Pro funnel had NO "tapped
      // subscribe" event — it jumped from paywall_viewed straight to the
      // OUTCOME (trial_started / subscription_cancelled_at_checkout / _failed),
      // so we couldn't tell how many reached the native sheet vs bounced on the
      // pricing screen itself (the real drop is 252→~12). Reuse purchase_initiated
      // with bundle_type:'subscription' as that intent step; `source` carries the
      // placement so post_walkthrough vs subscription_pricing stays sliceable.
      track({ name: 'purchase_initiated', props: { bundle_id: pkg.identifier, bundle_type: 'subscription', real_money: true, source } });

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
        track({
          name: isTrial ? 'trial_started' : 'subscription_purchased',
          props: {
            plan: pkg.packageType,
            price: pkg.product.priceString,
            trial_days: isTrial ? trialDays : 0,
            source,
          },
        });
        // Patch the PostHog person record so all subsequent insights segment
        // this user as Pro. Without this update, DAU/retention queries with
        // breakdown=is_pro keep returning them as Free even after the purchase.
        setPersonProperties({ is_pro: true });
        await syncFromRC(customerInfo);
        // Hybrid flow: minor just bought Pro — flip the pending consent row
        // to 'confirmed' on the server and fire the post-purchase email to
        // the parent (with one-click revoke link). Fire-and-forget so a
        // network error here doesn't block the purchase celebration. The
        // server is idempotent and the next refreshStatus will reconcile.
        if (isMinor) {
          void notifyPurchase().catch(() => { /* non-fatal */ });
        }
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
      // Cancellation detection is centralized in isPurchaseCancelledError —
      // it checks RevenueCat's `userCancelled` flag AND the structured
      // PURCHASE_CANCELLED_ERROR code AND the legacy message regex, so iOS
      // StoreKit / Android BillingClient cancel codes (which don't contain the
      // word "cancel") stop being miscounted as failures.
      const message = err instanceof Error ? err.message : '';
      if (isPurchaseCancelledError(err)) {
        track({ name: 'subscription_cancelled_at_checkout' });
      } else {
        // Enriched with error_code + platform so any GENUINE failure is
        // diagnosable in PostHog instead of an opaque error string.
        track({ name: 'subscription_purchase_failed', props: { error_message: message || 'unknown', error_code: purchaseErrorCode(err), platform: Platform.OS } });
        // Soft, non-blocking inline notice instead of Alert("שגיאת תשלום", raw).
        // Never surface the raw SDK/StoreKit string in a popup — App Review
        // 2.1a treats a hard error on a purchase attempt as a blocker. The user
        // can just tap the CTA again.
        if (mountedRef.current) {
          setPurchaseNotice("התשלום לא הושלם. אפשר לנסות שוב בעוד רגע.");
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [displayName, isGuest, source, useHardGateFallback, hasParentalConsent, minorNeedsHybridModal, isMinor, notifyPurchase, syncFromRC, hasSeenProWelcome, router, trackConversion, trialDays, returnTo, activePackage]);

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
            {/* Back button — white + circular bg so it pops on the dark
                gradient (user reported the default gray ChevronRight was
                invisible against navy bg, 2026-06-01).
                onPress override: if we were sent here from a specific
                lesson/screen via ?returnTo=, replace with that destination
                instead of falling through to router.back(). Without this,
                the back chevron loops back to mod-0-4 (which is what sent
                the user to /pricing) and re-triggers the paywall — same
                logic the bottom "noThanks" button already uses. */}
            <View style={styles.backRow}>
              <View style={styles.backBtnBg}>
                <BackButton
                  color="#ffffff"
                  onPress={returnTo ? () => router.replace(returnTo as never) : undefined}
                />
              </View>
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

            {/* Fin mascot + trial speech bubble */}
            <View style={styles.mascotContainer}>
              <ExpoImage source={FINN_DANCING}
                style={styles.mascot}
                contentFit="contain"
                accessible={false}
              />
              {/* Speech bubble to the LEFT of Captain Shark — reinforces the
                  free-trial value prop. Shown on every visit (יואב 2026-06). */}
              <Animated.View
                entering={FadeInDown.delay(350).duration(420)}
                style={styles.trialBubble}
                accessibilityRole="text"
                accessibilityLabel="הצעה: נסו שבוע בחינם, ללא סיכון"
              >
                <Text style={styles.trialBubbleText} allowFontScaling={false}>
                  נסו שבוע בחינם,{"\n"}ללא סיכון
                </Text>
                <View style={styles.trialBubbleTail} pointerEvents="none" />
              </Animated.View>
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
                <Text style={styles.currentPlanText}>✦ המנוי שלכם פעיל</Text>
              </View>
            ) : useHardGateFallback && !hasParentalConsent ? (
              // Hard-gate fallback after a previous revoke: parent must
              // pre-confirm via email before the CTA is shown again.
              <ParentalConsentGate />
            ) : (
              <>
                <Animated.View style={[styles.ctaWrapper, ctaGlowStyle]}>
                  <Pressable
                    // 'unavailable' → the button silently retries loading the
                    // offering (no purchase attempt, no error popup). Otherwise
                    // it's the real purchase CTA. Disabled while a purchase is
                    // in flight OR the offering is still loading.
                    // Guest takes precedence: a guest has no real RC account, so
                    // the offering resolves to 'unavailable' and the CTA used to
                    // get stuck in the silent retry loop ("המנוי אינו זמין"). For a
                    // guest the real blocker is the missing account — route them to
                    // register (handleUpgrade already handles the guest→register
                    // flow), and don't gate the button on the offering loading.
                    onPress={isGuest ? handleUpgrade : (offerState === 'unavailable' ? loadOffering : handleUpgrade)}
                    disabled={isLoading || (!isGuest && offerState === 'loading')}
                    accessibilityRole="button"
                    accessibilityLabel={isGuest ? 'להירשם עכשיו' : (offerState === 'unavailable' ? 'נסה שוב' : 'שדרג עכשיו ל-PRO')}
                    accessibilityState={{ disabled: isLoading || (!isGuest && offerState === 'loading') }}
                    style={({ pressed }) => [
                      styles.ctaButtonBase,
                      pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                      (isLoading || (!isGuest && offerState === 'loading')) && { opacity: 0.6 },
                    ]}
                  >
                    <LinearGradient
                      colors={["#0a2540", "#164e63", "#0a2540"]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={styles.ctaButtonGradient}
                    >
                      {(isLoading || (!isGuest && offerState === 'loading')) ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                          <ActivityIndicator color="#ffffff" size="small" />
                          {offerState === 'loading' && !isLoading ? (
                            <Text style={styles.ctaText}>טוען מסלולים…</Text>
                          ) : null}
                        </View>
                      ) : isGuest ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                          <View accessible={false}>
                            <LottieView
                              source={require("../../../assets/lottie/Pro Animation 3rd.json")}
                              style={styles.ctaLottie}
                              autoPlay
                              loop
                            />
                          </View>
                          <Text style={styles.ctaText}>להירשם עכשיו</Text>
                        </View>
                      ) : offerState === 'unavailable' ? (
                        <Text style={styles.ctaText}>נסה שוב</Text>
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

                {/* Silent "unavailable" / soft purchase-failure notices —
                    friendly, non-blocking, never a hard error alert. */}
                {isGuest ? (
                  <Text style={[styles.priceMain, { color: theme.textMuted, fontSize: 12, marginTop: 6 }]}>
                    כדי להפעיל Pro צריך חשבון — חינם, לוקח שנייה
                  </Text>
                ) : offerState === 'unavailable' ? (
                  <Text style={[styles.priceMain, { color: theme.textMuted, fontSize: 12, marginTop: 6 }]}>
                    המנוי אינו זמין כרגע. נסו שוב בעוד רגע.
                  </Text>
                ) : null}
                {purchaseNotice ? (
                  <Text style={[styles.priceMain, { color: theme.textMuted, fontSize: 12, marginTop: 6 }]}>
                    {purchaseNotice}
                  </Text>
                ) : null}

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
                {/* Cooling-off disclosure removed from paywall on user
                    request (2026-06-04) — too tall, ate room above the
                    feature comparison. Still covered in Terms §11 + the
                    auto-renew disclosure below + Apple/Google native
                    refund flows. */}

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

                <Pressable onPress={() => { track({ name: 'paywall_dismissed', props: { paywall: 'subscription_pricing', source } }); trackDismiss(); if (returnTo) { router.replace(returnTo as never); } else if (router.canGoBack()) { router.back(); } else { router.replace('/(tabs)' as never); } }} style={styles.noThanksBtn} accessibilityRole="button" accessibilityLabel="ליציאה" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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
      {/* Hybrid flow: quick email-collection modal for minors with no
          existing consent row. Submission writes the pending row + fires
          handleUpgrade so the RC paywall opens immediately. */}
      <ParentalEmailModal
        visible={emailModalVisible}
        onCancel={() => {
          setEmailModalVisible(false);
          setPendingPurchaseAfterEmail(false);
        }}
        onEmailSubmitted={() => {
          setEmailModalVisible(false);
          if (pendingPurchaseAfterEmail) {
            setPendingPurchaseAfterEmail(false);
            // Re-enter handleUpgrade now that the consent row exists; the
            // minorNeedsHybridModal guard at the top will be false this
            // pass (consent status flipped to 'pending') so we fall
            // through to RevenueCat purchase. Small RAF defer so React
            // commits the state update before re-entry.
            requestAnimationFrame(() => { void handleUpgrade(); });
          }
        }}
      />
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
  backBtnBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  sparkle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  mascotContainer: {
    alignItems: "center",
    marginTop: -12,
    position: "relative",
  },
  mascot: {
    width: 160,
    height: 160,
    // Shifted slightly RIGHT so the speech bubble (on the screen-left)
    // has room to breathe + tail aims naturally toward the shark.
    transform: [{ translateX: 22 }],
  },
  trialBubble: {
    position: "absolute",
    // On screen-LEFT — bubble's tail points RIGHT toward Captain Shark
    // (who sits slightly right-of-center after the translateX shift).
    top: 24,
    left: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.96)",
    maxWidth: 200,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  trialBubbleText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0a2540",
    writingDirection: "rtl",
    textAlign: "center",
    lineHeight: 18,
  },
  trialBubbleTail: {
    position: "absolute",
    // Tail on the RIGHT side of the bubble, pointing RIGHT toward the
    // shark (visually "spoken to him"). CSS-triangle: transparent
    // top/bottom + white left border = a right-pointing tip.
    top: 22,
    right: -7,
    width: 0,
    height: 0,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderLeftWidth: 8,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "rgba(255,255,255,0.96)",
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
    // Pinned to the bottom of the screen — pushes the feature-comparison
    // ScrollView upward so the user sees more rows above the fold. User
    // request 2026-06-04: "תוריד הכל למטה שיהיה יותר מקום לראות את ההבדל
    // בין חינמי לפרו".
    marginTop: "auto",
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
  // Minor gate panel — shown instead of the upgrade CTA when ageGroup === 'minor'.
  // Calm copy, no scary red box. We're not blocking the screen, just the purchase.
  minorGate: {
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
    alignSelf: 'stretch',
    marginHorizontal: 16,
  },
  minorGateTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  minorGateBody: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 19,
  },
});
