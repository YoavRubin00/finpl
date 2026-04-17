import { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { X, Check } from "lucide-react-native";
import { useAuthStore } from "../auth/useAuthStore";
import type { FinancialGoal, DailyGoalMinutes, CompanionId } from "../auth/types";
import { tapHaptic } from "../../utils/haptics";

// ─── option maps ─────────────────────────────────────────────────────────────

const GOAL_OPTIONS: { value: FinancialGoal; label: string }[] = [
  { value: "cash-flow",        label: "💸 תזרים מזומנים" },
  { value: "investing",        label: "📈 השקעות" },
  { value: "army-release",     label: "🪖 שחרור מצה\"ל" },
  { value: "expand-horizons",  label: "🌍 הרחבת אופקים" },
  { value: "unsure",           label: "🤷 עוד לא בטוח" },
];

const DAILY_OPTIONS: { value: DailyGoalMinutes; label: string }[] = [
  { value: 5,  label: "5 דק׳" },
  { value: 10, label: "10 דק׳" },
  { value: 15, label: "15 דק׳" },
  { value: 30, label: "30 דק׳" },
];

const COMPANION_OPTIONS: { value: CompanionId; label: string }[] = [
  { value: "warren-buffett", label: "קפטן שארק — חכם" },
  { value: "moshe-peled",    label: "קפטן שארק — תכל'סי" },
  { value: "rachel",         label: "קפטן שארק — חם" },
  { value: "robot",          label: "קפטן שארק — אנליטי" },
];

// ─── helpers ─────────────────────────────────────────────────────────────────

function ChipRow<T extends string | number>({
  options,
  value,
  onSelect,
}: {
  options: { value: T; label: string }[];
  value: T;
  onSelect: (v: T) => void;
}) {
  return (
    <View style={s.chipRow}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={String(opt.value)}
            onPress={() => { tapHaptic(); onSelect(opt.value); }}
            style={[s.chip, active && s.chipActive]}
          >
            <Text style={[s.chipText, active && s.chipTextActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export function EditProfileModal({ visible, onClose }: EditProfileModalProps) {
  const displayName = useAuthStore((s) => s.displayName);
  const profile = useAuthStore((s) => s.profile);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  const [name, setName]           = useState(displayName ?? "");
  const [goal, setGoal]           = useState<FinancialGoal>(profile?.financialGoal ?? "investing");
  const [daily, setDaily]         = useState<DailyGoalMinutes>(profile?.dailyGoalMinutes ?? 10);
  const [companion, setCompanion] = useState<CompanionId>(profile?.companionId ?? "warren-buffett");

  // reset local state when modal opens
  function handleShow() {
    setName(displayName ?? "");
    setGoal(profile?.financialGoal ?? "investing");
    setDaily(profile?.dailyGoalMinutes ?? 10);
    setCompanion(profile?.companionId ?? "warren-buffett");
  }

  function handleSave() {
    tapHaptic();
    updateProfile({ displayName: name.trim() || (displayName ?? ""), financialGoal: goal, dailyGoalMinutes: daily, companionId: companion });
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onShow={handleShow}
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ width: "100%" }}
        >
          <View style={s.sheet}>
            {/* Header */}
            <View style={s.header}>
              <Pressable onPress={handleSave} hitSlop={12} style={s.saveBtn}>
                <Check size={18} color="#ffffff" />
                <Text style={s.saveBtnText}>שמור</Text>
              </Pressable>
              <Text style={s.title}>עריכת פרופיל</Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <X size={22} color="#71717a" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 24, paddingBottom: 32 }}>
              {/* Name */}
              <View style={s.field}>
                <Text style={s.label}>שם תצוגה</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="השם שלך"
                  placeholderTextColor="#52525b"
                  maxLength={50}
                  style={s.textInput}
                  textAlign="right"
                accessibilityLabel="השם שלך" />
              </View>

              {/* Goal */}
              <View style={s.field}>
                <Text style={s.label}>מטרה פיננסית</Text>
                <ChipRow options={GOAL_OPTIONS} value={goal} onSelect={setGoal} />
              </View>

              {/* Daily goal */}
              <View style={s.field}>
                <Text style={s.label}>יעד יומי</Text>
                <ChipRow options={DAILY_OPTIONS} value={daily} onSelect={setDaily} />
              </View>

              {/* Companion */}
              <View style={s.field}>
                <Text style={s.label}>מלווה</Text>
                <ChipRow options={COMPANION_OPTIONS} value={companion} onSelect={setCompanion} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  sheet: {
    width: "100%",
    backgroundColor: "#0f172a",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: "rgba(167,139,250,0.25)",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#e4e4e7",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(34,197,94,0.2)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.5)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4ade80",
  },
  field: {
    gap: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#71717a",
    textAlign: "right",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.3)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#e4e4e7",
    fontSize: 16,
    fontWeight: "600",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  chipActive: {
    borderColor: "#a78bfa",
    backgroundColor: "rgba(124,58,237,0.2)",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#71717a",
  },
  chipTextActive: {
    color: "#c4b5fd",
    fontWeight: "700",
  },
});
