// ---------------------------------------------------------------------------
// Investments Hub, central tab for Trading Hub + Real Assets (PRD 38/39)
// ---------------------------------------------------------------------------

import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, Modal, ScrollView } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
  useReducedMotion,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, TrendingUp, Building2, Briefcase, Wallet } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import LottieView from "lottie-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEntranceAnimation, fadeInUp, fadeInScale, SPRING_BOUNCY } from "../../utils/animations";
import { FINN_STANDARD } from "../retention-loops/finnMascotConfig";
import { useEconomy } from "../economy/useEconomy";
import { useTutorialStore } from "../../stores/useTutorialStore";
import { useTradingStore } from "../trading-hub/useTradingStore";
import { useRealAssetsStore } from "../assets/useRealAssetsStore";
import { getPyramidStatus } from "../../utils/progression";
import { tapHaptic } from "../../utils/haptics";
import { Lock } from "lucide-react-native";
import { GoldCoinIcon } from "../../components/ui/GoldCoinIcon";
import { NotificationPermissionBanner } from "../../components/ui/NotificationPermissionBanner";
import { SupercellButton } from "../../components/ui/SupercellButton";
import { useHoldingsStore } from "../net-worth-dashboard/holdings/useHoldingsStore";

const ASSETS_INTRO_DISMISSED_KEY = "assets_market_intro_dismissed";
// Real-holdings dashboard hue (matches /net-worth-dashboard).
const HOLDINGS_PINK = "#ec4899";

export function InvestmentsHubScreen() {
  const isFocused = useIsFocused();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: economyData } = useEconomy();
  const coins = economyData?.coins ?? 0;
  const xp = economyData?.xp ?? 0;
  const { layer } = getPyramidStatus(xp);
  const walkthroughBypass = !useTutorialStore((s) => s.hasSeenAppWalkthrough);
  const isInvestmentsUnlocked = layer >= 2 || walkthroughBypass;
  const isTradingUnlocked = layer >= 2 || walkthroughBypass;

  const positions = useTradingStore((s) => s.positions);
  const ownedAssets = useRealAssetsStore((s) => s.ownedAssets);
  const totalDailyIncome = useRealAssetsStore((s) => s.totalDailyIncome);

  const totalPnl = positions.reduce((sum, p) => {
    const pnl = ((p.currentPrice - p.entryPrice) / p.entryPrice) * p.amountInvested;
    return sum + pnl;
  }, 0);
  const pnl = Math.round(totalPnl);

  const ownedCount = Object.keys(ownedAssets).length;
  const holdingsCount = useHoldingsStore((s) => s.holdings.length);

  // Walkthrough step 3 → glow on the trading card (UX-19, Yoav 18.9.26).
  // Used to auto-push /trading-hub after 2s with no touch ("hidden state");
  // now the card pulses and the user taps it themselves.
  const walkthroughStep = useTutorialStore((s) => s.appWalkthroughStep);
  const hasSeenWT = useTutorialStore((s) => s.hasSeenAppWalkthrough);
  const tradingGlowActive = !hasSeenWT && walkthroughStep === 3;
  const reduceMotion = useReducedMotion();
  const tradingPulse = useSharedValue(0);
  useEffect(() => {
    if (!tradingGlowActive) {
      cancelAnimation(tradingPulse);
      tradingPulse.value = 0;
      return;
    }
    if (reduceMotion) {
      tradingPulse.value = 1;
      return;
    }
    tradingPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 450, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.35, { duration: 450, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    return () => cancelAnimation(tradingPulse);
  }, [tradingGlowActive, reduceMotion, tradingPulse]);
  const tradingGlowStyle = useAnimatedStyle(() => ({
    borderRadius: 14,
    borderWidth: tradingPulse.value > 0.05 ? 2.5 : 0,
    borderColor: `rgba(14, 165, 233, ${tradingPulse.value})`,
    shadowColor: "#0ea5e9",
    shadowOpacity: tradingPulse.value * 0.9,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: tradingPulse.value > 0.05 ? 12 : 0,
  }));

  // ── Assets Market intro modal ──
  const [showAssetsIntro, setShowAssetsIntro] = useState(false);
  const [assetsIntroDismissed, setAssetsIntroDismissed] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ASSETS_INTRO_DISMISSED_KEY).then((val) => {
      if (val === "true") setAssetsIntroDismissed(true);
    });
  }, []);

  const handleAssetsPress = useCallback(() => {
    tapHaptic();
    if (assetsIntroDismissed) {
      router.push("/assets-market" as never);
    } else {
      setShowAssetsIntro(true);
    }
  }, [assetsIntroDismissed, router]);

  const handleAssetsIntroContinue = useCallback(() => {
    setShowAssetsIntro(false);
    router.push("/assets-market" as never);
  }, [router]);

  const handleAssetsIntroDontShow = useCallback(() => {
    tapHaptic();
    AsyncStorage.setItem(ASSETS_INTRO_DISMISSED_KEY, "true");
    setAssetsIntroDismissed(true);
    setShowAssetsIntro(false);
    router.push("/assets-market" as never);
  }, [router]);

  const finnStyle = useEntranceAnimation(fadeInScale, { delay: 0, spring: SPRING_BOUNCY });
  const summaryStyle = useEntranceAnimation(fadeInUp, { delay: 60 });
  const tradingStyle = useEntranceAnimation(fadeInUp, { delay: 120 });
  const marketStyle = useEntranceAnimation(fadeInUp, { delay: 180 });
  const portfolioStyle = useEntranceAnimation(fadeInUp, { delay: 230 });
  const holdingsStyle = useEntranceAnimation(fadeInUp, { delay: 280 });

  /* ── Stage-1 lock screen ── */
  if (!isInvestmentsUnlocked) {
    return (
      <View style={s.root}>
        {/* UX-03 (Yoav 18.9.26): opacity only on the Lottie — the text was
            #cbd5e1 under a 0.55 block (≈1.5:1, fails AA / תקנה 5568) — and a
            real way out instead of a dead end. */}
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
          <View style={{ width: 100, height: 100, overflow: "hidden", marginBottom: 20, opacity: 0.55 }}>
            {/* Focus-gated: an ungated loop here kept burning frames off-tab. */}
            {isFocused && (
              <LottieView
                source={require("../../../assets/lottie/wired-flat-161-growth-hover-pinch.json")}
                style={{ width: 100, height: 100 }}
                autoPlay loop speed={0.5}
              />
            )}
          </View>
          <Lock size={40} color="#64748b" style={{ marginBottom: 12 }} />
          <Text style={{ fontSize: 22, fontWeight: "900", color: "#334155", textAlign: "center", writingDirection: "rtl", marginBottom: 8 }}>
            מרכז ההשקעות
          </Text>
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#64748b", textAlign: "center", writingDirection: "rtl", lineHeight: 24 }}>
            נפתח בשלב 2
          </Text>
          <Text style={{ fontSize: 13, color: "#64748b", textAlign: "center", writingDirection: "rtl", marginTop: 8, marginBottom: 24 }}>
            התקדמו לשלב 2 כדי לפתוח
          </Text>
          <View style={{ alignSelf: "stretch" }}>
            <SupercellButton
              label="ממשיכים ללמוד"
              variant="blue"
              onPress={() => router.push("/(tabs)/index" as never)}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* FRONT-DECLUTTER (Yoav 11.7): thin permission banner KILLED app-wide —
          2,900 dismissals vs 3 actions in 14d. The appointment primer +
          day-2 ritual own the permission ask now. */}
      {false && <NotificationPermissionBanner />}
      {/* UX-02 (Yoav 18.9.26): the hub is ~574px of content on ~500px of
          SE-height — a ScrollView instead of a flex:1 View so the last card
          never hides under the tab bar (or any Dynamic-Type size). */}
      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Page title ── */}
        <Text style={s.pageTitle}>מרכז ההשקעות</Text>

        {/* ── Finn banner ── */}
        <Animated.View style={finnStyle}>
          <LinearGradient
            colors={["#f0f9ff", "#e0f2fe"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[s.finnBanner, {
              borderWidth: 1.5,
              borderColor: "#bae6fd",
              borderBottomWidth: 4,
              borderBottomColor: "#bae6fd",
              shadowColor: "#38bdf8",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
            }]}
          >
            <View style={s.finnTextCol}>
              <Text style={s.finnMessage}>בונים אימפריה{"\n"}פיננסית</Text>
            </View>
            <View style={s.finnLottieWrap}>
              <ExpoImage source={FINN_STANDARD} accessible={false}
                style={s.finnLottie}
                contentFit="contain"
               />
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Portfolio Card ── */}
        <Animated.View style={summaryStyle}>
          <View style={s.portfolioCard}>
            <View style={s.portfolioTextCol}>
              {/* UX-05: this is the virtual coin balance, not the real
                  ₪ holdings portfolio that lives in /net-worth-dashboard. */}
              <Text style={s.portfolioTitle}>המטבעות שלך למסחר</Text>
              <View style={s.portfolioRow}>
                <GoldCoinIcon size={22} />
                <Text style={s.portfolioValue}>{coins.toLocaleString()}</Text>
              </View>
              {/* UX-04: a real button (was a role="text" Pressable with no
                  onPress), correct sign (was "+-120" on a loss), and a
                  ChevronLeft = forward in RTL (was "→" = back). */}
              <Pressable
                style={s.pnlPill}
                onPress={() => { tapHaptic(); router.push("/trading-hub" as never); }}
                accessibilityRole="button"
                accessibilityLabel={`רווח והפסד ${pnl}, פתיחת זירת המסחר`}
                hitSlop={6}
              >
                <Text style={[s.pnlText, { color: pnl >= 0 ? "#15803d" : "#dc2626" }]}>
                  {pnl >= 0 ? "+" : ""}{pnl} רווח/הפסד
                </Text>
                <ChevronLeft size={14} color="#64748b" />
              </Pressable>
            </View>
            <View style={s.portfolioImageWrap}>
              {/* Focus-gated: an ungated loop here kept burning frames off-tab. */}
              {isFocused && (
                <LottieView
                  source={require("../../../assets/lottie/wired-flat-161-growth-hover-pinch.json")}
                  style={{ width: 90, height: 90 }}
                  autoPlay
                  loop
                />
              )}
            </View>
          </View>
        </Animated.View>

        {/* ── Navigation Cards ──
            UX-34: ChevronLeft is the LAST child of each row-reverse card so
            it renders on the left edge (forward in RTL), icon tile on the
            right — same order as the Tools hub. */}

        {/* Trading Hub */}
        <Animated.View style={[tradingStyle, tradingGlowStyle]}>
          {isTradingUnlocked ? (
            <Pressable onPress={() => router.push("/trading-hub" as never)} style={s.navCard} accessibilityRole="button" accessibilityLabel="זירת המסחר">
              <View style={[s.navIconBox, { backgroundColor: "#f1f5f9" }]}>
                <TrendingUp size={26} color="#64748b" />
              </View>
              <View style={s.navTextCol}>
                <Text style={s.navTitle}>מסחר בשוק ההון</Text>
                <Text style={s.navDesc}>
                  {positions.length > 0 ? `${positions.length} פוזיציות פתוחות` : "קונים ומוכרים מניות ומדדים בלייב"}
                </Text>
              </View>
              <ChevronLeft size={20} color="#94a3b8" />
            </Pressable>
          ) : (
            <View style={[s.navCard, { opacity: 0.65 }]}>
              <View style={[s.navIconBox, { backgroundColor: "#f1f5f9" }]}>
                <TrendingUp size={26} color="#64748b" />
              </View>
              <View style={s.navTextCol}>
                <Text style={s.navTitle}>מסחר בשוק ההון</Text>
                <View style={s.lockRow}>
                  <Text style={s.navDesc}>נפתח בהגעה לרמה 2</Text>
                  <Lock size={12} color="#64748b" />
                </View>
              </View>
              <View />
            </View>
          )}
        </Animated.View>

        {/* Real Assets Market */}
        <Animated.View style={marketStyle}>
          <Pressable onPress={handleAssetsPress} style={s.navCard} accessibilityRole="button" accessibilityLabel="שוק הנכסים">
            <View style={[s.navIconBox, { backgroundColor: "#eff6ff" }]}>
              <Building2 size={26} color="#3b82f6" />
            </View>
            <View style={s.navTextCol}>
              <Text style={s.navTitle}>זירת הנכסים</Text>
              <Text style={s.navDesc}>נדל"ן, עסקים ועסקאות גדולות</Text>
            </View>
            <ChevronLeft size={20} color="#94a3b8" />
          </Pressable>
        </Animated.View>

        {/* My Portfolio (in-game assets) */}
        <Animated.View style={portfolioStyle}>
          <Pressable onPress={() => router.push("/assets" as never)} style={s.navCard} accessibilityRole="button" accessibilityLabel="הנכסים שלי">
            <View style={[s.navIconBox, { backgroundColor: "#eff6ff" }]}>
              <Briefcase size={26} color="#3b82f6" />
            </View>
            <View style={s.navTextCol}>
              <Text style={s.navTitle}>הנכסים שלי</Text>
              <Text style={s.navDesc}>צפייה וניהול האחזקות הקיימות</Text>
            </View>
            <ChevronLeft size={20} color="#94a3b8" />
          </Pressable>
        </Animated.View>

        {/* UX-18 (Yoav 18.9.26): the REAL ₪ stock portfolio (holdings/) was
            reachable only from the Tools tab. Fourth card → dashboard. */}
        <Animated.View style={holdingsStyle}>
          <Pressable
            onPress={() => { tapHaptic(); router.push("/net-worth-dashboard" as never); }}
            style={s.navCard}
            accessibilityRole="button"
            accessibilityLabel={
              holdingsCount > 0
                ? `תיק המניות שלי, ${holdingsCount} ניירות, מעקב חי`
                : "תיק המניות שלי, מעקב חי אחרי מניות שבאמת יש לכם"
            }
          >
            <View style={[s.navIconBox, { backgroundColor: "#fdf2f8" }]}>
              <Wallet size={26} color={HOLDINGS_PINK} />
            </View>
            <View style={s.navTextCol}>
              <Text style={s.navTitle}>תיק המניות שלי</Text>
              <Text style={s.navDesc}>
                {holdingsCount > 0
                  ? `${holdingsCount === 1 ? "נייר אחד" : `${holdingsCount} ניירות`} · מעקב חי`
                  : "מעקב חי אחרי מניות שבאמת יש לכם"}
              </Text>
            </View>
            <ChevronLeft size={20} color="#94a3b8" />
          </Pressable>
        </Animated.View>

      </ScrollView>

      {/* ── Assets Market Intro Modal ── */}
      <Modal
        visible={showAssetsIntro}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAssetsIntro(false)}
        accessibilityViewIsModal
      >
        <Pressable
          style={s.introOverlay}
          onPress={() => setShowAssetsIntro(false)}
          accessibilityRole="button"
          accessibilityLabel="סגור"
        >
          <Pressable style={s.introSheet} onPress={() => {}} accessible={false}>
            <Animated.View entering={FadeInDown.duration(300)}>
              {/* Finn */}
              <View style={s.introFinnWrap}>
                <ExpoImage
                  source={FINN_STANDARD}
                  style={{ width: 80, height: 80 }}
                  contentFit="contain"
                  accessible={false}
                />
              </View>

              {/* Title */}
              <Text style={s.introTitle}>ברוכים הבאים לזירת הנכסים!</Text>

              {/* Description */}
              <Text style={s.introDesc}>
                כאן תוכלו לרכוש נכסים אמיתיים כמו דירות, עסקים וחנויות.{"\n"}
                כל נכס מייצר הכנסה פסיבית יומית שנכנסת ישירות לחשבון שלכם.{"\n\n"}
                🏠 קנו נדל"ן והשכירו{"\n"}
                🏪 רכשו עסקים ותנו להם לעבוד{"\n"}
                📈 שדרגו נכסים להגדלת הרווחים
              </Text>

              {/* CTA, הבנתי */}
              <Pressable
                onPress={handleAssetsIntroContinue}
                style={({ pressed }) => [s.introBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
                accessibilityRole="button"
                accessibilityLabel="הבנתי, לזירה"
              >
                <LinearGradient
                  colors={["#3b82f6", "#2563eb"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.introBtnGradient}
                >
                  <Text style={s.introBtnText}>הבנתי, לזירה</Text>
                </LinearGradient>
              </Pressable>

              {/* Don't show again */}
              <Pressable
                onPress={handleAssetsIntroDontShow}
                style={s.introDontShow}
                accessibilityRole="button"
                accessibilityLabel="אל תראו לי הסבר זה שוב"
              >
                <Text style={s.introDontShowText}>אל תראו לי הסבר זה שוב</Text>
              </Pressable>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 10,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#1e293b",
    writingDirection: "rtl",
    textAlign: "right",
    alignSelf: "flex-end",
  },

  // ── Finn banner ──
  finnBanner: {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    overflow: "hidden",
  },
  finnLottieWrap: {
    width: 112,
    height: 112,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.6)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  finnLottie: {
    width: 96,
    height: 96,
  },
  finnTextCol: {
    flex: 1,
    alignItems: "flex-end",
  },
  finnMessage: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0f172a",
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 24,
  },

  // ── Portfolio card ──
  portfolioCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row-reverse",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  portfolioTextCol: {
    flex: 1,
    alignItems: "flex-end",
    gap: 6,
  },
  portfolioTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1e293b",
    writingDirection: "rtl",
    textAlign: "right",
  },
  portfolioRow: {
    flexDirection: "row-reverse",
    alignItems: "baseline",
    gap: 6,
  },
  portfolioLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
  },
  portfolioValue: {
    fontSize: 26,
    fontWeight: "900",
    color: "#1d4ed8",
  },
  pnlPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f1f5f9",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  pnlText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
  },
  portfolioImageWrap: {
    width: 90,
    height: 90,
    overflow: "hidden",
  },

  // ── Navigation cards ──
  navCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 14,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  navIconBox: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  navTextCol: {
    flex: 1,
    alignItems: "flex-end",
  },
  navTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#1e293b",
    textAlign: "right",
    writingDirection: "rtl",
  },
  navDesc: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 2,
  },
  lockRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },

  // ── Intro modal ──
  introOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  introSheet: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    width: "100%",
    maxWidth: 380,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  introFinnWrap: {
    alignSelf: "center",
    marginBottom: 16,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#1e293b",
    textAlign: "center",
    writingDirection: "rtl",
    marginBottom: 12,
  },
  introDesc: {
    fontSize: 15,
    fontWeight: "600",
    color: "#475569",
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 24,
    marginBottom: 20,
  },
  introBtn: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  },
  introBtnGradient: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: "center",
    borderRadius: 16,
  },
  introBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
  },
  introDontShow: {
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  introDontShowText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    textAlign: "center",
    writingDirection: "rtl",
  },
});
