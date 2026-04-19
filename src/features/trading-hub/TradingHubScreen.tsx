import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Briefcase, RefreshCw, Star } from 'lucide-react-native';
import LottieView from 'lottie-react-native';
import type { AnimationObject } from 'lottie-react-native';
// LinearGradient removed, learn cards now use flat ocean-teal style
import { CALM } from '../../constants/theme';
import { BackButton } from '../../components/ui/BackButton';
import { AnimatedPressable } from '../../components/ui/AnimatedPressable';
import { GlobalWealthHeader } from '../../components/ui/GlobalWealthHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StockIcon } from './StockIcon';
import { TRADABLE_ASSETS, ASSET_BY_ID } from './tradingHubData';
import { tapHaptic, mediumHaptic } from '../../utils/haptics';
import { AssetInfoSheet } from './AssetInfoSheet';
import { TradingChart } from './TradingChart';
import { ChartModeOnboarding } from './ChartModeOnboarding';
import { IndicatorInfoSheet } from './IndicatorInfoSheet';
import { WatchlistHint } from './WatchlistHint';
import { AssetUnlockIntro } from './AssetUnlockIntro';
import { BuySheet } from './BuySheet';
import { SharkBridgeCTA } from '../../components/ui/SharkCTAModals';
import { MarketStatusBar } from './MarketStatusBar';
import { SharkInlineTip } from './SharkInlineTip';
import { MarketMissionCard } from './MarketMissionCard';
import { AssetUnlockSheet } from './AssetUnlockSheet';
import { fetchChartData, fetchLatestPrice, fetchPreviousClose, clearCache, isDataLive } from './marketApiService';
import { Timeframe, ChartDataPoint, VolatilityRating, AssetType, TradableAsset, IndicatorId } from './tradingHubTypes';
import { useTradingStore } from './useTradingStore';
import { useTradingHubUiStore } from './useTradingHubUiStore';
import { useMarketMissionStore } from './useMarketMissionStore';
import { useChapterStore } from '../chapter-1-content/useChapterStore';
import { useTutorialStore } from '../../stores/useTutorialStore';
import { useAuthStore } from '../auth/useAuthStore';
import { TradingHubTutorial } from './TradingHubTutorial';
import { NotificationBanner } from '../../components/ui/NotificationBanner';

const ITEM_SIZE = 72;
const ITEM_GAP = 12;

const LEARN_LINKS: { moduleId: string; chapterId: string; title: string; subtitle: string; lottieSource: AnimationObject }[] = [
    { moduleId: 'mod-4-19', chapterId: 'chapter-4', title: 'שוק ההון', subtitle: 'מניות, אג"ח ויחס סיכון-תשואה', lottieSource: require('../../../assets/lottie/wired-flat-947-investment-hover-pinch.json') as AnimationObject },
    { moduleId: 'mod-4-22', chapterId: 'chapter-4', title: 'פקודות מסחר', subtitle: 'לימיט, מארקט, סטופ לוס', lottieSource: require('../../../assets/lottie/wired-flat-163-graph-line-chart-hover-slide.json') as AnimationObject },
    { moduleId: 'mod-4-21', chapterId: 'chapter-4', title: 'תעודות סל, ETF', subtitle: 'פיזור בקלות עם מוצר אחד', lottieSource: require('../../../assets/lottie/wired-flat-152-bar-chart-arrow-hover-growth.json') as AnimationObject },
    { moduleId: 'mod-4-24', chapterId: 'chapter-4', title: 'פיזור וניהול סיכונים', subtitle: 'בניית תיק חכם ומאוזן', lottieSource: require('../../../assets/lottie/wired-flat-166-bar-chart-diversified-double-hover-growth.json') as AnimationObject },
];

const TIMEFRAMES: { value: Timeframe; label: string }[] = [
    { value: '1D', label: 'יום' },
    { value: '1W', label: 'שבוע' },
];

const VOLATILITY_CONFIG: Record<VolatilityRating, { dot: string; label: string }> = {
    low: { dot: '🟢', label: 'נמוך' },
    medium: { dot: '🟡', label: 'בינוני' },
    high: { dot: '🔴', label: 'גבוה' },
    extreme: { dot: '🚀', label: 'קיצוני' },
};

export function TradingHubScreen() {
    const router = useRouter();
    const { asset: assetParam } = useLocalSearchParams<{ asset?: string }>();

    const initialAsset = assetParam && ASSET_BY_ID.has(assetParam) ? assetParam : TRADABLE_ASSETS[0].id;
    const [selectedId, setSelectedId] = useState(initialAsset);
    const [sheetVisible, setSheetVisible] = useState(false);
    const [buySheetVisible, setBuySheetVisible] = useState(false);
    const [timeframe, setTimeframe] = useState<Timeframe>('1D');
    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
    const [chartLoading, setChartLoading] = useState(true);
    const [currentPrice, setCurrentPrice] = useState(0);
    const [previousClose, setPreviousClose] = useState<number | null>(null);
    const [isLive, setIsLive] = useState(true);
    const scrollRef = useRef<ScrollView>(null);

    const hasSeenIntro = useTutorialStore((s) => s.hasSeenTradingHubIntro);
    const [showTutorial, setShowTutorial] = useState(!hasSeenIntro);
    const insets = useSafeAreaInsets();

    // Knowledge-level personalisation
    const knowledgeLevel = useAuthStore((s) => s.profile?.knowledgeLevel);
    const isAdvancedKnowledge =
        knowledgeLevel === 'some' || knowledgeLevel === 'experienced' || knowledgeLevel === 'expert';
    const hasSeenIndicesNudge = useTutorialStore((s) => s.hasSeenIndicesOnlyNudge);
    const markIndicesNudgeSeen = useTutorialStore((s) => s.markIndicesOnlyNudgeSeen);
    const [showIndicesNudge, setShowIndicesNudge] = useState(false);

    const updatePrices = useTradingStore((s) => s.updatePrices);
    const positions = useTradingStore((s) => s.positions);
    const positionCount = positions.length;

    // ── UI state: watchlist + progressive unlock + missions + chart mode ──────
    const watchlist = useTradingHubUiStore((s) => s.watchlist);
    const unlockedTypes = useTradingHubUiStore((s) => s.unlockedAssetTypes);
    const toggleWatchlist = useTradingHubUiStore((s) => s.toggleWatchlist);
    const unlockAssetType = useTradingHubUiStore((s) => s.unlockAssetType);
    const chartMode = useTradingHubUiStore((s) => s.chartMode);
    const setChartMode = useTradingHubUiStore((s) => s.setChartMode);
    const chartMAPeriod = useTradingHubUiStore((s) => s.chartMAPeriod);
    const setChartMAPeriod = useTradingHubUiStore((s) => s.setChartMAPeriod);
    const refreshMissionDaily = useMarketMissionStore((s) => s.refreshDaily);
    const markMissionCompleted = useMarketMissionStore((s) => s.markCompletedIfMatches);

    // Celebration state for unlock sheet
    const [unlockCelebrationType, setUnlockCelebrationType] = useState<AssetType | null>(null);
    // Indicator info sheet
    const [indicatorInfo, setIndicatorInfo] = useState<IndicatorId | null>(null);
    const handleIndicatorInfo = useCallback((id: IndicatorId) => setIndicatorInfo(id), []);

    // Captain Shark bridge nudge, appears a few seconds after the screen loads,
    // inviting the user to convert their practice into real-world benefits.
    const [bridgeCtaVisible, setBridgeCtaVisible] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => setBridgeCtaVisible(true), 5000);
        return () => clearTimeout(timer);
    }, []);

    // Refresh today's mission on mount
    useEffect(() => {
        refreshMissionDaily();
    }, [refreshMissionDaily]);

    // Auto-unlock stocks for users with knowledge level >= "some" (3+)
    useEffect(() => {
        if (isAdvancedKnowledge) {
            unlockAssetType('stock');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // One-time Finn nudge: indices-only starters (knowledge < "some")
    useEffect(() => {
        if (!isAdvancedKnowledge && !hasSeenIndicesNudge) {
            const timer = setTimeout(() => setShowIndicesNudge(true), 3500);
            return () => clearTimeout(timer);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Crypto unlock: subscribe to chapter-5 progress so a mid-session completion
    // triggers the unlock immediately, not just on the next mount.
    const ch5CompletedModules = useChapterStore(
        (s) => s.progress['ch-5']?.completedModules.length ?? 0,
    );
    useEffect(() => {
        if (ch5CompletedModules > 0) {
            const didUnlock = unlockAssetType('crypto');
            if (didUnlock) setUnlockCelebrationType('crypto');
        }
    }, [ch5CompletedModules, unlockAssetType]);

    // Filter + sort the carousel: unlocked types only, watched first.
    const visibleAssets = useMemo<TradableAsset[]>(() => {
        const allowed = TRADABLE_ASSETS.filter((a) => unlockedTypes.includes(a.type));
        const watched = allowed.filter((a) => watchlist.includes(a.id));
        const others = allowed.filter((a) => !watchlist.includes(a.id));
        return [...watched, ...others];
    }, [unlockedTypes, watchlist]);

    // If the currently selected asset became locked (edge case on first mount),
    // fall back to the first visible asset.
    useEffect(() => {
        if (!visibleAssets.some((a) => a.id === selectedId) && visibleAssets.length > 0) {
            setSelectedId(visibleAssets[0].id);
        }
    }, [visibleAssets, selectedId]);

    // ── Mission triggers ──────────────────────────────────────────────────────
    // view-chart: after 3 seconds on the screen
    useEffect(() => {
        const timer = setTimeout(() => {
            markMissionCompleted('view-chart');
        }, 3000);
        return () => clearTimeout(timer);
    }, [markMissionCompleted]);

    // compare-prices: two asset switches within 10 seconds
    const lastAssetSwitchAt = useRef<number>(0);
    const handleAssetSwitch = useCallback((nextId: string) => {
        const now = Date.now();
        markMissionCompleted('switch-asset');
        if (lastAssetSwitchAt.current > 0 && now - lastAssetSwitchAt.current <= 10_000) {
            markMissionCompleted('compare-prices');
        }
        lastAssetSwitchAt.current = now;
        setSelectedId(nextId);
    }, [markMissionCompleted]);

    const handleTimeframeChange = useCallback((tf: Timeframe) => {
        tapHaptic();
        setTimeframe(tf);
        if (tf === '1W') markMissionCompleted('view-weekly');
    }, [markMissionCompleted]);

    const handleToggleWatchlist = useCallback((assetId: string) => {
        mediumHaptic();
        toggleWatchlist(assetId);
        markMissionCompleted('star-asset');
    }, [toggleWatchlist, markMissionCompleted]);

    const handleVolatilityTap = useCallback(() => {
        tapHaptic();
        markMissionCompleted('check-volatility');
    }, [markMissionCompleted]);

    const handleBuyUnlocked = useCallback((type: 'stock') => {
        setUnlockCelebrationType(type);
    }, []);

    const loadChart = useCallback(async (assetId: string, tf: Timeframe) => {
        setChartLoading(true);
        const [data, price, prevClose] = await Promise.all([
            fetchChartData(assetId, tf),
            fetchLatestPrice(assetId),
            fetchPreviousClose(assetId),
        ]);
        setChartData(data);
        setCurrentPrice(price);
        setPreviousClose(prevClose);
        setIsLive(isDataLive());
        setChartLoading(false);
    }, []);

    useEffect(() => {
        loadChart(selectedId, timeframe);
    }, [selectedId, timeframe, loadChart]);

    useEffect(() => {
        if (currentPrice > 0) {
            updatePrices(selectedId, currentPrice);
        }
    }, [currentPrice, selectedId, updatePrices]);

    // Pre-select from query param
    useEffect(() => {
        if (assetParam && ASSET_BY_ID.has(assetParam) && assetParam !== selectedId) {
            setSelectedId(assetParam);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [assetParam]);

    return (
        <View style={styles.container}>
            <View style={{ backgroundColor: "#ffffff" }}>
                <View style={{ paddingTop: insets.top }} />
                <GlobalWealthHeader />
            </View>
            <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
                {/* Sticky Header */}
                <View style={styles.stickyHeader}>
                    <View style={styles.header}>
                        <View style={{ position: 'absolute', right: 0, zIndex: 1 }}>
                            <BackButton onPress={() => router.back()} />
                        </View>
                        <View style={{ flex: 1, alignItems: 'center' }}>
                            <Text style={styles.title}>מסחר בשוק ההון</Text>
                            <Text style={styles.subtitle}>
                                סימולטור · ללא סיכון
                            </Text>
                        </View>
                    </View>
                </View>

                <ScrollView
                    style={{ flex: 1 }}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Market status (shows SPY state regardless of selected asset) */}
                    <MarketStatusBar selectedAssetId={selectedId} />

                    {/* Captain Shark, daily contextual tip */}
                    <SharkInlineTip />

                    {/* Daily market mission */}
                    <MarketMissionCard />

                    {/* One-time hint: long-press = watchlist */}
                    <WatchlistHint />

                    {/* Asset Carousel */}
                    <ScrollView
                        ref={scrollRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.carouselContent}
                        style={styles.carouselSection}
                    >
                        {visibleAssets.map((asset) => {
                            const isActive = asset.id === selectedId;
                            const isWatched = watchlist.includes(asset.id);
                            return (
                                <Pressable
                                    key={asset.id}
                                    onPress={() => {
                                        tapHaptic();
                                        if (asset.id === selectedId) {
                                            setSheetVisible(true);
                                        } else {
                                            handleAssetSwitch(asset.id);
                                        }
                                    }}
                                    onLongPress={() => handleToggleWatchlist(asset.id)}
                                    delayLongPress={350}
                                    accessibilityHint="לחיצה ארוכה להוספה לרשימת המעקב"
                                    style={[styles.assetItem, isActive && styles.assetItemActive]}
                                >
                                    <View style={[styles.assetCircle, isActive && styles.assetCircleActive]}>
                                        <StockIcon assetId={asset.id} size={36} />
                                        {isWatched && (
                                            <View style={styles.starBadge}>
                                                <Star size={10} color="#fbbf24" fill="#fbbf24" strokeWidth={2} />
                                            </View>
                                        )}
                                    </View>
                                    <Text style={[styles.assetLabel, isActive && styles.assetLabelActive]} numberOfLines={1}>
                                        {asset.id}
                                    </Text>
                                    <Pressable
                                        onPress={handleVolatilityTap}
                                        hitSlop={6}
                                        accessibilityRole="button"
                                        accessibilityLabel={`תנודתיות: ${VOLATILITY_CONFIG[asset.volatilityRating].label}`}
                                    >
                                        <Text style={styles.volatilityDot}>
                                            {VOLATILITY_CONFIG[asset.volatilityRating].dot}
                                        </Text>
                                    </Pressable>
                                </Pressable>
                            );
                        })}
                    </ScrollView>

                    {/* One-time strip: which categories are still locked + how to open them */}
                    <AssetUnlockIntro />

                    {/* Chart Card */}
                    <View style={styles.chartCard}>
                        {(() => {
                            const asset = ASSET_BY_ID.get(selectedId);
                            const pctChange = chartData.length >= 2
                                ? ((chartData[chartData.length - 1].price - chartData[0].price) / chartData[0].price) * 100
                                : 0;
                            const rising = pctChange >= 0;
                            return (
                                <View style={styles.chartHeader}>
                                    <Text style={styles.chartAssetName}>{asset?.name ?? selectedId}</Text>
                                    <View style={styles.chartPriceRow}>
                                        <Text style={styles.chartCurrentPrice}>
                                            {currentPrice > 0 ? currentPrice.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'}
                                        </Text>
                                        {!chartLoading && chartData.length >= 2 && (
                                            <View style={[styles.chartChangePill, { backgroundColor: rising ? 'rgba(55,65,81,0.1)' : 'rgba(107,114,128,0.1)' }]}>
                                                <Text style={[styles.chartChangePct, { color: rising ? '#374151' : '#6b7280' }]}>
                                                    {rising ? '+' : ''}{pctChange.toFixed(2)}%
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            );
                        })()}

                        {!isLive && !chartLoading && (
                            <View style={styles.staleBadge}>
                                <Text style={styles.staleBadgeText}>⚠️ נתוני הדגמה, מחירים משוערים</Text>
                            </View>
                        )}

                        {chartMode === null ? (
                            // Defer mounting the WebView until the user has chosen a mode.
                            // Otherwise the chart would load in 'simple' and immediately reload
                            // after the onboarding choice, causing a visible flicker.
                            <View style={styles.chartLoading}>
                                <ActivityIndicator color={CALM.accent} size="small" />
                                <Text style={styles.chartLoadingText}>טוען גרף...</Text>
                            </View>
                        ) : (
                            <TradingChart
                                ohlcv={chartData}
                                mode={chartMode}
                                timeframe={timeframe}
                                isLoading={chartLoading}
                                maPeriod={chartMAPeriod}
                                onMAPeriodChange={setChartMAPeriod}
                                onIndicatorInfoPress={handleIndicatorInfo}
                            />
                        )}

                        {/* Timeframe Tabs + Refresh */}
                        <View style={styles.timeframeTabs}>
                            {TIMEFRAMES.map(({ value, label }) => {
                                const isActive = value === timeframe;
                                return (
                                    <Pressable
                                        key={value}
                                        onPress={() => handleTimeframeChange(value)}
                                        style={[styles.timeframeTab, isActive && styles.timeframeTabActive]}
                                    >
                                        <Text style={[styles.timeframeText, isActive && styles.timeframeTextActive]}>
                                            {label}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                            <Pressable
                                onPress={() => {
                                    tapHaptic();
                                    clearCache();
                                    loadChart(selectedId, timeframe);
                                }}
                                style={styles.refreshBtn}
                            >
                                <RefreshCw size={16} color="#6b7280" />
                            </Pressable>
                        </View>

                        {/* Chart mode toggle, hidden until the user has made their onboarding choice */}
                        {chartMode !== null && (
                            <View style={styles.modeToggleRow}>
                                {(['simple', 'advanced'] as const).map((m) => {
                                    const active = chartMode === m;
                                    return (
                                        <Pressable
                                            key={m}
                                            onPress={() => {
                                                if (active) return;
                                                tapHaptic();
                                                setChartMode(m);
                                            }}
                                            accessibilityRole="button"
                                            accessibilityLabel={m === 'simple' ? 'גרף פשוט' : 'גרף למתקדמים'}
                                            accessibilityState={{ selected: active }}
                                            style={[styles.modePill, active && styles.modePillActive]}
                                        >
                                            <Text style={[styles.modePillText, active && styles.modePillTextActive]}>
                                                {m === 'simple' ? 'פשוט' : 'מתקדם'}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        )}
                    </View>

                    {/* Learning module links */}
                    <View style={styles.learnSection}>
                        <Text style={styles.learnTitle}>למד על שוק ההון</Text>
                        {LEARN_LINKS.map((link) => (
                            <AnimatedPressable
                                key={link.moduleId}
                                onPress={() => { tapHaptic(); router.push(`/lesson/${link.moduleId}?chapterId=${link.chapterId}` as never); }}
                                style={styles.learnCardOuter}
                            >
                                <View style={styles.learnCard}>
                                    <View style={{ width: 36, height: 36, overflow: 'hidden' }}>
                                        <LottieView source={link.lottieSource} style={{ width: 36, height: 36 }} autoPlay loop />
                                    </View>
                                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                        <Text style={styles.learnCardTitle}>{link.title}</Text>
                                        <Text style={styles.learnCardSub}>{link.subtitle}</Text>
                                    </View>
                                </View>
                            </AnimatedPressable>
                        ))}
                    </View>
                </ScrollView>

                {/* Bottom Action Bar */}
                <View style={styles.bottomBar}>
                    <AnimatedPressable
                        onPress={() => {
                            tapHaptic();
                            router.push('/trading-hub/holdings' as never);
                        }}
                        style={styles.holdingsBtn}
                    >
                        <Briefcase size={18} color={CALM.accent} />
                        <Text style={styles.holdingsBtnText}>האחזקות שלי</Text>
                        {positionCount > 0 && (
                            <View style={styles.posCountBadge}>
                                <Text style={styles.posCountText}>{positionCount}</Text>
                            </View>
                        )}
                    </AnimatedPressable>

                    <AnimatedPressable
                        onPress={() => {
                            tapHaptic();
                            setBuySheetVisible(true);
                        }}
                        style={styles.buyBtn}
                    >
                        <Text style={styles.buyBtnText}>קנה</Text>
                    </AnimatedPressable>
                </View>
            </SafeAreaView>

            {/* Buy Sheet */}
            <BuySheet
                visible={buySheetVisible}
                assetId={selectedId}
                currentPrice={currentPrice}
                previousClose={previousClose}
                onClose={() => setBuySheetVisible(false)}
                onBuyComplete={() => {}}
                onAssetTypeUnlocked={handleBuyUnlocked}
            />

            {/* Asset Info Sheet */}
            <AssetInfoSheet
                visible={sheetVisible}
                asset={ASSET_BY_ID.get(selectedId) ?? null}
                onClose={() => setSheetVisible(false)}
            />

            {/* Asset unlock celebration (stocks or crypto) */}
            {unlockCelebrationType !== null && (
                <AssetUnlockSheet
                    visible
                    unlockedType={unlockCelebrationType}
                    onClose={() => setUnlockCelebrationType(null)}
                />
            )}

            {/* First-time tutorial overlay */}
            {showTutorial && (
                <TradingHubTutorial onComplete={() => setShowTutorial(false)} />
            )}

            {/* Chart mode onboarding, shown once on first visit after chart data loads */}
            <ChartModeOnboarding
                visible={chartMode === null && !chartLoading && chartData.length > 1}
                onChoose={(m) => setChartMode(m)}
            />

            {/* Indicator explanation sheet */}
            <IndicatorInfoSheet
                visible={indicatorInfo !== null}
                indicatorId={indicatorInfo}
                maPeriod={chartMAPeriod}
                onClose={() => setIndicatorInfo(null)}
            />

            {/* Captain Shark, turn knowledge into real-world benefits */}
            <SharkBridgeCTA
                visible={bridgeCtaVisible}
                onGoBridge={() => {
                    setBridgeCtaVisible(false);
                    router.push('/bridge' as never);
                }}
                onDismiss={() => setBridgeCtaVisible(false)}
                moduleCount={positionCount}
            />

            {/* Finn nudge, indices-only starters (knowledge level < 3) */}
            <NotificationBanner
                visible={showIndicesNudge}
                message="עדיין לא נתחיל עם המניות. ראשית עם מדדים..."
                imageSource={require('../../../assets/webp/fin-happy.webp')}
                duration={0}
                onDismiss={() => {
                    setShowIndicesNudge(false);
                    markIndicesNudgeSeen();
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: CALM.bg,
    },
    stickyHeader: {
        backgroundColor: CALM.bg,
        borderBottomWidth: 1,
        borderBottomColor: CALM.border,
        paddingBottom: 6,
        zIndex: 10,
    },
    scrollContent: {
        paddingBottom: 32,
    },
    header: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 4,
    },
    title: {
        fontSize: 20,
        fontWeight: '900',
        color: CALM.textPrimary,
    },
    coinBadge: {
        backgroundColor: CALM.coinSurface,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    coinText: {
        fontSize: 13,
        fontWeight: '800',
        color: CALM.coinGold,
        fontVariant: ['tabular-nums'],
    },
    subtitle: {
        fontSize: 13,
        fontWeight: '600',
        color: CALM.textSecondary,
        textAlign: 'center',
        marginBottom: 8,
    },

    // ── Carousel ──
    carouselSection: {
        marginTop: 4,
    },
    carouselContent: {
        paddingHorizontal: 16,
        gap: ITEM_GAP,
        flexDirection: 'row-reverse',
    },
    assetItem: {
        alignItems: 'center',
        width: ITEM_SIZE,
    },
    assetItemActive: {
        transform: [{ scale: 1.08 }],
    },
    assetCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: CALM.surface,
        borderWidth: 2,
        borderColor: CALM.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    assetCircleActive: {
        borderColor: CALM.accent,
        backgroundColor: CALM.accentLight,
        shadowColor: CALM.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    starBadge: {
        position: 'absolute',
        top: -4,
        // Use `end` so the star hugs the trailing edge of the asset circle on both LTR and RTL.
        end: -4,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#fef3c7',
        borderWidth: 1.5,
        borderColor: '#d97706',
        justifyContent: 'center',
        alignItems: 'center',
    },
    assetLabel: {
        marginTop: 4,
        fontSize: 10,
        fontWeight: '700',
        color: CALM.textSecondary,
        textAlign: 'center',
    },
    assetLabelActive: {
        color: CALM.accent,
    },
    volatilityDot: {
        fontSize: 9,
        marginTop: 2,
        textAlign: 'center',
    },

    // ── Chart Card ──
    chartCard: {
        marginTop: 10,
        marginHorizontal: 12,
        backgroundColor: CALM.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: CALM.border,
        paddingTop: 6,
        paddingBottom: 10,
        overflow: 'hidden',
    },
    chartHeader: {
        paddingHorizontal: 16,
        paddingTop: 4,
        paddingBottom: 8,
        alignItems: 'flex-end',
    },
    chartAssetName: {
        fontSize: 14,
        fontWeight: '700',
        color: CALM.textSecondary,
        writingDirection: 'rtl',
        textAlign: 'right',
    },
    chartPriceRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        marginTop: 2,
    },
    chartCurrentPrice: {
        fontSize: 24,
        fontWeight: '900',
        color: CALM.textPrimary,
        fontVariant: ['tabular-nums'],
    },
    chartChangePill: {
        borderRadius: 6,
        paddingHorizontal: 7,
        paddingVertical: 3,
    },
    chartChangePct: {
        fontSize: 12,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
    },
    chartLoading: {
        height: 220,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    chartLoadingText: {
        fontSize: 13,
        fontWeight: '700',
        color: CALM.textSecondary,
        writingDirection: 'rtl',
    },

    // ── Stale Data Badge ──
    staleBadge: {
        backgroundColor: 'rgba(245,158,11,0.1)',
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 12,
        marginHorizontal: 16,
        marginBottom: 4,
        borderWidth: 1,
        borderColor: 'rgba(245,158,11,0.25)',
    },
    staleBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#f59e0b',
        textAlign: 'center',
        writingDirection: 'rtl' as const,
    },

    // ── Timeframe Tabs ──
    timeframeTabs: {
        // RTL: "יום" should read first (right-most), then "שבוע".
        flexDirection: 'row-reverse',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 16,
        marginTop: 4,
    },
    refreshBtn: {
        marginLeft: 8,
        padding: 6,
        borderRadius: 8,
        backgroundColor: 'rgba(107,114,128,0.1)',
    },
    timeframeTab: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: CALM.surfaceMuted,
    },
    timeframeTabActive: {
        backgroundColor: CALM.accentLight,
        borderWidth: 1,
        borderColor: CALM.accent,
    },
    timeframeText: {
        fontSize: 11,
        fontWeight: '700',
        color: CALM.textSecondary,
    },
    timeframeTextActive: {
        color: CALM.accent,
    },

    // ── Chart mode toggle (simple / advanced) ──
    modeToggleRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        marginTop: 10,
        paddingHorizontal: 16,
    },
    modePill: {
        paddingHorizontal: 14,
        paddingVertical: 5,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: CALM.border,
        backgroundColor: CALM.surface,
    },
    modePillActive: {
        borderColor: CALM.accent,
        backgroundColor: CALM.accentLight,
    },
    modePillText: {
        fontSize: 11,
        fontWeight: '800',
        color: CALM.textSecondary,
    },
    modePillTextActive: {
        color: CALM.accent,
    },

    // ── Bottom Bar ──
    bottomBar: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: CALM.border,
        backgroundColor: CALM.surface,
    },
    holdingsBtn: {
        flex: 1,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: CALM.accent,
        backgroundColor: CALM.accentLight,
    },
    holdingsBtnText: {
        fontSize: 15,
        fontWeight: '800',
        color: CALM.accent,
    },
    posCountBadge: {
        backgroundColor: CALM.accent,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    posCountText: {
        fontSize: 11,
        fontWeight: '900',
        color: '#ffffff',
    },
    buyBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: CALM.buttonPrimary,
    },
    buyBtnText: {
        fontSize: 18,
        fontWeight: '900',
        color: '#ffffff',
    },

    // ── Learn Section ──
    learnSection: {
        marginTop: 12,
        marginHorizontal: 12,
        gap: 6,
    },
    learnTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: CALM.textSecondary,
        textAlign: 'right',
        writingDirection: 'rtl',
        marginBottom: 2,
    },
    learnCardOuter: {
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(8,145,178,0.2)',
        backgroundColor: '#f0fdfa',
    },
    learnCard: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    learnCardTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#0e7490',
        writingDirection: 'rtl',
    },
    learnCardSub: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6b7280',
        writingDirection: 'rtl',
        marginTop: 1,
    },
});
