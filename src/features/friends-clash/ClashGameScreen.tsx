import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSequence,
    withTiming,
    withSpring,
    FadeIn,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Swords } from 'lucide-react-native';
import { useClashStore, SECONDS_PER_QUESTION } from './useClashStore';
import { useAuthStore } from '../auth/useAuthStore';
import { AnimatedPressable } from '../../components/ui/AnimatedPressable';
import { successHaptic, errorHaptic, tapHaptic } from '../../utils/haptics';
import { useTimeoutCleanup } from '../../hooks/useTimeoutCleanup';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

export function ClashGameScreen() {
    const router = useRouter();
    const session = useClashStore((s) => s.activeSession);
    const answerQuestion = useClashStore((s) => s.answerQuestion);
    const nextQuestion = useClashStore((s) => s.nextQuestion);
    const displayName = useAuthStore((s) => s.displayName) ?? 'אתה';

    const safeTimeout = useTimeoutCleanup();
    const [timer, setTimer] = useState(SECONDS_PER_QUESTION);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Shake animation
    const shakeX = useSharedValue(0);
    const shakeStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: shakeX.value }],
    }));

    // Score pulse
    const userScorePulse = useSharedValue(1);
    const opponentScorePulse = useSharedValue(1);
    const userPulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: userScorePulse.value }],
    }));
    const opponentPulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: opponentScorePulse.value }],
    }));

    // Start question timer
    useEffect(() => {
        if (!session || session.isComplete || feedback) return;

        setTimer(SECONDS_PER_QUESTION);
        timerRef.current = setInterval(() => {
            setTimer((prev) => {
                if (prev <= 1) {
                    // Time's up, auto-wrong
                    clearInterval(timerRef.current!);
                    handleTimeout();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [session?.currentQuestionIndex, session?.isComplete, feedback]);

    const handleTimeout = useCallback(() => {
        if (feedback) return;
        errorHaptic();
        setFeedback('wrong');
        setSelectedIdx(null);
        shakeX.value = withSequence(
            withTiming(-8, { duration: 50 }),
            withTiming(8, { duration: 50 }),
            withTiming(-6, { duration: 50 }),
            withTiming(6, { duration: 50 }),
            withTiming(0, { duration: 50 }),
        );
        // Opponent still gets a chance
        answerQuestion(-1); // -1 = timeout, always wrong

        safeTimeout(() => {
            setFeedback(null);
            setSelectedIdx(null);
            nextQuestion();
        }, 1500);
    }, [feedback, answerQuestion, nextQuestion, shakeX, safeTimeout]);

    const handleAnswer = useCallback((idx: number) => {
        if (feedback || !session) return;
        tapHaptic();

        // Stop timer
        if (timerRef.current) clearInterval(timerRef.current);

        setSelectedIdx(idx);
        const isCorrect = answerQuestion(idx);

        if (isCorrect) {
            successHaptic();
            setFeedback('correct');
            userScorePulse.value = withSpring(1.3, {}, () => {
                userScorePulse.value = withSpring(1);
            });
        } else {
            errorHaptic();
            setFeedback('wrong');
            shakeX.value = withSequence(
                withTiming(-8, { duration: 50 }),
                withTiming(8, { duration: 50 }),
                withTiming(-6, { duration: 50 }),
                withTiming(6, { duration: 50 }),
                withTiming(0, { duration: 50 }),
            );
        }

        // Opponent score pulse (random)
        opponentScorePulse.value = withSpring(1.2, {}, () => {
            opponentScorePulse.value = withSpring(1);
        });

        // Auto-advance
        safeTimeout(() => {
            setFeedback(null);
            setSelectedIdx(null);
            if (session.currentQuestionIndex >= session.questions.length - 1) {
                // Last question, go to results
                router.replace('/clash/result');
            } else {
                nextQuestion();
            }
        }, 1800);
    }, [feedback, session, answerQuestion, nextQuestion, router, shakeX, userScorePulse, opponentScorePulse, safeTimeout]);

    // Navigate to results when complete
    useEffect(() => {
        if (session?.isComplete) {
            router.replace('/clash/result');
        }
    }, [session?.isComplete, router]);

    if (!session) {
        return (
            <SafeAreaView className="flex-1 bg-zinc-950 items-center justify-center">
                <Text className="text-zinc-400">אין אתגר פעיל</Text>
            </SafeAreaView>
        );
    }

    const question = session.questions[session.currentQuestionIndex];
    const questionNum = session.currentQuestionIndex + 1;
    const totalQuestions = session.questions.length;
    const timerPercent = (timer / SECONDS_PER_QUESTION) * 100;
    const timerColor = timer <= 5 ? '#ef4444' : timer <= 10 ? '#f59e0b' : '#22c55e';

    return (
        <SafeAreaView className="flex-1 bg-zinc-950" edges={['top', 'bottom']}>
            {/* ── Header: Scores ── */}
            <View style={styles.header}>
                {/* User score */}
                <Animated.View style={[styles.scoreCard, userPulseStyle]}>
                    <Text style={styles.scoreName} numberOfLines={1}>{displayName}</Text>
                    <Text style={[styles.scoreValue, { color: '#a78bfa' }]}>{session.userScore}</Text>
                </Animated.View>

                {/* VS */}
                <View style={styles.vsBadge}>
                    <Swords size={16} color="#facc15" />
                </View>

                {/* Opponent score */}
                <Animated.View style={[styles.scoreCard, opponentPulseStyle]}>
                    <Text style={styles.scoreName} numberOfLines={1}>{session.opponentName}</Text>
                    <Text style={[styles.scoreValue, { color: '#f97316' }]}>{session.opponentScore}</Text>
                </Animated.View>
            </View>

            {/* ── Timer bar ── */}
            <View style={styles.timerBarContainer}>
                <View style={[styles.timerBarFill, { width: `${timerPercent}%`, backgroundColor: timerColor }]} />
            </View>
            <View className="flex-row items-center justify-between px-5 mt-1 mb-4">
                <Text className="text-xs text-zinc-500" style={RTL}>
                    שאלה {questionNum} מתוך {totalQuestions}
                </Text>
                <Text style={[styles.timerText, { color: timerColor }]}>
                    {timer}s
                </Text>
            </View>

            {/* ── Question ── */}
            <View className="flex-1 px-5">
                <Animated.View entering={FadeIn.duration(300)} key={question.id} style={shakeStyle}>
                    {/* Question card */}
                    <View style={styles.questionCard}>
                        <Text style={[styles.difficultyBadgeText, {
                            color: question.difficulty === 'hard' ? '#ef4444' : question.difficulty === 'medium' ? '#f59e0b' : '#22c55e',
                        }]}>
                            {question.difficulty === 'hard' ? '🔥 קשה' : question.difficulty === 'medium' ? '⚡ בינוני' : '✅ קל'}
                        </Text>
                        <Text style={styles.questionText}>{question.question}</Text>
                    </View>

                    {/* Options */}
                    <View className="gap-3 mt-4">
                        {question.options.map((option, idx) => {
                            let bgColor = '#18181b';
                            let borderColor = '#27272a';

                            if (feedback && idx === question.correctAnswer) {
                                bgColor = 'rgba(34,197,94,0.15)';
                                borderColor = '#22c55e';
                            } else if (feedback && idx === selectedIdx && !feedback.startsWith('c')) {
                                bgColor = 'rgba(239,68,68,0.15)';
                                borderColor = '#ef4444';
                            }

                            return (
                                <AnimatedPressable
                                    key={`${question.id}-${idx}`}
                                    onPress={() => handleAnswer(idx)}
                                    disabled={feedback !== null}
                                    style={[styles.optionBtn, { backgroundColor: bgColor, borderColor }]}
                                    accessibilityRole="button"
                                    accessibilityLabel={`תשובה ${idx + 1}: ${option}`}
                                >
                                    <Text style={styles.optionText}>{option}</Text>
                                </AnimatedPressable>
                            );
                        })}
                    </View>
                </Animated.View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
    },
    scoreCard: {
        flex: 1,
        alignItems: 'center',
        borderRadius: 16,
        backgroundColor: '#1c1c22',
        borderWidth: 1,
        borderColor: '#27272a',
        paddingVertical: 10,
        paddingHorizontal: 8,
    },
    scoreName: {
        fontSize: 11,
        fontWeight: '700',
        color: '#a1a1aa',
        marginBottom: 2,
    },
    scoreValue: {
        fontSize: 28,
        fontWeight: '900',
        fontVariant: ['tabular-nums'],
    },
    vsBadge: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#18181b',
        borderWidth: 1.5,
        borderColor: '#facc15',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#facc15',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
    },
    timerBarContainer: {
        height: 4,
        backgroundColor: '#27272a',
        marginHorizontal: 20,
        borderRadius: 2,
        overflow: 'hidden',
    },
    timerBarFill: {
        height: '100%',
        borderRadius: 2,
    },
    timerText: {
        fontSize: 14,
        fontWeight: '900',
        fontVariant: ['tabular-nums'],
    },
    questionCard: {
        borderRadius: 20,
        backgroundColor: '#1c1c22',
        borderWidth: 1,
        borderColor: '#27272a',
        padding: 20,
    },
    difficultyBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 8,
        writingDirection: 'rtl',
        textAlign: 'right',
    },
    questionText: {
        fontSize: 18,
        fontWeight: '800',
        color: '#fafafa',
        lineHeight: 28,
        writingDirection: 'rtl',
        textAlign: 'right',
    },
    optionBtn: {
        borderRadius: 16,
        borderWidth: 1.5,
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    optionText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#e4e4e7',
        writingDirection: 'rtl',
        textAlign: 'right',
        lineHeight: 22,
    },
});
