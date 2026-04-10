import { useState, useMemo, useEffect } from "react";
import { ScrollView, View, Text, StyleSheet, Pressable, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ShoppingCart, Clock, TrendingUp, Sparkles, Tag, Award } from "lucide-react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    cancelAnimation,
} from "react-native-reanimated";
import { Image as ExpoImage } from "expo-image";
import { X } from "lucide-react-native";
import { GoldCoinIcon } from "../../components/ui/GoldCoinIcon";
import { useEconomyStore } from "../economy/useEconomyStore";
import { FINN_STANDARD } from "../retention-loops/finnMascotConfig";
import { useRealAssetsStore } from "./useRealAssetsStore";
import {
    ASSET_CATALOG,
    PORTFOLIO_COMBOS,
    calcPaybackDays,
    getWeeklyDealAssetId,
    getYieldForTier,
    WEEKLY_DEAL_DISCOUNT,
    MORTGAGE_TERMS,
} from "./realAssetsData";
import type { RealAsset } from "./realAssetsTypes";
import { AnimatedPressable } from "../../components/ui/AnimatedPressable";
import { LottieIcon } from "../../components/ui/LottieIcon";
import { SUBTITLE_TEXT } from "../../constants/theme";
import { useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { BackButton } from "../../components/ui/BackButton";
import { GlobalWealthHeader } from "../../components/ui/GlobalWealthHeader";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tapHaptic, successHaptic } from "../../utils/haptics";
import { useEntranceAnimation, fadeInUp, fadeInScale, SPRING_BOUNCY } from "../../utils/animations";

// ── Weekly deal countdown ──
function useWeeklyCountdown(): string {
    const [text, setText] = useState("");
    useEffect(() => {
        function calc() {
            const now = new Date();
            const dayOfWeek = now.getDay(); // 0=Sun
            const daysUntilSunday = (7 - dayOfWeek) % 7 || 7;
            const endOfDeal = new Date(now);
            endOfDeal.setDate(now.getDate() + daysUntilSunday);
            endOfDeal.setHours(0, 0, 0, 0);
            const diffMs = endOfDeal.getTime() - now.getTime();
            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            setText(`${hours}:${String(mins).padStart(2, "0")}`);
        }
        calc();
        const interval = setInterval(calc, 60_000);
        return () => clearInterval(interval);
    }, []);
    return text;
}

export function MarketScreen() {
    const router = useRouter();
    const isFocused = useIsFocused();
    const insets = useSafeAreaInsets();
    const coins = useEconomyStore((s) => s.coins);
    const gems = useEconomyStore((s) => s.gems);
    const ownedAssets = useRealAssetsStore((s) => s.ownedAssets);
    const purchaseAsset = useRealAssetsStore((s) => s.purchaseAsset);
    const purchaseWithMortgage = useRealAssetsStore((s) => s.purchaseWithMortgage);
    const upgradeAsset = useRealAssetsStore((s) => s.upgradeAsset);
    const totalDailyIncome = useRealAssetsStore((s) => s.totalDailyIncome);
    const getActiveCombos = useRealAssetsStore((s) => s.getActiveCombos);
    const getComboBonus = useRealAssetsStore((s) => s.getComboBonus);
    const assetVouchers = useRealAssetsStore((s) => s.assetVouchers);
    const useVoucher = useRealAssetsStore((s) => s.useVoucher);
    const assetMilestones = useRealAssetsStore((s) => s.assetMilestones);
    const totalMortgageDebt = useRealAssetsStore((s) => s.totalMortgageDebt);

    const [confirmAsset, setConfirmAsset] = useState<
        (Omit<RealAsset, "purchasedAt" | "lastCollectedAt"> & { action: "buy" | "upgrade" }) | null
    >(null);
    const [useVoucherOnPurchase, setUseVoucherOnPurchase] = useState(false);
    const [finnAdvice, setFinnAdvice] = useState<string | null>(null);

    const titleStyle = useEntranceAnimation(fadeInScale, { delay: 0, spring: SPRING_BOUNCY });
    const dealStyle = useEntranceAnimation(fadeInUp, { delay: 50 });
    const catalogStyle = useEntranceAnimation(fadeInUp, { delay: 150 });
    const summaryStyle = useEntranceAnimation(fadeInUp, { delay: 250 });

    // Weekly deal
    const weeklyDealId = useMemo(() => getWeeklyDealAssetId(), []);
    const countdown = useWeeklyCountdown();
    const activeCombos = getActiveCombos();
    const comboBonus = getComboBonus();

    // Gold pulsing glow for deal card
    const dealGlow = useSharedValue(0.3);
    useEffect(() => {
        dealGlow.value = withRepeat(
            withSequence(
                withTiming(0.9, { duration: 1000 }),
                withTiming(0.3, { duration: 1000 }),
            ),
            -1,
            true,
        );
        return () => { cancelAnimation(dealGlow); };
    }, [dealGlow]);
    const dealGlowStyle = useAnimatedStyle(() => ({
        shadowOpacity: dealGlow.value,
        borderColor: `rgba(34,211,238,${0.4 + dealGlow.value * 0.6})`,
    }));

    // Recommend cheapest unowned asset
    const recommended = useMemo(() => {
        const unowned = ASSET_CATALOG.filter((a) => !ownedAssets[a.id]);
        if (unowned.length === 0) return null;
        return unowned.reduce((min, a) => a.baseCost < min.baseCost ? a : min);
    }, [ownedAssets]);

    // Check which combos buying an asset would complete
    const wouldCompleteCombo = (assetId: string): string | null => {
        const ownedIds = Object.keys(ownedAssets);
        if (ownedIds.includes(assetId)) return null;
        const hypothetical = [...ownedIds, assetId];
        for (const combo of PORTFOLIO_COMBOS) {
            const alreadyActive = combo.requiredAssets.every((id) => ownedIds.includes(id));
            if (alreadyActive) continue;
            const wouldBeActive = combo.requiredAssets.every((id) => hypothetical.includes(id));
            if (wouldBeActive) return combo.name;
        }
        return null;
    };

    const ownedCount = Object.keys(ownedAssets).length;

    return (
        <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
            {/* Decorative Lotties */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <View style={{ position: "absolute", top: "5%", left: 6, opacity: 0.06 }}>
                    <LottieIcon source={require("../../../assets/lottie/wired-flat-291-coin-dollar-hover-pinch.json")} size={30} autoPlay loop speed={0.4} active={isFocused} />
                </View>
                <View style={{ position: "absolute", top: "40%", right: 6, opacity: 0.05 }}>
                    <LottieIcon source={require("../../../assets/lottie/wired-flat-947-investment-hover-pinch.json")} size={28} autoPlay loop speed={0.5} active={isFocused} />
                </View>
                <View style={{ position: "absolute", top: "75%", left: 8, opacity: 0.06 }}>
                    <LottieIcon source={require("../../../assets/lottie/wired-flat-298-coins-hover-jump.json")} size={26} autoPlay loop speed={0.4} active={isFocused} />
                </View>
            </View>

            <View style={{ backgroundColor: "#ffffff" }}>
                <View style={{ paddingTop: insets.top }} />
                <GlobalWealthHeader />
            </View>

            <SafeAreaView style={{ flex: 1 }} edges={["bottom", "left", "right"]}>
                {/* Header Row with Back Button */}
                <View style={{ flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
                    <BackButton onPress={() => router.canGoBack() ? router.back() : router.replace("/investments" as never)} />
                    <View style={{ flex: 1, alignItems: "center", marginStart: 40 }}>
                        <Text style={styles.pageTitle}>זירת הנכסים</Text>
                        <Text style={{ fontSize: 13, color: "#64748b", textAlign: "center", marginTop: 2 }}>
                            בנה אימפריה של נכסים מניבים
                        </Text>
                    </View>
                </View>

                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48, paddingTop: 12 }}
                    showsVerticalScrollIndicator={false}
                >

                    {/* ── Weekly Flash Deal ── */}
                    <Animated.View style={[dealStyle, { marginBottom: 20 }]}>
                        <Animated.View style={[styles.dealCard, dealGlowStyle]}>
                            <View style={styles.dealBadge}>
                                <Tag size={12} color="#0e7490" />
                                <Text style={styles.dealBadgeText}>מבצע שבועי</Text>
                            </View>
                            {(() => {
                                const dealAsset = ASSET_CATALOG.find((a) => a.id === weeklyDealId);
                                if (!dealAsset) return null;
                                const isOwned = !!ownedAssets[weeklyDealId];
                                const discountedCost = Math.round(dealAsset.baseCost * (1 - WEEKLY_DEAL_DISCOUNT));
                                const payback = calcPaybackDays(discountedCost, dealAsset.dailyYield);
                                return (
                                    <Pressable
                                        onPress={() => {
                                            if (!isOwned) {
                                                tapHaptic();
                                                setConfirmAsset({ ...dealAsset, baseCost: discountedCost, action: "buy" });
                                            }
                                        }}
                                        style={styles.dealContent}
                                    >
                                        <Text style={{ fontSize: 40 }}>{dealAsset.emoji}</Text>
                                        <View style={{ flex: 1, alignItems: "flex-end", marginEnd: 12 }}>
                                            <Text style={styles.dealName}>{dealAsset.name}</Text>
                                            <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6, marginTop: 2 }}>
                                                <Text style={styles.dealOrigPrice}>{dealAsset.baseCost.toLocaleString()}</Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                                    <Text style={styles.dealPrice}>{discountedCost.toLocaleString()}</Text>
                                                    <GoldCoinIcon size={16} />
                                                </View>
                                            </View>
                                            <Text style={styles.dealRoi}>החזר השקעה תוך {payback} ימים</Text>
                                        </View>
                                        <View style={styles.dealTimer}>
                                            <Clock size={12} color="#0e7490" />
                                            <Text style={styles.dealTimerText}>{countdown}</Text>
                                        </View>
                                    </Pressable>
                                );
                            })()}
                        </Animated.View>
                    </Animated.View>

                    {/* ── Recommended for you ── */}
                    {recommended && !ownedAssets[recommended.id] && (
                        <View style={styles.recSection}>
                            <Text style={styles.recLabel}>✨ מומלץ בשבילך</Text>
                            <Pressable
                                onPress={() => {
                                    tapHaptic();
                                    setConfirmAsset({ ...recommended, action: "buy" });
                                }}
                                style={styles.recCard}
                            >
                                <Text style={{ fontSize: 32 }}>{recommended.emoji}</Text>
                                <View style={{ flex: 1, alignItems: "flex-end", marginEnd: 10 }}>
                                    <Text style={styles.recName}>{recommended.name}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                        <Text style={styles.recSub}>{recommended.baseCost.toLocaleString()}</Text>
                                        <GoldCoinIcon size={13} />
                                        <Text style={styles.recSub}> · החזר תוך {calcPaybackDays(recommended.baseCost, recommended.dailyYield)} ימים</Text>
                                    </View>
                                </View>
                                <View style={styles.recBuyBtn}>
                                    <Text style={styles.recBuyText}>קנה</Text>
                                </View>
                            </Pressable>
                        </View>
                    )}

                    {/* ── Catalog Grid ── */}
                    <Animated.View style={catalogStyle}>
                        <Text style={styles.sectionLabel}>כל הנכסים</Text>
                        <View style={styles.realAssetsGrid}>
                            {ASSET_CATALOG.map((base) => {
                                const owned = ownedAssets[base.id] as RealAsset | undefined;
                                const isOwned = !!owned;
                                const canUpgrade = isOwned && (owned.tier ?? 1) < 3;
                                const displayYield = isOwned ? owned.dailyYield : base.dailyYield;
                                const currentTier = isOwned ? owned.tier : 0;
                                const cost = isOwned
                                    ? (canUpgrade ? owned.upgradeCost : 0)
                                    : base.baseCost;
                                const paybackDays = cost > 0 ? calcPaybackDays(cost, isOwned && canUpgrade
                                    ? getYieldForTier(base.dailyYield, (owned.tier + 1) as 1 | 2 | 3) - owned.dailyYield
                                    : base.dailyYield) : 0;
                                const monthlyIncome = Math.round(displayYield * 30);
                                const comboHint = wouldCompleteCombo(base.id);
                                const isDeal = base.id === weeklyDealId && !isOwned;

                                return (
                                    <AnimatedPressable
                                        key={base.id}
                                        accessibilityRole="button"
                                        accessibilityLabel={`${base.name}. ${isOwned ? (canUpgrade ? `שדרג תמורת ${owned.upgradeCost} מטבעות` : 'בבעלותך') : `קנה תמורת ${base.baseCost} מטבעות`}`}
                                        onPress={() => {
                                            tapHaptic();
                                            if (!isOwned) {
                                                setConfirmAsset({ ...base, action: "buy" });
                                            } else if (canUpgrade) {
                                                setConfirmAsset({ ...base, action: "upgrade" });
                                            }
                                        }}
                                        style={[
                                            styles.realAssetCard,
                                            isOwned && styles.realAssetCardOwned,
                                            isDeal && styles.realAssetCardDeal,
                                        ]}
                                    >
                                        {/* Combo badge */}
                                        {comboHint && (
                                            <View style={styles.comboBadge}>
                                                <Sparkles size={10} color="#0e7490" />
                                                <Text style={styles.comboBadgeText}>קומבו!</Text>
                                            </View>
                                        )}

                                        {/* Deal tag */}
                                        {isDeal && (
                                            <View style={styles.dealTagSmall}>
                                                <Text style={styles.dealTagText}>-{Math.round(WEEKLY_DEAL_DISCOUNT * 100)}%</Text>
                                            </View>
                                        )}

                                        <View style={styles.emojiContainer}>
                                            <Text style={{ fontSize: 36 }}>{base.emoji}</Text>
                                        </View>
                                        <Text style={styles.realAssetName}>{base.name}</Text>

                                        {/* Yield + ROI */}
                                        <View style={styles.yieldTag}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                                <Text style={styles.realAssetYield}>+{displayYield}</Text>
                                                <GoldCoinIcon size={12} />
                                                <Text style={styles.realAssetYield}>/יום</Text>
                                            </View>
                                        </View>

                                        {/* ROI info */}
                                        {!isOwned && (
                                            <View style={styles.roiRow}>
                                                <TrendingUp size={10} color="#0891b2" />
                                                <Text style={styles.roiText}>החזר תוך {paybackDays} ימים</Text>
                                            </View>
                                        )}
                                        {isOwned && (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, justifyContent: 'center' }}>
                                                <Text style={styles.monthlyText}>📅 {monthlyIncome}</Text>
                                                <GoldCoinIcon size={11} />
                                                <Text style={styles.monthlyText}>/חודש</Text>
                                            </View>
                                        )}
                                        {isOwned && owned.mortgageRemaining && owned.mortgageRemaining > 0 ? (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, justifyContent: 'center' }}>
                                                <Text style={styles.mortgageBadgeText}>🏦 חוב: {owned.mortgageRemaining.toLocaleString()}</Text>
                                                <GoldCoinIcon size={11} />
                                            </View>
                                        ) : null}

                                        {/* Tier dots */}
                                        <View style={styles.tierDotsRow}>
                                            {([1, 2, 3] as const).map((t) => (
                                                <View
                                                    key={t}
                                                    style={[
                                                        styles.tierDot,
                                                        currentTier >= t && styles.tierDotActive,
                                                    ]}
                                                />
                                            ))}
                                        </View>

                                        {/* Action label */}
                                        <View
                                            style={[
                                                styles.actionLabel,
                                                isOwned
                                                    ? (canUpgrade ? styles.actionLabelUpgrade : styles.actionLabelOwned)
                                                    : styles.actionLabelBuy,
                                            ]}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                                                {!isOwned ? (
                                                    <>
                                                        <Text style={styles.actionLabelText}>{base.baseCost.toLocaleString()}</Text>
                                                        <GoldCoinIcon size={14} />
                                                    </>
                                                ) : canUpgrade ? (
                                                    <>
                                                        <Text style={styles.actionLabelText}>⬆️ שדרג {owned.upgradeCost.toLocaleString()}</Text>
                                                        <GoldCoinIcon size={14} />
                                                    </>
                                                ) : (
                                                    <Text style={[styles.actionLabelText, styles.actionLabelTextOwned]}>בבעלותך ✓</Text>
                                                )}
                                            </View>
                                        </View>
                                    </AnimatedPressable>
                                );
                            })}
                        </View>
                    </Animated.View>

                    {/* ── Active Combos ── */}
                    {activeCombos.length > 0 && (
                        <Animated.View style={[summaryStyle, { marginTop: 20 }]}>
                            <Text style={styles.sectionLabel}>🔗 קומבינציות פעילות</Text>
                            {activeCombos.map((combo) => (
                                <View key={combo.id} style={styles.comboCard}>
                                    <Text style={{ fontSize: 24 }}>{combo.emoji}</Text>
                                    <View style={{ flex: 1, alignItems: "flex-end", marginEnd: 10 }}>
                                        <Text style={styles.comboName}>{combo.name}</Text>
                                        <Text style={styles.comboDesc}>{combo.description}</Text>
                                    </View>
                                    <View style={styles.comboBonusPill}>
                                        <Text style={styles.comboBonusText}>+{Math.round(combo.yieldBonus * 100)}%</Text>
                                    </View>
                                </View>
                            ))}
                        </Animated.View>
                    )}

                    {/* ── Potential Combos (locked) ── */}
                    {ownedCount > 0 && ownedCount < 6 && (
                        <View style={{ marginTop: 16 }}>
                            <Text style={styles.sectionLabel}>🔒 קומבינציות זמינות</Text>
                            {PORTFOLIO_COMBOS.filter(
                                (c) => !c.requiredAssets.every((id) => !!ownedAssets[id]),
                            ).map((combo) => {
                                const owned = combo.requiredAssets.filter((id) => !!ownedAssets[id]).length;
                                const total = combo.requiredAssets.length;
                                return (
                                    <View key={combo.id} style={[styles.comboCard, { opacity: 0.6 }]}>
                                        <Text style={{ fontSize: 24 }}>{combo.emoji}</Text>
                                        <View style={{ flex: 1, alignItems: "flex-end", marginEnd: 10 }}>
                                            <Text style={styles.comboName}>{combo.name}</Text>
                                            <Text style={styles.comboDesc}>{owned}/{total} נכסים</Text>
                                        </View>
                                        <View style={[styles.comboBonusPill, { backgroundColor: "#f1f5f9" }]}>
                                            <Text style={[styles.comboBonusText, { color: "#64748b" }]}>+{Math.round(combo.yieldBonus * 100)}%</Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {/* ── Portfolio Summary ── */}
                    {ownedCount > 0 && (
                        <Animated.View style={[summaryStyle, styles.portfolioSummary]}>
                            <Text style={styles.summaryTitle}>📊 סיכום תיק</Text>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>הכנסה יומית:</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                    <Text style={styles.summaryValue}>+{totalDailyIncome.toFixed(1)}</Text>
                                    <GoldCoinIcon size={14} />
                                </View>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>הכנסה חודשית:</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                    <Text style={styles.summaryValue}>+{Math.round(totalDailyIncome * 30)}</Text>
                                    <GoldCoinIcon size={14} />
                                </View>
                            </View>
                            {comboBonus > 0 && (
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>בונוס קומבו:</Text>
                                    <Text style={[styles.summaryValue, { color: "#0891b2" }]}>+{Math.round(comboBonus * 100)}%</Text>
                                </View>
                            )}
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>נכסים בבעלות:</Text>
                                <Text style={styles.summaryValue}>{ownedCount}/6</Text>
                            </View>

                            {totalMortgageDebt() > 0 && (
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>חוב משכנתא:</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                        <Text style={[styles.summaryValue, { color: "#dc2626" }]}>{totalMortgageDebt().toLocaleString()}</Text>
                                        <GoldCoinIcon size={14} />
                                    </View>
                                </View>
                            )}

                            {/* Milestones */}
                            {assetMilestones.length > 0 && (
                                <View style={styles.milestonesRow}>
                                    <Award size={14} color="#22d3ee" />
                                    <Text style={styles.milestonesText}>
                                        {assetMilestones.length} הישגים הושגו
                                    </Text>
                                </View>
                            )}
                        </Animated.View>
                    )}

                    {/* ── Purchase / Upgrade Confirmation Modal ── */}
                    <Modal
                        visible={confirmAsset !== null}
                        transparent={false}
                        animationType="slide"
                        onRequestClose={() => setConfirmAsset(null)}
                    >
                        <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
                            <View style={{ flex: 1, paddingHorizontal: 20 }}>
                                {confirmAsset && (() => {
                                    const isBuy = confirmAsset.action === "buy";
                                    const ownedRef = ownedAssets[confirmAsset.id];
                                    const rawCost = isBuy
                                        ? confirmAsset.baseCost
                                        : (ownedRef?.upgradeCost ?? 0);
                                    const voucherDiscount = useVoucherOnPurchase && assetVouchers > 0 ? 0.5 : 0;
                                    const finalCost = Math.round(rawCost * (1 - voucherDiscount));
                                    const yield_ = isBuy ? confirmAsset.dailyYield : (
                                        ownedRef ? getYieldForTier(confirmAsset.dailyYield, (ownedRef.tier + 1) as 1 | 2 | 3) : confirmAsset.dailyYield
                                    );
                                    const payback = calcPaybackDays(finalCost, yield_);
                                    const comboHint = isBuy ? wouldCompleteCombo(confirmAsset.id) : null;

                                    return (
                                        <>
                                            {/* Header with back button — X on right */}
                                            <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 }}>
                                                <Pressable
                                                    onPress={() => { tapHaptic(); setConfirmAsset(null); setUseVoucherOnPurchase(false); }}
                                                    style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" }}
                                                >
                                                    <Text style={{ fontSize: 18, color: "#0f172a" }}>✕</Text>
                                                </Pressable>
                                                <Text style={{ fontSize: 18, fontWeight: "900", color: "#0f172a" }}>{isBuy ? "רכישת נכס" : "שדרוג נכס"}</Text>
                                                <View style={{ width: 38 }} />
                                            </View>

                                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
                                            {/* Asset hero */}
                                            <View style={{ alignItems: "center", backgroundColor: "#f0f9ff", borderRadius: 20, padding: 20, marginBottom: 16 }}>
                                                <Text style={{ fontSize: 56 }}>{confirmAsset.emoji}</Text>
                                                <Text style={{ fontSize: 22, fontWeight: "900", color: "#0f172a", marginTop: 8 }}>{confirmAsset.name}</Text>
                                                <Text style={{ fontSize: 14, color: "#64748b", writingDirection: "rtl", textAlign: "center", marginTop: 4, lineHeight: 20 }}>{confirmAsset.descriptionHebrew}</Text>
                                                <View style={{ backgroundColor: "#e0f2fe", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 4, marginTop: 8, borderWidth: 1, borderColor: "#bae6fd" }}>
                                                    <Text style={{ fontSize: 13, fontWeight: "700", color: "#0369a1" }}>💡 {confirmAsset.conceptTag}</Text>
                                                </View>
                                            </View>

                                            {/* ROI card */}
                                            <View style={{ backgroundColor: "#ffffff", borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 }}>
                                                <Text style={{ fontSize: 15, fontWeight: "800", color: "#0f172a", textAlign: "right", writingDirection: "rtl", marginBottom: 10 }}>תשואה</Text>
                                                <View style={{ flexDirection: "row-reverse", justifyContent: "space-around" }}>
                                                    <View style={{ alignItems: "center" }}>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                                            <Text style={{ fontSize: 20, fontWeight: "900", color: "#16a34a" }}>+{yield_}</Text>
                                                            <GoldCoinIcon size={16} />
                                                        </View>
                                                        <Text style={{ fontSize: 12, color: "#64748b" }}>ליום</Text>
                                                    </View>
                                                    <View style={{ width: 1, backgroundColor: "#e2e8f0" }} />
                                                    <View style={{ alignItems: "center" }}>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                                            <Text style={{ fontSize: 20, fontWeight: "900", color: "#0891b2" }}>+{Math.round(yield_ * 30)}</Text>
                                                            <GoldCoinIcon size={16} />
                                                        </View>
                                                        <Text style={{ fontSize: 12, color: "#64748b" }}>לחודש</Text>
                                                    </View>
                                                    <View style={{ width: 1, backgroundColor: "#e2e8f0" }} />
                                                    <View style={{ alignItems: "center" }}>
                                                        <Text style={{ fontSize: 20, fontWeight: "900", color: "#0f172a" }}>{payback}</Text>
                                                        <Text style={{ fontSize: 12, color: "#64748b" }}>ימים להחזר</Text>
                                                    </View>
                                                </View>
                                            </View>

                                            {/* Combo hint */}
                                            {comboHint && (
                                                <View style={[styles.modalComboHint, { marginBottom: 10 }]}>
                                                    <Sparkles size={14} color="#0891b2" />
                                                    <Text style={styles.modalComboHintText}>משלים קומבו: {comboHint}!</Text>
                                                </View>
                                            )}

                                            {/* Voucher */}
                                            {assetVouchers > 0 && isBuy && (
                                                <Pressable
                                                    onPress={() => setUseVoucherOnPurchase(!useVoucherOnPurchase)}
                                                    style={[styles.voucherToggle, useVoucherOnPurchase && styles.voucherToggleActive, { marginBottom: 10 }]}
                                                >
                                                    <Text style={styles.voucherToggleText}>
                                                        🎟️ {useVoucherOnPurchase ? "שובר מופעל — 50% הנחה!" : "השתמש בשובר נכס (-50%)"}
                                                    </Text>
                                                </Pressable>
                                            )}

                                            {/* Price card */}
                                            <View style={{ backgroundColor: "#ffffff", borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 }}>
                                                <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                                    <Text style={{ fontSize: 15, fontWeight: "800", color: "#0f172a", writingDirection: "rtl" }}>{isBuy ? "עלות רכישה" : "עלות שדרוג"}</Text>
                                                    <View style={{ alignItems: "flex-start" }}>
                                                        {voucherDiscount > 0 && <Text style={{ fontSize: 13, color: "#64748b", textDecorationLine: "line-through" }}>{rawCost.toLocaleString()}</Text>}
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                            <Text style={{ fontSize: 24, fontWeight: "900", color: "#0f172a" }}>{finalCost.toLocaleString()}</Text>
                                                            <GoldCoinIcon size={20} />
                                                        </View>
                                                    </View>
                                                </View>

                                                {/* Buy cash button */}
                                                <AnimatedPressable
                                                    onPress={() => {
                                                        successHaptic();
                                                        if (voucherDiscount > 0) useVoucher();
                                                        if (isBuy) purchaseAsset(confirmAsset.id);
                                                        else upgradeAsset(confirmAsset.id);
                                                        setConfirmAsset(null);
                                                        setUseVoucherOnPurchase(false);
                                                    }}
                                                    style={[styles.modalConfirmBtn, coins < finalCost && { backgroundColor: "#64748b", borderBottomColor: "#6b7280" }]}
                                                >
                                                    <Text style={styles.modalConfirmText}>
                                                        {coins < finalCost ? `חסרים ${(finalCost - coins).toLocaleString()}` : isBuy ? "🛒 קנה במזומן" : "🚀 אשר שדרוג"}
                                                    </Text>
                                                </AnimatedPressable>
                                            </View>

                                            {/* Mortgage card */}
                                            {isBuy && (() => {
                                                const dp = Math.ceil(finalCost * MORTGAGE_TERMS.downpayment);
                                                const loan = finalCost - dp;
                                                const dailyRepayment = Math.round(yield_ * MORTGAGE_TERMS.repaymentRate);
                                                const netDaily = yield_ - dailyRepayment;
                                                const canAffordDown = coins >= dp;
                                                return (
                                                    <View style={{ backgroundColor: "#ffffff", borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 }}>
                                                        <Text style={{ fontSize: 15, fontWeight: "800", color: "#0f172a", textAlign: "right", writingDirection: "rtl", marginBottom: 6 }}>🏦 קנייה במשכנתא</Text>
                                                        <Text style={{ fontSize: 12, fontWeight: "600", color: "#64748b", textAlign: "right", writingDirection: "rtl", lineHeight: 18, marginBottom: 10 }}>
                                                            משכנתא = הלוואה לרכישת נכס. אתה שם הון עצמי קטן (30%) והשאר מגיע כהלוואה שמוחזרת מהתשואה היומית של הנכס. אם התשואה גבוהה מההחזר — אתה מרוויח גם תוך כדי!
                                                        </Text>

                                                        {/* Mortgage stats */}
                                                        <View style={{ flexDirection: "row-reverse", justifyContent: "space-around", marginBottom: 12 }}>
                                                            <View style={{ alignItems: "center" }}>
                                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                                                    <Text style={{ fontSize: 16, fontWeight: "900", color: "#0f172a" }}>{dp.toLocaleString()}</Text>
                                                                    <GoldCoinIcon size={14} />
                                                                </View>
                                                                <Text style={{ fontSize: 11, color: "#64748b" }}>הון עצמי</Text>
                                                            </View>
                                                            <View style={{ alignItems: "center" }}>
                                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                                                    <Text style={{ fontSize: 16, fontWeight: "900", color: "#64748b" }}>{loan.toLocaleString()}</Text>
                                                                    <GoldCoinIcon size={14} />
                                                                </View>
                                                                <Text style={{ fontSize: 11, color: "#64748b" }}>הלוואה</Text>
                                                            </View>
                                                            <View style={{ alignItems: "center" }}>
                                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                                                    <Text style={{ fontSize: 16, fontWeight: "900", color: netDaily > 0 ? "#16a34a" : "#ef4444" }}>{netDaily > 0 ? "+" : ""}{netDaily}</Text>
                                                                    <GoldCoinIcon size={14} />
                                                                </View>
                                                                <Text style={{ fontSize: 11, color: "#64748b" }}>רווח נטו/יום</Text>
                                                            </View>
                                                        </View>

                                                        {/* Mortgage buy + Finn row */}
                                                        <View style={{ flexDirection: "row-reverse", gap: 8 }}>
                                                            <AnimatedPressable
                                                                onPress={() => {
                                                                    if (!canAffordDown) return;
                                                                    successHaptic();
                                                                    purchaseWithMortgage(confirmAsset.id);
                                                                    setConfirmAsset(null);
                                                                    setUseVoucherOnPurchase(false);
                                                                }}
                                                                style={[styles.mortgageBtn, { flex: 1 }, !canAffordDown && { backgroundColor: "#64748b", borderBottomColor: "#6b7280" }]}
                                                            >
                                                                <Text style={styles.mortgageBtnText}>
                                                                    {canAffordDown ? `קנה (${dp.toLocaleString()})` : `חסרים ${(dp - coins).toLocaleString()}`}
                                                                </Text>
                                                            </AnimatedPressable>
                                                            <Pressable
                                                                onPress={() => {
                                                                    tapHaptic();
                                                                    const advice = netDaily > 0
                                                                        ? `הנכס מניב ${netDaily} ליום גם אחרי החזר המשכנתא — עסקה טובה! ההון העצמי ${dp.toLocaleString()} נותן לך מינוף חכם.`
                                                                        : `ההחזר היומי (${dailyRepayment}) גבוה מהתשואה. תפסיד ${Math.abs(netDaily)} ביום. שווה לצבור עוד הון עצמי.`;
                                                                    setFinnAdvice(advice);
                                                                }}
                                                                style={{ backgroundColor: "#e0f2fe", borderRadius: 14, paddingHorizontal: 8, paddingVertical: 6, borderWidth: 1, borderColor: "#bae6fd", alignItems: "center", justifyContent: "center" }}
                                                            >
                                                                <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 32, height: 32 }} contentFit="contain" />
                                                            </Pressable>
                                                        </View>
                                                    </View>
                                                );
                                            })()}
                                        </ScrollView>
                                        </>
                                    );
                                })()}
                            </View>
                        </SafeAreaView>
                    </Modal>
                </ScrollView>

                {/* Finn advice modal — soft, app-styled */}
                {finnAdvice && (
                    <Modal visible transparent animationType="fade" onRequestClose={() => setFinnAdvice(null)} accessibilityViewIsModal>
                        <Pressable style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.5)", justifyContent: "center", alignItems: "center", padding: 24 }} onPress={() => setFinnAdvice(null)}>
                            <Pressable onPress={() => {}} style={{ width: "100%", maxWidth: 340, backgroundColor: "#ffffff", borderRadius: 24, padding: 24, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 }}>
                                {/* X button — top right */}
                                <Pressable
                                    onPress={() => setFinnAdvice(null)}
                                    style={{ position: "absolute", top: 12, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center", zIndex: 10 }}
                                >
                                    <X size={16} color="#64748b" />
                                </Pressable>

                                {/* Finn */}
                                <View style={{ alignItems: "center", marginBottom: 12 }}>
                                    <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 72, height: 72 }} contentFit="contain" />
                                </View>

                                {/* Title */}
                                <Text style={{ fontSize: 18, fontWeight: "900", color: "#0c4a6e", textAlign: "center", marginBottom: 8, writingDirection: "rtl" }}>
                                    יש עם מי להתייעץ
                                </Text>

                                {/* Advice text */}
                                <View style={{ backgroundColor: "#f0f9ff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#bae6fd" }}>
                                    <Text style={{ fontSize: 15, fontWeight: "600", color: "#0f172a", lineHeight: 24, writingDirection: "rtl", textAlign: "right" }}>
                                        {finnAdvice}
                                    </Text>
                                </View>

                                {/* Dismiss */}
                                <Pressable
                                    onPress={() => setFinnAdvice(null)}
                                    style={{ marginTop: 16, backgroundColor: "#0ea5e9", borderRadius: 14, paddingVertical: 14, alignItems: "center", borderBottomWidth: 3, borderBottomColor: "#0369a1" }}
                                >
                                    <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "800" }}>הבנתי!</Text>
                                </Pressable>
                            </Pressable>
                        </Pressable>
                    </Modal>
                )}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    pageHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 8,
    },
    pageTitle: {
        fontSize: 22,
        fontWeight: "900",
        color: "#1e293b",
        writingDirection: "rtl",
    },
    backButton: {
        position: "absolute",
        right: 0,
        top: 0,
        padding: 12,
        zIndex: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    statsBar: {
        flexDirection: "row-reverse",
        justifyContent: "center",
        gap: 12,
        marginBottom: 20,
    },
    statPill: {
        flexDirection: "row-reverse",
        alignItems: "center",
        backgroundColor: "#ffffff",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: "#e2e8f0",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        gap: 6,
    },
    statEmoji: {
        fontSize: 16,
    },
    statText: {
        fontSize: 14,
        fontWeight: "800",
        color: "#1e293b",
    },
    // ── Weekly Deal ──
    dealCard: {
        backgroundColor: "#ecfeff",
        borderRadius: 20,
        borderWidth: 2,
        borderColor: "#22d3ee",
        padding: 16,
        shadowColor: "#22d3ee",
        shadowRadius: 16,
        elevation: 6,
    },
    dealBadge: {
        flexDirection: "row-reverse",
        alignItems: "center",
        gap: 4,
        alignSelf: "flex-end",
        backgroundColor: "#ecfeff",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        marginBottom: 10,
    },
    dealBadgeText: {
        fontSize: 11,
        fontWeight: "900",
        color: "#0e7490",
    },
    dealContent: {
        flexDirection: "row-reverse",
        alignItems: "center",
    },
    dealName: {
        fontSize: 17,
        fontWeight: "900",
        color: "#1e293b",
        writingDirection: "rtl",
    },
    dealOrigPrice: {
        fontSize: 13,
        fontWeight: "600",
        color: "#64748b",
        textDecorationLine: "line-through",
    },
    dealPrice: {
        fontSize: 17,
        fontWeight: "900",
        color: "#16a34a",
    },
    dealRoi: {
        fontSize: 11,
        fontWeight: "700",
        color: "#0891b2",
        marginTop: 2,
        writingDirection: "rtl",
    },
    dealTimer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#ecfeff",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    dealTimerText: {
        fontSize: 12,
        fontWeight: "800",
        color: "#0e7490",
        fontVariant: ["tabular-nums"],
    },
    // ── Recommended ──
    recSection: {
        marginBottom: 20,
    },
    recLabel: {
        fontSize: 13,
        fontWeight: "800",
        color: "#475569",
        writingDirection: "rtl",
        marginBottom: 8,
    },
    recCard: {
        flexDirection: "row-reverse",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: "#e2e8f0",
        padding: 14,
        shadowColor: "#0891b2",
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    recName: {
        fontSize: 15,
        fontWeight: "900",
        color: "#1e293b",
        writingDirection: "rtl",
    },
    recSub: {
        fontSize: 11,
        fontWeight: "600",
        color: "#64748b",
        writingDirection: "rtl",
        marginTop: 2,
    },
    recBuyBtn: {
        backgroundColor: "#2563eb",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
    },
    recBuyText: {
        fontSize: 13,
        fontWeight: "900",
        color: "#fff",
    },
    // ── Section label ──
    sectionLabel: {
        fontSize: 14,
        fontWeight: "800",
        color: "#475569",
        writingDirection: "rtl",
        marginBottom: 12,
    },
    // ── Asset Grid ──
    realAssetsGrid: {
        flexDirection: "row-reverse",
        flexWrap: "wrap",
        gap: 12,
    },
    realAssetCard: {
        width: "48%" as unknown as number,
        backgroundColor: "#ffffff",
        borderRadius: 20,
        borderWidth: 2,
        borderColor: "#e2e8f0",
        padding: 16,
        alignItems: "center",
        flexGrow: 1,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    realAssetCardOwned: {
        borderColor: "#4ade80",
        backgroundColor: "#f0fdf4",
    },
    realAssetCardDeal: {
        borderColor: "#22d3ee",
        backgroundColor: "#ecfeff",
    },
    comboBadge: {
        position: "absolute",
        top: -6,
        left: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        backgroundColor: "#ecfeff",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        zIndex: 5,
    },
    comboBadgeText: {
        fontSize: 9,
        fontWeight: "900",
        color: "#0e7490",
    },
    dealTagSmall: {
        position: "absolute",
        top: -6,
        right: 8,
        backgroundColor: "#ef4444",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        zIndex: 5,
    },
    dealTagText: {
        fontSize: 10,
        fontWeight: "900",
        color: "#fff",
    },
    emojiContainer: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: "#f8fafc",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#f1f5f9",
    },
    realAssetName: {
        fontSize: 14,
        fontWeight: "900",
        color: "#1e293b",
        textAlign: "center",
        marginBottom: 4,
        writingDirection: "rtl",
    },
    yieldTag: {
        flexDirection: "row-reverse",
        alignItems: "center",
        gap: 4,
        marginBottom: 4,
    },
    realAssetYield: {
        fontSize: 12,
        fontWeight: "700",
        color: "#166534",
    },
    roiRow: {
        flexDirection: "row-reverse",
        alignItems: "center",
        gap: 3,
        marginBottom: 8,
    },
    roiText: {
        fontSize: 10,
        fontWeight: "600",
        color: "#0891b2",
    },
    monthlyText: {
        fontSize: 10,
        fontWeight: "600",
        color: "#64748b",
        marginBottom: 8,
    },
    tierDotsRow: {
        flexDirection: "row",
        gap: 6,
        marginBottom: 10,
    },
    tierDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#e2e8f0",
    },
    tierDotActive: {
        backgroundColor: "#0891b2",
    },
    actionLabel: {
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 8,
        width: "100%",
        alignItems: "center",
        borderWidth: 1.5,
    },
    actionLabelBuy: {
        backgroundColor: "#2563eb",
        borderColor: "#1d4ed8",
    },
    actionLabelUpgrade: {
        backgroundColor: "#0891b2",
        borderColor: "#0e7490",
    },
    actionLabelOwned: {
        backgroundColor: "#f0fdf4",
        borderColor: "#4ade80",
    },
    actionLabelText: {
        fontSize: 12,
        fontWeight: "900",
        color: "#ffffff",
    },
    actionLabelTextOwned: {
        color: "#166534",
    },
    // ── Combos ──
    comboCard: {
        flexDirection: "row-reverse",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        padding: 12,
        marginBottom: 8,
    },
    comboName: {
        fontSize: 14,
        fontWeight: "800",
        color: "#1e293b",
        writingDirection: "rtl",
    },
    comboDesc: {
        fontSize: 11,
        fontWeight: "600",
        color: "#64748b",
        writingDirection: "rtl",
    },
    comboBonusPill: {
        backgroundColor: "#ecfeff",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    comboBonusText: {
        fontSize: 13,
        fontWeight: "900",
        color: "#0891b2",
    },
    // ── Portfolio Summary ──
    portfolioSummary: {
        marginTop: 20,
        backgroundColor: "#fff",
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: "#e2e8f0",
        padding: 16,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    summaryTitle: {
        fontSize: 15,
        fontWeight: "900",
        color: "#1e293b",
        textAlign: "center",
        marginBottom: 12,
    },
    summaryRow: {
        flexDirection: "row-reverse",
        justifyContent: "space-between",
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
    },
    summaryLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: "#64748b",
        writingDirection: "rtl",
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: "800",
        color: "#16a34a",
    },
    milestonesRow: {
        flexDirection: "row-reverse",
        alignItems: "center",
        gap: 6,
        marginTop: 10,
        justifyContent: "center",
    },
    milestonesText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#0891b2",
    },
    // ── Modal ──
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    modalCard: {
        backgroundColor: "#ffffff",
        borderRadius: 24,
        padding: 20,
        width: "100%",
        maxWidth: 340,
        maxHeight: "80%",
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
    },
    modalHeader: {
        alignItems: "center",
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: "900",
        color: "#1e293b",
        textAlign: "center",
        marginTop: 10,
    },
    modalDesc: {
        fontSize: 13,
        color: "#64748b",
        lineHeight: 20,
        textAlign: "right",
        marginBottom: 12,
        writingDirection: "rtl",
    },
    modalConceptPill: {
        backgroundColor: "#f1f5f9",
        borderRadius: 12,
        padding: 10,
        marginBottom: 12,
        width: "100%",
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    modalConceptText: {
        fontSize: 12,
        color: "#334155",
        fontWeight: "700",
        textAlign: "right",
        writingDirection: "rtl",
    },
    modalRoiSection: {
        flexDirection: "row-reverse",
        justifyContent: "space-around",
        width: "100%",
        marginBottom: 14,
        backgroundColor: "#f0fdf4",
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: "#bbf7d0",
    },
    modalRoiItem: {
        alignItems: "center",
    },
    modalRoiLabel: {
        fontSize: 10,
        fontWeight: "600",
        color: "#64748b",
        marginBottom: 2,
    },
    modalRoiValue: {
        fontSize: 15,
        fontWeight: "900",
        color: "#166534",
    },
    modalComboHint: {
        flexDirection: "row-reverse",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#ecfeff",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        marginBottom: 12,
        width: "100%",
    },
    modalComboHintText: {
        fontSize: 13,
        fontWeight: "800",
        color: "#0e7490",
        writingDirection: "rtl",
    },
    voucherToggle: {
        backgroundColor: "#f1f5f9",
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginBottom: 12,
        width: "100%",
        alignItems: "center",
        borderWidth: 1.5,
        borderColor: "#e2e8f0",
    },
    voucherToggleActive: {
        backgroundColor: "#ecfeff",
        borderColor: "#22d3ee",
    },
    voucherToggleText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#475569",
    },
    modalCostRow: {
        alignItems: "center",
        marginBottom: 16,
        gap: 6,
    },
    modalCostLabel: {
        fontSize: 13,
        color: "#64748b",
        fontWeight: "700",
    },
    modalOrigCost: {
        fontSize: 14,
        fontWeight: "600",
        color: "#64748b",
        textDecorationLine: "line-through",
        marginBottom: 2,
    },
    modalCostBadge: {
        backgroundColor: "#ecfeff",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: "#22d3ee",
        alignItems: "center",
    },
    modalCostValue: {
        fontSize: 20,
        fontWeight: "900",
        color: "#0e7490",
    },
    modalConfirmBtn: {
        backgroundColor: "#16a34a",
        borderRadius: 16,
        paddingVertical: 16,
        width: "100%",
        alignItems: "center",
        borderBottomWidth: 4,
        borderBottomColor: "#15803d",
    },
    modalConfirmText: {
        fontSize: 17,
        fontWeight: "900",
        color: "#ffffff",
    },
    // ── Mortgage ──
    mortgageBadgeText: {
        fontSize: 11,
        fontWeight: "800",
        color: "#0e7490",
        writingDirection: "rtl",
    },
    mortgageSection: {
        marginTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#e2e8f0",
        paddingTop: 12,
        alignItems: "center",
        gap: 8,
    },
    mortgageDivider: {
        fontSize: 13,
        fontWeight: "700",
        color: "#64748b",
    },
    mortgageBtn: {
        backgroundColor: "#0891b2",
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 20,
        width: "100%",
        alignItems: "center",
        borderBottomWidth: 3,
        borderBottomColor: "#0e7490",
    },
    mortgageBtnText: {
        fontSize: 15,
        fontWeight: "900",
        color: "#ffffff",
    },
    mortgageDetails: {
        backgroundColor: "#f0f9ff",
        borderRadius: 12,
        padding: 10,
        width: "100%",
        gap: 4,
    },
    mortgageDetailText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#0c4a6e",
        writingDirection: "rtl",
        textAlign: "right",
    },
});
