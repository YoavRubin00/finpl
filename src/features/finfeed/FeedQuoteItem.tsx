import React from "react";
import { Image as ExpoImage } from "expo-image";
import { View, Text, StyleSheet, Dimensions, Pressable, Platform, Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Quote, Bookmark } from "lucide-react-native";
import { useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import { FINN_STANDARD } from "../retention-loops/finnMascotConfig";
import type { FeedQuote } from "./types";
import { CHAPTER_CTA_COLORS } from "./types";
import Animated from "react-native-reanimated";
import { useChapterStore } from "../chapter-1-content/useChapterStore";
import { useSubscriptionStore } from "../subscription/useSubscriptionStore";
import { useSavedItemsStore } from "../saved-items/useSavedItemsStore";
import { useUpgradeModalStore } from "../../stores/useUpgradeModalStore";


const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface FeedQuoteItemProps {
    item: FeedQuote;
    isActive: boolean;
}

export const FeedQuoteItem = React.memo(function FeedQuoteItem({ item, isActive }: FeedQuoteItemProps) {
    const router = useRouter();
    const setCurrentChapter = useChapterStore((s) => s.setCurrentChapter);
    const setCurrentModule = useChapterStore((s) => s.setCurrentModule);
    const isPro = useSubscriptionStore((s) => s.tier === "pro" && s.status === "active");
    const isSaved = useSavedItemsStore((s) => s.isSaved);
    const removeItem = useSavedItemsStore((s) => s.removeItem);
    const addItem = useSavedItemsStore((s) => s.addItem);
    const showUpgradeModal = useUpgradeModalStore((s) => s.show);

    const feedBookmarkId = `feed-${item.id}`;
    const isBookmarked = isSaved(feedBookmarkId);

    function handleBookmarkPress() {
        if (!isPro) {
            showUpgradeModal("saved_items");
            return;
        }
        if (isBookmarked) {
            removeItem(feedBookmarkId);
        } else {
            addItem({
                id: feedBookmarkId,
                type: "feed",
                title: item.title,
                feedItemId: item.id,
            });
        }
    }

    const hasModule = Boolean(item.moduleId && item.chapterId);
    const ctaColors = CHAPTER_CTA_COLORS[item.chapterId ?? "chapter-1"] ?? CHAPTER_CTA_COLORS["chapter-1"];
    function handleGoToLesson() {
        if (!item.moduleId || !item.chapterId || !item.storeChapterId) return;
        setCurrentChapter(item.storeChapterId);
        setCurrentModule(item.moduleIndex ?? 0);
        router.push(`/lesson/${item.moduleId}?chapterId=${item.chapterId}` as never);
    }

    const hasRealAuthor = Boolean(item.author);

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={["#f0f4ff", "#faf5ff", "#fef3f2"]}
                style={StyleSheet.absoluteFillObject}
            />

            {/* Ambient bubbles background — skip on web (Lottie overflow) */}
            {Platform.OS !== 'web' && isActive && (
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                  <View style={{ position: 'absolute', top: '12%', left: '5%', opacity: 0.09 }} accessible={false}>
                      <LottieView source={require("../../../assets/lottie/Bubbles.json")} style={{ width: 70, height: 70 }} autoPlay loop speed={0.25} />
                  </View>
                  <View style={{ position: 'absolute', top: '55%', right: '4%', opacity: 0.07 }} accessible={false}>
                      <LottieView source={require("../../../assets/lottie/jumping blue bubbles.json")} style={{ width: 60, height: 60 }} autoPlay loop speed={0.3} />
                  </View>
                  <View style={{ position: 'absolute', bottom: '15%', left: '10%', opacity: 0.08 }} accessible={false}>
                      <LottieView source={require("../../../assets/lottie/Bubbles.json")} style={{ width: 55, height: 55 }} autoPlay loop speed={0.2} />
                  </View>
              </View>
            )}

            {/* Bookmark */}
            <Pressable
                onPress={handleBookmarkPress}
                style={styles.bookmarkButton}
                accessibilityRole="button"
                accessibilityLabel={isBookmarked ? "הסר מהשמורים" : "שמור"}
                accessibilityState={{ selected: isBookmarked }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
                <Bookmark
                    size={22}
                    color={isBookmarked ? "#16a34a" : "#6b7280"}
                    fill={isBookmarked ? "#16a34a" : "transparent"}
                />
            </Pressable>

            {/* Spacer (tag row removed) */}
            <View style={{ height: 8 }} />

            {hasRealAuthor ? (
                /* ── Real quote with author attribution ── */
                <View style={styles.contentWrapper}>
                    <Animated.View >
                        <View style={styles.card}>
                            <Quote
                                size={36}
                                color="#67e8f9"
                                fill="rgba(103, 232, 249, 0.3)"
                                style={styles.quoteIcon}
                            />
                            <Text style={styles.title}>{item.title}</Text>
                            <Text style={styles.quoteText}>&ldquo;{item.quote}&rdquo;</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                                {item.author?.toLowerCase().includes('finplay') && (
                                    <View style={{ width: 48, height: 48, overflow: 'hidden' }}>
                                        <ExpoImage
                                            source={FINN_STANDARD}
                                            style={{ width: 48, height: 48 }}
                                            contentFit="contain"
                                            accessible={false}
                                        />
                                    </View>
                                )}
                                <Text style={styles.author}>— {item.author}</Text>
                            </View>
                        </View>
                    </Animated.View>

                    {hasModule && isActive && (
                        <Animated.View  style={styles.ctaContainer}>
                            <Pressable onPress={handleGoToLesson} style={[styles.ctaButton, { backgroundColor: ctaColors.bg, shadowColor: ctaColors.shadow }]} accessibilityRole="button" accessibilityLabel="מעבר לתוכן הזה" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                {Platform.OS === 'web' ? (
                                    <Text style={{ fontSize: 14 }}>🚀</Text>
                                ) : (
                                    <View style={{ width: 18, height: 18, overflow: "hidden" }} accessible={false}>
                                        <LottieView
                                            source={require("../../../assets/lottie/wired-flat-489-rocket-space-hover-flying.json")}
                                            style={{ width: 18, height: 18 }}
                                            autoPlay loop speed={0.8}

                                        />
                                    </View>
                                )}
                                <Text style={[styles.ctaText, { color: ctaColors.text }]}>מעבר לתוכן הזה</Text>
                            </Pressable>
                        </Animated.View>
                    )}
                </View>
            ) : (
                /* ── Tip (no real author) — clean card, no Finn ── */
                <View style={styles.contentWrapper}>
                    <View>
                        <View style={styles.card}>
                            <View style={{ alignSelf: "flex-end", marginBottom: 12 }} accessible={false}>
                                <LottieView
                                    source={require("../../../assets/lottie/wired-flat-1634-light-spiral-bulb-4-hover-pinch.json")}
                                    style={{ width: 40, height: 40 }}
                                    autoPlay={isActive} loop={isActive} speed={0.6}

                                />
                            </View>
                            <Text style={styles.title}>{item.title}</Text>
                            <Text style={styles.tipText}>{item.quote}</Text>
                        </View>
                    </View>

                    {hasModule && isActive && (
                        <Animated.View  style={styles.ctaContainer}>
                            <Pressable onPress={handleGoToLesson} style={[styles.ctaButton, { backgroundColor: ctaColors.bg, shadowColor: ctaColors.shadow }]} accessibilityRole="button" accessibilityLabel="מעבר לתוכן הזה" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                {Platform.OS === 'web' ? (
                                    <Text style={{ fontSize: 14 }}>🚀</Text>
                                ) : (
                                    <View style={{ width: 18, height: 18, overflow: "hidden" }} accessible={false}>
                                        <LottieView
                                            source={require("../../../assets/lottie/wired-flat-489-rocket-space-hover-flying.json")}
                                            style={{ width: 18, height: 18 }}
                                            autoPlay loop speed={0.8}
                                           
                                        />
                                    </View>
                                )}
                                <Text style={[styles.ctaText, { color: ctaColors.text }]}>מעבר לתוכן הזה</Text>
                            </Pressable>
                        </Animated.View>
                    )}
                </View>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        width: SCREEN_WIDTH,
        paddingVertical: 24,
        backgroundColor: "#f8fafc",
    },
    tagRow: {
        alignSelf: "center",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#ecfeff",
        borderRadius: 999,
        paddingHorizontal: 18,
        paddingVertical: 8,
        marginBottom: 12,
    },
    tagText: {
        fontSize: 13,
        fontWeight: "800",
        color: "#155e75",
        writingDirection: "rtl",
    },
    contentWrapper: {
        alignItems: "center",
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    // ── Real quote layout ──
    card: {
        backgroundColor: "#ffffff",
        borderRadius: 24,
        padding: 28,
        borderWidth: 1.5,
        borderColor: "#a5f3fc",
        shadowColor: "#0891b2",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
        width: "100%",
    },
    quoteIcon: {
        marginBottom: 16,
        alignSelf: "flex-end",
    },
    title: {
        fontSize: 14,
        fontWeight: "900",
        color: "#155e75",
        marginBottom: 12,
        textAlign: "right",
        writingDirection: "rtl",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    quoteText: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1f2937",
        lineHeight: 38,
        textAlign: "right",
        writingDirection: "rtl",
        marginBottom: 20,
    },
    author: {
        fontSize: 15,
        fontWeight: "600",
        color: "#64748b",
        textAlign: "right",
        writingDirection: "rtl",
    },
    // ── Finn's Tip layout ──
    finnWrapper: {
        alignItems: "center",
        marginBottom: -22,
        zIndex: 1,
    },
    finnLottie: {
        width: 150,
        height: 150,
    },
    speechBubble: {
        backgroundColor: "#ffffff",
        borderRadius: 28,
        borderTopLeftRadius: 4,
        padding: 32,
        borderWidth: 2,
        borderColor: "#a5f3fc",
        shadowColor: "#0891b2",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 6,
        width: "100%",
        position: "relative",
    },
    speechBubbleTail: {
        position: "absolute",
        top: -14,
        left: 32,
        width: 0,
        height: 0,
        borderLeftWidth: 14,
        borderRightWidth: 14,
        borderBottomWidth: 14,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderBottomColor: "#a5f3fc",
    },
    tipText: {
        fontSize: 26,
        fontWeight: "700",
        color: "#1f2937",
        lineHeight: 40,
        textAlign: "right",
        writingDirection: "rtl",
    },
    // ── CTA ──
    ctaContainer: {
        alignSelf: "flex-end",
        marginTop: 16,
        marginRight: 4,
    },
    ctaButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: "rgba(255,255,255,0.5)",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 10,
        elevation: 6,
    },
    ctaText: {
        fontSize: 13,
        fontWeight: "800",
        writingDirection: "rtl",
    },
    bookmarkButton: {
        position: "absolute",
        top: 24,
        left: 16,
        zIndex: 10,
        backgroundColor: "rgba(255,255,255,0.7)",
        borderRadius: 20,
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
    },
});
