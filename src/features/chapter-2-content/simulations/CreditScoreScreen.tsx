import { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withSequence,
    withTiming,
    withDelay,
    FadeIn,
    FadeInDown,
} from 'react-native-reanimated';
import { SimLottieBackground } from '../../../components/ui/SimLottieBackground';
import { LottieIcon } from '../../../components/ui/LottieIcon';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { ConfettiExplosion } from '../../../components/ui/ConfettiExplosion';
import { SimFeedbackBar } from '../../../components/ui/SimFeedbackBar';
import { successHaptic, errorHaptic, heavyHaptic, doubleHeavyHaptic } from '../../../utils/haptics';
import { useCreditScore } from './useCreditScore';
import { creditScoreConfig } from './creditScoreData';
import type { CreditOption, CreditEventSeverity, CreditScoreScore, CreditScoreGrade, NotificationSource, ChoiceRecord } from './creditScoreTypes';
import { getChapterTheme } from '../../../constants/theme';
import { SIM2, GRADE_COLORS2, GRADE_HEBREW, SHADOW_STRONG, SHADOW_LIGHT, RTL, TYPE2, sim2Styles } from './simTheme';

const _th2 = getChapterTheme('chapter-2');


/* ── Lottie assets ── */
const LOTTIE_CHART = require('../../../../assets/lottie/wired-flat-153-bar-chart-hover-pinch.json');
const LOTTIE_TARGET = require('../../../../assets/lottie/wired-flat-458-goal-target-hover-hit.json');
const LOTTIE_GROWTH = require('../../../../assets/lottie/wired-flat-161-growth-hover-pinch.json');
const LOTTIE_BULB = require('../../../../assets/lottie/wired-flat-36-bulb-hover-blink.json');
const LOTTIE_REPLAY = require('../../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json');
const LOTTIE_CROSS = require('../../../../assets/lottie/wired-flat-25-error-cross-hover-pinch.json');
const LOTTIE_ARROW = require('../../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');

const TREND_CFG: Record<string, { lottie: number; label: string; color: string }> = {
    improved: { lottie: LOTTIE_GROWTH, label: 'עלייה', color: '#4ade80' },
    stable: { lottie: LOTTIE_TARGET, label: 'יציב', color: '#facc15' },
    declined: { lottie: LOTTIE_CROSS, label: 'ירידה', color: '#f87171' },
};

const GAUGE_RADIUS = 65;
const GAUGE_STROKE = 10;
const NEEDLE_LEN = GAUGE_RADIUS - GAUGE_STROKE - 8;

const SEVERITY_CFG: Record<CreditEventSeverity, { bg: string; border: string; text: string; label: string }> = {
    routine: { bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.3)', text: '#38bdf8', label: 'שגרתי' },
    important: { bg: 'rgba(250,204,21,0.12)', border: 'rgba(250,204,21,0.3)', text: '#facc15', label: 'חשוב' },
    critical: { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.35)', text: '#ef4444', label: 'קריטי' },
};

function getScoreColor(score: number): string {
    if (score >= 850) return '#f59e0b';
    if (score >= 700) return '#22c55e';
    if (score >= 500) return '#facc15';
    return '#ef4444';
}

function scoreToAngle(score: number): number {
    const pct = Math.max(0, Math.min(1, (score - 300) / 700));
    return -90 + pct * 180;
}

/* ------------------------------------------------------------------ */
/*  CreditGauge, semicircle with animated needle and score readout     */
/* ------------------------------------------------------------------ */

function CreditGauge({ score }: { score: number }) {
    const needleAngle = useSharedValue(scoreToAngle(creditScoreConfig.startingScore));
    const color = getScoreColor(score);

    useEffect(() => {
        needleAngle.value = withSpring(scoreToAngle(score), { damping: 20, stiffness: 80 });
    }, [score, needleAngle]);

    const needleAnim = useAnimatedStyle(() => ({
        transform: [{ rotate: `${needleAngle.value}deg` }],
    }));

    return (
        <View style={styles.gaugeWrapper}>
            {/* Clipped to show top semicircle only */}
            <View style={styles.gaugeClip}>
                {/* Background ring */}
                <View style={styles.gaugeRing} />

                {/* Needle, center of this view sits at bottom-center of clip (pivot point) */}
                <Animated.View style={[styles.needlePivot, needleAnim]}>
                    <View style={[styles.needleBar, { backgroundColor: color }]} />
                </Animated.View>

                {/* Pivot dot */}
                <View style={styles.pivotDot} />
            </View>

            {/* Color zone indicators below arc */}
            <View style={styles.zoneRow}>
                <View style={[styles.zoneBlock, { backgroundColor: '#ef4444' }]} />
                <View style={[styles.zoneBlock, { backgroundColor: '#facc15' }]} />
                <View style={[styles.zoneBlock, { backgroundColor: '#22c55e' }]} />
                <View style={[styles.zoneBlock, { backgroundColor: '#f59e0b' }]} />
            </View>

            {/* Score readout */}
            <Text accessibilityLiveRegion="polite" style={[styles.gaugeScore, { color }]}>{score}</Text>
            <Text style={styles.gaugeLabel}>ציון אשראי</Text>

            {/* Range labels */}
            <View style={styles.gaugeRange}>
                <Text style={styles.gaugeRangeText}>300</Text>
                <Text style={styles.gaugeRangeText}>1000</Text>
            </View>
        </View>
    );
}

/* ------------------------------------------------------------------ */
/*  HistoryRail, dots representing past choices                        */
/* ------------------------------------------------------------------ */

function HistoryRail({ history }: { history: { impact: number }[] }) {
    return (
        <View style={styles.historyRail}>
            {history.map((rec, i) => (
                <Animated.View
                    key={i}
                    entering={FadeIn.delay(i * 40)}
                    style={[styles.historyDot, { backgroundColor: rec.impact >= 0 ? '#4ade80' : '#f87171' }]}
                />
            ))}
            {Array.from({ length: creditScoreConfig.totalRounds - history.length }).map((_, i) => (
                <View key={`e-${i}`} style={[styles.historyDot, styles.historyDotEmpty]} />
            ))}
        </View>
    );
}

const SOURCE_ICONS: Record<NotificationSource, { lottie: ReturnType<typeof require>; color: string }> = {
    bank: { lottie: require('../../../../assets/lottie/wired-flat-483-building-hover-blinking.json'), color: '#0369a1' },
    whatsapp: { lottie: require('../../../../assets/lottie/wired-flat-202-chat-hover-oscillate.json'), color: '#25D366' },
    credit_card: { lottie: require('../../../../assets/lottie/wired-flat-983-smart-lock-card-hover-pinch.json'), color: '#7c3aed' },
    bdi: { lottie: require('../../../../assets/lottie/wired-flat-56-document-hover-swipe.json'), color: '#64748b' },
};

function NotificationCard({
    description,
    severity,
    round,
    total,
    senderName,
    sourceType,
}: {
    description: string;
    severity: CreditEventSeverity;
    round: number;
    total: number;
    senderName: string;
    sourceType: NotificationSource;
}) {
    const sev = SEVERITY_CFG[severity];
    const sourceConfig = SOURCE_ICONS[sourceType];

    return (
        <Animated.View entering={FadeIn.duration(250)} style={styles.pushNotification}>
            {/* Round counter pill badge top-right */}
            <View style={styles.roundPill}>
                <Text style={styles.roundPillText}>{round}/{total}</Text>
            </View>

            <View style={styles.pushHeaderRow}>
                <View style={[styles.sourceIconWrapper, { backgroundColor: `${sourceConfig.color}18` }]}>
                    <View accessible={false}><LottieIcon source={sourceConfig.lottie} size={20} /></View>
                </View>
                <Text style={styles.senderText}>{senderName}</Text>

                <View style={{ flex: 1 }} />

                <View style={[styles.sevBadge, { backgroundColor: sev.bg, borderColor: sev.border }]}>
                    <Text style={[styles.sevBadgeText, { color: sev.text }]}>{sev.label}</Text>
                </View>
                <Text style={styles.timeText}>עכשיו</Text>
            </View>

            <View style={styles.pushContent}>
                <Text style={[RTL, styles.pushDesc]}>{description}</Text>
            </View>
        </Animated.View>
    );
}

/* ------------------------------------------------------------------ */
/*  OptionButton, clean white card for each choice                     */
/* ------------------------------------------------------------------ */

function OptionButton({
    option,
    onPress,
    disabled,
    sourceType,
    severity,
}: {
    option: CreditOption;
    onPress: () => void;
    disabled: boolean;
    sourceType: NotificationSource;
    severity: CreditEventSeverity;
}) {
    const shakeX = useSharedValue(0);
    const sourceConfig = SOURCE_ICONS[sourceType];

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: shakeX.value }],
    }));

    const handlePress = useCallback(() => {
        if (disabled) return;
        shakeX.value = withSequence(
            withTiming(-3, { duration: 40 }),
            withTiming(3, { duration: 40 }),
            withTiming(0, { duration: 40 }),
        );
        onPress();
    }, [disabled, onPress, shakeX]);

    return (
        <AnimatedPressable onPress={handlePress} disabled={disabled} accessibilityRole="button" accessibilityLabel={option.label} accessibilityHint="בוחר אפשרות זו עבור אירוע האשראי" accessibilityState={{ disabled }}>
            <Animated.View style={[styles.optionBtn, animStyle]}>
                <View style={styles.optionRow}>
                    <LottieIcon source={sourceConfig.lottie} size={20} />
                    <Text style={[RTL, styles.optionLabel]}>{option.label}</Text>
                </View>
            </Animated.View>
        </AnimatedPressable>
    );
}

/* ------------------------------------------------------------------ */
/*  FloatingNumber, animated score impact that flies upward            */
/* ------------------------------------------------------------------ */

function FloatingNumber({ impact }: { impact: number }) {
    const translateY = useSharedValue(0);
    const opacity = useSharedValue(1);

    useEffect(() => {
        translateY.value = withTiming(-60, { duration: 800 });
        opacity.value = withDelay(600, withTiming(0, { duration: 400 }));
    }, [translateY, opacity]);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
        opacity: opacity.value,
    }));

    const isPositive = impact >= 0;
    const color = isPositive ? '#22c55e' : '#ef4444';
    const label = isPositive ? `+${impact} 📈` : `${impact} 📉`;

    return (
        <Animated.View pointerEvents="none" style={[styles.floatingNumber, animStyle]}>
            <Text style={[styles.floatingNumberText, { color }]}>{label}</Text>
        </Animated.View>
    );
}

/* ------------------------------------------------------------------ */
/*  FlashOverlay, full-screen color flash on score change               */
/* ------------------------------------------------------------------ */

function FlashOverlay({ isCorrect }: { isCorrect: boolean }) {
    const opacity = useSharedValue(0);

    useEffect(() => {
        opacity.value = withTiming(1, { duration: 200 });
    }, [opacity]);

    const animStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    const bgColor = isCorrect ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.15)';

    return (
        <Animated.View pointerEvents="none" style={[styles.flashOverlay, { backgroundColor: bgColor }, animStyle]} />
    );
}

/* ------------------------------------------------------------------ */
/*  ScoreScreen, cinematic results after game completion               */
/* ------------------------------------------------------------------ */

function ScoreScreen({
    score,
    history,
    correctChoices,
    onReplay,
    onFinish,
}: {
    score: CreditScoreScore;
    history: ChoiceRecord[];
    correctChoices: number;
    onReplay: () => void;
    onFinish: () => void;
}) {
    const gradeColor = GRADE_COLORS2[score.grade] ?? GRADE_COLORS2.C;
    const trend = TREND_CFG[score.trend] ?? TREND_CFG.stable;

    return (
        <Animated.View entering={FadeIn.duration(400)} style={receiptStyles.wrapper}>
            <ScrollView contentContainerStyle={receiptStyles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Grade */}
                <Animated.View entering={FadeIn.delay(300)} style={[sim2Styles.gradeContainer, { marginBottom: 4 }]}>
                    <Text style={[sim2Styles.gradeText, { color: gradeColor, fontSize: 36 }]}>{GRADE_HEBREW[score.grade] ?? score.grade}</Text>
                    <Text style={[sim2Styles.gradeLabel, { fontSize: 13 }]}>דירוג אשראי</Text>
                </Animated.View>

                {/* Score Card */}
                <View style={[sim2Styles.scoreCard, { borderColor: gradeColor, shadowColor: gradeColor }]}>
                    <View style={[sim2Styles.scoreCardInner, { padding: 14, gap: 8 }]}>
                        <Text style={[RTL, TYPE2.cardTitle, { fontSize: 14 }]}>דוח ריכוז נתונים, בנק ישראל</Text>
                        <Text style={[receiptStyles.receiptDate, { fontSize: 11 }]}>{new Date().toLocaleDateString('he-IL')}</Text>

                        {/* Gauge on dark strip */}
                        <View style={receiptStyles.gaugeStrip}>
                            <CreditGauge score={score.finalScore} />
                        </View>

                        <View style={[sim2Styles.scoreDivider, { paddingTop: 6 }]} />

                        {/* Stats rows */}
                        <View style={receiptStyles.statsSection}>
                            <View style={receiptStyles.statRow}>
                                <Text style={[sim2Styles.scoreRowValue, { color: gradeColor, fontSize: 15 }]}>{score.finalScore}</Text>
                                <Text style={[RTL, sim2Styles.scoreRowLabel, { fontSize: 13 }]}>ציון סופי</Text>
                            </View>
                            <View style={receiptStyles.statRow}>
                                <Text style={[sim2Styles.scoreRowValue, { color: '#22c55e', fontSize: 15 }]}>{score.peakScore}</Text>
                                <Text style={[RTL, sim2Styles.scoreRowLabel, { fontSize: 13 }]}>שיא</Text>
                            </View>
                            <View style={receiptStyles.statRow}>
                                <Text style={[sim2Styles.scoreRowValue, { color: '#ef4444', fontSize: 15 }]}>{score.lowestScore}</Text>
                                <Text style={[RTL, sim2Styles.scoreRowLabel, { fontSize: 13 }]}>שפל</Text>
                            </View>
                            <View style={receiptStyles.statRow}>
                                <Text style={[sim2Styles.scoreRowValue, { color: trend.color, fontSize: 15 }]}>{trend.label}</Text>
                                <Text style={[RTL, sim2Styles.scoreRowLabel, { fontSize: 13 }]}>מגמה</Text>
                            </View>
                            <View style={receiptStyles.statRow}>
                                <Text style={[sim2Styles.scoreRowValue, { color: SIM2.textSecondary, fontSize: 15 }]}>{correctChoices}/{creditScoreConfig.totalRounds}</Text>
                                <Text style={[RTL, sim2Styles.scoreRowLabel, { fontSize: 13 }]}>בחירות נכונות</Text>
                            </View>
                        </View>

                        <View style={[sim2Styles.scoreDivider, { paddingTop: 6 }]} />

                        {/* Decision line items */}
                        <View style={receiptStyles.decisionsSection}>
                            <Text style={[RTL, TYPE2.cardTitle, { fontSize: 13 }]}>פירוט החלטות</Text>
                            {history.map((rec) => {
                                const event = creditScoreConfig.events.find(e => e.id === rec.eventId);
                                if (!event) return null;
                                const src = SOURCE_ICONS[event.sourceType];
                                const impactColor = rec.impact >= 0 ? '#22c55e' : '#ef4444';
                                const impactText = rec.impact >= 0 ? `+${rec.impact}` : `${rec.impact}`;
                                return (
                                    <View key={rec.eventId} style={receiptStyles.lineItem}>
                                        <LottieIcon source={src.lottie} size={14} />
                                        <Text style={[RTL, receiptStyles.lineLabel, { fontSize: 12 }]} numberOfLines={1}>{event.senderName}</Text>
                                        <Text style={[receiptStyles.lineImpact, { color: impactColor, fontSize: 13 }]}>{impactText}</Text>
                                    </View>
                                );
                            })}
                        </View>

                        <View style={[sim2Styles.scoreDivider, { paddingTop: 6 }]} />

                        {/* Educational takeaway */}
                        <View style={receiptStyles.takeawayBox}>
                            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                <LottieIcon source={LOTTIE_BULB} size={16} />
                                <Text style={[RTL, receiptStyles.takeawayText, { fontSize: 12, lineHeight: 18 }]}>
                                    כל מהלך פיננסי נרשם. תשלום בזמן = ציון שעולה. ערבות = ציון שלך בסיכון
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Actions, pinned at bottom */}
            <View style={[sim2Styles.actionsRow, { marginTop: 4 }]}>
                <AnimatedPressable onPress={onReplay} style={[sim2Styles.replayBtn, { paddingVertical: 12 }]} accessibilityRole="button" accessibilityLabel="שחק שוב" accessibilityHint="מתחיל את הסימולציה מחדש">
                    <View accessible={false}><LottieIcon source={LOTTIE_REPLAY} size={16} /></View>
                    <Text style={[RTL, sim2Styles.replayText, { fontSize: 14 }]}>שחק שוב</Text>
                </AnimatedPressable>
                <AnimatedPressable onPress={onFinish} style={[sim2Styles.continueBtn, { paddingVertical: 12 }]} accessibilityRole="button" accessibilityLabel="המשך" accessibilityHint="ממשיך לשלב הבא">
                    <Text style={[RTL, sim2Styles.continueText, { fontSize: 14 }]}>המשך</Text>
                    <View style={{ position: 'absolute', left: 14 }}>
                        <LottieIcon source={LOTTIE_ARROW} size={20} />
                    </View>
                </AnimatedPressable>
            </View>
        </Animated.View>
    );
}

const receiptStyles = StyleSheet.create({
    wrapper: {
        flex: 1,
        gap: 8,
    },
    scrollContent: {
        paddingBottom: 8,
        gap: 8,
    },
    receiptDate: {
        fontSize: 12,
        fontWeight: '500',
        color: SIM2.textMuted,
        textAlign: 'center',
        marginTop: 2,
    },
    gaugeStrip: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 12,
        paddingVertical: 6,
        marginHorizontal: -4,
        alignItems: 'center',
    },
    statsSection: {
        gap: 4,
    },
    statRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 2,
    },
    decisionsSection: {
        gap: 4,
    },
    lineItem: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 2,
    },
    lineLabel: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: SIM2.textSecondary,
    },
    lineImpact: {
        fontSize: 14,
        fontWeight: '700',
        minWidth: 40,
        textAlign: 'left',
    },
    takeawayBox: {
        backgroundColor: SIM2.warningLight,
        borderRadius: 10,
        padding: 8,
    },
    takeawayText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: SIM2.textSecondary,
        lineHeight: 20,
        textAlign: 'center',
    },
});

/* ------------------------------------------------------------------ */
/*  CreditScoreScreen, main exported component                         */
/* ------------------------------------------------------------------ */

export function CreditScoreScreen({ onComplete }: { onComplete: () => void }) {
    const { state, currentEvent, handleChoice, score, resetGame } = useCreditScore();

    const [showFeedback, setShowFeedback] = useState(false);
    const [lastChoice, setLastChoice] = useState<CreditOption | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const [rewardsGranted, setRewardsGranted] = useState(false);
    const [lastImpact, setLastImpact] = useState<number | null>(null);
    const [floatingKey, setFloatingKey] = useState(0);

    // Grant rewards once on completion
    useEffect(() => {
        if (state.isComplete && !rewardsGranted) {
            setRewardsGranted(true);
            successHaptic();
        }
    }, [state.isComplete, rewardsGranted]);

    // Heavy haptic on critical severity event render
    useEffect(() => {
        if (currentEvent?.severity === 'critical') {
            heavyHaptic();
        }
    }, [currentEvent]);

    const onOptionPress = useCallback(
        (option: CreditOption) => {
            if (showFeedback) return;

            // Milestone detection (before state updates)
            const afterScore = Math.max(300, Math.min(1000, state.currentScore + option.scoreImpact));
            const milestone =
                (state.currentScore < 750 && afterScore >= 750) ||
                (state.currentScore < 800 && afterScore >= 800);

            if (option.isCorrect) {
                successHaptic();
            } else {
                errorHaptic();
                setTimeout(() => heavyHaptic(), 200);
            }

            if (milestone) {
                doubleHeavyHaptic();
                setShowConfetti(true);
            }

            setLastChoice(option);
            setLastImpact(option.scoreImpact);
            setFloatingKey(k => k + 1);
            handleChoice(option);
            setShowFeedback(true);
        },
        [showFeedback, state.currentScore, handleChoice],
    );

    const dismissFeedback = useCallback(() => {
        setShowFeedback(false);
        setLastChoice(null);
        setLastImpact(null);
    }, []);

    // Auto-dismiss feedback after 3 seconds
    useEffect(() => {
        if (!showFeedback) return;
        const timer = setTimeout(dismissFeedback, 3000);
        return () => clearTimeout(timer);
    }, [showFeedback, dismissFeedback]);

    const handleReplay = useCallback(() => {
        resetGame();
        setShowFeedback(false);
        setLastChoice(null);
        setLastImpact(null);
        setRewardsGranted(false);
    }, [resetGame]);

    const CH2_LOTTIE: [ReturnType<typeof require>, ReturnType<typeof require>] = [
        require('../../../../assets/lottie/wired-flat-237-star-rating-hover-pinch.json'),
        require('../../../../assets/lottie/wired-flat-152-bar-chart-arrow-hover-growth.json'),
    ];

    // Game complete, show score screen
    if (state.isComplete && !showFeedback && score) {
        return (
            <SimLottieBackground lottieSources={CH2_LOTTIE} chapterColors={_th2.gradient}>
                {/* Confetti on score reveal */}
                {score.grade === 'S' && <ConfettiExplosion onComplete={() => {}} />}
                <ScoreScreen score={score} history={state.history} correctChoices={state.correctChoices} onReplay={handleReplay} onFinish={onComplete} />
            </SimLottieBackground>
        );
    }

    return (
        <SimLottieBackground lottieSources={CH2_LOTTIE} chapterColors={_th2.gradient}>
            {/* Confetti for milestone */}
            {showConfetti && <ConfettiExplosion onComplete={() => setShowConfetti(false)} />}

            {/* Flash overlay on score change */}
            {lastChoice !== null && (
                <FlashOverlay key={`flash-${floatingKey}`} isCorrect={lastChoice.isCorrect} />
            )}

            {/* Title */}
            <Animated.View entering={FadeInDown.delay(100)}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <View accessible={false}><LottieIcon source={LOTTIE_CHART} size={28} /></View>
                    <Text accessibilityRole="header" style={[RTL, TYPE2.title]}>בנה את הציון</Text>
                </View>
                <Text style={[RTL, TYPE2.subtitle, { marginBottom: 8 }]}>
                    כל בחירה פיננסית משפיעה על ציון האשראי שלך
                </Text>
            </Animated.View>

            {/* Gauge + Floating Score */}
            <View style={styles.gaugeArea}>
                <CreditGauge score={state.currentScore} />
                {lastImpact !== null && (
                    <FloatingNumber key={floatingKey} impact={lastImpact} />
                )}
            </View>

            {/* Event+Options or waiting for feedback dismiss */}
            {showFeedback && lastChoice ? (
                <Pressable
                    style={[StyleSheet.absoluteFill, { zIndex: 999, elevation: 999 }]}
                    onPress={dismissFeedback}
                    accessibilityRole="button"
                    accessibilityLabel="סגור משוב"
                >
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.01)' }} />
                    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }} pointerEvents="none">
                        <SimFeedbackBar
                            isCorrect={lastChoice.isCorrect}
                            message={`${lastChoice.feedback}, ${lastChoice.explanation}`}
                            accentColor={_th2.primary}
                        />
                    </View>
                </Pressable>
            ) : currentEvent ? (
                <>
                    <View style={styles.eventArea}>
                        <Animated.View key={`ev-${state.round}`} entering={FadeIn.duration(250)}>
                            <NotificationCard
                                description={currentEvent.description}
                                severity={currentEvent.severity}
                                round={state.round + 1}
                                total={creditScoreConfig.totalRounds}
                                senderName={currentEvent.senderName}
                                sourceType={currentEvent.sourceType}
                            />
                        </Animated.View>
                    </View>

                    <View style={styles.optionsArea}>
                        {currentEvent.options.map((opt) => (
                            <OptionButton
                                key={opt.id}
                                option={opt}
                                onPress={() => onOptionPress(opt)}
                                disabled={showFeedback}
                                sourceType={currentEvent.sourceType}
                                severity={currentEvent.severity}
                            />
                        ))}
                    </View>
                </>
            ) : null}

            {/* History rail */}
            <HistoryRail history={state.history} />

            {/* Feedback bar moved inline above */}
        </SimLottieBackground>
    );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
    /* ── Gauge ── */
    gaugeWrapper: { alignItems: 'center', marginBottom: 8 },
    gaugeClip: {
        width: GAUGE_RADIUS * 2,
        height: GAUGE_RADIUS + 4,
        overflow: 'hidden',
    },
    gaugeRing: {
        width: GAUGE_RADIUS * 2,
        height: GAUGE_RADIUS * 2,
        borderRadius: GAUGE_RADIUS,
        borderWidth: GAUGE_STROKE,
        borderColor: SIM2.trackBorder,
    },
    zoneRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: GAUGE_RADIUS * 2,
        paddingHorizontal: 4,
        marginTop: 2,
    },
    zoneBlock: {
        flex: 1,
        height: 4,
        borderRadius: 2,
        marginHorizontal: 2,
        opacity: 0.6,
    },
    needlePivot: {
        position: 'absolute',
        width: 6,
        height: NEEDLE_LEN * 2,
        bottom: -NEEDLE_LEN,
        left: GAUGE_RADIUS - 3,
        alignItems: 'center',
    },
    needleBar: {
        width: 3,
        height: NEEDLE_LEN,
        borderRadius: 1.5,
    },
    pivotDot: {
        position: 'absolute',
        bottom: -5,
        left: GAUGE_RADIUS - 5,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#ffffff',
    },
    gaugeScore: { fontSize: 28, fontWeight: '900', marginTop: 2, color: '#ffffff', ...SHADOW_STRONG },
    gaugeLabel: { fontSize: 12, color: SIM2.textOnGradientMuted, fontWeight: '700', marginTop: -2, ...SHADOW_LIGHT },
    gaugeRange: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: GAUGE_RADIUS * 2,
        marginTop: 2,
    },
    gaugeRangeText: { fontSize: 14, color: SIM2.textOnGradientMuted, fontWeight: '600', ...SHADOW_LIGHT },

    /* ── Floating score number ── */
    gaugeArea: { alignItems: 'center' },
    floatingNumber: {
        position: 'absolute',
        bottom: 8,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    floatingNumberText: {
        fontSize: 28,
        fontWeight: '900',
        ...SHADOW_STRONG,
        textShadowRadius: 6,
    },

    /* ── Flash overlay ── */
    flashOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },

    /* ── History rail ── */
    historyRail: {
        flexDirection: 'row-reverse',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 8,
        flexShrink: 0,
    },
    historyDot: { width: 10, height: 10, borderRadius: 5 },
    historyDotEmpty: { backgroundColor: 'rgba(59,130,246,0.1)' },

    /* ── Push Notification Event Card (white card style) ── */
    eventArea: { justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 16 },
    pushNotification: {
        backgroundColor: SIM2.cardBg,
        borderRadius: 24,
        padding: 16,
        paddingTop: 20,
        borderWidth: 1.5,
        borderColor: SIM2.cardBorder,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 10,
    },
    pushHeaderRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    sourceIconWrapper: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    senderText: {
        fontSize: 15,
        fontWeight: '800',
        color: SIM2.textPrimary,
    },
    timeText: {
        fontSize: 13,
        color: SIM2.textMuted,
        fontWeight: '500',
    },
    pushContent: {
        paddingVertical: 10,
    },
    roundPill: {
        position: 'absolute',
        top: 10,
        left: 12,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
        zIndex: 1,
    },
    roundPillText: {
        fontSize: 11,
        fontWeight: '700',
        color: SIM2.textMuted,
    },
    pushDesc: {
        fontSize: 16,
        fontWeight: '700',
        color: SIM2.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },

    /* ── Severity badge ── */
    sevBadge: {
        borderRadius: 8,
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 3,
        marginLeft: 8,
    },
    sevBadgeText: { fontSize: 13, fontWeight: '700' },

    /* ── Option buttons (clean white) ── */
    optionsArea: { gap: 10, marginBottom: 12, paddingHorizontal: 16 },
    optionBtn: {
        borderRadius: 14,
        backgroundColor: SIM2.cardBg,
        borderWidth: 1.5,
        borderColor: SIM2.cardBorder,
        paddingVertical: 14,
        paddingHorizontal: 18,
        minHeight: 48,
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    optionRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
    },
    optionLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: SIM2.textPrimary, textAlign: 'right' },

    /* ── Continue button (feedback phase) ── */
    continueBtn: {
        alignSelf: 'center',
        borderRadius: 14,
        backgroundColor: SIM2.btnPrimary,
        borderWidth: 0,
        paddingVertical: 12,
        paddingHorizontal: 32,
        justifyContent: 'center',
    },
    continueBtnText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
});
