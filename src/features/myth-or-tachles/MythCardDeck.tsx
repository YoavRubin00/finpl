import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    interpolate,
    runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { MythCard } from './mythTypes';
import { FadeIn } from 'react-native-reanimated';

const MYTH_BGS: Record<string, number | undefined> = {
  'בנקים ועו"ש': require('../../../assets/IMAGES/myths/bg_banks.png'),
  'אשראי והלוואות': require('../../../assets/IMAGES/myths/bg_credit.png'),
  'עבודה ומיסים': require('../../../assets/IMAGES/myths/bg_taxes.png'),
  'שוק ההון': require('../../../assets/IMAGES/myths/bg_markets.png'),
  'פנסיה וגמל': require('../../../assets/IMAGES/myths/bg_pension.png'),
};

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W - 48;
const SWIPE_THRESHOLD = 100;
const SWIPE_OUT_X = SCREEN_W * 1.4;

interface Props {
    cards: MythCard[];
    onSwipe: (card: MythCard, direction: 'left' | 'right') => void;
    lightTheme?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Single swipeable card (top of deck)                                */
/* ------------------------------------------------------------------ */

interface SwipeCardProps {
    card: MythCard;
    onSwipe: (card: MythCard, direction: 'left' | 'right') => void;
    isTop: boolean;
    lightTheme?: boolean;
}

function SwipeCard({ card, onSwipe, isTop, lightTheme }: SwipeCardProps) {
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);

    const fireSwipe = useCallback(
        (direction: 'left' | 'right') => {
            onSwipe(card, direction);
        },
        [card, onSwipe],
    );

    const gesture = Gesture.Pan()
        .runOnJS(true)
        .onUpdate((e) => {
            if (!isTop) return;
            translateX.value = e.translationX;
            translateY.value = e.translationY * 0.3;
        })
        .onEnd((e) => {
            if (!isTop) return;
            if (Math.abs(e.translationX) > SWIPE_THRESHOLD) {
                const dir = e.translationX > 0 ? 'right' : 'left';
                const targetX = dir === 'right' ? SWIPE_OUT_X : -SWIPE_OUT_X;
                translateX.value = withTiming(targetX, { duration: 280 });
                runOnJS(fireSwipe)(dir);
            } else {
                translateX.value = withSpring(0, { damping: 15, stiffness: 200 });
                translateY.value = withSpring(0, { damping: 15, stiffness: 200 });
            }
        });

    const cardStyle = useAnimatedStyle(() => {
        const rotate = interpolate(translateX.value, [-SCREEN_W, SCREEN_W], [-18, 18]);
        return {
            transform: [
                { translateX: translateX.value },
                { translateY: translateY.value },
                { rotate: `${rotate}deg` },
            ],
        };
    });

    const greenOverlayStyle = useAnimatedStyle(() => ({
        opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], 'clamp'),
    }));

    const redOverlayStyle = useAnimatedStyle(() => ({
        opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], 'clamp'),
    }));

    const isRTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };
    const cardBg = lightTheme ? '#ffffff' : '#12112a';
    const cardBorder = lightTheme ? 'rgba(8,145,178,0.2)' : 'rgba(8,145,178,0.5)';
    const statementColor = lightTheme ? '#111827' : '#f1f0ff';
    const badgeBg = lightTheme ? 'rgba(8,145,178,0.08)' : 'rgba(8,145,178,0.2)';

    return (
        <GestureDetector gesture={isTop ? gesture : Gesture.Pan()}>
            <Animated.View style={[styles.card, cardStyle, { backgroundColor: cardBg, borderColor: cardBorder, overflow: 'hidden' }]} accessible accessibilityRole="button" accessibilityLabel={card.statement} accessibilityHint="החלק ימינה לתכל׳ס, שמאלה למיתוס">
                {/* Green "תכל'ס" overlay */}
                <Animated.View style={[styles.overlay, styles.greenOverlay, greenOverlayStyle]}>
                    <Text style={styles.overlayText}>תכל׳ס ✅</Text>
                </Animated.View>

                {/* Red "מיתוס" overlay */}
                <Animated.View style={[styles.overlay, styles.redOverlay, redOverlayStyle]}>
                    <Text style={styles.overlayText}>מיתוס ❌</Text>
                </Animated.View>

                {/* Category badge */}
                <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                    <Text style={styles.badgeText}>{card.category}</Text>
                </View>

                {/* Statement */}
                <View style={styles.statementWrap}>
                    <Text style={[styles.statement, isRTL, { color: statementColor }]}>{card.statement}</Text>
                </View>

                {/* Infographic — flexible space */}
                {MYTH_BGS[card.category?.trim?.() || card.category] && (
                    <View style={styles.infographicWrap}>
                        <Animated.Image
                            entering={FadeIn.duration(800)}
                            source={MYTH_BGS[card.category?.trim?.() || card.category]}
                            style={styles.infographic}
                            resizeMode="contain"
                            accessible={false}
                        />
                    </View>
                )}

                {/* Swipe hints */}
                <View style={styles.hintsRow}>
                    <View style={styles.hintLeft}>
                        <Text style={styles.hintTextRed}>מיתוס ←</Text>
                    </View>
                    <View style={styles.hintRight}>
                        <Text style={styles.hintTextGreen}>→ תכל׳ס</Text>
                    </View>
                </View>
            </Animated.View>
        </GestureDetector>
    );
}

/* ------------------------------------------------------------------ */
/*  Background card (non-interactive, visual depth)                    */
/* ------------------------------------------------------------------ */

function BackCard({ offset }: { offset: number }) {
    const scale = 1 - offset * 0.04;
    const translateY = offset * 10;
    return (
        <Animated.View
            accessible={false}
            style={[
                styles.card,
                styles.backCard,
                {
                    transform: [{ scale }, { translateY }],
                    zIndex: -offset,
                    opacity: 1 - offset * 0.2,
                },
            ]}
        />
    );
}

/* ------------------------------------------------------------------ */
/*  MythCardDeck — exported component                                  */
/* ------------------------------------------------------------------ */

export const MythCardDeck = React.memo(function MythCardDeck({ cards, onSwipe, lightTheme }: Props) {
    if (cards.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>🎉</Text>
                <Text style={styles.emptyLabel}>סיימת את כל הקלפים!</Text>
                <Text style={styles.emptySubLabel}>בפעם הבאה הכולם יחזרו</Text>
            </View>
        );
    }

    return (
        <View style={styles.deckContainer}>
            {/* Back cards (depth) */}
            {cards.length > 2 && <BackCard offset={2} />}
            {cards.length > 1 && <BackCard offset={1} />}

            {/* Top swipeable card */}
            <SwipeCard
                key={cards[0].id}
                card={cards[0]}
                onSwipe={onSwipe}
                isTop
                lightTheme={lightTheme}
            />
        </View>
    );
});

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
    deckContainer: {
        width: CARD_W,
        alignSelf: 'center',
        height: CARD_W * 1.42,
        alignItems: 'center',
        justifyContent: 'center',
    },
    card: {
        position: 'absolute',
        width: CARD_W,
        height: CARD_W * 1.37,
        backgroundColor: '#12112a',
        borderRadius: 24,
        padding: 28,
        borderWidth: 1.5,
        borderColor: 'rgba(8,145,178,0.5)',
        justifyContent: 'space-between',
        // Shadow
        shadowColor: '#0891b2',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    backCard: {
        backgroundColor: '#1a1739',
        borderColor: 'rgba(8,145,178,0.25)',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    greenOverlay: {
        backgroundColor: 'rgba(34,197,94,0.15)',
        borderWidth: 2,
        borderColor: '#22c55e',
    },
    redOverlay: {
        backgroundColor: 'rgba(239,68,68,0.15)',
        borderWidth: 2,
        borderColor: '#ef4444',
    },
    overlayText: {
        fontSize: 38,
        fontWeight: '900',
        color: '#ffffff',
        letterSpacing: 1,
    },
    badge: {
        alignSelf: 'flex-end',
        backgroundColor: 'rgba(8,145,178,0.2)',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: 'rgba(8,145,178,0.5)',
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#22d3ee',
        writingDirection: 'rtl',
    },
    statementWrap: {
        flex: 0,
    },
    statement: {
        fontSize: 22,
        fontWeight: '700',
        color: '#f1f0ff',
        lineHeight: 32,
        textAlignVertical: 'center',
        paddingVertical: 8,
    },
    hintsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    hintLeft: {
        opacity: 0.5,
    },
    hintRight: {
        opacity: 0.5,
    },
    hintTextRed: {
        fontSize: 13,
        color: '#ef4444',
        fontWeight: '600',
    },
    hintTextGreen: {
        fontSize: 13,
        color: '#22c55e',
        fontWeight: '600',
    },
    infographicWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 4,
    },
    infographic: {
        width: '100%',
        height: '100%',
        opacity: 0.85,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        height: CARD_W * 1.37,
        gap: 12,
    },
    emptyText: {
        fontSize: 64,
    },
    emptyLabel: {
        fontSize: 22,
        fontWeight: '800',
        color: '#f1f0ff',
        writingDirection: 'rtl',
        textAlign: 'center',
    },
    emptySubLabel: {
        fontSize: 14,
        color: '#22d3ee',
        writingDirection: 'rtl',
        textAlign: 'center',
    },
});
