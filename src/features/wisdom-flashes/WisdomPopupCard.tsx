import { useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    FadeIn,
    FadeOut,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useWisdomStore } from './useWisdomStore';
import { CATEGORY_LABELS } from './types';
import { tapHaptic, successHaptic } from '../../utils/haptics';

const RTL_STYLE = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

// Spritesheet: 5 cols × 2 rows (2816×1536). Row0: Buffett|Dalio|Graham|Munger|_ Row1: Bogle|Lynch|Taleb|Orman|Kiyosaki
// eslint-disable-next-line @typescript-eslint/no-var-requires
const EXPERTS_SHEET = { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/images/FINSTARS.png' };
const SHEET_COLS = 5;
const SHEET_ROWS = 2;
const SHEET_W = 2816;
const SHEET_H = 1536;
const CELL_W = SHEET_W / SHEET_COLS;
const CELL_H = SHEET_H / SHEET_ROWS;

const AUTHOR_IMG_POS: Record<string, [col: number, row: number]> = {
    'וורן באפט':     [0, 0],
    'ריי דאליו':     [1, 0],
    'בנג\'מין גרהאם': [2, 0],
    'צ\'רלי מאנגר':  [3, 0],
    'ג\'ון בוגל':    [0, 1],
    'פיטר לינץ\'':  [1, 1],
    'נסים טאלב':    [2, 1],
    'רוברט קיוסאקי': [4, 1],
};

function AuthorAvatar({ author, size }: { author: string; size: number }) {
    const pos = AUTHOR_IMG_POS[author];
    if (!pos) return null;
    const scale = size / CELL_W;
    return (
        <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', borderWidth: 1.5, borderColor: '#bae6fd' }}>
            <Image
                source={EXPERTS_SHEET}
                style={{
                    width: SHEET_W * scale,
                    height: SHEET_H * scale,
                    marginLeft: -pos[0] * size,
                    marginTop: -pos[1] * (CELL_H * scale),
                }}
            />
        </View>
    );
}

const AUTO_DISMISS_MS = 8000;

/* ------------------------------------------------------------------ */
/*  Heart Button — animated favorite toggle                            */
/* ------------------------------------------------------------------ */

function HeartButton({ itemId }: { itemId: string }) {
    const isFav = useWisdomStore((s) => s.isFavorite(itemId));
    const toggleFavorite = useWisdomStore((s) => s.toggleFavorite);

    const heartScale = useSharedValue(1);

    const handlePress = useCallback(() => {
        tapHaptic();
        heartScale.value = withTiming(1.1, { duration: 100 }, () => {
            heartScale.value = withTiming(1, { duration: 100 });
        });
        toggleFavorite(itemId);
    }, [itemId, toggleFavorite, heartScale]);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: heartScale.value }],
    }));

    return (
        <Pressable onPress={handlePress} hitSlop={12} accessibilityRole="button" accessibilityLabel={isFav ? "הסר ממועדפים" : "הוסף למועדפים"}>
            <Animated.Text style={[{ fontSize: 22 }, animStyle]}>
                {isFav ? '❤️' : '🤍'}
            </Animated.Text>
        </Pressable>
    );
}

/* ------------------------------------------------------------------ */
/*  WisdomPopupCard — the main overlay component                       */
/* ------------------------------------------------------------------ */

export function WisdomPopupCard() {
    const activeItem = useWisdomStore((s) => s.activeItem);
    const dismiss = useWisdomStore((s) => s.dismiss);

    // Shimmer animation for gold border
    const shimmerOpacity = useSharedValue(0.4);

    useEffect(() => {
        if (!activeItem) return;
        successHaptic();
        shimmerOpacity.value = withTiming(0.7, { duration: 400 });
    }, [activeItem, shimmerOpacity]);

    const shimmerStyle = useAnimatedStyle(() => ({
        opacity: shimmerOpacity.value,
    }));


    // Auto-dismiss timer
    useEffect(() => {
        if (!activeItem) return;
        const timer = setTimeout(() => dismiss(), AUTO_DISMISS_MS);
        return () => clearTimeout(timer);
    }, [activeItem, dismiss]);

    if (!activeItem) return null;

    const isQuote = activeItem.type === 'quote';

    return (
        <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={styles.overlay}
        >
            <Pressable style={styles.backdrop} onPress={dismiss} accessibilityRole="button" accessibilityLabel="סגור" />

            <Animated.View
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(150)}
                style={styles.cardContainer}
            >
                {/* Blue shimmer border */}
                <Animated.View style={[styles.goldGlowOuter, shimmerStyle]} />

                <LinearGradient
                    colors={['#ffffff', '#f0f9ff', '#ffffff']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.card}
                >
                    {/* Blue border */}
                    <View
                        style={[
                            styles.glowBorder,
                            {
                                borderColor: '#bae6fd',
                            },
                        ]}
                    />

                    {/* Top accent line */}
                    <LinearGradient
                        colors={['transparent', '#0891b2', 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.topAccent}
                    />

                    {/* Header: icon + category/type label */}
                    <View style={styles.header}>
                        <HeartButton itemId={activeItem.id} />
                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                            <Text style={styles.badge}>
                                {isQuote ? '💡 מבזק חכמה' : `${activeItem.icon} ${CATEGORY_LABELS[activeItem.category]}`}
                            </Text>
                        </View>
                    </View>

                    {/* Quote / Insight text */}
                    <Text style={[RTL_STYLE, styles.quoteText]}>
                        &ldquo;{activeItem.text}&rdquo;
                    </Text>

                    {/* Author (quotes only) */}
                    {isQuote && (
                        <View style={styles.authorRow}>
                            <AuthorAvatar author={activeItem.author} size={44} />
                            {!AUTHOR_IMG_POS[activeItem.author] && (
                                <Text style={styles.authorIcon}>{activeItem.icon}</Text>
                            )}
                            <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                <Text style={[RTL_STYLE, styles.authorName]}>{activeItem.author}</Text>
                                <Text style={[RTL_STYLE, styles.authorRole]}>{activeItem.authorRole}</Text>
                            </View>
                        </View>
                    )}

                    {/* Dismiss button — gold accent */}
                    <Pressable onPress={dismiss} style={styles.dismissBtn} accessibilityRole="button" accessibilityLabel="סגור ציטוט">
                        <Text style={[RTL_STYLE, styles.dismissText]}>הבנתי ✨</Text>
                    </Pressable>
                </LinearGradient>
            </Animated.View>
        </Animated.View>
    );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 9999,
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 40,
        paddingHorizontal: 16,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    cardContainer: {
        width: '100%',
        maxWidth: 400,
        position: 'relative',
    },
    goldGlowOuter: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 26,
        shadowColor: '#0891b2',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 12,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#bae6fd',
    },
    card: {
        borderRadius: 24,
        padding: 24,
        overflow: 'hidden',
        position: 'relative',
    },
    glowBorder: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 24,
        borderWidth: 1.5,
    },
    topAccent: {
        position: 'absolute',
        top: 0,
        left: 24,
        right: 24,
        height: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    badge: {
        fontSize: 12,
        fontWeight: '700',
        color: '#0891b2',
        writingDirection: 'rtl',
        textAlign: 'right',
    },
    quoteText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1e293b',
        lineHeight: 30,
        marginBottom: 20,
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    authorIcon: {
        fontSize: 28,
    },
    authorName: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1e293b',
    },
    authorRole: {
        fontSize: 11,
        fontWeight: '500',
        color: '#64748b',
    },
    dismissBtn: {
        alignSelf: 'center',
        backgroundColor: '#0891b2',
        borderWidth: 1,
        borderColor: '#0e7490',
        borderRadius: 16,
        paddingHorizontal: 28,
        paddingVertical: 10,
        borderBottomWidth: 3,
        borderBottomColor: '#0e7490',
    },
    dismissText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#ffffff',
    },
});
