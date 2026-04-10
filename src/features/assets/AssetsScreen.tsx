import { ScrollView, View, Text, StyleSheet, Share , Image } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";
import { useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import { Share2, Plus, TrendingUp, ChevronRight, Briefcase } from "lucide-react-native";
import { LottieIcon } from "../../components/ui/LottieIcon";
import { BackButton } from "../../components/ui/BackButton";
import { GlobalWealthHeader } from "../../components/ui/GlobalWealthHeader";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEconomyStore } from "../economy/useEconomyStore";
import { useReferralStore } from "../social/useReferralStore";
import { useRealAssetsStore } from "./useRealAssetsStore";
import { useTradingStore } from "../trading-hub/useTradingStore";
import { ASSET_BY_ID } from "../trading-hub/tradingHubData";
import { StockIcon } from "../trading-hub/StockIcon";
import { DIVIDEND_PERCENT } from "../social/referralData";
import { AnimatedPressable } from "../../components/ui/AnimatedPressable";
import { SUBTITLE_TEXT } from "../../constants/theme";
import { tapHaptic, successHaptic } from "../../utils/haptics";
import { getPyramidStatus } from "../../utils/progression";
import {
  useEntranceAnimation,
  fadeInUp,
  fadeInScale,
  SPRING_BOUNCY,
} from "../../utils/animations";
import { FINN_STANDARD } from "../retention-loops/finnMascotConfig";

const BG_DECO = [
  { src: require("../../../assets/lottie/sea/wired-flat-522-fish-hover-pinch.json"), size: 32, pos: { top: "8%" as const, left: 8 } },
  { src: require("../../../assets/lottie/sea/wired-flat-1175-dolphin-hover-pinch.json"), size: 36, pos: { top: "25%" as const, right: 6 } },
  { src: require("../../../assets/lottie/wired-flat-291-coin-dollar-hover-pinch.json"), size: 28, pos: { top: "42%" as const, left: 10 } },
  { src: require("../../../assets/lottie/sea/wired-flat-1166-seahorse-hover-pinch.json"), size: 30, pos: { top: "58%" as const, right: 8 } },
  { src: require("../../../assets/lottie/wired-flat-298-coins-hover-jump.json"), size: 26, pos: { top: "72%" as const, left: 6 } },
  { src: require("../../../assets/lottie/sea/wired-flat-1168-star-fish-hover-pinch.json"), size: 28, pos: { top: "88%" as const, right: 10 } },
];

export function AssetsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const xp = useEconomyStore((s) => s.xp);
  const { layer: currentLayer } = getPyramidStatus(xp);
  const tradingUnlocked = currentLayer >= 4;
  const referralCode = useReferralStore((s) => s.referralCode);
  const referredFriends = useReferralStore((s) => s.referredFriends);
  const canCollectDividend = useReferralStore((s) => s.canCollectDividend);
  const collectDividend = useReferralStore((s) => s.collectDividend);
  const ownedAssets = useRealAssetsStore((s) => s.ownedAssets);
  const collectDailyIncome = useRealAssetsStore((s) => s.collectDailyIncome);
  const pendingIncome = useRealAssetsStore((s) => s.pendingIncome);
  const positions = useTradingStore((s) => s.positions);

  const pending = pendingIncome();
  const ownedCount = Object.keys(ownedAssets).length;
  const hasRealAssets = ownedCount > 0;
  const hasPositions = positions.length > 0;

  const titleStyle = useEntranceAnimation(fadeInScale, { delay: 0, spring: SPRING_BOUNCY });
  const section2Style = useEntranceAnimation(fadeInUp, { delay: 200 });
  const section3Style = useEntranceAnimation(fadeInUp, { delay: 300 });

  const handleShare = async () => {
    tapHaptic();
    try {
      await Share.share({
        message: `בוא להצטרף אלי ל-FinPlay! השתמש בקוד שלי לקבלת בונוס התחלה: ${referralCode}\nלהורדה: https://finpl.app/join`,
      });
    } catch (_e) {
      // user cancelled
    }
  };

  const collectDiv = () => {
    successHaptic();
    collectDividend();
  };

  const collectInc = () => {
    successHaptic();
    collectDailyIncome();
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      {/* Sea + money Lottie background decorations */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {BG_DECO.map((d, i) => (
          <View key={i} style={[{ position: "absolute", opacity: 0.07 }, d.pos]} accessible={false}>
            <LottieIcon source={d.src} size={d.size} autoPlay loop speed={0.5} />
          </View>
        ))}
      </View>
      <View style={{ backgroundColor: "#ffffff" }}>
        <View style={{ paddingTop: insets.top }} />
        <GlobalWealthHeader />
      </View>
      <SafeAreaView style={{ flex: 1 }} edges={["bottom", "left", "right"]}>
        {/* Header */}
        <Animated.View style={[titleStyle, { width: "100%", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, backgroundColor: "#f8fafc", zIndex: 10, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" }]}>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <BackButton />
            <View style={styles.pageHeader}>
              <Briefcase size={22} color="#854d0e" />
              <Text style={styles.pageTitle} accessibilityRole="header">הנכסים שלי</Text>
            </View>
            <View style={{ width: 32 }} />
          </View>
          <Text style={[SUBTITLE_TEXT, { color: "#64748b", textAlign: "center", textShadowColor: "transparent" }]}>
            ניהול התיק וההון האישי שלך
          </Text>
        </Animated.View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
        >

          {/* Finn empty-state banner */}
          {!hasRealAssets && !hasPositions && (
            <View style={styles.finnBanner}>
              <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 128, height: 128 }} contentFit="contain" />
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.finnBannerTitle}>אין לך נכסים עדיין!</Text>
                <Text style={styles.finnBannerSub}>הכסף שלך מתחת למזרן! תרכוש נכסים, ותמנף את הכסף שלך.</Text>
              </View>
            </View>
          )}

          {/* ── Section 1: נכסים ממשיים ── */}
          <Animated.View style={[section2Style, { marginBottom: 24 }]}>
            <View style={styles.sectionHeader} accessibilityRole="header">
              <Text style={styles.sectionTitle}>🏠 נכסים בבעלותי</Text>
            </View>

            {!hasRealAssets ? (
              <View style={styles.emptyCard}>
                <LottieIcon source={require("../../../assets/lottie/wired-flat-3136-big-shop-hover-pinch.json")} size={48} autoPlay loop />
                <Text style={styles.emptyText}>עדיין אין לך נכסים שמניבים כסף.</Text>
                <AnimatedPressable
                  onPress={() => { tapHaptic(); router.push("/assets-market" as never); }}
                  style={styles.emptyCta}
                  accessibilityRole="button"
                  accessibilityLabel="לקניית נכס ראשון"
                >
                  <Text style={styles.emptyCtaText}>לקניית נכס ראשון</Text>
                </AnimatedPressable>
              </View>
            ) : (
              <View>
                {pending > 0 && (
                  <AnimatedPressable onPress={collectInc} style={styles.collectBtn} accessibilityRole="button" accessibilityLabel="גבה הכנסה">
                    <Text style={styles.collectBtnText}>גבה הכנסה: +{Math.floor(pending).toLocaleString('he-IL')}</Text>
                  </AnimatedPressable>
                )}
                <View style={styles.ownedGrid}>
                  {Object.values(ownedAssets).map((asset) => (
                    <View key={asset.id} style={styles.ownedCard}>
                      <Text style={{ fontSize: 24 }}>{asset.emoji}</Text>
                      <View style={{ marginRight: 8, flex: 1, alignItems: 'flex-end' }}>
                        <Text style={styles.ownedName}>{asset.name}</Text>
                        <Text style={styles.ownedYield}>+{asset.dailyYield}/יום</Text>
                      </View>
                      <View style={styles.tierPill}>
                        <Text style={styles.tierText}>T{asset.tier}</Text>
                      </View>
                    </View>
                  ))}
                  <AnimatedPressable
                    onPress={() => router.push("/assets-market" as never)}
                    style={styles.addAssetCard}
                    accessibilityRole="button"
                    accessibilityLabel="הוסף נכס"
                  >
                    <Plus size={24} color="#64748b" />
                    <Text style={{ fontSize: 11, color: "#64748b", fontWeight: '700', marginTop: 4 }}>הוסף נכס</Text>
                  </AnimatedPressable>
                </View>
              </View>
            )}
          </Animated.View>

          {/* ── Section 2: תיק השקעות (inline holdings) ── */}
          <Animated.View style={[useEntranceAnimation(fadeInUp, { delay: 250 }), { marginBottom: 24, opacity: tradingUnlocked ? 1 : 0.5 }]}>
            <View style={styles.sectionHeader} accessibilityRole="header">
              <Text style={styles.sectionTitle}>📈 תיק השקעות</Text>
              {!tradingUnlocked && (
                <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '700' }}>🔒 נפתח ברמה 4</Text>
              )}
            </View>

            {!hasPositions ? (
              <View style={styles.emptyCard}>
                <LottieIcon source={require("../../../assets/lottie/wired-flat-161-growth-hover-pinch.json")} size={48} autoPlay loop />
                <Text style={styles.emptyText}>עדיין אין לך השקעות בשוק ההון.</Text>
                <AnimatedPressable
                  onPress={() => { if (!tradingUnlocked) return; tapHaptic(); router.push("/trading-hub" as never); }}
                  style={[styles.emptyCta, !tradingUnlocked && { opacity: 0.5 }]}
                  disabled={!tradingUnlocked}
                  accessibilityRole="button"
                  accessibilityLabel="לרכישת ההשקעה הראשונה"
                >
                  <Text style={styles.emptyCtaText}>לרכישת ההשקעה הראשונה</Text>
                </AnimatedPressable>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {positions.slice(0, 4).map((pos) => {
                  const asset = ASSET_BY_ID.get(pos.assetId);
                  const pnlPct = ((pos.currentPrice - pos.entryPrice) / pos.entryPrice) * 100;
                  const isUp = pnlPct >= 0;
                  return (
                    <View key={pos.id} style={styles.holdingRow}>
                      <StockIcon assetId={pos.assetId} size={32} />
                      <View style={{ flex: 1, alignItems: "flex-end", marginRight: 8 }}>
                        <Text style={styles.holdingName}>{asset?.name ?? pos.assetId}</Text>
                        <Text style={styles.holdingSub}>{pos.amountInvested.toLocaleString('he-IL')} מטבעות</Text>
                      </View>
                      <View style={[styles.pnlBadge, { backgroundColor: isUp ? "#dcfce7" : "#fee2e2" }]}>
                        <Text style={[styles.pnlText, { color: isUp ? "#16a34a" : "#ef4444" }]}>
                          {isUp ? "+" : ""}{pnlPct.toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                  );
                })}
                <AnimatedPressable
                  onPress={() => { if (!tradingUnlocked) return; tapHaptic(); router.push("/trading-hub/holdings" as never); }}
                  style={[styles.viewAllBtn, !tradingUnlocked && { opacity: 0.5 }]}
                  disabled={!tradingUnlocked}
                  accessibilityRole="button"
                  accessibilityLabel="ראה את כל האחזקות"
                >
                  <Text style={styles.viewAllText}>ראה את כל האחזקות</Text>
                  <ChevronRight size={16} color="#0891b2" style={{ transform: [{ scaleX: -1 }] }} />
                </AnimatedPressable>
              </View>
            )}
          </Animated.View>

          {/* ── Section 3: רשת חברתית והפניות ── */}
          <Animated.View style={[section3Style, { marginBottom: 24 }]}>
            <View style={styles.sectionHeader} accessibilityRole="header">
              <Text style={styles.sectionTitle}>👥 נכסי רשת (חברים)</Text>
            </View>

            <View style={styles.socialCard}>
              <View style={styles.socialHeader}>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.referralTitle}>הזמן חברים וקבל דיבידנד</Text>
                  <Text style={styles.referralSub}>קבל 5% מהרווחים של כל חבר שתזמין!</Text>
                </View>
                <View style={styles.refCodeBadge}>
                  <Text style={styles.refCodeText}>{referralCode}</Text>
                </View>
              </View>

              {referredFriends.length > 0 && (
                <View style={styles.friendsList}>
                  {referredFriends.slice(0, 3).map(f => (
                    <View key={f.id} style={styles.friendRow}>
                      <Text style={{ fontSize: 20 }}>{f.avatarEmoji}</Text>
                      <Text style={styles.friendName}>{f.displayName}</Text>
                      <Text style={styles.friendYield}>+{Math.floor(f.yesterdayGold * DIVIDEND_PERCENT)}</Text>
                    </View>
                  ))}
                  {referredFriends.length > 3 && (
                    <Text style={styles.moreFriends}>ועוד {referredFriends.length - 3} חברים...</Text>
                  )}
                </View>
              )}

              <View style={styles.socialActions}>
                <AnimatedPressable onPress={handleShare} style={styles.shareBtn} accessibilityRole="button" accessibilityLabel="הזמן חברים">
                  <Share2 size={16} color="#fff" />
                  <Text style={styles.shareBtnText}>הזמן חברים</Text>
                </AnimatedPressable>
                {canCollectDividend() && (
                  <AnimatedPressable onPress={collectDiv} style={styles.collectDividendBtn} accessibilityRole="button" accessibilityLabel="גבה דיבידנד">
                    <Text style={styles.collectDividendText}>גבה דיבידנד</Text>
                  </AnimatedPressable>
                )}
              </View>

              {/* Link to full friends management */}
              <AnimatedPressable
                onPress={() => { tapHaptic(); router.push("/referral" as never); }}
                style={styles.friendsManageLink}
                accessibilityRole="link"
                accessibilityLabel="ניהול רשת החברים"
              >
                <Text style={styles.friendsManageLinkText}>ניהול רשת החברים</Text>
                <ChevronRight size={14} color="#64748b" style={{ transform: [{ scaleX: -1 }] }} />
              </AnimatedPressable>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1e293b",
    writingDirection: "rtl",
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#475569",
    writingDirection: 'rtl',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 28,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#0891b2',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  emptyCta: {
    backgroundColor: '#0891b2',
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 4,
    borderBottomWidth: 4,
    borderBottomColor: '#0e7490',
    shadowColor: '#0891b2',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  emptyCtaText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  collectBtn: {
    backgroundColor: '#0ea5e9',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 4,
    borderBottomColor: '#0284c7',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  collectBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
  },
  ownedGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
  },
  ownedCard: {
    width: '48%' as unknown as number,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#7dd3fc',
    padding: 12,
  },
  addAssetCard: {
    width: '48%' as unknown as number,
    height: 60,
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownedName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e293b',
  },
  ownedYield: {
    fontSize: 11,
    color: '#0284c7',
    fontWeight: '700',
  },
  tierPill: {
    backgroundColor: '#facc15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    position: 'absolute',
    top: -8,
    right: 8,
  },
  tierText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#854d0e',
  },
  // Holdings inline
  holdingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    gap: 10,
  },
  holdingName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
  },
  holdingSub: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  pnlBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pnlText: {
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  viewAllBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0891b2',
  },
  // Social
  socialCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    shadowColor: '#0891b2',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  socialHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  referralTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1e293b',
  },
  referralSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  refCodeBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  refCodeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 1,
  },
  friendsList: {
    marginBottom: 16,
    gap: 8,
  },
  friendRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 12,
    gap: 12,
  },
  friendName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'right',
  },
  friendYield: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0284c7',
  },
  moreFriends: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '600',
  },
  socialActions: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0ea5e9',
    borderRadius: 14,
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: '#0284c7',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  shareBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
  collectDividendBtn: {
    backgroundColor: '#38bdf8',
    borderRadius: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#0ea5e9',
    shadowColor: '#38bdf8',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  collectDividendText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#fff',
  },
  friendsManageLink: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  friendsManageLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  finnBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#bae6fd',
    padding: 16,
    marginBottom: 20,
    shadowColor: '#0891b2',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  finnBannerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0891b2',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  finnBannerSub: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    writingDirection: 'rtl',
    textAlign: 'right',
    lineHeight: 20,
    marginTop: 4,
  },
});
