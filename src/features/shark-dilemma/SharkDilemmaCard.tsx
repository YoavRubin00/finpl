import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Animated, { FadeIn, FadeInDown, FadeOut } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { FINN_DANCING, FINN_EMPATHIC, FINN_STANDARD } from "../retention-loops/finnMascotConfig";
import { tapHaptic, successHaptic } from "../../utils/haptics";
import type { SharkDilemma, DilemmaOption, DilemmaSlide, DilemmaResult } from "./types";

interface Props {
  dilemma: SharkDilemma;
  /** Fired once when the user finishes the (possibly branching) dilemma. */
  onComplete: (result: DilemmaResult) => void;
}

interface PathStep {
  slideId: string;
  choiceId: "a" | "b";
  isWise: boolean;
  scoreImpact: number;
}

interface NormalizedDilemma {
  slides: Map<string, DilemmaSlide>;
  startSlideId: string;
}

function normalizeDilemma(d: SharkDilemma): NormalizedDilemma {
  if (d.slides && d.slides.length > 0) {
    const map = new Map<string, DilemmaSlide>();
    for (const s of d.slides) map.set(s.id, s);
    const startSlideId = d.startSlideId ?? d.slides[0].id;
    if (__DEV__) {
      if (!map.has(startSlideId)) {
        console.warn(`[SharkDilemma] startSlideId "${startSlideId}" not found for module ${d.moduleId}`);
      }
      for (const s of d.slides) {
        for (const choiceId of ["a", "b"] as const) {
          const next = s.branches?.[choiceId];
          if (next && !map.has(next)) {
            console.warn(`[SharkDilemma] slide "${s.id}" branch "${choiceId}" → "${next}" not found (${d.moduleId})`);
          }
        }
      }
    }
    return { slides: map, startSlideId };
  }
  if (d.scenario && d.options) {
    const legacy: DilemmaSlide = { id: "main", scenario: d.scenario, options: d.options };
    return { slides: new Map([["main", legacy]]), startSlideId: "main" };
  }
  throw new Error(`[SharkDilemma] dilemma for ${d.moduleId} has neither slides nor scenario+options`);
}

function effectiveScore(option: DilemmaOption): number {
  if (typeof option.scoreImpact === "number") return option.scoreImpact;
  return option.isWise ? 1 : -1;
}

function buildResult(path: PathStep[]): DilemmaResult {
  let totalScore = 0;
  let wiseCount = 0;
  let unwiseCount = 0;
  for (const step of path) {
    totalScore += step.scoreImpact;
    if (step.isWise) wiseCount += 1;
    else unwiseCount += 1;
  }
  return {
    path: path.map(({ slideId, choiceId, isWise }) => ({ slideId, choiceId, isWise })),
    totalScore,
    wiseCount,
    unwiseCount,
  };
}

/**
 * "לייעץ לשארק" — end-of-module advisory dilemma. Finn shows a real-life
 * scenario; user picks one of two options. Wise choice → dancing shark.
 * Unwise → empathic shark. Supports branching: a slide's `branches[choiceId]`
 * routes to the next slide; missing branch = terminal for that choice.
 * Parent receives the full path + score via `onComplete`.
 */
export function SharkDilemmaCard({ dilemma, onComplete }: Props) {
  const normalized = useMemo(() => normalizeDilemma(dilemma), [dilemma]);
  const [currentSlideId, setCurrentSlideId] = useState(normalized.startSlideId);
  const [chosen, setChosen] = useState<DilemmaOption | null>(null);
  const [path, setPath] = useState<PathStep[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  const currentSlide = normalized.slides.get(currentSlideId);

  // Reset scroll to top whenever the user advances to a new slide so they always
  // see the new scenario from the start, regardless of how far they scrolled before.
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [currentSlideId]);

  const handleChoice = useCallback(
    (option: DilemmaOption) => {
      if (chosen || !currentSlide) return;
      tapHaptic();
      setChosen(option);
      if (option.isWise) successHaptic();
      setPath((prev) => [
        ...prev,
        {
          slideId: currentSlide.id,
          choiceId: option.id,
          isWise: option.isWise,
          scoreImpact: effectiveScore(option),
        },
      ]);
    },
    [chosen, currentSlide],
  );

  const handleContinue = useCallback(() => {
    if (!chosen || !currentSlide) return;
    const nextId = currentSlide.branches?.[chosen.id];
    const nextSlide = nextId ? normalized.slides.get(nextId) : undefined;
    if (nextSlide) {
      setCurrentSlideId(nextSlide.id);
      setChosen(null);
      return;
    }
    onComplete(buildResult(path));
  }, [chosen, currentSlide, normalized, path, onComplete]);

  if (!currentSlide) {
    if (__DEV__) console.warn(`[SharkDilemma] no slide for id "${currentSlideId}" (${dilemma.moduleId})`);
    return null;
  }

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(320)} style={styles.titleWrap}>
          <Text style={styles.title} accessibilityRole="header">לייעץ לשארק</Text>
        </Animated.View>

        {/* Slide-keyed wrapper so a transition fades between slides on branching dilemmas */}
        <Animated.View
          key={currentSlide.id}
          entering={FadeIn.duration(280)}
          exiting={FadeOut.duration(160)}
        >
          {/* Finn + speech bubble row */}
          <View style={styles.finnRow}>
            <View
              style={styles.bubble}
              accessible
              accessibilityLiveRegion="polite"
              accessibilityLabel={currentSlide.scenario}
            >
              <Text style={styles.bubbleText}>{currentSlide.scenario}</Text>
            </View>
            <ExpoImage
              source={chosen ? (chosen.isWise ? FINN_DANCING : FINN_EMPATHIC) : FINN_STANDARD}
              style={styles.finn}
              contentFit="contain"
              accessible={false}
            />
          </View>

          {/* Options — 2 blue buttons stacked. Hide after choice. */}
          {!chosen && (
            <Animated.View entering={FadeIn.duration(260)} exiting={FadeOut.duration(180)} style={styles.optionsWrap}>
              {currentSlide.options.map((option) => (
                <View key={option.id} style={styles.optionGlowWrap}>
                  <Pressable
                    onPress={() => handleChoice(option)}
                    accessibilityRole="button"
                    accessibilityLabel={option.label}
                  >
                    {({ pressed }) => (
                      <View style={[styles.optionBtn, pressed && styles.optionBtnPressed]}>
                        <Text style={styles.optionText}>{option.label}</Text>
                      </View>
                    )}
                  </Pressable>
                </View>
              ))}
            </Animated.View>
          )}

          {/* Feedback + continue */}
          {chosen && (
            <Animated.View entering={FadeIn.duration(320)} style={styles.feedbackWrap}>
              <View
                style={[styles.feedbackCard, chosen.isWise ? styles.feedbackWise : styles.feedbackNotWise]}
                accessible
                accessibilityLiveRegion="polite"
                accessibilityLabel={`${chosen.isWise ? "בחירה חכמה" : "נקודה למחשבה"}. ${chosen.feedback}`}
              >
                <Text style={[styles.feedbackLabel, chosen.isWise ? styles.feedbackLabelWise : styles.feedbackLabelNotWise]}>
                  {chosen.isWise ? "✓ בחירה חכמה" : "💭 נקודה למחשבה"}
                </Text>
                <Text style={styles.feedbackText}>{chosen.feedback}</Text>
              </View>

              <Pressable onPress={handleContinue} style={styles.continueBtn} accessibilityRole="button" accessibilityLabel="המשך">
                <Text style={styles.continueText}>המשך</Text>
              </Pressable>
            </Animated.View>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f0f9ff",
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 18,
  },
  titleWrap: {
    alignItems: "center",
    marginTop: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0369a1",
    writingDirection: "rtl",
    textAlign: "center",
  },
  finnRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 8,
  },
  finn: {
    width: 110,
    height: 110,
    flexShrink: 0,
  },
  bubble: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(14,165,233,0.35)",
    paddingVertical: 14,
    paddingHorizontal: 14,
    shadowColor: "#0ea5e9",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
    position: "relative",
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 24,
    color: "#0f172a",
    fontWeight: "600",
    textAlign: "right",
    writingDirection: "rtl",
  },
  optionsWrap: {
    gap: 16,
    marginTop: 8,
  },
  optionGlowWrap: {
    borderRadius: 16,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 24,
    elevation: 0,
  },
  optionBtn: {
    backgroundColor: "#0ea5e9",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#0284c7",
    borderBottomWidth: 5,
    borderBottomColor: "#0369a1",
    opacity: 1,
    shadowColor: "#0ea5e9",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  optionBtnPressed: {
    opacity: 0.95,
    transform: [{ translateY: 2 }],
    borderBottomWidth: 3,
  },
  optionText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#ffffff",
    textAlign: "center",
    writingDirection: "rtl",
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  feedbackWrap: {
    gap: 14,
    marginTop: 4,
  },
  feedbackCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  feedbackWise: {
    borderColor: "#22c55e",
    backgroundColor: "#f0fdf4",
  },
  feedbackNotWise: {
    borderColor: "#f59e0b",
    backgroundColor: "#fffbeb",
  },
  feedbackLabel: {
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 6,
    textAlign: "right",
    writingDirection: "rtl",
  },
  feedbackLabelWise: { color: "#15803d" },
  feedbackLabelNotWise: { color: "#b45309" },
  feedbackText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#0f172a",
    fontWeight: "500",
    textAlign: "right",
    writingDirection: "rtl",
  },
  continueBtn: {
    backgroundColor: "#0ea5e9",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#0284c7",
    borderBottomWidth: 5,
    borderBottomColor: "#0369a1",
    marginTop: 4,
    opacity: 1,
    shadowColor: "#0ea5e9",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  continueText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#ffffff",
    writingDirection: "rtl",
  },
});
