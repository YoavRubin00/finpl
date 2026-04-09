import { useEffect, useRef, useCallback, useState } from 'react';
import { Image as ExpoImage } from 'expo-image';
import { FINN_STANDARD, FINN_HAPPY } from '../../retention-loops/finnMascotConfig';
import {
    View,
    Text,
    Dimensions,
    PanResponder,
    Pressable,
    TextInput,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withRepeat,
    withSequence,
    cancelAnimation,
    FadeIn,
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { LottieIcon } from '../../../components/ui/LottieIcon';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { SimLottieBackground } from '../../../components/ui/SimLottieBackground';
import { GlowCard } from '../../../components/ui/GlowCard';
import { getChapterTheme } from '../../../constants/theme';
import { ConfettiExplosion } from '../../../components/ui/ConfettiExplosion';
import { tapHaptic, heavyHaptic, successHaptic } from '../../../utils/haptics';
import { useCompoundSim } from './useCompoundSim';
import { compoundConfig } from './compoundData';
import { SIM, SHADOW_STRONG, SHADOW_LIGHT, RTL, TYPE, simStyles } from './simTheme';
import { useTimeoutCleanup } from '../../../hooks/useTimeoutCleanup';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BAR_MAX_HEIGHT = 110;
const SLIDER_TRACK_HEIGHT = 10;
const SLIDER_THUMB_SIZE = 32;
const MILLION = 1_000_000;

/** Step amounts for stepper buttons */
const INITIAL_STEP = 5_000;
const MONTHLY_STEP = 100;

/* ── Chapter 1 theme (gradient only) ── */
const _th1 = getChapterTheme('chapter-1');

/* ── Lottie assets ── */
const LOTTIE_REPLAY = require('../../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json');
const LOTTIE_ARROW = require('../../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');
const LOTTIE_CLOCK = require('../../../../assets/lottie/wired-flat-45-clock-time-hover-pinch.json');
const LOTTIE_ROCKET = require('../../../../assets/lottie/wired-flat-489-rocket-space-hover-flying.json');
const LOTTIE_DIVIDENDS = require('../../../../assets/lottie/wired-flat-945-dividends-hover-pinch.json');
const LOTTIE_GRAPH = require('../../../../assets/lottie/wired-flat-163-graph-line-chart-hover-slide.json');

/** Format number as ₪X,XXX */
function formatCurrency(n: number): string {
    if (n >= MILLION) {
        return `₪${(n / MILLION).toFixed(2)}M`;
    }
    return `₪${n.toLocaleString('en-US')}`;
}

/* ------------------------------------------------------------------ */
/*  3D-Style Pillar Component                                          */
/* ------------------------------------------------------------------ */

function Pillar3D({
    label,
    value,
    heightPercent,
    colors,
    isGlowing,
}: {
    label: string;
    value: number;
    heightPercent: number;
    colors: readonly [string, string, string];
    isGlowing: boolean;
}) {
    const animatedHeight = useSharedValue(0);

    useEffect(() => {
        animatedHeight.value = withSpring(heightPercent * BAR_MAX_HEIGHT, {
            damping: 22,
            stiffness: 90,
        });
    }, [heightPercent, animatedHeight]);

    const barStyle = useAnimatedStyle(() => ({
        height: animatedHeight.value,
    }));

    return (
        <View style={{ alignItems: 'center', flex: 1 }}>
            {/* Value label */}
            <Animated.Text
                entering={FadeIn.duration(300)}
                style={[
                    {
                        color: isGlowing ? '#b8860b' : SIM.textPrimary,
                        fontSize: 13,
                        fontWeight: '800',
                        marginBottom: 6,
                        textAlign: 'center',
                    },
                ]}
            >
                {formatCurrency(value)}
            </Animated.Text>

            {/* Bar container */}
            <View
                style={{
                    width: SCREEN_WIDTH * 0.22,
                    height: BAR_MAX_HEIGHT,
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                }}
            >
                <Animated.View
                    style={[
                        barStyle,
                        {
                            width: '100%',
                            borderRadius: 12,
                            overflow: 'hidden',
                            minHeight: 4,
                        },
                        // 3D shadow effect
                        {
                            shadowColor: isGlowing ? '#facc15' : '#000',
                            shadowOffset: { width: 4, height: 6 },
                            shadowOpacity: isGlowing ? 0.6 : 0.4,
                            shadowRadius: isGlowing ? 16 : 8,
                            elevation: isGlowing ? 16 : 8,
                        },
                    ]}
                >
                    <LinearGradient
                        colors={colors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ flex: 1, borderRadius: 12 }}
                    />
                    {/* Right-side highlight for 3D extrusion effect */}
                    <View
                        style={{
                            position: 'absolute',
                            right: 0,
                            top: 0,
                            bottom: 0,
                            width: 8,
                            backgroundColor: 'rgba(255,255,255,0.08)',
                            borderTopRightRadius: 12,
                            borderBottomRightRadius: 12,
                        }}
                    />
                    {/* Top highlight */}
                    <View
                        style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: 0,
                            height: 6,
                            backgroundColor: 'rgba(255,255,255,0.15)',
                            borderTopLeftRadius: 12,
                            borderTopRightRadius: 12,
                        }}
                    />
                </Animated.View>

                {/* Glow overlay for compound bar at 15+ years */}
                {isGlowing && (
                    <View
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            left: -8,
                            right: -8,
                            height: BAR_MAX_HEIGHT,
                            borderRadius: 20,
                            backgroundColor: 'rgba(250, 204, 21, 0.08)',
                        }}
                    />
                )}
            </View>

            {/* Label */}
            <Text
                style={[
                    {
                        color: isGlowing ? '#b8860b' : SIM.textSecondary,
                        fontSize: 14,
                        fontWeight: '700',
                        marginTop: 10,
                        textAlign: 'center',
                    },
                    RTL,
                ]}
            >
                {label}
            </Text>
        </View>
    );
}

/* ------------------------------------------------------------------ */
/*  Year Slider                                                        */
/* ------------------------------------------------------------------ */

function YearSlider({
    years,
    min,
    max,
    onChange,
    hasInteracted,
    onInteract,
}: {
    years: number;
    min: number;
    max: number;
    onChange: (y: number) => void;
    hasInteracted: boolean;
    onInteract: () => void;
}) {
    const sliderWidth = useRef(SCREEN_WIDTH - 64);
    const percentage = (years - min) / (max - min);

    // RTL: thumb starts from right side
    const rtlPercentage = 1 - percentage;
    const thumbX = useSharedValue(rtlPercentage * sliderWidth.current);

    useEffect(() => {
        thumbX.value = withSpring((1 - percentage) * sliderWidth.current, {
            damping: 20,
            stiffness: 150,
        });
    }, [percentage, thumbX]);

    const thumbStyle = useAnimatedStyle(() => {
        const clampedX = Math.max(0, Math.min(thumbX.value, sliderWidth.current)) - SLIDER_THUMB_SIZE / 2;
        return {
            transform: [{ translateX: clampedX }],
        };
    });

    const fillStyle = useAnimatedStyle(() => ({
        width: Math.max(0, sliderWidth.current - Math.max(0, Math.min(thumbX.value, sliderWidth.current))),
        position: 'absolute' as const,
        right: 0,
    }));

    // Pulsing hint arrow — disappears after user interaction
    const arrowPulse = useSharedValue(0);

    useEffect(() => {
        if (!hasInteracted) {
            arrowPulse.value = withRepeat(
                withSequence(
                    withTiming(1, { duration: 800 }),
                    withTiming(0, { duration: 800 }),
                ),
                -1,
                true,
            );
        }
        return () => { cancelAnimation(arrowPulse); };
    }, [hasInteracted, arrowPulse]);

    // Use ref to avoid stale closure in PanResponder
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const hasInteractedRef = useRef(false);

    const panResponderWrapped = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (_evt, gestureState) => {
                const x = Math.max(0, Math.min(gestureState.moveX - 24, sliderWidth.current));
                const pct = 1 - x / sliderWidth.current; // RTL: invert
                const newYear = Math.round(min + pct * (max - min));
                if (!hasInteractedRef.current) {
                    hasInteractedRef.current = true;
                    onInteract();
                }
                onChangeRef.current(newYear);
                tapHaptic();
            },
            onPanResponderMove: (_evt, gestureState) => {
                const x = Math.max(0, Math.min(gestureState.moveX - 24, sliderWidth.current));
                const pct = 1 - x / sliderWidth.current; // RTL: invert
                const newYear = Math.round(min + pct * (max - min));
                onChangeRef.current(newYear);
                tapHaptic();
            },
        }),
    ).current;

    // Finger hint follows the thumb position — clamped to stay within slider bounds
    const fingerStyle = useAnimatedStyle(() => {
        const clampedX = Math.min(thumbX.value - 11, sliderWidth.current - 36);
        return {
            opacity: 0.5 + arrowPulse.value * 0.5,
            transform: [
                { translateX: clampedX },
                { translateY: arrowPulse.value * 5 },
            ],
        };
    });

    return (
        <View style={{ paddingHorizontal: 24, marginTop: 10 }}>
            {/* Year display — centered */}
            <Text
                style={{
                    ...TYPE.gradientValue,
                    textAlign: 'center',
                    marginBottom: 8,
                }}
            >
                {years} שנים
            </Text>

            {/* Slider with finger hint */}
            <View style={{ position: 'relative', marginTop: 30 }}>
                {/* Finger hint above thumb — points down */}
                {!hasInteracted && (
                    <Animated.View pointerEvents="none" style={[fingerStyle, { position: 'absolute', top: -75, marginLeft: -80, zIndex: 10, width: 190, alignItems: 'center' }]}>
                        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#ffffff', padding: 6, borderRadius: 12, marginBottom: 4, borderWidth: 1, borderColor: '#0891b2', shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 }}>
                            <LottieIcon source={require('../../../../assets/lottie/finn.json') as number} size={32} autoPlay loop />
                            <Text style={[RTL, { flex: 1, fontSize: 11, color: '#0369a1', fontWeight: '800', textAlign: 'center', marginRight: 4 }]}>
                                תזיז את הכפתור קצת ותראה מה יכול להיות העתיד שלך!
                            </Text>
                        </View>
                        <Text style={{ fontSize: 24 }}>👇</Text>
                    </Animated.View>
                )}

                {/* Track */}
                <View
                    style={{
                        height: SLIDER_TRACK_HEIGHT,
                        backgroundColor: SIM.trackBg,
                        borderRadius: SLIDER_TRACK_HEIGHT / 2,
                        overflow: 'visible',
                        borderWidth: 1,
                        borderColor: SIM.trackBorder,
                    }}
                    onLayout={(e) => {
                        sliderWidth.current = e.nativeEvent.layout.width;
                    }}
                    accessibilityRole="adjustable"
                    accessibilityLabel="שנות השקעה"
                    accessibilityValue={{ min, max, now: years }}
                    {...panResponderWrapped.panHandlers}
                >
                    {/* Filled portion */}
                    <Animated.View
                        style={[
                            fillStyle,
                            {
                                height: SLIDER_TRACK_HEIGHT,
                                borderRadius: SLIDER_TRACK_HEIGHT / 2,
                            },
                        ]}
                    >
                        <LinearGradient
                            colors={['#67e8f9', '#0891b2']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{
                                flex: 1,
                                borderRadius: SLIDER_TRACK_HEIGHT / 2,
                            }}
                        />
                    </Animated.View>

                    {/* Thumb */}
                    <Animated.View
                        style={[
                            thumbStyle,
                            {
                                position: 'absolute',
                                top: -(SLIDER_THUMB_SIZE - SLIDER_TRACK_HEIGHT) / 2,
                                width: SLIDER_THUMB_SIZE,
                                height: SLIDER_THUMB_SIZE,
                                borderRadius: SLIDER_THUMB_SIZE / 2,
                                backgroundColor: '#0891b2',
                                shadowColor: '#22d3ee',
                                shadowOffset: { width: 0, height: 0 },
                                shadowOpacity: 0.6,
                                shadowRadius: 10,
                                elevation: 8,
                                borderWidth: 3,
                                borderColor: '#ffffff',
                            },
                        ]}
                    />
                </View>
            </View>

            {/* Min/Max labels */}
            <View
                style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginTop: 8,
                }}
            >
                <Text style={{ color: SIM.textOnGradientMuted, ...SHADOW_LIGHT, fontSize: 13, fontWeight: '700' }}>{max}</Text>
                <Text style={{ color: SIM.textOnGradientMuted, ...SHADOW_LIGHT, fontSize: 13, fontWeight: '700' }}>{min}</Text>
            </View>
        </View>
    );
}

/* ------------------------------------------------------------------ */
/*  Stepper Input                                                      */
/* ------------------------------------------------------------------ */

function StepperInput({
    label,
    value,
    step,
    onChange,
}: {
    label: string;
    value: number;
    step: number;
    onChange: (v: number) => void;
}) {
    const [editText, setEditText] = useState<string | null>(null);

    const handleDecrement = () => {
        const next = Math.max(0, value - step);
        onChange(next);
        tapHaptic();
    };

    const handleIncrement = () => {
        onChange(value + step);
        tapHaptic();
    };

    const handleSubmitEdit = () => {
        if (editText !== null) {
            const parsed = parseInt(editText.replace(/[^0-9]/g, ''), 10);
            onChange(isNaN(parsed) ? 0 : parsed);
            setEditText(null);
        }
    };

    return (
        <View style={{ flex: 1 }}>
            <Text
                style={[
                    {
                        ...TYPE.gradientLabel,
                        marginBottom: 8,
                        textAlign: 'center',
                    },
                    RTL,
                ]}
            >
                {label}
            </Text>
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#ffffff',
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: SIM.cardBorder,
                    overflow: 'hidden',
                }}
            >
                {/* Minus button */}
                <Pressable
                    onPress={handleDecrement}
                    accessibilityRole="button"
                    accessibilityLabel={`הפחת ${label}`}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{
                        width: 40,
                        height: 44,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: SIM.dim,
                    }}
                >
                    <Text style={{ color: SIM.dark, fontSize: 20, fontWeight: '700' }}>-</Text>
                </Pressable>

                {/* Value display / editable */}
                {editText !== null ? (
                    <TextInput
                        value={editText}
                        onChangeText={setEditText}
                        onBlur={handleSubmitEdit}
                        onSubmitEditing={handleSubmitEdit}
                        keyboardType="numeric"
                        autoFocus
                        accessibilityLabel={label}
                        style={{
                            flex: 1,
                            color: SIM.textPrimary,
                            fontSize: 15,
                            fontWeight: '700',
                            textAlign: 'center',
                            paddingVertical: 8,
                        }}
                        selectTextOnFocus
                    />
                ) : (
                    <Pressable
                        onPress={() => setEditText(String(value))}
                        accessibilityRole="button"
                        accessibilityLabel={`ערוך ${label}`}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={{ flex: 1, paddingVertical: 10 }}
                    >
                        <Text
                            style={{
                                color: SIM.textPrimary,
                                fontSize: 16,
                                fontWeight: '800',
                                textAlign: 'center',
                            }}
                        >
                            {formatCurrency(value)}
                        </Text>
                    </Pressable>
                )}

                {/* Plus button */}
                <Pressable
                    onPress={handleIncrement}
                    accessibilityRole="button"
                    accessibilityLabel={`הגדל ${label}`}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{
                        width: 40,
                        height: 44,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: SIM.dim,
                    }}
                >
                    <Text style={{ color: SIM.dark, fontSize: 20, fontWeight: '700' }}>+</Text>
                </Pressable>
            </View>
        </View>
    );
}

/* ------------------------------------------------------------------ */
/*  Difference Badge                                                   */
/* ------------------------------------------------------------------ */

function DifferenceBadge({ invested, compound }: { invested: number; compound: number }) {
    const diff = compound - invested;
    if (diff <= 0) return null;

    return (
        <Animated.View entering={FadeInUp.duration(400)} style={{ alignItems: 'center', marginTop: 10 }}>
            <View
                style={{
                    backgroundColor: 'rgba(250, 204, 21, 0.12)',
                    borderRadius: 16,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderWidth: 1,
                    borderColor: 'rgba(250, 204, 21, 0.3)',
                }}
            >
                <Text
                    accessibilityLiveRegion="polite"
                    style={[
                        {
                            color: '#b8860b',
                            fontSize: 14,
                            fontWeight: '800',
                            textAlign: 'center',
                        },
                        RTL,
                    ]}
                >
                    {formatCurrency(diff)} רווח מריבית דריבית!
                </Text>
            </View>
        </Animated.View>
    );
}

/* ------------------------------------------------------------------ */
/*  Millionaire Badge                                                  */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Main Screen                                                        */
/* ------------------------------------------------------------------ */

interface CompoundSimScreenProps {
    onComplete?: () => void;
}

export function CompoundSimScreen({ onComplete }: CompoundSimScreenProps) {
    const { state, updateYears, updateInitialAmount, updateMonthlyContribution, reset } =
        useCompoundSim(compoundConfig);
    const safeTimeout = useTimeoutCleanup();

    const [isAutoRunning, setIsAutoRunning] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [rewardsGranted, setRewardsGranted] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);
    // Auto-dismiss finger hint after 3 seconds
    useEffect(() => {
        if (hasInteracted) return;
        const t = setTimeout(() => setHasInteracted(true), 3000);
        return () => clearTimeout(t);
    }, [hasInteracted]);
    const hasExploredYear20 = useRef(false);
    const milestoneTriggered = useRef(false);
    const autoRunTimer = useRef<ReturnType<typeof setInterval> | null>(null);

    // Track if user has explored year 20+
    useEffect(() => {
        if (state.years >= 20) {
            hasExploredYear20.current = true;
        }
    }, [state.years]);

    // Subtle auto slide to demonstrate functionality
    useEffect(() => {
        if (hasInteracted || isAutoRunning) return;
        let isActive = true;

        const t1 = setTimeout(() => {
            if (isActive && !hasInteracted) updateYears(3);
        }, 800);
        
        const t2 = setTimeout(() => {
            if (isActive && !hasInteracted) updateYears(6);
        }, 1600);
        
        const t3 = setTimeout(() => {
            if (isActive && !hasInteracted) updateYears(2);
        }, 2500);

        return () => {
            isActive = false;
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        };
    }, [hasInteracted, isAutoRunning, updateYears]);

    // Haptic feedback when finishing
    useEffect(() => {
        if (isFinished && !rewardsGranted) {
            setRewardsGranted(true);
            successHaptic();
        }
    }, [isFinished, rewardsGranted]);

    const handleFinish = useCallback(() => {
        setIsFinished(true);
        tapHaptic();
    }, []);

    const handleReplay = useCallback(() => {
        reset();
        setIsFinished(false);
        setRewardsGranted(false);
        setShowConfetti(false);
        hasExploredYear20.current = false;
        milestoneTriggered.current = false;
    }, [reset]);

    // Calculate bar height percentages relative to the larger value
    const maxValue = Math.max(state.totalInvested, state.totalCompoundValue, 1);
    const investedPercent = state.totalInvested / maxValue;
    const compoundPercent = state.totalCompoundValue / maxValue;

    // Milestone: ₪1M trigger — confetti only
    useEffect(() => {
        if (state.totalCompoundValue >= MILLION && !milestoneTriggered.current) {
            milestoneTriggered.current = true;
            heavyHaptic();
            setShowConfetti(true);
        }
        if (state.totalCompoundValue < MILLION) {
            milestoneTriggered.current = false;
            setShowConfetti(false);
        }
    }, [state.totalCompoundValue]);

    // Confetti loop — keep spawning while above ₪1M
    const handleConfettiComplete = useCallback(() => {
        if (milestoneTriggered.current) {
            setShowConfetti(false);
            // Re-trigger on next tick to loop
            setTimeout(() => {
                if (milestoneTriggered.current) {
                    setShowConfetti(true);
                }
            }, 100);
        }
    }, []);

    // Fast Forward: auto-slide from 1 to 40
    const startAutoRun = useCallback(() => {
        setIsAutoRunning(true);
        updateYears(compoundConfig.minYears);
        let currentYear = compoundConfig.minYears;

        autoRunTimer.current = setInterval(() => {
            currentYear += 1;
            if (currentYear > compoundConfig.maxYears) {
                if (autoRunTimer.current) clearInterval(autoRunTimer.current);
                autoRunTimer.current = null;
                setIsAutoRunning(false);
                return;
            }
            updateYears(currentYear);
            tapHaptic();
        }, 120);
    }, [updateYears]);

    // Cleanup auto-run timer
    useEffect(() => {
        return () => {
            if (autoRunTimer.current) clearInterval(autoRunTimer.current);
        };
    }, []);

    if (isFinished) {
        const profit = state.totalCompoundValue - state.totalInvested;

        return (
            <SimLottieBackground
                lottieSources={[LOTTIE_DIVIDENDS, LOTTIE_GRAPH]}
                chapterColors={_th1.gradient}
            >
                <View style={{ flex: 1, justifyContent: 'flex-start', padding: 14, paddingTop: 24, gap: 8 }}>
                    {/* Lesson title */}
                    <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: 'flex-end' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                            <Text style={[TYPE.title, RTL]} accessibilityRole="header">
                                זמן = כסף
                            </Text>
                            <LottieIcon source={LOTTIE_CLOCK} size={32} />
                        </View>
                    </Animated.View>

                    {/* Finn presents the summary */}
                    <Animated.View entering={FadeIn.delay(50).duration(300)} style={{ alignItems: 'center', marginVertical: 2 }}>
                        <ExpoImage source={FINN_HAPPY} style={{ width: 100, height: 100 }} contentFit="contain" />
                    </Animated.View>

                    {/* Summary GlowCard */}
                    <Animated.View entering={FadeInUp.delay(100).duration(400)}>
                        <GlowCard chapterGlow={SIM.glow} style={{ backgroundColor: SIM.cardBg, padding: 0, borderWidth: 1, borderColor: SIM.cardBorder }} pressable={false}>
                            <View style={{ padding: 18, gap: 10 }}>
                                <Text style={[TYPE.cardTitle, RTL]}>
                                    סיכום הסימולציה:
                                </Text>
                                <StatRow label="סכום התחלתי" value={formatCurrency(state.initialAmount)} />
                                <StatRow label="הפקדה חודשית" value={formatCurrency(state.monthlyContribution)} />
                                <StatRow label="שנים" value={`${state.years}`} />
                                <View style={{ height: 1, backgroundColor: '#e2e8f0', marginVertical: 2 }} />
                                <StatRow label="סה״כ הושקע" value={formatCurrency(state.totalInvested)} valueColor={SIM.textMuted} />
                                <StatRow label="סה״כ עם ריבית דריבית" value={formatCurrency(state.totalCompoundValue)} valueColor={SIM.textPrimary} bold />
                                <StatRow label="רווח מריבית דריבית" value={formatCurrency(profit)} valueColor={SIM.success} bold />
                            </View>
                        </GlowCard>
                    </Animated.View>

                    {/* Replay / Continue buttons */}
                    <Animated.View entering={FadeInUp.delay(200).duration(400)} style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                        <AnimatedPressable onPress={handleReplay} style={simStyles.replayBtn} accessibilityRole="button" accessibilityLabel="שחק שוב" accessibilityHint="מתחיל את הסימולציה מחדש">
                            <View accessible={false}><LottieIcon source={LOTTIE_REPLAY} size={20} /></View>
                            <Text style={[simStyles.replayText, RTL]}>שחק שוב</Text>
                        </AnimatedPressable>
                        <AnimatedPressable onPress={() => onComplete?.()} style={simStyles.continueBtn} accessibilityRole="button" accessibilityLabel="בואו נמשיך" accessibilityHint="ממשיך לשלב הבא">
                            <Text style={simStyles.continueText}>בואו נמשיך</Text>
                            <View accessible={false}><LottieIcon source={LOTTIE_ARROW} size={20} /></View>
                        </AnimatedPressable>
                    </Animated.View>
                </View>
            </SimLottieBackground>
        );
    }

    return (
        <SimLottieBackground
            lottieSources={[LOTTIE_DIVIDENDS, LOTTIE_GRAPH]}
            chapterColors={_th1.gradient}
        >
            <View style={{ flex: 1, paddingHorizontal: 16 }}>
                {/* Interactive Inputs */}
                <Animated.View entering={FadeInDown.delay(100).duration(400)} style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                    <StepperInput label="סכום התחלתי" value={state.initialAmount} step={INITIAL_STEP} onChange={updateInitialAmount} />
                    <StepperInput label="הפקדה חודשית" value={state.monthlyContribution} step={MONTHLY_STEP} onChange={updateMonthlyContribution} />
                </Animated.View>

                {/* Finn hint bubble */}
                {!hasInteracted && (
                    <Animated.View entering={FadeInDown.delay(400).duration(350)} style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginTop: 6, backgroundColor: 'rgba(255,255,255,0.9)', padding: 8, borderRadius: 12, borderWidth: 1, borderColor: '#bae6fd' }}>
                        <ExpoImage source={FINN_STANDARD} style={{ width: 36, height: 36, flexShrink: 0 }} contentFit="contain" />
                        <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: '#0369a1', textAlign: 'right', writingDirection: 'rtl', lineHeight: 18 }}>
                            תעריכו כמה ותנחשו. זו המטרה!
                        </Text>
                    </Animated.View>
                )}

                {/* 3D Pillars Comparison */}
                <Animated.View entering={FadeIn.delay(250).duration(500)} style={{ flex: 1, marginTop: 8, minHeight: 180 }}>
                    <GlowCard chapterGlow={SIM.glow} style={{ flex: 1, backgroundColor: SIM.cardBg, padding: 0, overflow: 'hidden' }} pressable={false}>
                        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'flex-end', paddingTop: 8, paddingHorizontal: 8 }}>
                            <Pillar3D label="מתחת למזרן" value={state.totalInvested} heightPercent={investedPercent} colors={['#6b7280', '#4b5563', '#374151']} isGlowing={false} />
                            <Pillar3D label="ריבית דריבית" value={state.totalCompoundValue} heightPercent={compoundPercent} colors={['#facc15', '#d4a017', '#b8860b']} isGlowing={false} />
                        </View>
                        <DifferenceBadge invested={state.totalInvested} compound={state.totalCompoundValue} />
                    </GlowCard>
                    
                    {/* Finn explaining what Compound Interest is */}
                    <Animated.View entering={FadeInUp.delay(500).duration(400)} style={{ flexDirection: 'row-reverse', alignItems: 'center', marginTop: 12, backgroundColor: 'rgba(255,255,255,0.7)', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#bae6fd' }}>
                        <ExpoImage source={FINN_STANDARD} style={{ width: 44, height: 44 }} contentFit="contain" />
                        <Text style={[RTL, { flex: 1, fontSize: 13, color: '#0369a1', fontWeight: '700', marginRight: 8, lineHeight: 18 }]}>
                            אם אינך מבין מה זה אומר — בואו נלמד יחד.
                        </Text>
                    </Animated.View>
                </Animated.View>

                {/* Year Slider */}
                <Animated.View entering={FadeInUp.delay(350).duration(400)} style={{ marginTop: 6 }}>
                    <YearSlider 
                        years={state.years} 
                        min={compoundConfig.minYears} 
                        max={compoundConfig.maxYears} 
                        onChange={updateYears} 
                        hasInteracted={hasInteracted}
                        onInteract={() => setHasInteracted(true)}
                    />
                </Animated.View>

                {/* Fast Forward / Finish */}
                <Animated.View entering={FadeInUp.delay(450).duration(400)} style={{ marginTop: 6, marginBottom: 8, paddingHorizontal: 8 }}>
                    {hasExploredYear20.current ? (
                        <AnimatedPressable onPress={handleFinish} accessibilityRole="button" accessibilityLabel="בואו נמשיך" accessibilityHint="ממשיך לסיכום הסימולציה" style={{ backgroundColor: SIM.btnPrimary, borderRadius: 20, paddingVertical: 18, shadowColor: '#0891b2', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4, borderBottomColor: SIM.btnPrimaryBorder }}>
                            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>בואו נמשיך</Text>
                                <LottieIcon source={LOTTIE_ARROW} size={20} />
                            </View>
                        </AnimatedPressable>
                    ) : (
                        <AnimatedPressable
                            onPress={() => { if (!isAutoRunning) { tapHaptic(); startAutoRun(); } }}
                            disabled={isAutoRunning}
                            accessibilityRole="button"
                            accessibilityLabel={isAutoRunning ? "מריץ סימולציה" : "הרץ סימולציה"}
                            accessibilityHint="מריץ את הסימולציה אוטומטית משנה 1 עד 40"
                            accessibilityState={{ disabled: isAutoRunning }}
                            style={{
                                borderRadius: 20,
                                overflow: 'hidden',
                                opacity: isAutoRunning ? 0.6 : 1,
                            }}
                        >
                            <LinearGradient
                                colors={isAutoRunning ? ['#6b7280', '#4b5563'] : ['#0e7490', '#0891b2', '#0c4a6e']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={{
                                    paddingVertical: 18,
                                    borderRadius: 20,
                                    flexDirection: 'row-reverse',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 10,
                                    borderBottomWidth: 4,
                                    borderBottomColor: isAutoRunning ? '#374151' : '#0c4a6e',
                                }}
                            >
                                <Text style={[{ color: '#fff', fontSize: 18, fontWeight: '900' }, RTL]}>
                                    {isAutoRunning ? 'מריץ סימולציה...' : 'הרץ סימולציה'}
                                </Text>
                                {!isAutoRunning && <LottieIcon source={LOTTIE_ROCKET} size={24} />}
                            </LinearGradient>
                        </AnimatedPressable>
                    )}
                </Animated.View>
            </View>

            {/* Confetti for millionaire */}
            {showConfetti && <ConfettiExplosion onComplete={handleConfettiComplete} />}
        </SimLottieBackground>
    );
}

/* ------------------------------------------------------------------ */
/*  Stat Row                                                           */
/* ------------------------------------------------------------------ */

function StatRow({
    label,
    value,
    valueColor = SIM.textPrimary,
    bold = false,
}: {
    label: string;
    value: string;
    valueColor?: string;
    bold?: boolean;
}) {
    return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text
                style={{
                    color: valueColor,
                    fontSize: bold ? TYPE.value.fontSize + 1 : TYPE.value.fontSize,
                    fontWeight: bold ? '800' : '600',
                }}
            >
                {value}
            </Text>
            <Text style={[TYPE.label, RTL]}>{label}</Text>
        </View>
    );
}
