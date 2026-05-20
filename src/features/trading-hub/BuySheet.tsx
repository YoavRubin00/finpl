import { useState, useCallback } from 'react';
import { View, Text, TextInput, Modal, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Info } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CALM } from '../../constants/theme';
import { useEconomyStore } from '../economy/useEconomyStore';
import { useTradingStore } from './useTradingStore';
import { useTradingHubUiStore } from './useTradingHubUiStore';
import { ASSET_BY_ID } from './tradingHubData';
import { StockIcon } from './StockIcon';
import { FINN_STANDARD } from '../retention-loops/finnMascotConfig';
import { tapHaptic, successHaptic } from '../../utils/haptics';
import { LiquidButton } from '../../components/ui/LiquidButton';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };
const QUICK_AMOUNTS = [100, 500, 1000];

type OrderType = 'market' | 'limit';

const ORDER_INFO: Record<OrderType, { label: string; description: string }> = {
    market: {
        label: 'מרקט',
        description: 'קניה מיידית במחיר הנוכחי, הפקודה מתבצעת מיד.',
    },
    limit: {
        label: 'לימיט',
        description: 'הגדר מחיר מקסימלי, הפקודה תתבצע רק כשהמחיר יגיע אליו.',
    },
};

interface BuySheetProps {
    visible: boolean;
    assetId: string;
    currentPrice: number;
    /** Yesterday's closing price from market data, null when unavailable. */
    previousClose: number | null;
    onClose: () => void;
    onBuyComplete: () => void;
    /** Fires after a successful buy when this call actually unlocked a new asset type. */
    onAssetTypeUnlocked?: (type: 'stock') => void;
}

export function BuySheet({ visible, assetId, currentPrice, previousClose, onClose, onBuyComplete, onAssetTypeUnlocked }: BuySheetProps) {
    const coins = useEconomyStore((s) => s.coins);
    const openPosition = useTradingStore((s) => s.openPosition);
    const unlockAssetType = useTradingHubUiStore((s) => s.unlockAssetType);
    const insets = useSafeAreaInsets();

    const [amountText, setAmountText] = useState('');
    const [orderType, setOrderType] = useState<OrderType>('market');
    const [limitPriceText, setLimitPriceText] = useState('');
    const [feedback, setFeedback] = useState<string | null>(null);

    const asset = ASSET_BY_ID.get(assetId);
    const amount = parseInt(amountText, 10) || 0;
    const limitPrice = parseFloat(limitPriceText) || 0;
    const canBuy = amount > 0 && amount <= coins && currentPrice > 0
        && (orderType === 'market' || limitPrice > 0);

    const handleBuy = useCallback(() => {
        if (!canBuy) return;
        tapHaptic();

        const execPrice = orderType === 'market' ? currentPrice : limitPrice;
        // openPosition handles the virtual_balance debit + server sync atomically.
        // Returns null if affordability check fails (race against another debit).
        const id = openPosition(assetId, 'buy', execPrice, amount);
        if (!id) {
            setFeedback('אין מספיק יתרה');
            setTimeout(() => setFeedback(null), 2000);
            return;
        }
        successHaptic();

        // Progressive unlock: first market-order buy unlocks individual stocks.
        // We unlock on market orders only, limit orders may not execute immediately,
        // so keeping the "earned via real purchase" feel matters. Commodity & index
        // are unlocked by default, so no-op if 'stock' already unlocked.
        if (orderType === 'market') {
            const didUnlock = unlockAssetType('stock');
            if (didUnlock) {
                onAssetTypeUnlocked?.('stock');
            }
        }

        const typeLabel = orderType === 'market' ? '' : ` (לימיט $${limitPrice})`;
        setFeedback(`קנית ${asset?.name ?? assetId} ב-${amount} מטבעות!${typeLabel}`);
        setAmountText('');
        setLimitPriceText('');

        setTimeout(() => {
            setFeedback(null);
            onBuyComplete();
            onClose();
        }, 1500);
    }, [canBuy, amount, assetId, currentPrice, limitPrice, orderType, openPosition, unlockAssetType, onAssetTypeUnlocked, asset, onBuyComplete, onClose]);

    const handleClose = useCallback(() => {
        setAmountText('');
        setLimitPriceText('');
        setFeedback(null);
        setOrderType('market');
        onClose();
    }, [onClose]);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose} accessibilityViewIsModal>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <Pressable style={styles.backdrop} onPress={handleClose}>
                    <Pressable
                        style={[
                            styles.sheet,
                            { paddingBottom: Math.max(insets.bottom + 12, 24) },
                        ]}
                        onPress={() => {}}
                    >
                        <ScrollView showsVerticalScrollIndicator={false} bounces={true} style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}>
                        <Animated.View entering={FadeInUp.duration(300)}>
                            {/* Handle bar */}
                            <View style={styles.handleBar} />

                            {/* Asset info */}
                            <View style={styles.assetRow}>
                                <StockIcon assetId={assetId} size={40} />
                                <View style={{ alignItems: 'flex-end', flex: 1 }}>
                                    <Text style={[RTL, styles.assetName]}>
                                        {asset?.name ?? assetId}
                                    </Text>
                                    <Text style={styles.assetPrice}>
                                        ${currentPrice > 0 ? currentPrice.toFixed(2) : '—'}
                                    </Text>
                                </View>
                            </View>

                            {/* Captain Shark, yesterday's close */}
                            {previousClose !== null && previousClose > 0 && currentPrice > 0 && (() => {
                                const delta = currentPrice - previousClose;
                                const deltaPct = (delta / previousClose) * 100;
                                const rising = delta >= 0;
                                const arrow = rising ? '▲' : '▼';
                                const deltaColor = rising ? '#16a34a' : '#dc2626';
                                const directionWord = rising ? 'עלה' : 'ירד';
                                return (
                                    <View
                                        style={styles.sharkBubble}
                                        accessibilityRole="text"
                                        accessibilityLabel={`קפטן שארק: מחיר סגירה אחרון ${previousClose.toFixed(2)} דולר. מאז ${directionWord} ב-${Math.abs(deltaPct).toFixed(2)} אחוזים`}
                                    >
                                        <ExpoImage
                                            source={FINN_STANDARD}
                                            style={styles.sharkAvatar}
                                            contentFit="contain"
                                        />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.sharkLabel}>קפטן שארק</Text>
                                            <Text style={styles.sharkText}>
                                                מחיר סגירה אחרון: ${previousClose.toFixed(2)}
                                            </Text>
                                            <Text style={[styles.sharkDelta, { color: deltaColor }]}>
                                                {arrow} {rising ? '+' : ''}{delta.toFixed(2)} ({rising ? '+' : ''}{deltaPct.toFixed(2)}%)
                                            </Text>
                                        </View>
                                    </View>
                                );
                            })()}

                            {/* Order type selector */}
                            <View style={styles.orderTypeSection}>
                                <Text style={[RTL, styles.sectionLabel]}>סוג פקודה</Text>
                                <View style={styles.orderTypeRow}>
                                    {(['market', 'limit'] as const).map((type) => {
                                        const active = orderType === type;
                                        return (
                                            <Pressable
                                                key={type}
                                                onPress={() => { tapHaptic(); setOrderType(type); }}
                                                style={[styles.orderTypeBtn, active && styles.orderTypeBtnActive]}
                                            >
                                                <Text style={[styles.orderTypeBtnText, active && styles.orderTypeBtnTextActive]}>
                                                    {ORDER_INFO[type].label}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                                <View style={styles.orderInfoRow}>
                                    <Info size={14} color={CALM.textTertiary} />
                                    <Text style={styles.orderInfoText}>
                                        {ORDER_INFO[orderType].description}
                                    </Text>
                                </View>
                            </View>

                            {/* Limit price input */}
                            {orderType === 'limit' && (
                                <View style={styles.inputWrap}>
                                    <TextInput
                                        style={styles.input}
                                        value={limitPriceText}
                                        onChangeText={setLimitPriceText}
                                        placeholder={`מחיר מקסימלי (נוכחי: $${currentPrice.toFixed(2)})`}
                                        placeholderTextColor={CALM.textTertiary}
                                        keyboardType="decimal-pad"
                                        textAlign="center"
                                    />
                                </View>
                            )}

                            <View style={styles.balanceRow}>
                                <Text style={[RTL, styles.balanceLabel]}>מטבעות זמינים</Text>
                                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                                    <Text style={{ fontSize: 18 }} accessible={false}>🪙</Text>
                                    <Text style={styles.balanceValue}>
                                        {coins.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                                    </Text>
                                </View>
                            </View>

                            {/* Amount input */}
                            <View style={styles.inputWrap}>
                                <TextInput
                                    style={styles.input}
                                    value={amountText}
                                    onChangeText={setAmountText}
                                    placeholder="כמה להשקיע? (מטבעות)"
                                    placeholderTextColor={CALM.textTertiary}
                                    keyboardType="number-pad"
                                    textAlign="right"
                                accessibilityLabel="סכום להשקעה במטבעות" />
                            </View>

                            {/* Quick amount pills */}
                            <View style={styles.quickRow}>
                                {QUICK_AMOUNTS.map((q) => (
                                    <Pressable
                                        key={q}
                                        onPress={() => {
                                            tapHaptic();
                                            setAmountText(String(q));
                                        }}
                                        style={styles.quickPill}
                                    >
                                        <Text style={styles.quickText}>{q}</Text>
                                    </Pressable>
                                ))}
                                <Pressable
                                    onPress={() => {
                                        tapHaptic();
                                        setAmountText(String(Math.floor(coins)));
                                    }}
                                    style={[styles.quickPill, styles.quickPillMax]}
                                >
                                    <Text style={[styles.quickText, { color: CALM.accent }]}>MAX</Text>
                                </Pressable>
                            </View>

                            {/* Feedback */}
                            {feedback && (
                                <Text style={[RTL, styles.feedback]}>{feedback}</Text>
                            )}
                        </Animated.View>
                        </ScrollView>

                        {/* Buy button, ALWAYS visible, pinned nicely */}
                        <View style={{ paddingTop: 16 }}>
                            <LiquidButton
                                onPress={handleBuy}
                                disabled={!canBuy}
                                style={[
                                    {
                                        borderRadius: 30,
                                        width: '100%',
                                        height: 60,
                                        borderBottomWidth: 4,
                                        borderBottomColor: '#1d4ed8',
                                        shadowColor: '#3b82f6',
                                        shadowOffset: { width: 0, height: 4 },
                                        shadowOpacity: 0.4,
                                        shadowRadius: 12,
                                        elevation: 8,
                                    },
                                    !canBuy && { opacity: 0.55, shadowOpacity: 0, borderBottomColor: '#1d4ed8' }
                                ]}
                                color="#2563eb"
                            >
                                <Text style={styles.buyBtnText}>
                                    {amount > coins ? 'אין מספיק יתרה' : orderType === 'limit' ? 'הגדר פקודת לימיט' : 'קנה עכשיו'}
                                </Text>
                            </LiquidButton>
                            <Text style={styles.disclaimer}>
                                סימולטור · ללא סיכון אמיתי
                            </Text>
                        </View>
                    </Pressable>
                </Pressable>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.45)', // Soft dark overlay
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#f0f9ff', // Light blue Stitch surface
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        padding: 28,
        // paddingBottom is applied inline using safe-area insets so the buy button
        // and disclaimer remain above the system gesture/nav bar on every device.
        maxHeight: '90%',
        shadowColor: '#0ea5e9',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 20,
    },
    sharkBubble: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#ecfeff',
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#a5f3fc',
        padding: 12,
        marginBottom: 18,
    },
    sharkAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    sharkLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#0e7490',
        textAlign: 'right',
        writingDirection: 'rtl',
        marginBottom: 2,
    },
    sharkText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#0f172a',
        textAlign: 'right',
        writingDirection: 'rtl',
    },
    sharkDelta: {
        fontSize: 12,
        fontWeight: '800',
        textAlign: 'right',
        writingDirection: 'rtl',
        marginTop: 2,
        fontVariant: ['tabular-nums'],
    },
    handleBar: {
        width: 48,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#bae6fd',
        alignSelf: 'center',
        marginBottom: 24,
    },
    assetRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 16,
        marginBottom: 24,
        backgroundColor: '#ffffff',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: '#e0f2fe',
        shadowColor: '#bae6fd',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    assetName: {
        fontSize: 20,
        fontWeight: '900',
        color: '#0f172a',
    },
    assetPrice: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0284c7',
        fontVariant: ['tabular-nums'],
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '800',
        color: '#64748b',
        marginBottom: 10,
    },
    orderTypeSection: {
        marginBottom: 20,
    },
    orderTypeRow: {
        flexDirection: 'row-reverse',
        gap: 12,
    },
    orderTypeBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#e0f2fe',
        backgroundColor: '#ffffff',
        alignItems: 'center',
    },
    orderTypeBtnActive: {
        borderColor: '#0ea5e9',
        backgroundColor: '#e0f2fe',
    },
    orderTypeBtnText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#64748b',
    },
    orderTypeBtnTextActive: {
        color: '#0369a1',
    },
    orderInfoRow: {
        flexDirection: 'row-reverse',
        alignItems: 'flex-start',
        gap: 8,
        marginTop: 10,
        paddingHorizontal: 6,
    },
    orderInfoText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '500',
        color: '#64748b',
        writingDirection: 'rtl',
        textAlign: 'right',
        lineHeight: 20,
    },
    balanceRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f0f9ff',
        borderWidth: 1,
        borderColor: '#bae6fd',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    balanceLabel: {
        fontSize: 15,
        fontWeight: '800',
        color: '#0284c7',
    },
    balanceValue: {
        fontSize: 18,
        fontWeight: '900',
        color: '#0284c7',
        fontVariant: ['tabular-nums'],
    },
    inputWrap: {
        marginBottom: 16,
    },
    input: {
        backgroundColor: '#ffffff',
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: '#e0f2fe',
        paddingVertical: 16,
        paddingHorizontal: 20,
        fontSize: 18,
        fontWeight: '800',
        color: '#0f172a',
        writingDirection: 'rtl',
    },
    quickRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 20,
    },
    quickPill: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#ffffff',
        borderWidth: 1.5,
        borderColor: '#e0f2fe',
    },
    quickPillMax: {
        borderColor: '#0284c7',
        backgroundColor: '#e0f2fe',
    },
    quickText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#0f172a',
    },
    feedback: {
        fontSize: 15,
        fontWeight: '800',
        color: '#16a34a',
        textAlign: 'center',
        marginBottom: 16,
    },
    buyBtnText: {
        fontSize: 18,
        fontWeight: '900',
        color: '#ffffff',
    },
    disclaimer: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748b',
        textAlign: 'center',
        marginTop: 14,
    },
});
