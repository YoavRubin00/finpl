import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  useReducedMotion,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { ChevronDown, MessageCircle } from "lucide-react-native";
import type { FlashcardSegment } from "../chapter-1-content/types";
import { GlossaryTooltip } from "../../components/ui/GlossaryTooltip";
import { tapHaptic, selectionHaptic } from "../../utils/haptics";
import { RichText } from "./RichText";
import { VisualHost } from "./visuals/VisualHost";
import { LL_COLORS, RTL_STYLE, SEGMENT_SPRING } from "./tokens";

interface LivingFlashcardProps {
  segments: FlashcardSegment[];
  /** Fires once, exactly when the last segment becomes visible. */
  onAllRevealed?: () => void;
  cardId: string;
  /**
   * External reveal signal: each increment reveals the next segment, exactly
   * like a tap on the card. Lets the lesson's bottom "המשך" button drive the
   * same progression so every tap target the user is used to advances.
   */
  revealTrigger?: number;
}

/**
 * The "living lesson" flashcard (Yoav 1.8) — replaces the PNG-infographic
 * fly-through. Text reveals progressively (tap anywhere = next segment),
 * **bold** words pop in gold, [[term]] opens the same glossary tooltip the
 * rest of the app already uses, and each segment may carry one motion
 * visual instead of a static image.
 */
export function LivingFlashcard({ segments, onAllRevealed, cardId, revealTrigger }: LivingFlashcardProps) {
  const reducedMotion = useReducedMotion();
  const animate = !reducedMotion;

  const [revealedCount, setRevealedCount] = useState(() => (segments.length > 0 ? 1 : 0));
  const [activeTerm, setActiveTerm] = useState<string | null>(null);
  const allRevealedFiredRef = useRef(false);
  const prevCardIdRef = useRef(cardId);

  // Defensive reset if the SAME component instance is ever reused for a
  // different card (e.g. a parent that doesn't key on cardId) — normal
  // navigation between cards remounts this component and needs nothing.
  useEffect(() => {
    if (prevCardIdRef.current !== cardId) {
      prevCardIdRef.current = cardId;
      setRevealedCount(segments.length > 0 ? 1 : 0);
      allRevealedFiredRef.current = false;
    }
  }, [cardId, segments.length]);

  useEffect(() => {
    if (segments.length > 0 && revealedCount >= segments.length && !allRevealedFiredRef.current) {
      allRevealedFiredRef.current = true;
      onAllRevealed?.();
    }
  }, [revealedCount, segments.length, onAllRevealed]);

  const hasMore = revealedCount < segments.length;

  const handleTap = useCallback(() => {
    if (!hasMore) return;
    tapHaptic();
    setRevealedCount((c) => Math.min(segments.length, c + 1));
  }, [hasMore, segments.length]);

  const handleTermPress = useCallback((term: string) => {
    selectionHaptic();
    setActiveTerm(term);
  }, []);

  // External reveal signal (the lesson's bottom "המשך" button). Skip the
  // initial value so mounting with revealTrigger=0 doesn't consume a step.
  const prevTriggerRef = useRef(revealTrigger ?? 0);
  useEffect(() => {
    const t = revealTrigger ?? 0;
    if (t === prevTriggerRef.current) return;
    prevTriggerRef.current = t;
    if (revealedCount < segments.length) {
      tapHaptic();
      setRevealedCount((c) => Math.min(segments.length, c + 1));
    }
    // revealedCount intentionally read, not depended on — the effect must run
    // once per trigger change only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealTrigger, segments.length]);

  // Auto-scroll on reveal: a newly revealed segment (and its visual, which
  // mounts a beat later) can land BELOW the fold on small screens — invisible
  // content the user doesn't know exists. Scroll only right after a reveal
  // (pendingScrollRef), via onContentSizeChange so the visual's late mount is
  // included; never fight the user's own upward scrolling outside that window.
  const scrollRef = useRef<ScrollView>(null);
  const pendingScrollRef = useRef(false);
  const prevRevealedRef = useRef(revealedCount);
  useEffect(() => {
    if (revealedCount > prevRevealedRef.current) pendingScrollRef.current = true;
    prevRevealedRef.current = revealedCount;
  }, [revealedCount]);
  const handleContentSizeChange = useCallback(() => {
    if (!pendingScrollRef.current) return;
    scrollRef.current?.scrollToEnd({ animated: animate });
    // Consumed on a short delay — the segment's text and its visual resize
    // the content in separate frames and both should land in view.
    setTimeout(() => { pendingScrollRef.current = false; }, 600);
  }, [animate]);

  return (
    <View style={styles.root}>
      {/* Segment progress dots — where am I inside this card (RTL: first dot
          on the right). Hidden for single-segment cards, it'd be noise. */}
      {segments.length > 1 ? (
        <View style={styles.dotsRow} accessibilityLabel={`חלק ${revealedCount} מתוך ${segments.length}`}>
          {segments.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i < revealedCount ? styles.dotActive : null]}
            />
          ))}
        </View>
      ) : null}

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={handleContentSizeChange}
      >
        <Pressable
          onPress={handleTap}
          disabled={!hasMore}
          accessibilityRole="button"
          accessibilityLabel={hasMore ? "הקש כדי להמשיך" : undefined}
          style={styles.tapArea}
        >
          {segments.slice(0, revealedCount).map((segment, i) => (
            <SegmentBlock key={i} segment={segment} animate={animate} onTermPress={handleTermPress} />
          ))}
        </Pressable>
      </ScrollView>

      {hasMore ? <MoreIndicator animate={animate} /> : null}

      <GlossaryTooltip term={activeTerm} onClose={() => setActiveTerm(null)} />
    </View>
  );
}

function SegmentBlock({
  segment,
  animate,
  onTermPress,
}: {
  segment: FlashcardSegment;
  animate: boolean;
  onTermPress: (term: string) => void;
}) {
  // Mounts exactly once per reveal (parent keeps earlier segments mounted
  // via stable array-index keys), so this entrance plays exactly once —
  // combined scale + fade + translate, "עומק" per Yoav 1.8, not a flat fade.
  const progress = useSharedValue(animate ? 0 : 1);

  useEffect(() => {
    if (!animate) return;
    progress.value = withSpring(1, SEGMENT_SPRING);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: (1 - progress.value) * 22 },
      { scale: 0.94 + 0.06 * progress.value },
    ],
  }));

  return (
    <Animated.View style={[styles.segment, style]}>
      <RichText text={segment.text} onTermPress={onTermPress} animate={animate} baseDelayMs={110} />

      {segment.visual ? <VisualHost visual={segment.visual} animate={animate} /> : null}

      {segment.finnLine ? (
        <Animated.View
          entering={animate ? FadeInUp.delay(320).duration(280).springify().damping(16) : undefined}
          style={styles.finnLine}
        >
          <MessageCircle size={16} color={LL_COLORS.brandCyanBright} style={styles.finnIcon} />
          <Text style={styles.finnLineText}>{segment.finnLine}</Text>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

function MoreIndicator({ animate }: { animate: boolean }) {
  const bounce = useSharedValue(0);

  useEffect(() => {
    if (!animate) return;
    bounce.value = withDelay(
      500,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 560, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 560, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate]);

  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bounce.value * 5 }],
  }));

  return (
    <Animated.View entering={animate ? FadeIn.duration(220) : undefined} style={styles.moreWrap} pointerEvents="none">
      <Animated.View style={[styles.morePill, bounceStyle]}>
        <Text style={styles.moreText}>עוד</Text>
        <ChevronDown size={14} color={LL_COLORS.textSecondary} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: LL_COLORS.bgDeep,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 60,
  },
  tapArea: {
    gap: 24,
  },
  segment: {
    gap: 14,
  },
  finnLine: {
    ...RTL_STYLE,
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: LL_COLORS.bgCard,
    borderWidth: 1,
    borderColor: LL_COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  finnIcon: {
    marginTop: 2,
  },
  finnLineText: {
    ...RTL_STYLE,
    flex: 1,
    color: LL_COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600",
  },
  moreWrap: {
    position: "absolute",
    bottom: 14,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  morePill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    backgroundColor: LL_COLORS.bgCard,
    borderWidth: 1,
    borderColor: LL_COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  moreText: {
    ...RTL_STYLE,
    color: LL_COLORS.textSecondary,
    fontSize: 12.5,
    fontWeight: "700",
  },
  // Segment progress dots — RTL: row-reverse puts dot #1 on the right.
  dotsRow: {
    flexDirection: "row-reverse",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(12,74,110,0.18)",
  },
  dotActive: {
    backgroundColor: LL_COLORS.brandCyan,
    width: 16,
    borderRadius: 3,
  },
});
