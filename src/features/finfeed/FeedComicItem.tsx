import React from "react";
import { View, Image, Text, Dimensions, StyleSheet, Pressable } from "react-native";
import Animated from "react-native-reanimated";
import { useRouter } from "expo-router";
import { CLASH } from "../../constants/theme";
import { useChapterStore } from "../chapter-1-content/useChapterStore";
import LottieView from "lottie-react-native";
import type { FeedComic } from "./types";
import { CHAPTER_CTA_COLORS } from "./types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface Props {
  item: FeedComic;
  isActive: boolean;
}

export const FeedComicItem = React.memo(function FeedComicItem({ item, isActive }: Props) {
  const router = useRouter();
  const setCurrentChapter = useChapterStore((s) => s.setCurrentChapter);
  const setCurrentModule = useChapterStore((s) => s.setCurrentModule);

  const ctaColors = CHAPTER_CTA_COLORS[item.chapterId] ?? CHAPTER_CTA_COLORS["chapter-1"];

  function handleGoToLesson() {
    setCurrentChapter(item.storeChapterId);
    setCurrentModule(item.moduleIndex);
    router.push(`/lesson/${item.moduleId}?chapterId=${item.chapterId}`);
  }

  return (
    <View style={styles.container}>
      {/* Background */}
      <View style={styles.bg} />

      {/* Header */}
      <Animated.View style={styles.header}>
        <Text style={styles.tag}>🎨 קומיקס</Text>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.chapter}>{item.chapterName}</Text>
      </Animated.View>

      {/* Comic image */}
      <View style={styles.imageContainer}>
        <Image
          source={item.imageUrl}
          style={styles.image}
          resizeMode="contain"
        />
      </View>

      {/* CTA */}
      <Animated.View
        style={styles.ctaContainer}
      >
        <Pressable
          onPress={handleGoToLesson}
          style={[styles.ctaButton, { backgroundColor: ctaColors.bg, shadowColor: ctaColors.shadow }]}
        >
          <View style={{ width: 18, height: 18, overflow: 'hidden' }}>
            <LottieView
              source={require("../../../assets/lottie/wired-flat-489-rocket-space-hover-flying.json")}
              style={{ width: 18, height: 18 }}
              autoPlay={isActive}
              loop={isActive}
              speed={0.8}
            />
          </View>
          <Text style={[styles.ctaText, { color: ctaColors.text }]}>מעבר לתוכן הזה</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    paddingVertical: 16,
    backgroundColor: "#f8fafc",
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#f8fafc",
  },
  header: {
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 10,
    alignItems: "flex-end",
  },
  tag: {
    fontSize: 12,
    color: CLASH.goldBorder,
    fontWeight: "700",
    marginBottom: 4,
    writingDirection: "rtl",
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#1f2937",
    textAlign: "right",
    writingDirection: "rtl",
  },
  chapter: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 2,
  },
  imageContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  image: {
    width: SCREEN_WIDTH - 16,
    aspectRatio: 0.75,
    borderRadius: 16,
  },
  ctaContainer: {
    alignSelf: "flex-end",
    marginTop: 8,
    marginRight: 20,
    marginBottom: 8,
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
});
