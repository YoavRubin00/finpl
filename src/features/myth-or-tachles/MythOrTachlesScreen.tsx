import { useState, useMemo, useCallback } from 'react';
import { View, Text, Modal, Pressable, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuthStore } from '../auth/useAuthStore';
import { useEconomyStore } from '../economy/useEconomyStore';
import { useSoundEffect } from '../../hooks/useSoundEffect';
import { tapHaptic } from '../../utils/haptics';
import { buildPersonalizedDeck } from './mythData';
import { useMythStore } from './useMythStore';
import { MythCardDeck } from './MythCardDeck';
import { MythFeedbackModal } from './MythFeedbackModal';
import type { MythCard } from './mythTypes';

const COIN_REWARD = 10;

interface Props {
    visible: boolean;
    onClose: () => void;
}

export function MythOrTachlesScreen({ visible, onClose }: Props) {
    const profile = useAuthStore((s) => s.profile);
    const seenIds = useMythStore((s) => s.seenIds);
    const totalCorrect = useMythStore((s) => s.totalCorrect);
    const totalPlayed = useMythStore((s) => s.totalPlayed);
    const markAnswered = useMythStore((s) => s.markAnswered);
    const { playSound } = useSoundEffect();

    // Build deck on open (stable until seenIds changes)
    const deck = useMemo(
        () => buildPersonalizedDeck(profile?.financialGoal, seenIds),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [visible],
    );

    const [currentIndex, setCurrentIndex] = useState(0);
    const [feedbackCard, setFeedbackCard] = useState<MythCard | null>(null);
    const [feedbackVisible, setFeedbackVisible] = useState(false);
    const [wasCorrect, setWasCorrect] = useState(false);

    // Session-level score (reset when screen reopens)
    const [sessionCorrect, setSessionCorrect] = useState(0);
    const [sessionWrong, setSessionWrong] = useState(0);

    const handleSwipe = useCallback(
        (card: MythCard, direction: 'left' | 'right') => {
            const correct = (direction === 'right') === card.isTrue;

            markAnswered(card.id, correct);

            if (correct) {
                useEconomyStore.getState().addCoins(COIN_REWARD);
                useEconomyStore.getState().addXP(5, 'quiz_correct');
                setSessionCorrect((n) => n + 1);
            } else {
                setSessionWrong((n) => n + 1);
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

    const handleClose = useCallback(() => {
        tapHaptic();
        onClose();
        // Reset local state for next open
        setCurrentIndex(0);
        setSessionCorrect(0);
        setSessionWrong(0);
        setFeedbackVisible(false);
        setFeedbackCard(null);
    }, [onClose]);

    const visibleCards = deck.slice(currentIndex);

    const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            statusBarTranslucent
            onRequestClose={handleClose}
        >
            <StatusBar barStyle="light-content" backgroundColor="#0d0c1f" />
            <SafeAreaView style={styles.container}>
                {/* Header */}
                <Animated.View entering={FadeInDown.duration(300)} style={styles.header}>
                    <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={12}>
                        <Text style={styles.closeBtnText}>✕</Text>
                    </Pressable>

                    <View style={styles.titleBlock}>
                        <Text style={[styles.title, RTL]}>מיתוס או תכל׳ס 🃏</Text>
                        <Text style={[styles.subtitle, RTL]}>האם אתה יכול לזהות את האמת?</Text>
                    </View>
                </Animated.View>

                {/* Score row */}
                <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.scoreRow}>
                    <View style={[styles.scoreBadge, styles.correctBadge]}>
                        <Text style={styles.scoreBadgeText}>✅ {sessionCorrect}</Text>
                    </View>
                    <View style={styles.scoreDivider} />
                    <View style={[styles.scoreBadge, styles.wrongBadge]}>
                        <Text style={styles.scoreBadgeText}>❌ {sessionWrong}</Text>
                    </View>
                    <View style={styles.scoreTotal}>
                        <Text style={styles.scoreTotalText}>סה"כ {totalPlayed} שיחקת</Text>
                    </View>
                </Animated.View>

                {/* Card deck */}
                <Animated.View entering={FadeInDown.delay(200).duration(350)} style={styles.deckWrapper}>
                    <MythCardDeck cards={visibleCards} onSwipe={handleSwipe} />
                </Animated.View>

                {/* Cards remaining */}
                {visibleCards.length > 0 && (
                    <Text style={styles.remaining}>
                        {visibleCards.length} קלפים נותרו
                    </Text>
                )}

                {/* Feedback modal */}
                <MythFeedbackModal
                    visible={feedbackVisible}
                    card={feedbackCard}
                    wasCorrect={wasCorrect}
                    onNext={handleNext}
                />
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0d0c1f',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8,
        gap: 12,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeBtnText: {
        fontSize: 16,
        color: '#22d3ee',
        fontWeight: '700',
    },
    titleBlock: {
        flex: 1,
        alignItems: 'flex-end',
    },
    title: {
        fontSize: 20,
        fontWeight: '900',
        color: '#f1f0ff',
    },
    subtitle: {
        fontSize: 13,
        color: '#8b7fc7',
        marginTop: 2,
    },
    scoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        gap: 8,
    },
    scoreBadge: {
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 6,
    },
    correctBadge: {
        backgroundColor: 'rgba(34,197,94,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(34,197,94,0.3)',
    },
    wrongBadge: {
        backgroundColor: 'rgba(239,68,68,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(239,68,68,0.3)',
    },
    scoreBadgeText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#f1f0ff',
    },
    scoreDivider: {
        width: 1,
        height: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    scoreTotal: {
        flex: 1,
        alignItems: 'flex-end',
    },
    scoreTotalText: {
        fontSize: 12,
        color: '#a78bfa',
        writingDirection: 'rtl',
    },
    deckWrapper: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 8,
    },
    remaining: {
        textAlign: 'center',
        color: '#a78bfa',
        fontSize: 13,
        paddingBottom: 24,
        writingDirection: 'rtl',
    },
});
