import { View, Text, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, cancelAnimation } from "react-native-reanimated";
import { useEffect } from "react";
import { GoldBorderCard } from "../../components/ui/GoldBorderCard";
import { BannerRibbon } from "../../components/ui/BannerRibbon";
import { DiamondBackground } from "../../components/ui/DiamondBackground";
import { SparkleOverlay } from "../../components/ui/SparkleOverlay";
import { AnimatedPressable } from "../../components/ui/AnimatedPressable";
import { useEconomyStore } from "../economy/useEconomyStore";
import { useChapterStore } from "./useChapterStore";
import { useAITelemetryStore } from "../ai-personalization/useAITelemetryStore";
import { getUnlockedHiddenModules } from "../ai-personalization/hiddenModules";
import { chapter1Data } from "./chapter1Data";
import { chapter2Data } from "../chapter-2-content/chapter2Data";
import { chapter3Data } from "../chapter-3-content/chapter3Data";
import { chapter4Data } from "../chapter-4-content/chapter4Data";
import { chapter5Data } from "../chapter-5-content/chapter5Data";
import { CLASH, TEXT_SHADOW, TITLE_TEXT } from "../../constants/theme";
import type { Chapter, Module } from "./types";

const RTL_STYLE = { writingDirection: "rtl" as const, textAlign: "right" as const };

const HIDDEN_GLOW_COLOR = '#c084fc';

/** Pulsing glow wrapper for AI-unlocked hidden modules */
function HiddenModuleGlow({ children }: { children: React.ReactNode }) {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 1200 }), -1, true);
    return () => { cancelAnimation(opacity); };
  }, [opacity]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          borderRadius: 14,
          shadowColor: HIDDEN_GLOW_COLOR,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 12,
          elevation: 8,
        },
        glowStyle,
      ]}
    >
      {children}
    </Animated.View>
  );
}

const CHAPTER_MAP: Record<string, { data: Chapter; storeId: string; glowColor: string }> = {
  "chapter-1": { data: chapter1Data, storeId: "ch-1", glowColor: "#22d3ee" },
  "chapter-2": { data: chapter2Data, storeId: "ch-2", glowColor: "#38bdf8" },
  "chapter-3": { data: chapter3Data, storeId: "ch-3", glowColor: "#60a5fa" },
  "chapter-4": { data: chapter4Data, storeId: "ch-4", glowColor: "#818cf8" },
  "chapter-5": { data: chapter5Data, storeId: "ch-5", glowColor: "#a78bfa" },
};

export function ChapterMapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const progress = useChapterStore((s) => s.progress);
  const setCurrentChapter = useChapterStore((s) => s.setCurrentChapter);
  const setCurrentModule = useChapterStore((s) => s.setCurrentModule);

  const coins = useEconomyStore((s) => s.coins);
  const spendCoins = useEconomyStore((s) => s.spendCoins);

  const aiProfile = useAITelemetryStore((s) => s.profile);

  const entry = id ? CHAPTER_MAP[id] : undefined;
  if (!entry) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: CLASH.bgPrimary }}>
        <Text className="text-lg text-red-400">הפרק לא נמצא</Text>
      </SafeAreaView>
    );
  }

  const { data: chapter, storeId, glowColor } = entry;
  const chapterProgress = progress[storeId];
  const completedModules = chapterProgress?.completedModules ?? [];
  const completedCount = completedModules.length;
  const totalCount = chapter.modules.length;

  const hiddenModules = id
    ? getUnlockedHiddenModules(id, aiProfile?.recommendedActions ?? [])
    : [];

  const handleModulePress = (mod: Module, index: number, isLocked: boolean) => {
    if (isLocked) {
      Alert.alert(
        "מודול נעול",
        "כדי לפתוח מודול שאינו ברצף הלמידה, תצטרך לשלם 50 מטבעות. להמשיך?",
        [
          { text: "ביטול", style: "cancel" },
          {
            text: "שלם 50 ",
            onPress: () => {
              if (coins >= 50) {
                spendCoins(50);
                setCurrentChapter(storeId);
                setCurrentModule(index);
                router.push(`/lesson/${mod.id}?chapterId=${chapter.id}`);
              } else {
                Alert.alert("אין מספיק מטבעות", "אפשר להשיג עוד מטבעות בחנות!");
              }
            }
          }
        ]
      );
      return;
    }
    setCurrentChapter(storeId);
    setCurrentModule(index);
    router.push(`/lesson/${mod.id}?chapterId=${chapter.id}`);
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <DiamondBackground>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        >
          {/* Back button */}
          <AnimatedPressable onPress={handleBack} className="mb-4">
            <Text style={{ color: CLASH.goldLight, fontSize: 14, fontWeight: '600', ...TEXT_SHADOW }}>{"→ חזרה"}</Text>
          </AnimatedPressable>

          {/* Chapter Header Banner */}
          <BannerRibbon title={chapter.title} />

          <Text
            style={[{ fontSize: 14, color: '#cbd5e1', marginTop: 8, marginBottom: 8, lineHeight: 22 }, RTL_STYLE, TEXT_SHADOW]}
          >
            {chapter.description}
          </Text>

          {/* Progress bar */}
          <View style={{ marginBottom: 20 }}>
            <View style={{
              height: 12, borderRadius: 6, backgroundColor: 'rgba(30,40,60,0.8)', overflow: 'hidden',
              borderWidth: 1.5, borderColor: CLASH.goldBorder + '40',
            }}>
              <View
                style={{
                  height: '100%', borderRadius: 6,
                  width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%',
                  backgroundColor: glowColor,
                }}
              />
            </View>
            <Text style={{ color: CLASH.goldLight + 'b0', fontSize: 11, marginTop: 4, fontWeight: '600', textAlign: 'right' }}>
              {completedCount}/{totalCount} {"מודולים הושלמו"}
            </Text>
          </View>

          {/* Module list */}
          {chapter.modules.map((mod, index) => {
            const isCompleted = completedModules.includes(mod.id);
            const isCurrent = index === (chapterProgress?.currentModuleIndex ?? 0);
            const isLocked = !isCompleted && !isCurrent;

            const variant = isCompleted ? 'green' : isCurrent ? 'gold' : 'blue';

            return (
              <AnimatedPressable
                key={mod.id}
                onPress={() => handleModulePress(mod, index, isLocked)}
                disabled={false}
                style={{ marginBottom: 14, opacity: isLocked ? 0.6 : 1 }}
              >
                <GoldBorderCard variant={variant} shimmer={isCurrent && !isCompleted}>
                  {isCurrent && !isCompleted && <SparkleOverlay color="#f5c842" density="low" active />}
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', padding: 4 }}>
                    {/* Module number / status badge */}
                    <View style={{
                      width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
                      marginLeft: 12,
                      backgroundColor: isCompleted ? '#22c55e20' : isLocked ? '#27272a' : CLASH.goldBorder + '20',
                      borderWidth: 2.5,
                      borderColor: isCompleted ? '#22c55e' : isCurrent ? CLASH.goldBorder : '#3f3f46',
                    }}>
                      <Text style={{
                        fontSize: 16, fontWeight: '900',
                        color: isCompleted ? '#4ade80' : isLocked ? '#52525b' : CLASH.goldLight,
                        ...TEXT_SHADOW,
                      }}>
                        {isCompleted ? "⭐" : isLocked ? "🔒" : mod.id === "mod-1-1" ? "📈" : `${index + 1}`}
                      </Text>
                    </View>
                    {/* Module info */}
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                      <Text style={[TITLE_TEXT, { fontSize: 15, lineHeight: 22 }, RTL_STYLE]}>
                        {mod.title}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 3, ...TEXT_SHADOW }}>
                        {mod.flashcards.length} {"כרטיסים"} {" · "} {mod.quizzes.length} {"שאלות"}
                      </Text>
                    </View>
                  </View>
                </GoldBorderCard>
              </AnimatedPressable>
            );
          })}

          {/* AI-unlocked hidden/dynamic modules */}
          {hiddenModules.length > 0 && (
            <>
              <View style={{ marginTop: 10, marginBottom: 14 }}>
                <Text style={[TITLE_TEXT, { fontSize: 14, color: HIDDEN_GLOW_COLOR }, RTL_STYLE]}>
                  {"✨ מודולים סודיים שנפתחו על ידי FinBrain"}
                </Text>
              </View>
              {hiddenModules.map((hm) => {
                const mod = hm.module;
                const hiddenIndex = chapter.modules.length;
                const isCompleted = completedModules.includes(mod.id);

                return (
                  <AnimatedPressable
                    key={mod.id}
                    onPress={() => handleModulePress(mod, hiddenIndex, false)}
                    style={{ marginBottom: 14 }}
                  >
                    <HiddenModuleGlow>
                      <GoldBorderCard variant={isCompleted ? 'green' : 'gold'} shimmer={!isCompleted}>
                        <SparkleOverlay color={HIDDEN_GLOW_COLOR} density="low" active />
                        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', padding: 4 }}>
                          <View style={{
                            width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
                            marginLeft: 12,
                            backgroundColor: isCompleted ? '#22c55e20' : HIDDEN_GLOW_COLOR + '20',
                            borderWidth: 2.5,
                            borderColor: isCompleted ? '#22c55e' : HIDDEN_GLOW_COLOR,
                          }}>
                            <Text style={{ fontSize: 16, fontWeight: '900', color: HIDDEN_GLOW_COLOR, ...TEXT_SHADOW }}>
                              {isCompleted ? "⭐" : "🧠"}
                            </Text>
                          </View>
                          <View style={{ flex: 1, alignItems: 'flex-end' }}>
                            <Text style={[TITLE_TEXT, { fontSize: 15, lineHeight: 22, color: HIDDEN_GLOW_COLOR }, RTL_STYLE]}>
                              {mod.title}
                            </Text>
                            <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 3, ...TEXT_SHADOW }}>
                              {"נפתח ע\"י FinBrain"} {" · "} {mod.flashcards.length} {"כרטיסים"}
                            </Text>
                          </View>
                        </View>
                      </GoldBorderCard>
                    </HiddenModuleGlow>
                  </AnimatedPressable>
                );
              })}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </DiamondBackground>
  );
}
