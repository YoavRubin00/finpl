import { createAudioPlayer } from 'expo-audio';
import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, PanResponder } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    withSequence,
    withRepeat,
    cancelAnimation,
    FadeIn,
    FadeInDown,
    SlideOutLeft,
} from 'react-native-reanimated';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { SimFeedbackBar } from '../../../components/ui/SimFeedbackBar';
import { LottieIcon } from '../../../components/ui/LottieIcon';
import { successHaptic, errorHaptic } from '../../../utils/haptics';
import { useTimeoutCleanup } from '../../../hooks/useTimeoutCleanup';
import { useBudgetGame } from './useBudgetGame';
import { budgetGameConfig } from './budgetData';
import type { DilemmaOption, BudgetScore } from './budgetTypes';
import { SimLottieBackground } from '../../../components/ui/SimLottieBackground';
import { getChapterTheme } from '../../../constants/theme';
import { SIM, GRADE_COLORS, GRADE_HEBREW, RTL, TYPE, simStyles } from './simTheme';

const CH = getChapterTheme('chapter-1');


/* ── Lottie assets ── */
const LOTTIE_CHART = require('../../../../assets/lottie/wired-flat-153-bar-chart-hover-pinch.json');
const LOTTIE_HOUSE = require('../../../../assets/lottie/wired-flat-63-home-hover-3d-roll.json');
const LOTTIE_MONEY = require('../../../../assets/lottie/wired-flat-413-money-bag-hover-shake.json');
const LOTTIE_REPLAY = require('../../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json');
const LOTTIE_TARGET = require('../../../../assets/lottie/wired-flat-458-goal-target-hover-hit.json');
const LOTTIE_CHECK = require('../../../../assets/lottie/wired-flat-24-approved-checked-hover-pinch.json');
const LOTTIE_CROSS = require('../../../../assets/lottie/wired-flat-25-error-cross-hover-pinch.json');
const LOTTIE_CART = require('../../../../assets/lottie/wired-flat-146-trolley-hover-jump.json');
const LOTTIE_ARROW = require('../../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');

/* ------------------------------------------------------------------ */
/*  BucketBar, animated progress bar for a budget bucket              */
/* ------------------------------------------------------------------ */

function BucketBar({
    label,
    lottieSource,
    percent,
    spent,
    limit,
    isOver,
    color,
}: {
    label: string;
    lottieSource: ReturnType<typeof require>;
    percent: number;
    spent: number;
    limit: number;
    isOver: boolean;
    color: string;
}) {
    const barWidth = useSharedValue(0);
    const pulseOpacity = useSharedValue(1);

    useEffect(() => {
        barWidth.value = withSpring(Math.min(percent, 100), {
            damping: 20,
            stiffness: 100,
        });
    }, [percent, barWidth]);

    useEffect(() => {
        if (isOver) {
            pulseOpacity.value = withRepeat(
                withSequence(
                    withTiming(0.4, { duration: 400 }),
                    withTiming(1, { duration: 400 }),
                ),
                -1,
                true,
            );
        } else {
            pulseOpacity.value = withTiming(1, { duration: 200 });
        }
        return () => { cancelAnimation(pulseOpacity); };
    }, [isOver, pulseOpacity]);

    const barStyle = useAnimatedStyle(() => ({
        width: `${barWidth.value}%` as `${number}%`,
        opacity: pulseOpacity.value,
    }));

    const overflowColor = isOver ? SIM.warning : color;

    return (
        <View style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <LottieIcon source={lottieSource} size={24} />
                    <Text style={[RTL, TYPE.gradientLabel, { fontSize: 16, color: isOver ? SIM.warning : SIM.textOnGradientMuted, fontWeight: '800' }]}>
                        {label}
                    </Text>
                </View>
                <Text style={[TYPE.gradientValue, { color: isOver ? SIM.warning : SIM.textOnGradientMuted, fontWeight: '600' }]}>
                    {'\u20AA'}{spent.toLocaleString()} / {'\u20AA'}{limit.toLocaleString()}
                </Text>
            </View>
            <View style={{ height: 10, backgroundColor: SIM.trackBg, borderRadius: 5, overflow: 'hidden' }}>
                <Animated.View
                    style={[barStyle, { height: '100%', borderRadius: 5, backgroundColor: overflowColor }]}
                />
            </View>
        </View>
    );
}

/* ------------------------------------------------------------------ */
/*  BalanceHeader, shows remaining balance like a banking app          */
/* ------------------------------------------------------------------ */

function BalanceHeader({ balance, salary }: { balance: number; salary: number }) {
    const isLow = balance < salary * 0.1;
    const isNegative = balance < 0;

    return (
        <View
            style={{
                alignItems: 'center',
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 16,
                backgroundColor: isNegative ? SIM.warningLight : SIM.cardBg,
                borderWidth: 1,
                borderColor: isNegative ? SIM.warningBorder : SIM.cardBorder,
                marginBottom: 6,
            }}
        >
            <Text style={[RTL, { fontSize: 13, color: SIM.textSecondary, marginBottom: 2, fontWeight: '500' }]}>
                יתרה זמינה
            </Text>
            <Text
                style={{
                    fontSize: 24,
                    fontWeight: '900',
                    color: isNegative ? SIM.warning : isLow ? SIM.warning : SIM.textPrimary,
                }}
            >
                {'\u20AA'}{balance.toLocaleString()}
            </Text>
        </View>
    );
}

/* ------------------------------------------------------------------ */
/*  DilemmaCard, the scenario + choice buttons                        */
/* ------------------------------------------------------------------ */

const SCREEN_W = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_W * 0.25;
const SWIPE_UP_THRESHOLD = -100;

function BudgetSwipeCard({
    emoji,
    question,
    options,
    onChoice,
}: {
    emoji: string;
    question: string;
    options: DilemmaOption[];
    onChoice: (option: DilemmaOption) => void;
}) {
    const [feedback, setFeedback] = useState<DilemmaOption | null>(null);
    const isDoneRef = useRef(false);
    const safeTimeout = useTimeoutCleanup();
    const hasThree = options.length >= 3;

    // Animated card position
    const cardX = useSharedValue(0);
    const cardY = useSharedValue(0);
    const cardRotate = useSharedValue(0);

    const handleSwipe = useCallback((optionIndex: number) => {
        if (isDoneRef.current) return;
        isDoneRef.current = true;
        const option = options[optionIndex];
        if (!option) return;
        if (option.category === 'savings' || option.amount === 0) successHaptic();
        else if (option.amount > 500) errorHaptic();
        setFeedback(option);
        safeTimeout(() => {
            onChoice(option);
            setFeedback(null);
            isDoneRef.current = false;
        }, 2000);
    }, [options, onChoice, safeTimeout]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 || Math.abs(g.dy) > 10,
            onPanResponderMove: (_, g) => {
                if (isDoneRef.current) return;
                cardX.value = g.dx;
                cardY.value = g.dy * 0.3;
                cardRotate.value = (g.dx / SCREEN_W) * 15;
            },
            onPanResponderRelease: (_, g) => {
                if (isDoneRef.current) return;
                // Swipe right → option 0
                if (g.dx > SWIPE_THRESHOLD) {
                    cardX.value = withTiming(SCREEN_W * 1.5, { duration: 300 });
                    handleSwipe(0);
                }
                // Swipe left → option 1
                else if (g.dx < -SWIPE_THRESHOLD) {
                    cardX.value = withTiming(-SCREEN_W * 1.5, { duration: 300 });
                    handleSwipe(1);
                }
                // Swipe up → option 2 (if exists)
                else if (hasThree && g.dy < SWIPE_UP_THRESHOLD) {
                    cardY.value = withTiming(-800, { duration: 300 });
                    handleSwipe(2);
                }
                // Snap back
                else {
                    cardX.value = withSpring(0, { damping: 15, stiffness: 200 });
                    cardY.value = withSpring(0, { damping: 15, stiffness: 200 });
                    cardRotate.value = withSpring(0);
                }
            },
        })
    ).current;

    const cardStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: cardX.value },
            { translateY: cardY.value },
            { rotate: `${cardRotate.value}deg` },
        ],
    }));

    // Swipe direction overlays
    const rightGlow = useAnimatedStyle(() => ({
        opacity: Math.min(Math.max(cardX.value / SWIPE_THRESHOLD, 0), 0.3),
    }));
    const leftGlow = useAnimatedStyle(() => ({
        opacity: Math.min(Math.max(-cardX.value / SWIPE_THRESHOLD, 0), 0.3),
    }));

    return (
        <View style={{ flex: 1, justifyContent: 'center' }}>
            {/* Up option, outside the card, above it */}
            {hasThree && options[2] && (
                <Pressable
                    onPress={() => handleSwipe(2)}
                    accessibilityRole="button"
                    accessibilityLabel={`חיסכון: ${options[2].label}`}
                    accessibilityHint="לחץ כדי לשמור לחיסכון"
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10, backgroundColor: '#e0f2fe', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1.5, borderColor: '#7dd3fc' }}
                >
                    <Text style={{ fontSize: 22, fontWeight: '900', color: '#0284c7' }}>↑</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#0284c7', writingDirection: 'rtl', textAlign: 'right' }}>שמור לחיסכון: {options[2].label}</Text>
                </Pressable>
            )}

            {/* Swipeable Card */}
            <Animated.View style={[swipeStyles.card, cardStyle]} {...panResponder.panHandlers}>
                {/* Direction overlays */}
                <Animated.View style={[swipeStyles.overlay, { backgroundColor: 'rgba(34,197,94,0.25)' }, rightGlow]} />
                <Animated.View style={[swipeStyles.overlay, { backgroundColor: 'rgba(239,68,68,0.25)' }, leftGlow]} />

                {/* Content */}
                <Text style={{ fontSize: 28, textAlign: 'center', marginBottom: 6 }}>{emoji}</Text>
                <Text style={[RTL, swipeStyles.question]}>{question}</Text>

                {/* Left/Right hints, large tap targets with clear icons */}
                <View style={swipeStyles.hintsRow}>
                    {/* Skip, left side */}
                    <Pressable
                        style={[swipeStyles.hintPill, { borderColor: '#fecaca', backgroundColor: '#fef2f2' }]}
                        onPress={() => handleSwipe(1)}
                        accessibilityRole="button"
                        accessibilityLabel={`דלג: ${options[1]?.label}`}
                    >
                        <Text style={{ fontSize: 28, fontWeight: '900', color: '#ef4444' }}>✗</Text>
                        <Text style={[swipeStyles.hintText, { color: '#ef4444' }]} numberOfLines={1}>{options[1]?.label}</Text>
                    </Pressable>
                    {/* Add, right side */}
                    <Pressable
                        style={[swipeStyles.hintPill, { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' }]}
                        onPress={() => handleSwipe(0)}
                        accessibilityRole="button"
                        accessibilityLabel={`הוסף: ${options[0]?.label}`}
                    >
                        <Text style={{ fontSize: 28, fontWeight: '900', color: '#16a34a' }}>✓</Text>
                        <Text style={[swipeStyles.hintText, { color: '#16a34a' }]} numberOfLines={1}>{options[0]?.label}</Text>
                    </Pressable>
                </View>
            </Animated.View>

            {/* Feedback, tap to advance */}
            {feedback && (
                <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={() => { onChoice(feedback); setFeedback(null); isDoneRef.current = false; }}
                >
                    <View style={{ flex: 1 }} />
                    <SimFeedbackBar
                        isCorrect={feedback.category === 'savings' || feedback.amount === 0}
                        message={feedback.feedback}
                        accentColor={CH.primary}
                    />
                </Pressable>
            )}
        </View>
    );
}

const swipeStyles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 20,
        paddingVertical: 28,
        marginHorizontal: 0,
        shadowColor: '#0c4a6e',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 8,
        overflow: 'hidden',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 24,
    },
    question: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0f172a',
        lineHeight: 24,
        marginBottom: 12,
        textAlign: 'center',
    },
    hintsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    hintPill: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        backgroundColor: '#f8fafc',
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        paddingHorizontal: 8,
        paddingVertical: 12,
        minHeight: 64,
    },
    hintArrow: {
        fontSize: 16,
        fontWeight: '900',
    },
    hintText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#475569',
        writingDirection: 'rtl',
        textAlign: 'center',
    },
    hintAmount: {
        fontSize: 12,
        fontWeight: '800',
    },
});

/* ------------------------------------------------------------------ */
/*  ScoreScreen, end-game summary with grades                         */
/* ------------------------------------------------------------------ */

function ScoreScreen({
    score,
    config,
    spentNeeds,
    spentWants,
    saved,
    onReplay,
    onFinish,
}: {
    score: BudgetScore;
    config: typeof budgetGameConfig;
    spentNeeds: number;
    spentWants: number;
    saved: number;
    onReplay: () => void;
    onFinish: () => void;
}) {
    const gradeColor = GRADE_COLORS[score.grade] ?? SIM.textPrimary;

    return (
        <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1, justifyContent: 'center', gap: 10 }}>
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
            <View style={[simStyles.scoreCard, { borderColor: SIM.cardBorder }]}>
                <View style={simStyles.scoreCardInner}>
                    <Text style={[RTL, TYPE.cardTitle]}>
                        פירוט החודש שלך:
                    </Text>

                    <ScoreRow
                        label="צרכים (50%)"
                        lottieSource={LOTTIE_HOUSE}
                        actual={spentNeeds}
                        target={config.needsLimit}
                        score={score.needsScore}
                    />
                    <ScoreRow
                        label="רצונות (30%)"
                        lottieSource={LOTTIE_TARGET}
                        actual={spentWants}
                        target={config.wantsLimit}
                        score={score.wantsScore}
                    />
                    <ScoreRow
                        label="חיסכון (20%)"
                        lottieSource={LOTTIE_MONEY}
                        actual={saved}
                        target={config.savingsTarget}
                        score={score.savingsScore}
                        isSavings
                    />

                    <View style={simStyles.scoreDivider}>
                        <Text style={[RTL, simStyles.scoreTotalLabel]}>
                            ציון כולל
                        </Text>
                        <Text style={[simStyles.scoreTotalValue, { color: gradeColor }]}>
                            {score.overallScore}/100
                        </Text>
                    </View>
                </View>
            </View>

            {/* Actions */}
            <View style={simStyles.actionsRow}>
                <AnimatedPressable onPress={onReplay} style={simStyles.replayBtn} accessibilityRole="button" accessibilityLabel="שחק שוב">
                    <View><LottieIcon source={LOTTIE_REPLAY} size={18} /></View>
                    <Text style={[RTL, simStyles.replayText]}>שחק שוב</Text>
                </AnimatedPressable>

                <AnimatedPressable onPress={onFinish} style={simStyles.continueBtn} accessibilityRole="button" accessibilityLabel="המשך">
                    <Text style={[RTL, simStyles.continueText]}>המשך</Text>
                    <View style={{ position: 'absolute', left: 16 }}>
                        <LottieIcon source={LOTTIE_ARROW} size={20} />
                    </View>
                </AnimatedPressable>
            </View>
        </Animated.View>
    );
}

/* ------------------------------------------------------------------ */
/*  ScoreRow, single row in the score breakdown                       */
/* ------------------------------------------------------------------ */

function ScoreRow({
    label,
    lottieSource,
    actual,
    target,
    score: _score,
    isSavings = false,
}: {
    label: string;
    lottieSource: ReturnType<typeof require>;
    actual: number;
    target: number;
    score: number;
    isSavings?: boolean;
}) {
    const isGood = isSavings ? actual >= target : actual <= target;

    return (
        <View style={simStyles.scoreRow}>
            <View style={simStyles.scoreRowLeft}>
                <LottieIcon source={lottieSource} size={24} />
                <Text style={[RTL, simStyles.scoreRowLabel]}>
                    {label}
                </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[simStyles.scoreRowValue, { color: isGood ? SIM.success : SIM.warning }]}>
                    {'\u20AA'}{actual.toLocaleString()} / {'\u20AA'}{target.toLocaleString()}
                </Text>
                <LottieIcon source={isGood ? LOTTIE_CHECK : LOTTIE_CROSS} size={20} />
            </View>
        </View>
    );
}

/* ------------------------------------------------------------------ */
/*  BudgetGameScreen, main exported component                         */
/* ------------------------------------------------------------------ */

export function BudgetGameScreen({ onComplete }: { onComplete: () => void }) {
    const {
        state,
        balance,
        currentDilemma,
        needsPercent,
        wantsPercent,
        savingsPercent,
        isNeedsOver,
        isWantsOver,
        handleChoice,
        score,
        resetGame,
    } = useBudgetGame(budgetGameConfig);

    
    useEffect(() => {
        const player = createAudioPlayer({ uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/audio/sims/sim-budget-game.mp3' });
        player.play();
        return () => {
            player.pause();
            player.remove();
        };
    }, []);
const [rewardsGranted, setRewardsGranted] = useState(false);

    // Grant XP + coins when game completes
    useEffect(() => {
        if (state.isComplete && !rewardsGranted) {
            setRewardsGranted(true);
            successHaptic();
        }
    }, [state.isComplete, rewardsGranted]);

    const handleReplay = useCallback(() => {
        resetGame();
        setRewardsGranted(false);
    }, [resetGame]);

    return (
        <SimLottieBackground
            lottieSources={[
                require('../../../../assets/lottie/wired-flat-146-trolley-hover-jump.json'),
                require('../../../../assets/lottie/wired-flat-291-coin-dollar-hover-pinch.json'),
            ]}
            chapterColors={CH.gradient}
        >
        <View style={{ flex: 1 }}>
            {/* ── Title ── */}
            <Animated.View entering={FadeInDown.delay(100).springify()}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                    <LottieIcon source={LOTTIE_CHART} size={28} />
                    <Text style={[RTL, TYPE.title, { marginBottom: 2 }]} accessibilityRole="header">
                        שר התקציב
                    </Text>
                </View>
            </Animated.View>

            {/* ── Balance + Buckets (visible during gameplay) ── */}
            {!state.isComplete && (
                <Animated.View entering={FadeInDown.delay(200).springify()}>
                    <BalanceHeader balance={balance} salary={budgetGameConfig.salary} />

                    <BucketBar
                        label="צרכים (50%)"
                        lottieSource={LOTTIE_HOUSE}
                        percent={needsPercent}
                        spent={state.spentNeeds}
                        limit={budgetGameConfig.needsLimit}
                        isOver={isNeedsOver}
                        color="#34d399"
                    />
                    <BucketBar
                        label="רצונות (30%)"
                        lottieSource={LOTTIE_CART}
                        percent={wantsPercent}
                        spent={state.spentWants}
                        limit={budgetGameConfig.wantsLimit}
                        isOver={isWantsOver}
                        color="#38bdf8"
                    />
                    <BucketBar
                        label="חיסכון (20%)"
                        lottieSource={LOTTIE_MONEY}
                        percent={savingsPercent}
                        spent={state.saved}
                        limit={budgetGameConfig.savingsTarget}
                        isOver={false}
                        color="#22c55e"
                    />
                </Animated.View>
            )}

            {/* ── Dilemma Cards (gameplay) ── */}
            {!state.isComplete && currentDilemma && (
                <BudgetSwipeCard
                    key={currentDilemma.id}
                    emoji={currentDilemma.emoji}
                    question={currentDilemma.question}
                    options={currentDilemma.options}
                    onChoice={handleChoice}
                />
            )}

            {/* ── Score Screen (game over) ── */}
            {state.isComplete && score && (
                <ScoreScreen
                    score={score}
                    config={budgetGameConfig}
                    spentNeeds={state.spentNeeds}
                    spentWants={state.spentWants}
                    saved={state.saved}
                    onReplay={handleReplay}
                    onFinish={onComplete}
                />
            )}
        </View>
        </SimLottieBackground>
    );
}
