import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { tapHaptic } from '../../utils/haptics';
import { useEconomyUIStore } from '../economy/useEconomyUIStore';
import { useSoundEffect } from '../../hooks/useSoundEffect';
import { LottieIcon } from '../../components/ui/LottieIcon';
import { buildPersonalizedDeck } from './mythData';
import { useMythStore, MYTH_COOLDOWN_MS } from './useMythStore';
import { useIsPro } from '../subscription/useSubscription';
import { useAuthStore } from '../auth/useAuthStore';
import { MythCardDeck } from './MythCardDeck';
import { MythFeedbackModal } from './MythFeedbackModal';
import type { MythCard } from './mythTypes';
import { useModifiersStore, type ModifierType } from '../economy/useModifiersStore';
import { FlyingRewards } from '../../components/ui/FlyingRewards';

const LOTTIE_CARDS = require('../../../assets/lottie/wired-flat-3154-cards-club-hover-pinch.json');

export const MythFeedCard = React.memo(function MythFeedCard({
    isInterModule,
    onSkip,
    hideContinueButton,
    onReadyToContinue,
}: {
    isInterModule?: boolean;
    onSkip?: () => void;
    /** Pearl flow: when true, the in-card "סיימתי, המשך" is suppressed so
     *  PearlGameStage can render a sticky CTA above the safe-area instead.
     *  Mirrors the DilemmaCard / InvestmentCard hideContinueButton pattern. */
    hideContinueButton?: boolean;
    /** Pearl flow: fires (true) once the user has answered ≥2 swipes, (false)
     *  on reset. PearlGameStage uses this to flip its sticky CTA on/off. */
    onReadyToContinue?: (ready: boolean) => void;
}) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const profile = useAuthStore((s) => s.profile);
    const {
        seenIds,
        totalCorrect,
        totalPlayed,
        markAnswered,
        canPlayMyth,
        resetMythSessionIfCooldownElapsed,
        lastMythSessionTime,
    } = useMythStore();
    const isPro = useIsPro();
    const { playSound } = useSoundEffect();

    useEffect(() => { resetMythSessionIfCooldownElapsed(); }, []);

    const isBlocked = !canPlayMyth(isPro);

    // Auto-skip if blocked and shown between modules
    useEffect(() => {
        if (isInterModule && isBlocked && onSkip) {
            onSkip();
        }
    }, [isInterModule, isBlocked, onSkip]);

    // Countdown timer
    const [cooldownLeft, setCooldownLeft] = useState('');
    useEffect(() => {
        if (!isBlocked) return;
        function tick() {
            const remaining = Math.max(0, MYTH_COOLDOWN_MS - (Date.now() - lastMythSessionTime));
            const h = Math.floor(remaining / 3600000);
            const m = Math.floor((remaining % 3600000) / 60000);
            const s = Math.floor((remaining % 60000) / 1000);
            setCooldownLeft(`${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
        }
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [isBlocked, lastMythSessionTime]);

    const deck = useMemo(
        () => buildPersonalizedDeck(profile?.financialGoal, seenIds),
        [seenIds.length],
    );

    const [currentIndex, setCurrentIndex] = useState(0);
    const [feedbackCard, setFeedbackCard] = useState<MythCard | null>(null);
    const [feedbackVisible, setFeedbackVisible] = useState(false);
    const [wasCorrect, setWasCorrect] = useState(false);
    const [sessionCorrect, setSessionCorrect] = useState(0);
    const [sessionWrong, setSessionWrong] = useState(0);

    // Pearl-flow: report readiness to PearlGameStage so it can show a
    // sticky bottom continue bar OUTSIDE the ScrollView, matching the
    // Daily Challenge pearl pattern. Threshold: 2 answered swipes (raised
    // from the in-card threshold of 1 — user request 2026-06-05 to give
    // a real chance for the user to engage before the exit appears).
    const totalAnswered = sessionCorrect + sessionWrong;
    useEffect(() => {
        if (!isInterModule || !onReadyToContinue) return;
        onReadyToContinue(totalAnswered >= 2);
    }, [isInterModule, onReadyToContinue, totalAnswered]);
    const [modifierWon, setModifierWon] = useState<ModifierType | null>(null);
    const [showFlyingCoins, setShowFlyingCoins] = useState(false);
    const addModifier = useModifiersStore((s) => s.addModifier);

    const handleSwipe = useCallback(
        (card: MythCard, direction: 'left' | 'right') => {
            const correct = (direction === 'right') === card.isTrue;
            markAnswered(card.id, correct);
            if (correct) {
                useEconomyUIStore.getState().addCoins(10);
                useEconomyUIStore.getState().addXP(5, 'quiz_correct');
                setShowFlyingCoins(true);
                setTimeout(() => setShowFlyingCoins(false), 1500);
                setSessionCorrect((n) => n + 1);

                // 20% chance to win a 24-hr modifier!
                if (Math.random() < 0.20) {
                    const types: ModifierType[] = ['real_estate_discount', 'salary_boost'];
                    const mod = types[Math.floor(Math.random() * types.length)];
                    addModifier(mod, 0.1, 24); // 10% for 24 hours
                    setModifierWon(mod);
                } else {
                    setModifierWon(null);
                }
            } else {
                setSessionWrong((n) => n + 1);
                setModifierWon(null);
            }
            void playSound('btn_click_heavy');
            setWasCorrect(correct);
            setFeedbackCard(card);
            setFeedbackVisible(true);
        },
        [markAnswered, playSound],
    );

    const handleNext = useCallback(() => {
        setFeedbackVisible(false);
        setFeedbackCard(null);
        setCurrentIndex((i) => i + 1);
    }, []);

    const visibleCards = deck.slice(currentIndex);

    return (
        <View style={styles.container}>
            {showFlyingCoins && <FlyingRewards type="coins" amount={10} onComplete={() => setShowFlyingCoins(false)} />}
            {/* Header */}
            <Animated.View style={styles.header}>
                <View style={styles.titleRow}>
                    <Text style={styles.title}>מיתוס או תכל׳ס 🃏</Text>
                    <Text style={styles.subtitle}>האם אתה יכול לזהות את האמת?</Text>
                </View>
                {totalPlayed > 0 && (
                    <View style={styles.scoreRow}>
                        <View style={[styles.scoreBadge, styles.correctBadge]}>
                            <Text style={styles.scoreBadgeText}>✅ {sessionCorrect}</Text>
                        </View>
                        <View style={[styles.scoreBadge, styles.wrongBadge]}>
                            <Text style={styles.scoreBadgeText}>❌ {sessionWrong}</Text>
                        </View>
                        <Text style={styles.scoreTotalText}>{totalPlayed} שיחקת</Text>
                    </View>
                )}
            </Animated.View>

            {/* Blocked state */}
            {isBlocked ? (
                <Animated.View style={styles.blockedContainer}>
                    <LottieIcon source={LOTTIE_CARDS} size={64} />
                    <Text style={styles.blockedTitle}>השלמת את המנה שלך לעכשיו ⏳</Text>
                    <Text style={styles.blockedTimer}>{cooldownLeft}</Text>
                    <Pressable
                        style={({ pressed }) => [pressed && { opacity: 0.85 }]}
                        onPress={() => { tapHaptic(); router.push('/pricing' as never); }}
                    >
                        <LinearGradient
                            colors={['#0a2540', '#164e63', '#0a2540']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.proBtn}
                        >
                            <LottieIcon source={require('../../../assets/lottie/Pro Animation 3rd.json')} size={32} autoPlay loop />
                            <Text style={styles.proBtnText}>שדרג ל-PRO, ללא הגבלה</Text>
                        </LinearGradient>
                    </Pressable>
                </Animated.View>
            ) : (
                <>
                    {/* Card deck */}
                    <Animated.View style={styles.deckWrapper}>
                        <MythCardDeck
                            cards={visibleCards}
                            onSwipe={handleSwipe}
                            lightTheme
                        />
                    </Animated.View>

                    {/* Inside a Pearl/inter-module flow the deck is otherwise
                        infinite — there's no natural "end of session" event
                        to advance the pager. Surface the "סיימתי, המשך"
                        button as soon as the user has answered AT LEAST ONE
                        card so they're never trapped without a way forward.
                        Earlier the threshold was 3 (force engagement) but
                        users reported "אחרי שעניתי אין כפתור המשך" — the gate
                        broke the pearl flow on iPhone (2026-06-01). */}
                    {isInterModule && onSkip && !hideContinueButton && (sessionCorrect + sessionWrong) >= 1 ? (
                        <View style={[styles.doneWrap, { paddingBottom: Math.max(insets.bottom, 8) + 8 }]}>
                            <Pressable
                                onPress={() => { tapHaptic(); onSkip(); }}
                                accessibilityRole="button"
                                accessibilityLabel="סיימתי, המשך"
                                style={({ pressed }) => [styles.doneBtn, pressed && styles.doneBtnPressed]}
                            >
                                <Text style={styles.doneBtnText} allowFontScaling={false}>סיימתי, המשך</Text>
                            </Pressable>
                        </View>
                    ) : null}
                </>
            )}

            {/* Feedback modal */}
            <MythFeedbackModal
                visible={feedbackVisible}
                card={feedbackCard}
                wasCorrect={wasCorrect}
                modifierWon={modifierWon}
                onNext={handleNext}
            />
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        minHeight: 560,
        backgroundColor: '#f8fafc',
        paddingTop: 4,
    },
    // Sticky-bottom CTA bar — mirrors PearlGameStage.stickyBar so the
    // pearl's "סיימתי, המשך" looks like the same affordance as every other
    // Continue inside Pearl flows. paddingBottom is applied INLINE from
    // useSafeAreaInsets so a 3-button Android nav bar (~48px) gets real
    // breathing room and the iPhone home-indicator (~34px) sits naturally
    // below the press depth, instead of the previous flat 18px which
    // pressed the button up against the system bar.
    doneWrap: {
        paddingHorizontal: 16,
        paddingTop: 12,
        backgroundColor: 'rgba(248,250,252,0.96)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(148,163,184,0.25)',
    },
    doneBtn: {
        backgroundColor: '#0ea5e9',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderBottomWidth: 4,
        borderBottomColor: '#0284c7',
    },
    doneBtnPressed: {
        opacity: 0.92,
        transform: [{ scale: 0.99 }],
    },
    doneBtnText: {
        fontSize: 17,
        fontWeight: '900',
        color: '#ffffff',
        writingDirection: 'rtl',
        letterSpacing: 0.3,
    },
    header: {
        paddingHorizontal: 20,
        paddingBottom: 4,
        gap: 6,
    },
    titleRow: {
        alignItems: 'flex-end',
        gap: 2,
    },
    title: {
        fontSize: 20,
        fontWeight: '900',
        color: '#111827',
        writingDirection: 'rtl',
        textAlign: 'right',
    },
    subtitle: {
        fontSize: 12,
        color: '#6b7280',
        writingDirection: 'rtl',
        textAlign: 'right',
    },
    scoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        justifyContent: 'flex-end',
    },
    scoreBadge: {
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderWidth: 1,
    },
    correctBadge: {
        backgroundColor: 'rgba(34,197,94,0.08)',
        borderColor: 'rgba(34,197,94,0.3)',
    },
    wrongBadge: {
        backgroundColor: 'rgba(239,68,68,0.08)',
        borderColor: 'rgba(239,68,68,0.3)',
    },
    scoreBadgeText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#374151',
    },
    scoreTotalText: {
        fontSize: 12,
        color: '#64748b',
        writingDirection: 'rtl',
    },
    deckWrapper: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 12,
    },
    remaining: {
        textAlign: 'center',
        color: '#64748b',
        fontSize: 13,
        paddingBottom: 20,
        writingDirection: 'rtl',
    },
    // Blocked state
    blockedContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        gap: 12,
    },
    blockedEmoji: {
        fontSize: 64,
    },
    blockedTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#111827',
        writingDirection: 'rtl',
        textAlign: 'center',
    },
    blockedTimer: {
        fontSize: 32,
        fontWeight: '900',
        color: '#0891b2',
        letterSpacing: 2,
    },
    proBtn: {
        borderRadius: 16,
        overflow: 'hidden',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 24,
        paddingVertical: 14,
        marginTop: 8,
        shadowColor: '#0a2540',
        shadowOpacity: 0.4,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
    },
    proBtnText: {
        fontSize: 15,
        fontWeight: '900',
        color: '#ffffff',
        writingDirection: 'rtl',
    },
});
