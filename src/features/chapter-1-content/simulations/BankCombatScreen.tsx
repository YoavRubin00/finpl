import { createAudioPlayer } from 'expo-audio';
import { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    withSequence,
    FadeIn,
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { SimFeedbackBar } from '../../../components/ui/SimFeedbackBar';
import { LottieIcon } from '../../../components/ui/LottieIcon';
import { successHaptic, errorHaptic, heavyHaptic } from '../../../utils/haptics';
import { useEconomyStore } from '../../economy/useEconomyStore';
import { useBankCombat } from './useBankCombat';
import { bankCombatConfig } from './bankCombatData';
import type { BankCombatScore, DefenseOption } from './bankCombatTypes';
import { SimLottieBackground } from '../../../components/ui/SimLottieBackground';
import { GlowCard } from '../../../components/ui/GlowCard';
import { getChapterTheme } from '../../../constants/theme';
import { SIM, GRADE_COLORS, GRADE_HEBREW, RTL, TYPE, simStyles } from './simTheme';


/* ── Chapter theme — only .gradient used for SimLottieBackground ── */
const _th1 = getChapterTheme('chapter-1');

/* ── Lottie assets ── */
const LOTTIE_SHIELD = require('../../../../assets/lottie/wired-flat-457-shield-security-hover-pinch.json');
const LOTTIE_BANK = require('../../../../assets/lottie/wired-flat-483-building-hover-blinking.json');
const LOTTIE_MONEY = require('../../../../assets/lottie/wired-flat-413-money-bag-hover-shake.json');
const LOTTIE_REPLAY = require('../../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json');
const LOTTIE_ARROW = require('../../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');
const LOTTIE_CROSS = require('../../../../assets/lottie/wired-flat-25-error-cross-hover-pinch.json');
const LOTTIE_BALANCE = require('../../../../assets/lottie/wired-flat-402-legal-balance-legal-hover-pinch.json');

const LOTTIE_MAP: Record<string, ReturnType<typeof require>> = {
    bank: LOTTIE_BANK,
    money: LOTTIE_MONEY,
    card: require('../../../../assets/lottie/wired-flat-983-smart-lock-card-hover-pinch.json'),
    teller: require('../../../../assets/lottie/wired-flat-683-female-customer-service-hover-pinch.json'),
    diamond: require('../../../../assets/lottie/Diamond.json'),
    refresh: require('../../../../assets/lottie/wired-flat-645-people-handshake-transaction-hover-pinch.json'),
};

/* ------------------------------------------------------------------ */
/*  HealthBar — displays player savings or bank fee meter               */
/* ------------------------------------------------------------------ */

function HealthBar({
    label,
    current,
    max,
    color,
    isMoney,
    lottieSource,
}: {
    label: string;
    current: number;
    max: number;
    color: string;
    isMoney: boolean;
    lottieSource: ReturnType<typeof require>;
}) {
    const pct = Math.max(0, Math.min(100, (current / max) * 100));
    const animWidth = useSharedValue(pct);

    useEffect(() => {
        animWidth.value = withSpring(pct, { damping: 20, stiffness: 120 });
    }, [pct, animWidth]);

    const barStyle = useAnimatedStyle(() => ({
        width: `${animWidth.value}%` as unknown as number,
    }));

    return (
        <View style={styles.healthBarContainer}>
            <View style={styles.healthBarHeader}>
                <View accessible={false}><LottieIcon source={lottieSource} size={22} /></View>
                <Text style={[RTL, styles.healthBarLabel]}>{label}</Text>
                <Text style={[styles.healthBarValue, { color }]} accessibilityLiveRegion="polite">
                    {isMoney ? `₪${current.toLocaleString()}` : `${Math.round(current)}%`}
                </Text>
            </View>
            <View style={styles.healthBarTrack}>
                <Animated.View style={[styles.healthBarFill, barStyle, { backgroundColor: color }]} />
            </View>
        </View>
    );
}

/* ------------------------------------------------------------------ */
/*  CombatArena — two health bars facing each other                     */
/* ------------------------------------------------------------------ */

function CombatArena({
    playerHealth,
    maxPlayerHealth,
    bankHealth,
}: {
    playerHealth: number;
    maxPlayerHealth: number;
    bankHealth: number;
}) {
    return (
        <View style={styles.arenaContainer}>
            <HealthBar
                label="החיסכון שלך"
                current={playerHealth}
                max={maxPlayerHealth}
                color="#4ade80"
                isMoney
                lottieSource={LOTTIE_SHIELD}
            />
            <View style={{ marginTop: 12 }}>
                <View accessible={false}><LottieIcon source={LOTTIE_BALANCE} size={22} /></View>
            </View>
            <HealthBar
                label="מד העמלות"
                current={bankHealth}
                max={100}
                color="#fb923c"
                isMoney={false}
                lottieSource={LOTTIE_BANK}
            />
        </View>
    );
}

/* ------------------------------------------------------------------ */
/*  HitEffect — shield or damage flash overlay                          */
/* ------------------------------------------------------------------ */

function HitEffect({ type }: { type: 'shield' | 'damage' }) {
    const isShield = type === 'shield';

    return (
        <Animated.View
            entering={FadeIn.duration(200)}
            style={[
                styles.hitOverlay,
                {
                    backgroundColor: isShield
                        ? 'rgba(74,222,128,0.15)'
                        : 'rgba(251,146,60,0.15)',
                    borderColor: isShield
                        ? 'rgba(74,222,128,0.4)'
                        : 'rgba(251,146,60,0.4)',
                },
            ]}
        >
            {isShield ? (
                <View accessible={false}><LottieIcon source={LOTTIE_SHIELD} size={36} /></View>
            ) : (
                <View accessible={false}><LottieIcon source={LOTTIE_CROSS} size={28} /></View>
            )}
            <Text
                style={[
                    RTL,
                    styles.hitText,
                    { color: isShield ? '#4ade80' : '#fbbf24' },
                ]}
            >
                {isShield ? 'עמלה נחסמה!' : 'עמלה ספגת!'}
            </Text>
        </Animated.View>
    );
}

/* ------------------------------------------------------------------ */
/*  FeeAttackCard — center card showing the current fee attack          */
/* ------------------------------------------------------------------ */

function FeeAttackCard({
    lottieKey,
    feeName,
    feeAmount,
    description,
}: {
    lottieKey: string;
    feeName: string;
    feeAmount: number;
    description: string;
}) {
    const monthlyCost = feeAmount;
    const annualCost = monthlyCost * 12;

    const IconSource = LOTTIE_MAP[lottieKey] || LOTTIE_BANK;

    return (
        <View style={{ backgroundColor: SIM.cardBg, borderRadius: 20, borderWidth: 1.5, borderColor: SIM.cardBorder, shadowColor: SIM.primary, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 }}>
            <View style={styles.feeCardInner}>
                <View accessible={false}><LottieIcon source={IconSource} size={60} /></View>
                <Text style={[RTL, styles.feeName]}>{feeName}</Text>
                <View style={styles.feeCostsRow}>
                    <View style={styles.feeCostBadge}>
                        <Text style={styles.feeCostLabel}>חודשי</Text>
                        <Text style={styles.feeCostValue}>{'\u20AA'}{monthlyCost}</Text>
                    </View>
                    <View style={styles.feeCostBadge}>
                        <Text style={styles.feeCostLabel}>שנתי</Text>
                        <Text style={[styles.feeCostValue, { color: '#fbbf24' }]}>
                            {'\u20AA'}{annualCost.toLocaleString()}
                        </Text>
                    </View>
                </View>
                <Text style={[RTL, styles.feeDescription]}>{description}</Text>
            </View>
        </View>
    );
}

/* ------------------------------------------------------------------ */
/*  DefenseButton — styled as combat move                               */
/* ------------------------------------------------------------------ */

function DefenseButton({
    defense,
    onPress,
}: {
    defense: DefenseOption;
    onPress: () => void;
}) {
    const shakeX = useSharedValue(0);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: shakeX.value }],
    }));

    const handlePress = useCallback(() => {
        // Shake on press for tactile feel
        shakeX.value = withSequence(
            withTiming(-1, { duration: 50 }),
            withTiming(1, { duration: 50 }),
            withTiming(0, { duration: 50 }),
        );
        onPress();
    }, [onPress, shakeX]);

    // Color code by effectiveness
    const color =
        defense.effectiveness >= 80
            ? { bg: SIM.successLight, border: SIM.successBorder, text: SIM.success }
            : defense.effectiveness >= 40
              ? { bg: SIM.warningLight, border: SIM.warningBorder, text: SIM.warning }
              : { bg: SIM.warningLight, border: SIM.warningBorder, text: SIM.warning };

    return (
        <AnimatedPressable onPress={handlePress} accessibilityRole="button" accessibilityLabel={defense.label} accessibilityHint="בחר הגנה זו נגד מתקפת העמלה">
            <Animated.View
                style={[
                    styles.defenseButton,
                    { backgroundColor: color.bg, borderColor: color.border },
                    animStyle,
                ]}
            >
                <Text style={[RTL, { fontSize: 15, fontWeight: '700', color: color.text, textAlign: 'center' }]}>
                    {defense.label}
                </Text>
            </Animated.View>
        </AnimatedPressable>
    );
}

/* ------------------------------------------------------------------ */
/*  ScoreScreen — end-game summary                                      */
/* ------------------------------------------------------------------ */

function ScoreScreen({
    score,
    onReplay,
    onFinish,
}: {
    score: BankCombatScore;
    onReplay: () => void;
    onFinish: () => void;
}) {
    const gradeColor = GRADE_COLORS[score.grade] ?? SIM.textPrimary;

    return (
        <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1, justifyContent: 'center', gap: 12 }}>
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
                    <Text style={[RTL, TYPE.cardTitle]}>
                        סיכום הקרב שלך:
                    </Text>

                    <View style={simStyles.scoreRow}>
                        <View style={simStyles.scoreRowLeft}>
                            <LottieIcon source={LOTTIE_SHIELD} size={24} />
                            <Text style={[RTL, simStyles.scoreRowLabel]}>
                                עמלות נחסמו
                            </Text>
                        </View>
                        <Text style={[simStyles.scoreRowValue, { color: '#4ade80' }]}>
                            {score.feesBlocked}/{bankCombatConfig.rounds.length}
                        </Text>
                    </View>

                    <View style={simStyles.scoreRow}>
                        <View style={simStyles.scoreRowLeft}>
                            <LottieIcon source={LOTTIE_MONEY} size={24} />
                            <Text style={[RTL, simStyles.scoreRowLabel]}>
                                נחסך בשנה
                            </Text>
                        </View>
                        <Text style={[simStyles.scoreRowValue, { color: '#22c55e' }]}>
                            {'\u20AA'}{score.totalSaved.toLocaleString()}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Actions */}
            <View style={simStyles.actionsRow}>
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

/* ------------------------------------------------------------------ */
/*  BankCombatScreen — main exported component                          */
/* ------------------------------------------------------------------ */

export function BankCombatScreen({ onComplete }: { onComplete: () => void }) {
    const {
        state,
        currentRound,
        lastFeedback,
        handleDefense,
        score,
        resetGame,
    } = useBankCombat(bankCombatConfig);

    
    useEffect(() => {
        const player = createAudioPlayer({ uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/audio/sims/sim-bank-combat.mp3' });
        player.play();
        return () => {
            player.pause();
            player.release();
        };
    }, []);
const [showFeedback, setShowFeedback] = useState(false);
    const [hitType, setHitType] = useState<'shield' | 'damage' | null>(null);

    const onDefensePress = useCallback(
        (defense: DefenseOption) => {
            if (state.isComplete) return;

            const isBlocked = defense.effectiveness > 0;
            setHitType(isBlocked ? 'shield' : 'damage');

            if (isBlocked) {
                successHaptic();
            } else {
                errorHaptic();
            }

            heavyHaptic();
            handleDefense(defense);
            setShowFeedback(true);
        },
        [state.isComplete, handleDefense],
    );

    const dismissFeedback = useCallback(() => {
        setShowFeedback(false);
        setHitType(null);
    }, []);

    const handleReplay = useCallback(() => {
        resetGame();
        setShowFeedback(false);
        setHitType(null);
    }, [resetGame]);

    return (
        <SimLottieBackground
            lottieSources={[
                require('../../../../assets/lottie/wired-flat-483-building-hover-blinking.json'),
                require('../../../../assets/lottie/wired-flat-457-shield-security-hover-pinch.json'),
            ]}
            chapterColors={_th1.gradient}
        >
        <View style={{ flex: 1, paddingBottom: 16 }}>
            {/* ── Title ── */}
            <Animated.View entering={FadeInDown.delay(100)}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                    <View accessible={false}><LottieIcon source={LOTTIE_SHIELD} size={28} /></View>
                    <Text style={[RTL, styles.title]} accessibilityRole="header">להדוף עמלות</Text>
                </View>
                <Text style={[RTL, styles.subtitle]}>
                    יש לעצור את מתקפת עמלות הבנק בעזרת ההגנה הנכונה.
                </Text>
            </Animated.View>

            {/* ── Gameplay phase ── */}
            {!state.isComplete && currentRound && (
                <View style={{ flex: 1 }}>
                    {/* Health bars */}
                    <CombatArena
                        playerHealth={state.playerHealth}
                        maxPlayerHealth={bankCombatConfig.playerHealth}
                        bankHealth={state.bankHealth}
                    />

                    {/* Round indicator */}
                    <Text style={styles.roundIndicator} accessibilityLiveRegion="polite">
                        סיבוב {state.round + 1}/{bankCombatConfig.rounds.length}
                    </Text>

                    {/* Hit effect overlay */}
                    {showFeedback && hitType && <HitEffect type={hitType} />}

                    {/* Feedback overlay */}
                    {showFeedback && lastFeedback ? (
                        <Animated.View entering={FadeIn.duration(200)} style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 }}>
                            <SimFeedbackBar
                                isCorrect={hitType === 'shield'}
                                message={lastFeedback}
                                accentColor={SIM.primary}
                            />
                            <AnimatedPressable
                                onPress={dismissFeedback}
                                accessibilityRole="button"
                                accessibilityLabel="המשך"
                                accessibilityHint="ממשיך לסיבוב הבא"
                                style={{
                                    borderRadius: 14,
                                    borderWidth: 1.5,
                                    borderColor: SIM.btnPrimaryBorder,
                                    backgroundColor: SIM.btnPrimary,
                                    paddingVertical: 14,
                                    paddingHorizontal: 40,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Text style={[RTL, { fontSize: 15, fontWeight: '700', color: '#fff' }]}>המשך</Text>
                                <View style={{ position: 'absolute', left: 16 }}>
                                    <LottieIcon source={LOTTIE_ARROW} size={18} />
                                </View>
                            </AnimatedPressable>
                        </Animated.View>
                    ) : (
                        <>
                            {/* Fee attack card */}
                            <View style={styles.attackArea}>
                                <Animated.View
                                    key={`attack-${state.round}`}
                                    entering={FadeInUp.springify().damping(22)}
                                >
                                    <GlowCard chapterGlow={SIM.glow} style={{ backgroundColor: SIM.cardBg, padding: 0 }}>
                                        <FeeAttackCard
                                            lottieKey={currentRound.attack.lottieKey}
                                            feeName={currentRound.attack.feeName}
                                            feeAmount={currentRound.attack.feeAmount}
                                            description={currentRound.attack.description}
                                        />
                                    </GlowCard>
                                </Animated.View>
                            </View>

                            {/* Defense buttons */}
                            <View style={styles.defensesContainer}>
                                {currentRound.defenses.map((defense) => (
                                    <DefenseButton
                                        key={defense.id}
                                        defense={defense}
                                        onPress={() => onDefensePress(defense)}
                                    />
                                ))}
                            </View>
                        </>
                    )}
                </View>
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
    title: {
        ...TYPE.title,
        marginBottom: 4,
    },
    subtitle: {
        ...TYPE.subtitle,
        marginBottom: 8,
    },
    /* Arena / health bars */
    arenaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    healthBarContainer: {
        flex: 1,
    },
    healthBarHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
    },
    healthBarLabel: {
        ...TYPE.gradientLabel,
        flex: 1,
    },
    healthBarValue: {
        ...TYPE.gradientValue,
    },
    healthBarTrack: {
        height: 8,
        backgroundColor: SIM.trackBg,
        borderRadius: 4,
        overflow: 'hidden',
    },
    healthBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    /* Round indicator */
    roundIndicator: {
        ...TYPE.progress,
        marginBottom: 8,
    },
    /* Hit effect */
    hitOverlay: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 12,
        alignItems: 'center',
        gap: 4,
        marginBottom: 8,
    },
    hitText: {
        fontSize: 14,
        fontWeight: '800',
    },
    /* Fee attack card */
    attackArea: {
        justifyContent: 'center',
        paddingVertical: 8,
    },
    feeCardInner: {
        padding: 18,
        alignItems: 'center',
        gap: 8,
    },
    feeEmoji: {
        fontSize: 34,
        display: 'none',
    },
    feeName: {
        fontSize: 18,
        fontWeight: '800',
        color: SIM.textPrimary,
        textAlign: 'center',
    },
    feeCostsRow: {
        flexDirection: 'row',
        gap: 10,
        marginVertical: 4,
    },
    feeCostBadge: {
        alignItems: 'center',
        backgroundColor: 'rgba(251,191,36,0.08)',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: 'rgba(251,191,36,0.2)',
    },
    feeCostLabel: {
        fontSize: 14,
        color: SIM.textSecondary,
        fontWeight: '600',
    },
    feeCostValue: {
        fontSize: 18,
        fontWeight: '900',
        color: SIM.textPrimary,
    },
    feeDescription: {
        fontSize: 15,
        fontWeight: '600',
        color: SIM.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    /* Defense buttons */
    defensesContainer: {
        gap: 8,
        marginBottom: 12,
    },
    defenseButton: {
        borderRadius: 14,
        borderWidth: 1.5,
        paddingVertical: 14,
        paddingHorizontal: 14,
        alignItems: 'center',
    },
    /* Feedback */
    feedbackCard: {
        backgroundColor: 'rgba(5,150,105,0.1)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(5,150,105,0.25)',
        padding: 20,
        marginHorizontal: 8,
    },
    feedbackText: {
        fontSize: 14,
        fontWeight: '600',
        color: SIM.textPrimary,
        lineHeight: 22,
        textAlign: 'center',
    },
    continueButton: {
        alignSelf: 'center',
        marginTop: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(5,150,105,0.4)',
        backgroundColor: 'rgba(5,150,105,0.15)',
        paddingVertical: 12,
        paddingHorizontal: 32,
    },
});