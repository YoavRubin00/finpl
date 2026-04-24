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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Send, Check, CheckCheck, MessageCircle, ChevronLeft } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withDelay,
  withSequence,
  withTiming,
  interpolateColor,
  FadeIn,
  SlideInUp,
} from "react-native-reanimated";
import { useAuthStore } from "../auth/useAuthStore";
import { useChapterStore } from "../chapter-1-content/useChapterStore";
import { useAdaptiveStore } from "../social/useAdaptiveStore";
import { useSubscriptionStore } from "../subscription/useSubscriptionStore";
import { useRouter } from "expo-router";
import { getConceptLabel } from "../social/LifelineModal";
import { AnimatedPressable } from "../../components/ui/AnimatedPressable";
import { COMPANION_PERSONALITIES, getContextualSuggestions, getContextAwareGreeting } from "./chatData";
import { buildSystemPrompt } from "./buildChatPrompt";
import type { CompanionAnimationState, ChatMessage, MessageStatus } from "./chatTypes";
import type { CompanionId } from "../auth/types";
import { ProBadge } from "../../components/ui/ProBadge";
import { useTutorialStore } from "../../stores/useTutorialStore";
import { streamChatRequest } from "../../utils/streamChat";

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


/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
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
  return <CheckCheck size={14} color="#60a5fa" />;
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

const CHAT_STYLES: { id: CompanionId; title: string; desc: string }[] = [
  { id: "warren-buffett", title: "חכם וסבלני", desc: "מסביר עם אנלוגיות, כמו חבר שיודע הכל על כסף" },
  { id: "moshe-peled", title: "ישיר ותכל׳סי", desc: "ישראלי, לא מסתובב, אומר את זה כמו שזה" },
  { id: "rachel", title: "חם ומעודד", desc: "רגוע, סבלני, תמיד מוצא מילה טובה ומסביר בנועם" },
  { id: "robot", title: "אנליטי ומדויק", desc: "מבוסס מספרים, תמציתי, עונה בנקודות קצרות" },
];

function ChatStylePicker({ onSelect }: { onSelect: (id: CompanionId) => void }) {
  return (
    <Animated.View entering={FadeIn.duration(200)} style={pickerStyles.overlay} pointerEvents="auto">
      <Animated.View entering={FadeIn.duration(400).delay(100)} style={pickerStyles.card}>
        <Text style={pickerStyles.title}>איך תרצו שאדבר איתכם?</Text>
        <Text style={pickerStyles.subtitle}>בחרו את הסגנון שהכי מתאים לכם</Text>
        <View style={pickerStyles.options}>
          {CHAT_STYLES.map((s) => (
            <Pressable key={s.id} onPress={() => onSelect(s.id)} style={pickerStyles.option} accessibilityRole="button" accessibilityLabel={`סגנון שיחה: ${s.title}`}>
              <Text style={pickerStyles.optionTitle}>{s.title}</Text>
              <Text style={pickerStyles.optionDesc}>{s.desc}</Text>
            </Pressable>
          ))}
        </View>
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
});

/* ------------------------------------------------------------------ */
/*  ChatScreen, WhatsApp-style                                        */
/* ------------------------------------------------------------------ */

export function ChatScreen() {
  const router = useRouter();
  const displayName = useAuthStore((s) => s.displayName);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const profile = useAuthStore((s) => s.profile);
  const currentChapterId = useChapterStore((s) => s.currentChapterId);
  const progress = useChapterStore((s) => s.progress);
  const hasChosenStyle = useTutorialStore((s) => s.hasChosenChatStyle);
  const completeChatStyleChoice = useTutorialStore((s) => s.completeChatStyleChoice);
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showExtraQuestions, setShowExtraQuestions] = useState(false);
  const [_animationState, setAnimationState] = useState<CompanionAnimationState>("idle");
  const scrollViewRef = useRef<ScrollView>(null);
  const talkingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const companionId: CompanionId = profile?.companionId ?? "warren-buffett";
  const companion = COMPANION_PERSONALITIES[companionId];

  // Check if we arrived via AI Lifeline intervention
  const lifelineConceptRef = useRef(useAdaptiveStore.getState().activeLifelineConcept);
  const [lifelineConcept] = useState(lifelineConceptRef.current);
  const [autoSendLifeline, setAutoSendLifeline] = useState(false);

  // Input bar focus glow animation
  const focusProgress = useSharedValue(0);
  const inputBorderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focusProgress.value, [0, 1], ["#3f3f46", "#7c3aed"]),
  }));
  const handleInputFocus = useCallback(() => {
    focusProgress.value = withTiming(1, { duration: 250 });
  }, [focusProgress]);
  const handleInputBlur = useCallback(() => {
    focusProgress.value = withTiming(0, { duration: 250 });
  }, [focusProgress]);

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
    () => Object.values(progress).flatMap((cp) => cp.completedModules),
    [progress],
  );
  // Current chapter's modules for backward-compatible suggestion logic
  const chapterProgress = progress[currentChapterId];
  const completedModules = chapterProgress?.completedModules ?? [];

  const suggestions = useMemo(
    () => getContextualSuggestions(allCompletedModules, currentChapterId),
    [allCompletedModules, currentChapterId],
  );

  const handleSuggestionTap = useCallback((text: string) => {
    setInput(text);
  }, []);

  // Mark user messages as "read" after assistant replies
  const markAllRead = useCallback(() => {
    setMessages((prev) =>
      prev.map((m) =>
        m.role === "user" && m.status !== "read" ? { ...m, status: "read" as const } : m,
      ),
    );
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
  useEffect(() => () => { abortControllerRef.current?.abort(); }, []);

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
        ? buildSystemPrompt(displayName, profile, companionId, allCompletedModules, currentChapterId, conceptLabel)
        : `אתה ${companion.name} ${companion.emoji}, מחנך פיננסי באפליקציית FinPlay. ${companion.tone}\nענה תמיד בעברית. תשובות קצרות.`;

    const chatMessages = messages.map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      content: m.content,
    }));

    const draftTs = Date.now();
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", timestamp: draftTs, status: "read" as const },
    ]);

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    let firstChunk = true;
    let accumulated = "";

    streamChatRequest(
      { systemPrompt, messages: chatMessages, maxOutputTokens: 2500 },
      (chunk) => {
        if (firstChunk) {
          setLoading(false);
          setAnimationState("talking");
          firstChunk = false;
        }
        accumulated += chunk;
        setMessages((prev) =>
          prev.map((m) =>
            m.role === "assistant" && m.timestamp === draftTs
              ? { ...m, content: m.content + chunk }
              : m,
          ),
        );
      },
      abortControllerRef.current.signal,
    ).then(({ ok }) => {
      if (!ok) {
        setMessages((prev) =>
          prev.map((m) =>
            m.role === "assistant" && m.timestamp === draftTs
              ? { ...m, content: "שגיאה בחיבור. נסה שוב." }
              : m,
          ),
        );
        setAnimationState("idle");
      } else {
        if (accumulated) AccessibilityInfo.announceForAccessibility(accumulated);
        markAllRead();
        talkingTimeoutRef.current = setTimeout(() => setAnimationState("idle"), 3000);
      }
      setLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSendLifeline]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    // Free-tier daily quota gate — input should already be disabled, this is a safety net
    const storeState = useSubscriptionStore.getState();
    if (!storeState.canUse("chat")) {
      setInput("");
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
    setLoading(true);
    setAnimationState("thinking");

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
        ? buildSystemPrompt(displayName, profile, companionId, allCompletedModules, currentChapterId, conceptLabel)
        : `אתה ${companion.name} ${companion.emoji}, מחנך פיננסי באפליקציית FinPlay. ${companion.tone}\nענה תמיד בעברית. תשובות קצרות.`;

    const chatMessages = updatedMessages.map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      content: m.content,
    }));

    // Add empty draft bubble; chunks stream into it
    const draftTs = Date.now();
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", timestamp: draftTs, status: "read" as const },
    ]);

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    let firstChunk = true;
    let accumulated = "";

    const { ok } = await streamChatRequest(
      { systemPrompt, messages: chatMessages, maxOutputTokens: 2500 },
      (chunk) => {
        if (firstChunk) {
          setLoading(false);
          setAnimationState("talking");
          firstChunk = false;
        }
        accumulated += chunk;
        setMessages((prev) =>
          prev.map((m) =>
            m.role === "assistant" && m.timestamp === draftTs
              ? { ...m, content: m.content + chunk }
              : m,
          ),
        );
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 50);
      },
      abortControllerRef.current.signal,
    );

    if (!ok) {
      setMessages((prev) =>
        prev.map((m) =>
          m.role === "assistant" && m.timestamp === draftTs
            ? { ...m, content: "שגיאה בחיבור. נסה שוב." }
            : m,
        ),
      );
      markAllRead();
      setAnimationState("idle");
    } else {
      if (accumulated) AccessibilityInfo.announceForAccessibility(accumulated);
      if (!storeState.isPro()) {
        storeState.incrementUsage("chat");
      }
      markAllRead();
      const atLimitAfterSend = !useSubscriptionStore.getState().canUse("chat");
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
      }
      talkingTimeoutRef.current = setTimeout(() => setAnimationState("idle"), 3000);
    }

    setLoading(false);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  }, [input, loading, messages, displayName, profile, companionId, companion, allCompletedModules, currentChapterId, lifelineConcept, markAllRead]);

  const isPro = useSubscriptionStore((s) => s.isPro());
  // Subscribe to chatMessagesToday so canSendChat re-evaluates after each send
  const chatMessagesToday = useSubscriptionStore((s) => s.chatMessagesToday);
  const canSendChat = useSubscriptionStore((s) => s.canUse("chat"));
  void chatMessagesToday;

  const handleStyleSelect = useCallback((id: CompanionId) => {
    updateProfile({ companionId: id });
    completeChatStyleChoice();
    setShowStylePicker(false);
  }, [updateProfile, completeChatStyleChoice]);

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
    <SafeAreaView className="flex-1" edges={['bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 30}
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

          {/* Recent conversations strip, Pro only */}
          {isPro && messages.length > 2 && (
            <View style={headerStyles.recentStrip}>
              <MessageCircle size={12} color="#64748b" />
              <Text style={headerStyles.recentLabel}>
                {messages.filter((m) => m.role === "user").length} הודעות בשיחה הנוכחית
              </Text>
            </View>
          )}
        </View>

        {/* Chat messages, fills from bottom */}
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1, paddingHorizontal: 12 }}
          contentContainerStyle={[msgStyles.scrollContent, { flexGrow: 1, justifyContent: messages.length <= 1 ? "flex-start" : "flex-end" }]}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg, index) => {
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
                <View style={[
                  msgStyles.bubble,
                  isBot ? msgStyles.botBubble : msgStyles.userBubble,
                  !isBot && isPro && { borderColor: "#fde68a" },
                ]}>
                  <Text
                    style={[
                      isBot ? msgStyles.botText : msgStyles.userText,
                      { writingDirection: "rtl", textAlign: "right" },
                    ]}
                  >
                    {/* RLM (U+200F) forces RTL base direction even when the first
                        streamed token is a digit, English, or punctuation. */}
                    {"\u200F" + msg.content}
                  </Text>
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
          })}

          {loading && <TypingIndicator emoji={companion.emoji} />}

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
            <ChevronLeft size={14} color="#0369a1" />
            <Text style={chipStyles.extraText}>לא יודעים מה לשאול?</Text>
          </AnimatedPressable>
          {suggestions.slice(0, 2).map((suggestion, idx) => (
            <AnimatedPressable
              key={`${suggestion.moduleId ?? "gen"}-${idx}`}
              onPress={() => handleSuggestionTap(suggestion.text)}
              style={chipStyles.chip}
              accessibilityRole="button"
              accessibilityLabel={suggestion.text}
            >
              <Text style={chipStyles.text}>{suggestion.text}</Text>
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
          <Animated.View style={[inputStyles.textInputWrapper, inputBorderStyle]}>
            <TextInput
              value={input}
              onChangeText={setInput}
              editable={canSendChat}
              placeholder={canSendChat ? companion.placeholder : "הגעת למגבלה היומית. חזור מחר או שדרג לפרו 💙"}
              placeholderTextColor="#64748b"
              accessibilityLabel={canSendChat ? "כתבו הודעה" : "הגעת למגבלה היומית, שדרוג לפרו יאפשר שיחה ללא הגבלה"}
              multiline
              maxLength={500}
              style={inputStyles.textInput}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
              submitBehavior="blurAndSubmit"
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
          </Animated.View>
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
    {(!hasChosenStyle || showStylePicker) && <ChatStylePicker onSelect={handleStyleSelect} />}
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
    color: "#6ee7b7",
    writingDirection: "rtl",
  },
  recentStrip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  recentLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
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
    borderWidth: 1,
    borderColor: "#e5e7eb",
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    flex: 1,
    minHeight: 80,
    borderWidth: 1.5,
    borderColor: "#bae6fd",
    borderRadius: 16,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f9ff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  text: {
    color: "#1e3a5f",
    fontSize: 12,
    fontWeight: "600",
    writingDirection: "rtl" as const,
    textAlign: "center" as const,
    lineHeight: 18,
  },
  extraChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 4,
    borderWidth: 0,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "#e0f2fe",
  },
  extraText: {
    color: "#0369a1",
    fontSize: 12,
    fontWeight: "800" as const,
    writingDirection: "rtl" as const,
  },
  trendingChip: {
    borderWidth: 1.5,
    borderColor: "#bae6fd",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#f0f9ff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
});

const inputStyles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  textInputWrapper: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#22d3ee",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#22d3ee",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  textInput: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: "#1f2937",
    fontSize: 14,
    maxHeight: 100,
    writingDirection: "rtl",
    textAlign: "right",
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0891b2",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#22d3ee",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: "#e5e7eb",
    shadowOpacity: 0,
  },
});
