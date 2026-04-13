import { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSequence,
    withTiming,
    FadeIn,
    FadeInDown,
    FadeInUp,
    FadeOut,
} from 'react-native-reanimated';
import { SimLottieBackground } from '../../../components/ui/SimLottieBackground';
import { LottieIcon } from '../../../components/ui/LottieIcon';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { GlowCard } from '../../../components/ui/GlowCard';
import { ConfettiExplosion } from '../../../components/ui/ConfettiExplosion';
import { SimFeedbackBar } from '../../../components/ui/SimFeedbackBar';
import { successHaptic, errorHaptic, heavyHaptic, tapHaptic } from '../../../utils/haptics';
import { useTaxPuzzle } from './useTaxPuzzle';
import type { TaxCredit, CharacterProfile } from './taxPuzzleTypes';
import { ATTRIBUTE_LABELS } from './taxPuzzleData';
import { getChapterTheme } from '../../../constants/theme';
import { SIM2, GRADE_COLORS2, GRADE_HEBREW, SHADOW_STRONG, SHADOW_LIGHT, RTL, TYPE2, sim2Styles } from './simTheme';

const GOLD = '#f59e0b';

/* ── Chapter-2 theme — only used for gradient ── */
const _th2 = getChapterTheme('chapter-2');

/* ── Lottie assets ── */
const LOTTIE_MONEY_BAG = require('../../../../assets/lottie/wired-flat-413-money-bag-hover-shake.json');
const LOTTIE_BALANCE = require('../../../../assets/lottie/wired-flat-402-legal-balance-legal-hover-pinch.json');
const LOTTIE_BULB = require('../../../../assets/lottie/wired-flat-36-bulb-hover-blink.json');
const LOTTIE_REPLAY = require('../../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json');
const LOTTIE_CHECK = require('../../../../assets/lottie/wired-flat-24-approved-checked-hover-pinch.json');
const LOTTIE_CROSS = require('../../../../assets/lottie/wired-flat-25-error-cross-hover-pinch.json');
const LOTTIE_STAR = require('../../../../assets/lottie/wired-flat-237-star-rating-hover-pinch.json');
const LOTTIE_CHART = require('../../../../assets/lottie/wired-flat-153-bar-chart-hover-pinch.json');
const LOTTIE_ARROW = require('../../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');

/* ------------------------------------------------------------------ */
/*  CharacterCard — profile at top with attribute badges                */
/* ------------------------------------------------------------------ */

function CharacterCard({
    character,
    level,
    totalLevels,
}: {
    character: CharacterProfile;
    level: number;
    totalLevels: number;
}) {
    return (
        <View style={[styles.charCard]}>
            <View style={styles.charInner}>
                <View style={styles.charTopRow}>
                    <Text style={styles.charEmoji}>{character.emoji}</Text>
                    <View style={{ flex: 1, gap: 2 }}>
                        <View style={styles.charNameRow}>
                            <Text style={[RTL, styles.charName]}>
                                {character.name}, {character.age}
                            </Text>
                            <Text style={[RTL, styles.levelBadge]}>
                                שלב {level}/{totalLevels}
                            </Text>
                        </View>
                        <Text style={[RTL, styles.charDesc]}>{character.description}</Text>
                    </View>
                </View>

                {/* Attribute badges */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.attrRow}
                    style={{ direction: 'rtl' }}
                >
                    {character.attributes.map((attr) => (
                        <View key={attr} style={styles.attrPill}>
                            <Text style={styles.attrPillText}>{ATTRIBUTE_LABELS[attr] ?? attr}</Text>
                        </View>
                    ))}
                </ScrollView>
            </View>
        </View>
    );
}

/* ------------------------------------------------------------------ */
/*  PayslipDisplay — animated numbers                                    */
/* ------------------------------------------------------------------ */

function PayslipDisplay({
    grossSalary,
    taxBefore,
    taxAfter,
    netBefore,
    netAfter,
}: {
    grossSalary: number;
    taxBefore: number;
    taxAfter: number;
    netBefore: number;
    netAfter: number;
}) {
    const taxSaved = taxBefore - taxAfter;

    return (
        <View style={styles.payslip} accessibilityLiveRegion="polite">
            {/* Gross — static */}
            <View style={styles.payslipRow}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                    <View accessible={false}><LottieIcon source={LOTTIE_MONEY_BAG} size={22} /></View>
                    <Text style={[RTL, styles.payslipLabel]}>ברוטו</Text>
                </View>
                <Text style={styles.payslipValueStatic}>
                    ₪{grossSalary.toLocaleString('he-IL')}
                </Text>
            </View>

            {/* Tax — shrinks */}
            <View style={styles.payslipRow}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                    <View accessible={false}><LottieIcon source={LOTTIE_CHART} size={22} /></View>
                    <Text style={[RTL, styles.payslipLabel]}>מס הכנסה</Text>
                </View>
                <View style={styles.taxValueWrap}>
                    {taxAfter < taxBefore && (
                        <Text style={styles.taxStrikethrough}>
                            ₪{taxBefore.toLocaleString('he-IL')}
                        </Text>
                    )}
                    <Text style={[styles.payslipValueTax, taxAfter < taxBefore && { color: SIM2.success }]}>
                        ₪{taxAfter.toLocaleString('he-IL')}
                    </Text>
                </View>
            </View>

            {/* Net — grows */}
            <View style={styles.payslipRow}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                    <View accessible={false}><LottieIcon source={LOTTIE_STAR} size={22} /></View>
                    <Text style={[RTL, styles.payslipLabel]}>נטו</Text>
                </View>
                <Text style={[styles.payslipValueNet, netAfter > netBefore && { color: GOLD }]}>
                    ₪{netAfter.toLocaleString('he-IL')}
                </Text>
            </View>

            {/* Money saved counter */}
            {taxSaved > 0 && (
                <Animated.View entering={FadeIn.duration(200)} style={styles.savedRow}>
                    <Text style={styles.savedLabel}>חסכת החודש:</Text>
                    <Text style={styles.savedAmount}>
                        +₪{taxSaved.toLocaleString('he-IL')}
                    </Text>
                </Animated.View>
            )}
        </View>
    );
}

/* ------------------------------------------------------------------ */
/*  CreditCoin — golden coin-styled card in the tray                    */
/* ------------------------------------------------------------------ */

function CreditCoin({
    credit,
    isApplied,
    onPress,
    shakeSignal,
}: {
    credit: TaxCredit;
    isApplied: boolean;
    onPress: () => void;
    shakeSignal: number;
}) {
    const shakeX = useSharedValue(0);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: shakeX.value }],
    }));

    // Shake when shakeSignal changes (> 0 means triggered)
    useEffect(() => {
        if (shakeSignal > 0) {
            shakeX.value = withSequence(
                withTiming(-6, { duration: 50 }),
                withTiming(6, { duration: 50 }),
                withTiming(-4, { duration: 50 }),
                withTiming(4, { duration: 50 }),
                withTiming(0, { duration: 50 }),
            );
        }
    }, [shakeSignal, shakeX]);

    const handlePress = useCallback(() => {
        if (isApplied) return;
        tapHaptic();
        onPress();
    }, [isApplied, onPress]);

    return (
        <AnimatedPressable onPress={handlePress} disabled={isApplied} noScale={isApplied} accessibilityRole="button" accessibilityLabel={credit.name} accessibilityHint="מפעיל נקודת זיכוי על הדמות" accessibilityState={{ disabled: isApplied }}>
            <Animated.View
                style={[
                    styles.coinCard,
                    isApplied && styles.coinCardApplied,
                    animStyle,
                ]}
            >
                <View accessible={false}><LottieIcon source={credit.lottie} size={32} /></View>
                <Text style={[RTL, styles.coinName]} numberOfLines={1}>
                    {credit.name}
                </Text>
                <Text style={styles.coinPoints}>{credit.pointsValue} נק׳</Text>
                {isApplied && (
                    <View style={styles.coinCheckmark}>
                        <LottieIcon source={LOTTIE_CHECK} size={12} />
                    </View>
                )}
            </Animated.View>
        </AnimatedPressable>
    );
}

/* ------------------------------------------------------------------ */
/*  TaxPuzzleScreen — main exported component                           */
/* ------------------------------------------------------------------ */

export function TaxPuzzleScreen({ onComplete }: { onComplete: () => void }) {
    const {
        state,
        currentCharacter,
        applyCredit,
        confirmCharacter,
        score,
        characterResults,
        resetGame,
        config,
    } = useTaxPuzzle();

    const [showConfetti, setShowConfetti] = useState(false);
    const [lastResult, setLastResult] = useState<'applied' | 'rejected' | null>(null);
    const [showTransition, setShowTransition] = useState(false);
    const [shakeSignals, setShakeSignals] = useState<Record<string, number>>({});
    const [rewardsGranted, setRewardsGranted] = useState(false);

    // Grant rewards once on completion
    useEffect(() => {
        if (state.isComplete && !rewardsGranted) {
            setRewardsGranted(true);
            successHaptic();
        }
    }, [state.isComplete, rewardsGranted]);

    const onCreditPress = useCallback(
        (credit: TaxCredit) => {
            const result = applyCredit(credit);
            setLastResult(result);

            if (result === 'applied') {
                successHaptic();
            } else {
                errorHaptic();
                // Increment shake signal to trigger animation
                setShakeSignals((prev) => ({
                    ...prev,
                    [credit.id]: (prev[credit.id] ?? 0) + 1,
                }));
            }

            // Clear result feedback after a moment
            setTimeout(() => setLastResult(null), 600);
        },
        [applyCredit],
    );

    const handleConfirm = useCallback(() => {
        heavyHaptic();

        const nextIndex = state.currentCharacterIndex + 1;
        if (nextIndex < config.characters.length) {
            setShowTransition(true);
            setTimeout(() => {
                confirmCharacter();
                setShowTransition(false);
            }, 400);
        } else {
            confirmCharacter();
        }
    }, [confirmCharacter, state.currentCharacterIndex, config.characters.length]);

    const handleReplay = useCallback(() => {
        resetGame();
        setRewardsGranted(false);
        setShakeSignals({});
    }, [resetGame]);

    const CH2_LOTTIE: [ReturnType<typeof require>, ReturnType<typeof require>] = [
        require('../../../../assets/lottie/wired-flat-56-document-hover-swipe.json'),
        require('../../../../assets/lottie/wired-flat-994-sticky-notes-hover-pinch.json'),
    ];

    // Score screen when all 3 characters done
    if (state.isComplete && score) {
        return (
            <SimLottieBackground lottieSources={CH2_LOTTIE} chapterColors={_th2.gradient}>
                {score.grade === 'S' && <ConfettiExplosion onComplete={() => {}} />}
                <ScoreReveal score={score} characterResults={characterResults} characters={config.characters} onReplay={handleReplay} onFinish={onComplete} />
            </SimLottieBackground>
        );
    }

    if (!currentCharacter) return null;

    return (
        <SimLottieBackground lottieSources={CH2_LOTTIE} chapterColors={_th2.gradient}>
            {showConfetti && <ConfettiExplosion onComplete={() => setShowConfetti(false)} />}

            {/* Title */}
            <Animated.View entering={FadeInDown.delay(100)}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <View accessible={false}><LottieIcon source={LOTTIE_BALANCE} size={28} /></View>
                    <Text accessibilityRole="header" style={[RTL, TYPE2.title]}>פאזל התלוש</Text>
                </View>
                <Text style={[RTL, TYPE2.subtitle]}>
                    התאם נקודות זיכוי לדמות — הקטן את המס, הגדל את הנטו!
                </Text>
            </Animated.View>

            {/* Character card */}
            {showTransition ? (
                <Animated.View exiting={FadeOut.duration(300)}>
                    <CharacterCard
                        character={currentCharacter}
                        level={state.currentCharacterIndex + 1}
                        totalLevels={config.characters.length}
                    />
                </Animated.View>
            ) : (
                <Animated.View
                    key={`char-${state.currentCharacterIndex}`}
                    entering={FadeInUp.springify().damping(16)}
                >
                    <CharacterCard
                        character={currentCharacter}
                        level={state.currentCharacterIndex + 1}
                        totalLevels={config.characters.length}
                    />
                </Animated.View>
            )}

            {/* Payslip display */}
            <PayslipDisplay
                grossSalary={state.grossSalary}
                taxBefore={state.taxBefore}
                taxAfter={state.taxAfter}
                netBefore={state.netBefore}
                netAfter={state.netAfter}
            />

            {/* Credit tray — horizontal scroll */}
            <View style={styles.trayWrapper}>
                <Text style={[RTL, styles.trayLabel]}>נקודות זיכוי זמינות:</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.trayScroll}
                    style={{ direction: 'rtl' }}
                >
                    {config.allCredits.map((credit) => (
                        <CreditCoin
                            key={credit.id}
                            credit={credit}
                            isApplied={state.appliedCredits.includes(credit.id)}
                            onPress={() => onCreditPress(credit)}
                            shakeSignal={shakeSignals[credit.id] ?? 0}
                        />
                    ))}
                </ScrollView>
            </View>

            {/* Confirm / Next character button */}
            <AnimatedPressable onPress={handleConfirm} style={styles.confirmBtn} accessibilityRole="button" accessibilityLabel={state.currentCharacterIndex < config.characters.length - 1 ? 'סיימתי — עבור לדמות הבאה' : 'סיימתי — ראה תוצאות'} accessibilityHint={state.currentCharacterIndex < config.characters.length - 1 ? 'עובר לדמות הבאה' : 'מציג את התוצאות'}>
                <Text style={[RTL, styles.confirmBtnText]}>
                    {state.currentCharacterIndex < config.characters.length - 1
                        ? 'סיימתי — עבור לדמות הבאה'
                        : 'סיימתי — ראה תוצאות'}
                </Text>
            </AnimatedPressable>

            {/* Feedback bar */}
            {lastResult && (
                <SimFeedbackBar
                    isCorrect={lastResult === 'applied'}
                    message={lastResult === 'applied' ? 'זיכוי הופעל!' : 'לא מתאים לדמות'}
                    accentColor={SIM2.primary}
                />
            )}
        </SimLottieBackground>
    );
}

/* ------------------------------------------------------------------ */
/*  ScoreReveal — results after all 3 characters                        */
/* ------------------------------------------------------------------ */

function ScoreReveal({
    score,
    characterResults,
    characters,
    onReplay,
    onFinish,
}: {
    score: NonNullable<ReturnType<typeof useTaxPuzzle>['score']>;
    characterResults: { correctCredits: number; wrongAttempts: number; totalEligible: number; moneySavedMonthly: number }[];
    characters: CharacterProfile[];
    onReplay: () => void;
    onFinish: () => void;
}) {
    const gradeColor = GRADE_COLORS2[score.grade] ?? SIM2.textPrimary;

    return (
        <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', gap: 8, paddingVertical: 8 }}
            showsVerticalScrollIndicator={false}
        >
            <Animated.View entering={FadeIn.duration(400)} style={{ gap: 8 }}>
            {/* Grade + savings header — compact */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                <View style={sim2Styles.gradeContainer}>
                    <Text style={[sim2Styles.gradeText, { color: gradeColor }]}>
                        {GRADE_HEBREW[score.grade] ?? score.grade}
                    </Text>
                    <Text style={[RTL, sim2Styles.gradeLabel]}>
                        {score.gradeLabel}
                    </Text>
                </View>
                <View style={{ width: 1, height: 32, backgroundColor: 'rgba(56, 189, 248, 0.3)' }} />
                <View style={{ alignItems: 'center' }}>
                    <Text style={[RTL, { fontSize: 11, color: SIM2.textOnGradientMuted, fontWeight: '700' }]}>
                        חיסכון שנתי
                    </Text>
                    <Text style={{ fontSize: 22, fontWeight: '900', color: GOLD }}>
                        ₪{score.moneySavedYearly.toLocaleString('he-IL')}
                    </Text>
                </View>
            </View>

            {score.perfectMatch && (
                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
                    <LottieIcon source={LOTTIE_STAR} size={18} />
                    <Text style={{ fontSize: 13, color: GOLD, fontWeight: '700' }}>התאמה מושלמת!</Text>
                </View>
            )}

            {/* Compact stats — single row */}
            <View style={{ flexDirection: 'row-reverse', justifyContent: 'center', gap: 16, backgroundColor: 'rgba(15, 23, 42, 0.6)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.2)', paddingVertical: 10, paddingHorizontal: 14 }}>
                <View style={{ alignItems: 'center', gap: 2 }}>
                    <LottieIcon source={LOTTIE_CHECK} size={16} />
                    <Text style={{ fontSize: 16, fontWeight: '900', color: SIM2.success }}>{score.correctCredits}</Text>
                    <Text style={[RTL, { fontSize: 10, color: SIM2.textOnGradientMuted }]}>נכונים</Text>
                </View>
                <View style={{ width: 1, backgroundColor: 'rgba(56,189,248,0.2)', height: '80%', alignSelf: 'center' }} />
                <View style={{ alignItems: 'center', gap: 2 }}>
                    <LottieIcon source={LOTTIE_CROSS} size={16} />
                    <Text style={{ fontSize: 16, fontWeight: '900', color: score.wrongAttempts === 0 ? SIM2.success : SIM2.danger }}>{score.wrongAttempts}</Text>
                    <Text style={[RTL, { fontSize: 10, color: SIM2.textOnGradientMuted }]}>שגיאות</Text>
                </View>
                <View style={{ width: 1, backgroundColor: 'rgba(56,189,248,0.2)', height: '80%', alignSelf: 'center' }} />
                <View style={{ alignItems: 'center', gap: 2 }}>
                    <LottieIcon source={LOTTIE_MONEY_BAG} size={16} />
                    <Text style={{ fontSize: 16, fontWeight: '900', color: GOLD }}>₪{score.moneySavedMonthly.toLocaleString('he-IL')}</Text>
                    <Text style={[RTL, { fontSize: 10, color: SIM2.textOnGradientMuted }]}>חיסכון/חודש</Text>
                </View>
            </View>

            {/* Per-character — single compact row each */}
            {characterResults.map((result, i) => {
                const character = characters[i];
                if (!character) return null;
                return (
                    <View key={character.name} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.5)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.15)', paddingHorizontal: 10, paddingVertical: 6 }}>
                        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 5 }}>
                            <Text style={{ fontSize: 16 }}>{character.emoji}</Text>
                            <Text style={[RTL, { fontSize: 12, fontWeight: '700', color: SIM2.textOnGradientMuted }]}>{character.name}</Text>
                            <Text style={{ fontSize: 12, color: SIM2.success, fontWeight: '700' }}>{result.correctCredits}/{result.totalEligible}</Text>
                        </View>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: GOLD }}>₪{result.moneySavedMonthly.toLocaleString('he-IL')}/חודש</Text>
                    </View>
                );
            })}

            {/* Key lesson — compact */}
            <View style={[sim2Styles.insightRow, { backgroundColor: 'rgba(15, 23, 42, 0.75)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.3)', paddingVertical: 8, paddingHorizontal: 12, borderTopWidth: 1 }]}>
                <LottieIcon source={LOTTIE_BULB} size={18} />
                <Text style={[RTL, sim2Styles.insightText, { color: '#ffffff' }]}>
                    בדקו נקודות זיכוי כל שנה — אלפי שקלים מחכים לכם
                </Text>
            </View>

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
        </Animated.View>
        </ScrollView>
    );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
    container: { flex: 1 },

    /* ── Character card ── */
    charCard: {
        backgroundColor: SIM2.cardBg,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: SIM2.cardBorder,
        shadowColor: SIM2.dark,
        shadowOpacity: 0.12,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
    },
    charInner: { padding: 14, gap: 8 },
    charTopRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    charEmoji: { fontSize: 40 },
    charNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    charName: { fontSize: 16, fontWeight: '800', color: SIM2.textPrimary },
    charDesc: { fontSize: 14, color: SIM2.textSecondary, lineHeight: 20 },
    levelBadge: {
        fontSize: 14,
        fontWeight: '700',
        color: SIM2.dark,
        backgroundColor: SIM2.dim,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 2,
        overflow: 'hidden',
    },
    attrRow: { flexDirection: 'row', gap: 6 },
    attrPill: {
        borderRadius: 10,
        backgroundColor: SIM2.dim,
        borderWidth: 1,
        borderColor: SIM2.cardBorder,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    attrPillText: { fontSize: 14, fontWeight: '700', color: SIM2.textPrimary },

    /* ── Payslip ── */
    payslip: {
        backgroundColor: SIM2.cardBg,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: SIM2.cardBorder,
        padding: 16,
        gap: 10,
        marginVertical: 8,
        shadowColor: SIM2.dark,
        shadowOpacity: 0.12,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
    },
    payslipRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    payslipLabel: { fontSize: 14, fontWeight: '700', color: SIM2.textSecondary },
    payslipValueStatic: { fontSize: 16, fontWeight: '900', color: SIM2.textPrimary },
    taxValueWrap: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    taxStrikethrough: {
        fontSize: 14,
        fontWeight: '600',
        color: SIM2.textMuted,
        textDecorationLine: 'line-through',
    },
    payslipValueTax: { fontSize: 16, fontWeight: '900', color: SIM2.danger },
    payslipValueNet: { fontSize: 16, fontWeight: '900', color: SIM2.textPrimary },
    savedRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
        borderTopWidth: 1,
        borderTopColor: SIM2.cardBorder,
        paddingTop: 8,
    },
    savedLabel: { fontSize: 14, fontWeight: '700', color: SIM2.textSecondary },
    savedAmount: { fontSize: 16, fontWeight: '900', color: GOLD },

    /* ── Credit tray ── */
    trayWrapper: { flex: 1, gap: 6 },
    trayLabel: { fontSize: 14, fontWeight: '700', color: SIM2.textOnGradientMuted, ...SHADOW_LIGHT },
    trayScroll: { flexDirection: 'row', gap: 10, paddingVertical: 4, paddingHorizontal: 2 },
    coinCard: {
        width: 110,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: 'rgba(186,230,253,0.6)',
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        padding: 12,
        alignItems: 'center',
        gap: 6,
        shadowColor: '#0c4a6e',
        shadowOpacity: 0.06,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    coinCardApplied: {
        opacity: 0.45,
        borderColor: 'rgba(74,222,128,0.4)',
        backgroundColor: 'rgba(220,252,231,0.8)',
    },
    coinEmoji: { fontSize: 28 },
    coinName: { fontSize: 13, fontWeight: '700', color: '#0f172a', textAlign: 'center' },
    coinPoints: { fontSize: 15, fontWeight: '700', color: '#b45309' },
    coinCheckmark: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: 'rgba(74,222,128,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    /* ── Confirm button ── */
    confirmBtn: {
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: SIM2.btnPrimaryBorder,
        backgroundColor: SIM2.btnPrimary,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 4,
    },
    confirmBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
