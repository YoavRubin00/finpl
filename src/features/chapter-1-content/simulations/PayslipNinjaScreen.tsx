import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    withSequence,
    cancelAnimation,
    FadeIn,
    FadeInDown,
    FadeInUp,
    FadeOut,
} from 'react-native-reanimated';
import { Pause, Play } from 'lucide-react-native';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { SimFeedbackBar } from '../../../components/ui/SimFeedbackBar';
import { LottieIcon } from '../../../components/ui/LottieIcon';
import { SimLottieBackground } from '../../../components/ui/SimLottieBackground';
import { successHaptic, errorHaptic } from '../../../utils/haptics';
import { usePayslipNinja } from './usePayslipNinja';
import { payslipNinjaConfig } from './payslipNinjaData';
import type { PayslipCategory, PayslipNinjaScore } from './payslipNinjaTypes';
import { getChapterTheme } from '../../../constants/theme';
import { GlowCard } from '../../../components/ui/GlowCard';
import { SIM, GRADE_COLORS, GRADE_HEBREW, SHADOW_STRONG, SHADOW_LIGHT, RTL, TYPE, simStyles } from './simTheme';
import { useSimReward } from '../../../hooks/useSimReward';
import { useTimeoutCleanup } from '../../../hooks/useTimeoutCleanup';

const SIM_COMPLETE_XP = 25;
const SIM_COMPLETE_COINS = 30;

/* ── Chapter 1 theme — only used for gradient ── */
const _th1 = getChapterTheme('chapter-1');

/* ── Lottie assets ── */
const LOTTIE_NINJA = require('../../../../assets/lottie/wired-flat-56-document-hover-swipe.json');
const LOTTIE_FIRE = require('../../../../assets/lottie/wired-flat-2804-fire-flame-hover-pinch.json');
const LOTTIE_CHART = require('../../../../assets/lottie/wired-flat-153-bar-chart-hover-pinch.json');
const LOTTIE_CHECK = require('../../../../assets/lottie/wired-flat-24-approved-checked-hover-pinch.json');
const LOTTIE_CROSS = require('../../../../assets/lottie/wired-flat-25-error-cross-hover-pinch.json');
const LOTTIE_REPLAY = require('../../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json');
const LOTTIE_ARROW = require('../../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');


const BIN_CONFIG: {
    category: PayslipCategory;
    label: string;
    emoji: string;
    color: string;
    bgColor: string;
    borderColor: string;
}[] = [
    { category: 'tax', label: 'מיסים', emoji: '🔴', color: '#ffffff', bgColor: '#f97316', borderColor: '#c2410c' },
    { category: 'pension', label: 'חיסכון', emoji: '🟢', color: '#ffffff', bgColor: '#22c55e', borderColor: '#15803d' },
    { category: 'net', label: 'נטו', emoji: '🔵', color: '#ffffff', bgColor: '#3b82f6', borderColor: '#1d4ed8' },
];

/* ------------------------------------------------------------------ */
/*  TimerBar — counts down per item                                    */
/* ------------------------------------------------------------------ */

function TimerBar({ duration, round, paused }: { duration: number; round: number; paused: boolean }) {
    const progress = useSharedValue(100);
    const remainingRef = useRef(duration);

    useEffect(() => {
        progress.value = 100;
        remainingRef.current = duration;
        progress.value = withTiming(0, { duration });
    }, [round, duration]);

    useEffect(() => {
        if (paused) {
            // Snapshot remaining ratio and freeze
            remainingRef.current = (progress.value / 100) * duration;
            cancelAnimation(progress);
        } else {
            // Resume from current position
            progress.value = withTiming(0, { duration: remainingRef.current });
        }
    }, [paused]);

    const barStyle = useAnimatedStyle(() => ({
        width: `${progress.value}%` as unknown as number,
    }));

    const colorStyle = useAnimatedStyle(() => ({
        backgroundColor: progress.value > 50 ? '#22c55e' : progress.value > 25 ? '#f59e0b' : '#f97316',
    }));

    return (
        <View
            style={styles.timerTrack}
            accessibilityRole="progressbar"
            accessibilityLabel="זמן שנותר לסיווג הפריט"
            accessibilityValue={{ min: 0, max: 100, now: 100 }}
        >
            <Animated.View style={[styles.timerFill, barStyle, colorStyle]} />
        </View>
    );
}

/* ------------------------------------------------------------------ */
/*  ItemCard — the payslip item to classify                            */
/* ------------------------------------------------------------------ */

function ItemCard({
    emoji,
    label,
    amount,
    round,
}: {
    emoji: string;
    label: string;
    amount: number;
    round: number;
}) {
    return (
        <Animated.View
            key={`item-${round}`}
            entering={FadeInUp.springify().damping(22)}
            exiting={FadeOut.duration(200)}
            style={styles.itemCardWrapper}
        >
            <View style={{ backgroundColor: SIM.cardBg, borderRadius: 20, borderWidth: 1.5, borderColor: SIM.cardBorder, shadowColor: SIM.glow, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 }}>
                <View style={styles.itemCardInner}>
                    <Text style={styles.itemEmoji}>{emoji}</Text>
                    <Text style={[RTL, styles.itemLabel]}>{label}</Text>
                    <Text style={styles.itemAmount}>₪{amount.toLocaleString()}</Text>
                </View>
            </View>
        </Animated.View>
    );
}

/* ------------------------------------------------------------------ */
/*  FeedbackFlash — brief green/red overlay after classification       */
/* ------------------------------------------------------------------ */

function FeedbackFlash({ isCorrect }: { isCorrect: boolean }) {
    return (
        <Animated.View
            entering={FadeIn.duration(100)}
            exiting={FadeOut.duration(300)}
            style={[
                styles.flashOverlay,
                { backgroundColor: isCorrect ? 'rgba(34,197,94,0.15)' : 'rgba(251,191,36,0.15)' },
            ]}
        />
    );
}

/* ------------------------------------------------------------------ */
/*  ClassificationBin — a tappable bin at the bottom                   */
/* ------------------------------------------------------------------ */

function ClassificationBin({
    label,
    emoji,
    color,
    bgColor,
    borderColor,
    onPress,
    disabled,
    isHighlighted,
    highlightType,
}: {
    label: string;
    emoji: string;
    color: string;
    bgColor: string;
    borderColor: string;
    onPress: () => void;
    disabled: boolean;
    isHighlighted: boolean;
    highlightType: 'correct' | 'wrong' | null;
}) {
    const shakeX = useSharedValue(0);

    useEffect(() => {
        if (isHighlighted && highlightType === 'wrong') {
            shakeX.value = withSequence(
                withTiming(-1, { duration: 50 }),
                withTiming(1, { duration: 50 }),
                withTiming(-1, { duration: 50 }),
                withTiming(1, { duration: 50 }),
                withTiming(0, { duration: 50 }),
            );
        }
        if (isHighlighted && highlightType === 'correct') {
            shakeX.value = withSpring(0, { damping: 22, stiffness: 300 });
        }
    }, [isHighlighted, highlightType, shakeX]);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: shakeX.value }],
    }));

    const activeBorder = isHighlighted
        ? highlightType === 'correct'
            ? SIM.success
            : SIM.danger
        : borderColor;

    const activeBg = isHighlighted
        ? highlightType === 'correct'
            ? 'rgba(34,197,94,0.25)'
            : 'rgba(251,191,36,0.25)'
        : bgColor;

    return (
        <Animated.View style={[{ flex: 1 }, animStyle]}>
            <AnimatedPressable
                onPress={onPress}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={`${label} — סווג לקטגוריה ${label}`}
                accessibilityHint="לחץ כדי לסווג את הפריט הנוכחי לקטגוריה זו"
                accessibilityState={{ disabled }}
                style={[
                    styles.binButton,
                    {
                        backgroundColor: activeBg,
                        borderColor: activeBorder,
                    },
                ]}
            >
                <Text style={styles.binEmoji}>{emoji}</Text>
                <Text style={[RTL, { fontSize: 16, fontWeight: '800', color }]}>{label}</Text>
            </AnimatedPressable>
        </Animated.View>
    );
}

/* ------------------------------------------------------------------ */
/*  ScoreScreen — end-game summary with grades                         */
/* ------------------------------------------------------------------ */

function ScoreScreen({
    score,
    correctCount,
    wrongCount,
    totalRounds,
    finalScore,
    onReplay,
    onFinish,
}: {
    score: PayslipNinjaScore;
    correctCount: number;
    wrongCount: number;
    totalRounds: number;
    finalScore: number;
    onReplay: () => void;
    onFinish: () => void;
}) {
    const gradeColor = GRADE_COLORS[score.grade] ?? '#ffffff';

    return (
        <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1, justifyContent: 'center', gap: 16 }}>
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
                    <Text style={[RTL, TYPE.cardTitle, { marginBottom: 2 }]}>
                        סיכום הסיווג שלך:
                    </Text>

                    <View style={simStyles.scoreRow}>
                        <View style={simStyles.scoreRowLeft}>
                            <LottieIcon source={LOTTIE_CHART} size={24} />
                            <Text style={[RTL, simStyles.scoreRowLabel]}>דיוק</Text>
                        </View>
                        <Text style={[simStyles.scoreRowValue, { color: gradeColor }]}>
                            {score.accuracy}%
                        </Text>
                    </View>

                    <View style={simStyles.scoreRow}>
                        <View style={simStyles.scoreRowLeft}>
                            <LottieIcon source={LOTTIE_CHECK} size={24} />
                            <Text style={[RTL, simStyles.scoreRowLabel]}>נכונים</Text>
                        </View>
                        <Text style={[simStyles.scoreRowValue, { color: SIM.primary }]}>
                            {correctCount} / {totalRounds}
                        </Text>
                    </View>

                    <View style={simStyles.scoreRow}>
                        <View style={simStyles.scoreRowLeft}>
                            <LottieIcon source={LOTTIE_CROSS} size={24} />
                            <Text style={[RTL, simStyles.scoreRowLabel]}>שגויים</Text>
                        </View>
                        <Text style={[simStyles.scoreRowValue, { color: '#fbbf24' }]}>
                            {wrongCount}
                        </Text>
                    </View>

                    <View style={simStyles.scoreDivider}>
                        <Text style={[RTL, simStyles.scoreTotalLabel]}>
                            ניקוד סופי
                        </Text>
                        <Text style={[simStyles.scoreTotalValue, { color: gradeColor }]}>
                            {finalScore}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Actions */}
            <View style={simStyles.actionsRow}>
                <AnimatedPressable onPress={onReplay} style={simStyles.replayBtn} accessibilityRole="button" accessibilityLabel="שחק שוב">
                    <View><LottieIcon source={LOTTIE_REPLAY} size={22} /></View>
                    <Text style={[RTL, simStyles.replayText]}>שחק שוב</Text>
                </AnimatedPressable>

                <AnimatedPressable onPress={onFinish} style={simStyles.continueBtn} accessibilityRole="button" accessibilityLabel="המשך">
                    <Text style={[RTL, simStyles.continueText]}>המשך</Text>
                    <View style={{ position: 'absolute', start: 16 }} accessible={false}>
                        <LottieIcon source={LOTTIE_ARROW} size={22} />
                    </View>
                </AnimatedPressable>
            </View>
        </Animated.View>
    );
}

/* ------------------------------------------------------------------ */
/*  PayslipNinjaScreen — main exported component                       */
/* ------------------------------------------------------------------ */

export function PayslipNinjaScreen({ onComplete }: { onComplete: () => void }) {
    const {
        state,
        currentItem,
        classifyItem,
        handleTimeout,
        score,
        resetGame,
    } = usePayslipNinja(payslipNinjaConfig);
    const safeTimeout = useTimeoutCleanup();

  useSimReward(state.isComplete, SIM_COMPLETE_XP, SIM_COMPLETE_COINS);
    const [feedback, setFeedback] = useState<{ isCorrect: boolean; message: string } | null>(null);
    const [highlightedBin, setHighlightedBin] = useState<{
        category: PayslipCategory;
        type: 'correct' | 'wrong';
    } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pauseStartRef = useRef<number>(0);
    const remainingMsRef = useRef<number>(payslipNinjaConfig.timePerRound);
    const [rewardsGranted, setRewardsGranted] = useState(false);

    // Grant XP + coins when game completes
    useEffect(() => {
        if (state.isComplete && !rewardsGranted) {
            setRewardsGranted(true);
            successHaptic();
        }
    }, [state.isComplete, rewardsGranted]);

    // Timer per item — with pause support (WCAG 2.2.1)
    useEffect(() => {
        if (state.isComplete || isProcessing || isPaused) return;

        const startTime = Date.now();
        const ms = remainingMsRef.current;

        timerRef.current = setTimeout(() => {
            handleTimeout();
            errorHaptic();
            setFeedback({ isCorrect: false, message: 'נגמר הזמן!' });
            safeTimeout(() => setFeedback(null), 400);
        }, ms);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            // Track how much time was actually used
            remainingMsRef.current = Math.max(0, ms - (Date.now() - startTime));
        };
    }, [state.currentRound, state.isComplete, isProcessing, isPaused, handleTimeout]);

    // Reset remaining time on new round
    useEffect(() => {
        remainingMsRef.current = payslipNinjaConfig.timePerRound;
    }, [state.currentRound]);

    const handleBinPress = useCallback(
        (chosenCategory: PayslipCategory) => {
            if (isProcessing || state.isComplete || !currentItem) return;
            setIsProcessing(true);

            // Clear the countdown timer
            if (timerRef.current) clearTimeout(timerRef.current);

            const isCorrect = currentItem.category === chosenCategory;

            if (isCorrect) {
                successHaptic();
            } else {
                errorHaptic();
            }

            const correctBin = BIN_CONFIG.find(b => b.category === currentItem.category);
            setFeedback({
                isCorrect,
                message: isCorrect
                    ? `נכון! ${currentItem.label} שייך ל${correctBin?.label ?? ''}`
                    : `לא נכון — ${currentItem.label} שייך ל${correctBin?.label ?? ''}`,
            });
            setHighlightedBin({ category: chosenCategory, type: isCorrect ? 'correct' : 'wrong' });

            classifyItem(chosenCategory);

            // Clear feedback and advance
            setTimeout(() => {
                setFeedback(null);
                setHighlightedBin(null);
                setIsProcessing(false);
            }, 600);
        },
        [isProcessing, state.isComplete, currentItem, classifyItem],
    );

    const handleReplay = useCallback(() => {
        resetGame();
        setFeedback(null);
        setHighlightedBin(null);
        setIsProcessing(false);
        setIsPaused(false);
        setRewardsGranted(false);
    }, [resetGame]);

    return (
        <SimLottieBackground
            lottieSources={[
                require('../../../../assets/lottie/wired-flat-56-document-hover-swipe.json'),
                require('../../../../assets/lottie/wired-flat-24-approved-checked-hover-pinch.json'),
            ]}
            chapterColors={_th1.gradient}
        >
            <View style={{ flex: 1, padding: 16 }}>
                {/* Feedback bar overlay */}
                {feedback && (
                    <SimFeedbackBar
                        isCorrect={feedback.isCorrect}
                        message={feedback.message}
                        accentColor={_th1.primary}
                    />
                )}

                {/* ── Title ── */}
                <Animated.View entering={FadeInDown.delay(100)}>
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <LottieIcon source={LOTTIE_NINJA} size={26} />
                        <Text style={[RTL, TYPE.title]} accessibilityRole="header">נינג׳ה תלוש</Text>
                    </View>
                    <Text style={[RTL, TYPE.subtitle, { marginBottom: 8 }]}>
                        סווג כל פריט: מיסים, חיסכון, או נטו
                    </Text>
                </Animated.View>

                {/* ── Gameplay phase ── */}
                {!state.isComplete && currentItem && (
                    <>
                        {/* Score + Streak header */}
                        <Animated.View entering={FadeIn.delay(200)} style={styles.statsRow}>
                            <View style={styles.statBadge}>
                                <Text style={[TYPE.gradientValue, { fontSize: 18 }]}>{state.score}</Text>
                                <Text style={TYPE.gradientLabel}>ניקוד</Text>
                            </View>
                            {state.streak > 0 && (
                                <Animated.View entering={FadeIn.duration(200)} style={styles.streakBadge}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                        <LottieIcon source={LOTTIE_FIRE} size={16} />
                                        <Text style={styles.streakValue}>{state.streak}</Text>
                                    </View>
                                    <Text style={TYPE.gradientLabel}>רצף</Text>
                                </Animated.View>
                            )}
                            <View style={styles.statBadge}>
                                <Text style={[TYPE.gradientValue, { fontSize: 18 }]}>
                                    {state.currentRound + 1}/{payslipNinjaConfig.totalRounds}
                                </Text>
                                <Text style={TYPE.gradientLabel}>פריט</Text>
                            </View>
                        </Animated.View>

                        {/* Timer bar + pause button (WCAG 2.2.1 — Level A) */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={{ flex: 1 }}>
                                <TimerBar duration={payslipNinjaConfig.timePerRound} round={state.currentRound} paused={isPaused} />
                            </View>
                            <AnimatedPressable
                                onPress={() => setIsPaused(p => !p)}
                                style={styles.pauseBtn}
                                accessibilityRole="button"
                                accessibilityLabel={isPaused ? 'המשך טיימר' : 'השהה טיימר'}
                                accessibilityHint={isPaused ? 'לחץ כדי להמשיך את הספירה' : 'לחץ כדי להשהות את הספירה'}
                            >
                                {isPaused ? <Play size={16} color="#3b82f6" /> : <Pause size={16} color="#64748b" />}
                            </AnimatedPressable>
                        </View>
                        {isPaused && (
                            <Text style={[RTL, { fontSize: 13, fontWeight: '700', color: '#3b82f6', textAlign: 'center', marginTop: 4 }]}>
                                ⏸ המשחק מושהה — לחץ ▶ כדי להמשיך
                            </Text>
                        )}

                        {/* Item card */}
                        <GlowCard chapterGlow={SIM.glow} style={{ backgroundColor: 'transparent', padding: 8 }} pressable={false}>
                            <ItemCard
                                emoji={currentItem.emoji}
                                label={currentItem.label}
                                amount={currentItem.amount}
                                round={state.currentRound}
                            />
                        </GlowCard>

                        {/* Classification bins */}
                        <View style={styles.binsRow}>
                            {BIN_CONFIG.map((bin) => (
                                <ClassificationBin
                                    key={bin.category}
                                    label={bin.label}
                                    emoji={bin.emoji}
                                    color={bin.color}
                                    bgColor={bin.bgColor}
                                    borderColor={bin.borderColor}
                                    onPress={() => handleBinPress(bin.category)}
                                    disabled={isProcessing}
                                    isHighlighted={highlightedBin?.category === bin.category}
                                    highlightType={
                                        highlightedBin?.category === bin.category
                                            ? highlightedBin.type
                                            : null
                                    }
                                />
                            ))}
                        </View>
                    </>
                )}

                {/* ── Score screen ── */}
                {state.isComplete && score && (
                    <ScoreScreen
                        score={score}
                        correctCount={state.correctCount}
                        wrongCount={state.wrongCount}
                        totalRounds={payslipNinjaConfig.totalRounds}
                        finalScore={state.score}
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
    container: {
        flex: 1,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    statBadge: {
        alignItems: 'center',
        backgroundColor: SIM.trackBg,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: SIM.trackBorder,
    },
    streakBadge: {
        alignItems: 'center',
        backgroundColor: 'rgba(245,158,11,0.1)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: 'rgba(245,158,11,0.25)',
    },
    streakValue: {
        fontSize: 18,
        fontWeight: '800',
        color: '#f59e0b',
    },
    timerTrack: {
        height: 6,
        backgroundColor: SIM.trackBg,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 10,
    },
    timerFill: {
        height: '100%',
        borderRadius: 3,
    },
    pauseBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    itemArea: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
    },
    itemCardWrapper: {
        width: '100%',
        maxWidth: 300,
        alignSelf: 'center',
    },
    itemCardInner: {
        padding: 18,
        alignItems: 'center',
        gap: 6,
    },
    itemEmoji: {
        fontSize: 28,
    },
    itemLabel: {
        fontSize: 17,
        fontWeight: '800',
        color: SIM.textPrimary,
        textAlign: 'center',
    },
    itemAmount: {
        fontSize: 16,
        fontWeight: '900',
        color: SIM.primary,
        marginTop: 4,
    },
    binsRow: {
        flexDirection: 'row',
        gap: 10,
        paddingBottom: 10,
        flexShrink: 0,
    },
    binButton: {
        borderRadius: 16,
        borderWidth: 2,
        paddingVertical: 18,
        alignItems: 'center',
        gap: 6,
    },
    binEmoji: {
        fontSize: 26,
    },
    flashOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 10,
        borderRadius: 16,
        pointerEvents: 'none' as const,
    },
});
