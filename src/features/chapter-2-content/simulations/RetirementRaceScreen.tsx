import { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { FINN_STANDARD } from '../../retention-loops/finnMascotConfig';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    FadeIn,
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { SimLottieBackground } from '../../../components/ui/SimLottieBackground';
import { LottieIcon } from '../../../components/ui/LottieIcon';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { ConfettiExplosion } from '../../../components/ui/ConfettiExplosion';
import { successHaptic, heavyHaptic, tapHaptic } from '../../../utils/haptics';
import { useRetirementRace } from './useRetirementRace';
import type { RetirementRaceScore } from './retirementRaceTypes';
import { getChapterTheme } from '../../../constants/theme';
import { SIM2, SHADOW_STRONG, RTL, TYPE2, sim2Styles } from './simTheme';


const BAR_MAX_HEIGHT = 220;
const BAR_WIDTH = 80;

/* ── Chapter-2 theme — only _th2.gradient still needed ── */
const _th2 = getChapterTheme('chapter-2');

/* ── Lottie assets ── */
const LOTTIE_ROCKET = require('../../../../assets/lottie/wired-flat-489-rocket-space-hover-flying.json');
const LOTTIE_CLOCK = require('../../../../assets/lottie/wired-flat-45-clock-time-hover-pinch.json');
const LOTTIE_GROWTH = require('../../../../assets/lottie/wired-flat-161-growth-hover-pinch.json');
const LOTTIE_CROWN = require('../../../../assets/lottie/wired-flat-407-crown-king-lord-hover-roll.json');
const LOTTIE_BULB = require('../../../../assets/lottie/wired-flat-36-bulb-hover-blink.json');
const LOTTIE_PLAY = require('../../../../assets/lottie/wired-flat-29-play-pause-circle-hover-pinch.json');
const LOTTIE_TROPHY = require('../../../../assets/lottie/wired-flat-3263-trophy-circle-hover-roll.json');
const LOTTIE_REPLAY = require('../../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json');
const LOTTIE_BRIEFCASE = require('../../../../assets/lottie/wired-flat-1023-portfolio-hover-pinch.json');
const LOTTIE_TARGET = require('../../../../assets/lottie/wired-flat-458-goal-target-hover-hit.json');
const LOTTIE_ARROW = require('../../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');

/* ------------------------------------------------------------------ */
/*  RaceBar — animated vertical bar for a runner                        */
/* ------------------------------------------------------------------ */

function RaceBar({
    balance,
    maxBalance,
    color,
    name,
    lottieSource,
}: {
    balance: number;
    maxBalance: number;
    color: string;
    name: string;
    lottieSource: number;
}) {
    const barHeight = useSharedValue(0);

    useEffect(() => {
        const targetHeight = maxBalance > 0
            ? Math.max(4, (balance / maxBalance) * BAR_MAX_HEIGHT)
            : 4;
        barHeight.value = withSpring(targetHeight, { damping: 20, stiffness: 80 });
    }, [balance, maxBalance, barHeight]);

    const barStyle = useAnimatedStyle(() => ({
        height: barHeight.value,
    }));

    return (
        <View style={styles.raceBarCol}>
            {/* Lottie icon on top */}
            <View accessible={false}><LottieIcon source={lottieSource} size={28} /></View>

            {/* Balance readout */}
            <Text accessibilityLiveRegion="polite" style={[styles.raceBarBalance, { color }, SHADOW_STRONG]}>
                ₪{balance.toLocaleString('he-IL')}
            </Text>

            {/* Bar container (anchored at bottom) */}
            <View style={styles.raceBarTrack}>
                <Animated.View
                    style={[
                        styles.raceBarFill,
                        { backgroundColor: color },
                        barStyle,
                    ]}
                />
            </View>

            {/* Name */}
            <Text style={[RTL, TYPE2.gradientLabel]}>{name}</Text>
        </View>
    );
}

/* ------------------------------------------------------------------ */
/*  OvertakeOverlay — dramatic freeze-frame at the crossover             */
/* ------------------------------------------------------------------ */

function OvertakeOverlay({ onDismiss }: { onDismiss: () => void }) {
    return (
        <Animated.View entering={FadeIn.duration(300)} style={styles.overtakeWrap}>
            <View accessible={false}><LottieIcon source={LOTTIE_CROWN} size={64} /></View>
            <Text style={[RTL, styles.overtakeTitle]}>הזמן ניצח!</Text>
            <Text style={[RTL, styles.overtakeSubtitle]}>
                נטע עקפה את אורי — למרות שהפקידה פחות כסף כל חודש
            </Text>
            <AnimatedPressable onPress={onDismiss} style={[styles.overtakeContinueBtn, { justifyContent: 'center' }]} accessibilityRole="button" accessibilityLabel="המשך" accessibilityHint="סוגר את המסך וממשיך את המרוץ">
                <Text style={[RTL, styles.overtakeContinueBtnText]}>המשך</Text>
                <View style={{ position: 'absolute', left: 16 }}>
                    <LottieIcon source={LOTTIE_ARROW} size={22} />
                </View>
            </AnimatedPressable>
        </Animated.View>
    );
}

/* ------------------------------------------------------------------ */
/*  SpeedButton — playback speed selector                                */
/* ------------------------------------------------------------------ */

function SpeedButton({
    label,
    speed,
    currentSpeed,
    onPress,
}: {
    label: string;
    speed: number;
    currentSpeed: number;
    onPress: (speed: number) => void;
}) {
    const isActive = currentSpeed === speed;
    return (
        <AnimatedPressable
            onPress={() => {
                tapHaptic();
                onPress(speed);
            }}
            style={[styles.speedBtn, isActive && styles.speedBtnActive]}
            accessibilityRole="button"
            accessibilityLabel={`מהירות ${label}`}
            accessibilityHint="משנה את מהירות המרוץ"
            accessibilityState={{ selected: isActive }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
            <Text style={[styles.speedBtnText, isActive && styles.speedBtnTextActive]}>
                {label}
            </Text>
        </AnimatedPressable>
    );
}

/* ------------------------------------------------------------------ */
/*  YearSlider — scrub through years after race completes                */
/* ------------------------------------------------------------------ */

function YearSlider({
    currentYear,
    totalYears,
    onYearChange,
}: {
    currentYear: number;
    totalYears: number;
    onYearChange: (year: number) => void;
}) {
    const trackWidth = 280;

    return (
        <View style={styles.sliderWrap}>
            <Text style={styles.sliderLabel}>גרור לסרוק שנים</Text>
            <View style={styles.sliderTrack}>
                {Array.from({ length: totalYears + 1 }).map((_, i) => {
                    const isActive = i <= currentYear;
                    const isCurrent = i === currentYear;
                    return (
                        <AnimatedPressable
                            key={i}
                            onPress={() => {
                                tapHaptic();
                                onYearChange(i);
                            }}
                            style={[
                                styles.sliderTick,
                                isActive && styles.sliderTickActive,
                                isCurrent && styles.sliderTickCurrent,
                                { width: trackWidth / (totalYears + 1) },
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={`שנה ${i}`}
                            accessibilityHint="מציג את הנתונים לשנה זו"
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        />
                    );
                })}
            </View>
            <View style={styles.sliderLabels}>
                <Text style={styles.sliderYearText}>67</Text>
                <Text style={styles.sliderYearText}>22</Text>
            </View>
        </View>
    );
}

/* ------------------------------------------------------------------ */
/*  ScoreScreen — results after race completion                          */
/* ------------------------------------------------------------------ */

function ScoreScreen({
    score,
    config,
    onReplay,
    onFinish,
}: {
    score: RetirementRaceScore;
    config: { runners: { name: string; emoji: string; color: string; monthlyDeposit: number }[] };
    onReplay: () => void;
    onFinish: () => void;
}) {
    const runnerLotties = [LOTTIE_CLOCK, LOTTIE_ROCKET];

    return (
      <View style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 16, paddingBottom: 120 }}>
            {/* Title */}
            <Animated.View entering={FadeInDown.delay(100)} style={{ alignItems: 'center', gap: 4 }}>
                <View accessible={false}><LottieIcon source={LOTTIE_TROPHY} size={56} /></View>
                <Text accessibilityRole="header" style={[RTL, TYPE2.title]}>תוצאות המרוץ</Text>
            </Animated.View>

            {/* Side-by-side final balances */}
            <Animated.View entering={FadeInUp.delay(200)} style={styles.finalBalanceRow}>
                {config.runners.map((runner, i) => (
                    <View key={runner.name} style={[sim2Styles.scoreCard, { flex: 1, borderColor: SIM2.cardBorder, backgroundColor: SIM2.cardBg }]}>
                        <View style={styles.runnerResultCard}>
                            <LottieIcon source={runnerLotties[i]} size={32} />
                            <Text style={[RTL, TYPE2.cardTitle]}>
                                {runner.name}
                            </Text>
                            <Text style={[sim2Styles.scoreRowValue, { fontSize: 20, color: runner.color }]}>
                                ₪{score.finalBalances[i].toLocaleString('he-IL')}
                            </Text>
                            <Text style={[RTL, sim2Styles.scoreRowLabel]}>
                                הפקיד/ה: ₪{score.totalDeposited[i].toLocaleString('he-IL')}
                            </Text>
                        </View>
                    </View>
                ))}
            </Animated.View>

            {/* Dramatic comparison */}
            <Animated.View entering={FadeInUp.delay(400)}>
                <View style={[sim2Styles.scoreCard, { borderColor: SIM2.cardBorder, backgroundColor: SIM2.cardBg }]}>
                    <View style={{ padding: 20, gap: 10, alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                            <LottieIcon source={LOTTIE_CLOCK} size={22} />
                            <Text style={[RTL, sim2Styles.scoreRowLabel, { textAlign: 'center', lineHeight: 22 }]}>
                                {config.runners[0].name} הפקידה ₪{score.totalDeposited[0].toLocaleString('he-IL')} סה״כ
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                            <LottieIcon source={LOTTIE_ROCKET} size={22} />
                            <Text style={[RTL, sim2Styles.scoreRowLabel, { textAlign: 'center', lineHeight: 22 }]}>
                                {config.runners[1].name} הפקיד ₪{score.totalDeposited[1].toLocaleString('he-IL')} סה״כ
                            </Text>
                        </View>
                        <View style={{ height: 1, width: '80%', backgroundColor: SIM2.cardBorder }} />
                        <Text style={[RTL, sim2Styles.scoreTotalValue, { color: SIM2.warning, textAlign: 'center', lineHeight: 26 }]}>
                            אבל לנטע יש פי {score.multiplier} יותר!
                        </Text>
                    </View>
                </View>
            </Animated.View>

            {/* Key lesson — Finn speech bubble */}
            <Animated.View entering={FadeInUp.delay(500)}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10, backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: '#bae6fd', marginTop: 8 }}>
                    <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 50, height: 50, flexShrink: 0 }} contentFit="contain" />
                    <Text style={{ flex: 1, fontSize: 15, fontWeight: '800', color: '#0c4a6e', lineHeight: 22, writingDirection: 'rtl', textAlign: 'right' }}>
                        המעסיק מכפיל. הזמן משגע. תתחילו היום.
                    </Text>
                </View>
            </Animated.View>

        </ScrollView>

        {/* Sticky actions bar — always visible */}
        <View style={styles.stickyActionsBar}>
          <AnimatedPressable onPress={onReplay} style={sim2Styles.replayBtn} accessibilityRole="button" accessibilityLabel="שחק שוב" accessibilityHint="מתחיל את הסימולציה מחדש">
            <View accessible={false}><LottieIcon source={LOTTIE_REPLAY} size={18} /></View>
            <Text style={sim2Styles.replayText}>שחק שוב</Text>
          </AnimatedPressable>
          <AnimatedPressable onPress={onFinish} style={[sim2Styles.continueBtn, { justifyContent: 'center' }]} accessibilityRole="button" accessibilityLabel="המשך" accessibilityHint="ממשיך לשלב הבא">
            <Text style={sim2Styles.continueText}>המשך</Text>
            <View style={{ position: 'absolute', left: 16 }}>
              <LottieIcon source={LOTTIE_ARROW} size={22} />
            </View>
          </AnimatedPressable>
        </View>
      </View>
    );
}

/* ------------------------------------------------------------------ */
/*  RetirementRaceScreen — main exported component                       */
/* ------------------------------------------------------------------ */

export function RetirementRaceScreen({ onComplete }: { onComplete: () => void }) {
    const {
        state,
        config,
        totalYears,
        play,
        pause,
        reset,
        setYear,
        setSpeed,
        score,
    } = useRetirementRace();

    const [showOvertake, setShowOvertake] = useState(false);
    const [overtakeSeen, setOvertakeSeen] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [showScore, setShowScore] = useState(false);
    const [rewardsGranted, setRewardsGranted] = useState(false);

    // Compute max balance for bar scaling
    const maxBalance = Math.max(
        ...state.runners.map((r) => r.currentBalance),
        1,
    );

    // Detect overtake moment during auto-play
    // Delay the overlay so bar spring animations finish first
    useEffect(() => {
        if (
            state.overtakeYear !== null &&
            state.currentYear === state.overtakeYear &&
            !overtakeSeen &&
            state.isPlaying
        ) {
            pause();
            setOvertakeSeen(true);
            // Wait for bar springs to settle before showing overlay
            const timer = setTimeout(() => {
                heavyHaptic();
                setShowOvertake(true);
                setShowConfetti(true);
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [state.currentYear, state.overtakeYear, overtakeSeen, state.isPlaying, pause]);

    // Show score screen when race completes
    useEffect(() => {
        if (state.isComplete && !showScore) {
            setShowScore(true);
        }
    }, [state.isComplete, showScore]);

    // Completion effect (rewards granted by LessonFlowScreen chest)
    useEffect(() => {
        if (state.isComplete && !rewardsGranted) {
            setRewardsGranted(true);
            successHaptic();
        }
    }, [state.isComplete, rewardsGranted]);

    const handleOvertakeDismiss = useCallback(() => {
        setShowOvertake(false);
        play();
    }, [play]);

    const handleReplay = useCallback(() => {
        reset();
        setShowOvertake(false);
        setOvertakeSeen(false);
        setShowConfetti(false);
        setShowScore(false);
        setRewardsGranted(false);
    }, [reset]);

    const handlePlayPause = useCallback(() => {
        tapHaptic();
        if (state.isPlaying) {
            pause();
        } else {
            play();
        }
    }, [state.isPlaying, pause, play]);

    // Current displayed age (Neta's age)
    const currentAge = config.runners[0].startAge + state.currentYear;

    const CH2_LOTTIE: [ReturnType<typeof require>, ReturnType<typeof require>] = [
        require('../../../../assets/lottie/wired-flat-489-rocket-space-hover-flying.json'),
        require('../../../../assets/lottie/wired-flat-45-clock-time-hover-pinch.json'),
    ];

    // Score screen
    if (showScore && score) {
        return (
            <SimLottieBackground lottieSources={CH2_LOTTIE} chapterColors={_th2.gradient}>
                {showConfetti && <ConfettiExplosion onComplete={() => setShowConfetti(false)} />}
                <ScoreScreen
                    score={score}
                    config={config}
                    onReplay={handleReplay}
                    onFinish={onComplete}
                />
            </SimLottieBackground>
        );
    }

    return (
        <SimLottieBackground lottieSources={CH2_LOTTIE} chapterColors={_th2.gradient}>
            {/* Confetti for overtake */}
            {showConfetti && <ConfettiExplosion onComplete={() => setShowConfetti(false)} />}

            {/* Overtake overlay */}
            {showOvertake && <OvertakeOverlay onDismiss={handleOvertakeDismiss} />}

            {/* Title */}
            <Animated.View entering={FadeInDown.delay(100)}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <View accessible={false}><LottieIcon source={LOTTIE_ROCKET} size={28} /></View>
                    <Text accessibilityRole="header" style={[RTL, TYPE2.title]}>מרוץ הפרישה</Text>
                </View>
                <Text style={[RTL, TYPE2.subtitle, { marginBottom: 8 }]}>
                    מי יגיע לפרישה עם יותר כסף?
                </Text>
            </Animated.View>

            {/* Year counter */}
            <View style={styles.yearCounter} accessibilityLiveRegion="polite">
                <Text style={styles.yearLabel}>גיל</Text>
                <Text style={styles.yearNumber}>{currentAge}</Text>
                <Text style={styles.yearTotal}>/ {config.retirementAge}</Text>
            </View>

            {/* Race bars */}
            <View style={styles.raceArea}>
                {state.runners.map((runner, i) => (
                    <RaceBar
                        key={runner.name}
                        balance={runner.currentBalance}
                        maxBalance={maxBalance}
                        color={runner.color}
                        name={runner.name}
                        lottieSource={i === 0 ? LOTTIE_CLOCK : LOTTIE_ROCKET}
                    />
                ))}
            </View>

            {/* Runner info badges */}
            <View style={styles.infoRow}>
                {config.runners.map((runner, i) => (
                    <View key={runner.name} style={[styles.infoBadge, { borderColor: `${runner.color}44` }]}>
                        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                            <LottieIcon source={i === 0 ? LOTTIE_CLOCK : LOTTIE_ROCKET} size={14} />
                            <Text style={[RTL, TYPE2.gradientLabel]}>
                                ₪{runner.monthlyDeposit.toLocaleString('he-IL')}/חודש
                            </Text>
                        </View>
                        <Text style={[RTL, TYPE2.gradientLabel]}>
                            מגיל {runner.startAge}
                        </Text>
                    </View>
                ))}
            </View>

            {/* Controls */}
            <View style={styles.controlsRow}>
                {/* Play/Pause */}
                <AnimatedPressable onPress={handlePlayPause} style={styles.playBtn} accessibilityRole="button" accessibilityLabel={state.isPlaying ? 'השהה' : state.isComplete ? 'הושלם' : 'התחל'} accessibilityHint={state.isPlaying ? 'עוצר את המרוץ' : 'מתחיל את המרוץ'} accessibilityState={{ disabled: state.isComplete }}>
                    {state.isPlaying ? (
                        <Text style={{ fontSize: 28, color: '#fff', fontWeight: '900' }}>⏸</Text>
                    ) : state.isComplete ? (
                        <View><LottieIcon source={LOTTIE_TROPHY} size={40} /></View>
                    ) : (
                        <>
                            <View><LottieIcon source={LOTTIE_PLAY} size={40} /></View>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff', marginTop: -2 }}>👆 התחל</Text>
                        </>
                    )}
                </AnimatedPressable>

                {/* Speed controls */}
                <View style={styles.speedRow}>
                    <SpeedButton label="1x" speed={200} currentSpeed={state.playSpeed} onPress={setSpeed} />
                    <SpeedButton label="2x" speed={100} currentSpeed={state.playSpeed} onPress={setSpeed} />
                    <SpeedButton label="5x" speed={40} currentSpeed={state.playSpeed} onPress={setSpeed} />
                </View>
            </View>

            {/* Year slider (interactive scrub) */}
            {state.isComplete && (
                <Animated.View entering={FadeInUp.delay(200)}>
                    <YearSlider
                        currentYear={state.currentYear}
                        totalYears={totalYears}
                        onYearChange={setYear}
                    />
                </Animated.View>
            )}
        </SimLottieBackground>
    );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
    container: { flex: 1 },

    /* ── Sticky actions bar (score screen footer) ── */
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
        borderTopColor: SIM2.cardBorder,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 10,
    },

    /* ── Year counter ── */
    yearCounter: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'center',
        gap: 6,
        marginBottom: 12,
    },
    yearLabel: { ...TYPE2.progress },
    yearNumber: { fontSize: 42, fontWeight: '900', color: SIM2.textOnGradient, ...SHADOW_STRONG },
    yearTotal: { ...TYPE2.progress, fontSize: 16 },

    /* ── Race bars ── */
    raceArea: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
        gap: 40,
        flex: 1,
        paddingBottom: 8,
    },
    raceBarCol: {
        alignItems: 'center',
        gap: 4,
        width: BAR_WIDTH + 20,
    },
    raceBarBalance: { fontSize: 16, fontWeight: '900' },
    raceBarTrack: {
        width: BAR_WIDTH,
        height: BAR_MAX_HEIGHT,
        backgroundColor: SIM2.trackBg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: SIM2.trackBorder,
        justifyContent: 'flex-end',
        overflow: 'hidden',
    },
    raceBarFill: {
        width: '100%',
        borderRadius: 12,
        minHeight: 4,
    },

    /* ── Runner info badges ── */
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        marginTop: 8,
    },
    infoBadge: {
        alignItems: 'center',
        gap: 2,
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
    },

    /* ── Controls ── */
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        marginTop: 12,
    },
    playBtn: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#f59e0b',
        borderWidth: 3,
        borderColor: '#d97706',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#f59e0b',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    speedRow: { flexDirection: 'row', gap: 6 },
    speedBtn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: SIM2.cardBorder,
        backgroundColor: SIM2.cardBg,
        opacity: 0.85,
    },
    speedBtnActive: {
        borderColor: SIM2.btnPrimaryBorder,
        backgroundColor: 'rgba(59,130,246,0.15)',
        opacity: 1,
    },
    speedBtnText: { fontSize: 14, fontWeight: '700', color: SIM2.textOnGradientMuted },
    speedBtnTextActive: { color: SIM2.textOnGradient },

    /* ── Year slider ── */
    sliderWrap: { alignItems: 'center', marginTop: 12, gap: 4 },
    sliderLabel: { ...TYPE2.progress },
    sliderTrack: {
        flexDirection: 'row',
        height: 16,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: SIM2.trackBg,
        borderWidth: 1,
        borderColor: SIM2.trackBorder,
    },
    sliderTick: {
        height: '100%',
        backgroundColor: 'rgba(59,130,246,0.05)',
    },
    sliderTickActive: {
        backgroundColor: 'rgba(59,130,246,0.3)',
    },
    sliderTickCurrent: {
        backgroundColor: SIM2.dark,
    },
    sliderLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: 280,
    },
    sliderYearText: { ...TYPE2.progress },

    /* ── Overtake overlay ── */
    overtakeWrap: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 100,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        padding: 32,
    },
    overtakeTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: '#f59e0b',
        textAlign: 'center',
    },
    overtakeSubtitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#e2e8f0',
        textAlign: 'center',
        lineHeight: 24,
    },
    overtakeContinueBtn: {
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: 'rgba(212,160,23,0.5)',
        backgroundColor: 'rgba(212,160,23,0.15)',
        paddingVertical: 12,
        paddingHorizontal: 32,
        marginTop: 8,
    },
    overtakeContinueBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#f59e0b',
    },

    /* ── Score screen extras ── */
    finalBalanceRow: {
        flexDirection: 'row',
        gap: 10,
    },
    runnerResultCard: {
        padding: 16,
        alignItems: 'center',
        gap: 6,
    },
});
