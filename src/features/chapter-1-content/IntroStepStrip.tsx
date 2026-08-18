import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { TopicKind } from "../topic-learning/types";
import { TOPIC_LABELS } from "../topic-learning/topic-icons";

/**
 * "Where is this going?" strip for the lesson intro (Yoav 18.8.26).
 *
 * The intro is a timed audio beat with no visible progress; new users sat on
 * it 10–30s and left (PostHog 27.7–9.8, Android intro completion 65%). This
 * strip shows the module's first three chips — intro (current, highlighted) →
 * cards → quiz — so the intro reads as step 1 of a short path, not a dead end.
 * Kinds come from `resolveTopics(mod)` (single source of truth for the chip
 * order), never a hardcoded list. RTL: first step on the right.
 */
interface IntroStepStripProps {
  /** Ordered chip kinds for the module, `chat` already filtered out by the caller. */
  kinds: TopicKind[];
  currentKind: TopicKind;
  accentColor: string;
}

const MAX_VISIBLE = 3;

export function IntroStepStrip({ kinds, currentKind, accentColor }: IntroStepStripProps) {
  if (kinds.length < 2) return null;
  const visible = kinds.slice(0, MAX_VISIBLE);
  const hidden = kinds.length - visible.length;

  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`המסלול: ${kinds.map((k) => TOPIC_LABELS[k]).join(", ")}. עכשיו: ${TOPIC_LABELS[currentKind]}`}
    >
      {visible.map((kind, i) => {
        const isCurrent = kind === currentKind;
        return (
          <React.Fragment key={kind}>
            {i > 0 && <Text style={styles.arrow} accessible={false}>‹</Text>}
            <View
              style={[
                styles.chip,
                isCurrent
                  ? { backgroundColor: accentColor, borderColor: accentColor }
                  : styles.chipIdle,
              ]}
            >
              <Text style={[styles.chipText, isCurrent ? styles.chipTextCurrent : styles.chipTextIdle]}>
                {TOPIC_LABELS[kind]}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
      {hidden > 0 && (
        <Text style={styles.more} accessible={false}>{`+${hidden}`}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
    flexWrap: "nowrap",
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1.5,
  },
  chipIdle: {
    backgroundColor: "rgba(15,23,42,0.04)",
    borderColor: "rgba(15,23,42,0.08)",
  },
  chipText: { fontSize: 12, fontWeight: "800", writingDirection: "rtl" },
  chipTextCurrent: { color: "#ffffff" },
  chipTextIdle: { color: "#64748b" },
  arrow: { fontSize: 16, fontWeight: "900", color: "#94a3b8", marginTop: -2 },
  more: { fontSize: 11, fontWeight: "800", color: "#94a3b8", marginStart: 2 },
});
