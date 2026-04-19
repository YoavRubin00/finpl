import { useState, useCallback, useEffect } from 'react';
import { Image as ExpoImage } from 'expo-image';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { FINN_STANDARD } from '../../retention-loops/finnMascotConfig';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withSequence,
    withTiming,
    withRepeat,
    cancelAnimation,
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { SimLottieBackground } from '../../../components/ui/SimLottieBackground';
import { LottieIcon } from '../../../components/ui/LottieIcon';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { ConfettiExplosion } from '../../../components/ui/ConfettiExplosion';
import { successHaptic, heavyHaptic, tapHaptic } from '../../../utils/haptics';
import { getChapterTheme } from '../../../constants/theme';
import { useTaxGrinder } from './useTaxGrinder';
import { SIM2, GRADE_COLORS2, SHADOW_STRONG, RTL, TYPE2, sim2Styles } from './simTheme';
import type { TaxGrinderScore } from './taxGrinderTypes';

const _th2 = getChapterTheme('chapter-2');


const BAR_MAX_HEIGHT = 180;
const BAR_WIDTH = 90;

const TRACK_COLORS = {
    regular: '#ef4444',
    hishtalmut: '#38bdf8',
};

/* ── Lottie assets ── */
const LOTTIE_SHIELD = require('../../../../assets/lottie/wired-flat-457-shield-security-hover-pinch.json');
const LOTTIE_BAR_CHART = require('../../../../assets/lottie/wired-flat-153-bar-chart-hover-pinch.json');
const LOTTIE_MONEY_BAG = require('../../../../assets/lottie/wired-flat-413-money-bag-hover-shake.json');
const LOTTIE_BRIEFCASE = require('../../../../assets/lottie/wired-flat-1023-portfolio-hover-pinch.json');
const LOTTIE_BULB = require('../../../../assets/lottie/wired-flat-36-bulb-hover-blink.json');
const LOTTIE_PLAY = require('../../../../assets/lottie/wired-flat-29-play-pause-circle-hover-pinch.json');
const LOTTIE_TROPHY = require('../../../../assets/lottie/wired-flat-3263-trophy-circle-hover-roll.json');
const LOTTIE_REPLAY = require('../../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json');
const LOTTIE_ARROW = require('../../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');

/* ------------------------------------------------------------------ */
/*  CoinStack, animated vertical bar for a track                       */
/* ------------------------------------------------------------------ */

function CoinStack({
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
        <View style={styles.coinStackCol}>
            {/* Balance readout */}
            <Text accessibilityLiveRegion="polite" style={[styles.coinStackBalance, { color: SIM2.textOnGradient }]}>
                ₪{balance.toLocaleString('he-IL')}
            </Text>

            {/* Coin stack bar with Lottie overlay */}
            <View style={styles.coinStackTrack}>
                <Animated.View
                    style={[
                        styles.coinStackFill,
                        { backgroundColor: color },
                        barStyle,
                    ]}
                >
                    <View accessible={false} style={{ position: 'absolute', top: 2, alignSelf: 'center' }}>
                        <LottieIcon source={lottieSource} size={24} />
                    </View>
                </Animated.View>
            </View>

            {/* Name */}
            <Text style={[RTL, styles.coinStackName]}>{name}</Text>
        </View>
    );
}

/* ------------------------------------------------------------------ */
/*  YearLengthSlider, select simulation length (6-20 years)            */
/* ------------------------------------------------------------------ */

function YearLengthSlider({
    selectedYears,
    minYears,
    maxYears,
    onChange,
}: {
    selectedYears: number;
    minYears: number;
    maxYears: number;
    onChange: (years: number) => void;
}) {
    const years = Array.from({ length: maxYears - minYears + 1 }, (_, i) => i + minYears);

    return (
        <View style={styles.yearSliderWrap}>
            <Text style={[RTL, styles.yearSliderLabel]}>
                משך ההשקעה: {selectedYears} שנים
            </Text>
            <View style={styles.yearSliderTrack}>
                {years.map((y) => {
                    const isActive = y <= selectedYears;
                    const isCurrent = y === selectedYears;
                    return (
                        <AnimatedPressable
                            key={y}
                            onPress={() => {
                                tapHaptic();
                                onChange(y);
                            }}
                            style={[
                                styles.yearSliderTick,
                                isActive && styles.yearSliderTickActive,
                                isCurrent && styles.yearSliderTickCurrent,
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={`${y} שנים`}
                            accessibilityHint="בוחר את משך ההשקעה"
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        />
                    );
                })}
            </View>
            <View style={styles.yearSliderLabels}>
                <Text style={styles.yearSliderYearText}>{minYears}</Text>
                <Text style={styles.yearSliderYearText}>{maxYears}</Text>
            </View>
        </View>
    );
}

/* ------------------------------------------------------------------ */
/*  SpeedButton, playback speed selector                               */
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
    onPress: () => void;
}) {
    const isActive = currentSpeed === speed;
    return (
        <AnimatedPressable
            onPress={() => {
                tapHaptic();
                onPress();
            }}
            style={[styles.speedBtn, isActive && styles.speedBtnActive]}
            accessibilityRole="button"
            accessibilityLabel={`מהירות ${label}`}
            accessibilityHint="משנה את מהירות הסימולציה"
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
/*  ComparisonPanel, animated numbers for both tracks                  */
/* ------------------------------------------------------------------ */

function ComparisonPanel({
    tracks,
    difference,
    taxSaved,
}: {
    tracks: { name: string; netBalance: number; color: string }[];
    difference: number;
    taxSaved: number;
}) {
    const trackLotties = [LOTTIE_BAR_CHART, LOTTIE_SHIELD];

    return (
        <View style={styles.comparisonPanel}>
            {/* Track balances */}
            <View style={styles.comparisonRow}>
                {tracks.map((t, i) => (
                    <View key={t.name} style={styles.comparisonItem}>
                        <LottieIcon source={trackLotties[i]} size={20} />
                        <Text style={[RTL, styles.compTrackName]}>
                            {t.name}
                        </Text>
                        <Text style={{ fontSize: 15, fontWeight: '900', color: SIM2.textPrimary }}>
                            ₪{t.netBalance.toLocaleString('he-IL')}
                        </Text>
                    </View>
                ))}
            </View>

            {/* Difference */}
            <View style={styles.diffRow}>
                <Text style={[RTL, styles.diffLabel]}>
                    הפרש:
                </Text>
                <Text accessibilityLiveRegion="polite" style={styles.diffAmount}>
                    ₪{difference.toLocaleString('he-IL')}
                </Text>
            </View>

            {/* Tax saved counter */}
            <View style={styles.taxSavedRow}>
                <LottieIcon source={LOTTIE_MONEY_BAG} size={22} />
                <Text style={[RTL, styles.taxSavedLabel]}>
                    מס שנחסך:
                </Text>
                <Text accessibilityLiveRegion="polite" style={styles.taxSavedAmount}>
                    ₪{taxSaved.toLocaleString('he-IL')}
                </Text>
            </View>
        </View>
    );
}

/* ------------------------------------------------------------------ */
/*  ScoreScreen, results after simulation completion                   */
/* ------------------------------------------------------------------ */

function ScoreScreen({
    score,
    onReplay,
    onFinish,
}: {
    score: TaxGrinderScore;
    onReplay: () => void;
    onFinish: () => void;
}) {
    const gradeColor = GRADE_COLORS2[score.grade] ?? SIM2.textPrimary;

    return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 16, paddingBottom: 20, padding: 16 }}>
            {/* Title */}
            <Animated.View entering={FadeInDown.delay(100)} style={{ alignItems: 'center', gap: 8 }}>
                <View accessible={false}><LottieIcon source={LOTTIE_BAR_CHART} size={56} /></View>
                <Text accessibilityRole="header" style={[RTL, TYPE2.title]}>תוצאות המגרסה</Text>

            </Animated.View>


            {/* Total tax saved, score card */}
            <Animated.View entering={FadeInUp.delay(200)}>
                <View style={[sim2Styles.scoreCard, { borderColor: gradeColor }]}>
                    <View style={sim2Styles.scoreCardInner}>
                        <Text style={[RTL, TYPE2.cardTitle]}>סה״כ מס שנחסך בקרן השתלמות</Text>
                        <Text style={{ fontSize: 28, fontWeight: '900', color: SIM2.success }}>
                            ₪{score.taxSaved.toLocaleString('he-IL')}
                        </Text>
                    </View>
                </View>
            </Animated.View>

            {/* Side-by-side track results */}
            <Animated.View entering={FadeInUp.delay(300)}>
                <View style={[sim2Styles.scoreCard, { borderColor: gradeColor }]}>
                    <View style={sim2Styles.scoreCardInner}>
                        {/* Regular track row */}
                        <View style={sim2Styles.scoreRow}>
                            <View style={sim2Styles.scoreRowLeft}>
                                <LottieIcon source={LOTTIE_BAR_CHART} size={20} />
                                <Text style={[RTL, sim2Styles.scoreRowLabel]}>השקעה רגילה</Text>
                            </View>
                            <Text style={[sim2Styles.scoreRowValue, { color: TRACK_COLORS.regular }]}>
                                ₪{score.finalBalances[0].toLocaleString('he-IL')}
                            </Text>
                        </View>

                        {/* Tax paid row */}
                        <View style={sim2Styles.scoreRow}>
                            <Text style={[RTL, sim2Styles.scoreRowLabel]}>מס ששולם</Text>
                            <Text style={[sim2Styles.scoreRowValue, { color: SIM2.danger }]}>
                                ₪{score.totalTaxPaid.toLocaleString('he-IL')}
                            </Text>
                        </View>

                        {/* Divider + Hishtalmut */}
                        <View style={sim2Styles.scoreDivider}>
                            <View style={sim2Styles.scoreRowLeft}>
                                <LottieIcon source={LOTTIE_SHIELD} size={20} />
                                <Text style={[RTL, sim2Styles.scoreRowLabel]}>קרן השתלמות</Text>
                            </View>
                            <Text style={[sim2Styles.scoreRowValue, { color: TRACK_COLORS.hishtalmut }]}>
                                ₪{score.finalBalances[1].toLocaleString('he-IL')}
                            </Text>
                        </View>
                    </View>
                </View>
            </Animated.View>

            {/* Employer contribution highlight */}
            <Animated.View entering={FadeInUp.delay(400)}>
                <View style={[sim2Styles.scoreCard, { borderColor: gradeColor }]}>
                    <View style={sim2Styles.scoreCardInner}>
                        <View style={sim2Styles.scoreRow}>
                            <View style={sim2Styles.scoreRowLeft}>
                                <LottieIcon source={LOTTIE_BRIEFCASE} size={20} />
                                <Text style={[RTL, sim2Styles.scoreRowLabel]}>תרומת מעסיק</Text>
                            </View>
                            <Text style={[sim2Styles.scoreRowValue, { color: SIM2.success }]}>
                                ₪{score.totalEmployerBonus.toLocaleString('he-IL')}
                            </Text>
                        </View>
                    </View>
                </View>
            </Animated.View>

            {/* Finn + tips */}
            <Animated.View entering={FadeInUp.delay(500)} style={{ flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10 }}>
                <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 56, height: 56, flexShrink: 0 }} contentFit="contain" />

                <View style={{ flex: 1, gap: 8 }}>
                    <View style={[sim2Styles.scoreCard, { borderColor: gradeColor }]}>
                        <View style={sim2Styles.scoreCardInner}>
                            <View style={sim2Styles.insightRow}>
                                <LottieIcon source={LOTTIE_BULB} size={20} />
                                <Text style={[RTL, sim2Styles.insightText]}>
                                    קרן השתלמות = מכונת צמיחה פטורה ממס. לעולם אל תגידו לא.
                                </Text>
                            </View>
                        </View>
                    </View>
                    <View style={[sim2Styles.scoreCard, { borderColor: SIM2.primary }]}>
                        <View style={sim2Styles.scoreCardInner}>
                            <View style={sim2Styles.insightRow}>
                                <LottieIcon source={LOTTIE_MONEY_BAG} size={20} />
                                <Text style={[RTL, sim2Styles.insightText]}>
                                    צריכים כסף? אל תשברו את הקרן!
                                </Text>
                            </View>
                            <Text style={[RTL, { fontSize: 12, color: SIM2.textSecondary, lineHeight: 18, marginTop: 4 }]}>
                                אפשר לקחת הלוואה כנגד הקופה, הכסף ממשיך לצמוח.
                            </Text>
                        </View>
                    </View>
                </View>
            </Animated.View>

            {/* Actions */}
            <View style={sim2Styles.actionsRow}>
                <AnimatedPressable onPress={onReplay} style={sim2Styles.replayBtn} accessibilityRole="button" accessibilityLabel="שחק שוב" accessibilityHint="מתחיל את הסימולציה מחדש">
                    <View accessible={false}><LottieIcon source={LOTTIE_REPLAY} size={18} /></View>
                    <Text style={[RTL, sim2Styles.replayText]}>שחק שוב</Text>
                </AnimatedPressable>
                <AnimatedPressable onPress={onFinish} style={sim2Styles.continueBtn} accessibilityRole="button" accessibilityLabel="המשך" accessibilityHint="ממשיך לשלב הבא">
                    <Text style={[RTL, sim2Styles.continueText]}>המשך</Text>
                    <View style={{ position: 'absolute', left: 16 }}>
                        <LottieIcon source={LOTTIE_ARROW} size={22} />
                    </View>
                </AnimatedPressable>
            </View>
        </ScrollView>
    );
}

/* ------------------------------------------------------------------ */
/*  TaxGrinderScreen, main exported component                          */
/* ------------------------------------------------------------------ */

export function TaxGrinderScreen({ onComplete }: { onComplete: () => void }) {
    const {
        state,
        config,
        selectedYears,
        play,
        pause,
        reset,
        setYear,
        changeYears,
        score,
    } = useTaxGrinder();

    const [showConfetti, setShowConfetti] = useState(false);
    const [showScore, setShowScore] = useState(false);
    const [rewardsGranted, setRewardsGranted] = useState(false);
    const [hundredKSeen, setHundredKSeen] = useState(false);

    // Compute max balance for bar scaling
    const maxBalance = Math.max(
        ...state.tracks.map((t) => t.netBalance),
        1,
    );

    // Pulsing glow for play button
    const glowScale = useSharedValue(1);
    const glowOpacity = useSharedValue(0.4);

    useEffect(() => {
        glowScale.value = withRepeat(
            withSequence(
                withTiming(1.3, { duration: 1200 }),
                withTiming(1, { duration: 1200 }),
            ),
            -1,
            true,
        );
        glowOpacity.value = withRepeat(
            withSequence(
                withTiming(0.7, { duration: 1200 }),
                withTiming(0.3, { duration: 1200 }),
            ),
            -1,
            true,
        );
        return () => {
            cancelAnimation(glowScale);
            cancelAnimation(glowOpacity);
        };
    }, [glowScale, glowOpacity]);

    const glowRingStyle = useAnimatedStyle(() => ({
        transform: [{ scale: glowScale.value }],
        opacity: glowOpacity.value,
    }));

    // ₪100K difference fireworks
    useEffect(() => {
        if (state.difference >= 100_000 && !hundredKSeen && state.isPlaying) {
            heavyHaptic();
            setShowConfetti(true);
            setHundredKSeen(true);
        }
    }, [state.difference, hundredKSeen, state.isPlaying]);

    // Show score screen when complete
    useEffect(() => {
        if (state.isComplete && !showScore) {
            setShowScore(true);
        }
    }, [state.isComplete, showScore]);

    // Grant rewards on completion
    useEffect(() => {
        if (state.isComplete && !rewardsGranted) {
            setRewardsGranted(true);
            successHaptic();
        }
    }, [state.isComplete, rewardsGranted]);

    const handlePlayPause = useCallback(() => {
        tapHaptic();
        if (state.isPlaying) {
            pause();
        } else {
            play();
        }
    }, [state.isPlaying, pause, play]);

    const handleReplay = useCallback(() => {
        reset();
        setShowConfetti(false);
        setShowScore(false);
        setHundredKSeen(false);
    }, [reset]);

    const CH2_LOTTIE: [ReturnType<typeof require>, ReturnType<typeof require>] = [
        require('../../../../assets/lottie/wired-flat-119-law-judge-hover-hit.json'),
        require('../../../../assets/lottie/wired-flat-291-coin-dollar-hover-pinch.json'),
    ];

    // Score screen
    if (showScore && score) {
        return (
            <SimLottieBackground lottieSources={CH2_LOTTIE} chapterColors={_th2.gradient}>
                {showConfetti && <ConfettiExplosion onComplete={() => setShowConfetti(false)} />}
                <ScoreScreen
                    score={score}
                    onReplay={handleReplay}
                    onFinish={onComplete}
                />
            </SimLottieBackground>
        );
    }

    return (
        <SimLottieBackground lottieSources={CH2_LOTTIE} chapterColors={_th2.gradient}>
            {/* Confetti for ₪100K milestone */}
            {showConfetti && <ConfettiExplosion onComplete={() => setShowConfetti(false)} />}

            {/* Year length selector */}
            <YearLengthSlider
                selectedYears={selectedYears}
                minYears={config.minYears}
                maxYears={config.maxYears}
                onChange={changeYears}
            />

            {/* Year counter, right below slider */}
            <View accessibilityLiveRegion="polite" style={[styles.yearCounter, { marginTop: 2, marginBottom: 4 }]}>
                <Text style={[TYPE2.progress]}>שנה</Text>
                <Text style={styles.yearNumber}>{state.currentYear}</Text>
                <Text style={[TYPE2.progress]}>/ {selectedYears}</Text>
            </View>

            {/* Coin stacks (two bars side by side) */}
            <View style={styles.stackArea}>
                <CoinStack
                    balance={state.tracks[0].netBalance}
                    maxBalance={maxBalance}
                    color={state.tracks[0].color}
                    name={state.tracks[0].name}
                    lottieSource={LOTTIE_BAR_CHART}
                />
                <CoinStack
                    balance={state.tracks[1].netBalance}
                    maxBalance={maxBalance}
                    color={state.tracks[1].color}
                    name={state.tracks[1].name}
                    lottieSource={LOTTIE_SHIELD}
                />
            </View>

            {/* Comparison panel */}
            <ComparisonPanel
                tracks={state.tracks}
                difference={state.difference}
                taxSaved={state.taxSaved}
            />

            {/* Controls, Play button with glow */}
            <View style={styles.controlsRow}>
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                    <Animated.View style={[styles.playGlowRing, glowRingStyle]} />
                    <AnimatedPressable onPress={handlePlayPause} style={styles.playBtn} accessibilityRole="button" accessibilityLabel={state.isPlaying ? 'השהה' : state.isComplete ? 'הושלם' : 'התחל'} accessibilityHint={state.isPlaying ? 'עוצר את הסימולציה' : 'מתחיל את הסימולציה'} accessibilityState={{ disabled: state.isComplete }}>
                        {state.isPlaying ? (
                            <Text style={{ fontSize: 24, color: '#fff', fontWeight: '900' }}>⏸</Text>
                        ) : state.isComplete ? (
                            <View><LottieIcon source={LOTTIE_TROPHY} size={32} /></View>
                        ) : (
                            <View><LottieIcon source={LOTTIE_PLAY} size={32} /></View>
                        )}
                    </AnimatedPressable>
                </View>
            </View>

            {/* Year scrub slider (after completion) */}
            {state.isComplete && (
                <Animated.View entering={FadeInUp.delay(200)}>
                    <View style={styles.scrubWrap}>
                        <Text style={styles.scrubLabel}>גרור לסרוק שנים</Text>
                        <View style={styles.scrubTrack}>
                            {Array.from({ length: selectedYears + 1 }).map((_, i) => {
                                const isActive = i <= state.currentYear;
                                const isCurrent = i === state.currentYear;
                                return (
                                    <AnimatedPressable
                                        key={i}
                                        onPress={() => {
                                            tapHaptic();
                                            setYear(i);
                                        }}
                                        style={[
                                            styles.scrubTick,
                                            isActive && styles.scrubTickActive,
                                            isCurrent && styles.scrubTickCurrent,
                                            { width: 280 / (selectedYears + 1) },
                                        ]}
                                        accessibilityRole="button"
                                        accessibilityLabel={`שנה ${i}`}
                                        accessibilityHint="מציג את הנתונים לשנה זו"
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    />
                                );
                            })}
                        </View>
                    </View>
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

    /* ── Year counter ── */
    yearCounter: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'center',
        gap: 6,
        marginBottom: 6,
    },
    yearNumber: { fontSize: 36, fontWeight: '900', color: SIM2.textOnGradient, ...SHADOW_STRONG },

    /* ── Coin stacks ── */
    stackArea: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
        gap: 32,
        flex: 1,
        paddingBottom: 4,
    },
    coinStackCol: {
        alignItems: 'center',
        gap: 4,
        width: BAR_WIDTH + 30,
    },
    coinStackBalance: { fontSize: 16, fontWeight: '900', ...SHADOW_STRONG },
    coinStackTrack: {
        width: BAR_WIDTH,
        height: BAR_MAX_HEIGHT,
        backgroundColor: SIM2.trackBg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: SIM2.trackBorder,
        justifyContent: 'flex-end',
        overflow: 'hidden',
    },
    coinStackFill: {
        width: '100%',
        borderRadius: 12,
        minHeight: 4,
        overflow: 'visible',
        alignItems: 'center',
    },
    coinStackName: { ...TYPE2.gradientLabel },

    /* ── Year length slider ── */
    yearSliderWrap: { alignItems: 'center', gap: 4, marginBottom: 4 },
    yearSliderLabel: { ...TYPE2.gradientLabel },
    yearSliderTrack: {
        flexDirection: 'row',
        height: 20,
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: SIM2.trackBg,
        borderWidth: 1,
        borderColor: SIM2.trackBorder,
    },
    yearSliderTick: {
        height: '100%',
        width: 18,
        backgroundColor: 'rgba(59,130,246,0.05)',
        borderRightWidth: 1,
        borderRightColor: 'rgba(59,130,246,0.15)',
    },
    yearSliderTickActive: {
        backgroundColor: 'rgba(59,130,246,0.3)',
    },
    yearSliderTickCurrent: {
        backgroundColor: SIM2.btnPrimary,
    },
    yearSliderLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: 270,
    },
    yearSliderYearText: { ...TYPE2.progress },

    /* ── Comparison panel ── */
    comparisonPanel: {
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: SIM2.cardBorder,
        backgroundColor: SIM2.cardBg,
        padding: 16,
        gap: 8,
    },
    comparisonRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    comparisonItem: {
        alignItems: 'center',
        gap: 2,
    },
    compTrackName: { fontSize: 14, color: SIM2.textSecondary, fontWeight: '700' },
    diffRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    diffLabel: { fontSize: 14, color: SIM2.textSecondary, fontWeight: '600' },
    diffAmount: { fontSize: 15, fontWeight: '900', color: SIM2.textPrimary },
    taxSavedRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        paddingTop: 8,
    },
    taxSavedLabel: { fontSize: 14, color: SIM2.textSecondary, fontWeight: '600' },
    taxSavedAmount: {
        fontSize: 16,
        fontWeight: '900',
        color: SIM2.success,
    },

    /* ── Controls ── */
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        marginTop: 6,
    },
    playBtn: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#0d9488',
        borderWidth: 2,
        borderColor: '#115e59',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    playGlowRing: {
        position: 'absolute',
        width: 84,
        height: 84,
        borderRadius: 42,
        backgroundColor: 'rgba(13,148,136,0.35)',
        zIndex: 1,
    },
    speedBtn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: SIM2.btnSecondaryBorder,
        backgroundColor: SIM2.btnSecondary,
    },
    speedBtnActive: {
        borderColor: SIM2.btnPrimaryBorder,
        backgroundColor: 'rgba(59,130,246,0.15)',
    },
    speedBtnText: { fontSize: 12, fontWeight: '700', color: SIM2.textSecondary },
    speedBtnTextActive: { color: SIM2.textPrimary },

    /* ── Scrub slider ── */
    scrubWrap: { alignItems: 'center', marginTop: 6, gap: 4 },
    scrubLabel: { ...TYPE2.progress },
    scrubTrack: {
        flexDirection: 'row',
        height: 16,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: SIM2.trackBg,
        borderWidth: 1,
        borderColor: SIM2.trackBorder,
    },
    scrubTick: {
        height: '100%',
        backgroundColor: 'rgba(59,130,246,0.05)',
    },
    scrubTickActive: {
        backgroundColor: 'rgba(59,130,246,0.3)',
    },
    scrubTickCurrent: {
        backgroundColor: SIM2.btnPrimary,
    },
});
