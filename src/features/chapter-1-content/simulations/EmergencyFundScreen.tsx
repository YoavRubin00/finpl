import { createAudioPlayer } from 'expo-audio';
import { useState, useCallback, useEffect } from 'react';
import { Image as ExpoImage } from 'expo-image';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FINN_STANDARD } from '../../retention-loops/finnMascotConfig';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    FadeIn,
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { SimLottieBackground } from '../../../components/ui/SimLottieBackground';
import { GlowCard } from '../../../components/ui/GlowCard';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { getChapterTheme } from '../../../constants/theme';
import { LottieIcon } from '../../../components/ui/LottieIcon';
import { successHaptic, errorHaptic, heavyHaptic } from '../../../utils/haptics';
import { useEmergencyFund, MonthResult } from './useEmergencyFund';
import { emergencyFundConfig, savingsOptions, SavingsOption, FUND_TARGET } from './emergencyFundData';
import type { EmergencyFundScore, EmergencyFundGrade, EmergencyEvent } from './emergencyFundTypes';
import { SIM, GRADE_COLORS, GRADE_HEBREW, SHADOW_STRONG, RTL, TYPE, simStyles } from './simTheme';


/* ── Chapter theme (ocean-blue) — kept only for gradient ── */
const _th1 = getChapterTheme('chapter-1');

/* ── Lottie assets ── */
const LOTTIE_SHIELD = require('../../../../assets/lottie/wired-flat-457-shield-security-hover-pinch.json');
const LOTTIE_BANK = require('../../../../assets/lottie/wired-flat-483-building-hover-blinking.json');
const LOTTIE_MONEY = require('../../../../assets/lottie/wired-flat-413-money-bag-hover-shake.json');
const LOTTIE_GROWTH = require('../../../../assets/lottie/wired-flat-161-growth-hover-pinch.json');
const LOTTIE_DECREASE = require('../../../../assets/lottie/wired-flat-162-decrease-hover-pinch.json');
const LOTTIE_CALENDAR = require('../../../../assets/lottie/wired-flat-28-calendar-hover-pinch.json');
const LOTTIE_HEART = require('../../../../assets/lottie/wired-flat-20-love-heart-hover-heartbeat.json');
const LOTTIE_CHECK = require('../../../../assets/lottie/wired-flat-24-approved-checked-hover-pinch.json');
const LOTTIE_REPLAY = require('../../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json');
const LOTTIE_BELL = require('../../../../assets/lottie/wired-flat-193-bell-notification-hover-ring.json');
const LOTTIE_ARROW = require('../../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');

const SEVERITY_COLORS: Record<string, string> = {
    minor: '#facc15',
    major: '#f97316',
    catastrophic: '#f97316',
};

/* ------------------------------------------------------------------ */
/*  ShieldMeter — emergency fund "shield" bar at top                    */
/* ------------------------------------------------------------------ */

function ShieldMeter({
    fundBalance,
    maxFund,
}: {
    fundBalance: number;
    maxFund: number;
}) {
    const safeMax = Math.max(maxFund, 1);
    const pct = Math.max(0, Math.min(100, (fundBalance / safeMax) * 100));
    const animWidth = useSharedValue(pct);

    useEffect(() => {
        animWidth.value = withSpring(pct, { damping: 20, stiffness: 120 });
    }, [pct, animWidth]);

    const barStyle = useAnimatedStyle(() => ({
        width: `${animWidth.value}%` as unknown as number,
    }));

    const barColor = pct > 60 ? '#4ade80' : pct > 30 ? '#facc15' : '#f97316';

    return (
        <View style={styles.shieldContainer}>
            <View style={styles.shieldHeader}>
                <LottieIcon source={LOTTIE_SHIELD} size={22} />
                <Text style={[RTL, styles.shieldLabel]}>קרן חירום</Text>
                <Text style={[styles.shieldValue, { color: barColor }]} accessibilityLiveRegion="polite">
                    {'\u20AA'}{fundBalance.toLocaleString()}
                </Text>
            </View>
            <View style={styles.shieldTrack}>
                <Animated.View
                    style={[styles.shieldFill, barStyle, { backgroundColor: barColor }]}
                />
            </View>
            <Text style={[RTL, { fontSize: 10, color: 'rgba(224,242,254,0.5)', marginTop: 1, fontWeight: '600' }]}>
                יעד: {'\u20AA'}{FUND_TARGET.toLocaleString()} (3 חודשי הוצאות)
            </Text>
        </View>
    );
}

/* ── HappinessMeter — lifestyle satisfaction bar ── */
function HappinessMeter({ happiness }: { happiness: number }) {
    const emoji = happiness >= 7 ? '😊' : happiness >= 4 ? '😐' : '😔';
    const color = happiness >= 7 ? '#4ade80' : happiness >= 4 ? '#facc15' : '#f97316';
    const pct = (happiness / 10) * 100;

    return (
        <View style={{ marginBottom: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                <Text style={{ fontSize: 16 }}>{emoji}</Text>
                <Text style={[RTL, { ...TYPE.gradientLabel, fontSize: 13, flex: 1 }]}>
                    איכות חיים
                </Text>
                <Text style={{ ...TYPE.gradientValue, fontSize: 13, color }}>{happiness}/10</Text>
            </View>
            <View style={{ height: 6, backgroundColor: SIM.trackBg, borderRadius: 3, overflow: 'hidden', borderWidth: 1, borderColor: SIM.trackBorder }}>
                <View style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: 3 }} />
            </View>
        </View>
    );
}

/* ------------------------------------------------------------------ */
/*  EmergencyEventCard — dramatic emergency event display               */
/* ------------------------------------------------------------------ */

function EmergencyEventCard({ event }: { event: EmergencyEvent }) {
    const severityColor = SEVERITY_COLORS[event.severity] ?? '#f97316';
    const severityLabel =
        event.severity === 'catastrophic' ? 'אסון!' :
        event.severity === 'major' ? 'חירום גדול' : 'חירום קטן';

    return (
        <Animated.View entering={FadeIn.duration(300)}>
            <View style={{ backgroundColor: SIM.cardBg, borderRadius: 20, borderWidth: 1.5, borderColor: SIM.dangerBorder, shadowColor: severityColor, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 }}>
                <View style={styles.eventCardInner}>
                    <Text style={styles.eventEmoji}>{event.emoji}</Text>
                    <Text style={[RTL, styles.eventName]}>{event.name}</Text>
                    <View style={[styles.severityBadge, { borderColor: severityColor, backgroundColor: `${severityColor}15` }]}>
                        <Text style={[RTL, { fontSize: 15, fontWeight: '700', color: severityColor }]}>
                            {severityLabel}
                        </Text>
                    </View>
                    {event.cost > 0 && (
                        <Text style={[styles.eventCost, { color: severityColor }]}>
                            {'\u20AA'}{event.cost.toLocaleString()}
                        </Text>
                    )}
                    {event.cost === 0 && (
                        <Text style={[RTL, styles.eventCostNote]}>
                            אין הכנסה לחודשיים!
                        </Text>
                    )}
                </View>
            </View>
        </Animated.View>
    );
}

/* ------------------------------------------------------------------ */
/*  ShieldEffect — shield absorb or break animation                     */
/* ------------------------------------------------------------------ */

function ShieldEffect({ absorbed }: { absorbed: boolean }) {
    return (
        <Animated.View
            entering={FadeIn.duration(200)}
            style={[
                styles.shieldEffect,
                {
                    backgroundColor: absorbed
                        ? 'rgba(74,222,128,0.15)'
                        : 'rgba(251,191,36,0.15)',
                    borderColor: absorbed
                        ? 'rgba(74,222,128,0.4)'
                        : 'rgba(251,191,36,0.4)',
                },
            ]}
        >
            <LottieIcon source={absorbed ? LOTTIE_SHIELD : LOTTIE_HEART} size={28} />
            <Text
                style={[
                    RTL,
                    styles.shieldEffectText,
                    { color: absorbed ? '#4ade80' : '#fbbf24' },
                ]}
            >
                {absorbed ? 'הקרן ספגה את החירום!' : 'הקרן לא מספיקה — נדרשת הלוואה!'}
            </Text>
        </Animated.View>
    );
}

/* ------------------------------------------------------------------ */
/*  LoanPopup — warning about forced loan                               */
/* ------------------------------------------------------------------ */

function LoanPopup({ loanAmount }: { loanAmount: number }) {
    return (
        <Animated.View entering={FadeInUp.duration(300)} style={styles.loanPopup}>
            <LottieIcon source={LOTTIE_BANK} size={36} />
            <Text style={[RTL, styles.loanTitle]}>הלוואה כפויה!</Text>
            <Text style={[RTL, styles.loanAmount]}>{'\u20AA'}{loanAmount.toLocaleString()}</Text>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                <LottieIcon source={LOTTIE_DECREASE} size={18} />
                <Text style={[RTL, styles.loanWarning]}>
                    ריבית 12% שנתית — כל חודש ההלוואה גדלה!
                </Text>
            </View>
        </Animated.View>
    );
}

/* ------------------------------------------------------------------ */
/*  SavingsChoiceButtons — 3 savings rate options                       */
/* ------------------------------------------------------------------ */

function SavingsChoiceButtons({
    options,
    onChoose,
    isLayoff,
}: {
    options: SavingsOption[];
    onChoose: (option: SavingsOption) => void;
    isLayoff: boolean;
}) {
    if (isLayoff) {
        return (
            <Animated.View entering={FadeIn.duration(300)} style={{ gap: 12 }}>
                <View style={styles.layoffCard}>
                    <LottieIcon source={LOTTIE_BELL} size={32} />
                    <Text style={[RTL, styles.layoffTitle]}>חודש פיטורים!</Text>
                    <Text style={[RTL, styles.layoffDescription]}>
                        אין הכנסה החודש. ההוצאות ממומנות מהקרן או מהלוואה.
                    </Text>
                </View>
                <AnimatedPressable
                    onPress={() => onChoose(options[1])}
                    accessibilityRole="button"
                    accessibilityLabel="המשך"
                    accessibilityHint="ממשיך לחודש הבא"
                    style={{
                        borderRadius: 16,
                        borderWidth: 1.5,
                        borderColor: SIM.btnPrimaryBorder,
                        backgroundColor: SIM.btnPrimary,
                        paddingVertical: 16,
                        paddingHorizontal: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Text style={[RTL, { fontSize: 17, fontWeight: '800', color: '#fff' }]}>
                        המשך
                    </Text>
                    <View style={{ position: 'absolute', left: 16 }}>
                        <LottieIcon source={LOTTIE_ARROW} size={22} />
                    </View>
                </AnimatedPressable>
            </Animated.View>
        );
    }

    return (
        <View style={styles.choicesContainer}>
            <Text style={[RTL, styles.choicePrompt]}>
                כמה תחסוך החודש?
            </Text>
            {options.map((option) => {
                const color =
                    option.choice === 'save-more'
                        ? { bg: SIM.successLight, border: SIM.successBorder, text: SIM.success }
                        : option.choice === 'balanced'
                          ? { bg: SIM.warningLight, border: SIM.warningBorder, text: SIM.warning }
                          : { bg: SIM.dangerLight, border: SIM.dangerBorder, text: SIM.danger };

                return (
                    <AnimatedPressable
                        key={option.choice}
                        onPress={() => onChoose(option)}
                        accessibilityRole="button"
                        accessibilityLabel={option.label}
                        accessibilityHint="בחר אפשרות חיסכון זו לחודש הנוכחי"
                    >
                        <View
                            style={[
                                simStyles.optionBtn,
                                { backgroundColor: color.bg, borderColor: color.border, paddingVertical: 8, minHeight: 0 },
                            ]}
                        >
                            <View style={styles.choiceHeader}>
                                <Text style={{ fontSize: 18 }}>{option.emoji}</Text>
                                <Text style={[RTL, { fontSize: 14, fontWeight: '800', color: color.text }]}>
                                    {option.label}
                                </Text>
                                <Text style={{ fontSize: 15, fontWeight: '900', color: color.text, marginRight: 'auto' }}>
                                    {'\u20AA'}{option.savingsAmount.toLocaleString()}
                                </Text>
                            </View>
                            <Text style={[RTL, styles.choiceDescription]}>
                                {option.description}
                            </Text>
                            <Text style={[RTL, { fontSize: 12, color: option.happinessImpact > 0 ? SIM.success : option.happinessImpact < 0 ? SIM.danger : SIM.textMuted, fontWeight: '700' }]}>
                                {option.happinessImpact > 0 ? `+${option.happinessImpact} איכות חיים 😊` : option.happinessImpact < 0 ? `${option.happinessImpact} איכות חיים 😔` : 'ניטרלי ⚖️'}
                            </Text>
                        </View>
                    </AnimatedPressable>
                );
            })}
        </View>
    );
}

/* ------------------------------------------------------------------ */
/*  MonthResultFeedback — feedback after processing a month             */
/* ------------------------------------------------------------------ */

function MonthResultFeedback({
    result,
    onDismiss,
}: {
    result: MonthResult;
    onDismiss: () => void;
}) {
    const hasEvent = result.event !== null;

    useEffect(() => {
        const t = setTimeout(onDismiss, 2500);
        return () => clearTimeout(t);
    }, [onDismiss]);

    // Build concise summary text
    const lines: string[] = [];
    if (result.savingsAdded > 0) lines.push(`חסכת \u20AA${result.savingsAdded.toLocaleString()} החודש`);
    if (hasEvent && result.event) {
        lines.push(result.absorbed
            ? `הקרן ספגה את ה${result.event.name} בהצלחה!`
            : `הקרן לא הספיקה — הלוואה של \u20AA${result.loanTaken.toLocaleString()}`);
    }
    if (result.expenseShortfall > 0 && !hasEvent) lines.push(`חסר \u20AA${result.expenseShortfall.toLocaleString()} — נלקחה הלוואה`);
    if (result.happinessEvent) lines.push(`${result.happinessEvent.emoji} ${result.happinessEvent.text}`);
    const summaryText = lines.join('\n');
    const isGood = result.absorbed || (!hasEvent && result.loanTaken === 0);

    return (
        <Pressable onPress={onDismiss} style={StyleSheet.absoluteFill}>
            <View style={{ flex: 1 }} />
            <Animated.View entering={FadeInUp.duration(300)} style={{
                backgroundColor: '#ffffff',
                borderTopLeftRadius: 22,
                borderTopRightRadius: 22,
                paddingHorizontal: 18,
                paddingVertical: 16,
                paddingBottom: 28,
                flexDirection: 'row-reverse',
                alignItems: 'center',
                gap: 12,
                shadowColor: '#0c4a6e',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
                elevation: 8,
            }}>
                <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 48, height: 48, flexShrink: 0 }} contentFit="contain" />
                <View style={{ flex: 1 }}>
                    <Text style={[RTL, { fontSize: 14, fontWeight: '700', color: isGood ? '#0369a1' : '#b45309', lineHeight: 21 }]}>
                        {summaryText}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#64748b', marginTop: 4, textAlign: 'right', writingDirection: 'rtl' }}>
                        לחץ להמשך
                    </Text>
                </View>
            </Animated.View>
        </Pressable>
    );
}

/* ------------------------------------------------------------------ */
/*  StatsBar — bottom stats display                                     */
/* ------------------------------------------------------------------ */

function StatsBar({
    month,
    totalMonths,
    loansTaken,
    loanInterest,
}: {
    month: number;
    totalMonths: number;
    loansTaken: number;
    loanInterest: number;
}) {
    return (
        <View style={styles.statsBar}>
            <View style={styles.statItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View accessible={false}><LottieIcon source={LOTTIE_CALENDAR} size={22} /></View>
                    <Text style={styles.statValue} accessibilityLiveRegion="polite">{month}/{totalMonths}</Text>
                </View>
                <Text style={styles.statLabel}>חודש</Text>
            </View>
            <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: loansTaken > 0 ? '#fbbf24' : '#4ade80' }]} accessibilityLiveRegion="polite">
                    {loansTaken}
                </Text>
                <Text style={styles.statLabel}>הלוואות</Text>
            </View>
            <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: loanInterest > 0 ? '#fbbf24' : '#4ade80' }]} accessibilityLiveRegion="polite">
                    {'\u20AA'}{loanInterest.toLocaleString()}
                </Text>
                <Text style={styles.statLabel}>ריביות</Text>
            </View>
        </View>
    );
}

/* ------------------------------------------------------------------ */
/*  ScoreScreen — end-game summary                                      */
/* ------------------------------------------------------------------ */

function ScoreScreen({
    score,
    loansTaken,
    onReplay,
    onFinish,
}: {
    score: EmergencyFundScore;
    loansTaken: number;
    onReplay: () => void;
    onFinish: () => void;
}) {
    const gradeColor = GRADE_COLORS[score.grade] ?? '#ffffff';

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
            <View style={[simStyles.scoreCard, { borderColor: gradeColor, shadowColor: gradeColor }]}>
                <View style={simStyles.scoreCardInner}>
                    <Text style={[RTL, TYPE.cardTitle, { marginBottom: 2 }]}>
                        סיכום 12 חודשים:
                    </Text>

                    <View style={simStyles.scoreRow}>
                        <View style={simStyles.scoreRowLeft}>
                            <LottieIcon source={LOTTIE_SHIELD} size={24} />
                            <Text style={[RTL, simStyles.scoreRowLabel]}>
                                יתרת קרן חירום
                            </Text>
                        </View>
                        <Text style={[simStyles.scoreRowValue, { color: '#4ade80' }]}>
                            {'\u20AA'}{score.fundFinalBalance.toLocaleString()}
                        </Text>
                    </View>

                    <View style={simStyles.scoreRow}>
                        <View style={simStyles.scoreRowLeft}>
                            <LottieIcon source={LOTTIE_CHECK} size={24} />
                            <Text style={[RTL, simStyles.scoreRowLabel]}>
                                חירומים שנספגו
                            </Text>
                        </View>
                        <Text style={[simStyles.scoreRowValue, { color: '#22c55e' }]}>
                            {score.eventsAbsorbed}/{emergencyFundConfig.events.length}
                        </Text>
                    </View>

                    <View style={simStyles.scoreRow}>
                        <View style={simStyles.scoreRowLeft}>
                            <LottieIcon source={LOTTIE_BANK} size={24} />
                            <Text style={[RTL, simStyles.scoreRowLabel]}>
                                הלוואות שנלקחו
                            </Text>
                        </View>
                        <Text style={[simStyles.scoreRowValue, { color: loansTaken > 0 ? '#fbbf24' : '#4ade80' }]}>
                            {loansTaken}
                        </Text>
                    </View>

                    <View style={simStyles.scoreRow}>
                        <View style={simStyles.scoreRowLeft}>
                            <LottieIcon source={LOTTIE_GROWTH} size={24} />
                            <Text style={[RTL, simStyles.scoreRowLabel]}>
                                ריבית ששולמה
                            </Text>
                        </View>
                        <Text style={[simStyles.scoreRowValue, { color: score.totalLoanInterest > 0 ? '#fbbf24' : '#4ade80' }]}>
                            {'\u20AA'}{score.totalLoanInterest.toLocaleString()}
                        </Text>
                    </View>

                    <View style={simStyles.scoreRow}>
                        <View style={simStyles.scoreRowLeft}>
                            <LottieIcon source={LOTTIE_HEART} size={24} />
                            <Text style={[RTL, simStyles.scoreRowLabel]}>
                                איכות חיים
                            </Text>
                        </View>
                        <Text style={[simStyles.scoreRowValue, { color: score.happiness >= 5 ? '#4ade80' : '#f97316' }]}>
                            {score.happiness}/10 {score.happiness >= 7 ? '😊' : score.happiness >= 4 ? '😐' : '😔'}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Actions */}
            <View style={simStyles.actionsRow}>
                <AnimatedPressable onPress={onReplay} style={simStyles.replayBtn} accessibilityRole="button" accessibilityLabel="שחק שוב" accessibilityHint="מתחיל את הסימולציה מחדש">
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                        <View accessible={false}><LottieIcon source={LOTTIE_REPLAY} size={20} /></View>
                        <Text style={[RTL, simStyles.replayText]}>שחק שוב</Text>
                    </View>
                </AnimatedPressable>

                <AnimatedPressable onPress={onFinish} style={simStyles.continueBtn} accessibilityRole="button" accessibilityLabel="המשך" accessibilityHint="ממשיך לשלב הבא">
                    <Text style={[RTL, simStyles.continueText]}>המשך</Text>
                    <View style={{ position: 'absolute', left: 14 }}>
                        <View accessible={false}><LottieIcon source={LOTTIE_ARROW} size={20} /></View>
                    </View>
                </AnimatedPressable>
            </View>
        </Animated.View>
    );
}

/* ------------------------------------------------------------------ */
/*  EmergencyFundScreen — main exported component                       */
/* ------------------------------------------------------------------ */

/** Mid-game grade indicator — shows current trajectory */
function getMidGameGrade(missed: number, interest: number, happiness: number): { label: string; color: string } {
    if (missed === 0 && interest === 0 && happiness >= 4) return { label: 'מסלול S', color: '#ffffff' };
    if (missed === 0 && interest === 0) return { label: 'מסלול A', color: '#22c55e' };
    if (missed <= 1) return { label: 'מסלול B', color: '#38bdf8' };
    if (missed <= 2) return { label: 'מסלול C', color: '#f59e0b' };
    return { label: 'מסלול F', color: '#f97316' };
}

export function EmergencyFundScreen({ onComplete }: { onComplete: () => void }) {
    const {
        state,
        isLayoffMonth,
        nextMonthHasEvent,
        lastMonthResult,
        handleSavingsChoice,
        score,
        resetGame,
    } = useEmergencyFund(emergencyFundConfig);

    
    useEffect(() => {
        const player = createAudioPlayer({ uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/audio/sims/sim-emergency-fund.mp3' });
        player.play();
        return () => {
            player.pause();
            player.remove();
        };
    }, []);
const [showBriefing, setShowBriefing] = useState(true);
    const [showFeedback, setShowFeedback] = useState(false);
    const [rewardsGranted, setRewardsGranted] = useState(false);

    // Track max fund balance for shield meter scaling
    const [maxFundSeen, setMaxFundSeen] = useState(1);
    useEffect(() => {
        if (state.fundBalance > maxFundSeen) {
            setMaxFundSeen(state.fundBalance);
        }
    }, [state.fundBalance, maxFundSeen]);

    // A reasonable "target" for the shield meter: 3 months of expenses
    const shieldTarget = Math.max(emergencyFundConfig.monthlyExpenses * 3, maxFundSeen);

    // Grant XP + coins when game completes
    useEffect(() => {
        if (state.isComplete && !rewardsGranted) {
            setRewardsGranted(true);
            successHaptic();
        }
    }, [state.isComplete, rewardsGranted]);

    const onSavingsChoose = useCallback(
        (option: SavingsOption) => {
            if (state.isComplete) return;

            heavyHaptic();
            handleSavingsChoice(option.choice);
            setShowFeedback(true);
        },
        [state.isComplete, handleSavingsChoice],
    );

    const dismissFeedback = useCallback(() => {
        if (lastMonthResult) {
            // Play appropriate haptic based on result
            if (lastMonthResult.event) {
                if (lastMonthResult.absorbed) {
                    successHaptic();
                } else {
                    errorHaptic();
                }
            }
        }
        setShowFeedback(false);
    }, [lastMonthResult]);

    const handleReplay = useCallback(() => {
        resetGame();
        setShowBriefing(false);
        setShowFeedback(false);
        setRewardsGranted(false);
        setMaxFundSeen(1);
    }, [resetGame]);

    return (
        <SimLottieBackground
            lottieSources={[
                require('../../../../assets/lottie/wired-flat-413-money-bag-hover-shake.json'),
                require('../../../../assets/lottie/wired-flat-457-shield-security-hover-pinch.json'),
            ]}
            chapterColors={_th1.gradient}
        >
        <View style={{ flex: 1, paddingBottom: 12 }}>
            {/* Title — compact */}
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
                <LottieIcon source={LOTTIE_SHIELD} size={20} />
                <Text style={[RTL, { fontSize: 16, fontWeight: '900', color: '#e0f2fe' }]} accessibilityRole="header">טרמפולינה</Text>
            </View>

            {/* Briefing phase */}
            {showBriefing && !state.isComplete && (
                <Animated.View entering={FadeInDown.delay(100)} style={{ flex: 1, justifyContent: 'center', gap: 14 }}>
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 18, padding: 18, gap: 10 }}>
                        <Text style={[RTL, { fontSize: 17, fontWeight: '800', color: '#e0f2fe', lineHeight: 26 }]}>
                            12 חודשים לבנות קרן חירום.{'\n'}יעד: {'\u20AA'}{FUND_TARGET.toLocaleString()}
                        </Text>
                        <Text style={[RTL, { fontSize: 13, fontWeight: '600', color: 'rgba(224,242,254,0.7)', lineHeight: 20 }]}>
                            כל חודש תבחר כמה לחסוך. הפתעות יקרות עלולות לפגוע — ואם הקרן לא מספיקה, תיקח הלוואה בריבית 12%.
                        </Text>
                    </View>
                    <Pressable
                        onPress={() => setShowBriefing(false)}
                        style={{ backgroundColor: '#0ea5e9', borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderBottomWidth: 4, borderBottomColor: '#0284c7' }}
                    >
                        <Text style={{ fontSize: 17, fontWeight: '900', color: '#fff' }}>התחל</Text>
                    </Pressable>
                </Animated.View>
            )}

            {/* Gameplay phase */}
            {!state.isComplete && !showBriefing && (
                <>
                    {/* Shield meter */}
                    <ShieldMeter
                        fundBalance={state.fundBalance}
                        maxFund={shieldTarget}
                    />

                    {/* Happiness meter */}
                    <HappinessMeter happiness={state.happiness} />

                    {/* Stats bar */}
                    <StatsBar
                        month={state.month}
                        totalMonths={emergencyFundConfig.totalMonths}
                        loansTaken={state.loansTaken}
                        loanInterest={state.loanInterest}
                    />

                    {/* Feedback phase */}
                    {showFeedback && lastMonthResult ? (
                        <MonthResultFeedback
                            result={lastMonthResult}
                            onDismiss={dismissFeedback}
                        />
                    ) : (
                        /* Choice phase */
                        <View style={{ justifyContent: 'center', paddingVertical: 2 }}>
                            <Animated.View
                                key={`month-${state.month}`}
                                entering={FadeIn.duration(250)}
                            >
                                <GlowCard chapterGlow={_th1.glow} style={{ backgroundColor: SIM.cardBg, padding: 0 }}>
                                    <SavingsChoiceButtons
                                        options={savingsOptions}
                                        onChoose={onSavingsChoose}
                                        isLayoff={isLayoffMonth}
                                    />
                                </GlowCard>
                            </Animated.View>
                        </View>
                    )}
                </>
            )}

            {/* Score screen */}
            {state.isComplete && score && (
                <ScoreScreen
                    score={score}
                    loansTaken={state.loansTaken}
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
    /* Shield meter */
    shieldContainer: {
        marginBottom: 4,
    },
    shieldHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 2,
    },
    shieldLabel: {
        ...TYPE.gradientLabel,
        flex: 1,
    },
    shieldValue: {
        ...TYPE.gradientValue,
    },
    shieldTrack: {
        height: 8,
        backgroundColor: SIM.trackBg,
        borderRadius: 4,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: SIM.trackBorder,
    },
    shieldFill: {
        height: '100%',
        borderRadius: 6,
    },
    /* Emergency event card */
    eventCardInner: {
        padding: 18,
        alignItems: 'center',
        gap: 8,
    },
    eventEmoji: {
        fontSize: 34,
    },
    eventName: {
        fontSize: 18,
        fontWeight: '800',
        color: SIM.textPrimary,
        textAlign: 'center',
    },
    severityBadge: {
        borderRadius: 8,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    eventCost: {
        fontSize: 22,
        fontWeight: '900',
    },
    eventCostNote: {
        fontSize: 16,
        fontWeight: '700',
        color: '#f97316',
        textAlign: 'center',
    },
    /* Shield effect */
    shieldEffect: {
        borderRadius: 16,
        borderWidth: 1.5,
        padding: 14,
        alignItems: 'center',
        gap: 6,
    },
    shieldEffectText: {
        fontSize: 16,
        fontWeight: '800',
        textShadowColor: 'rgba(0,0,0,0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    /* Loan popup */
    loanPopup: {
        backgroundColor: 'rgba(251,191,36,0.08)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(251,191,36,0.3)',
        padding: 12,
        alignItems: 'center',
        gap: 4,
    },
    loanTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#fbbf24',
        textAlign: 'center',
    },
    loanAmount: {
        fontSize: 22,
        fontWeight: '900',
        color: '#f97316',
    },
    loanWarning: {
        fontSize: 15,
        fontWeight: '600',
        color: SIM.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    /* Savings choice buttons */
    choicesContainer: {
        gap: 6,
    },
    choicePrompt: {
        fontSize: 15,
        fontWeight: '800',
        color: SIM.textPrimary,
        marginBottom: 2,
        textAlign: 'center',
    },
    choiceHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 2,
    },
    choiceDescription: {
        fontSize: 13,
        color: SIM.textSecondary,
        fontWeight: '500',
        lineHeight: 18,
    },
    /* Layoff card */
    layoffCard: {
        backgroundColor: 'rgba(251,191,36,0.08)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(251,191,36,0.3)',
        padding: 18,
        alignItems: 'center',
        gap: 6,
    },
    layoffTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#fbbf24',
        textAlign: 'center',
    },
    layoffDescription: {
        fontSize: 15,
        fontWeight: '600',
        color: SIM.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    layoffButton: {
        alignSelf: 'center',
        marginTop: 8,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(251,191,36,0.4)',
        backgroundColor: 'rgba(251,191,36,0.15)',
        paddingVertical: 12,
        paddingHorizontal: 32,
    },
    /* Month result feedback */
    resultRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: SIM.trackBg,
        borderRadius: 12,
        padding: 12,
    },
    resultText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#ffffff',
        flex: 1,
        ...SHADOW_STRONG,
    },
    /* Stats bar */
    statsBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: SIM.cardBg,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: SIM.cardBorder,
        paddingVertical: 4,
        marginBottom: 4,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 15,
        fontWeight: '900',
        color: SIM.textPrimary,
    },
    statLabel: {
        fontSize: 12,
        color: SIM.textSecondary,
        fontWeight: '600',
        marginTop: 1,
    },
    /* Continue / feedback */
    continueButton: {
        alignSelf: 'center',
        marginTop: 10,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: SIM.btnPrimaryBorder,
        backgroundColor: SIM.btnPrimary,
        paddingVertical: 12,
        paddingHorizontal: 32,
    },
});
