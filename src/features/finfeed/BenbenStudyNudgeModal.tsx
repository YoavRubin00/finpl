import React, { useEffect } from "react";
import { View, Text, Modal, Pressable, StyleSheet } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Animated, { FadeIn, FadeInDown, ZoomIn, Easing } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { X, ChevronLeft } from "lucide-react-native";
import { FINN_HAPPY } from "../retention-loops/finnMascotConfig";
import { useChapterStore } from "../chapter-1-content/useChapterStore";
import { tapHaptic } from "../../utils/haptics";
import { useSoundEffect } from "../../hooks/useSoundEffect";

const RTL_CENTER = { writingDirection: "rtl" as const, textAlign: "center" as const };
const RTL = { writingDirection: "rtl" as const, textAlign: "right" as const };

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface TopicLink {
  label: string;
  emoji: string;
  moduleId: string;
  chapterStoreId: string;
  chapterId: string;
  moduleIndex: number;
  /** index-based: pension is 4th module in chapter 2 (mod-2-9, mod-2-10, mod-2-11, mod-2-12, mod-2-13, mod-2-14) */
}

// Module indices derived from chapter2Data, mod-2-11 is index 6, mod-2-12 is 7, mod-2-13 is 8.
// If the ordering shifts, these should be looked up dynamically. For now hard-coded per current data.
const TOPICS: TopicLink[] = [
  {
    label: "פנסיה",
    emoji: "👴",
    moduleId: "mod-2-12",
    chapterStoreId: "ch-2",
    chapterId: "chapter-2",
    moduleIndex: 7,
  },
  {
    label: "קרן השתלמות",
    emoji: "💼",
    moduleId: "mod-2-13",
    chapterStoreId: "ch-2",
    chapterId: "chapter-2",
    moduleIndex: 8,
  },
  {
    label: "מס הכנסה וביטוח לאומי",
    emoji: "🧾",
    moduleId: "mod-2-11",
    chapterStoreId: "ch-2",
    chapterId: "chapter-2",
    moduleIndex: 6,
  },
];

export function BenbenStudyNudgeModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const setCurrentChapter = useChapterStore((s) => s.setCurrentChapter);
  const setCurrentModule = useChapterStore((s) => s.setCurrentModule);
  const { playSound } = useSoundEffect();

  useEffect(() => {
    if (visible) playSound('btn_click_soft_1');
  }, [visible, playSound]);

  const handleTopicPress = (topic: TopicLink) => {
    tapHaptic();
    setCurrentChapter(topic.chapterStoreId);
    setCurrentModule(topic.moduleIndex);
    onClose();
    router.push(`/lesson/${topic.moduleId}?chapterId=${topic.chapterId}` as never);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="סגור">
        <Animated.View
          entering={FadeInDown.duration(320).easing(Easing.out(Easing.cubic))}
          style={[styles.sheet, { paddingBottom: Math.max(24, insets.bottom + 16) }]}
        >
          <Pressable onPress={() => {}} accessible={false}>
            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="סגור"
              hitSlop={10}
            >
              <X size={22} color="#64748b" />
            </Pressable>

            <Animated.View
              entering={ZoomIn.delay(280).springify().damping(9)}
              style={styles.sharkWrap}
            >
              <ExpoImage source={FINN_HAPPY} style={styles.shark} contentFit="contain" accessible={false} />
            </Animated.View>

            <Text
              style={[styles.title, RTL_CENTER]}
              allowFontScaling={false}
              accessibilityRole="header"
            >
              רוצה להבין איך משכורת הופכת לכסף אמיתי?
            </Text>

            <Text style={[styles.subtitle, RTL_CENTER]} allowFontScaling={false}>
              הפרשות לפנסיה, ביטוח לאומי, קרן השתלמות ומס הכנסה, כל הבסיס בתוך 3 מודולות קצרות.
            </Text>

            <View style={styles.topicList}>
              {TOPICS.map((topic, i) => (
                <Animated.View
                  key={topic.moduleId}
                  entering={FadeIn.delay(360 + i * 35).duration(200)}
                >
                  <Pressable
                    onPress={() => handleTopicPress(topic)}
                    accessibilityRole="button"
                    accessibilityLabel={`למד על ${topic.label}`}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    style={({ pressed }) => [
                      styles.topicBtn,
                      pressed && { transform: [{ translateY: 1 }], opacity: 0.88 },
                    ]}
                  >
                    <Text style={styles.topicEmoji} allowFontScaling={false}>{topic.emoji}</Text>
                    <Text style={[styles.topicLabel, RTL]} allowFontScaling={false} numberOfLines={1}>
                      {topic.label}
                    </Text>
                    <ChevronLeft size={18} color="#ffffff" strokeWidth={2.5} />
                  </Pressable>
                </Animated.View>
              ))}
            </View>

            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="אולי אחר כך"
              hitSlop={8}
              style={({ pressed }) => [styles.later, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.laterText} allowFontScaling={false}>אולי אחר כך</Text>
            </Pressable>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(8,23,42,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 16,
    paddingHorizontal: 22,
    gap: 10,
  },
  closeBtn: {
    alignSelf: "flex-end",
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  sharkWrap: {
    alignItems: "center",
    marginTop: -4,
  },
  shark: {
    width: 120,
    height: 120,
  },
  title: {
    color: "#0f172a",
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 28,
    marginTop: 4,
  },
  subtitle: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 21,
    marginBottom: 10,
  },
  topicList: {
    gap: 10,
  },
  topicBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#0891b2",
    borderRadius: 16,
    borderBottomWidth: 3,
    borderBottomColor: "#0e7490",
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  topicEmoji: {
    fontSize: 22,
    lineHeight: 26,
  },
  topicLabel: {
    flex: 1,
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },
  later: {
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 6,
  },
  laterText: {
    color: "#64748b",
    fontSize: 14,
    fontWeight: "700",
    writingDirection: "rtl",
  },
});
