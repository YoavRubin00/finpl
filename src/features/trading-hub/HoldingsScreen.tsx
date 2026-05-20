import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { RefreshCw } from 'lucide-react-native';
import { CALM } from '../../constants/theme';
import { BackButton } from '../../components/ui/BackButton';
import { LottieIcon } from '../../components/ui/LottieIcon';
import { AnimatedPressable } from '../../components/ui/AnimatedPressable';
import { PortfolioSummaryCard } from './PortfolioSummaryCard';
import { StockIcon } from './StockIcon';
import { GlobalWealthHeader } from '../../components/ui/GlobalWealthHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ASSET_BY_ID } from './tradingHubData';
import { useTradingStore } from './useTradingStore';
import { useEconomyStore } from '../economy/useEconomyStore';
import { clearPriceCache, fetchLatestPrice } from './marketApiService';
import { tapHaptic, successHaptic } from '../../utils/haptics';
import type { ActivePosition } from './tradingHubTypes';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

const LOTTIE_CHART = require('../../../assets/lottie/wired-flat-153-bar-chart-hover-pinch.json');
const LOTTIE_TROPHY = require('../../../assets/lottie/wired-flat-3263-trophy-circle-hover-roll.json');
const LOTTIE_GROWTH = require('../../../assets/lottie/wired-flat-161-growth-hover-pinch.json');
const LOTTIE_REPLAY = require('../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json');

interface CloseResult {
    assetId: string;
    type: 'buy' | 'sell';
    invested: number;
    returned: number;
    pnlPercent: number;
}

export function HoldingsScreen() {
    const router = useRouter();
    const positions = useTradingStore((s) => s.positions);
    const pendingOrders = useTradingStore((s) => s.pendingOrders);
    const closePosition = useTradingStore((s) => s.closePosition);
    const updatePrices = useTradingStore((s) => s.updatePrices);
    const cancelLimitOrder = useTradingStore((s) => s.cancelLimitOrder);
    const coins = useEconomyStore((s) => s.coins);
    const addCoins = useEconomyStore((s) => s.addCoins);
    const insets = useSafeAreaInsets();

    const [closeResult, setCloseResult] = useState<CloseResult | null>(null);

    // Refresh prices on mount (and on demand via refresh button)
    const mountedRef = useRef(true);
    const refreshPrices = useCallback(() => {
        const assetIds = [...new Set(useTradingStore.getState().positions.map((p) => p.assetId))];
        assetIds.forEach(async (id) => {
            try {
                const price = await fetchLatestPrice(id);
                if (price > 0 && mountedRef.current) updatePrices(id, price);
            } catch { /* skip */ }
        });
    }, [updatePrices]);

    useEffect(() => {
        mountedRef.current = true;
        refreshPrices();
        return () => { mountedRef.current = false; };
    }, [refreshPrices]);

    const handleRefreshPrices = useCallback(() => {
        tapHaptic();
        clearPriceCache();
        refreshPrices();
    }, [refreshPrices]);

    // Compute totals
    const totalInvested = positions.reduce((s, p) => s + p.amountInvested, 0);
    const totalCurrentValue = positions.reduce((s, p) => {
        const factor = 1 + p.pnlPercent / 100;
        return s + Math.round(p.amountInvested * factor);
    }, 0);
    const totalPnl = totalCurrentValue - totalInvested;
    const totalPnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

    const handleSell = useCallback((pos: ActivePosition) => {
        tapHaptic();
        // closePosition credits virtual_balance with the PnL-adjusted return
        // internally — see useTradingStore. Do NOT credit again here.
        const closed = closePosition(pos.id);
        if (!closed) return;

        const pnlFactor = 1 + closed.pnlPercent / 100;
        const returned = Math.max(0, Math.round(closed.amountInvested * pnlFactor));

        successHaptic();
        setCloseResult({
            assetId: closed.assetId,
            type: closed.type,
            invested: closed.amountInvested,
            returned,
            pnlPercent: closed.pnlPercent,
        });
    }, [closePosition]);

    const handleBuyMore = useCallback((assetId: string) => {
        tapHaptic();
        router.push(`/trading-hub?asset=${assetId}` as never);
    }, [router]);

    const handleCancelOrder = useCallback((orderId: string) => {
        tapHaptic();
        const refunded = cancelLimitOrder(orderId);
        if (refunded > 0) addCoins(refunded);
    }, [cancelLimitOrder, addCoins]);

    const isProfit = closeResult ? closeResult.pnlPercent >= 0 : false;

    return (
        <View style={styles.container}>
            <View style={{ backgroundColor: "#ffffff" }}>
                <View style={{ paddingTop: insets.top }} />
                <GlobalWealthHeader />
            </View>
            <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
                {/* Header */}
                <View style={styles.header}>
                    <BackButton />
                    <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={[RTL, styles.title]}>האחזקות שלי</Text>
                        <Text style={[RTL, styles.subtitle, { marginTop: 2, marginBottom: 8 }]}>ניהול תיק ההשקעות הווירטואלי שלך</Text>
                    </View>
                    <Pressable
                        onPress={handleRefreshPrices}
                        style={({ pressed }) => [styles.refreshBtn, pressed && styles.refreshBtnPressed]}
                        accessibilityRole="button"
                        accessibilityLabel="רענן מחירים"
                        hitSlop={8}
                    >
                        <RefreshCw size={18} color={CALM.textSecondary} />
                    </Pressable>
                </View>

                <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Portfolio Summary */}
                    <PortfolioSummaryCard
                        totalInvested={totalInvested}
                        totalCurrentValue={totalCurrentValue}
                        totalPnl={totalPnl}
                        totalPnlPercent={totalPnlPercent}
                        availableCoins={coins}
                    />

                    {/* Positions */}
                    {positions.length > 0 ? (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <LottieIcon source={LOTTIE_CHART} size={22} />
                                <Text style={[RTL, styles.sectionTitle]}>פוזיציות פתוחות</Text>
                            </View>

                            {positions.map((pos, i) => {
                                const asset = ASSET_BY_ID.get(pos.assetId);
                                const isPosProfit = pos.pnlPercent >= 0;
                                const pnlColor = isPosProfit ? CALM.profit : CALM.loss;
                                const pnlBg = isPosProfit ? CALM.profitSurface : CALM.lossSurface;
                                const pnlSign = isPosProfit ? '+' : '';

                                return (
                                    <Animated.View key={pos.id} entering={FadeInDown.delay(i * 60).duration(300)}>
                                        <View style={styles.posCard}>
                                            {/* Asset info */}
                                            <View style={styles.posTopRow}>
                                                <View style={styles.posAssetInfo}>
                                                    <StockIcon assetId={pos.assetId} size={28} />
                                                    <View style={{ alignItems: 'flex-end' }}>
                                                        <Text style={[RTL, styles.posAssetName]}>
                                                            {asset?.name ?? pos.assetId}
                                                        </Text>
                                                        <Text style={styles.posAssetTicker}>{pos.assetId}</Text>
                                                    </View>
                                                </View>
                                                <View style={[styles.posPnlBadge, { backgroundColor: pnlBg }]}>
                                                    <Text style={[styles.posPnlText, { color: pnlColor }]}>
                                                        {pnlSign}{pos.pnlPercent.toFixed(2)}%
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Prices */}
                                            <View style={styles.posPriceRow}>
                                                <View style={styles.posPriceCol}>
                                                    <Text style={[RTL, styles.posPriceLabel]}>כניסה</Text>
                                                    <Text style={styles.posPriceValue}>${pos.entryPrice.toFixed(2)}</Text>
                                                </View>
                                                <Text style={styles.posArrow}>←</Text>
                                                <View style={styles.posPriceCol}>
                                                    <Text style={[RTL, styles.posPriceLabel]}>נוכחי</Text>
                                                    <Text style={[styles.posPriceValue, { color: pnlColor }]}>
                                                        ${pos.currentPrice.toFixed(2)}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Invested + Actions */}
                                            <View style={styles.posBottomRow}>
                                                <Text style={[RTL, styles.posInvested]}>
                                                    {pos.amountInvested.toLocaleString('he-IL')} 
                                                </Text>
                                                <View style={styles.posActions}>
                                                    <AnimatedPressable
                                                        onPress={() => handleBuyMore(pos.assetId)}
                                                        style={styles.buyMoreBtn}
                                                    >
                                                        <Text style={styles.buyMoreText}>קנה עוד</Text>
                                                    </AnimatedPressable>
                                                    <AnimatedPressable
                                                        onPress={() => handleSell(pos)}
                                                        style={styles.sellBtn}
                                                    >
                                                        <Text style={styles.sellText}>מכור</Text>
                                                    </AnimatedPressable>
                                                </View>
                                            </View>
                                        </View>
                                    </Animated.View>
                                );
                            })}
                        </View>
                    ) : (
                        /* Empty state */
                        <Animated.View entering={FadeInDown.delay(200)} style={styles.emptyState}>
                            <LottieIcon source={LOTTIE_GROWTH} size={80} />
                            <Text style={[RTL, styles.emptyTitle]}>אין אחזקות עדיין</Text>
                            <Text style={[RTL, styles.emptySubtitle]}>
                                בחר נכס ותתחיל לסחור בסימולטור
                            </Text>
                            <AnimatedPressable
                                onPress={() => router.push('/trading-hub' as never)}
                                style={styles.emptyCta}
                            >
                                <Text style={styles.emptyCtaText}>גלה נכסים</Text>
                            </AnimatedPressable>
                        </Animated.View>
                    )}

                    {/* Pending Limit Orders */}
                    {pendingOrders.length > 0 && (
                        <View style={styles.section}>
                            <Text style={[RTL, styles.sectionTitle]}>הוראות ממתינות</Text>
                            {pendingOrders.map((order) => {
                                const asset = ASSET_BY_ID.get(order.assetId);
                                return (
                                    <View key={order.id} style={styles.orderCard}>
                                        <View style={styles.orderRow}>
                                            <StockIcon assetId={order.assetId} size={22} />
                                            <Text style={[RTL, styles.orderName]}>
                                                {asset?.name ?? order.assetId}
                                            </Text>
                                            <Text style={styles.orderLimit}>
                                                @${order.limitPrice.toFixed(2)}
                                            </Text>
                                            <Text style={styles.orderAmount}>
                                                {order.amountInvested} 
                                            </Text>
                                        </View>
                                        <Pressable
                                            onPress={() => handleCancelOrder(order.id)}
                                            style={styles.cancelBtn}
                                        >
                                            <Text style={styles.cancelText}>ביטול</Text>
                                        </Pressable>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>

            {/* Close Result Modal */}
            <Modal
                visible={closeResult !== null}
                transparent
                animationType="fade"
                onRequestClose={() => setCloseResult(null)}
            >
                <Pressable style={styles.modalBackdrop} onPress={() => setCloseResult(null)}>
                    <Pressable style={styles.resultCard} onPress={() => {}}>
                        <Animated.View entering={FadeIn.duration(400)} style={styles.resultContent}>
                            <LottieIcon
                                source={isProfit ? LOTTIE_TROPHY : LOTTIE_CHART}
                                size={64}
                            />
                            <Text style={[RTL, styles.resultTitle]}>
                                {isProfit ? 'רווח!' : 'הפסד'}
                            </Text>

                            {closeResult && (
                                <>
                                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                                        <StockIcon assetId={closeResult.assetId} size={24} />
                                        <Text style={[RTL, styles.resultAsset]}>
                                            {closeResult.assetId}
                                        </Text>
                                    </View>

                                    <View style={[
                                        styles.resultPnlBadge,
                                        { backgroundColor: isProfit ? CALM.profitSurface : CALM.lossSurface },
                                    ]}>
                                        <Text style={[
                                            styles.resultPnlText,
                                            { color: isProfit ? CALM.profit : CALM.loss },
                                        ]}>
                                            {isProfit ? '+' : ''}{closeResult.pnlPercent.toFixed(2)}%
                                        </Text>
                                    </View>

                                    <View style={styles.resultSummary}>
                                        <View style={styles.resultRow}>
                                            <Text style={[RTL, styles.resultLabel]}>השקעה</Text>
                                            <Text style={styles.resultValue}>
                                                {closeResult.invested.toLocaleString('he-IL')} 
                                            </Text>
                                        </View>
                                        <View style={styles.resultDivider} />
                                        <View style={styles.resultRow}>
                                            <Text style={[RTL, styles.resultLabel]}>קיבלת בחזרה</Text>
                                            <Text style={[
                                                styles.resultValue,
                                                { color: isProfit ? CALM.profit : CALM.loss },
                                            ]}>
                                                {closeResult.returned.toLocaleString('he-IL')} 
                                            </Text>
                                        </View>
                                    </View>

                                    <Text style={[RTL, styles.resultMessage]}>
                                        {isProfit
                                            ? 'כל הכבוד! קראת את השוק נכון'
                                            : 'לא נורא, זו הזדמנות ללמוד!'}
                                    </Text>
                                </>
                            )}

                            <AnimatedPressable
                                onPress={() => setCloseResult(null)}
                                style={styles.resultDismissBtn}
                            >
                                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                                    <LottieIcon source={LOTTIE_REPLAY} size={18} />
                                    <Text style={styles.resultDismissText}>
                                        {isProfit ? 'יאללה, עוד עסקה!' : 'חוזרים לזירה!'}
                                    </Text>
                                </View>
                            </AnimatedPressable>
                        </Animated.View>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: CALM.bg,
    },
    header: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 4,
    },
    title: {
        fontSize: 22,
        fontWeight: '900',
        color: CALM.textPrimary,
    },
    subtitle: {
        fontSize: 13,
        fontWeight: '600',
        color: CALM.textSecondary,
        textAlign: 'center',
        marginBottom: 16,
    },
    scrollContent: {
        paddingBottom: 40,
        gap: 20,
    },
    refreshBtn: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(107,114,128,0.1)',
    },
    refreshBtnPressed: {
        opacity: 0.5,
    },

    /* ── Sections ── */
    section: {
        paddingHorizontal: 16,
        gap: 10,
    },
    sectionHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: CALM.textPrimary,
    },

    /* ── Position Card ── */
    posCard: {
        backgroundColor: CALM.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: CALM.border,
        padding: 14,
        gap: 10,
    },
    posTopRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    posAssetInfo: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
    },
    posAssetName: {
        fontSize: 15,
        fontWeight: '900',
        color: CALM.textPrimary,
    },
    posAssetTicker: {
        fontSize: 12,
        fontWeight: '600',
        color: CALM.textSecondary,
    },
    posPnlBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    posPnlText: {
        fontSize: 14,
        fontWeight: '900',
        fontVariant: ['tabular-nums'],
    },
    posPriceRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        backgroundColor: CALM.surfaceMuted,
        borderRadius: 10,
        padding: 8,
    },
    posPriceCol: {
        alignItems: 'center',
        gap: 2,
    },
    posPriceLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: CALM.textSecondary,
    },
    posPriceValue: {
        fontSize: 15,
        fontWeight: '900',
        color: CALM.textPrimary,
        fontVariant: ['tabular-nums'],
    },
    posArrow: {
        fontSize: 16,
        color: CALM.textTertiary,
    },
    posBottomRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    posInvested: {
        fontSize: 13,
        fontWeight: '700',
        color: CALM.textSecondary,
    },
    posActions: {
        flexDirection: 'row',
        gap: 8,
    },
    buyMoreBtn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: CALM.accentLight,
        borderWidth: 1,
        borderColor: CALM.accent,
    },
    buyMoreText: {
        fontSize: 13,
        fontWeight: '800',
        color: CALM.accent,
    },
    sellBtn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: CALM.lossSurface,
        borderWidth: 1,
        borderColor: CALM.loss,
    },
    sellText: {
        fontSize: 13,
        fontWeight: '800',
        color: CALM.loss,
    },

    /* ── Empty State ── */
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
        gap: 12,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: CALM.textPrimary,
    },
    emptySubtitle: {
        fontSize: 14,
        fontWeight: '600',
        color: CALM.textSecondary,
        textAlign: 'center',
    },
    emptyCta: {
        marginTop: 8,
        backgroundColor: CALM.buttonPrimary,
        borderRadius: 14,
        paddingHorizontal: 24,
        paddingVertical: 12,
    },
    emptyCtaText: {
        fontSize: 16,
        fontWeight: '900',
        color: '#ffffff',
    },

    /* ── Pending Orders ── */
    orderCard: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: CALM.coinSurface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#fbbf2440',
        padding: 12,
    },
    orderRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    orderName: {
        fontSize: 14,
        fontWeight: '800',
        color: CALM.textPrimary,
    },
    orderLimit: {
        fontSize: 12,
        fontWeight: '700',
        color: CALM.coinGold,
    },
    orderAmount: {
        fontSize: 12,
        fontWeight: '700',
        color: CALM.textSecondary,
    },
    cancelBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: CALM.loss,
    },
    cancelText: {
        fontSize: 12,
        fontWeight: '800',
        color: CALM.loss,
    },

    /* ── Close Result Modal ── */
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    resultCard: {
        width: '85%',
        backgroundColor: CALM.surface,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: CALM.border,
        padding: 28,
    },
    resultContent: {
        alignItems: 'center',
        gap: 12,
    },
    resultTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: CALM.textPrimary,
    },
    resultAsset: {
        fontSize: 15,
        fontWeight: '700',
        color: CALM.textSecondary,
    },
    resultPnlBadge: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 12,
    },
    resultPnlText: {
        fontSize: 22,
        fontWeight: '900',
        fontVariant: ['tabular-nums'],
    },
    resultSummary: {
        width: '100%',
        backgroundColor: CALM.surfaceMuted,
        borderRadius: 14,
        padding: 14,
    },
    resultRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    resultLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: CALM.textSecondary,
    },
    resultValue: {
        fontSize: 16,
        fontWeight: '900',
        color: CALM.textPrimary,
        fontVariant: ['tabular-nums'],
    },
    resultDivider: {
        height: 1,
        backgroundColor: CALM.divider,
        marginVertical: 6,
    },
    resultMessage: {
        fontSize: 14,
        fontWeight: '700',
        color: CALM.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    resultDismissBtn: {
        width: '100%',
        backgroundColor: CALM.buttonPrimary,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 4,
    },
    resultDismissText: {
        fontSize: 16,
        fontWeight: '900',
        color: '#ffffff',
    },
});
