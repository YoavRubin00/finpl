import React, { useMemo } from "react";
import { View, Text, StyleSheet, Dimensions, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Play, ChevronLeft, Heart } from "lucide-react-native";
import { useRouter } from "expo-router";
import type { FeedVideo } from "./types";
import { CLASH } from "../../constants/theme";

import { GoldCircleBadge } from "../../components/ui/GoldCircleBadge";
import { BannerRibbon } from "../../components/ui/BannerRibbon";
import Animated from "react-native-reanimated";

import { useChapterStore } from "../chapter-1-content/useChapterStore";
import { useSubscriptionStore } from "../subscription/useSubscriptionStore";
import { useSavedItemsStore } from "../saved-items/useSavedItemsStore";
import { useUpgradeModalStore } from "../../stores/useUpgradeModalStore";
import { chapter1Data } from "../chapter-1-content/chapter1Data";
import { chapter2Data } from "../chapter-2-content/chapter2Data";
import { chapter3Data } from "../chapter-3-content/chapter3Data";
import { chapter4Data } from "../chapter-4-content/chapter4Data";
import { chapter5Data } from "../chapter-5-content/chapter5Data";

const ALL_CHAPTERS = [chapter1Data, chapter2Data, chapter3Data, chapter4Data, chapter5Data];

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface FeedVideoItemProps {
    item: FeedVideo;
    isActive: boolean;
}

export const FeedVideoItem = React.memo(function FeedVideoItem({ item, isActive }: FeedVideoItemProps) {
    const router = useRouter();
    const setCurrentChapter = useChapterStore((s) => s.setCurrentChapter);
    const setCurrentModule = useChapterStore((s) => s.setCurrentModule);
    const progress = useChapterStore((s) => s.progress);
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
    const isLongVideo = (item.durationMinutes ?? 0) >= 5;

    const isAccessible = useMemo(() => {
        if (!hasModule) return false;
        if (isPro) return true;
        const chapterIdx = ALL_CHAPTERS.findIndex((c) => c.id === item.chapterId);
        if (chapterIdx < 0) return false;
        for (let ci = 0; ci < chapterIdx; ci++) {
            const prev = ALL_CHAPTERS[ci];
            const prevCompleted = progress[prev.id]?.completedModules ?? [];
            if (!prev.modules.every((m) => prevCompleted.includes(m.id))) return false;
        }
        const chapter = ALL_CHAPTERS[chapterIdx];
        const completed = progress[chapter.id]?.completedModules ?? [];
        for (let mi = 0; mi < (item.moduleIndex ?? 0); mi++) {
            if (!completed.includes(chapter.modules[mi].id)) return false;
        }
        return true;
    }, [isPro, item.chapterId, item.moduleIndex, progress, hasModule]);

    function handleGoToLesson() {
        if (!item.moduleId || !item.chapterId || !item.storeChapterId) return;
        setCurrentChapter(item.storeChapterId);
        setCurrentModule(item.moduleIndex ?? 0);
        router.push(`/lesson/${item.moduleId}?chapterId=${item.chapterId}` as never);
    }

    function handleGoToNextModule() {
        for (const chapter of ALL_CHAPTERS) {
            const completed = progress[chapter.id]?.completedModules ?? [];
            const nextIdx = chapter.modules.findIndex((m) => !completed.includes(m.id));
            if (nextIdx >= 0) {
                const mod = chapter.modules[nextIdx];
                setCurrentChapter(chapter.id);
                setCurrentModule(nextIdx);
                router.push(`/lesson/${mod.id}?chapterId=${chapter.id}` as never);
                return;
            }
        }
    }

    // expo-av Video is deprecated & crashes on current SDK — disabled until migrated to expo-video

    // Video content is "בקרוב" — CTA disabled until videos are ready
    const ctaBlock = null;

    const bookmarkButton = (
        <Pressable
            onPress={handleBookmarkPress}
            style={styles.bookmarkButton}
            accessibilityRole="button"
            accessibilityLabel={isBookmarked ? "הסר מהשמורים" : "שמור"}
            accessibilityState={{ selected: isBookmarked }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
            <Heart
                size={22}
                color={isBookmarked ? "#ef4444" : "#6b7280"}
                fill={isBookmarked ? "#ef4444" : "transparent"}
            />
        </Pressable>
    );

    // All videos show placeholder — expo-av Video disabled (native crash on current SDK)
    return (
        <View style={styles.container}>
            <LinearGradient
                colors={["#e0f2fe", "#bae6fd", "#e0f2fe"]}
                style={StyleSheet.absoluteFillObject}
            />
            {bookmarkButton}
            <View style={styles.topBanner}>
                <BannerRibbon title={`וידאו • Layer ${item.pyramidLayer}`} />
            </View>
            <Animated.View style={styles.centerPlay}>
                <GoldCircleBadge size={80} glowing>
                    <Play size={36} color={CLASH.goldLight} fill={CLASH.goldLight} />
                </GoldCircleBadge>
                <Text style={[styles.placeholderText, { writingDirection: "rtl", color: "#0c4a6e" }]}>
                    סרטון הדרכה
                </Text>
                <Text style={[styles.durationText, { writingDirection: "rtl", color: "#0369a1" }]}>
                    {item.durationMinutes} דקות
                </Text>
                <View style={{ marginTop: 12, backgroundColor: "rgba(14,165,233,0.15)", borderWidth: 1.5, borderColor: "#0ea5e9", borderRadius: 20, paddingHorizontal: 24, paddingVertical: 8 }}>
                    <Text style={{ fontSize: 16, fontWeight: "900", color: "#0369a1", writingDirection: "rtl" }}>בקרוב</Text>
                </View>
            </Animated.View>
            <View style={styles.bottomContent}>
                <View style={{ backgroundColor: "rgba(14,165,233,0.15)", borderWidth: 1.5, borderColor: "#0ea5e9", borderRadius: 20, paddingHorizontal: 20, paddingVertical: 14 }}>
                    <Text style={[styles.title, { writingDirection: "rtl" }]}>
                        {item.title}
                    </Text>
                    <Text style={[styles.description, { writingDirection: "rtl" }]} numberOfLines={3}>
                        {item.description}
                    </Text>
                </View>
                {ctaBlock}
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
  container: {
        width: SCREEN_WIDTH,
        flex: 1,
        backgroundColor: "#e0f2fe",
        justifyContent: "space-between",
    },
    bottomOverlay: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 300,
    },
    pausedOverlay: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    topBanner: {
        position: "absolute",
        top: 56,
        left: 0,
        right: 0,
    },
    centerPlay: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    placeholderText: {
        color: "#0c4a6e",
        fontSize: 20,
        fontWeight: "900",
        marginTop: 16,
        marginBottom: 8,
    },
    durationText: {
        color: "#0369a1",
        fontSize: 14,
        fontWeight: "700",
    },
    bottomContent: {
        paddingHorizontal: 16,
        paddingRight: 80,
        paddingBottom: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: "900",
        color: "#0c4a6e",
        marginBottom: 8,
        textAlign: "right",
    },
    description: {
        fontSize: 15,
        color: "#334155",
        lineHeight: 22,
        textAlign: "right",
    },
    ctaContainer: {
        alignItems: "flex-end",
        marginTop: 16,
    },
    ctaButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "#22d3ee",
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 999,
        shadowColor: "#0891b2",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 16,
        elevation: 8,
    },
    ctaText: {
        fontSize: 16,
        fontWeight: "900",
        color: "#000",
        writingDirection: "rtl",
    },
    proCtaButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "#facc15",
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 999,
        shadowColor: "#d4a017",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 6,
    },
    proCtaText: {
        fontSize: 15,
        fontWeight: "900",
        color: "#1a1035",
        writingDirection: "rtl",
    },
    bookmarkButton: {
        position: "absolute",
        top: 56,
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
