import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { GlowCard } from "../../components/ui/GlowCard";
import { AnimatedPressable } from "../../components/ui/AnimatedPressable";
import { useChapterStore } from "../chapter-1-content/useChapterStore";
import { chapter1Data } from "../chapter-1-content/chapter1Data";
import { chapter2Data } from "./chapter2Data";
import { chapter3Data } from "../chapter-3-content/chapter3Data";
import { chapter4Data } from "../chapter-4-content/chapter4Data";
import { chapter5Data } from "../chapter-5-content/chapter5Data";
import type { Chapter } from "./types";

interface ChapterCardInfo {
  data: Chapter;
  storeId: string;
  icon: string;
  glowColor: string;
  locked: boolean;
}

const chapters: ChapterCardInfo[] = [
  {
    data: chapter1Data,
    storeId: "ch-1",
    icon: "\u{1F525}",
    glowColor: "#f97316",
    locked: false,
  },
  {
    data: chapter2Data,
    storeId: "ch-2",
    icon: "\u{1F6E1}\uFE0F",
    glowColor: "#38bdf8",
    locked: false,
  },
  {
    data: chapter3Data,
    storeId: "ch-3",
    icon: "\u2696\uFE0F",
    glowColor: "#a78bfa",
    locked: false,
  },
  {
    data: chapter4Data,
    storeId: "ch-4",
    icon: "\u{1F4C8}",
    glowColor: "#22c55e",
    locked: false,
  },
  {
    data: chapter5Data,
    storeId: "ch-5",
    icon: "\u{1F3DD}\uFE0F",
    glowColor: "#f59e0b",
    locked: false,
  },
];

export function ChapterSelectScreen() {
  const router = useRouter();
  const progress = useChapterStore((s) => s.progress);
  const setCurrentChapter = useChapterStore((s) => s.setCurrentChapter);

  const getProgressPercent = (card: ChapterCardInfo): number => {
    if (card.locked || card.data.modules.length === 0) return 0;
    const chapterProgress = progress[card.storeId];
    if (!chapterProgress) return 0;
    return Math.round(
      (chapterProgress.completedModules.length / card.data.modules.length) * 100
    );
  };

  const handleChapterPress = (card: ChapterCardInfo) => {
    if (card.locked) return;
    setCurrentChapter(card.storeId);
    router.push(`/chapter/${card.data.id}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-zinc-950" edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
      >
        <Text
          className="mb-2 text-3xl font-black text-white"
          style={{ textAlign: "right", writingDirection: "rtl" }}
        >
          {"\u05D1\u05D7\u05E8 \u05E4\u05E8\u05E7"}
        </Text>
        <Text
          className="mb-8 text-base text-zinc-400"
          style={{ textAlign: "right", writingDirection: "rtl" }}
        >
          {"\u05D4\u05DE\u05E1\u05E2 \u05E9\u05DC\u05DA \u05DC\u05E2\u05E6\u05DE\u05D0\u05D5\u05EA \u05E4\u05D9\u05E0\u05E0\u05E1\u05D9\u05EA"}
        </Text>

        {chapters.map((card) => {
          const pct = getProgressPercent(card);
          return (
            <AnimatedPressable
              key={card.data.id}
              onPress={() => handleChapterPress(card)}
              disabled={card.locked}
              style={{ marginBottom: 20, opacity: card.locked ? 0.4 : 1 }}
            >
              <GlowCard
                glowColor={card.glowColor}
                pressable={false}
                shimmer={!card.locked && pct === 100}
              >
                <View className="flex-row-reverse items-center mb-3">
                  <Text className="text-4xl ml-3">{card.icon}</Text>
                  <View className="flex-1" style={{ alignItems: "flex-end" }}>
                    <Text className="text-zinc-500 text-sm font-bold mb-1">
                      {"\u05E4\u05E8\u05E7"} {card.data.pyramidLayer}
                    </Text>
                    <Text
                      className="text-xl font-black text-white"
                      style={{ textAlign: "right", writingDirection: "rtl" }}
                    >
                      {card.data.title}
                    </Text>
                  </View>
                  {card.locked && (
                    <Text className="text-2xl mr-2">{"\u{1F512}"}</Text>
                  )}
                </View>

                {!card.locked && (
                  <>
                    <Text
                      className="text-zinc-400 text-sm mb-3"
                      style={{ textAlign: "right", writingDirection: "rtl" }}
                    >
                      {card.data.modules.length} {"\u05DE\u05D5\u05D3\u05D5\u05DC\u05D9\u05DD"}
                    </Text>

                    <View className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <View
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: card.glowColor,
                        }}
                      />
                    </View>
                    <Text
                      className="text-zinc-500 text-xs mt-1"
                      style={{ textAlign: "right" }}
                    >
                      {pct}% {"\u05D4\u05D5\u05E9\u05DC\u05DD"}
                    </Text>
                  </>
                )}

                {card.locked && (
                  <Text
                    className="text-zinc-600 text-sm mt-1"
                    style={{ textAlign: "right", writingDirection: "rtl" }}
                  >
                    {"\u05D1\u05E7\u05E8\u05D5\u05D1"}
                  </Text>
                )}
              </GlowCard>
            </AnimatedPressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
