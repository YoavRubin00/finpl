import { createAudioPlayer } from 'expo-audio';
import { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    FadeIn,
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { SimFeedbackBar } from '../../../components/ui/SimFeedbackBar';
import { SimLottieBackground } from '../../../components/ui/SimLottieBackground';
import { LottieIcon } from '../../../components/ui/LottieIcon';
import { successHaptic, errorHaptic } from '../../../utils/haptics';
import { useCarLoanGame } from './useCarLoanGame';
import { carLoanConfig } from './carLoanData';
import type { CarLoanScore, CarLoanGrade, CarLoanOption } from './carLoanTypes';
import { getChapterTheme } from '../../../constants/theme';
import { GlowCard } from '../../../components/ui/GlowCard';
import { SIM, GRADE_COLORS, GRADE_HEBREW, RTL, TYPE, simStyles } from './simTheme';


/* ── Chapter 1 theme (only for gradient) ── */
const _th1 = getChapterTheme('chapter-1');

/* ── Lottie assets ── */
const LOTTIE_ROCKET = require('../../../../assets/lottie/wired-flat-489-rocket-space-hover-flying.json');
const LOTTIE_MONEY = require('../../../../assets/lottie/wired-flat-413-money-bag-hover-shake.json');
const LOTTIE_GROWTH = require('../../../../assets/lottie/wired-flat-161-growth-hover-pinch.json');
const LOTTIE_CARD = require('../../../../assets/lottie/wired-flat-734-id-business-card-1-hover-pinch.json');
const LOTTIE_BULB = require('../../../../assets/lottie/wired-flat-36-bulb-hover-blink.json');
const LOTTIE_REPLAY = require('../../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json');
const LOTTIE_ARROW = require('../../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');
const LOTTIE_CLOCK = require('../../../../assets/lottie/wired-flat-45-clock-time-hover-pinch.json');
const LOTTIE_DECREASE = require('../../../../assets/lottie/wired-flat-162-decrease-hover-pinch.json');

/* ------------------------------------------------------------------ */
/*  SpeedBar, shows car speed (inversely proportional to interest)     */
/* ------------------------------------------------------------------ */

function SpeedBar({ speed }: { speed: number }) {
    const animWidth = useSharedValue(speed);

    useEffect(() => {
        animWidth.value = withSpring(speed, { damping: 20, stiffness: 120 });
    }, [speed, animWidth]);

    const barStyle = useAnimatedStyle(() => ({
        width: `${animWidth.value}%` as unknown as number,
    }));

    const color = speed > 60 ? '#22c55e' : speed > 30 ? '#f59e0b' : '#f97316';

    return (
        <View style={styles.speedTrack}>
            <Animated.View style={[styles.speedFill, barStyle, { backgroundColor: color }]} />
        </View>
    );
}

/* ------------------------------------------------------------------ */
/*  CarVisual, emoji car that shifts based on speed/debt               */
/* ------------------------------------------------------------------ */

function CarVisual({ speed, isRepossessed }: { speed: number; isRepossessed: boolean }) {
    const translateY = useSharedValue(0);
    const shadowOpacity = useSharedValue(0.3);

    useEffect(() => {
        // Car sinks lower as speed decreases (more debt)
        const sinkAmount = ((100 - speed) / 100) * 20;
        translateY.value = withSpring(sinkAmount, { damping: 22 });
        shadowOpacity.value = withTiming(0.3 + ((100 - speed) / 100) * 0.5, { duration: 500 });
    }, [speed, translateY, shadowOpacity]);

    const carStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    const shadowStyle = useAnimatedStyle(() => ({
        opacity: shadowOpacity.value,
        transform: [{ scaleX: 1 + ((100 - speed) / 100) * 0.5 }],
    }));

    if (isRepossessed) {
        return (
            <Animated.View entering={FadeIn.duration(400)} style={styles.carContainer}>
                <View accessible={false}><LottieIcon source={LOTTIE_DECREASE} size={48} /></View>
                <Text style={[RTL, styles.repossessedText]} accessibilityLiveRegion="polite">הבנק גרר את הרכב!</Text>
            </Animated.View>
        );
    }

    return (
        <View style={styles.carContainer}>
            {/* Road */}
            <View style={styles.road}>
                <View style={styles.roadLine} />
            </View>
            {/* Shadow under car */}
            <Animated.View style={[styles.carShadow, shadowStyle]} />
            {/* Car */}
            <Animated.View style={[styles.carWrapper, carStyle]}>
                <View accessible={false}><LottieIcon source={LOTTIE_ROCKET} size={48} /></View>
            </Animated.View>
            <Text style={[TYPE.gradientLabel, { marginTop: 4 }]} accessibilityLiveRegion="polite">מהירות: {speed}%</Text>
        </View>
    );
}

/* ------------------------------------------------------------------ */
/*  StatsBar, bottom stats showing loan/interest/value/month           */
/* ------------------------------------------------------------------ */

function StatsBar({
    remainingLoan,
    totalInterestPaid,
    carCurrentValue,
    month,
    totalMonths,
}: {
    remainingLoan: number;
    totalInterestPaid: number;
    carCurrentValue: number;
    month: number;
    totalMonths: number;
}) {
    return (
        <View style={styles.statsContainer}>
            <View style={styles.statItem}>
                <View accessible={false}><LottieIcon source={LOTTIE_MONEY} size={22} /></View>
                <Text style={styles.statValue} accessibilityLiveRegion="polite">{'\u20AA'}{remainingLoan.toLocaleString()}</Text>
                <Text style={styles.statLabel}>יתרת הלוואה</Text>
            </View>
            <View style={styles.statItem}>
                <View accessible={false}><LottieIcon source={LOTTIE_GROWTH} size={22} /></View>
                <Text style={[styles.statValue, { color: '#fbbf24' }]} accessibilityLiveRegion="polite">{'\u20AA'}{totalInterestPaid.toLocaleString()}</Text>
                <Text style={styles.statLabel}>ריבית</Text>
            </View>
            <View style={styles.statItem}>
                <View accessible={false}><LottieIcon source={LOTTIE_ROCKET} size={22} /></View>
                <Text style={styles.statValue} accessibilityLiveRegion="polite">{'\u20AA'}{carCurrentValue.toLocaleString()}</Text>
                <Text style={styles.statLabel}>ערך הרכב</Text>
            </View>
            <View style={styles.statItem}>
                <View accessible={false}><LottieIcon source={LOTTIE_CLOCK} size={22} /></View>
                <Text style={styles.statValue} accessibilityLiveRegion="polite">{month}/{totalMonths}</Text>
                <Text style={styles.statLabel}>חודש</Text>
            </View>
        </View>
    );
}

/* ------------------------------------------------------------------ */
/*  ScoreScreen, end-game summary                                      */
/* ------------------------------------------------------------------ */

function ScoreScreen({
    score,
    onReplay,
    onFinish,
}: {
    score: CarLoanScore;
    onReplay: () => void;
    onFinish: () => void;
}) {
    const gradeColor = GRADE_COLORS[score.grade] ?? '#ffffff';

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
                        סיכום המירוץ שלך:
                    </Text>

                    <View style={simStyles.scoreRow}>
                        <View style={simStyles.scoreRowLeft}>
                            <LottieIcon source={LOTTIE_CARD} size={24} />
                            <Text style={[RTL, simStyles.scoreRowLabel]}>
                                סה״כ שולם
                            </Text>
                        </View>
                        <Text style={[simStyles.scoreRowValue, { color: SIM.textPrimary }]}>
                            {'\u20AA'}{score.totalPaid.toLocaleString()}
                        </Text>
                    </View>

                    <View style={simStyles.scoreRow}>
                        <View style={simStyles.scoreRowLeft}>
                            <LottieIcon source={LOTTIE_GROWTH} size={24} />
                            <Text style={[RTL, simStyles.scoreRowLabel]}>
                                מתוכם ריבית
                            </Text>
                        </View>
                        <Text style={[simStyles.scoreRowValue, { color: SIM.warning }]}>
                            {'\u20AA'}{score.interestPortion.toLocaleString()}
                        </Text>
                    </View>

                    <View style={simStyles.scoreRow}>
                        <View style={simStyles.scoreRowLeft}>
                            <LottieIcon source={LOTTIE_ROCKET} size={24} />
                            <Text style={[RTL, simStyles.scoreRowLabel]}>
                                ערך סופי של הרכב
                            </Text>
                        </View>
                        <Text style={[simStyles.scoreRowValue, { color: SIM.success }]}>
                            {'\u20AA'}{score.carFinalValue.toLocaleString()}
                        </Text>
                    </View>

                    <View style={simStyles.insightRow}>
                        <LottieIcon source={LOTTIE_BULB} size={24} />
                        <Text style={[RTL, simStyles.insightText]}>
                            אל תיקח הלוואה על נכס שמאבד ערך
                        </Text>
                    </View>
                </View>
            </View>

        </ScrollView>

        {/* Sticky actions bar, always visible */}
        <View style={carLoanRaceStickyStyles.stickyActionsBar}>
            <AnimatedPressable onPress={onReplay} style={simStyles.replayBtn} accessibilityRole="button" accessibilityLabel="שחק שוב" accessibilityHint="מתחיל את הסימולציה מחדש">
                <View accessible={false}><LottieIcon source={LOTTIE_REPLAY} size={18} /></View>
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

const carLoanRaceStickyStyles = StyleSheet.create({
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

/* ------------------------------------------------------------------ */
/*  CarLoanRaceScreen, main exported component                         */
/* ------------------------------------------------------------------ */

export function CarLoanRaceScreen({ onComplete }: { onComplete: () => void }) {
    const {
        state,
        currentScenario,
        lastFeedback,
        handleChoice,
        score,
        resetGame,
    } = useCarLoanGame(carLoanConfig);

    
    useEffect(() => {
        const player = createAudioPlayer({ uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/audio/sims/sim-car-loan.mp3' });
        player.play();
        return () => {
            player.pause();
            player.remove();
        };
    }, []);
const [showFeedback, setShowFeedback] = useState(false);
    const [lastChoiceCorrect, setLastChoiceCorrect] = useState(false);
    const [rewardsGranted, setRewardsGranted] = useState(false);

    // Grant XP + coins when game completes
    useEffect(() => {
        if (state.isComplete && !rewardsGranted) {
            setRewardsGranted(true);
            if (state.isRepossessed) {
                errorHaptic();
            } else {
                successHaptic();
            }
        }
    }, [state.isComplete, rewardsGranted, state.isRepossessed]);

    const onOptionPress = useCallback(
        (option: CarLoanOption) => {
            if (state.isComplete) return;

            const isGood = option.interestEffect === 'decrease';
            if (isGood) {
                successHaptic();
            } else if (option.interestEffect === 'increase') {
                errorHaptic();
            }

            setLastChoiceCorrect(isGood);
            handleChoice(option);
            setShowFeedback(true);
        },
        [state.isComplete, handleChoice],
    );

    const dismissFeedback = useCallback(() => {
        setShowFeedback(false);
    }, []);

    const handleReplay = useCallback(() => {
        resetGame();
        setShowFeedback(false);
        setRewardsGranted(false);
    }, [resetGame]);

    return (
        <SimLottieBackground
            lottieSources={[
                require('../../../../assets/lottie/wired-flat-504-school-bus-hover-pinch.json'),
                require('../../../../assets/lottie/wired-flat-162-decrease-hover-pinch.json'),
            ]}
            chapterColors={_th1.gradient}
        >
            <View style={{ flex: 1, padding: 16 }}>
                {/* ── Title ── */}
                <Animated.View entering={FadeInDown.delay(100)}>
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                        <View accessible={false}><LottieIcon source={LOTTIE_ROCKET} size={28} /></View>
                        <Text style={[RTL, TYPE.title]} accessibilityRole="header">מירוץ מכוניות</Text>
                    </View>
                    <Text style={[RTL, TYPE.subtitle, { marginBottom: 12 }]}>
                        קבל החלטות חכמות, ככל שהריבית גדלה, הרכב מאט
                    </Text>
                </Animated.View>

                {/* ── Gameplay phase ── */}
                {!state.isComplete && currentScenario && (
                    <>
                        {/* Car visual + speed bar */}
                        <CarVisual speed={state.speed} isRepossessed={false} />
                        <SpeedBar speed={state.speed} />

                        {/* Feedback overlay */}
                        {showFeedback && lastFeedback ? (
                            <Animated.View entering={FadeIn.duration(200)} style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingVertical: 16 }}>
                                <SimFeedbackBar
                                    isCorrect={lastChoiceCorrect}
                                    message={lastFeedback}
                                    accentColor={_th1.primary}
                                />
                                <AnimatedPressable
                                    onPress={dismissFeedback}
                                    accessibilityRole="button"
                                    accessibilityLabel="המשך"
                                    accessibilityHint="ממשיך לתרחיש הבא"
                                    style={{
                                        borderRadius: 14,
                                        borderWidth: 1.5,
                                        borderColor: SIM.btnPrimaryBorder,
                                        backgroundColor: SIM.btnPrimary,
                                        paddingVertical: 12,
                                        paddingHorizontal: 40,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Text style={[RTL, { fontSize: 15, fontWeight: '700', color: '#fff' }]}>המשך</Text>
                                    <View style={{ position: 'absolute', left: 16 }}>
                                        <View accessible={false}><LottieIcon source={LOTTIE_ARROW} size={18} /></View>
                                    </View>
                                </AnimatedPressable>
                            </Animated.View>
                        ) : (
                            <>
                                {/* Scenario card */}
                                <View style={styles.scenarioArea}>
                                    <Animated.View
                                        key={`scenario-${state.month}`}
                                        entering={FadeInUp.springify().damping(22)}
                                    >
                                        <GlowCard chapterGlow={SIM.glow} style={{ backgroundColor: SIM.cardBg, padding: 0 }} pressable={false}>
                                            <View style={styles.scenarioInner}>
                                                <Text style={styles.scenarioEmoji}>{currentScenario.emoji}</Text>
                                                <Text style={[RTL, styles.scenarioDescription]}>
                                                    {currentScenario.description}
                                                </Text>
                                            </View>
                                        </GlowCard>
                                    </Animated.View>
                                </View>

                                {/* Option buttons */}
                                <View style={styles.optionsContainer}>
                                    {currentScenario.options.map((option) => {
                                        const optionColor =
                                            option.interestEffect === 'decrease'
                                                ? { bg: SIM.successLight, border: SIM.successBorder, text: SIM.success }
                                                : option.interestEffect === 'increase'
                                                  ? { bg: SIM.warningLight, border: SIM.warningBorder, text: SIM.warning }
                                                  : { bg: '#f0fdf4', border: '#a7f3d0', text: '#065f46' };

                                        return (
                                            <AnimatedPressable
                                                key={option.id}
                                                onPress={() => onOptionPress(option)}
                                                accessibilityRole="button"
                                                accessibilityLabel={option.label}
                                                accessibilityHint="בחר אפשרות זו"
                                                style={[
                                                    simStyles.optionBtn,
                                                    { backgroundColor: optionColor.bg, borderColor: optionColor.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
                                                ]}
                                            >
                                                <Text style={[RTL, { fontSize: 14, fontWeight: '700', color: optionColor.text }]}>
                                                    {option.label}
                                                </Text>
                                                <Text style={{ fontSize: 14, color: SIM.textSecondary, fontWeight: '500' }}>
                                                    {'\u20AA'}{option.monthlyPayment.toLocaleString()}/חודש
                                                </Text>
                                            </AnimatedPressable>
                                        );
                                    })}
                                </View>
                            </>
                        )}

                        {/* Stats bar */}
                        <StatsBar
                            remainingLoan={state.remainingLoan}
                            totalInterestPaid={state.totalInterestPaid}
                            carCurrentValue={state.carCurrentValue}
                            month={state.month}
                            totalMonths={carLoanConfig.months}
                        />
                    </>
                )}

                {/* ── Repossession ── */}
                {state.isComplete && state.isRepossessed && !score && (
                    <CarVisual speed={0} isRepossessed />
                )}

                {/* ── Score screen ── */}
                {state.isComplete && score && (
                    <ScoreScreen
                        score={score}
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
    /* Car visual */
    carContainer: {
        alignItems: 'center',
        marginBottom: 8,
        minHeight: 100,
        justifyContent: 'center',
    },
    road: {
        position: 'absolute',
        bottom: 20,
        left: 16,
        right: 16,
        height: 4,
        backgroundColor: '#d1d5db',
        borderRadius: 2,
    },
    roadLine: {
        position: 'absolute',
        top: 1,
        left: '20%' as unknown as number,
        right: '20%' as unknown as number,
        height: 2,
        backgroundColor: '#64748b',
        borderRadius: 1,
    },
    carWrapper: {
        zIndex: 1,
    },
    carEmoji: {
        fontSize: 48,
    },
    carShadow: {
        position: 'absolute',
        bottom: 16,
        width: 60,
        height: 10,
        backgroundColor: '#000',
        borderRadius: 30,
    },
    repossessedText: {
        fontSize: 16,
        fontWeight: '800',
        color: SIM.danger,
        marginTop: 8,
        textAlign: 'center',
    },
    /* Speed bar */
    speedTrack: {
        height: 6,
        backgroundColor: SIM.trackBg,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 12,
    },
    speedFill: {
        height: '100%',
        borderRadius: 3,
    },
    /* Scenario */
    scenarioArea: {
        paddingVertical: 12,
        justifyContent: 'center',
    },
    scenarioInner: {
        padding: 20,
        alignItems: 'center',
        gap: 10,
    },
    scenarioEmoji: {
        fontSize: 40,
    },
    scenarioDescription: {
        fontSize: 15,
        fontWeight: '700',
        color: SIM.textPrimary,
        textAlign: 'center',
        lineHeight: 24,
    },
    /* Options */
    optionsContainer: {
        gap: 8,
        marginBottom: 12,
    },
    /* Stats bar */
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: SIM.cardBg,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: SIM.cardBorder,
        paddingVertical: 10,
        paddingHorizontal: 4,
    },
    statItem: {
        alignItems: 'center',
        gap: 2,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '900',
        color: SIM.textPrimary,
    },
    statLabel: {
        fontSize: 13,
        color: SIM.textSecondary,
        fontWeight: '500',
    },
});
