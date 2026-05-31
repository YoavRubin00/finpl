import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Image as ExpoImage } from "expo-image";
import { LottieIcon } from "../../components/ui/LottieIcon";
import { FINN_STANDARD, FINN_TALKING } from "../retention-loops/finnMascotConfig";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet, Image, Modal,
  AccessibilityInfo,
  type NativeSyntheticEvent,
  type TextInputContentSizeChangeEventData,
  type StyleProp,
  type TextStyle,
  type LayoutChangeEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Send, Check, CheckCheck } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withDelay,
  withSequence,
  withTiming,
  FadeIn,
  FadeOut,
  SlideInUp,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthStore } from "../auth/useAuthStore";
import { useChapterUIStore } from "../chapter-1-content/useChapterUIStore";
import { useProgress } from "../chapter-1-content/useProgress";
import { useAdaptiveStore } from "../social/useAdaptiveStore";
import { useIsPro, subscriptionQueryKey } from "../subscription/useSubscription";
import { useUsageStore } from "../subscription/useUsageStore";
import { queryClient } from "../../lib/queryClient";
import type { SubscriptionState } from "../../lib/api/subscription";
import { useRouter } from "expo-router";
import { getConceptLabel } from "../social/LifelineModal";
import { AnimatedPressable } from "../../components/ui/AnimatedPressable";
import { COMPANION_PERSONALITIES, getContextualSuggestions, getContextAwareGreeting } from "./chatData";
import { buildSystemPrompt, type LessonContext } from "./buildChatPrompt";
import type { CompanionAnimationState, ChatMessage, MessageStatus, ChatSuggestion } from "./chatTypes";
import type { CompanionId } from "../auth/types";
import { ProBadge } from "../../components/ui/ProBadge";
import { useTutorialStore } from "../../stores/useTutorialStore";
import { streamChatRequest } from "../../utils/streamChat";
import { generateFollowups } from "./generateFollowups";
import { MarkdownText } from "./MarkdownText";

/* ------------------------------------------------------------------ */
/*  Money-themed decoration Lotties (subtle, not green)                */
/* ------------------------------------------------------------------ */

const TRENDING_QUESTIONS = [
  "מה זה קריפטו?",
  "איך לחסוך לפנסיה?",
  "מה זה תיק השקעות?",
  "איך עובד ריבית דריבית?",
  "מה זה מניה?",
];

// Auto-growing chat input: starts at one line, stretches up to five lines as the
// user types, then scrolls internally. Heights include the input's vertical
// padding (contentSize.height reports padding-inclusive height).
const INPUT_LINE_HEIGHT = 20;
const INPUT_VPAD = 10; // paddingVertical on inputStyles.textInput
const INPUT_MIN_HEIGHT = INPUT_LINE_HEIGHT + INPUT_VPAD * 2; // 1 line
const INPUT_MAX_HEIGHT = INPUT_LINE_HEIGHT * 5 + INPUT_VPAD * 2; // 5 lines

// react-native-web renders the multiline input as a <textarea>, which shows a
// browser focus outline with squared corners that clashes with our rounded
// wrapper border. Strip it on web (these keys aren't in RN's TextStyle).
const WEB_INPUT_RESET = (Platform.OS === "web"
  ? { outlineStyle: "none", outlineWidth: 0 }
  : null) as unknown as StyleProp<TextStyle>;


/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

// Some Gemini outputs leak a debug-marker preamble like "OK TRUE REPLY" before
// the actual response. Strip any combination/case/separator at the start.
// The lone-marker regex is uppercase-only on purpose: case-insensitive matched
// the lowercase JSON key `reply` and broke envelopes like `{"reply":"..."}`
// mid-stream, leaving `:"..."}` visible to the user.
function stripDebugPreamble(text: string): string {
  return text
    .replace(/^[\s\W]*OK[\s\W]*TRUE[\s\W]*REPLY[\s\W]*/i, "")
    .replace(/^[\s\W]*(OK|TRUE|REPLY)[\s\W]+/, "")
    .replace(/^[\s\u200F]+/, "");
}

// Gemini occasionally wraps the reply in a JSON envelope (e.g.
// `{"reply":"...\n..."}`) despite the prompt forbidding it. Detect that
// shape, extract the string, and unescape JSON string escapes so newlines
// render correctly instead of showing literal `\n`.
const PREFERRED_REPLY_KEYS = ["reply", "response", "text", "answer", "content", "message"] as const;

function unescapeJsonString(s: string): string {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

function unwrapJsonEnvelope(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return text;
  const looksLikeJson =
    trimmed.startsWith("{") || trimmed.startsWith("[") || trimmed.startsWith('"');
  if (looksLikeJson) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (typeof parsed === "string") return parsed;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const obj = parsed as Record<string, unknown>;
        for (const key of PREFERRED_REPLY_KEYS) {
          const v = obj[key];
          if (typeof v === "string") return v;
        }
        for (const v of Object.values(obj)) {
          if (typeof v === "string") return v;
        }
      }
    } catch {
      // Malformed JSON — fall through to regex repair below.
    }
  }
  // Regex repair: handles the case where stripDebugPreamble ate the leading
  // `{"reply"` and left `:"..."}`. ASCII-keyed only so Hebrew text starting
  // with punctuation is not over-matched.
  const leading =
    trimmed.match(/^\s*\{?\s*"?[A-Za-z_][\w-]*"?\s*:\s*"/) ??
    trimmed.match(/^\s*:\s*"/);
  const trailing = trimmed.match(/"\s*\}\s*$/);
  if (!leading && !trailing) return text;
  let cleaned = trimmed;
  if (leading) cleaned = cleaned.slice(leading[0].length);
  if (trailing) cleaned = cleaned.slice(0, cleaned.length - trailing[0].length);
  return unescapeJsonString(cleaned);
}

/* ------------------------------------------------------------------ */
/*  Streaming bot text — Gemini-style reveal                           */
/* ------------------------------------------------------------------ */

// Renders the full reply text laid out once (so it never reflows/jumps while
// streaming) and reveals it top-to-bottom with an opaque overlay that slides
// down. The overlay has a soft gradient top edge — the "fade frontier" — so
// each line resolves in smoothly. The motion is a pure transform (no bubble
// height animation), so it stays sub-pixel smooth however the text arrives.
const REVEAL_PX_PER_MS = 0.55; // reveal speed; higher = faster wipe
const FRONTIER_HEIGHT = 26;    // soft fade band height at the reveal edge

function StreamingBotText({
  content,
  textStyle,
  networkDone,
  onRevealEnd,
}: {
  content: string;
  textStyle: StyleProp<TextStyle>;
  networkDone: boolean;
  onRevealEnd: () => void;
}) {
  const reveal = useSharedValue(0);
  const [height, setHeight] = useState(0);

  const finish = useCallback(() => onRevealEnd(), [onRevealEnd]);

  useEffect(() => {
    // Not laid out yet. If there is real text, wait for onLayout to report the
    // height (the next effect run starts the reveal) so a fast (already-done)
    // stream still animates. If there's nothing to show, hand off immediately
    // to avoid a stuck, hidden bubble.
    if (height <= 0) {
      if (networkDone && content.trim().length === 0) finish();
      return;
    }
    const remaining = Math.max(0, height - reveal.value);
    const duration = Math.max(160, Math.min(1400, remaining / REVEAL_PX_PER_MS));
    reveal.value = withTiming(
      height,
      { duration, easing: Easing.linear },
      (done) => {
        // Hand off to plain text only once the wipe reached the bottom AND the
        // stream is fully done (more text may still be arriving otherwise).
        if (done && networkDone) runOnJS(finish)();
      },
    );
  }, [height, content, networkDone, reveal, finish]);

  const coverStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: reveal.value }],
  }));

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setHeight(e.nativeEvent.layout.height);
  }, []);

  return (
    <View style={{ position: "relative" }}>
      {/* Full reply laid out once as markdown so it never reflows while the
          cover slides down to reveal it. */}
      <MarkdownText content={content} baseStyle={textStyle} onLayout={onLayout} />
      {/* Opaque white cover that starts over the whole text and slides down to
          reveal it. absoluteFill auto-sizes to the text, so there's no flash
          before the height is measured. */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { left: -2, right: -2 }, coverStyle]}
      >
        <LinearGradient
          colors={["rgba(255,255,255,0)", "#ffffff"]}
          style={{ height: FRONTIER_HEIGHT }}
        />
        <View style={{ flex: 1, backgroundColor: "#ffffff" }} />
      </Animated.View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Read Receipt Icon                                                  */
/* ------------------------------------------------------------------ */

function ReadReceipt({ status }: { status: MessageStatus }) {
  if (status === "sent") {
    return <Check size={14} color="#71717a" />;
  }
  if (status === "delivered") {
    return <CheckCheck size={14} color="#71717a" />;
  }
  // read
  return <CheckCheck size={14} color="#0ea5e9" />;
}

/* ------------------------------------------------------------------ */
/*  Typing indicator, three bouncing dots inside a bubble             */
/* ------------------------------------------------------------------ */

function TypingIndicator({ emoji }: { emoji: string }) {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    const bounce = withRepeat(
      withSequence(
        withSpring(1, { damping: 4, stiffness: 300 }),
        withSpring(0, { damping: 4, stiffness: 300 }),
      ),
      -1,
    );
    dot1.value = bounce;
    dot2.value = withDelay(150, bounce);
    dot3.value = withDelay(300, bounce);
  }, [dot1, dot2, dot3]);

  const style1 = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + dot1.value * 0.4 }],
  }));
  const style2 = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + dot2.value * 0.4 }],
  }));
  const style3 = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + dot3.value * 0.4 }],
  }));

  return (
    <Animated.View entering={FadeIn.duration(200)} style={[msgStyles.messageRow, msgStyles.messageRowBot]}>
      <View style={msgStyles.avatarCircle}>
        <ExpoImage source={FINN_TALKING} style={{ width: 28, height: 28 }} contentFit="contain" />
      </View>
      <View style={[msgStyles.bubble, msgStyles.botBubble]}>
        <View style={typingStyles.container}>
          <Animated.View style={[typingStyles.dot, style1]} />
          <Animated.View style={[typingStyles.dot, style2]} />
          <Animated.View style={[typingStyles.dot, style3]} />
        </View>
      </View>
    </Animated.View>
  );
}

const typingStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#a78bfa",
  },
});

/* ------------------------------------------------------------------ */
/*  Chat Style Picker, shown on first chat entry                      */
/* ------------------------------------------------------------------ */

// Picker trimmed 2026-05-31 from 4 always-on personas to 3 + an
// expandable "more" group. The 3 primary options are the everyday
// choices; "סומכים עליכם" is a no-commitment default that maps to the
// warren-buffett persona. The 2 secondary personas (rachel/robot) sit
// behind a "לעוד סגנונות שיחה" toggle so users who want them can still
// reach them, without cluttering the first impression.
const CHAT_STYLES: { id: CompanionId; title: string; desc: string }[] = [
  { id: "warren-buffett", title: "חכם", desc: "מסביר עם אנלוגיות, כמו חבר שיודע הכל על כסף" },
  { id: "moshe-peled", title: "ישיר ותכל׳סי", desc: "ישראלי, לא מסתובב, אומר את זה כמו שזה" },
  { id: "warren-buffett", title: "סומכים עליכם", desc: "צאט ברירת מחדל" },
];

const MORE_CHAT_STYLES: { id: CompanionId; title: string; desc: string }[] = [
  { id: "rachel", title: "חם ומעודד", desc: "רגוע, סבלני, תמיד מוצא מילה טובה ומסביר בנועם" },
  { id: "robot", title: "אנליטי ומדויק", desc: "מבוסס מספרים, תמציתי, עונה בנקודות קצרות" },
];

function ChatStylePicker({ onSelect }: { onSelect: (id: CompanionId) => void }) {
  const [showMore, setShowMore] = useState(false);
  return (
    <Animated.View entering={FadeIn.duration(200)} style={pickerStyles.overlay} pointerEvents="auto">
      <Animated.View entering={FadeIn.duration(400).delay(100)} style={pickerStyles.card}>
        <Text style={pickerStyles.title}>איך תרצו שאדבר איתכם?</Text>
        <Text style={pickerStyles.subtitle}>בחרו את הסגנון שהכי מתאים לכם</Text>
        <View style={pickerStyles.options}>
          {CHAT_STYLES.map((s) => (
            // Key by title — two entries (חכם / סומכים עליכם) intentionally
            // share s.id="warren-buffett", so id alone isn't unique.
            <Pressable key={s.title} onPress={() => onSelect(s.id)} style={pickerStyles.option} accessibilityRole="button" accessibilityLabel={`סגנון שיחה: ${s.title}`}>
              <Text style={pickerStyles.optionTitle}>{s.title}</Text>
              <Text style={pickerStyles.optionDesc}>{s.desc}</Text>
            </Pressable>
          ))}
          {showMore && MORE_CHAT_STYLES.map((s) => (
            <Pressable key={s.title} onPress={() => onSelect(s.id)} style={pickerStyles.option} accessibilityRole="button" accessibilityLabel={`סגנון שיחה: ${s.title}`}>
              <Text style={pickerStyles.optionTitle}>{s.title}</Text>
              <Text style={pickerStyles.optionDesc}>{s.desc}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          onPress={() => setShowMore((v) => !v)}
          style={pickerStyles.moreToggle}
          accessibilityRole="button"
          accessibilityLabel={showMore ? "הסתר סגנונות נוספים" : "פתח סגנונות שיחה נוספים"}
        >
          <Text style={pickerStyles.moreToggleText}>
            {showMore ? "פחות סגנונות" : "לעוד סגנונות שיחה"}
          </Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const pickerStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    zIndex: 9999,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0f172a",
    textAlign: "center",
    writingDirection: "rtl",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    writingDirection: "rtl",
    marginBottom: 8,
  },
  options: { gap: 10 },
  option: {
    backgroundColor: "#f0f9ff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#bae6fd",
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0284c7",
    writingDirection: "rtl",
    textAlign: "right",
  },
  optionDesc: {
    fontSize: 13,
    color: "#475569",
    writingDirection: "rtl",
    textAlign: "right",
    marginTop: 4,
  },
  moreToggle: {
    alignSelf: "center",
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  moreToggleText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0369a1",
    writingDirection: "rtl",
    textAlign: "center",
    textDecorationLine: "underline",
  },
});

/* ------------------------------------------------------------------ */
/*  ChatScreen, WhatsApp-style                                        */
/* ------------------------------------------------------------------ */

export function ChatScreen({ lessonContext }: { lessonContext?: LessonContext } = {}) {
  const router = useRouter();
  const displayName = useAuthStore((s) => s.displayName);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const profile = useAuthStore((s) => s.profile);
  const currentChapterId = useChapterUIStore((s) => s.currentChapterId);
  const { data: progressData } = useProgress();
  const hasChosenStyle = useTutorialStore((s) => s.hasChosenChatStyle);
  const completeChatStyleChoice = useTutorialStore((s) => s.completeChatStyleChoice);
  // Suppress the chat-style picker while the app walkthrough overlay is on
  // the chat step — otherwise both modals stack and the picker steals focus
  // before the user even sees the overlay's CTA.
  const walkthroughOnChatStep = useTutorialStore((s) => s.walkthroughActiveScreen === 'chat');
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  // Controlled input height so the field grows from 1 line up to 5 lines.
  const [inputHeight, setInputHeight] = useState(INPUT_MIN_HEIGHT);
  const [loading, setLoading] = useState(false);
  const [showExtraQuestions, setShowExtraQuestions] = useState(false);
  const [_animationState, setAnimationState] = useState<CompanionAnimationState>("idle");
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  // Visible height of the scroll viewport, used to size the "answer block" so a
  // freshly-sent user message can be pinned to the top with empty space below it.
  const [viewportH, setViewportH] = useState(0);
  // Y-offset (within scroll content) of the current turn's anchor — the last
  // user message. Updated via the answer block's onLayout.
  const anchorYRef = useRef(0);
  const talkingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const draftTsRef = useRef<number>(0);
  // Timestamp of the bot reply currently revealing (laid out + animating in),
  // or null when idle. Drives the StreamingBotText reveal in renderMessage.
  const [streamingTs, setStreamingTs] = useState<number | null>(null);
  // Set once the network finishes for that reply, so the reveal knows it can
  // run to the end and hand off to plain (fully-visible) text.
  const [streamDoneTs, setStreamDoneTs] = useState<number | null>(null);

  // Reveal reached the bottom and the stream is done — drop the streaming
  // wrapper so the message renders as ordinary, fully-visible text.
  const handleRevealEnd = useCallback(() => {
    setStreamingTs(null);
    setStreamDoneTs(null);
  }, []);
  // AI-generated follow-up questions that replace the two default suggestion
  // chips after each answered turn. null = show the contextual defaults.
  const [dynamicSuggestions, setDynamicSuggestions] = useState<ChatSuggestion[] | null>(null);
  const followupAbortRef = useRef<AbortController | null>(null);

  const companionId: CompanionId = profile?.companionId ?? "warren-buffett";
  const companion = COMPANION_PERSONALITIES[companionId];

  // Check if we arrived via AI Lifeline intervention
  const lifelineConceptRef = useRef(useAdaptiveStore.getState().activeLifelineConcept);
  const [lifelineConcept] = useState(lifelineConceptRef.current);
  const [autoSendLifeline, setAutoSendLifeline] = useState(false);

  // Simple solid accent border while the input is focused.
  const [inputFocused, setInputFocused] = useState(false);
  const handleInputFocus = useCallback(() => setInputFocused(true), []);
  const handleInputBlur = useCallback(() => setInputFocused(false), []);

  // Send button pulse animation
  const sendPulse = useSharedValue(1);
  const sendPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendPulse.value }],
  }));

  useEffect(() => {
    if (input.trim()) {
      sendPulse.value = withRepeat(
        withSequence(
          withSpring(1.1, { damping: 6, stiffness: 200 }),
          withSpring(1, { damping: 6, stiffness: 200 }),
        ),
        -1,
      );
    } else {
      sendPulse.value = withSpring(1);
    }
  }, [input, sendPulse]);

  // Aggregate completed modules across ALL chapters for full context-awareness
  const allCompletedModules = useMemo(
    () => progressData?.filter((m) => m.status === 'completed').map((m) => m.moduleId) ?? [],
    [progressData],
  );
  // Current chapter's modules for backward-compatible suggestion logic
  const chNum = currentChapterId.replace('ch-', '');
  const chPrefix = `mod-${chNum}-`;
  const completedModules = useMemo(
    () => allCompletedModules.filter((id) => id.startsWith(chPrefix)),
    [allCompletedModules, chPrefix],
  );

  const suggestions = useMemo(
    () => getContextualSuggestions(allCompletedModules, currentChapterId),
    [allCompletedModules, currentChapterId],
  );

  const handleSuggestionTap = useCallback((text: string) => {
    setInput(text);
  }, []);

  // Grow the input to fit its content, clamped between one and five lines.
  // Native (iOS/Android): the field is sized straight from the reported content
  // size, which grows and shrinks correctly on its own.
  const handleInputSizeChange = useCallback(
    (e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
      const h = e.nativeEvent.contentSize.height;
      setInputHeight(Math.min(INPUT_MAX_HEIGHT, Math.max(INPUT_MIN_HEIGHT, h)));
    },
    [],
  );

  // Web: size the textarea to its content from one line up to five. We must
  // collapse the element to 0 first — scrollHeight is floored at the element's
  // own height (and 'auto' floors it at the default 2 rows), so without the
  // collapse it can never report a single line or shrink back down.
  const measureWebInputHeight = useCallback(() => {
    const node = inputRef.current as unknown as
      | { scrollHeight?: number; style?: { height: string } }
      | null;
    if (!node || typeof node.scrollHeight !== "number" || !node.style) return;
    node.style.height = "0px";
    const next = Math.min(INPUT_MAX_HEIGHT, Math.max(INPUT_MIN_HEIGHT, node.scrollHeight));
    node.style.height = `${next}px`;
    setInputHeight(next);
  }, []);

  const handleChangeText = useCallback((t: string) => {
    setInput(t);
    measureWebInputHeight();
  }, [measureWebInputHeight]);

  // Web starts a multiline textarea at its default 2-row height — size it to one
  // line on mount so it matches the native single-line start.
  useEffect(() => {
    measureWebInputHeight();
  }, [measureWebInputHeight]);

  // Mark user messages as "read" after assistant replies
  const markAllRead = useCallback(() => {
    setMessages((prev) =>
      prev.map((m) =>
        m.role === "user" && m.status !== "read" ? { ...m, status: "read" as const } : m,
      ),
    );
  }, []);

  // Pin the current turn's user message to the top of the viewport (ChatGPT-style),
  // leaving the answer block's empty space below it for the streaming reply.
  const scrollToAnchor = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: Math.max(0, anchorYRef.current - 8), animated: true });
  }, []);

  // After a successful answer, quietly fetch two fresh follow-up questions and
  // crossfade them into the two default suggestion chips. Best-effort: any
  // failure leaves the current chips untouched. A new call aborts the prior one.
  const triggerFollowups = useCallback((lastQ: string, lastA: string) => {
    followupAbortRef.current?.abort();
    const controller = new AbortController();
    followupAbortRef.current = controller;
    generateFollowups(lastQ, lastA, controller.signal)
      .then((pair) => {
        if (controller.signal.aborted || !pair) return;
        setDynamicSuggestions([
          { text: pair[0], moduleId: null },
          { text: pair[1], moduleId: null },
        ]);
      })
      .catch(() => {
        // Swallowed — chips keep whatever they're showing.
      });
  }, []);

  // Commit a finished reply: the whole response is accumulated during the stream
  // (typing dots stay up) and only added to the chat here — as one settled,
  // fully-sanitized message. Setting streamingTs + streamDoneTs together lets
  // StreamingBotText reveal it in a single smooth pass over a layout that never
  // changes (no per-chunk reflow, no mid-reveal re-sanitize → no jank).
  const commitStreamedReply = useCallback((ts: number, rawText: string) => {
    const finalText = unwrapJsonEnvelope(stripDebugPreamble(rawText));
    draftTsRef.current = ts;
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: finalText, timestamp: ts, status: "read" as const },
    ]);
    setStreamingTs(ts);
    setStreamDoneTs(ts);
    setLoading(false);
    setAnimationState("talking");
  }, []);

  // Context-aware greeting referencing user's last completed module
  const contextGreeting = useMemo(
    () => getContextAwareGreeting(companionId, allCompletedModules),
    [companionId, allCompletedModules],
  );

  // First-time greeting (or lifeline auto-trigger)
  useEffect(() => {
    if (messages.length === 0) {
      if (lifelineConcept) {
        // Lifeline mode: auto-send a user question about the struggled concept
        const conceptLabel = getConceptLabel(lifelineConcept);
        const userMsg: ChatMessage = {
          role: "user",
          content: `אני לא מצליח/ה להבין את הנושא "${conceptLabel}". אפשר הסבר פשוט?`,
          timestamp: Date.now(),
          status: "sent",
        };
        setMessages([userMsg]);
        // Clear the active lifeline so it doesn't re-trigger
        useAdaptiveStore.getState().setActiveLifelineConcept(null);
        // Auto-trigger the AI response
        setAutoSendLifeline(true);
      } else {
        setAnimationState("talking");
        setMessages([
          {
            role: "assistant",
            content: contextGreeting,
            timestamp: Date.now(),
            status: "read",
          },
        ]);
        talkingTimeoutRef.current = setTimeout(() => {
          setAnimationState("idle");
        }, 3000);
      }
    }
    return () => {
      if (talkingTimeoutRef.current) clearTimeout(talkingTimeoutRef.current);
    };
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Abort any in-flight stream on unmount
  useEffect(() => () => {
    abortControllerRef.current?.abort();
    followupAbortRef.current?.abort();
  }, []);

  // Auto-trigger AI response for lifeline intervention
  useEffect(() => {
    if (!autoSendLifeline || messages.length !== 1 || loading) return;
    setAutoSendLifeline(false);
    setLoading(true);
    setAnimationState("thinking");

    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) =>
          m.role === "user" && m.status === "sent"
            ? { ...m, status: "delivered" as const }
            : m,
        ),
      );
    }, 400);

    const conceptLabel = lifelineConcept ? getConceptLabel(lifelineConcept) : "";
    const systemPrompt =
      displayName && profile
        ? buildSystemPrompt(displayName, profile, companionId, allCompletedModules, currentChapterId, conceptLabel, lessonContext)
        : `אתה ${companion.name} ${companion.emoji}, מחנך פיננסי באפליקציית FinPlay. ${companion.tone}\nענה תמיד בעברית. תשובות קצרות.`;

    const chatMessages = messages.map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      content: m.content,
    }));

    const draftTs = Date.now();

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    let accumulated = "";

    streamChatRequest(
      { systemPrompt, messages: chatMessages, maxOutputTokens: 2500 },
      // Accumulate silently while the typing dots stay up — the reply is added
      // and revealed once, as a settled block, in the completion handler below.
      (chunk) => { accumulated += chunk; },
      abortControllerRef.current.signal,
    ).then(({ ok }) => {
      if (!ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant" as const, content: "שגיאה בחיבור. נסו שוב.", timestamp: draftTs, status: "read" as const },
        ]);
        setAnimationState("idle");
        setLoading(false);
        setTimeout(scrollToAnchor, 100);
        return;
      }
      commitStreamedReply(draftTs, accumulated);
      if (accumulated) AccessibilityInfo.announceForAccessibility(accumulated);
      markAllRead();
      const lastQ = messages[0]?.content ?? "";
      const lastA = stripDebugPreamble(accumulated);
      if (lastQ && lastA) triggerFollowups(lastQ, lastA);
      talkingTimeoutRef.current = setTimeout(() => setAnimationState("idle"), 3000);
      setTimeout(scrollToAnchor, 100);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSendLifeline]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    // Free-tier daily quota gate — input should already be disabled, this is a safety net
    const subData = queryClient.getQueryData<SubscriptionState | null>(subscriptionQueryKey);
    const isProNow = subData?.isPro === true;
    if (!useUsageStore.getState().canUse("chat", isProNow)) {
      setInput("");
      setInputHeight(INPUT_MIN_HEIGHT);
      return;
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: text,
      timestamp: Date.now(),
      status: "sent",
    };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setInputHeight(INPUT_MIN_HEIGHT);
    setLoading(true);
    setAnimationState("thinking");

    // Pop the just-sent message to the top of the chat immediately (the answer
    // block's min-height has already opened the empty space below it).
    setTimeout(scrollToAnchor, 80);

    // Mark as delivered after short delay
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m, i) =>
          i === prev.length - 1 && m.role === "user" && m.status === "sent"
            ? { ...m, status: "delivered" as const }
            : m,
        ),
      );
    }, 400);

    if (talkingTimeoutRef.current) {
      clearTimeout(talkingTimeoutRef.current);
      talkingTimeoutRef.current = null;
    }

    const conceptLabel = lifelineConcept ? getConceptLabel(lifelineConcept) : undefined;
    const systemPrompt =
      displayName && profile
        ? buildSystemPrompt(displayName, profile, companionId, allCompletedModules, currentChapterId, conceptLabel, lessonContext)
        : `אתה ${companion.name} ${companion.emoji}, מחנך פיננסי באפליקציית FinPlay. ${companion.tone}\nענה תמיד בעברית. תשובות קצרות.`;

    const chatMessages = updatedMessages.map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      content: m.content,
    }));

    // The reply is added once it's fully arrived (see commitStreamedReply) — the
    // typing dots stay up meanwhile, avoiding a double-shark render and a reflow.
    const draftTs = Date.now();

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    let accumulated = "";

    const { ok } = await streamChatRequest(
      { systemPrompt, messages: chatMessages, maxOutputTokens: 2500 },
      // Accumulate silently; the settled block is committed + revealed below.
      (chunk) => { accumulated += chunk; },
      abortControllerRef.current.signal,
    );

    if (!ok) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant" as const, content: "שגיאה בחיבור. נסו שוב.", timestamp: draftTs, status: "read" as const },
      ]);
      markAllRead();
      setAnimationState("idle");
    } else {
      commitStreamedReply(draftTs, accumulated);
      if (accumulated) AccessibilityInfo.announceForAccessibility(accumulated);
      if (!isProNow) {
        useUsageStore.getState().incrementUsage("chat");
      }
      markAllRead();
      const atLimitAfterSend = !useUsageStore.getState().canUse("chat", isProNow);
      if (atLimitAfterSend) {
        setMessages((prev) => {
          if (prev.some((m) => m.kind === "upgrade_prompt")) return prev;
          return [
            ...prev,
            {
              role: "assistant" as const,
              content: "זה הסוף לחינם להיום 💙 הגעת ל-3 ההודעות היומיות. רוצה להמשיך לשוחח איתי ללא הגבלה?",
              timestamp: Date.now() + 1,
              status: "read" as const,
              kind: "upgrade_prompt" as const,
            },
          ];
        });
      } else {
        // Refresh the suggestion chips with follow-ups tailored to this answer.
        const lastA = stripDebugPreamble(accumulated);
        if (lastA) triggerFollowups(text, lastA);
      }
      talkingTimeoutRef.current = setTimeout(() => setAnimationState("idle"), 3000);
    }

    setLoading(false);
    setTimeout(scrollToAnchor, 100);
  }, [input, loading, messages, displayName, profile, companionId, companion, allCompletedModules, currentChapterId, lifelineConcept, markAllRead, scrollToAnchor, triggerFollowups, commitStreamedReply]);

  const isPro = useIsPro();
  // Subscribe to chatMessagesToday so canSendChat re-evaluates after each send
  const chatMessagesToday = useUsageStore((s) => s.chatMessagesToday);
  const canSendChat = useUsageStore((s) => s.canUse("chat", isPro));
  void chatMessagesToday;

  const handleStyleSelect = useCallback((id: CompanionId) => {
    updateProfile({ companionId: id });
    completeChatStyleChoice();
    setShowStylePicker(false);
  }, [updateProfile, completeChatStyleChoice]);

  // Index of the last user message — the anchor for the current turn. Everything
  // from here on (the user question + its streaming answer) lives in an "answer
  // block" tall enough to let the question sit at the very top of the viewport.
  let anchorIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") { anchorIdx = i; break; }
  }

  const renderMessage = (msg: ChatMessage, index: number) => {
    const isBot = msg.role === "assistant";
    return (
      <View
        key={index}
        style={[msgStyles.messageRow, isBot ? msgStyles.messageRowBot : msgStyles.messageRowUser]}
      >
        {isBot && (
          <View style={msgStyles.avatarCircle}>
            <ExpoImage
              source={FINN_STANDARD}
              style={{ width: 22, height: 22 }}
              contentFit="contain"
              accessible={false}
            />
          </View>
        )}
        <View
          style={[
            msgStyles.bubble,
            isBot ? msgStyles.botBubble : msgStyles.userBubble,
            !isBot && isPro && { borderColor: "#fde68a" },
          ]}
        >
          {/* While the reply is streaming, render it with the Gemini-style
              reveal (full text laid out once + sliding fade \u2014 no bubble-height
              animation). Once done it hands off to a plain, fully-visible Text. */}
          {isBot && msg.timestamp === streamingTs ? (
            <StreamingBotText
              content={msg.content}
              textStyle={[msgStyles.botText, msgStyles.rtlText]}
              networkDone={streamDoneTs === msg.timestamp}
              onRevealEnd={handleRevealEnd}
            />
          ) : isBot ? (
            // Settled bot reply \u2014 render the light markdown the model produced.
            <MarkdownText content={msg.content} baseStyle={[msgStyles.botText, msgStyles.rtlText]} />
          ) : (
            <Text style={[msgStyles.userText, msgStyles.rtlText]}>
              {/* RLI (U+2067) ... PDI (U+2069): strong RTL bidi isolate so
                  neutral chars (/, ", ,, .) don't drift around. */}
              {"\u2067" + msg.content + "\u2069"}
            </Text>
          )}
          {msg.kind === "upgrade_prompt" && (
            <Pressable
              onPress={() => router.push("/pricing" as never)}
              accessibilityRole="button"
              accessibilityLabel="שדרג לפרו"
              style={msgStyles.upgradeCta}
            >
              <Text style={msgStyles.upgradeCtaText}>שדרג לפרו 💎</Text>
            </Pressable>
          )}
          {/* Timestamp + Read Receipt row */}
          <View style={msgStyles.metaRow}>
            {!isBot && isPro && <ProBadge size="sm" />}
            {!isBot && <ReadReceipt status={msg.status} />}
            <Text style={msgStyles.timestamp}>{formatTime(msg.timestamp)}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
    <SafeAreaView className="flex-1" edges={['bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        // On Android we don't set behavior — the system's default `adjustResize`
        // already shrinks the window when the keyboard appears. Adding padding
        // on top of that double-shifts the input and hides it under the keyboard.
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        {/* WhatsApp-style header */}
        <View style={headerStyles.container}>
          <View style={headerStyles.row}>
            <View style={headerStyles.avatarCircle} accessible={false}>
              {companion.headerImage
                ? <ExpoImage source={companion.headerImage} style={{ width: 36, height: 36 }} contentFit="contain" />
                : companion.headerLottie
                  ? <View><LottieIcon source={companion.headerLottie} size={36} autoPlay loop /></View>
                  : <Text style={headerStyles.avatarEmoji}>{companion.emoji}</Text>}
            </View>
            <View style={headerStyles.info}>
              <Text style={headerStyles.name}>{companion.name}</Text>
              <Text style={headerStyles.status}>
                {loading ? "מקליד..." : "מחובר"}
              </Text>
            </View>
            {/* Settings gear removed, chat tone now in app Settings screen */}
          </View>
        </View>

        {/* Chat messages — the current turn is pinned to the top of the viewport */}
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1, paddingHorizontal: 12 }}
          contentContainerStyle={[msgStyles.scrollContent, { flexGrow: 1, justifyContent: "flex-start" }]}
          onLayout={(e) => setViewportH(e.nativeEvent.layout.height)}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {anchorIdx === -1 ? (
            <>
              {messages.map((msg, index) => renderMessage(msg, index))}
              {loading && <TypingIndicator emoji={companion.emoji} />}
            </>
          ) : (
            <>
              {messages.slice(0, anchorIdx).map((msg, index) => renderMessage(msg, index))}
              {/* Answer block: at least one viewport tall so the user's question
                  can sit at the very top, leaving empty space below it that the
                  streaming reply then fills in (ChatGPT-style). */}
              <View
                onLayout={(e) => { anchorYRef.current = e.nativeEvent.layout.y; }}
                style={viewportH > 0 ? { minHeight: viewportH - 12 } : undefined}
              >
                {messages.slice(anchorIdx).map((msg, i) => renderMessage(msg, anchorIdx + i))}
                {loading && <TypingIndicator emoji={companion.emoji} />}
              </View>
            </>
          )}

          <View className="h-4" />
        </ScrollView>

        {/* Suggestion chips, 2 + extra questions toggle */}
        <View style={chipStyles.container}>
          <AnimatedPressable
            onPress={() => setShowExtraQuestions(!showExtraQuestions)}
            style={chipStyles.extraChip}
            accessibilityRole="button"
            accessibilityLabel={showExtraQuestions ? "הסתר הצעות" : "הצג הצעות"}
          >
            <Text style={chipStyles.extraText}>?</Text>
          </AnimatedPressable>
          {(dynamicSuggestions ?? suggestions.slice(0, 2)).map((suggestion, idx) => (
            <AnimatedPressable
              key={idx}
              onPress={() => handleSuggestionTap(suggestion.text)}
              style={chipStyles.chip}
              accessibilityRole="button"
              accessibilityLabel={suggestion.text}
            >
              {/* Keyed by text so a new follow-up fades in over the old label. */}
              <Animated.View
                key={suggestion.text}
                entering={FadeIn.duration(350)}
                exiting={FadeOut.duration(200)}
                style={chipStyles.chipLabel}
              >
                <Text style={chipStyles.text}>{suggestion.text}</Text>
              </Animated.View>
            </AnimatedPressable>
          ))}
        </View>
        {showExtraQuestions && (
          <Animated.View entering={FadeIn.duration(300)}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 12, gap: 8, flexDirection: 'row-reverse' }}
            >
              {TRENDING_QUESTIONS.map((q, i) => (
                <AnimatedPressable
                  key={i}
                  onPress={() => { handleSuggestionTap(q); setShowExtraQuestions(false); }}
                  style={chipStyles.trendingChip}
                  accessibilityRole="button"
                  accessibilityLabel={q}
                >
                  <Text style={chipStyles.text}>{q}</Text>
                </AnimatedPressable>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Input bar */}
        <View style={inputStyles.bar}>
          <View style={[inputStyles.textInputWrapper, inputFocused && inputStyles.textInputWrapperFocused]}>
            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={handleChangeText}
              editable={canSendChat}
              placeholder={canSendChat ? companion.placeholder : "הגעת למגבלה היומית. חזור מחר או שדרג לפרו 💙"}
              placeholderTextColor="#64748b"
              accessibilityLabel={canSendChat ? "כתבו הודעה" : "הגעת למגבלה היומית, שדרוג לפרו יאפשר שיחה ללא הגבלה"}
              multiline
              maxLength={500}
              style={[inputStyles.textInput, WEB_INPUT_RESET, { height: inputHeight }]}
              onContentSizeChange={Platform.OS === "web" ? undefined : handleInputSizeChange}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
              submitBehavior="blurAndSubmit"
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
          </View>
          <Animated.View style={sendPulseStyle}>
            <AnimatedPressable
              onPress={sendMessage}
              disabled={!input.trim() || loading || !canSendChat}
              accessibilityLabel="שלח"
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[
                inputStyles.sendButton,
                (!input.trim() || loading || !canSendChat) && inputStyles.sendButtonDisabled,
              ]}
            >
              <Send size={18} color={input.trim() && !loading && canSendChat ? "#ffffff" : "#52525b"} />
            </AnimatedPressable>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
    {/* Picker rendered LAST so it naturally paints on top of sibling views.
        iOS does not always honor zIndex reliably, render order is safer. */}
    {((!hasChosenStyle && !walkthroughOnChatStep) || showStylePicker) && <ChatStylePicker onSelect={handleStyleSelect} />}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const headerStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#0891b2",
  },
  avatarEmoji: {
    fontSize: 20,
  },
  info: {
    flex: 1,
    alignItems: "flex-end",
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0e7490",
    writingDirection: "rtl",
  },
  status: {
    fontSize: 12,
    color: "#059669",
    writingDirection: "rtl",
  },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
});

const msgStyles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingTop: 12,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 6,
    alignItems: "flex-end",
    paddingHorizontal: 4,
  },
  messageRowBot: {
    justifyContent: "flex-end",
  },
  messageRowUser: {
    justifyContent: "flex-start",
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#ede9fe",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
    overflow: "hidden",
  },
  avatarEmoji: {
    fontSize: 13,
  },
  bubble: {
    maxWidth: "82%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
  },
  botBubble: {
    backgroundColor: "#ffffff",
    borderTopRightRadius: 4,
  },
  userBubble: {
    backgroundColor: "#ede9fe",
    borderTopLeftRadius: 4,
  },
  botText: {
    color: "#1f2937",
    fontSize: 14,
    lineHeight: 22,
  },
  rtlText: {
    writingDirection: "rtl",
    textAlign: "right",
  },
  userText: {
    color: "#1f2937",
    fontSize: 14,
    lineHeight: 22,
  },
  upgradeCta: {
    marginTop: 10,
    backgroundColor: "#0a2540",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 3,
    borderBottomColor: "#05162a",
    shadowColor: "#0a2540",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  upgradeCtaText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
    writingDirection: "rtl",
    letterSpacing: 0.3,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 3,
    marginTop: 2,
    paddingBottom: 2,
  },
  timestamp: {
    fontSize: 10,
    color: "#64748b",
  },
});

const chipStyles = StyleSheet.create({
  container: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  chip: {
    flex: 1,
    height: 46,
    borderWidth: 1.5,
    borderColor: "#bae6fd",
    borderRadius: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f9ff",
    overflow: "hidden",
  },
  chipLabel: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  text: {
    color: "#1e3a5f",
    fontSize: 12,
    fontWeight: "600",
    writingDirection: "rtl" as const,
    textAlign: "center" as const,
    lineHeight: 16,
  },
  extraChip: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    width: 46,
    height: 46,
    borderWidth: 1.5,
    borderColor: "#bae6fd",
    borderRadius: 12,
    backgroundColor: "#f0f9ff",
  },
  extraText: {
    color: "#0369a1",
    fontSize: 17,
    fontWeight: "700" as const,
    lineHeight: 20,
    textAlign: "center" as const,
  },
  trendingChip: {
    borderWidth: 1.5,
    borderColor: "#bae6fd",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#f0f9ff",
  },
});

const inputStyles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
  },
  textInputWrapper: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    borderRadius: 20,
    overflow: "hidden",
  },
  textInputWrapperFocused: {
    borderColor: "#0ea5e9",
  },
  textInput: {
    paddingHorizontal: 16,
    paddingVertical: INPUT_VPAD,
    color: "#1f2937",
    fontSize: 14,
    lineHeight: INPUT_LINE_HEIGHT,
    maxHeight: INPUT_MAX_HEIGHT,
    writingDirection: "rtl",
    textAlign: "right",
    textAlignVertical: "top",
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0ea5e9",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0ea5e9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: "#e5e7eb",
    shadowOpacity: 0,
  },
});
