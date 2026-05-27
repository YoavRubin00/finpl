import { useState, useCallback } from "react";
import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useAuthStore } from "../auth/useAuthStore";
import { FINN_HAPPY } from "../retention-loops/finnMascotConfig";
import { AnimatedPressable } from "../../components/ui/AnimatedPressable";
import { tapHaptic } from "../../utils/haptics";
import type { KnowledgeLevel, LearningTime, DailyGoalMinutes } from "../auth/types";

export type ProfileQuestionKind = "knowledgeLevel" | "learningTime" | "dailyGoal";

interface Option<T> {
  id: T;
  label: string;
  sub: string;
}

const KNOWLEDGE_OPTIONS: Option<KnowledgeLevel>[] = [
  { id: "none", label: "כלום ושום דבר", sub: "מאפס מוחלט" },
  { id: "beginner", label: "יודע/ת קצת", sub: "שמעתי על זה" },
  { id: "some", label: "ממוצע", sub: "הבסיס מוכר לי" },
  { id: "experienced", label: "מתקדם/ת", sub: "יודע, אבל עדיין יש מה ללמוד" },
  { id: "expert", label: "כריש מוול סטריט", sub: "שוחה בעולם הפיננסי" },
];

const TIME_OPTIONS: Option<LearningTime>[] = [
  { id: "morning", label: "בוקר עם הקפה", sub: "מתחיל/ה את היום חכם/ה" },
  { id: "evening", label: "לפני השינה", sub: "מסיים/ת ב-level up" },
  { id: "during-day", label: "כשיש זמן", sub: "5 דקות בכל מקום" },
];

const DAILY_OPTIONS: Option<DailyGoalMinutes>[] = [
  { id: 5, label: "5 דקות", sub: "על הדרך" },
  { id: 10, label: "10 דקות", sub: "רגיל" },
  { id: 15, label: "15 דקות", sub: "רציני" },
  { id: 30, label: "30 דקות", sub: "נחוש" },
];

const TITLES: Record<ProfileQuestionKind, string> = {
  knowledgeLevel: "איך הרגשת עם המודולה?",
  learningTime: "מתי הכי קל לך ללמוד?",
  dailyGoal: "כמה דקות ביום את/ה מתחייב/ת?",
};

const SUBTITLES: Record<ProfileQuestionKind, string> = {
  knowledgeLevel: "תיקח/י שנייה לעזור לי להבין אותך טוב יותר",
  learningTime: "נכוון לך תזכורות נכון לפי השעה שלך",
  dailyGoal: "נשמור על הקצב שמתאים לחיים שלך",
};

interface Props {
  visible: boolean;
  kind: ProfileQuestionKind;
  onDone: () => void;
}

export function InModuleProfileQuestion({ visible, kind, onDone }: Props) {
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const [sel, setSel] = useState<string | number | null>(null);

  const handlePick = useCallback((id: string | number) => {
    setSel(id);
    tapHaptic();
    if (kind === "knowledgeLevel") {
      updateProfile({ knowledgeLevel: id as KnowledgeLevel });
    } else if (kind === "learningTime") {
      updateProfile({ learningTime: id as LearningTime });
    } else {
      updateProfile({ dailyGoalMinutes: id as DailyGoalMinutes });
    }
    setTimeout(() => {
      setSel(null);
      onDone();
    }, 600);
  }, [kind, updateProfile, onDone]);

  const handleSkip = useCallback(() => {
    tapHaptic();
    onDone();
  }, [onDone]);

  const options = kind === "knowledgeLevel"
    ? KNOWLEDGE_OPTIONS
    : kind === "learningTime"
      ? TIME_OPTIONS
      : DAILY_OPTIONS;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleSkip}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ExpoImage source={FINN_HAPPY} accessible={false} style={styles.finn} contentFit="contain" />
          <Text style={styles.title}>{TITLES[kind]}</Text>
          <Text style={styles.subtitle}>{SUBTITLES[kind]}</Text>

          <View style={styles.options}>
            {options.map((opt) => {
              const isSelected = sel === opt.id;
              return (
                <AnimatedPressable
                  key={String(opt.id)}
                  onPress={() => handlePick(opt.id)}
                  style={[styles.option, isSelected && styles.optionSelected]}
                  accessibilityRole="button"
                  accessibilityLabel={opt.label}
                >
                  <Text style={[styles.optLabel, isSelected && styles.optLabelSelected]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.optSub, isSelected && styles.optSubSelected]}>
                    {opt.sub}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>

          <Pressable onPress={handleSkip} style={styles.skip} accessibilityRole="button" accessibilityLabel="דלג">
            <Text style={styles.skipText}>דלג</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: "#e0f2fe",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
  },
  finn: { width: 72, height: 72, marginBottom: 8 },
  title: {
    fontSize: 19,
    fontWeight: "900",
    color: "#0c4a6e",
    textAlign: "center",
    writingDirection: "rtl",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    textAlign: "center",
    writingDirection: "rtl",
    marginBottom: 16,
    lineHeight: 19,
  },
  options: { width: "100%", gap: 8 },
  option: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: "#bae6fd",
  },
  optionSelected: {
    backgroundColor: "#0ea5e9",
    borderColor: "#0284c7",
  },
  optLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0c4a6e",
    textAlign: "right",
    writingDirection: "rtl",
  },
  optLabelSelected: { color: "#ffffff" },
  optSub: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 2,
  },
  optSubSelected: { color: "#e0f2fe" },
  skip: { marginTop: 14, paddingVertical: 6 },
  skipText: { fontSize: 13, fontWeight: "600", color: "#64748b" },
});
