import { useState, useCallback, useMemo } from "react";
import { View, Text, Modal, Pressable, StyleSheet, ScrollView } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Animated, { FadeIn, FadeInUp, Easing } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check } from "lucide-react-native";
import { AnimatedPressable } from "../../../components/ui/AnimatedPressable";
import { SupercellButton } from "../../../components/ui/SupercellButton";
import { FINN_STANDARD } from "../../retention-loops/finnMascotConfig";
import { usePayslipMetaStore } from "../usePayslipMetaStore";
import { LEGAL_DISCLAIMER_FULL } from "../lib/legalDisclaimer";

interface LegalGateModalProps {
  visible: boolean;
  onAccepted: () => void;
  onDismiss?: () => void;
}

const RTL = { writingDirection: "rtl" as const, textAlign: "right" as const };
const RTL_CENTER = { writingDirection: "rtl" as const, textAlign: "center" as const };

interface BoldSegment {
  text: string;
  bold: boolean;
}

function parseBoldSegments(line: string): BoldSegment[] {
  const segments: BoldSegment[] = [];
  const regex = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = regex.exec(line);
  while (match !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: line.slice(lastIndex, match.index), bold: false });
    }
    segments.push({ text: match[1] ?? "", bold: true });
    lastIndex = match.index + match[0].length;
    match = regex.exec(line);
  }
  if (lastIndex < line.length) {
    segments.push({ text: line.slice(lastIndex), bold: false });
  }
  return segments;
}

function DisclaimerLine({ line, index }: { line: string; index: number }) {
  const segments = useMemo(() => parseBoldSegments(line), [line]);
  return (
    <Animated.View
      entering={FadeIn.delay(120 + index * 60).duration(260)}
      style={styles.lineRow}
    >
      <View style={styles.bullet} />
      <Text style={[styles.lineText, RTL]} allowFontScaling={false}>
        {segments.map((seg, i) => (
          <Text
            key={i}
            style={seg.bold ? styles.lineTextBold : undefined}
            allowFontScaling={false}
          >
            {seg.text}
          </Text>
        ))}
      </Text>
    </Animated.View>
  );
}

export function LegalGateModal({ visible, onAccepted, onDismiss }: LegalGateModalProps) {
  const insets = useSafeAreaInsets();
  const [checked, setChecked] = useState(false);
  const acceptLegal = usePayslipMetaStore((s) => s.acceptLegal);

  const handleToggle = useCallback(() => {
    setChecked((prev) => !prev);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!checked) return;
    acceptLegal();
    onAccepted();
  }, [checked, acceptLegal, onAccepted]);

  const handleRequestClose = useCallback(() => {
    onDismiss?.();
  }, [onDismiss]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleRequestClose}
    >
      <View style={styles.backdrop}>
        <Animated.View
          entering={FadeInUp.duration(360).easing(Easing.out(Easing.cubic))}
          style={[
            styles.sheet,
            {
              marginTop: insets.top + 24,
              marginBottom: Math.max(24, insets.bottom + 16),
            },
          ]}
        >
          <View style={styles.header}>
            <ExpoImage
              source={FINN_STANDARD}
              style={styles.finn}
              contentFit="contain"
              accessible={false}
            />
            <View style={styles.headerTextWrap}>
              <Text style={[styles.title, RTL]} allowFontScaling={false}>
                לפני שמתחילים — חשוב לקרוא
              </Text>
              <Text style={[styles.subtitle, RTL]} allowFontScaling={false}>
                כתב ויתור משפטי ופרטיות
              </Text>
            </View>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            {LEGAL_DISCLAIMER_FULL.map((line, i) => (
              <DisclaimerLine key={i} line={line} index={i} />
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <AnimatedPressable
              onPress={handleToggle}
              accessibilityRole="checkbox"
              accessibilityLabel="קראתי והבנתי"
              accessibilityState={{ checked }}
              style={styles.checkboxRow}
              noScale
            >
              <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                {checked ? <Check size={18} color="#ffffff" strokeWidth={3.5} /> : null}
              </View>
              <Text style={[styles.checkboxLabel, RTL]} allowFontScaling={false}>
                קראתי והבנתי
              </Text>
            </AnimatedPressable>

            <View style={styles.ctaWrap}>
              <SupercellButton
                label="אני מאשר/ת"
                variant="blue"
                buttonStyle="duo"
                size="md"
                onPress={handleConfirm}
                disabled={!checked}
              />
            </View>

            {onDismiss ? (
              <Pressable
                onPress={onDismiss}
                accessibilityRole="button"
                accessibilityLabel="ביטול"
                hitSlop={12}
                style={styles.dismissBtn}
              >
                <Text style={[styles.dismissText, RTL_CENTER]} allowFontScaling={false}>
                  ביטול
                </Text>
              </Pressable>
            ) : null}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(8,23,42,0.55)",
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  sheet: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    borderWidth: 1.5,
    borderColor: "rgba(14,165,233,0.35)",
    shadowColor: "#0c4a6e",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
    maxHeight: "92%",
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(14,165,233,0.18)",
  },
  finn: {
    width: 48,
    height: 48,
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0c4a6e",
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0369a1",
    marginTop: 2,
  },
  scroll: {
    maxHeight: 360,
  },
  scrollContent: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    gap: 12,
  },
  lineRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#1d4ed8",
    marginTop: 8,
  },
  lineText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: "#1f2937",
    lineHeight: 21,
  },
  lineTextBold: {
    fontWeight: "900",
    color: "#0c4a6e",
  },
  footer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(14,165,233,0.18)",
    gap: 12,
  },
  checkboxRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#1d4ed8",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#1d4ed8",
    borderColor: "#1e3a8a",
  },
  checkboxLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0c4a6e",
  },
  ctaWrap: {
    marginTop: 4,
  },
  dismissBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  dismissText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748b",
  },
});
