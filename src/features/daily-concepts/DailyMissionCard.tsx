import React, { useState, useCallback, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Modal, Dimensions } from "react-native";
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useDailyConceptStore } from "./useDailyConceptStore";
import { DAILY_CONCEPTS } from "./dailyConceptsData";
import { useEconomyStore } from "../economy/useEconomyStore";
import { tapHaptic, successHaptic } from "../../utils/haptics";
import { LottieIcon } from "../../components/ui/LottieIcon";
import { GoldCoinIcon } from "../../components/ui/GoldCoinIcon";
import { STITCH } from "../../constants/theme";

interface DailyMissionCardProps {
  activeChapterId: number;
}

const { width } = Dimensions.get("window");

export const DailyMissionCard = React.memo(function DailyMissionCard({ activeChapterId }: DailyMissionCardProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Zustand state
  const getTodayPair = useDailyConceptStore((s) => s.getTodayPair);
  const isCompleted = useDailyConceptStore((s) => s.isCompleted);
  const markCompleted = useDailyConceptStore((s) => s.markCompleted);
  const addXP = useEconomyStore((s) => s.addXP);
  const addCoins = useEconomyStore((s) => s.addCoins);

  // We must compute todayPair dynamically when open or rendering progress
  const todayPair = getTodayPair(activeChapterId);
  const concepts = todayPair
    .map((id) => DAILY_CONCEPTS.find((c) => c.id === id))
    .filter(Boolean) as typeof DAILY_CONCEPTS;

  const completedCount = concepts.filter((c) => isCompleted(c.id)).length;
  const totalConcepts = concepts.length;
  const progressRatio = totalConcepts > 0 ? completedCount / totalConcepts : 0;

  // Animate progress bar
  const progressAnim = useSharedValue(0);
  useEffect(() => {
    progressAnim.value = withTiming(progressRatio * 100, { duration: 600 });
  }, [progressRatio]);

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressAnim.value}%`,
  }));

  const handleTapConcept = useCallback(
    (id: string) => {
      if (expandedId === id) {
        setExpandedId(null);
        return;
      }
      tapHaptic();
      setExpandedId(id);
      if (!isCompleted(id)) {
        markCompleted(id);
        addXP(5, "daily_task");
        // Give total reward if all completed now
        const newlyCompletedCount = concepts.filter((c) => isCompleted(c.id) || c.id === id).length;
        if (newlyCompletedCount === totalConcepts && completedCount < totalConcepts) {
          addCoins(20);
          successHaptic();
        }
      }
    },
    [expandedId, isCompleted, markCompleted, addXP, addCoins, completedCount, totalConcepts, concepts]
  );

  return (
    <>
      {/* The Docked Card on the Feed Screen */}
      <Pressable 
        style={s.dockedCardWrapper} 
        onPress={() => {
          tapHaptic();
          setModalVisible(true);
        }}
      >
        <View style={s.dockedCard}>
          <View style={s.dockedHeader}>
            <View style={s.rewardBadge}>
              <GoldCoinIcon size={14} />
              <Text style={s.rewardText}>20+</Text>
            </View>
            <Text style={s.dockedTitle}>מושגים יומיים</Text>
          </View>

          <View style={s.progressContainer}>
            <Animated.View style={[s.progressFill, progressBarStyle]} />
          </View>

          <Text style={s.dockedSubtitle}>
            למדו 2 מושגים מזירת החיים ({completedCount}/{totalConcepts})
          </Text>
        </View>
      </Pressable>

      {/* The Interactive Modal with Flashcards */}
      <Modal visible={modalVisible} animationType="slide" transparent accessibilityViewIsModal>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Pressable style={s.closeButton} onPress={() => setModalVisible(false)}>
              <Text style={s.closeIcon}>✕</Text>
            </Pressable>

            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>מושגים יומיים</Text>
              <Text style={s.modalSub}>
                העשירו את אוצר המילים מפרק {activeChapterId}
              </Text>
            </View>

            {concepts.map((concept, i) => {
              const done = isCompleted(concept.id);
              const isExpanded = expandedId === concept.id;
              return (
                <Animated.View key={concept.id} entering={FadeInDown.delay(i * 100).duration(300)}>
                  <Pressable onPress={() => handleTapConcept(concept.id)} style={[s.pill, done && s.pillDone]}>
                    <View style={s.pillRow}>
                      <LottieIcon source={concept.lottieSource} size={28} />
                      <Text style={[s.pillTitle, done && s.pillTitleDone]}>{concept.titleHe}</Text>
                      {done && <Text style={s.checkmark}>✓</Text>}
                    </View>
                    {isExpanded && (
                      <Animated.View entering={FadeIn.duration(200)}>
                        <Text style={s.description}>{concept.descriptionHe}</Text>
                        {!done && <Text style={s.xpLabel}>+5 XP</Text>}
                      </Animated.View>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}

            {completedCount === totalConcepts && (
              <Animated.View entering={FadeInDown.duration(400)} style={s.allDoneBadge}>
                <Text style={s.allDoneText}>המשימה הושלמה! +20 מטבעות הועברו לארנק 🎯</Text>
              </Animated.View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
});

const s = StyleSheet.create({
  // Docked Card Styles
  dockedCardWrapper: {
    paddingHorizontal: 16,
    width: "100%",
    marginBottom: 20,
    marginTop: 10,
  },
  dockedCard: {
    backgroundColor: "#ffffff",
    borderRadius: 32, // 'lg' corner radius to feel softer
    padding: 20,
    // The "No-Line" Rule: remove harsh border and use ambient shadow
    shadowColor: "#001b3d",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.06,
    shadowRadius: 40,
    elevation: 8,
  },
  dockedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dockedTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: STITCH.primary, // Primary theme color
  },
  rewardBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  rewardText: {
    color: STITCH.tertiaryGold, // Tertiary (Gold) text color
    fontWeight: "800",
    fontSize: 13,
  },
  progressContainer: {
    height: 12,
    backgroundColor: STITCH.surfaceVariant, // surface_variant
    borderRadius: 8,
    overflow: "hidden",
    width: "100%",
    marginBottom: 10,
  },
  progressFill: {
    height: "100%",
    backgroundColor: STITCH.primaryContainer, // Primary Container
    borderRadius: 8,
  },
  dockedSubtitle: {
    fontSize: 13,
    color: STITCH.onSurfaceVariant, // on_surface_variant
    writingDirection: "rtl",
    textAlign: "right",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 48, // 'xl' corner radius for large modal
    borderTopRightRadius: 48,
    padding: 24,
    paddingBottom: 40,
    minHeight: "50%",
    // Ambient shadow for depth without harsh lines
    shadowColor: "#001b3d",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.08,
    shadowRadius: 40,
    elevation: 20,
  },
  closeButton: {
    position: "absolute",
    top: 20,
    left: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  closeIcon: {
    fontSize: 16,
    fontWeight: "800",
    color: "#64748b",
  },
  modalHeader: {
    alignItems: "flex-end",
    marginBottom: 24,
    paddingRight: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: STITCH.primary, // Primary theme color
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 14,
    color: "#64748b",
  },

  // Pill Styles (Inside Modal)
  pill: {
    backgroundColor: STITCH.surfaceLow, // Tonal layering — contrast against white modal
    borderRadius: 24, // 'md' corner radius
    padding: 16,
    marginBottom: 12,
  },
  pillDone: {
    backgroundColor: "#f0fdf4",
    borderColor: "#86efac",
  },
  pillRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
  },
  pillEmoji: {
    fontSize: 26,
  },
  pillTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: STITCH.onSurface, // on_surface (no pure black)
    writingDirection: "rtl",
    textAlign: "right",
  },
  pillTitleDone: {
    color: "#16a34a",
  },
  checkmark: {
    fontSize: 18,
    fontWeight: "900",
    color: "#16a34a",
  },
  description: {
    fontSize: 14,
    color: STITCH.onSurfaceVariant, // on_surface_variant 
    writingDirection: "rtl",
    textAlign: "right",
    lineHeight: 22,
    marginTop: 12,
    paddingTop: 12,
  },
  xpLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0ea5e9",
    textAlign: "center",
    marginTop: 8,
  },
  allDoneBadge: {
    backgroundColor: "#f0fdf4",
    borderRadius: 24,
    padding: 14,
    alignItems: "center",
    marginTop: 10,
  },
  allDoneText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#16a34a",
    textAlign: "center",
    writingDirection: "rtl",
  },
});
