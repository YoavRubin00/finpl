import React, { useEffect, useRef } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  useReducedMotion,
  cancelAnimation,
} from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';
import { mediumHaptic, successHaptic } from '../../../utils/haptics';
import { useSoundEffect } from '../../../hooks/useSoundEffect';
import { track } from '../../../lib/analytics/events';
import type { Topic } from '../types';

/** Inlined to avoid a cross-feature import for a one-line parse — same shape
 *  as the helper in useTopicProgressStore.ts. */
function chapterIdFromModuleId(moduleId: string): string {
  const m = /^mod-(\d+)-/.exec(moduleId);
  return m ? `chapter-${m[1]}` : '';
}

interface TopicChipProps {
  topic: Topic;
  /** Has the user completed this topic? Drives the soft-green fill —
   *  no check badge per Yoav R5.3 ("בלי וי, במקום בכחול"). */
  completed: boolean;
  /** Currently focused as the "resume here" candidate — gets a soft
   *  gold halo to direct attention without crowding the whole grid
   *  with motion. */
  recommended?: boolean;
  onPress: (topic: Topic) => void;
}

const NODE_SIZE = 78;

// R5.3 (2026-06-10): completed chips flip from chapter-blue to a soft
// pleasant green Yoav called out ("צבע ירוק בהיר ונעים בלי וי, במקום
// בכחול"). Stays muted enough to read as "done, can revisit" instead of
// "celebrate me now" — the loud celebration belongs to the chest, not
// every individual chip.
const DONE_BG = '#bbf7d0';      // green-200 — pleasant pastel
const DONE_DEPTH = '#4ade80';   // green-400 — depth shadow
const DONE_BORDER = '#22c55e';  // green-500 — thin ring for definition

// Light-gray palette for incomplete chips — matches the legacy
// ModuleNode "locked" state hue Yoav pointed to ("אפרפר לכל מה שלא
// ביצעתי עדין").
const MUTED_BG = '#e5e7eb';
const MUTED_DEPTH = '#c7cdd4';
// Incomplete chips desaturate their SVG icon a little so the bright
// gradients don't draw attention before the user has completed them.
const MUTED_ICON_OPACITY = 0.55;
// R8 follow-up (Yoav 2026-06-10): the recommended (= next topic) chip
// is now SOLID gold, not a gray chip surrounded by a gold halo. Yoav:
// "צריך שמה שמסומן כהבא, יהיה בפועל בצבע זהב, ולא מוקף בזהב".
const RECOMMENDED_BG = '#fde68a';      // amber-200 — pleasant warm gold
const RECOMMENDED_DEPTH = '#d97706';   // amber-600 — depth shadow
const RECOMMENDED_BORDER = '#f59e0b';  // amber-500 — ring for definition
// Recommended chip keeps the SVG icon at full opacity (it's the
// "do this next" affordance, not a locked one).
// Icon visual size inside the 78px circle. Design System SVGs ship at
// 96px source; rendering at 56 leaves ~11px breathing room on each side.
const ICON_SIZE = 56;

/**
 * R5.3 (2026-06-10) — circular ModuleNode-style chip with three
 * visual changes from R5.2:
 *  1. Intro emoji switched to 👋 (no shark) at the icon registry.
 *  2. Completed state is soft green (`#bbf7d0`) instead of chapter
 *     blue, no check badge.
 *  3. Recommended halo moved INSIDE the chip (sized to the circle)
 *     so the gold glow renders as a circle on web instead of a
 *     rectangular box-shadow.
 */
export const TopicChip = React.memo(function TopicChip({
  topic,
  completed,
  recommended = false,
  onPress,
}: TopicChipProps): React.ReactElement {
  const scale = useSharedValue(1);
  const pulseScale = useSharedValue(1);
  const flashOpacity = useSharedValue(0);
  // Scale is composed: press/celebration sequences live on `scale`, the
  // recommended-chip breathing loop lives on `pulseScale`. Multiplying
  // them keeps both layers independent — a press during the pulse cycle
  // still feels snappy because the press sequence rides on top.
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * pulseScale.value }],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));
  const { playSound } = useSoundEffect();
  const reduceMotion = useReducedMotion();

  // R8 J1 — celebrate the false→true completion transition with a
  // particle burst + green pulse + success haptic. The press itself
  // navigates away, so the "you completed it" moment fires when the
  // user returns to the map and the chip first re-renders as done.
  // R8 follow-up (Yoav 2026-06-10): no gold particle burst — Yoav
  // wants chip color to stay clean. Celebration is just haptic +
  // green flash + a soft scale bounce + soft pop sound.
  const prevCompletedRef = useRef(completed);
  useEffect(() => {
    if (!prevCompletedRef.current && completed) {
      successHaptic();
      try { playSound('btn_click_soft_3'); } catch { /* non-fatal */ }
      flashOpacity.value = withSequence(
        withTiming(0.55, { duration: 140 }),
        withTiming(0, { duration: 320 }),
      );
      scale.value = withSequence(
        withSpring(1.12, { damping: 10, stiffness: 220 }),
        withSpring(1, { damping: 11, stiffness: 200 }),
      );
    }
    prevCompletedRef.current = completed;
  }, [completed, flashOpacity, playSound, scale]);

  const handlePress = () => {
    // R8 J1 — escalate from light tap → medium impact + soft snap sound.
    mediumHaptic();
    try { playSound('btn_click_soft_2'); } catch { /* non-fatal */ }
    flashOpacity.value = withSequence(
      withTiming(0.35, { duration: 90 }),
      withTiming(0, { duration: 220 }),
    );
    // Press-down then spring-back as ONE sequence. Two bare assignments ran
    // in the same tick, so the second (→1) overwrote the first (→0.92) and
    // the press-down was never seen (Yoav 2026-06-11 QA).
    scale.value = withSequence(
      withSpring(0.92, { damping: 14, stiffness: 260 }),
      withSpring(1, { damping: 12, stiffness: 220 }),
    );
    // Entry signal for the topic-funnel. Pair with `topic_completed` to
    // compute tap→complete rate per chip kind, surface drop-off, and
    // cohort-split engagement between chip path and continuous run.
    try {
      track({
        name: 'topic_chip_tapped',
        props: {
          module_id: topic.moduleId,
          topic_id: topic.id,
          topic_kind: topic.kind,
          chapter_id: chapterIdFromModuleId(topic.moduleId),
          recommended,
        },
      });
    } catch { /* non-fatal */ }
    onPress(topic);
  };

  // R8 follow-up — recommended chip is filled gold (NOT a gray chip
  // wearing a gold halo). Completed always wins so a completed-but-
  // recommended edge case still reads as "done".
  const isRecommended = recommended && !completed;

  // Audit follow-up (דואו 2026-06-11): the gold chip was static — no
  // breathing pulse. Brawl Stars / Duolingo "do this next" cues always
  // animate. Loop 1 → 1.05 → 1 every ~1.4s while the chip is the
  // recommended next step; cancel on completion / reduced motion.
  useEffect(() => {
    if (!isRecommended || reduceMotion) {
      cancelAnimation(pulseScale);
      pulseScale.value = withTiming(1, { duration: 180 });
      return;
    }
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 700 }),
        withTiming(1, { duration: 700 }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(pulseScale);
  }, [isRecommended, reduceMotion, pulseScale]);
  const bg = completed
    ? DONE_BG
    : isRecommended
      ? RECOMMENDED_BG
      : MUTED_BG;
  const depth = completed
    ? DONE_DEPTH
    : isRecommended
      ? RECOMMENDED_DEPTH
      : MUTED_DEPTH;
  const border = completed
    ? DONE_BORDER
    : isRecommended
      ? RECOMMENDED_BORDER
      : '#f3f4f6';
  // Icon stays full opacity for both completed AND recommended chips
  // (the "do this next" affordance reads as bright, not muted).
  const iconOpacity = completed || isRecommended ? 1 : MUTED_ICON_OPACITY;

  return (
    <Animated.View style={[animStyle, styles.nodeCol]}>
      {/* R8 follow-up: the gold "next" cue lives in the chip's OWN
          fill now (RECOMMENDED_BG / BORDER / DEPTH above) — no more
          separate gold halo ring around a gray chip. */}

      {/* 3D bottom depth — identical block to ModuleNode.nodeDepth */}
      <View
        style={[
          styles.nodeDepth,
          { backgroundColor: depth },
        ]}
      />
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={completed ? `${topic.titleHe} — הושלם` : topic.titleHe}
        accessibilityState={{ selected: completed }}
        hitSlop={8}
        style={[
          styles.nodeCircle,
          {
            backgroundColor: bg,
            borderColor: border,
            shadowColor: completed
              ? DONE_DEPTH
              : isRecommended
                ? RECOMMENDED_DEPTH
                : '#9ca3af',
          },
        ]}
      >
        <View
          style={{ opacity: iconOpacity }}
          pointerEvents="none"
        >
          <SvgXml
            xml={topic.iconAsset.svgXml}
            width={ICON_SIZE}
            height={ICON_SIZE}
          />
        </View>
        {/* R8 J1 — green flash overlay; pulses on tap AND on first
            transition to completed. Sits inside the clipped circle so
            it inherits the round mask. */}
        <Animated.View
          pointerEvents="none"
          style={[styles.flashOverlay, flashStyle]}
        />
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  // The pressable circle + the depth block share this anchor, sized to
  // the NODE_SIZE square.
  nodeCol: {
    width: NODE_SIZE,
    height: NODE_SIZE + 5,
    alignItems: 'center',
  },
  // Sits 5px below the circle to create the 3D recess — exact mirror of
  // DuoLearnScreen.styles.nodeDepth.
  nodeDepth: {
    width: NODE_SIZE,
    height: NODE_SIZE + 5,
    borderRadius: NODE_SIZE / 2,
    position: 'absolute',
    top: 5,
  },
  // Same border + shadow profile as DuoLearnScreen.styles.nodeCircle.
  nodeCircle: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  // R8 J1 — bright green flash overlay, inside the circle clip mask.
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#86efac',
    borderRadius: NODE_SIZE / 2,
  },
});
