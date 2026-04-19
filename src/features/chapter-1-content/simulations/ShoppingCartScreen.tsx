import { createAudioPlayer } from 'expo-audio';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Image as ExpoImage } from "expo-image";
import { View, Text, StyleSheet, ScrollView, PanResponder, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    FadeIn,
    FadeInDown,
    FadeOut,
} from 'react-native-reanimated';
import { SimLottieBackground } from '../../../components/ui/SimLottieBackground';
import { LottieIcon } from '../../../components/ui/LottieIcon';
import { getChapterTheme } from '../../../constants/theme';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { successHaptic, errorHaptic, heavyHaptic } from '../../../utils/haptics';
import { useShoppingCart } from './useShoppingCart';
import { shoppingCartConfig } from './shoppingCartData';
import type { ShoppingCartScore, ShoppingCartGrade, ShoppingItem } from './shoppingCartTypes';
import { FINN_HAPPY } from '../../retention-loops/finnMascotConfig';
import { SIM, GRADE_COLORS, GRADE_HEBREW, RTL, TYPE, simStyles } from './simTheme';


/* ── Chapter theme (gradient only) ── */
const _th1 = getChapterTheme('chapter-1');

/* ── Lottie assets ── */
const LOTTIE_CART = require('../../../../assets/lottie/wired-flat-146-trolley-hover-jump.json');
const LOTTIE_MONEY = require('../../../../assets/lottie/wired-flat-413-money-bag-hover-shake.json');
const LOTTIE_CHECK = require('../../../../assets/lottie/wired-flat-24-approved-checked-hover-pinch.json');
const LOTTIE_SHIELD = require('../../../../assets/lottie/wired-flat-457-shield-security-hover-pinch.json');
const LOTTIE_FIRE = require('../../../../assets/lottie/wired-flat-2804-fire-flame-hover-pinch.json');
const LOTTIE_BULB = require('../../../../assets/lottie/wired-flat-36-bulb-hover-blink.json');
const LOTTIE_TARGET = require('../../../../assets/lottie/wired-flat-458-goal-target-hover-hit.json');
const LOTTIE_REPLAY = require('../../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json');
const LOTTIE_ARROW = require('../../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');

/* ------------------------------------------------------------------ */
/*  BudgetBar — shows remaining budget (green → yellow → red)          */
/* ------------------------------------------------------------------ */

function BudgetBar({
    totalSpent,
    budget,
}: {
    totalSpent: number;
    budget: number;
}) {
    const remaining = Math.max(0, budget - totalSpent);
    const pct = (remaining / budget) * 100;
    const animWidth = useSharedValue(pct);

    useEffect(() => {
        animWidth.value = withSpring(pct, { damping: 20, stiffness: 120 });
    }, [pct, animWidth]);

    const barStyle = useAnimatedStyle(() => ({
        width: `${animWidth.value}%` as unknown as number,
    }));

    const barColor = pct > 50 ? '#4ade80' : pct > 25 ? '#facc15' : '#f97316';
    const isOverBudget = totalSpent > budget;

    return (
        <View style={styles.budgetBarContainer}>
            <View style={styles.budgetBarHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <LottieIcon source={LOTTIE_MONEY} size={18} />
                    <Text style={[RTL, styles.budgetBarLabel]}>תקציב</Text>
                </View>
                <Text style={[styles.budgetBarValue, { color: isOverBudget ? '#f97316' : barColor }]} accessibilityLiveRegion="polite">
                    {isOverBudget ? `חריגה! ₪${totalSpent - budget}` : `₪${remaining} נותר`}
                </Text>
            </View>
            <View style={styles.budgetBarTrack}>
                <Animated.View
                    style={[styles.budgetBarFill, barStyle, { backgroundColor: barColor }]}
                />
            </View>
            <Text style={styles.budgetBarSummary}>
                ₪{totalSpent} / ₪{budget}
            </Text>
        </View>
    );
}

/* ------------------------------------------------------------------ */
/*  ItemCard — center card showing current item                        */
/* ------------------------------------------------------------------ */

function ItemCard({ item }: { item: ShoppingItem }) {
    const isTrap = item.category === 'trap';

    return (
        <View style={{ backgroundColor: SIM.cardBg, borderRadius: 20, borderWidth: 1.5, borderColor: isTrap ? SIM.warningBorder : SIM.cardBorder, shadowColor: isTrap ? SIM.warning : SIM.glow, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 }}>
            <View style={styles.itemCardInner}>
                {isTrap && (
                    <View style={styles.saleBadge}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                            <LottieIcon source={LOTTIE_FIRE} size={14} />
                            <Text style={styles.saleBadgeText}>מבצע!</Text>
                        </View>
                    </View>
                )}
                <Text style={styles.itemEmoji}>{item.emoji}</Text>
                <Text style={[RTL, styles.itemName]}>{item.name}</Text>
                <Text style={styles.itemPrice}>₪{item.price}</Text>
            </View>
        </View>
    );
}

/* ------------------------------------------------------------------ */
/*  SwipeableItemCard — swipe right to add, left to skip               */
/* ------------------------------------------------------------------ */

const SWIPE_THRESHOLD = 80;
const SCREEN_WIDTH = Dimensions.get('window').width;

function SwipeableItemCard({
    item,
    onAddToCart,
    onSkip,
}: {
    item: ShoppingItem;
    onAddToCart: () => void;
    onSkip: () => void;
}) {
    const isTrap = item.category === 'trap';
    const cardX = useSharedValue(0);
    const isDoneRef = useRef(false);

    const panResponder = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8,
        onPanResponderMove: (_, g) => {
            if (isDoneRef.current) return;
            cardX.value = g.dx;
        },
        onPanResponderRelease: (_, g) => {
            if (isDoneRef.current) return;
            if (g.dx > SWIPE_THRESHOLD) {
                isDoneRef.current = true;
                cardX.value = withTiming(SCREEN_WIDTH, { duration: 200 });
                setTimeout(() => onAddToCart(), 150);
            } else if (g.dx < -SWIPE_THRESHOLD) {
                isDoneRef.current = true;
                cardX.value = withTiming(-SCREEN_WIDTH, { duration: 200 });
                setTimeout(() => onSkip(), 150);
            } else {
                cardX.value = withSpring(0, { damping: 18 });
            }
        },
    }), [onAddToCart, onSkip, cardX]);

    const cardStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: cardX.value },
            { rotate: `${cardX.value / 25}deg` },
        ],
    }));

    const rightGlow = useAnimatedStyle(() => ({
        opacity: Math.min(Math.max(cardX.value / SWIPE_THRESHOLD, 0), 0.4),
    }));
    const leftGlow = useAnimatedStyle(() => ({
        opacity: Math.min(Math.max(-cardX.value / SWIPE_THRESHOLD, 0), 0.4),
    }));

    return (
        <View style={styles.itemArea}>
            {/* Side hints */}
            <View style={{ position: 'absolute', right: 8, top: '40%', zIndex: 5, alignItems: 'center', opacity: 0.7 }}>
                <Text style={{ fontSize: 24, color: '#16a34a', fontWeight: '900' }}>🛒</Text>
                <Text style={{ fontSize: 11, color: '#16a34a', fontWeight: '700', marginTop: 2 }}>הוסף</Text>
            </View>
            <View style={{ position: 'absolute', left: 8, top: '40%', zIndex: 5, alignItems: 'center', opacity: 0.7 }}>
                <Text style={{ fontSize: 24, color: '#64748b', fontWeight: '900' }}>✋</Text>
                <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '700', marginTop: 2 }}>דלג</Text>
            </View>

            {/* Swipeable card */}
            <Animated.View style={[cardStyle, { zIndex: 10 }]} {...panResponder.panHandlers}>
                <View style={{
                    backgroundColor: SIM.cardBg,
                    borderRadius: 20,
                    borderWidth: 1.5,
                    borderColor: isTrap ? SIM.warningBorder : SIM.cardBorder,
                    shadowColor: isTrap ? SIM.warning : SIM.glow,
                    shadowOpacity: 0.3,
                    shadowRadius: 10,
                    elevation: 4,
                    overflow: 'hidden',
                }}>
                    {/* Direction overlays */}
                    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(34,197,94,0.2)', borderRadius: 20 }, rightGlow]} />
                    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(239,68,68,0.2)', borderRadius: 20 }, leftGlow]} />

                    <View style={styles.itemCardInner}>
                        {isTrap && (
                            <View style={styles.saleBadge}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                    <LottieIcon source={LOTTIE_FIRE} size={14} />
                                    <Text style={styles.saleBadgeText}>מבצע!</Text>
                                </View>
                            </View>
                        )}
                        <Text style={styles.itemEmoji}>{item.emoji}</Text>
                        <Text style={[RTL, styles.itemName]}>{item.name}</Text>
                        <Text style={[styles.itemPrice, { color: '#ef4444' }]}>-₪{item.price}</Text>

                        {/* Swipe hint labels */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingHorizontal: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                                <Text style={{ fontSize: 14, fontWeight: '800', color: '#16a34a' }}>←</Text>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#16a34a' }}>דלג +₪0</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#ef4444' }}>הוסף -₪{item.price}</Text>
                                <Text style={{ fontSize: 14, fontWeight: '800', color: '#ef4444' }}>→</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </Animated.View>
        </View>
    );
}

/* ------------------------------------------------------------------ */
/*  TrapRevealPopup — explains the marketing trick after adding a trap */
/* ------------------------------------------------------------------ */

function TrapRevealPopup({
    item,
    onDismiss,
}: {
    item: ShoppingItem;
    onDismiss: () => void;
}) {
    return (
        <Animated.View entering={FadeIn.duration(200)} style={styles.trapPopupOverlay}>
            <View style={styles.trapPopupCard}>
                <LottieIcon source={LOTTIE_TARGET} size={36} />
                <Text style={[RTL, styles.trapPopupTitle]}>
                    נפלת במלכודת שיווקית!
                </Text>
                {item.trapExplanation && (
                    <Text style={[RTL, styles.trapPopupText]}>
                        {item.trapExplanation}
                    </Text>
                )}
                <AnimatedPressable onPress={onDismiss} style={styles.trapPopupButton} accessibilityRole="button" accessibilityLabel="הבנתי" accessibilityHint="סוגר את ההסבר וממשיך">
                    <Text style={[RTL, { fontSize: 16, fontWeight: '700', color: '#fff' }]}>
                        הבנתי
                    </Text>
                </AnimatedPressable>
            </View>
        </Animated.View>
    );
}

/* ------------------------------------------------------------------ */
/*  MiniCart — bottom bar showing collected items                       */
/* ------------------------------------------------------------------ */

function MiniCart({ cart }: { cart: ShoppingItem[] }) {
    if (cart.length === 0) {
        return (
            <View style={styles.miniCartContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <LottieIcon source={LOTTIE_CART} size={18} />
                    <Text style={[RTL, styles.miniCartEmpty]}>העגלה ריקה</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.miniCartContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <LottieIcon source={LOTTIE_CART} size={18} />
                <Text style={[RTL, styles.miniCartLabel]}>
                    בעגלה ({cart.length}):
                </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.miniCartScroll}>
                {cart.map((item) => (
                    <View key={item.id} style={styles.miniCartItem}>
                        <Text style={styles.miniCartItemEmoji}>{item.emoji}</Text>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

/* ------------------------------------------------------------------ */
/*  ScoreScreen — end-game summary                                     */
/* ------------------------------------------------------------------ */

function ScoreScreen({
    score,
    state,
    onReplay,
    onFinish,
}: {
    score: ShoppingCartScore;
    state: { totalSpent: number; budget: number; essentialsCollected: number; trapsFallen: number };
    onReplay: () => void;
    onFinish: () => void;
}) {
    const gradeColor = GRADE_COLORS[score.grade] ?? SIM.textOnGradient;

    return (
      <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 16, paddingVertical: 16, paddingBottom: 120 }}>
            {/* Grade banner */}
            <View style={simStyles.gradeContainer}>
                <Text style={[simStyles.gradeText, { color: gradeColor }]}>
                    {GRADE_HEBREW[score.grade] ?? score.grade}
                </Text>
                <Text style={[RTL, simStyles.gradeLabel]}>
                    {score.gradeLabel}
                </Text>
            </View>

            {/* Score breakdown */}
            <View style={[simStyles.scoreCard, { borderColor: gradeColor, shadowColor: gradeColor }]}>
                <View style={simStyles.scoreCardInner}>
                    <Text style={[RTL, TYPE.cardTitle, { marginBottom: 4 }]}>
                        סיכום הקניות:
                    </Text>

                    <View style={simStyles.scoreRow}>
                        <View style={simStyles.scoreRowLeft}>
                            <LottieIcon source={LOTTIE_MONEY} size={24} />
                            <Text style={[RTL, simStyles.scoreRowLabel]}>יתרת תקציב</Text>
                        </View>
                        <Text style={[simStyles.scoreRowValue, { color: state.totalSpent <= state.budget ? SIM.success : '#f97316' }]}>
                            ₪{Math.max(0, state.budget - state.totalSpent)}
                        </Text>
                    </View>

                    <View style={simStyles.scoreRow}>
                        <View style={simStyles.scoreRowLeft}>
                            <LottieIcon source={LOTTIE_CHECK} size={24} />
                            <Text style={[RTL, simStyles.scoreRowLabel]}>מוצרים חיוניים</Text>
                        </View>
                        <Text style={[simStyles.scoreRowValue, { color: SIM.success }]}>
                            {state.essentialsCollected}/{shoppingCartConfig.essentialCount}
                        </Text>
                    </View>

                    <View style={simStyles.scoreRow}>
                        <View style={simStyles.scoreRowLeft}>
                            <LottieIcon source={LOTTIE_SHIELD} size={24} />
                            <Text style={[RTL, simStyles.scoreRowLabel]}>מלכודות נמנעו</Text>
                        </View>
                        <Text style={[simStyles.scoreRowValue, { color: SIM.primary }]}>
                            {score.trapsAvoided}
                        </Text>
                    </View>

                    <View style={simStyles.scoreRow}>
                        <View style={simStyles.scoreRowLeft}>
                            <LottieIcon source={LOTTIE_FIRE} size={24} />
                            <Text style={[RTL, simStyles.scoreRowLabel]}>כסף בוזבז על מלכודות</Text>
                        </View>
                        <Text style={[simStyles.scoreRowValue, { color: score.moneyWasted > 0 ? SIM.warning : SIM.success }]}>
                            ₪{score.moneyWasted}
                        </Text>
                    </View>

                    <View style={simStyles.insightRow}>
                        <LottieIcon source={LOTTIE_BULB} size={24} />
                        <Text style={[RTL, simStyles.insightText]}>
                            בקניות יש מרכיב פסיכולוגי משמעותי. בואו נהיה מודעים אליו
                        </Text>
                    </View>
                </View>
            </View>

        </ScrollView>

        {/* Sticky actions bar — always visible */}
        <View style={shoppingCartStickyStyles.stickyActionsBar}>
            <AnimatedPressable onPress={onReplay} style={simStyles.replayBtn} accessibilityRole="button" accessibilityLabel="שחק שוב" accessibilityHint="מתחיל את הסימולציה מחדש">
                <View accessible={false}><LottieIcon source={LOTTIE_REPLAY} size={20} /></View>
                <Text style={[RTL, simStyles.replayText]}>שחק שוב</Text>
            </AnimatedPressable>
            <AnimatedPressable onPress={onFinish} style={simStyles.continueBtn} accessibilityRole="button" accessibilityLabel="המשך" accessibilityHint="ממשיך לשלב הבא">
                <Text style={[RTL, simStyles.continueText]}>המשך</Text>
                <View style={{ position: 'absolute', left: 16 }}>
                    <View accessible={false}><LottieIcon source={LOTTIE_ARROW} size={20} /></View>
                </View>
            </AnimatedPressable>
        </View>
      </Animated.View>
    );
}

/* ------------------------------------------------------------------ */
/*  ShoppingCartScreen — main exported component                       */
/* ------------------------------------------------------------------ */

export function ShoppingCartScreen({ onComplete }: { onComplete: () => void }) {
    const {
        state,
        currentItem,
        addToCart,
        skipItem,
        score,
        resetGame,
    } = useShoppingCart(shoppingCartConfig);

    
    useEffect(() => {
        const player = createAudioPlayer({ uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/audio/sims/sim-shopping-cart.mp3' });
        player.play();
        return () => {
            player.pause();
            player.remove();
        };
    }, []);
const [showTrapReveal, setShowTrapReveal] = useState(false);
    const [lastTrapItem, setLastTrapItem] = useState<ShoppingItem | null>(null);
    const [rewardsGranted, setRewardsGranted] = useState(false);
    const [showFinnPopup, setShowFinnPopup] = useState(false);
    // Grant XP + coins when game completes, show Finn popup
    useEffect(() => {
        if (state.isComplete && !rewardsGranted) {
            setRewardsGranted(true);
            successHaptic();
            setShowFinnPopup(true);
        }
    }, [state.isComplete, rewardsGranted]);

    const handleAddToCart = useCallback(() => {
        if (!currentItem || state.isComplete) return;

        const isTrap = currentItem.category === 'trap';

        if (isTrap) {
            errorHaptic();
            setLastTrapItem(currentItem);
            addToCart();
            setShowTrapReveal(true);
        } else {
            successHaptic();
            addToCart();
        }
    }, [currentItem, state.isComplete, addToCart]);

    const handleSkip = useCallback(() => {
        if (!currentItem || state.isComplete) return;

        const isTrap = currentItem.category === 'trap';
        if (isTrap) {
            successHaptic();
        }
        heavyHaptic();
        skipItem();
    }, [currentItem, state.isComplete, skipItem]);

    const dismissTrapReveal = useCallback(() => {
        setShowTrapReveal(false);
        setLastTrapItem(null);
    }, []);

    const handleReplay = useCallback(() => {
        resetGame();
        setShowTrapReveal(false);
        setLastTrapItem(null);
        setRewardsGranted(false);
    }, [resetGame]);

    const totalItems = shoppingCartConfig.items.length;

    return (
        <SimLottieBackground
            lottieSources={[
                require('../../../../assets/lottie/wired-flat-146-trolley-hover-jump.json'),
                require('../../../../assets/lottie/wired-flat-100-price-tag-sale-hover-flutter.json'),
            ]}
            chapterColors={_th1.gradient}
        >
        <View style={{ flex: 1, paddingBottom: 16 }}>
            {/* ── Title ── */}
            <Animated.View entering={FadeInDown.delay(100)}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <LottieIcon source={LOTTIE_CART} size={26} />
                    <Text style={[RTL, TYPE.title]} accessibilityRole="header">מירוץ עגלות</Text>
                </View>
                <Text style={[RTL, TYPE.subtitle, { marginBottom: 12 }]}>
                    אסוף את המוצרים החיוניים והימנע ממלכודות שיווקיות!
                </Text>
            </Animated.View>

            {/* ── Gameplay phase ── */}
            {!state.isComplete && currentItem && (
                <>
                    {/* Budget bar */}
                    <BudgetBar totalSpent={state.totalSpent} budget={state.budget} />

                    {/* Progress indicator */}
                    <Text style={[TYPE.progress, { marginBottom: 8 }]} accessibilityLiveRegion="polite">
                        מוצר {state.currentIndex + 1}/{totalItems}
                    </Text>

                    {/* Trap reveal popup */}
                    {showTrapReveal && lastTrapItem ? (
                        <TrapRevealPopup item={lastTrapItem} onDismiss={dismissTrapReveal} />
                    ) : (
                        <SwipeableItemCard
                            key={`swipe-${state.currentIndex}`}
                            item={currentItem}
                            onAddToCart={handleAddToCart}
                            onSkip={handleSkip}
                        />
                    )}

                    {/* Mini cart */}
                    <MiniCart cart={state.cart} />
                </>
            )}

            {/* ── Finn encouragement popup ── */}
            {state.isComplete && showFinnPopup && (
                <Animated.View entering={FadeIn.duration(300)} style={styles.finnOverlay}>
                    <View style={styles.finnCard}>
                        <ExpoImage source={FINN_HAPPY} accessible={false} style={{ width: 120, height: 120, alignSelf: 'center', marginBottom: 8 }} contentFit="contain" />
                        <Text style={[RTL, styles.finnMessageSoft]}>
                            גם אם קניתם 1+1 הכל בסדר!{'\n'}רק צריך להיות מודעים, ולהתנהל חכם
                        </Text>
                        <AnimatedPressable
                            onPress={() => setShowFinnPopup(false)}
                            style={styles.finnButton}
                            accessibilityRole="button"
                            accessibilityLabel="המשך לתוצאות"
                            accessibilityHint="ממשיך למסך התוצאות"
                        >
                            <Text style={[RTL, { fontSize: 16, fontWeight: '700', color: '#fff' }]}>
                                המשך לתוצאות
                            </Text>
                        </AnimatedPressable>
                    </View>
                </Animated.View>
            )}

            {/* ── Score screen ── */}
            {state.isComplete && !showFinnPopup && score && (
                <ScoreScreen
                    score={score}
                    state={{
                        totalSpent: state.totalSpent,
                        budget: state.budget,
                        essentialsCollected: state.essentialsCollected,
                        trapsFallen: state.trapsFallen,
                    }}
                    onReplay={handleReplay}
                    onFinish={onComplete}
                />
            )}
        </View>
        </SimLottieBackground>
    );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
    /* Budget bar */
    budgetBarContainer: {
        marginBottom: 8,
    },
    budgetBarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    budgetBarLabel: {
        ...TYPE.gradientLabel,
        fontSize: 16,
    },
    budgetBarValue: {
        ...TYPE.gradientValue,
    },
    budgetBarTrack: {
        height: 10,
        backgroundColor: SIM.trackBg,
        borderRadius: 5,
        overflow: 'hidden',
    },
    budgetBarFill: {
        height: '100%',
        borderRadius: 5,
    },
    budgetBarSummary: {
        ...TYPE.gradientLabel,
        fontSize: 15,
        textAlign: 'center',
        marginTop: 2,
    },
    /* Item card */
    itemArea: {
        paddingVertical: 12,
        justifyContent: 'center',
    },
    itemCardInner: {
        padding: 24,
        alignItems: 'center',
        gap: 8,
    },
    saleBadge: {
        backgroundColor: SIM.warningLight,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: SIM.warningBorder,
        paddingHorizontal: 14,
        paddingVertical: 4,
        marginBottom: 4,
    },
    saleBadgeText: {
        fontSize: 15,
        fontWeight: '800',
        color: SIM.warning,
    },
    itemEmoji: {
        fontSize: 48,
    },
    itemName: {
        fontSize: 20,
        fontWeight: '800',
        color: SIM.textPrimary,
        textAlign: 'center',
    },
    itemPrice: {
        fontSize: 24,
        fontWeight: '900',
        color: SIM.primary,
    },
    /* Action buttons */
    actionButtonsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    addButton: {
        flex: 1,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: SIM.btnPrimaryBorder,
        backgroundColor: SIM.btnPrimary,
        paddingVertical: 16,
        alignItems: 'center',
    },
    addButtonText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#fff',
    },
    skipButton: {
        flex: 1,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: SIM.cardBorder,
        backgroundColor: SIM.cardBg,
        paddingVertical: 16,
        alignItems: 'center',
    },
    skipButtonText: {
        fontSize: 15,
        fontWeight: '800',
        color: SIM.textSecondary,
    },
    /* Trap reveal popup */
    trapPopupOverlay: {
        paddingVertical: 16,
        justifyContent: 'center',
    },
    trapPopupCard: {
        backgroundColor: SIM.warningLight,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: SIM.warningBorder,
        padding: 24,
        alignItems: 'center',
        gap: 10,
        marginHorizontal: 8,
    },
    trapPopupTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: SIM.warning,
        textAlign: 'center',
    },
    trapPopupText: {
        fontSize: 16,
        fontWeight: '600',
        color: SIM.textPrimary,
        lineHeight: 22,
        textAlign: 'center',
    },
    trapPopupButton: {
        marginTop: 8,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: SIM.btnPrimaryBorder,
        backgroundColor: SIM.btnPrimary,
        paddingVertical: 12,
        paddingHorizontal: 32,
    },
    /* Mini cart */
    miniCartContainer: {
        backgroundColor: SIM.cardBg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: SIM.cardBorder,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    miniCartLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: SIM.textSecondary,
    },
    miniCartEmpty: {
        fontSize: 15,
        color: SIM.textMuted,
        textAlign: 'center',
    },
    miniCartScroll: {
        flexDirection: 'row',
    },
    miniCartItem: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: SIM.trackBg,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 4,
    },
    miniCartItemEmoji: {
        fontSize: 16,
    },
    /* Finn encouragement popup */
    finnOverlay: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    finnCard: {
        backgroundColor: '#e0f2fe',
        borderRadius: 24,
        borderWidth: 1.5,
        borderColor: 'rgba(56,189,248,0.4)',
        padding: 28,
        alignItems: 'center',
        gap: 12,
    },
    finnCircle: {
        width: 88,
        height: 88,
        borderRadius: 44,
        borderWidth: 2.5,
        borderColor: '#22c55e',
        backgroundColor: '#ffffff',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    finnTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: SIM.primary,
        textAlign: 'center',
    },
    finnMessage: {
        fontSize: 17,
        fontWeight: '600',
        color: SIM.textOnGradientMuted,
        textAlign: 'center',
        lineHeight: 26,
    },
    finnMessageSoft: {
        fontSize: 16,
        fontWeight: '600',
        color: '#334155',
        textAlign: 'center',
        lineHeight: 24,
    },
    finnButton: {
        marginTop: 8,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: SIM.btnPrimaryBorder,
        backgroundColor: SIM.btnPrimary,
        paddingVertical: 14,
        paddingHorizontal: 36,
    },
});

const shoppingCartStickyStyles = StyleSheet.create({
    stickyActionsBar: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'row-reverse',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingBottom: 16,
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(14,165,233,0.25)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 10,
    },
});
