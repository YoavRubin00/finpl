import { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { Image as ExpoImage } from "expo-image";
import Animated, {
  FadeIn,
  FadeOut,
  FadeInDown,
  FadeInUp,
  FadeOutDown,
  FadeOutUp,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { FINN_DANCING, FINN_EMPATHIC } from "../retention-loops/finnMascotConfig";
import { tapHaptic, mediumHaptic, successHaptic } from "../../utils/haptics";
import type { SharkDilemma, DilemmaOption, DilemmaResult } from "./types";

interface Props {
  dilemma: SharkDilemma;
  /** Fired once when the user finishes the dilemma (after Stage 4). */
  onComplete: (result: DilemmaResult) => void;
}

type Stage = "video-playing" | "paused-for-choice" | "video-finishing" | "feedback";

/**
 * Pause-in-place video dilemma. Plays a 5s Captain Shark scene; auto-pauses
 * at `videoPauseAtSec` (default 2.5s); overlays the dilemma options on top of
 * the frozen frame; after the user picks, the video resumes to its freeze-frame
 * ending and a feedback layer animates in (dancing/empathic Finn + bubble + CTA).
 *
 * Routed by LessonFlowScreen when a SharkDilemma carries a `videoUri`.
 * Falls back to nothing (returns null) if required fields are missing —
 * caller should fall back to <SharkDilemmaCard> in that case.
 */
export function VideoSharkDilemmaCard({ dilemma, onComplete }: Props) {
  const insets = useSafeAreaInsets();
  const videoUri = dilemma.videoUri ?? "";
  const scenario = dilemma.scenario;
  const options = dilemma.options;
  const pauseAtSec = dilemma.videoPauseAtSec ?? 2.5;

  const [stage, setStage] = useState<Stage>("video-playing");
  const [chosen, setChosen] = useState<DilemmaOption | null>(null);
  const hasPausedRef = useRef(false);
  const hasFinishedRef = useRef(false);

  const player = useVideoPlayer(videoUri, (p) => {
    p.loop = false;
    // muted = true is REQUIRED for autoplay to work in browsers (Chrome/Safari
    // block autoplay of audible video). Our dilemma videos are silent anyway,
    // so muting is lossless here.
    p.muted = true;
    p.bufferOptions = {
      preferredForwardBufferDuration: 10,
      waitsToMinimizeStalling: false,
      minBufferForPlayback: 0.5,
    };
    p.play();
  });

  // Poll currentTime to trigger pause-at-midpoint reliably across platforms.
  // (expo-video's timeUpdate event isn't fired with high precision; a 100ms
  // poll on a 5s clip is cheap and gives us a smooth user-facing pause point.)
  // We also keep a wall-clock fallback so that a video stuck on its poster
  // frame (slow CDN, browser autoplay quirk) still progresses to the dilemma.
  useEffect(() => {
    if (stage !== "video-playing") return;
    const showOverlay = () => {
      if (hasPausedRef.current) return;
      hasPausedRef.current = true;
      try { player.pause(); } catch { /* ignore */ }
      mediumHaptic();
      setStage("paused-for-choice");
    };
    const id = setInterval(() => {
      try {
        if (player.currentTime >= pauseAtSec) showOverlay();
      } catch {
        /* ignore — player may not be ready yet */
      }
    }, 100);
    // Wall-clock fallback: 4.5s after mount, force the overlay regardless of
    // playhead state. Slightly later than the natural pauseAtSec (2.5s) so it
    // doesn't fire in the happy path.
    const fallback = setTimeout(showOverlay, 4500);
    return () => {
      clearInterval(id);
      clearTimeout(fallback);
    };
  }, [player, stage, pauseAtSec]);

  // After the user picks and the video resumes, detect natural end → feedback.
  useEffect(() => {
    if (stage !== "video-finishing") return;
    const sub = player.addListener("playingChange", (e: { isPlaying: boolean }) => {
      try {
        if (
          !hasFinishedRef.current &&
          !e.isPlaying &&
          player.duration > 0 &&
          player.currentTime >= player.duration - 0.4
        ) {
          hasFinishedRef.current = true;
          setStage("feedback");
        }
      } catch {
        /* ignore */
      }
    });
    // Safety fallback — if for some reason 'playingChange' doesn't fire,
    // poll the time and transition once we're past the end.
    const id = setInterval(() => {
      try {
        if (
          !hasFinishedRef.current &&
          player.duration > 0 &&
          player.currentTime >= player.duration - 0.1
        ) {
          hasFinishedRef.current = true;
          setStage("feedback");
        }
      } catch {
        /* ignore */
      }
    }, 200);
    // Wall-clock fallback — if the video failed to load at all (404 on CDN,
    // slow network, codec error) then `player.duration` stays 0 and the
    // condition above never fires. Without this, the user would stare at a
    // black screen forever with no way out (reported on mod-1-1 dilemma,
    // 2026-06-01). 3s is generous for the post-choice freeze-frame, while
    // still short enough to bail out gracefully on a missing asset.
    const fallback = setTimeout(() => {
      if (!hasFinishedRef.current) {
        hasFinishedRef.current = true;
        setStage("feedback");
      }
    }, 3000);
    return () => {
      sub.remove();
      clearInterval(id);
      clearTimeout(fallback);
    };
  }, [player, stage]);

  const handleChoice = useCallback(
    (option: DilemmaOption) => {
      if (chosen) return;
      tapHaptic();
      setChosen(option);
      if (option.isWise) successHaptic();
      setStage("video-finishing");
      try {
        player.play();
      } catch {
        /* ignore */
      }
    },
    [chosen, player],
  );

  const handleContinue = useCallback(() => {
    if (!chosen) return;
    tapHaptic();
    onComplete({
      path: [{ slideId: "main", choiceId: chosen.id, isWise: chosen.isWise }],
      totalScore: chosen.isWise ? 1 : -1,
      wiseCount: chosen.isWise ? 1 : 0,
      unwiseCount: chosen.isWise ? 0 : 1,
    });
  }, [chosen, onComplete]);

  // Guard — if data is malformed, render nothing so the caller can fall back.
  if (!videoUri || !scenario || !options) {
    if (__DEV__) {
      console.warn(
        `[VideoSharkDilemma] dilemma ${dilemma.moduleId} missing videoUri/scenario/options — skipping.`,
      );
    }
    return null;
  }

  const [optionA, optionB] = options;

  return (
    <View style={styles.root}>
      {/* Video layer — always mounted; covered by feedback layer once done */}
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />

      {/* Dilemma overlay — appears only while video is paused for choice */}
      {stage === "paused-for-choice" && (
        <DilemmaOverlay
          scenario={scenario}
          optionA={optionA}
          optionB={optionB}
          chosen={null}
          onChoose={handleChoice}
          topInset={insets.top}
          bottomInset={insets.bottom}
        />
      )}

      {/* Feedback layer — covers the video on the final freeze-frame */}
      {stage === "feedback" && chosen && (
        <FeedbackLayer
          chosen={chosen}
          onContinue={handleContinue}
          topInset={insets.top}
          bottomInset={insets.bottom}
        />
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Dilemma overlay (Stage 2)                                          */
/* ------------------------------------------------------------------ */

interface DilemmaOverlayProps {
  scenario: string;
  optionA: DilemmaOption;
  optionB: DilemmaOption;
  chosen: DilemmaOption | null;
  onChoose: (option: DilemmaOption) => void;
  topInset: number;
  bottomInset: number;
}

function DilemmaOverlay({
  scenario,
  optionA,
  optionB,
  onChoose,
  topInset,
  bottomInset,
}: DilemmaOverlayProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(240)}
      exiting={FadeOut.duration(220)}
      style={StyleSheet.absoluteFill}
      pointerEvents="box-none"
    >
      {/* Subtle dark gradient so the question + buttons read clearly without
          hiding the paused shark behind them. */}
      <LinearGradient
        pointerEvents="none"
        colors={[
          "rgba(7,14,24,0.55)",
          "rgba(7,14,24,0.10)",
          "rgba(7,14,24,0.65)",
        ]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Scenario sticker, top */}
      <Animated.View
        entering={FadeInDown.duration(320).delay(60)}
        exiting={FadeOutUp.duration(180)}
        style={[styles.scenarioWrap, { marginTop: topInset + 16 }]}
        pointerEvents="none"
      >
        <View style={styles.scenarioBubble} accessible accessibilityLabel={scenario}>
          <Text style={styles.scenarioText}>{scenario}</Text>
        </View>
      </Animated.View>

      {/* Options, bottom */}
      <View style={[styles.optionsAnchor, { paddingBottom: bottomInset + 24 }]}>
        <Animated.View
          entering={FadeInUp.duration(280).delay(140)}
          exiting={FadeOutDown.duration(180)}
          style={styles.optionsPrompt}
          pointerEvents="none"
        >
          <Text style={styles.optionsPromptText}>⏳ מה הייתי עושה?</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.duration(320).delay(220)}
          exiting={FadeOutDown.duration(180)}
          style={styles.optionsStack}
        >
          <OptionButton chip="א" option={optionA} onPress={onChoose} />
          <OptionButton chip="ב" option={optionB} onPress={onChoose} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

interface OptionButtonProps {
  chip: "א" | "ב";
  option: DilemmaOption;
  onPress: (option: DilemmaOption) => void;
}

function OptionButton({ chip, option, onPress }: OptionButtonProps) {
  return (
    <Pressable
      onPress={() => onPress(option)}
      accessibilityRole="button"
      accessibilityLabel={`אופציה ${chip}: ${option.label}`}
    >
      {({ pressed }) => (
        <View style={[styles.optionShell, pressed && styles.optionShellPressed]}>
          <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.optionInner}>
            <View style={styles.optionChip}>
              <Text style={styles.optionChipText}>{chip}</Text>
            </View>
            <Text style={styles.optionLabel} numberOfLines={3}>
              {option.label}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Feedback layer (Stage 4)                                           */
/* ------------------------------------------------------------------ */

interface FeedbackLayerProps {
  chosen: DilemmaOption;
  onContinue: () => void;
  topInset: number;
  bottomInset: number;
}

function FeedbackLayer({ chosen, onContinue, topInset, bottomInset }: FeedbackLayerProps) {
  const wise = chosen.isWise;
  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      style={[StyleSheet.absoluteFill, styles.feedbackRoot]}
    >
      {/* Soft light-mode background gradient. Wise → blue sky tones,
          not-wise → warm amber tones. Keeps the feedback bubble and Finn
          visually prominent without darkening the screen. */}
      <LinearGradient
        colors={wise ? ["#f0f9ff", "#dbeafe"] : ["#fffbeb", "#fef3c7"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Speech bubble, top */}
      <Animated.View
        entering={FadeInDown.duration(380).delay(160)}
        style={[styles.feedbackBubbleWrap, { marginTop: topInset + 24 }]}
        pointerEvents="none"
      >
        <View
          style={[
            styles.feedbackBubble,
            wise ? styles.feedbackBubbleWise : styles.feedbackBubbleNotWise,
          ]}
          accessible
          accessibilityLiveRegion="polite"
          accessibilityLabel={`${wise ? "בחירה חכמה" : "נקודה למחשבה"}. ${chosen.feedback}`}
        >
          <Text
            style={[
              styles.feedbackBubbleLabel,
              wise ? styles.feedbackBubbleLabelWise : styles.feedbackBubbleLabelNotWise,
            ]}
          >
            {wise ? "✓ בחירה חכמה" : "💭 נקודה למחשבה"}
          </Text>
          <Text
            style={[
              styles.feedbackBubbleText,
              wise ? styles.feedbackBubbleTextWise : styles.feedbackBubbleTextNotWise,
            ]}
          >
            {chosen.feedback}
          </Text>
        </View>
      </Animated.View>

      {/* Finn webp, center */}
      <View style={styles.feedbackFinnWrap} pointerEvents="none">
        <Animated.View entering={FadeIn.duration(440).delay(80)}>
          <ExpoImage
            source={wise ? FINN_DANCING : FINN_EMPATHIC}
            style={styles.feedbackFinn}
            contentFit="contain"
            accessible={false}
          />
        </Animated.View>
      </View>

      {/* Continue CTA, bottom */}
      <Animated.View
        entering={FadeInUp.duration(360).delay(260)}
        style={[styles.feedbackCtaWrap, { paddingBottom: bottomInset + 22 }]}
      >
        <Pressable
          onPress={onContinue}
          accessibilityRole="button"
          accessibilityLabel="המשך"
        >
          {({ pressed }) => (
            <View style={[styles.feedbackCta, pressed && styles.feedbackCtaPressed]}>
              <Text style={styles.feedbackCtaText}>המשך</Text>
            </View>
          )}
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
    overflow: "hidden",
  },

  // Scenario sticker
  scenarioWrap: {
    paddingHorizontal: 18,
    alignItems: "stretch",
  },
  scenarioBubble: {
    backgroundColor: "rgba(14,165,233,0.94)",
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.25)",
    shadowColor: "#0ea5e9",
    shadowOpacity: 0.55,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  scenarioText: {
    color: "#ffffff",
    fontSize: 17,
    lineHeight: 25,
    fontWeight: "700",
    textAlign: "right",
    writingDirection: "rtl",
  },

  // Options
  optionsAnchor: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
  },
  optionsPrompt: {
    alignItems: "center",
    marginBottom: 10,
  },
  optionsPromptText: {
    color: "#7dd3fc",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    writingDirection: "rtl",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowRadius: 6,
  },
  optionsStack: {
    gap: 12,
  },
  optionShell: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(255,255,255,0.06)",
    shadowColor: "#0ea5e9",
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  optionShellPressed: {
    opacity: 0.85,
    transform: [{ translateY: 1 }],
  },
  optionInner: {
    minHeight: 84,
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  optionChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0ea5e9",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0ea5e9",
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  optionChipText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },
  optionLabel: {
    flex: 1,
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "right",
    writingDirection: "rtl",
    textShadowColor: "rgba(0,0,0,0.55)",
    textShadowRadius: 4,
  },

  // Feedback layer
  feedbackRoot: {
    overflow: "hidden",
  },
  feedbackBubbleWrap: {
    paddingHorizontal: 18,
  },
  feedbackBubble: {
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  feedbackBubbleWise: {
    backgroundColor: "rgba(34,197,94,0.96)",
    borderColor: "rgba(255,255,255,0.35)",
    shadowColor: "#22c55e",
  },
  feedbackBubbleNotWise: {
    backgroundColor: "rgba(250,204,21,0.96)",
    borderColor: "rgba(0,0,0,0.10)",
    shadowColor: "#facc15",
  },
  feedbackBubbleLabel: {
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 6,
    textAlign: "right",
    writingDirection: "rtl",
  },
  feedbackBubbleLabelWise: { color: "#052e16" },
  feedbackBubbleLabelNotWise: { color: "#422006" },
  feedbackBubbleText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
    textAlign: "right",
    writingDirection: "rtl",
  },
  feedbackBubbleTextWise: { color: "#062b15" },
  feedbackBubbleTextNotWise: { color: "#1f1300" },

  feedbackFinnWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  feedbackFinn: {
    width: 220,
    height: 220,
  },

  feedbackCtaWrap: {
    paddingHorizontal: 18,
  },
  feedbackCta: {
    backgroundColor: "#0ea5e9",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#0284c7",
    borderBottomWidth: 5,
    borderBottomColor: "#0369a1",
    shadowColor: "#0ea5e9",
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  feedbackCtaPressed: {
    opacity: 0.95,
    transform: [{ translateY: 2 }],
    borderBottomWidth: 3,
  },
  feedbackCtaText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "900",
    writingDirection: "rtl",
  },
});
