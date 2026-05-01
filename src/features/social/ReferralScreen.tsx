// ---------------------------------------------------------------------------
// ReferralScreen — real referral hub.
//
// Wire:
//   - User opens screen → useEffect refreshes from /api/referral/me.
//   - User taps "Share" → buildInviteShareMessage() (consistent text, exact rewards).
//   - User taps "Collect" → collectFromServer(email), addCoins is local UX echo.
//   - QR code points to finplay.me/invite/[CODE] (Universal Link).
//
// All reward magnitudes (500 + 500 + 5%) come from `referralConstants.ts`.
// Never hardcode numbers in this file.
// ---------------------------------------------------------------------------

import React, { useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Share,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp, ZoomIn } from "react-native-reanimated";
import LottieView from "lottie-react-native";
import type { AnimationObject } from "lottie-react-native";
import { Copy, Share2, RefreshCw } from "lucide-react-native";

import { useAuthStore } from "../auth/useAuthStore";
import * as Clipboard from "expo-clipboard";
import QRCode from "react-native-qrcode-svg";
import { CALM } from "../../constants/theme";
import { tapHaptic, successHaptic } from "../../utils/haptics";
import { BackButton } from "../../components/ui/BackButton";
import { AnimatedPressable } from "../../components/ui/AnimatedPressable";
import { GoldCoinIcon } from "../../components/ui/GoldCoinIcon";
import { useReferralStore } from "./useReferralStore";
import type { ReferredFriend } from "./referralTypes";
import { GlobalWealthHeader } from "../../components/ui/GlobalWealthHeader";
import {
  REFERRAL_SIGNUP_BONUS_COINS,
  REFERRAL_DAILY_DIVIDEND_RATE,
  REFERRAL_COPY,
  buildInviteUrl,
  buildInviteShareMessage,
} from "./referralConstants";

// ── Lottie sources ──
const LOTTIE_DIVIDEND = require("../../../assets/lottie/wired-flat-945-dividends-hover-pinch.json");
const LOTTIE_NETWORK = require("../../../assets/lottie/wired-flat-952-business-network-hover-pinch.json");
const LOTTIE_AVATAR = require("../../../assets/lottie/wired-flat-44-avatar-user-in-circle-hover-looking-around.json");
const LOTTIE_HANDSHAKE = require("../../../assets/lottie/wired-flat-645-people-handshake-transaction-hover-pinch.json");
const LOTTIE_GIFT = require("../../../assets/lottie/wired-flat-412-gift-hover-squeeze.json");

const ICON_SIZE = 28;

const BG_DECO = [
  { src: require("../../../assets/lottie/sea/wired-flat-1175-dolphin-hover-pinch.json"), size: 34, pos: { top: "20%" as const, left: 10 } },
  { src: require("../../../assets/lottie/wired-flat-298-coins-hover-jump.json"), size: 28, pos: { top: "55%" as const, right: 8 } },
  { src: require("../../../assets/lottie/sea/wired-flat-1168-star-fish-hover-pinch.json"), size: 28, pos: { top: "85%" as const, left: 8 } },
];

function SectionIcon({ source }: { source: AnimationObject }) {
  return (
    <View style={{ width: ICON_SIZE, height: ICON_SIZE, overflow: "hidden" }} accessible={false}>
      <LottieView
        source={source}
        style={{ width: ICON_SIZE, height: ICON_SIZE }}
        autoPlay
        loop
        renderMode="SOFTWARE"
      />
    </View>
  );
}

const DIVIDEND_RATE_PCT = Math.round(REFERRAL_DAILY_DIVIDEND_RATE * 100);

export function ReferralScreen() {
  const referralCode = useReferralStore((s) => s.referralCode);
  const referredFriends = useReferralStore((s) => s.referredFriends);
  const totalDividendCoins = useReferralStore((s) => s.totalDividendCoins);
  const dividendAvailable = useReferralStore((s) => s.dividendAvailable);
  const alreadyCollectedToday = useReferralStore((s) => s.alreadyCollectedToday);
  const totalYesterdayLearningCoins = useReferralStore((s) => s.totalYesterdayLearningCoins);
  const isLoading = useReferralStore((s) => s.isLoading);
  const refresh = useReferralStore((s) => s.refresh);
  const collectFromServer = useReferralStore((s) => s.collectFromServer);
  const registerCodeWithServer = useReferralStore((s) => s.registerCodeWithServer);
  const isRegisteredOnServer = useReferralStore((s) => s.isRegisteredOnServer);

  const userEmail = useAuthStore((s) => s.email);

  const inviteUrl = buildInviteUrl(referralCode);

  // On mount: register code with server (idempotent) + fetch latest state.
  useEffect(() => {
    if (!userEmail) return;
    if (!isRegisteredOnServer) {
      registerCodeWithServer(userEmail).catch(() => { /* non-fatal */ });
    }
    refresh(userEmail).catch(() => { /* non-fatal */ });
  }, [userEmail, isRegisteredOnServer, registerCodeWithServer, refresh]);

  const handleCopy = useCallback(async () => {
    tapHaptic();
    // Copy the FULL invite URL — easier for friends to use than just the code.
    await Clipboard.setStringAsync(inviteUrl);
  }, [inviteUrl]);

  const handleShare = useCallback(() => {
    tapHaptic();
    Share.share({ message: buildInviteShareMessage(referralCode) });
  }, [referralCode]);

  const handleCollectDividend = useCallback(async () => {
    if (!userEmail) return;
    if (alreadyCollectedToday || dividendAvailable <= 0) return;
    successHaptic();
    await collectFromServer(userEmail);
  }, [userEmail, alreadyCollectedToday, dividendAvailable, collectFromServer]);

  const handleRefresh = useCallback(() => {
    if (!userEmail) return;
    tapHaptic();
    refresh(userEmail).catch(() => {});
  }, [userEmail, refresh]);

  return (
    <View style={styles.container}>
      {/* Sea + money Lottie background decorations */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {BG_DECO.map((d, i) => (
          <View key={i} style={[{ position: "absolute" as const, opacity: 0.07 }, d.pos]} accessible={false}>
            <LottieView
              source={d.src}
              style={{ width: d.size, height: d.size }}
              autoPlay
              loop
              speed={0.3}
              renderMode="SOFTWARE"
            />
          </View>
        ))}
      </View>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <GlobalWealthHeader />
        {/* Sticky header */}
        <View style={styles.stickyHeader}>
          <View style={styles.headerRow}>
            <BackButton />
            <View style={styles.titleCol}>
              <Text style={styles.title}>החברים שלי</Text>
              <Text style={styles.subtitle}>{REFERRAL_COPY.signupBonusHeadline}</Text>
            </View>
            <Pressable
              onPress={handleRefresh}
              style={styles.refreshBtn}
              accessibilityRole="button"
              accessibilityLabel="רענן נתונים"
              hitSlop={10}
              disabled={isLoading}
            >
              <RefreshCw size={18} color={isLoading ? "#94a3b8" : CALM.accent} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >

          {/* ── Reward summary banner (the headline promise) ── */}
          <Animated.View entering={FadeInDown.delay(150)}>
            <View style={styles.rewardBanner}>
              <SectionIcon source={LOTTIE_GIFT} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rewardBannerTitle}>
                  {REFERRAL_SIGNUP_BONUS_COINS} 🪙 לכם + {REFERRAL_SIGNUP_BONUS_COINS} 🪙 לחבר
                </Text>
                <Text style={styles.rewardBannerSubtitle}>
                  {REFERRAL_COPY.fullRewardExplain}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* ── Referral Code Card ── */}
          <Animated.View entering={FadeInDown.delay(220)}>
            <View style={styles.card}>
              <View style={styles.codeCard}>
                <SectionIcon source={LOTTIE_HANDSHAKE} />
                <Text style={styles.codeTitle}>הקישור שלך להזמנה</Text>
                <View style={styles.codeRow}>
                  <Pressable
                    onPress={handleCopy}
                    style={styles.copyBtn}
                    accessibilityRole="button"
                    accessibilityLabel="העתיקו קישור הזמנה"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Copy size={18} color={CALM.accent} />
                  </Pressable>
                  <Text style={styles.codeText}>{referralCode}</Text>
                </View>
                <Text style={styles.urlPreview} numberOfLines={1}>{inviteUrl}</Text>
                <AnimatedPressable
                  onPress={handleShare}
                  style={styles.shareBtn}
                  accessibilityRole="button"
                  accessibilityLabel="שתפו את הקישור"
                >
                  <Share2 size={16} color="#ffffff" />
                  <Text style={styles.shareBtnText}>שתפו עם חברים</Text>
                </AnimatedPressable>

                {/* QR Code */}
                <View style={styles.qrWrap}>
                  <Text style={styles.qrLabel}>או סרקו את הקוד:</Text>
                  <View
                    style={styles.qrBox}
                    accessible={true}
                    accessibilityRole="image"
                    accessibilityLabel={`קוד QR להזמנה: ${inviteUrl}`}
                  >
                    <QRCode
                      value={inviteUrl}
                      size={140}
                      backgroundColor="#ffffff"
                      color="#0c4a6e"
                    />
                  </View>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* ── Dividend section ── */}
          <Animated.View entering={FadeInDown.delay(300)}>
            <View style={styles.card}>
              <View style={styles.dividendCard}>
                <View style={styles.dividendHeader}>
                  <Text style={styles.dividendTitle}>דיבידנד יומי</Text>
                  <SectionIcon source={LOTTIE_DIVIDEND} />
                </View>
                <View style={styles.dividendRateBadge}>
                  <Text style={styles.dividendRateText}>{DIVIDEND_RATE_PCT}% דיבידנד יומי</Text>
                </View>
                <Text style={styles.dividendDesc}>
                  {DIVIDEND_RATE_PCT}% מהמטבעות שהחברים שלכם הרוויחו אתמול בלמידה — שיעורים, קוויזים ומשימות יומיות.
                </Text>
                <View style={styles.dividendStats}>
                  <View style={styles.dividendStat}>
                    <Text style={[styles.dividendValue, { color: CALM.coinGold }]}>
                      {totalYesterdayLearningCoins.toLocaleString()} 🪙
                    </Text>
                    <Text style={styles.dividendLabel}>חברים הרוויחו אתמול</Text>
                  </View>
                  <View style={styles.dividendStat}>
                    <Text style={[styles.dividendValue, { color: CALM.coinGold }]}>
                      {totalDividendCoins.toLocaleString()} 🪙
                    </Text>
                    <Text style={styles.dividendLabel}>סה״כ דיבידנד שצברתם</Text>
                  </View>
                </View>
                {!alreadyCollectedToday && dividendAvailable > 0 ? (
                  <AnimatedPressable
                    onPress={handleCollectDividend}
                    style={styles.actionBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`אספו ${dividendAvailable} מטבעות דיבידנד`}
                  >
                    <Text style={styles.actionBtnText}>
                      אספו {dividendAvailable.toLocaleString()} 🪙
                    </Text>
                  </AnimatedPressable>
                ) : (
                  <View style={styles.collectedBadge}>
                    <Text style={styles.collectedText}>
                      {alreadyCollectedToday ? "נאסף היום ✓" : "אין דיבידנד היום — חברים לא למדו אתמול"}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </Animated.View>

          {/* ── Friends list ── */}
          <Animated.View entering={FadeInDown.delay(380)}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>הרשת שלך</Text>
              <SectionIcon source={LOTTIE_NETWORK} />
            </View>
            {referredFriends.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  עדיין לא הזמנתם חברים. שתפו את הקישור — תקבלו {REFERRAL_SIGNUP_BONUS_COINS} 🪙 על כל הרשמה!
                </Text>
              </View>
            ) : (
              <NetworkTreeView friends={referredFriends} />
            )}
          </Animated.View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ── Network Tree (visual) ──
function NetworkTreeView({ friends }: { friends: ReferredFriend[] }) {
  const displayName = useAuthStore((s) => s.displayName);

  return (
    <View style={treeStyles.container}>
      <Animated.View entering={ZoomIn.delay(600).springify()} style={treeStyles.rootNode}>
        <View style={[treeStyles.rootAvatar, { borderColor: "#0ea5e9" }]}>
          <View style={{ width: 30, height: 30, overflow: "hidden" }} accessible={false}>
            <LottieView source={LOTTIE_AVATAR} style={{ width: 30, height: 30 }} autoPlay loop />
          </View>
        </View>
        <Text style={treeStyles.rootName}>{displayName ?? "אני"}</Text>
      </Animated.View>

      <View style={treeStyles.trunkLine} />
      <View style={treeStyles.branchRow}>
        <View style={treeStyles.horizontalBranch} />
      </View>

      <View style={treeStyles.friendsRow}>
        {friends.map((friend, idx) => (
          <Animated.View
            key={friend.id}
            entering={ZoomIn.delay(700 + idx * 100).springify()}
            style={treeStyles.friendCol}
            accessible={true}
            accessibilityLabel={`${friend.displayName}, הרוויח ${friend.yesterdayGold.toLocaleString()} מטבעות אתמול`}
          >
            <View style={treeStyles.verticalConnector} accessible={false} />
            <View style={[treeStyles.friendAvatar, treeStyles.friendAvatarCompleted]} accessible={false}>
              <Text style={treeStyles.friendEmojiText}>{friend.avatarEmoji}</Text>
            </View>
            <Text style={treeStyles.friendName} numberOfLines={1} accessible={false}>
              {friend.displayName}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} accessible={false}>
              <Text style={treeStyles.friendCoins}>{friend.yesterdayGold.toLocaleString()}</Text>
              <GoldCoinIcon size={12} />
            </View>
          </Animated.View>
        ))}
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
  trunkLine: { width: 2, height: 20, backgroundColor: "rgba(14,165,233,0.2)" },
  branchRow: { width: "80%", alignItems: "center" },
  horizontalBranch: { width: "100%", height: 2, backgroundColor: "rgba(14,165,233,0.2)" },
  friendsRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    width: "100%",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 0,
  },
  friendCol: { alignItems: "center", width: 64, gap: 3 },
  verticalConnector: { width: 2, height: 14, backgroundColor: "rgba(14,165,233,0.2)" },
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
  friendAvatarCompleted: { borderColor: "#0ea5e9" },
  friendEmojiText: { fontSize: 20 },
  friendName: { fontSize: 11, fontWeight: "700", color: CALM.textPrimary, textAlign: "center" },
  friendCoins: { fontSize: 10, color: CALM.textSecondary },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CALM.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },

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
    gap: 8,
  },
  titleCol: { flex: 1, alignItems: "flex-end", paddingRight: 16 },
  title: { fontSize: 22, fontWeight: "900", color: CALM.textPrimary },
  subtitle: { fontSize: 13, color: CALM.textSecondary, marginTop: 2 },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(14,165,233,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Reward banner
  rewardBanner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#ecfeff",
    borderWidth: 1.5,
    borderColor: "#a5f3fc",
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
  },
  rewardBannerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0c4a6e",
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: 4,
  },
  rewardBannerSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0e7490",
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 18,
  },

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
  codeText: { fontSize: 24, fontWeight: "900", color: "#0ea5e9", letterSpacing: 3 },
  copyBtn: { padding: 6, borderRadius: 8, backgroundColor: CALM.accentLight },
  urlPreview: {
    fontSize: 11,
    color: CALM.textTertiary,
    fontWeight: "500",
    paddingHorizontal: 4,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563eb",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: "100%",
    borderWidth: 1,
    borderColor: "#1d4ed8",
    borderBottomWidth: 4,
    borderBottomColor: "#1d4ed8",
    shadowColor: "#1d4ed8",
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  shareBtnText: { fontSize: 16, fontWeight: "900", color: "#ffffff", letterSpacing: 0.3 },
  qrWrap: { alignItems: "center", marginTop: 14, gap: 8 },
  qrLabel: { fontSize: 13, fontWeight: "700", color: "#475569", writingDirection: "rtl" as const },
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
  dividendDesc: { fontSize: 13, color: CALM.textSecondary, textAlign: "right", writingDirection: "rtl" as const, lineHeight: 19 },
  dividendRateBadge: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(14,165,233,0.08)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(14,165,233,0.2)",
  },
  dividendRateText: { fontSize: 12, fontWeight: "800", color: "#0ea5e9", textAlign: "right" },
  dividendStats: { flexDirection: "row", justifyContent: "space-around", marginVertical: 4 },
  dividendStat: { alignItems: "center", gap: 2 },
  dividendValue: { fontSize: 24, fontWeight: "800", color: "#0ea5e9" },
  dividendLabel: { fontSize: 11, color: CALM.textSecondary, textAlign: "center" },

  actionBtn: {
    backgroundColor: "#2563eb",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1d4ed8",
    borderBottomWidth: 4,
    borderBottomColor: "#1d4ed8",
    shadowColor: "#1d4ed8",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  actionBtnText: { fontSize: 16, fontWeight: "900", color: "#ffffff", letterSpacing: 0.3 },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 24,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: CALM.textPrimary, textAlign: "right" },

  emptyState: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: CALM.border,
  },
  emptyText: { color: CALM.textSecondary, fontSize: 14, textAlign: "center", writingDirection: "rtl" as const, lineHeight: 20 },

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
  collectedText: { fontSize: 14, fontWeight: "700", color: "#0ea5e9", textAlign: "center" },

  bottomSpacer: { height: 40 },
});
