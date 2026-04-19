import { createAudioPlayer } from 'expo-audio';
import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Pressable } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    withSequence,
    withRepeat,
    withDelay,
    cancelAnimation,
    FadeIn,
    runOnJS,
    interpolate,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { LottieIcon } from '../../../components/ui/LottieIcon';
import { FINN_STANDARD } from '../../retention-loops/finnMascotConfig';
import { tapHaptic, successHaptic, errorHaptic, heavyHaptic } from '../../../utils/haptics';
import { useSoundEffect } from '../../../hooks/useSoundEffect';
import { SimLottieBackground } from '../../../components/ui/SimLottieBackground';
import { getChapterTheme } from '../../../constants/theme';
import { ConfettiExplosion } from '../../../components/ui/ConfettiExplosion';
import { SIM, GRADE_COLORS, GRADE_HEBREW, SHADOW_LIGHT, RTL, TYPE, simStyles } from './simTheme';

// PRD50 — New swipe game logic & data
import { useMinusTrapSwipe } from './useMinusTrapGame';
import { minusTrapSwipeConfig } from './minusTrapData';
import type { SwipeCard, SwipeCardType, MinusTrapSwipeScore, ActiveRecurring, SwipeHistoryEntry } from './minusTrapTypes';
import { useTimeoutCleanup } from '../../../hooks/useTimeoutCleanup';

const CH = getChapterTheme('chapter-1');

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W - 48;
const SWIPE_THRESHOLD = 100;
const SWIPE_OUT_X = SCREEN_W * 1.4;

/* ── Lottie assets ── */
const LOTTIE_FIRE = require('../../../../assets/lottie/wired-flat-2804-fire-flame-hover-pinch.json');
const LOTTIE_REPLAY = require('../../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json');
const LOTTIE_ARROW = require('../../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');
const LOTTIE_ALERT = require('../../../../assets/lottie/wired-flat-193-bell-notification-hover-ring.json');

/* ── Card type display config ── */
const CARD_TYPE_CONFIG: Record<SwipeCardType, { label: string; color: string; bgColor: string }> = {
    want: { label: 'רצון', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)' },
    need: { label: 'חובה', color: '#ef4444', bgColor: 'rgba(239,68,68,0.15)' },
    trap: { label: 'מלכודת', color: '#a855f7', bgColor: 'rgba(168,85,247,0.15)' },
    income: { label: 'הכנסה', color: '#10b981', bgColor: 'rgba(16,185,129,0.15)' },
};

/* ------------------------------------------------------------------ */
/*  BalanceHeader — animated bar + interest monster                     */
/* ------------------------------------------------------------------ */
function BalanceHeader({
    balance,
    cardIndex,
    totalCards,
    interestPaid,
    gameOverThreshold,
    startingBalance,
    overdraftRate,
}: {
    balance: number;
    cardIndex: number;
    totalCards: number;
    interestPaid: number;
    gameOverThreshold: number;
    startingBalance: number;
    overdraftRate: number;
}) {
    const isNegative = balance < 0;
    const pulseScale = useSharedValue(1);
    const glowOpacity = useSharedValue(0);

    // Pulse on balance drop (any decrease, stronger when negative)
    const prevBalRef = useRef(balance);
    useEffect(() => {
        const dropped = balance < prevBalRef.current;
        prevBalRef.current = balance;
        if (dropped) {
            pulseScale.value = withSequence(
                withTiming(isNegative ? 1.08 : 1.05, { duration: 150 }),
                withSpring(1, { damping: 10, stiffness: 200 }),
            );
        }
    }, [balance, isNegative, pulseScale]);

    // Pulsing red glow when in overdraft
    useEffect(() => {
        if (isNegative) {
            glowOpacity.value = withRepeat(
                withSequence(
                    withTiming(1, { duration: 800 }),
                    withTiming(0.3, { duration: 800 }),
                ),
                -1,
                true,
            );
        } else {
            glowOpacity.value = withTiming(0, { duration: 300 });
        }
        return () => { cancelAnimation(glowOpacity); };
    }, [isNegative, glowOpacity]);

    const headerAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
    }));

    // Progress bar: full range from gameOverThreshold to startingBalance
    const totalRange = startingBalance - gameOverThreshold;
    const balanceInRange = Math.max(0, Math.min(totalRange, balance - gameOverThreshold));
    const progressPct = Math.round((balanceInRange / totalRange) * 100);

    // Bar color: green → yellow → red
    const barColor = isNegative
        ? '#ef4444'
        : balance <= startingBalance * 0.4
            ? '#f59e0b'
            : '#10b981';

    // Balance text color
    const balanceColor = isNegative
        ? '#ef4444'
        : balance <= startingBalance * 0.3
            ? '#f59e0b'
            : CH.text;

    // Interest per swipe when in overdraft
    const interestPerSwipe = isNegative
        ? Math.round(Math.abs(balance) * overdraftRate)
        : 0;

    return (
        <Animated.View style={[headerAnimatedStyle, styles.balanceHeader, {
            backgroundColor: isNegative ? 'rgba(239,68,68,0.1)' : 'rgba(8,145,178,0.1)',
            borderColor: isNegative ? 'rgba(239,68,68,0.4)' : 'rgba(8,145,178,0.3)',
        }]}>
            {/* Pulsing red glow overlay */}
            {isNegative && (
                <Animated.View style={[StyleSheet.absoluteFillObject, glowStyle, {
                    backgroundColor: 'rgba(239,68,68,0.15)',
                    borderRadius: 20,
                }]} />
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 4 }}>
                <Text style={{ fontSize: 13, color: '#f87171', fontWeight: '700' }}>
                    {interestPaid > 0 ? `ריבית ששולמה: ₪${interestPaid}` : ''}
                </Text>
                <Text style={TYPE.progress}>
                    קלף {cardIndex + 1} / {totalCards}
                </Text>
            </View>

            <Text style={{ fontSize: 44, fontWeight: '900', color: balanceColor, letterSpacing: -1 }}>
                ₪{balance.toLocaleString()}
            </Text>

            {isNegative ? (
                <View style={{ gap: 4, alignItems: 'center', marginTop: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <LottieIcon source={LOTTIE_FIRE} size={18} />
                        <Text style={[RTL, { fontSize: 14, color: '#f87171', fontWeight: '800' }]}>
                            מפלצת הריבית התעוררה!
                        </Text>
                    </View>
                    {/* Interest monster badge */}
                    <View style={styles.interestBadge}>
                        <Text style={{ fontSize: 13, color: '#fca5a5', fontWeight: '800' }}>
                            🔥 ₪{interestPerSwipe} ריבית לכל פעולה
                        </Text>
                    </View>
                </View>
            ) : (
                <Text style={[RTL, { fontSize: 13, color: '#ffffff', marginTop: 4, fontWeight: '800', ...SHADOW_LIGHT }]}>
                    מצב נזילות מצוין ✓
                </Text>
            )}

            <View style={styles.progressBarTrack}>
                <View style={{
                    width: `${progressPct}%`,
                    height: '100%',
                    backgroundColor: barColor,
                    borderRadius: 3,
                }} />
            </View>
        </Animated.View>
    );
}

/* ------------------------------------------------------------------ */
/*  RedFlashOverlay — full-screen red flash when entering overdraft    */
/* ------------------------------------------------------------------ */
function RedFlashOverlay({ trigger }: { trigger: number }) {
    const opacity = useSharedValue(0);

    useEffect(() => {
        if (trigger > 0) {
            opacity.value = withSequence(
                withTiming(0.45, { duration: 120 }),
                withTiming(0, { duration: 500 }),
            );
        }
    }, [trigger, opacity]);

    const flashStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return (
        <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFillObject, flashStyle, styles.redFlashOverlay]}
        />
    );
}

/* ------------------------------------------------------------------ */
/*  GameOverOverlay — screen shatter + "כרטיס נחסם" stamp              */
/* ------------------------------------------------------------------ */
function GameOverOverlay({ onDismiss }: { onDismiss: () => void }) {
    const shakeX = useSharedValue(0);
    const stampScale = useSharedValue(3);
    const stampOpacity = useSharedValue(0);
    const bgOpacity = useSharedValue(0);

    useEffect(() => {
        bgOpacity.value = withTiming(1, { duration: 300 });

        // Screen shake burst
        shakeX.value = withSequence(
            withTiming(15, { duration: 50 }),
            withTiming(-15, { duration: 50 }),
            withTiming(10, { duration: 50 }),
            withTiming(-10, { duration: 50 }),
            withTiming(5, { duration: 50 }),
            withTiming(0, { duration: 50 }),
        );

        // Stamp slam after shake
        stampOpacity.value = withDelay(400, withTiming(1, { duration: 50 }));
        stampScale.value = withDelay(400, withSpring(1, { damping: 8, stiffness: 200 }));

        const timer = setTimeout(onDismiss, 2500);
        return () => clearTimeout(timer);
    }, [bgOpacity, shakeX, stampOpacity, stampScale, onDismiss]);

    const bgStyle = useAnimatedStyle(() => ({
        opacity: bgOpacity.value,
    }));

    const shakeStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: shakeX.value }],
    }));

    const stampStyle = useAnimatedStyle(() => ({
        opacity: stampOpacity.value,
        transform: [{ scale: stampScale.value }, { rotate: '-12deg' }],
    }));

    return (
        <Animated.View style={[StyleSheet.absoluteFillObject, bgStyle, styles.gameOverBg]}>
            <Animated.View style={[styles.gameOverContent, shakeStyle]}>
                <Text style={[RTL, styles.gameOverTitle]} accessibilityRole="header">נגמר התקציב</Text>

                <Text style={[RTL, styles.gameOverSubtitle]}>
                    היתרה ירדה מתחת לאפס. בעולם האמיתי, כאן מתחילה הריבית לרוץ.
                </Text>
                <Text style={[RTL, { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 20, marginTop: 8 }]}>
                    בואו נראה מה אפשר לשפר
                </Text>
            </Animated.View>
        </Animated.View>
    );
}

/* ------------------------------------------------------------------ */
/*  MandatoryToast — warning when skipping a mandatory card            */
/* ------------------------------------------------------------------ */
function MandatoryToast({ cardTitle, onDismiss }: { cardTitle: string; onDismiss: () => void }) {
    const translateY = useSharedValue(-80);
    const opacity = useSharedValue(0);

    useEffect(() => {
        translateY.value = withSpring(0, { damping: 12, stiffness: 200 });
        opacity.value = withTiming(1, { duration: 200 });

        const dismissTimer = setTimeout(() => {
            translateY.value = withTiming(-80, { duration: 300 });
            opacity.value = withTiming(0, { duration: 300 });
        }, 1800);

        const removeTimer = setTimeout(onDismiss, 2200);

        return () => {
            clearTimeout(dismissTimer);
            clearTimeout(removeTimer);
        };
    }, [translateY, opacity, onDismiss]);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
        opacity: opacity.value,
    }));

    return (
        <Animated.View style={[styles.mandatoryToast, animStyle]} pointerEvents="none">
            <Text style={{ fontSize: 20 }}>⚠️</Text>
            <Text style={[RTL, styles.mandatoryToastText]}>דילגת על {cardTitle}!</Text>
        </Animated.View>
    );
}

/* ------------------------------------------------------------------ */
/*  PenaltyPopup — dramatic popup when a bank penalty triggers         */
/* ------------------------------------------------------------------ */
function PenaltyPopup({ amount, cardTitle, onDismiss }: { amount: number; cardTitle: string; onDismiss: () => void }) {
    const scale = useSharedValue(0.5);
    const bgOpacity = useSharedValue(0);
    const contentOpacity = useSharedValue(0);

    useEffect(() => {
        bgOpacity.value = withTiming(0.7, { duration: 200 });
        contentOpacity.value = withTiming(1, { duration: 200 });
        scale.value = withSpring(1, { damping: 8, stiffness: 200 });

        const dismissTimer = setTimeout(() => {
            bgOpacity.value = withTiming(0, { duration: 300 });
            contentOpacity.value = withTiming(0, { duration: 300 });
            scale.value = withTiming(0.8, { duration: 300 });
        }, 2500);

        const removeTimer = setTimeout(onDismiss, 2900);

        return () => {
            clearTimeout(dismissTimer);
            clearTimeout(removeTimer);
        };
    }, [scale, bgOpacity, contentOpacity, onDismiss]);

    const bgStyle = useAnimatedStyle(() => ({
        opacity: bgOpacity.value,
    }));

    const cardStyle = useAnimatedStyle(() => ({
        opacity: contentOpacity.value,
        transform: [{ scale: scale.value }],
    }));

    return (
        <View style={[StyleSheet.absoluteFillObject, { zIndex: 40 }]} pointerEvents="none">
            <Animated.View style={[StyleSheet.absoluteFillObject, bgStyle, { backgroundColor: '#000' }]} />
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Animated.View style={[styles.penaltyPopupCard, cardStyle]}>
                    <Text style={{ fontSize: 48 }}>📨</Text>
                    <Text style={[RTL, styles.penaltyPopupTitle]}>התראה מהבנק!</Text>
                    <Text style={styles.penaltyPopupAmount}>קנס ₪{amount.toLocaleString()}</Text>
                    <Text style={[RTL, styles.penaltyPopupDesc]}>
                        דילגת על {cardTitle} — הגיע החשבון
                    </Text>
                </Animated.View>
            </View>
        </View>
    );
}

/* ------------------------------------------------------------------ */
/*  RecurringCostChips — recurring cost badges below balance bar       */
/* ------------------------------------------------------------------ */
function RecurringCostChips({ recurring, cards }: { recurring: ActiveRecurring[]; cards: SwipeCard[] }) {
    if (recurring.length === 0) return null;

    return (
        <View style={styles.recurringChipsRow}>
            {recurring.map((r) => {
                const card = cards.find(c => c.id === r.id);
                return (
                    <Animated.View
                        key={r.id}
                        entering={FadeIn.duration(300)}
                        style={styles.recurringChip}
                    >
                        <Text style={styles.recurringChipText}>
                            {card?.emoji ?? '📱'} −₪{r.costPerCard}/קלף
                        </Text>
                    </Animated.View>
                );
            })}
        </View>
    );
}

/* ------------------------------------------------------------------ */
/*  SwipeableCard — Tinder-style card with MythCardDeck physics        */
/* ------------------------------------------------------------------ */
function SwipeableCard({
    card,
    onSwipeRight,
    onSwipeLeft,
}: {
    card: SwipeCard;
    onSwipeRight: (card: SwipeCard) => void;
    onSwipeLeft: (card: SwipeCard) => void;
}) {
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);

    const fireSwipe = useCallback(
        (direction: 'left' | 'right') => {
            if (direction === 'right') {
                onSwipeRight(card);
            } else {
                onSwipeLeft(card);
            }
        },
        [card, onSwipeRight, onSwipeLeft],
    );

    const gesture = Gesture.Pan()
        .runOnJS(true)
        .onUpdate((e) => {
            translateX.value = e.translationX;
            translateY.value = e.translationY * 0.3;
        })
        .onEnd((e) => {
            if (Math.abs(e.translationX) > SWIPE_THRESHOLD) {
                const dir = e.translationX > 0 ? 'right' : 'left';
                const targetX = dir === 'right' ? SWIPE_OUT_X : -SWIPE_OUT_X;
                translateX.value = withTiming(targetX, { duration: 280 });
                runOnJS(fireSwipe)(dir);
            } else {
                translateX.value = withSpring(0, { damping: 15, stiffness: 200 });
                translateY.value = withSpring(0, { damping: 15, stiffness: 200 });
            }
        });

    const cardStyle = useAnimatedStyle(() => {
        const rotate = interpolate(translateX.value, [-SCREEN_W, SCREEN_W], [-18, 18]);
        return {
            transform: [
                { translateX: translateX.value },
                { translateY: translateY.value },
                { rotate: `${rotate}deg` },
            ],
        };
    });

    const rightOverlayStyle = useAnimatedStyle(() => ({
        opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], 'clamp'),
    }));

    const leftOverlayStyle = useAnimatedStyle(() => ({
        opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], 'clamp'),
    }));

    const typeConfig = CARD_TYPE_CONFIG[card.cardType];
    const isExpense = card.amount < 0;

    return (
        <GestureDetector gesture={gesture}>
            <Animated.View style={[styles.swipeCard, cardStyle]}>
                {/* Card type badge */}
                <View style={[styles.typeBadge, { backgroundColor: typeConfig.bgColor, borderColor: typeConfig.color }]}>
                    <Text style={[RTL, { fontSize: 13, fontWeight: '700', color: typeConfig.color }]}>
                        {typeConfig.label}
                    </Text>
                </View>

                {/* Mandatory badge */}
                {card.isMandatory && (
                    <View style={styles.mandatoryBadge}>
                        <Text style={styles.mandatoryBadgeText}>⚠️ חובה!</Text>
                    </View>
                )}

                {/* Card content */}
                <View style={styles.cardContent}>
                    <Text style={{ fontSize: 64 }}>{card.emoji}</Text>
                    <Text style={[RTL, styles.cardTitle]}>{card.title}</Text>
                    <View style={[styles.amountBadge, {
                        backgroundColor: isExpense ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                    }]}>
                        <Text style={[styles.amountText, { color: isExpense ? '#ef4444' : '#10b981' }]}>
                            {isExpense ? '-' : '+'}₪{Math.abs(card.amount).toLocaleString()}
                        </Text>
                    </View>
                </View>

                {/* Swipe overlays */}
                <Animated.View style={[styles.swipeOverlay, styles.leftOverlay, leftOverlayStyle]}>
                    <Text style={styles.overlayLabel}>מוותר ✋</Text>
                </Animated.View>
                <Animated.View style={[styles.swipeOverlay, styles.rightOverlay, rightOverlayStyle]}>
                    <Text style={styles.overlayLabel}>לוקח 💳</Text>
                </Animated.View>
            </Animated.View>
        </GestureDetector>
    );
}

/* ------------------------------------------------------------------ */
/*  BackCard — non-interactive depth cards behind active card           */
/* ------------------------------------------------------------------ */
function BackCard({ offset }: { offset: number }) {
    return (
        <Animated.View
            style={[
                styles.swipeCard,
                styles.backCard,
                {
                    transform: [
                        { scale: 1 - offset * 0.04 },
                        { translateY: offset * 10 },
                    ],
                    zIndex: -offset,
                    opacity: 1 - offset * 0.2,
                },
            ]}
        />
    );
}

/* ------------------------------------------------------------------ */
/*  ScoreScreen — Receipt-style end screen (קבלה מודפסת)               */
/* ------------------------------------------------------------------ */
function ScoreScreen({
    score,
    onReplay,
    onFinish,
    isBlocked,
    swipeHistory,
    cards,
}: {
    score: MinusTrapSwipeScore;
    onReplay: () => void;
    onFinish: () => void;
    isBlocked: boolean;
    swipeHistory: SwipeHistoryEntry[];
    cards: SwipeCard[];
}) {
    const gradeColor = isBlocked ? '#ef4444' : (GRADE_COLORS[score.grade] ?? SIM.textPrimary);

    return (
        <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 30, flexGrow: 1 }} showsVerticalScrollIndicator={false}>
                {/* Grade + Finn */}
                <View style={[simStyles.gradeContainer, { flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 12 }]}>
                    <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 60, height: 60 }} contentFit="contain" />
                    <View style={{ alignItems: 'center' }}>
                        <Text style={[simStyles.gradeText, { color: gradeColor }]}>
                            {GRADE_HEBREW[score.grade] ?? score.grade}
                        </Text>
                        <Text style={[RTL, simStyles.gradeLabel]}>
                            {score.gradeLabel}
                        </Text>
                    </View>
                </View>

                {/* Score Card */}
                <View style={[simStyles.scoreCard, { borderColor: gradeColor, shadowColor: gradeColor }]}>
                    <View style={simStyles.scoreCardInner}>
                        <Text style={[RTL, TYPE.cardTitle]}>סיכום החודש</Text>

                        <View style={simStyles.scoreRow}>
                            <Text style={[RTL, simStyles.scoreRowLabel]}>יתרת סגירה</Text>
                            <Text style={[
                                simStyles.scoreRowValue,
                                { color: score.finalBalance < 0 ? SIM.danger : SIM.success },
                            ]}>
                                ₪{score.finalBalance.toLocaleString()}
                            </Text>
                        </View>
                        <View style={simStyles.scoreRow}>
                            <Text style={[RTL, simStyles.scoreRowLabel]}>סה״כ הוצאות</Text>
                            <Text style={[simStyles.scoreRowValue, { color: SIM.danger }]}>
                                ₪{score.totalSpent.toLocaleString()}
                            </Text>
                        </View>
                        <View style={simStyles.scoreRow}>
                            <Text style={[RTL, simStyles.scoreRowLabel]}>סה״כ ריבית</Text>
                            <Text style={[simStyles.scoreRowValue, { color: SIM.danger }]}>
                                ₪{score.interestPaid.toLocaleString()}
                            </Text>
                        </View>
                        <View style={simStyles.scoreRow}>
                            <Text style={[RTL, simStyles.scoreRowLabel]}>קנסות</Text>
                            <Text style={[simStyles.scoreRowValue, { color: SIM.textPrimary }]}>{score.penaltiesHit}</Text>
                        </View>

                        <View style={simStyles.scoreDivider}>
                            <Text style={[RTL, simStyles.scoreRowLabel]}>קלפים שנקנו / נדחו</Text>
                            <Text style={[simStyles.scoreRowValue, { color: SIM.textPrimary }]}>
                                {score.cardsSwipedRight} / {score.cardsSwipedLeft}
                            </Text>
                        </View>

                        {/* Educational Takeaway */}
                        <View style={simStyles.insightRow}>
                            <Text style={simStyles.insightText}>
                                ריבית על מינוס בעו"ש מגיעה עד 15% בשנה — על כל שקל שאתה במינוס, הבנק גובה ריבית יומית.
                            </Text>
                        </View>
                        <View style={[simStyles.insightRow, { marginTop: 6 }]}>
                            <Text style={simStyles.insightText}>
                                הכלל: אשראי רק לנכסים שצומחים (השכלה, עסק). לצריכה שוטפת — רק מכסף שיש לך עכשיו.
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Buttons */}
                <View style={[simStyles.actionsRow, { marginTop: 16 }]}>
                    <AnimatedPressable onPress={onReplay} style={simStyles.replayBtn} accessibilityRole="button" accessibilityLabel="התחל שוב">
                        <View><LottieIcon source={LOTTIE_REPLAY} size={20} /></View>
                        <Text style={[RTL, simStyles.replayText]}>התחל שוב</Text>
                    </AnimatedPressable>

                    <AnimatedPressable onPress={onFinish} style={simStyles.continueBtn} accessibilityRole="button" accessibilityLabel="המשך בפרק">
                        <Text style={[RTL, simStyles.continueText]}>המשך בפרק</Text>
                        <View><LottieIcon source={LOTTIE_ARROW} size={22} /></View>
                    </AnimatedPressable>
                </View>
            </ScrollView>
        </Animated.View>
    );
}

/* ------------------------------------------------------------------ */
/*  Main Screen                                                        */
/* ------------------------------------------------------------------ */

export function MinusTrapGameScreen({ onComplete }: { onComplete: () => void }) {
    const {
        state,
        currentCard,
        swipeRight,
        swipeLeft,
        score,
        swipeHistory,
        resetGame,
    } = useMinusTrapSwipe(minusTrapSwipeConfig);

    const { playSound } = useSoundEffect();
    const safeTimeout = useTimeoutCleanup();

    
    useEffect(() => {
        const player = createAudioPlayer({ uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/audio/sims/sim-minus-trap.mp3' });
        player.play();
        return () => {
            player.pause();
            player.remove();
        };
    }, []);
const [rewardsGranted, setRewardsGranted] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [gameOverAnimDone, setGameOverAnimDone] = useState(false);
    const [flashTrigger, setFlashTrigger] = useState(0);
    const prevBalanceRef = useRef(minusTrapSwipeConfig.startingBalance);
    const [mandatoryToast, setMandatoryToast] = useState<string | null>(null);
    const [penaltyPopup, setPenaltyPopup] = useState<{ amount: number; cardTitle: string } | null>(null);
    const prevAppliedIdsRef = useRef<Set<string>>(new Set());

    const showGameOverAnim = state.isGameOver && !gameOverAnimDone;
    const showScore = (state.isGameOver && gameOverAnimDone) || state.isComplete;

    // Detect crossing into negative → red flash + heavy haptic
    useEffect(() => {
        if (prevBalanceRef.current >= 0 && state.balance < 0 && !state.isGameOver) {
            setFlashTrigger(t => t + 1);
            heavyHaptic();
        }
        prevBalanceRef.current = state.balance;
    }, [state.balance, state.isGameOver]);

    // Game over: triple heavy haptic burst
    useEffect(() => {
        if (state.isGameOver && !gameOverAnimDone) {
            heavyHaptic();
            setTimeout(() => heavyHaptic(), 150);
            setTimeout(() => heavyHaptic(), 300);
        }
    }, [state.isGameOver, gameOverAnimDone]);

    // Rewards on finish
    useEffect(() => {
        if (showScore && !rewardsGranted) {
            setRewardsGranted(true);

            if (state.isComplete && score && (score.grade === 'S' || score.grade === 'A')) {
                setShowConfetti(true);
                successHaptic();
            } else if (!state.isGameOver) {
                errorHaptic();
            }

        }
    }, [showScore, state.isComplete, state.isGameOver, rewardsGranted, score]);

    // Detect newly triggered penalties → show popup
    useEffect(() => {
        const currentApplied = new Set(
            state.penalties.filter(p => p.applied).map(p => p.cardId),
        );

        for (const id of currentApplied) {
            if (!prevAppliedIdsRef.current.has(id)) {
                const penalty = state.penalties.find(p => p.cardId === id && p.applied);
                if (penalty) {
                    const card = minusTrapSwipeConfig.cards.find(c => c.id === penalty.cardId);
                    setPenaltyPopup({ amount: penalty.amount, cardTitle: card?.title ?? '' });
                    errorHaptic();
                    playSound('modal_open_1');
                }
                break;
            }
        }

        prevAppliedIdsRef.current = currentApplied;
    }, [state.penalties, playSound]);

    const handleMandatoryToastDismiss = useCallback(() => setMandatoryToast(null), []);
    const handlePenaltyPopupDismiss = useCallback(() => setPenaltyPopup(null), []);

    const handleReplay = useCallback(() => {
        resetGame();
        setRewardsGranted(false);
        setShowConfetti(false);
        setGameOverAnimDone(false);
        setFlashTrigger(0);
        setMandatoryToast(null);
        setPenaltyPopup(null);
        prevBalanceRef.current = minusTrapSwipeConfig.startingBalance;
        prevAppliedIdsRef.current = new Set();
    }, [resetGame]);

    const handleGameOverDismiss = useCallback(() => {
        setGameOverAnimDone(true);
    }, []);

    const handleSwipeRight = useCallback((card: SwipeCard) => {
        if (state.balance < 0) {
            heavyHaptic();
        } else {
            tapHaptic();
        }
        swipeRight(card);
    }, [swipeRight, state.balance]);

    const handleSwipeLeft = useCallback((card: SwipeCard) => {
        tapHaptic();
        if (card.isMandatory) {
            setMandatoryToast(card.title);
            errorHaptic();
        }
        swipeLeft(card);
    }, [swipeLeft]);

    const remainingCards = minusTrapSwipeConfig.cards.length - state.cardsPlayed;

    return (
        <SimLottieBackground lottieSources={[LOTTIE_FIRE, LOTTIE_ALERT]} chapterColors={CH.gradient}>
            {showConfetti && <ConfettiExplosion />}
            <RedFlashOverlay trigger={flashTrigger} />
            {mandatoryToast !== null && (
                <MandatoryToast
                    cardTitle={mandatoryToast}
                    onDismiss={handleMandatoryToastDismiss}
                />
            )}
            {penaltyPopup !== null && (
                <PenaltyPopup
                    amount={penaltyPopup.amount}
                    cardTitle={penaltyPopup.cardTitle}
                    onDismiss={handlePenaltyPopupDismiss}
                />
            )}
            <View style={{ flex: 1, paddingTop: 20 }}>
                {showGameOverAnim ? (
                    <GameOverOverlay onDismiss={handleGameOverDismiss} />
                ) : showScore && score ? (
                    <ScoreScreen
                        score={score}
                        isBlocked={state.isGameOver}
                        onReplay={handleReplay}
                        onFinish={onComplete}
                        swipeHistory={swipeHistory}
                        cards={minusTrapSwipeConfig.cards}
                    />
                ) : (
                    <View style={{ flex: 1 }}>
                        <BalanceHeader
                            balance={state.balance}
                            cardIndex={state.cardsPlayed}
                            totalCards={minusTrapSwipeConfig.cards.length}
                            interestPaid={state.interestPaid}
                            gameOverThreshold={minusTrapSwipeConfig.gameOverThreshold}
                            startingBalance={minusTrapSwipeConfig.startingBalance}
                            overdraftRate={minusTrapSwipeConfig.overdraftInterestRate}
                        />

                        <RecurringCostChips
                            recurring={state.activeRecurring}
                            cards={minusTrapSwipeConfig.cards}
                        />

                        {/* Card deck with depth */}
                        <View style={styles.deckContainer}>
                            {remainingCards > 2 && <BackCard offset={2} />}
                            {remainingCards > 1 && <BackCard offset={1} />}

                            {currentCard && (
                                <SwipeableCard
                                    key={currentCard.id}
                                    card={currentCard}
                                    onSwipeRight={handleSwipeRight}
                                    onSwipeLeft={handleSwipeLeft}
                                />
                            )}
                        </View>

                        {/* Swipe Hint Bar — accessible button alternatives */}
                        <View style={styles.swipeHintBar}>
                            <Pressable
                                style={styles.hintSide}
                                onPress={() => currentCard && handleSwipeLeft(currentCard)}
                                accessibilityRole="button"
                                accessibilityLabel="מוותר על הפריט"
                                accessibilityHint="לחץ כדי לוותר על ההוצאה"
                                hitSlop={8}
                            >
                                <Text style={styles.hintArrowDark}>✗ ←</Text>
                                <Text style={styles.hintLabelSkip}>מוותר</Text>
                            </Pressable>
                            <LottieIcon source={LOTTIE_ALERT} size={24} />
                            <Pressable
                                style={styles.hintSide}
                                onPress={() => currentCard && handleSwipeRight(currentCard)}
                                accessibilityRole="button"
                                accessibilityLabel="לוקח את הפריט"
                                accessibilityHint="לחץ כדי לקחת את ההוצאה"
                                hitSlop={8}
                            >
                                <Text style={styles.hintArrowDark}>→ ✓</Text>
                                <Text style={styles.hintLabelTake}>לוקח</Text>
                            </Pressable>
                        </View>
                    </View>
                )}
            </View>
        </SimLottieBackground>
    );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
    balanceHeader: {
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1.5,
        marginBottom: 12,
    },
    progressBarTrack: {
        width: '100%',
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 3,
        marginTop: 12,
        overflow: 'hidden',
    },
    deckContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    swipeCard: {
        position: 'absolute',
        width: CARD_W,
        height: CARD_W * 1.15,
        backgroundColor: SIM.cardBg,
        borderRadius: 28,
        borderWidth: 2,
        borderColor: SIM.cardBorder,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 8,
    },
    backCard: {
        backgroundColor: '#f0f4f8',
        borderColor: 'rgba(34,211,238,0.15)',
    },
    typeBadge: {
        position: 'absolute',
        top: 16,
        right: 16,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderWidth: 1,
        zIndex: 1,
    },
    cardContent: {
        flex: 1,
        padding: 28,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    cardTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: SIM.textPrimary,
        textAlign: 'center',
        lineHeight: 32,
    },
    amountBadge: {
        marginTop: 8,
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 20,
    },
    amountText: {
        fontSize: 28,
        fontWeight: '900',
    },
    swipeOverlay: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
    },
    leftOverlay: {
        backgroundColor: 'rgba(239,68,68,0.2)',
        borderWidth: 4,
        borderColor: 'rgba(239,68,68,0.8)',
    },
    rightOverlay: {
        backgroundColor: 'rgba(16,185,129,0.2)',
        borderWidth: 4,
        borderColor: 'rgba(16,185,129,0.8)',
    },
    overlayLabel: {
        fontSize: 36,
        fontWeight: '900',
        color: '#ffffff',
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    /* Receipt/button styles removed — now using simStyles from simTheme */
    swipeHintBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.92)',
        borderRadius: 16,
        paddingVertical: 10,
        paddingHorizontal: 28,
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    hintSide: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    hintArrowDark: {
        fontSize: 22,
        fontWeight: '900',
        color: SIM.textPrimary,
    },
    hintLabelSkip: {
        fontSize: 14,
        fontWeight: '800',
        color: '#ef4444',
    },
    hintLabelTake: {
        fontSize: 14,
        fontWeight: '800',
        color: '#10b981',
    },
    interestBadge: {
        backgroundColor: 'rgba(239,68,68,0.2)',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: 'rgba(239,68,68,0.4)',
    },
    redFlashOverlay: {
        backgroundColor: '#ef4444',
        zIndex: 100,
    },
    gameOverBg: {
        backgroundColor: 'rgba(0,0,0,0.85)',
        zIndex: 50,
    },
    gameOverContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    gameOverEmoji: {
        fontSize: 80,
    },
    gameOverTitle: {
        fontSize: 36,
        fontWeight: '900',
        color: '#ef4444',
        textAlign: 'center',
    },
    gameOverStamp: {
        borderWidth: 4,
        borderColor: '#ef4444',
        borderRadius: 12,
        paddingHorizontal: 24,
        paddingVertical: 14,
        marginVertical: 8,
    },
    gameOverStampText: {
        fontSize: 28,
        fontWeight: '900',
        color: '#ef4444',
        textAlign: 'center',
    },
    gameOverSubtitle: {
        fontSize: 16,
        color: '#fca5a5',
        fontWeight: '700',
        textAlign: 'center',
        paddingHorizontal: 32,
    },
    mandatoryBadge: {
        position: 'absolute',
        top: 16,
        left: 16,
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: 'rgba(239,68,68,0.15)',
        borderWidth: 1.5,
        borderColor: '#ef4444',
        zIndex: 1,
    },
    mandatoryBadgeText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#ef4444',
    },
    mandatoryToast: {
        position: 'absolute',
        top: 60,
        left: 24,
        right: 24,
        zIndex: 80,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 16,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#ef4444',
        shadowOpacity: 0.25,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
        borderWidth: 1.5,
        borderColor: 'rgba(239,68,68,0.25)',
    },
    mandatoryToastText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#b91c1c',
        textAlign: 'center',
    },
    penaltyPopupCard: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
        gap: 8,
        borderWidth: 2,
        borderColor: '#fcd34d',
        marginHorizontal: 32,
        shadowColor: '#f59e0b',
        shadowOpacity: 0.3,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 10,
    },
    penaltyPopupTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: '#92400e',
        textAlign: 'center',
    },
    penaltyPopupAmount: {
        fontSize: 28,
        fontWeight: '900',
        color: '#dc2626',
        textAlign: 'center',
    },
    penaltyPopupDesc: {
        fontSize: 14,
        fontWeight: '700',
        color: '#78716c',
        textAlign: 'center',
        marginTop: 4,
    },
    recurringChipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 8,
        justifyContent: 'center',
    },
    recurringChip: {
        backgroundColor: 'rgba(168,85,247,0.15)',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: 'rgba(168,85,247,0.4)',
    },
    recurringChipText: {
        fontSize: 14,
        fontWeight: '800',
        color: SIM.textSecondary,
    },
});
