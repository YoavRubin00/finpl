// ---------------------------------------------------------------------------
// Investments Hub — central tab for Trading Hub + Real Assets (PRD 38/39)
// ---------------------------------------------------------------------------

import { useEffect, useState, useCallback } from "react";
import { View, Text, Image, StyleSheet, Pressable, Modal, Platform } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, TrendingUp, Building2, Briefcase } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import LottieView from "lottie-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeLottie } from "../../components/ui/SafeLottie";
import { useEntranceAnimation, fadeInUp, fadeInScale, SPRING_BOUNCY } from "../../utils/animations";
import { FINN_STANDARD } from "../retention-loops/finnMascotConfig";
import { useEconomyStore } from "../economy/useEconomyStore";
import { useTutorialStore } from "../../stores/useTutorialStore";
import { useTradingStore } from "../trading-hub/useTradingStore";
import { useRealAssetsStore } from "../assets/useRealAssetsStore";
import { getPyramidStatus } from "../../utils/progression";
import { tapHaptic } from "../../utils/haptics";
import { Lock } from "lucide-react-native";
import { GoldCoinIcon } from "../../components/ui/GoldCoinIcon";

const ASSETS_INTRO_DISMISSED_KEY = "assets_market_intro_dismissed";

export function InvestmentsHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const coins = useEconomyStore((s) => s.coins);
  const xp = useEconomyStore((s) => s.xp);
  const { layer } = getPyramidStatus(xp);
  const walkthroughBypass = !useTutorialStore((s) => s.hasSeenAppWalkthrough);
  const isInvestmentsUnlocked = layer >= 2 || walkthroughBypass;
  const isTradingUnlocked = layer >= 4 || walkthroughBypass;

  const positions = useTradingStore((s) => s.positions);
  const ownedAssets = useRealAssetsStore((s) => s.ownedAssets);
  const totalDailyIncome = useRealAssetsStore((s) => s.totalDailyIncome);

  const totalPnl = positions.reduce((sum, p) => {
    const pnl = ((p.currentPrice - p.entryPrice) / p.entryPrice) * p.amountInvested;
    return sum + pnl;
  }, 0);

  const ownedCount = Object.keys(ownedAssets).length;

  // Walkthrough step 3 → auto-open trading hub after 2s
  const walkthroughStep = useTutorialStore((s) => s.appWalkthroughStep);
  const hasSeenWT = useTutorialStore((s) => s.hasSeenAppWalkthrough);
  useEffect(() => {
    if (hasSeenWT || walkthroughStep !== 3) return;
    const timer = setTimeout(() => {
      try { router.push("/trading-hub" as never); } catch {}
    }, 2000);
    return () => clearTimeout(timer);
  }, [walkthroughStep, hasSeenWT, router]);

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

  /* ── Stage-1 lock screen ── */
  if (!isInvestmentsUnlocked) {
    return (
      <View style={s.root}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32, opacity: 0.55 }}>
          <View style={{ width: 100, height: 100, overflow: "hidden", marginBottom: 20 }}>
            <LottieView
              source={require("../../../assets/lottie/wired-flat-161-growth-hover-pinch.json")}
              style={{ width: 100, height: 100 }}
              autoPlay loop speed={0.5}
            />
          </View>
          <Lock size={40} color="#64748b" style={{ marginBottom: 12 }} />
          <Text style={{ fontSize: 22, fontWeight: "900", color: "#64748b", textAlign: "center", writingDirection: "rtl", marginBottom: 8 }}>
            מרכז ההשקעות
          </Text>
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#64748b", textAlign: "center", writingDirection: "rtl", lineHeight: 24 }}>
            נפתח בשלב 2
          </Text>
          <Text style={{ fontSize: 13, color: "#cbd5e1", textAlign: "center", writingDirection: "rtl", marginTop: 8 }}>
            התקדמו לשלב 2 כדי לפתוח
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={[s.content, { paddingBottom: insets.bottom + 16 }]}>

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
              <Text style={s.finnMessage}>בנה את האימפריה{"\n"}הפיננסית שלך</Text>
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
              <Text style={s.portfolioTitle}>הפורטפוליו שלך</Text>
              <View style={s.portfolioRow}>
                <GoldCoinIcon size={22} />
                <Text style={s.portfolioValue}>{coins.toLocaleString()}</Text>
              </View>
              <Pressable style={s.pnlPill} accessibilityRole="text" accessibilityLabel="רווח והפסד">
                <Text style={s.pnlText}>
                  +{Math.round(totalPnl)} רווח/הפסד
                </Text>
                <Text style={s.pnlArrow}>→</Text>
              </Pressable>
            </View>
            <View style={s.portfolioImageWrap}>
              <LottieView
                source={require("../../../assets/lottie/wired-flat-161-growth-hover-pinch.json")}
                style={{ width: 90, height: 90 }}
                autoPlay
                loop
              />
            </View>
          </View>
        </Animated.View>

        {/* ── Navigation Cards ── */}

        {/* Trading Hub */}
        <Animated.View style={tradingStyle}>
          {isTradingUnlocked ? (
            <Pressable onPress={() => router.push("/trading-hub" as never)} style={s.navCard} accessibilityRole="button" accessibilityLabel="זירת המסחר">
              <ChevronLeft size={20} color="#cbd5e1" />
              <View style={s.navTextCol}>
                <Text style={s.navTitle}>מסחר בשוק ההון</Text>
                <Text style={s.navDesc}>
                  {positions.length > 0 ? `${positions.length} פוזיציות פתוחות` : "קנה ומכור מניות ומדדים בלייב"}
                </Text>
              </View>
              <View style={[s.navIconBox, { backgroundColor: "#f1f5f9" }]}>
                <TrendingUp size={26} color="#64748b" />
              </View>
            </Pressable>
          ) : (
            <View style={[s.navCard, { opacity: 0.65 }]}>
              <View />
              <View style={s.navTextCol}>
                <Text style={s.navTitle}>מסחר בשוק ההון</Text>
                <View style={s.lockRow}>
                  <Text style={s.navDesc}>נפתח בהגעה לרמה 4</Text>
                  <Lock size={12} color="#64748b" />
                </View>
              </View>
              <View style={[s.navIconBox, { backgroundColor: "#f1f5f9" }]}>
                <TrendingUp size={26} color="#64748b" />
              </View>
            </View>
          )}
        </Animated.View>

        {/* Real Assets Market */}
        <Animated.View style={marketStyle}>
          <Pressable onPress={handleAssetsPress} style={s.navCard} accessibilityRole="button" accessibilityLabel="שוק הנכסים">
            <ChevronLeft size={20} color="#cbd5e1" />
            <View style={s.navTextCol}>
              <Text style={s.navTitle}>זירת הנכסים</Text>
              <Text style={s.navDesc}>נדל"ן, עסקים ועסקאות גדולות</Text>
            </View>
            <View style={[s.navIconBox, { backgroundColor: "#eff6ff" }]}>
              <Building2 size={26} color="#3b82f6" />
            </View>
          </Pressable>
        </Animated.View>

        {/* My Portfolio */}
        <Animated.View style={portfolioStyle}>
          <Pressable onPress={() => router.push("/assets" as never)} style={s.navCard} accessibilityRole="button" accessibilityLabel="הנכסים שלי">
            <ChevronLeft size={20} color="#cbd5e1" />
            <View style={s.navTextCol}>
              <Text style={s.navTitle}>הנכסים שלי</Text>
              <Text style={s.navDesc}>צפייה וניהול האחזקות הקיימות</Text>
            </View>
            <View style={[s.navIconBox, { backgroundColor: "#eff6ff" }]}>
              <Briefcase size={26} color="#3b82f6" />
            </View>
          </Pressable>
        </Animated.View>

      </View>

      {/* ── Assets Market Intro Modal ── */}
      <Modal
        visible={showAssetsIntro}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAssetsIntro(false)}
        accessibilityViewIsModal
      >
        <Pressable style={s.introOverlay} onPress={() => setShowAssetsIntro(false)}>
          <Pressable style={s.introSheet} onPress={() => {}}>
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

              {/* CTA — הבנתי */}
              <Pressable
                onPress={handleAssetsIntroContinue}
                style={({ pressed }) => [s.introBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
                accessibilityRole="button"
                accessibilityLabel="הבנתי, קח אותי לזירה"
              >
                <LinearGradient
                  colors={["#3b82f6", "#2563eb"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.introBtnGradient}
                >
                  <Text style={s.introBtnText}>הבנתי, קח אותי לזירה!</Text>
                </LinearGradient>
              </Pressable>

              {/* Don't show again */}
              <Pressable
                onPress={handleAssetsIntroDontShow}
                style={s.introDontShow}
                accessibilityRole="button"
                accessibilityLabel="אל תראה הסבר זה שוב"
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
    flex: 1,
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
  pnlArrow: {
    fontSize: 14,
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
    color: "#94a3b8",
    textAlign: "center",
    writingDirection: "rtl",
  },
});
