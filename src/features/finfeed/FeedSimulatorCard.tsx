import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Lock, X } from "lucide-react-native";
import { SimulatorLoader } from "../chapter-1-content/SimulatorLoader";
import { isModuleAccessible, nextAccessibleModule } from "../subscription/moduleAccess";
import { useChapterStore } from "../chapter-1-content/useChapterStore";
import { FINN_STANDARD } from "../retention-loops/finnMascotConfig";
import { useSoundEffect } from "../../hooks/useSoundEffect";
import { tapHaptic } from "../../utils/haptics";
import { FeedStartButton } from "./minigames/shared/FeedStartButton";
import type { FeedSimulator } from "./feedSimulatorsData";

const RTL = { writingDirection: "rtl" as const, textAlign: "right" as const };

interface Props {
  simulator: FeedSimulator;
  isActive: boolean;
}

export function FeedSimulatorCard({ simulator, isActive: _isActive }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const { playSound } = useSoundEffect();

  const accessible = isModuleAccessible(simulator.moduleId, simulator.chapterId);
  const next = accessible ? null : nextAccessibleModule();

  function handlePlay() {
    tapHaptic();
    playSound("btn_click_heavy");
    setModalVisible(true);
  }

  function handleCloseModal() {
    setModalVisible(false);
  }

  function handleGoToModule() {
    tapHaptic();
    playSound("btn_click_soft_2");
    if (accessible) {
      useChapterStore.getState().setCurrentChapter(simulator.storeChapterId);
      useChapterStore.getState().setCurrentModule(simulator.moduleIndex);
      router.push(`/lesson/${simulator.moduleId}?chapterId=${simulator.chapterId}` as never);
    } else if (next) {
      useChapterStore.getState().setCurrentChapter(next.storeChapterId);
      router.push(`/lesson/${next.moduleId}?chapterId=${next.chapterId}` as never);
    }
  }

  return (
    <View style={styles.container}>
      {/* Chapter tag */}
      <View style={styles.tagRow}>
        <View style={[styles.tag, { borderColor: simulator.accentColor + "66" }]}>
          <Text style={[styles.tagText, { color: simulator.accentColor }]}>
            {simulator.chapterName}
          </Text>
        </View>
      </View>

      {/* Preview panel */}
      <LinearGradient
        colors={["#0c4a6e", "#082f49", "#0a1628"]}
        style={styles.previewPanel}
      >
        <View style={[styles.accentOrb, { backgroundColor: simulator.accentColor + "22" }]} />
        <Text style={[styles.simTitle, { color: simulator.accentColor }]}>
          {simulator.teaserTitle}
        </Text>
        <Text style={styles.simModuleTitle}>{simulator.moduleTitle}</Text>
      </LinearGradient>

      {/* Finn bubble */}
      <View style={styles.finnBubble}>
        <ExpoImage
          source={FINN_STANDARD}
          accessible={false}
          style={{ width: 36, height: 36, flexShrink: 0 }}
          contentFit="contain"
        />
        <Text style={[styles.finnText, RTL]}>{simulator.teaserSub}</Text>
      </View>

      {/* Play button */}
      <FeedStartButton
        label="שחקו עכשיו"
        onPress={handlePlay}
        accessibilityLabel={`שחקו עכשיו — ${simulator.teaserTitle}`}
      />

      {/* Module CTA */}
      {accessible ? (
        <Pressable
          onPress={handleGoToModule}
          style={styles.ctaBtn}
          accessibilityRole="button"
          accessibilityLabel="עשו את המודולה המלאה"
        >
          <Text style={[styles.ctaBtnText, RTL]}>עשו את המודולה המלאה</Text>
        </Pressable>
      ) : (
        <View style={styles.lockedChip}>
          <Lock size={12} color="#94a3b8" />
          <Text style={[styles.lockedText, RTL]}>
            {next ? `קודם נסיים את: ${next.title}` : "השלם את המודולות הקודמות"}
          </Text>
        </View>
      )}

      {/* Simulator modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleCloseModal}
      >
        <SafeAreaView style={styles.modalContainer} edges={["top", "bottom"]}>
          <Pressable
            onPress={handleCloseModal}
            style={[styles.closeBtn, { top: insets.top + 12 }]}
            accessibilityRole="button"
            accessibilityLabel="סגור סימולטור"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <X size={22} color="#f0f9ff" />
          </Pressable>
          <SimulatorLoader
            moduleId={simulator.simulatorKey}
            onComplete={handleCloseModal}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "center",
    gap: 10,
  },
  tagRow: {
    alignItems: "flex-end",
  },
  tag: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "700",
    writingDirection: "rtl",
  },
  previewPanel: {
    borderRadius: 20,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    gap: 6,
  },
  accentOrb: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    top: -40,
    right: -40,
  },
  simTitle: {
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
    writingDirection: "rtl",
  },
  simModuleTitle: {
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
    writingDirection: "rtl",
  },
  finnBubble: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  finnText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#0c4a6e",
    lineHeight: 20,
  },
  ctaBtn: {
    alignSelf: "center",
    paddingVertical: 8,
  },
  ctaBtnText: {
    fontSize: 13,
    color: "#0891b2",
    fontWeight: "700",
  },
  lockedChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
    backgroundColor: "rgba(148,163,184,0.12)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.25)",
  },
  lockedText: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#0c1a2e",
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 100,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 20,
    padding: 8,
  },
});
