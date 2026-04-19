// ---------------------------------------------------------------------------
// PRD 32, US-005 AC1: "Wealth Network", Invite Friends Hub
// Ocean-blue redesign, clean, friendly, diamond-accented
// ---------------------------------------------------------------------------

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Share,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp, ZoomIn } from "react-native-reanimated";
import LottieView from "lottie-react-native";
import type { AnimationObject } from "lottie-react-native";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Share2,
} from "lucide-react-native";
// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

import { useAuthStore } from "../auth/useAuthStore";
import * as Clipboard from "expo-clipboard";
import QRCode from "react-native-qrcode-svg";
import { CALM } from "../../constants/theme";
import { tapHaptic, heavyHaptic, successHaptic } from "../../utils/haptics";
import { BackButton } from "../../components/ui/BackButton";
import { AnimatedPressable } from "../../components/ui/AnimatedPressable";
import { useReferralStore } from "./useReferralStore";
import type { ReferredFriend } from "./referralTypes";
import { DiamondChestOverlay } from "./DiamondChestOverlay";
import { GlobalWealthHeader } from "../../components/ui/GlobalWealthHeader";

// ---------------------------------------------------------------------------
// Lottie sources
// ---------------------------------------------------------------------------
const LOTTIE_DIVIDEND = require("../../../assets/lottie/wired-flat-945-dividends-hover-pinch.json");
const LOTTIE_GIFT = require("../../../assets/lottie/wired-flat-412-gift-hover-squeeze.json");
const LOTTIE_NETWORK = require("../../../assets/lottie/wired-flat-952-business-network-hover-pinch.json");
const LOTTIE_GROWTH = require("../../../assets/lottie/wired-flat-161-growth-hover-pinch.json");
const LOTTIE_AVATAR = require("../../../assets/lottie/wired-flat-44-avatar-user-in-circle-hover-looking-around.json");
const LOTTIE_BOOK = require("../../../assets/lottie/wired-flat-112-book-hover-closed.json");
const LOTTIE_HANDSHAKE = require("../../../assets/lottie/wired-flat-645-people-handshake-transaction-hover-pinch.json");

const ICON_SIZE = 28;

const BG_DECO = [
  { src: require("../../../assets/lottie/sea/wired-flat-522-fish-hover-pinch.json"), size: 32, pos: { top: "6%" as const, left: 8 } },
  { src: require("../../../assets/lottie/wired-flat-291-coin-dollar-hover-pinch.json"), size: 28, pos: { top: "22%" as const, right: 6 } },
  { src: require("../../../assets/lottie/sea/wired-flat-1175-dolphin-hover-pinch.json"), size: 34, pos: { top: "40%" as const, left: 10 } },
  { src: require("../../../assets/lottie/sea/wired-flat-1166-seahorse-hover-pinch.json"), size: 30, pos: { top: "55%" as const, right: 8 } },
  { src: require("../../../assets/lottie/wired-flat-298-coins-hover-jump.json"), size: 26, pos: { top: "70%" as const, left: 6 } },
  { src: require("../../../assets/lottie/sea/wired-flat-1168-star-fish-hover-pinch.json"), size: 28, pos: { top: "85%" as const, right: 10 } },
];

// ---------------------------------------------------------------------------
// Helper: Lottie section icon
// ---------------------------------------------------------------------------
function SectionIcon({ source }: { source: AnimationObject }) {
  return (
    <View style={{ width: ICON_SIZE, height: ICON_SIZE, overflow: "hidden" }} accessible={false}>
      <LottieView source={source} style={{ width: ICON_SIZE, height: ICON_SIZE }} autoPlay loop />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export function ReferralScreen() {
  const {
    referralCode,
    referredFriends,
    totalDividendXP,
    totalDividendCoins,
    hasClaimedDiamondChest,
    claimDiamondChest,
    collectDividend,
    canCollectDividend,
    refreshDailyActivity,
  } = useReferralStore();

  const [chestCelebration, setChestCelebration] = useState<{
    friendId: string;
    friendName: string;
  } | null>(null);
  const [dividendJustCollected, setDividendJustCollected] = useState(false);
  const [showEduTooltip, setShowEduTooltip] = useState(false);

  // Refresh mock friends' daily activity on mount
  useEffect(() => {
    refreshDailyActivity();
  }, [refreshDailyActivity]);

  const dividendAvailable = canCollectDividend();
  const claimableFriends = referredFriends.filter(
    (f) => f.hasCompletedOnboarding && !hasClaimedDiamondChest[f.id]
  );
  const totalYesterdayGold = referredFriends.reduce((s, f) => s + f.yesterdayGold, 0);
  const dailyGoldDividend = Math.floor(totalYesterdayGold * 0.05);

  async function handleCopy() {
    tapHaptic();
    await Clipboard.setStringAsync(referralCode);
  }

  function handleShare() {
    tapHaptic();
    Share.share({
      message: `הצטרף ל-FinPlay עם הקוד שלי: ${referralCode} ותקבל בונוס!`,
    });
  }

  function handleClaimChest(friend: ReferredFriend) {
    heavyHaptic();
    claimDiamondChest(friend.id);
    setChestCelebration({ friendId: friend.id, friendName: friend.displayName });
  }

  function handleCollectDividend() {
    if (dailyGoldDividend <= 0 || !dividendAvailable) return;
    successHaptic();
    collectDividend();
    setDividendJustCollected(true);
  }

  const toggleEduTooltip = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowEduTooltip((prev) => !prev);
  }, []);

  return (
    <View style={styles.container}>
      {/* Sea + money Lottie background decorations */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {BG_DECO.map((d, i) => (
          <View key={i} style={[{ position: "absolute" as const, opacity: 0.07 }, d.pos]} accessible={false}>
            <LottieView source={d.src} style={{ width: d.size, height: d.size }} autoPlay loop speed={0.5} />
          </View>
        ))}
      </View>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <GlobalWealthHeader />
        {/* ── Sticky Header ── */}
        <View style={styles.stickyHeader}>
          <View style={styles.headerRow}>
            <BackButton />
            <View style={styles.titleCol}>
              <Text style={styles.title}>רשת החברים</Text>
              <Text style={styles.subtitle}>הזמן חברים, צבור פרסים</Text>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >

          {/* ── Referral Code Card ── */}
          <Animated.View entering={FadeInDown.delay(200)}>
            <View style={styles.card}>
              <View style={styles.codeCard}>
                <SectionIcon source={LOTTIE_HANDSHAKE} />
                <Text style={styles.codeTitle}>קוד ההזמנה שלך</Text>
                <View style={styles.codeRow}>
                  <Pressable onPress={handleCopy} style={styles.copyBtn} accessibilityRole="button" accessibilityLabel="העתק קוד הזמנה" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Copy size={18} color={CALM.accent} />
                  </Pressable>
                  <Text style={styles.codeText}>{referralCode}</Text>
                </View>
                <AnimatedPressable onPress={handleShare} style={styles.shareBtn} accessibilityRole="button" accessibilityLabel="שתף עם חברים">
                  <Share2 size={16} color="#ffffff" />
                  <Text style={styles.shareBtnText}>שתף עם חברים</Text>
                </AnimatedPressable>

                {/* QR Code */}
                <View style={styles.qrWrap}>
                  <Text style={styles.qrLabel}>או סרוק את הקוד:</Text>
                  <View style={styles.qrBox}>
                    <QRCode
                      value={`https://finplay.app/invite/${referralCode}`}
                      size={140}
                      backgroundColor="#ffffff"
                      color="#0c4a6e"
                    />
                  </View>
                </View>

                <Text style={styles.assetTagline}>
                  כל חבר = נכס פיננסי שמניב לך 5% מהרווחים שלו
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* ── Diamond Chest Claims ── */}
          {claimableFriends.length > 0 && (
            <Animated.View entering={FadeInUp.delay(250)}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>ארגזי יהלום לתביעה</Text>
                <SectionIcon source={LOTTIE_GIFT} />
              </View>
              {claimableFriends.map((friend) => (
                <View key={friend.id} style={styles.chestRow}>
                  <AnimatedPressable
                    onPress={() => handleClaimChest(friend)}
                    style={styles.chestBox}
                    accessibilityRole="button"
                    accessibilityLabel={`תבע ארגז יהלום מ-${friend.displayName}`}
                  >
                    <Text style={styles.chestBoxEmoji}>📦</Text>
                    <Text style={styles.chestBoxLabel}>💎 5</Text>
                  </AnimatedPressable>
                  <View style={styles.chestInfo}>
                    <Text style={styles.chestName}>{friend.displayName}</Text>
                    <Text style={styles.chestDesc}>סיים אונבורדינג, Gems 5</Text>
                  </View>
                </View>
              ))}
            </Animated.View>
          )}

          {/* ── Dividend Section ── */}
          <Animated.View entering={FadeInDown.delay(300)}>
            <View style={styles.card}>
              <View style={styles.dividendCard}>
                <View style={styles.dividendHeader}>
                  <Text style={styles.dividendTitle}>דיבידנד יומי</Text>
                  <SectionIcon source={LOTTIE_DIVIDEND} />
                </View>
                <View style={styles.dividendRateBadge}>
                  <Text style={styles.dividendRateText}>5% דיבידנד יומי</Text>
                </View>
                <Text style={styles.dividendDesc}>
                  אתה מקבל 5% מהזהב שהחברים שלך הרוויחו אתמול במצטבר!
                </Text>
                <View style={styles.dividendStats}>
                  <View style={styles.dividendStat}>
                    <Text style={[styles.dividendValue, { color: CALM.coinGold }]}>
                      {dailyGoldDividend}
                    </Text>
                    <Text style={styles.dividendLabel}>זהב מאתמול</Text>
                  </View>
                  <View style={styles.dividendStat}>
                    <Text style={[styles.dividendValue, { color: CALM.coinGold }]}>
                      {totalDividendCoins}
                    </Text>
                    <Text style={styles.dividendLabel}>סה״כ דיבידנד זהב</Text>
                  </View>
                </View>
                {dividendAvailable ? (
                  <AnimatedPressable
                    onPress={handleCollectDividend}
                    style={[styles.actionBtn, (dailyGoldDividend <= 0) && { opacity: 0.5 }]}
                    disabled={dailyGoldDividend <= 0}
                    accessibilityRole="button"
                    accessibilityLabel={`אסוף ${dailyGoldDividend} זהב דיבידנד`}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <SectionIcon source={require("../../../assets/lottie/wired-flat-298-coins-hover-jump.json")} />
                      <Text style={styles.actionBtnText}>
                        אסוף {dailyGoldDividend} זהב
                      </Text>
                    </View>
                  </AnimatedPressable>
                ) : (
                  <View style={styles.collectedBadge}>
                    <Text style={styles.collectedText}>נאסף היום ✓</Text>
                  </View>
                )}
                {dividendJustCollected && !dividendAvailable && (
                  <Animated.View entering={FadeInDown.duration(300)} style={styles.dividendSuccessToast}>
                    <Text style={styles.dividendSuccessText}>
                      קיבלת דיבידנד מהנכסים שלך!
                    </Text>
                  </Animated.View>
                )}
              </View>
            </View>
          </Animated.View>

          {/* ── Educational Tooltip (Collapsible) ── */}
          <Animated.View entering={FadeInDown.delay(350)}>
            <Pressable onPress={toggleEduTooltip} style={styles.eduToggle} accessibilityRole="button" accessibilityLabel={showEduTooltip ? "סגור הסבר דיבידנד" : "פתח הסבר דיבידנד"}>
              <SectionIcon source={LOTTIE_BOOK} />
              <Text style={styles.eduToggleText}>מה זה דיבידנד? למד עכשיו</Text>
              {showEduTooltip ? (
                <ChevronUp size={16} color={CALM.accent} />
              ) : (
                <ChevronDown size={16} color={CALM.accent} />
              )}
            </Pressable>
            {showEduTooltip && (
              <View style={styles.eduCard}>
                <Text style={styles.eduTitle}>דיבידנד, הכנסה פסיבית</Text>
                <Text style={styles.eduBody}>
                  בעולם האמיתי, כשאתה מחזיק מניות של חברה, היא משלמת לך
                  חלק מהרווחים שלה כ"דיבידנד". זה כסף שנכנס לחשבון שלך בלי
                  שתצטרך לעשות כלום.
                </Text>
                <Text style={styles.eduBody}>
                  כאן באפליקציה, כל חבר שהזמנת הוא כמו "נכס" בתיק ההשקעות
                  שלך. כל יום אתה יכול לאסוף 5% מהזהב שהוא הרוויח אתמול.
                  בדיוק כמו דיבידנד אמיתי!
                </Text>
              </View>
            )}
          </Animated.View>

          {/* ── Network Tree ── */}
          <Animated.View entering={FadeInDown.delay(400)}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>הרשת שלך</Text>
              <SectionIcon source={LOTTIE_NETWORK} />
            </View>
            {referredFriends.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  עדיין לא הזמנת חברים. שתף את הקוד שלך!
                </Text>
              </View>
            ) : (
              <NetworkTreeView
                friends={referredFriends}
                hasClaimedDiamondChest={hasClaimedDiamondChest}
              />
            )}
          </Animated.View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>

      {/* Diamond Chest Celebration Overlay */}
      <DiamondChestOverlay
        visible={chestCelebration !== null}
        friendName={chestCelebration?.friendName ?? ""}
        onClose={() => setChestCelebration(null)}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Network Tree View, Visual tree with user as root and friends as branches
// ---------------------------------------------------------------------------

function NetworkTreeView({
  friends,
  hasClaimedDiamondChest,
}: {
  friends: ReferredFriend[];
  hasClaimedDiamondChest: Record<string, boolean>;
}) {
  const displayName = useAuthStore((s) => s.displayName);

  return (
    <View style={treeStyles.container}>
      {/* ── Root Node (User) ── */}
      <Animated.View entering={ZoomIn.delay(600).springify()} style={treeStyles.rootNode}>
        <View style={[treeStyles.rootAvatar, { borderColor: "#0ea5e9" }]}>
          <View style={{ width: 30, height: 30, overflow: "hidden" }} accessible={false}>
            <LottieView source={LOTTIE_AVATAR} style={{ width: 30, height: 30 }} autoPlay loop />
          </View>
        </View>
        <Text style={treeStyles.rootName}>{displayName ?? "אני"}</Text>
      </Animated.View>

      {/* ── Trunk Line ── */}
      <View style={treeStyles.trunkLine} />

      {/* ── Horizontal Branch ── */}
      <View style={treeStyles.branchRow}>
        <View style={treeStyles.horizontalBranch} />
      </View>

      {/* ── Friend Nodes ── */}
      <View style={treeStyles.friendsRow}>
        {friends.map((friend, idx) => {
          const isClaimed = !!hasClaimedDiamondChest[friend.id];
          return (
            <Animated.View
              key={friend.id}
              entering={ZoomIn.delay(700 + idx * 100).springify()}
              style={treeStyles.friendCol}
            >
              {/* Vertical connector from branch */}
              <View style={treeStyles.verticalConnector} />
              <View
                style={[
                  treeStyles.friendAvatar,
                  friend.hasCompletedOnboarding && treeStyles.friendAvatarCompleted,
                ]}
              >
                <Text style={treeStyles.friendEmojiText}>{friend.avatarEmoji}</Text>
              </View>
              <Text style={treeStyles.friendName} numberOfLines={1}>
                {friend.displayName}
              </Text>
              <Text style={treeStyles.friendXP}>{friend.yesterdayXP} XP</Text>
              {isClaimed && <Text style={treeStyles.claimedDot}>💎</Text>}
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const treeStyles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(14,165,233,0.15)",
    alignItems: "center",
    shadowColor: "#0ea5e9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  // Root node
  rootNode: { alignItems: "center", gap: 4 },
  rootAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(14,165,233,0.08)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
  },
  rootName: { fontSize: 14, fontWeight: "800", color: CALM.textPrimary },
  rootLabel: { fontSize: 11, color: CALM.textSecondary },

  // Trunk
  trunkLine: {
    width: 2,
    height: 20,
    backgroundColor: "rgba(14,165,233,0.2)",
  },

  // Horizontal branch
  branchRow: {
    width: "80%",
    alignItems: "center",
  },
  horizontalBranch: {
    width: "100%",
    height: 2,
    backgroundColor: "rgba(14,165,233,0.2)",
  },

  // Friends row
  friendsRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    width: "100%",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 0,
  },

  // Individual friend
  friendCol: {
    alignItems: "center",
    width: 64,
    gap: 3,
  },
  verticalConnector: {
    width: 2,
    height: 14,
    backgroundColor: "rgba(14,165,233,0.2)",
  },
  friendAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(14,165,233,0.06)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: CALM.border,
  },
  friendAvatarCompleted: {
    borderColor: "#0ea5e9",
  },
  friendEmojiText: { fontSize: 20 },
  friendName: { fontSize: 11, fontWeight: "700", color: CALM.textPrimary, textAlign: "center" },
  friendXP: { fontSize: 10, color: CALM.textSecondary },
  claimedDot: { fontSize: 10 },
});

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CALM.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },

  // Sticky header
  stickyHeader: {
    backgroundColor: CALM.bg,
    borderBottomWidth: 1,
    borderBottomColor: CALM.divider,
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 4,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleCol: { flex: 1, alignItems: "flex-end", paddingRight: 16 },
  title: { fontSize: 22, fontWeight: "900", color: CALM.textPrimary },
  subtitle: { fontSize: 13, color: CALM.textSecondary, marginTop: 2 },

  // Shared card style
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CALM.border,
    marginTop: 14,
    shadowColor: "#0891b2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },

  // Tier card
  tierCard: { alignItems: "center", paddingVertical: 20, gap: 6 },
  tierBadgeCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(14,165,233,0.06)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
  },
  tierEmoji: { fontSize: 32 },
  tierLabel: { fontSize: 20, fontWeight: "800" },
  tierCount: { fontSize: 14, color: CALM.textSecondary },
  tierNext: { fontSize: 12, color: CALM.textTertiary, marginTop: 2 },

  // Code card
  codeCard: { alignItems: "center", paddingVertical: 20, paddingHorizontal: 16, gap: 10 },
  codeTitle: { fontSize: 14, color: CALM.textSecondary, fontWeight: "600" },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: CALM.surfaceMuted,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CALM.border,
  },
  codeText: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0ea5e9",
    letterSpacing: 3,
  },
  copyBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: CALM.accentLight,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0ea5e9",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: "100%",
    borderBottomWidth: 3,
    borderBottomColor: "#0369a1",
    shadowColor: "#0ea5e9",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  shareBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#ffffff",
  },
  assetTagline: {
    fontSize: 12,
    fontWeight: "700",
    color: CALM.accent,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
  qrWrap: {
    alignItems: "center",
    marginTop: 14,
    gap: 8,
  },
  qrLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    writingDirection: "rtl" as const,
  },
  qrBox: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#e0f2fe",
    shadowColor: "#0891b2",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },

  // Dividend card
  dividendCard: { padding: 16, gap: 10 },
  dividendHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  dividendTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: CALM.textPrimary,
    textAlign: "right",
  },
  dividendDesc: { fontSize: 13, color: CALM.textSecondary, textAlign: "right" },
  dividendRateBadge: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(14,165,233,0.08)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(14,165,233,0.2)",
  },
  dividendRateText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0ea5e9",
    textAlign: "right",
  },
  dividendSuccessToast: {
    backgroundColor: "rgba(14,165,233,0.08)",
    borderWidth: 1,
    borderColor: "rgba(14,165,233,0.2)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 4,
  },
  dividendSuccessText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0ea5e9",
    textAlign: "center",
  },
  dividendStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 4,
  },
  dividendStat: { alignItems: "center", gap: 2 },
  dividendValue: { fontSize: 24, fontWeight: "800", color: "#0ea5e9" },
  dividendLabel: { fontSize: 11, color: CALM.textSecondary },

  // Action button (collect dividend)
  actionBtn: {
    backgroundColor: "#0ea5e9",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "#0369a1",
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ffffff",
  },

  // Chest claims
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 24,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: CALM.textPrimary,
    textAlign: "right",
  },
  chestRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(6,182,212,0.2)",
  },
  chestInfo: { flex: 1, alignItems: "flex-end" },
  chestName: { fontSize: 15, fontWeight: "700", color: CALM.textPrimary },
  chestDesc: { fontSize: 12, color: "#0891b2" },
  friendEmoji: { fontSize: 28 },
  chestBox: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: "rgba(6,182,212,0.1)",
    borderWidth: 2,
    borderColor: "rgba(6,182,212,0.3)",
    justifyContent: "center",
    alignItems: "center",
    gap: 2,
  },
  chestBoxEmoji: {
    fontSize: 28,
  },
  chestBoxLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0891b2",
  },

  // Network tree (empty state only, tree view in treeStyles)
  emptyState: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: CALM.border,
  },
  emptyText: { color: CALM.textSecondary, fontSize: 14, textAlign: "center" },

  // Roadmap
  roadmap: { padding: 14, gap: 10 },
  roadmapRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    paddingVertical: 6,
  },
  roadmapInfo: {
    flex: 1,
    alignItems: "flex-end",
  },
  roadmapLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: CALM.textSecondary,
    textAlign: "right",
  },
  roadmapUnlock: {
    fontSize: 11,
    color: CALM.textTertiary,
    textAlign: "right",
    marginTop: 2,
  },
  roadmapReq: { fontSize: 12, color: CALM.textTertiary },
  roadmapEmoji: { fontSize: 22 },

  // Collected badge
  collectedBadge: {
    backgroundColor: "rgba(14,165,233,0.08)",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(14,165,233,0.2)",
  },
  collectedText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0ea5e9",
  },

  // Educational tooltip (collapsible)
  eduToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  eduToggleText: {
    fontSize: 13,
    fontWeight: "700",
    color: CALM.accent,
    textAlign: "right",
  },
  eduCard: {
    backgroundColor: CALM.accentLight,
    borderWidth: 1,
    borderColor: "rgba(14,165,233,0.15)",
    borderRadius: 14,
    padding: 16,
    gap: 8,
    marginBottom: 8,
  },
  eduTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: CALM.textPrimary,
    textAlign: "right",
  },
  eduBody: {
    fontSize: 13,
    color: CALM.textSecondary,
    textAlign: "right",
    lineHeight: 20,
  },

  bottomSpacer: { height: 40 },
});
