import { createAudioPlayer } from 'expo-audio';
import { useState, useCallback, useEffect } from 'react';
import { View, Text, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withRepeat,
    withSequence,
    cancelAnimation,
    FadeIn,
    FadeOut,
    FadeInDown,
    SlideInRight,
    SlideOutLeft,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { SimFeedbackBar } from '../../../components/ui/SimFeedbackBar';
import { LottieIcon } from '../../../components/ui/LottieIcon';
import { SimLottieBackground } from '../../../components/ui/SimLottieBackground';
import { successHaptic } from '../../../utils/haptics';
import { useEconomyStore } from '../../economy/useEconomyStore';
import { useSnowballGame } from './useSnowballGame';
import { snowballConfig } from './snowballData';
import type { PurchaseOption, PurchaseScenario, SnowballScore } from './snowballTypes';
import { SIM, GRADE_COLORS, GRADE_HEBREW, SHADOW_LIGHT, RTL, TYPE, simStyles } from './simTheme';
import { getChapterTheme } from '../../../constants/theme';
import { useSimReward } from '../../../hooks/useSimReward';
import { useTimeoutCleanup } from '../../../hooks/useTimeoutCleanup';

const CH = getChapterTheme('chapter-1');
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SIM_COMPLETE_XP = 20;
const SIM_COMPLETE_COINS = 30;

/* ── Lottie assets ── */
const LOTTIE_GROWTH = require('../../../../assets/lottie/wired-flat-161-growth-hover-pinch.json');
const LOTTIE_COINS = require('../../../../assets/lottie/wired-flat-298-coins-hover-jump.json');
const LOTTIE_MONEY = require('../../../../assets/lottie/wired-flat-413-money-bag-hover-shake.json');
const LOTTIE_CARD = require('../../../../assets/lottie/wired-flat-983-smart-lock-card-hover-pinch.json');
const LOTTIE_REPLAY = require('../../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json');
const LOTTIE_ARROW = require('../../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');
const LOTTIE_SNOWFLAKE = require('../../../../assets/lottie/wired-flat-2441-natural-crystal-hover-pinch.json');
const LOTTIE_DECREASE = require('../../../../assets/lottie/wired-flat-162-decrease-hover-pinch.json');
const FINN_SOURCE = require('../../../../assets/lottie/finn.json');

const MIN_SNOWBALL_SIZE = 36;
const MAX_SNOWBALL_SIZE = SCREEN_WIDTH * 0.28;

/* ------------------------------------------------------------------ */
/*  SnowballVisual — circle that grows proportionally to debt          */
/* ------------------------------------------------------------------ */

function SnowballVisual({ snowballSize, salary, totalDebt }: { snowballSize: number; salary: number; totalDebt: number }) {
    const animatedSize = useSharedValue(MIN_SNOWBALL_SIZE);
    const pulseScale = useSharedValue(1);

    const color = totalDebt > salary * 2
        ? '#f97316'
        : totalDebt > salary
            ? '#f97316'
            : '#93c5fd';

    useEffect(() => {
        const targetSize = Math.min(
            MIN_SNOWBALL_SIZE + snowballSize * (MAX_SNOWBALL_SIZE - MIN_SNOWBALL_SIZE),
            MAX_SNOWBALL_SIZE,
        );
        animatedSize.value = withTiming(Math.max(targetSize, MIN_SNOWBALL_SIZE), { duration: 300 });
    }, [snowballSize, animatedSize]);

    useEffect(() => {
        // Minimal — no pulsing, just static scale
        pulseScale.value = 1;
    }, [totalDebt, salary, pulseScale]);

    const snowballStyle = useAnimatedStyle(() => ({
        width: animatedSize.value,
        height: animatedSize.value,
        borderRadius: animatedSize.value / 2,
        transform: [{ scale: pulseScale.value }],
    }));

    const statusText = totalDebt === 0
        ? 'חוב: ₪0 — אין כדור שלג!'
        : totalDebt > salary * 2
            ? 'כדור השלג ענק!'
            : totalDebt > salary
                ? 'כדור השלג גדול'
                : 'כדור שלג קטן';

    const snowballLottie = totalDebt > salary ? LOTTIE_DECREASE : LOTTIE_SNOWFLAKE;

    return (
        <View style={{ alignItems: 'center', marginVertical: 4 }}>
            <Animated.View
                style={[
                    snowballStyle,
                    {
                        backgroundColor: totalDebt === 0 ? 'rgba(74,222,128,0.1)' : `${color}25`,
                        borderWidth: 2,
                        borderColor: totalDebt === 0 ? SIM.trackBorder : `${color}60`,
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: color,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: totalDebt > 0 ? 0.4 : 0,
                        shadowRadius: 10,
                        elevation: totalDebt > 0 ? 6 : 0,
                    },
                ]}
            >
                <View accessible={false}><LottieIcon source={snowballLottie} size={totalDebt > salary ? 26 : 20} /></View>
                {totalDebt > 0 && (
                    <Text style={{ fontSize: 12, fontWeight: '800', color, marginTop: 1 }}>
                        ₪{Math.round(totalDebt).toLocaleString()}
                    </Text>
                )}
            </Animated.View>
            <Text style={[RTL, TYPE.gradientLabel, { fontSize: 12, marginTop: 3, fontWeight: '500' }]}>
                {statusText}
            </Text>
        </View>
    );
}

/* ------------------------------------------------------------------ */
/*  SalaryBar — free income vs obligations                             */
/* ------------------------------------------------------------------ */

function SalaryBar({ salary, obligations, freePercent }: { salary: number; obligations: number; freePercent: number }) {
    const barWidth = useSharedValue(0);

    useEffect(() => {
        const pct = Math.min((obligations / salary) * 100, 100);
        barWidth.value = withSpring(pct, { damping: 20, stiffness: 100 });
    }, [obligations, salary, barWidth]);

    const obligationStyle = useAnimatedStyle(() => ({
        width: `${barWidth.value}%` as unknown as number,
    }));

    const isCritical = freePercent < 30;

    return (
        <View style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View accessible={false}><LottieIcon source={LOTTIE_MONEY} size={22} /></View>
                    <Text style={[RTL, TYPE.gradientLabel]}>
                        הכנסה פנויה
                    </Text>
                </View>
                <Text style={{ fontSize: 14, color: isCritical ? '#fbbf24' : SIM.primary, fontWeight: '600' }} accessibilityLiveRegion="polite">
                    {freePercent}% פנוי
                </Text>
            </View>
            <View
                style={{
                    height: 10,
                    backgroundColor: SIM.trackBg,
                    borderRadius: 5,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: SIM.trackBorder,
                }}
            >
                <Animated.View
                    style={[
                        obligationStyle,
                        {
                            height: '100%',
                            borderRadius: 5,
                            backgroundColor: isCritical ? '#f97316' : '#f59e0b',
                        },
                    ]}
                />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }}>
                <Text style={[RTL, TYPE.gradientLabel, { fontSize: 13 }]}>
                    התחייבויות: ₪{obligations.toLocaleString()}
                </Text>
                <Text style={[TYPE.gradientLabel, { fontSize: 13 }]}>
                    משכורת: ₪{salary.toLocaleString()}
                </Text>
            </View>
        </View>
    );
}

/* ------------------------------------------------------------------ */
/*  PurchaseCard — scenario + payment option buttons                    */
/* ------------------------------------------------------------------ */

const METHOD_COLORS: Record<string, { border: string; bg: string; text: string }> = {
    full: { border: '#22c55e', bg: 'rgba(34,197,94,0.08)', text: '#4ade80' },
    installments: { border: '#f59e0b', bg: 'rgba(245,158,11,0.08)', text: '#fbbf24' },
    credit: { border: '#f97316', bg: 'rgba(251,191,36,0.08)', text: '#fbbf24' },
};

function PurchaseCard({
    scenario,
    monthIndex,
    totalMonths,
    onChoice,
}: {
    scenario: PurchaseScenario;
    monthIndex: number;
    totalMonths: number;
    onChoice: (option: PurchaseOption) => void;
}) {
    const [selectedOption, setSelectedOption] = useState<PurchaseOption | null>(null);
    const safeTimeout = useTimeoutCleanup();

    const handlePress = useCallback(
        (option: PurchaseOption) => {
            if (selectedOption) return;
            setSelectedOption(option);

            successHaptic();

            setTimeout(() => {
                onChoice(option);
                setSelectedOption(null);
            }, 2000);
        },
        [selectedOption, onChoice],
    );

    return (
        <Animated.View
            key={`purchase-${scenario.id}`}
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            style={{ flex: 1, justifyContent: 'center' }}
        >
            <View style={simStyles.gameCard}>
                <View style={{ padding: 14 }}>
                    {/* Header row: emoji left, text right */}
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <View style={{ flex: 1 }}>
                            <Text style={[RTL, { fontSize: 15, fontWeight: '800', color: SIM.textPrimary }]}>
                                {scenario.item}
                            </Text>
                            <Text style={[RTL, { fontSize: 13, color: SIM.textSecondary, lineHeight: 18, marginTop: 2 }]}>
                                {scenario.description}
                            </Text>
                        </View>
                        <Text style={{ fontSize: 32 }}>{scenario.emoji}</Text>
                    </View>
                    <Text style={{ fontSize: 17, fontWeight: '900', color: SIM.primary, textAlign: 'center', marginBottom: 8 }}>
                        ₪{scenario.price.toLocaleString()}
                    </Text>

                    <View style={{ gap: 8 }}>
                        {scenario.options.map((option) => {
                            const isSelected = selectedOption?.id === option.id;
                            const isRevealed = selectedOption !== null;
                            const colors = METHOD_COLORS[option.method];

                            const borderColor = isRevealed
                                ? isSelected ? colors.border : '#e5e7eb'
                                : '#dbeafe';
                            const bgColor = isRevealed
                                ? isSelected ? colors.bg : '#f9fafb'
                                : '#f0f7ff';

                            return (
                                <AnimatedPressable
                                    key={option.id}
                                    onPress={() => handlePress(option)}
                                    disabled={isRevealed}
                                    accessibilityRole="button"
                                    accessibilityLabel={option.label}
                                    accessibilityHint="בחר אפשרות תשלום זו"
                                    accessibilityState={{ disabled: isRevealed }}
                                    style={{
                                        borderRadius: 12,
                                        borderWidth: 1.5,
                                        paddingVertical: 10,
                                        paddingHorizontal: 14,
                                        borderColor,
                                        backgroundColor: bgColor,
                                    }}
                                >
                                    <Text
                                        style={[
                                            RTL,
                                            {
                                                fontSize: 13,
                                                color: isRevealed && !isSelected ? SIM.textMuted : SIM.textPrimary,
                                                fontWeight: isSelected ? '700' : '600',
                                                marginBottom: 2,
                                            },
                                        ]}
                                    >
                                        {option.label}
                                    </Text>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={{ fontSize: 12, color: SIM.textSecondary }}>
                                            {option.monthlyAmount > 0 ? `₪${option.monthlyAmount}/חודש` : 'תשלום אחד'}
                                        </Text>
                                        <Text style={{ fontSize: 12, color: isRevealed ? (isSelected ? colors.border : SIM.textMuted) : SIM.primary, fontWeight: '700' }}>
                                            סה"כ: ₪{option.totalCost.toLocaleString()}
                                        </Text>
                                    </View>
                                </AnimatedPressable>
                            );
                        })}
                    </View>
                </View>
            </View>

            {selectedOption && (
                <SimFeedbackBar
                    isCorrect={selectedOption.method === 'full'}
                    message={selectedOption.feedback}
                    accentColor={SIM.primary}
                />
            )}
        </Animated.View>
    );
}

/* ------------------------------------------------------------------ */
/*  BillChoiceModal — full payment vs minimum (5%)                     */
/* ------------------------------------------------------------------ */

function BillChoiceModal({
    totalDebt,
    minimumPercent,
    onChoice,
}: {
    totalDebt: number;
    minimumPercent: number;
    onChoice: (choice: 'full' | 'minimum') => void;
}) {
    const minAmount = Math.round(totalDebt * minimumPercent);

    return (
        <Animated.View entering={FadeIn.duration(300)} style={{ flex: 1, justifyContent: 'center' }}>
            <View style={{
                backgroundColor: '#ffffff',
                borderRadius: 20,
                padding: 18,
                alignItems: 'center',
                shadowColor: '#0284c7',
                shadowOpacity: 0.15,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 4 },
                elevation: 6,
            }}>
                <View accessible={false}><LottieIcon source={LOTTIE_CARD} size={36} style={{ marginBottom: 6 }} /></View>
                <Text style={[RTL, { fontSize: 16, fontWeight: '800', color: SIM.textPrimary, marginBottom: 4, textAlign: 'center' }]}>
                    חשבון הקרדיט הגיע!
                </Text>
                <Text style={[RTL, { fontSize: 14, color: SIM.textSecondary, marginBottom: 12, textAlign: 'center' }]}>
                    חוב כולל: ₪{Math.round(totalDebt).toLocaleString()}
                </Text>

                <View style={{ gap: 10, width: '100%' }}>
                    <AnimatedPressable
                        onPress={() => { successHaptic(); onChoice('full'); }}
                        accessibilityRole="button"
                        accessibilityLabel="לשלם חיוב מלא"
                        accessibilityHint="משלם את כל החוב ומאפס אותו"
                        style={{
                            borderRadius: 14,
                            borderWidth: 1.5,
                            borderColor: SIM.successBorder,
                            backgroundColor: SIM.successLight,
                            paddingVertical: 12,
                            alignItems: 'center',
                        }}
                    >
                        <Text style={[RTL, { fontSize: 14, fontWeight: '700', color: SIM.success }]}>
                            לשלם חיוב מלא — ₪{Math.round(totalDebt).toLocaleString()}
                        </Text>
                        <Text style={[RTL, { fontSize: 13, color: SIM.success, marginTop: 2 }]}>
                            מאפס את החוב לגמרי
                        </Text>
                    </AnimatedPressable>

                    <AnimatedPressable
                        onPress={() => { successHaptic(); onChoice('minimum'); }}
                        accessibilityRole="button"
                        accessibilityLabel="תשלום מינימום"
                        accessibilityHint="משלם רק 5 אחוז, השאר צובר ריבית"
                        style={{
                            borderRadius: 14,
                            borderWidth: 1.5,
                            borderColor: SIM.warningBorder,
                            backgroundColor: '#fff7ed',
                            paddingVertical: 12,
                            alignItems: 'center',
                        }}
                    >
                        <Text style={[RTL, { fontSize: 14, fontWeight: '700', color: SIM.warning }]}>
                            תשלום מינימום (5%) — ₪{minAmount.toLocaleString()}
                        </Text>
                        <Text style={[RTL, { fontSize: 13, color: '#ea580c', marginTop: 2 }]}>
                            השאר צובר ריבית...
                        </Text>
                    </AnimatedPressable>
                </View>
            </View>
        </Animated.View>
    );
}

/* ------------------------------------------------------------------ */
/*  ScoreScreen — end-game summary with grades                         */
/* ------------------------------------------------------------------ */

function ScoreScreen({
    score,
    totalDebt,
    snowballSize,
    salary,
    onReplay,
    onFinish,
}: {
    score: SnowballScore;
    totalDebt: number;
    snowballSize: number;
    salary: number;
    onReplay: () => void;
    onFinish: () => void;
}) {
    const gradeColor = GRADE_COLORS[score.grade];

    return (
        <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1, justifyContent: 'center', gap: 12 }}>
            <View style={simStyles.gradeContainer}>
                <View style={{
                    borderWidth: 4,
                    borderColor: gradeColor,
                    borderRadius: 12,
                    paddingHorizontal: 20,
                    paddingVertical: 6,
                    transform: [{ rotate: '-6deg' }],
                    marginBottom: 8,
                }}>
                    <Text style={[simStyles.gradeText, { color: gradeColor }]}>
                        {GRADE_HEBREW[score.grade] ?? score.grade}
                    </Text>
                </View>
                <Text style={[RTL, simStyles.gradeLabel]}>
                    {score.gradeLabel}
                </Text>
            </View>

            <View style={[simStyles.scoreCard, { borderColor: gradeColor, shadowColor: gradeColor }]}>
                <View style={simStyles.scoreCardInner}>
                    <Text style={[RTL, TYPE.cardTitle, { marginBottom: 2 }]}>
                        סיכום {snowballConfig.scenarios.length} חודשים:
                    </Text>

                    <View style={simStyles.scoreRow}>
                        <Text style={[RTL, simStyles.scoreRowLabel]}>ריבית ששולמה</Text>
                        <Text style={[simStyles.scoreRowValue, { color: score.totalInterestPaid > 0 ? SIM.danger : SIM.success }]}>
                            ₪{Math.round(score.totalInterestPaid).toLocaleString()}
                        </Text>
                    </View>

                    <View style={simStyles.scoreRow}>
                        <Text style={[RTL, simStyles.scoreRowLabel]}>שיא חוב</Text>
                        <Text style={[simStyles.scoreRowValue, { color: score.peakDebt > salary ? SIM.danger : SIM.warning }]}>
                            ₪{Math.round(score.peakDebt).toLocaleString()}
                        </Text>
                    </View>

                    <View style={simStyles.scoreRow}>
                        <Text style={[RTL, simStyles.scoreRowLabel]}>חוב שנותר</Text>
                        <Text style={[simStyles.scoreRowValue, { color: totalDebt > 0 ? SIM.danger : SIM.success }]}>
                            ₪{Math.round(totalDebt).toLocaleString()}
                        </Text>
                    </View>

                    <View style={simStyles.scoreRow}>
                        <Text style={[RTL, simStyles.scoreRowLabel]}>הכנסה פנויה</Text>
                        <Text style={[simStyles.scoreRowValue, { color: score.freeIncomePercent < 30 ? SIM.warning : SIM.success }]}>
                            {score.freeIncomePercent}%
                        </Text>
                    </View>

                    <View style={simStyles.scoreDivider}>
                        <Text style={[RTL, simStyles.scoreTotalLabel]}>
                            ציון כולל
                        </Text>
                        <Text style={[simStyles.scoreTotalValue, { color: SIM.primary }]}>
                            {score.overallScore}/100
                        </Text>
                    </View>
                </View>
            </View>

            <View style={simStyles.actionsRow}>
                <AnimatedPressable onPress={onReplay} style={simStyles.replayBtn} accessibilityRole="button" accessibilityLabel="שחק שוב" accessibilityHint="מתחיל את הסימולציה מחדש">
                    <View accessible={false}><LottieIcon source={LOTTIE_REPLAY} size={20} /></View>
                    <Text style={[RTL, simStyles.replayText]}>שחק שוב</Text>
                </AnimatedPressable>

                <AnimatedPressable onPress={onFinish} style={simStyles.continueBtn} accessibilityRole="button" accessibilityLabel="המשך בפרק" accessibilityHint="ממשיך לשלב הבא">
                    <Text style={[RTL, simStyles.continueText]}>המשך בפרק</Text>
                    <View accessible={false}><LottieIcon source={LOTTIE_ARROW} size={20} /></View>
                </AnimatedPressable>
            </View>
        </Animated.View>
    );
}

/* ------------------------------------------------------------------ */
/*  InsightModal — blue summary message shown once sim ends             */
/* ------------------------------------------------------------------ */

function InsightModal({ onDismiss }: { onDismiss: () => void }) {
    return (
        <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{
                backgroundColor: '#ffffff',
                borderRadius: 24,
                padding: 28,
                alignItems: 'center',
                gap: 16,
                marginHorizontal: 16,
                shadowColor: '#0284c7',
                shadowOpacity: 0.2,
                shadowRadius: 20,
                shadowOffset: { width: 0, height: 6 },
                elevation: 10,
                borderWidth: 1.5,
                borderColor: SIM.cardBorder,
            }}>
                <View accessible={false}>
                    <LottieView
                        source={FINN_SOURCE}
                        style={{ width: 72, height: 72 }}
                        autoPlay
                        loop
                    />
                </View>
                <Text
                    style={[
                        RTL,
                        {
                            fontSize: 17,
                            fontWeight: '700',
                            color: SIM.textPrimary,
                            lineHeight: 28,
                            textAlign: 'center',
                        },
                    ]}
                >
                    נראה לי הבנו שאם אפשר לשלם עכשיו- נשלם. המפתח הוא להבין מה המחיר האמיתי שמשלמים לאחר הריבית.
                </Text>
                <AnimatedPressable
                    onPress={onDismiss}
                    accessibilityRole="button"
                    accessibilityLabel="הבנתי, תראו לי את הסיכום"
                    accessibilityHint="סוגר את ההסבר ומציג את הסיכום"
                    style={{
                        borderRadius: 16,
                        backgroundColor: SIM.btnPrimary,
                        paddingVertical: 14,
                        paddingHorizontal: 32,
                        alignItems: 'center',
                        borderBottomWidth: 4,
                        borderBottomColor: SIM.btnPrimaryBorder,
                        shadowColor: '#0284c7',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 12,
                        elevation: 8,
                    }}
                >
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#ffffff' }}>הבנתי, תראו לי את הסיכום</Text>
                </AnimatedPressable>
            </View>
        </Animated.View>
    );
}

/* ------------------------------------------------------------------ */
/*  SnowballGameScreen — main exported component                       */
/* ------------------------------------------------------------------ */

export function SnowballGameScreen({ onComplete }: { onComplete: () => void }) {
    const {
        state,
        currentScenario,
        freeIncomePercent,
        pendingBillChoice,
        handlePurchase,
        handleBillChoice,
        score,
        resetGame,
    } = useSnowballGame(snowballConfig);

  useSimReward(state.isComplete, SIM_COMPLETE_XP, SIM_COMPLETE_COINS);
    
    useEffect(() => {
        const player = createAudioPlayer({ uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/audio/sims/sim-snowball.mp3' });
        player.play();
        return () => {
            player.pause();
            player.release();
        };
    }, []);
const [rewardsGranted, setRewardsGranted] = useState(false);
    const [showInsight, setShowInsight] = useState(false);
    const [insightDismissed, setInsightDismissed] = useState(false);

    useEffect(() => {
        if (state.isComplete && !rewardsGranted) {
            setRewardsGranted(true);
            setShowInsight(true);
            successHaptic();
        }
    }, [state.isComplete, rewardsGranted]);

    const handleReplay = useCallback(() => {
        resetGame();
        setRewardsGranted(false);
        setShowInsight(false);
        setInsightDismissed(false);
    }, [resetGame]);

    return (
        <SimLottieBackground
            lottieSources={[LOTTIE_COINS, LOTTIE_GROWTH]}
            chapterColors={CH.gradient}
        >
            <View style={{ flex: 1 }}>
                {/* ── Title ── */}
                <Animated.View entering={FadeInDown.delay(100).springify()}>
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <View accessible={false}><LottieIcon source={LOTTIE_SNOWFLAKE} size={26} /></View>
                        <Text accessibilityRole="header" style={[RTL, TYPE.title]}>
                            כדור שלג דיגיטלי
                        </Text>
                    </View>
                    <Text style={[RTL, TYPE.subtitle, { fontSize: 13, marginBottom: 8 }]}>
                        משכורת: ₪{snowballConfig.monthlySalary.toLocaleString()} | נהל {snowballConfig.scenarios.length} חודשי רכישות
                    </Text>
                </Animated.View>

                {/* ── Snowball + Stats + SalaryBar (visible during gameplay) ── */}
                {!state.isComplete && (
                    <Animated.View entering={FadeInDown.delay(200).springify()}>
                        <Text style={[TYPE.progress, { fontSize: 12, fontWeight: '700', marginBottom: 2 }]} accessibilityLiveRegion="polite">
                            חודש {state.month}/{snowballConfig.scenarios.length}
                        </Text>

                        <SnowballVisual
                            snowballSize={state.snowballSize}
                            salary={snowballConfig.monthlySalary}
                            totalDebt={state.totalDebt}
                        />

                        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 4 }}>
                            <View style={{ alignItems: 'center' }}>
                                <Text style={{ fontSize: 16, fontWeight: '900', color: state.totalDebt > 0 ? '#fbbf24' : SIM.primary }} accessibilityLiveRegion="polite">
                                    ₪{Math.round(state.totalDebt).toLocaleString()}
                                </Text>
                                <Text style={[RTL, TYPE.gradientLabel, { fontSize: 12, fontWeight: '500' }]}>חוב כולל</Text>
                            </View>
                            <View style={{ alignItems: 'center' }}>
                                <Text style={{ fontSize: 16, fontWeight: '900', color: state.interestPaid > 0 ? '#f59e0b' : SIM.primary }} accessibilityLiveRegion="polite">
                                    ₪{Math.round(state.interestPaid).toLocaleString()}
                                </Text>
                                <Text style={[RTL, TYPE.gradientLabel, { fontSize: 12, fontWeight: '500' }]}>ריבית ששולמה</Text>
                            </View>
                        </View>

                        <SalaryBar
                            salary={snowballConfig.monthlySalary}
                            obligations={state.monthlyObligations}
                            freePercent={freeIncomePercent}
                        />
                    </Animated.View>
                )}

                {/* ── Purchase Card (phase 1) ── */}
                {!state.isComplete && currentScenario && !pendingBillChoice && (
                    <PurchaseCard
                        key={currentScenario.id}
                        scenario={currentScenario}
                        monthIndex={state.month - 1}
                        totalMonths={snowballConfig.scenarios.length}
                        onChoice={handlePurchase}
                    />
                )}

                {/* ── Bill Choice (phase 2) ── */}
                {!state.isComplete && pendingBillChoice && (
                    <BillChoiceModal
                        totalDebt={state.totalDebt}
                        minimumPercent={snowballConfig.minimumPaymentPercent}
                        onChoice={handleBillChoice}
                    />
                )}

                {/* ── Insight Modal (shows once before score) ── */}
                {state.isComplete && showInsight && !insightDismissed && (
                    <InsightModal onDismiss={() => { setShowInsight(false); setInsightDismissed(true); }} />
                )}

                {/* ── Score Screen (game over) ── */}
                {state.isComplete && score && !showInsight && (
                    <ScoreScreen
                        score={score}
                        totalDebt={state.totalDebt}
                        snowballSize={state.snowballSize}
                        salary={snowballConfig.monthlySalary}
                        onReplay={handleReplay}
                        onFinish={onComplete}
                    />
                )}
            </View>
        </SimLottieBackground>
    );
}
