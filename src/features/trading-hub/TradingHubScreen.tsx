import { useState, useRef, useEffect, useCallback } from 'react';
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
import { Briefcase, RefreshCw } from 'lucide-react-native';
import LottieView from 'lottie-react-native';
import type { AnimationObject } from 'lottie-react-native';
// LinearGradient removed — learn cards now use flat ocean-teal style
import { CALM } from '../../constants/theme';
import { BackButton } from '../../components/ui/BackButton';
import { AnimatedPressable } from '../../components/ui/AnimatedPressable';
import { GlobalWealthHeader } from '../../components/ui/GlobalWealthHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StockIcon } from './StockIcon';
import { TRADABLE_ASSETS, ASSET_BY_ID } from './tradingHubData';
import { tapHaptic } from '../../utils/haptics';
import { AssetInfoSheet } from './AssetInfoSheet';
import { LiveChart } from './LiveChart';
import { BuySheet } from './BuySheet';
import { fetchChartData, fetchLatestPrice, fetchPreviousClose, clearCache, isDataLive } from './marketApiService';
import { Timeframe, ChartDataPoint, VolatilityRating } from './tradingHubTypes';
import { useTradingStore } from './useTradingStore';
import { useTutorialStore } from '../../stores/useTutorialStore';
import { TradingHubTutorial } from './TradingHubTutorial';

const ITEM_SIZE = 72;
const ITEM_GAP = 12;

const LEARN_LINKS: { moduleId: string; chapterId: string; title: string; subtitle: string; lottieSource: AnimationObject }[] = [
    { moduleId: 'mod-4-19', chapterId: 'chapter-4', title: 'שוק ההון', subtitle: 'מניות, אג"ח ויחס סיכון-תשואה', lottieSource: require('../../../assets/lottie/wired-flat-947-investment-hover-pinch.json') as AnimationObject },
    { moduleId: 'mod-4-22', chapterId: 'chapter-4', title: 'פקודות מסחר', subtitle: 'לימיט, מארקט, סטופ לוס', lottieSource: require('../../../assets/lottie/wired-flat-163-graph-line-chart-hover-slide.json') as AnimationObject },
    { moduleId: 'mod-4-21', chapterId: 'chapter-4', title: 'תעודות סל — ETF', subtitle: 'פיזור בקלות עם מוצר אחד', lottieSource: require('../../../assets/lottie/wired-flat-152-bar-chart-arrow-hover-growth.json') as AnimationObject },
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

export default function TradingHubScreen() {
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

    const updatePrices = useTradingStore((s) => s.updatePrices);
    const positions = useTradingStore((s) => s.positions);
    const positionCount = positions.length;

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
                    {/* Asset Carousel */}
                    <ScrollView
                        ref={scrollRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.carouselContent}
                        style={styles.carouselSection}
                    >
                        {TRADABLE_ASSETS.map((asset) => {
                            const isActive = asset.id === selectedId;
                            return (
                                <Pressable
                                    key={asset.id}
                                    onPress={() => {
                                        tapHaptic();
                                        if (asset.id === selectedId) {
                                            setSheetVisible(true);
                                        } else {
                                            setSelectedId(asset.id);
                                        }
                                    }}
                                    style={[styles.assetItem, isActive && styles.assetItemActive]}
                                >
                                    <View style={[styles.assetCircle, isActive && styles.assetCircleActive]}>
                                        <StockIcon assetId={asset.id} size={36} />
                                    </View>
                                    <Text style={[styles.assetLabel, isActive && styles.assetLabelActive]} numberOfLines={1}>
                                        {asset.id}
                                    </Text>
                                    <Text style={styles.volatilityDot}>
                                        {VOLATILITY_CONFIG[asset.volatilityRating].dot}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </ScrollView>

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
                                <Text style={styles.staleBadgeText}>⚠️ נתוני הדגמה — מחירים משוערים</Text>
                            </View>
                        )}

                        {chartLoading ? (
                            <View style={styles.chartLoading}>
                                <ActivityIndicator color={CALM.accent} size="small" />
                                <Text style={styles.chartLoadingText}>טוען גרף...</Text>
                            </View>
                        ) : (
                            <LiveChart data={chartData} isLoading={chartLoading} />
                        )}

                        {/* Timeframe Tabs + Refresh */}
                        <View style={styles.timeframeTabs}>
                            {TIMEFRAMES.map(({ value, label }) => {
                                const isActive = value === timeframe;
                                return (
                                    <Pressable
                                        key={value}
                                        onPress={() => {
                                            tapHaptic();
                                            setTimeframe(value);
                                        }}
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
            />

            {/* Asset Info Sheet */}
            <AssetInfoSheet
                visible={sheetVisible}
                asset={ASSET_BY_ID.get(selectedId) ?? null}
                onClose={() => setSheetVisible(false)}
            />

            {/* First-time tutorial overlay */}
            {showTutorial && (
                <TradingHubTutorial onComplete={() => setShowTutorial(false)} />
            )}
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
        flexDirection: 'row',
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
