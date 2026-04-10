/**
 * LifelineChatOverlay — inline mentor chat that opens ON TOP of the quiz.
 * The user can ask the AI mentor for help with a concept, then close
 * the overlay with X and continue the quiz exactly where they left off.
 *
 * Light theme matching ChatScreen. 1 free explanation/day; Pro = unlimited.
 */
import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
  StyleSheet,
  ImageBackground,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withSpring,
  withDelay,
} from "react-native-reanimated";
import { X, Send, Lock } from "lucide-react-native";
import { useAuthStore } from "../auth/useAuthStore";
import { useChapterStore } from "../chapter-1-content/useChapterStore";
import { useSubscriptionStore } from "../subscription/useSubscriptionStore";
import { getApiBase } from "../../db/apiBase";
import { useUpgradeModalStore } from "../../stores/useUpgradeModalStore";
import { COMPANION_PERSONALITIES } from "../chat/chatData";
import { buildSystemPrompt } from "../chat/buildChatPrompt";
import { getConceptLabel } from "./LifelineModal";
import type { CompanionId } from "../auth/types";
import AsyncStorage from "@react-native-async-storage/async-storage";

/* ── Daily usage tracking ── */
const DAILY_KEY = "lifeline_chat_date";
const DAILY_COUNT_KEY = "lifeline_chat_count";
const FREE_DAILY_LIMIT = 1;

async function getDailyUsage(): Promise<{ date: string; count: number }> {
  const today = new Date().toISOString().slice(0, 10);
  const storedDate = await AsyncStorage.getItem(DAILY_KEY);
  if (storedDate !== today) {
    return { date: today, count: 0 };
  }
  const raw = await AsyncStorage.getItem(DAILY_COUNT_KEY);
  return { date: today, count: raw ? parseInt(raw, 10) : 0 };
}

async function incrementDailyUsage(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  await AsyncStorage.setItem(DAILY_KEY, today);
  const { count } = await getDailyUsage();
  await AsyncStorage.setItem(DAILY_COUNT_KEY, String(count + 1));
}

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

/* ── Typing dots ── */
function TypingDots() {
  const d1 = useSharedValue(0);
  const d2 = useSharedValue(0);
  const d3 = useSharedValue(0);

  useEffect(() => {
    const bounce = withRepeat(
      withSequence(
        withSpring(1, { damping: 4, stiffness: 300 }),
        withSpring(0, { damping: 4, stiffness: 300 }),
      ),
      -1,
    );
    d1.value = bounce;
    d2.value = withDelay(150, bounce);
    d3.value = withDelay(300, bounce);
  }, [d1, d2, d3]);

  const s1 = useAnimatedStyle(() => ({ transform: [{ scale: 1 + d1.value * 0.4 }] }));
  const s2 = useAnimatedStyle(() => ({ transform: [{ scale: 1 + d2.value * 0.4 }] }));
  const s3 = useAnimatedStyle(() => ({ transform: [{ scale: 1 + d3.value * 0.4 }] }));

  return (
    <View style={st.typingRow}>
      <Animated.View style={[st.dot, s1]} />
      <Animated.View style={[st.dot, s2]} />
      <Animated.View style={[st.dot, s3]} />
    </View>
  );
}

interface Props {
  visible: boolean;
  conceptTag: string;
  onClose: () => void;
}

export function LifelineChatOverlay({ visible, conceptTag, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const profile = useAuthStore((s) => s.profile);
  const companionId: CompanionId = profile?.companionId ?? "warren-buffett";
  const companion = COMPANION_PERSONALITIES[companionId] ?? COMPANION_PERSONALITIES["warren-buffett"];
  const displayName = useAuthStore((s) => s.displayName);
  const progress = useChapterStore((s) => s.progress);
  const allCompleted = Object.values(progress).flatMap((cp) => cp.completedModules);
  const currentChapter = useChapterStore((s) => s.currentChapterId);
  const conceptLabel = getConceptLabel(conceptTag);
  const isPro = useSubscriptionStore((s) => s.isPro());

  // Check daily limit on open
  useEffect(() => {
    if (visible && !isPro) {
      getDailyUsage().then(({ count }) => {
        if (count >= FREE_DAILY_LIMIT) {
          setLocked(true);
        }
      });
    }
    if (visible && isPro) {
      setLocked(false);
    }
  }, [visible, isPro]);

  // Auto-send initial question when overlay opens
  useEffect(() => {
    if (visible && conceptTag && messages.length === 0 && !locked) {
      const autoMsg = `היי, אני לא מבין/ה את הנושא "${conceptLabel}". אפשר הסבר פשוט?`;
      setMessages([{ role: "user", content: autoMsg }]);
      callGemini([{ role: "user", content: autoMsg }]);
      if (!isPro) {
        incrementDailyUsage();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, conceptTag, locked]);

  // Reset when closed
  useEffect(() => {
    if (!visible) {
      setMessages([]);
      setInput("");
      setLoading(false);
      setLocked(false);
    }
  }, [visible]);

  const callGemini = useCallback(
    async (msgs: ChatMsg[]) => {
      setLoading(true);

      const systemPrompt =
        displayName && profile
          ? buildSystemPrompt(
              displayName,
              profile,
              companionId,
              allCompleted,
              currentChapter,
              conceptLabel,
            )
          : `אתה ${companion.name} ${companion.emoji}, מחנך פיננסי באפליקציית FinPlay. ${companion.tone}\nענה תמיד בעברית. תשובות קצרות ופשוטות. הסבר את "${conceptLabel}" בצורה ברורה.`;

      const chatMessages = msgs.map((m) => ({
        role: m.role === "assistant" ? ("model" as const) : ("user" as const),
        content: m.content,
      }));

      try {
        const response = await fetch(
          `${getApiBase()}/api/ai/chat`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemPrompt,
              messages: chatMessages,
              maxOutputTokens: 2048,
            }),
          },
        );
        if (!response.ok) throw new Error("AI service error");
        const data = await response.json();
        const reply = data.reply ?? "סליחה, לא הצלחתי ליצור תשובה.";
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "שגיאה בחיבור. נסה שוב." },
        ]);
      } finally {
        setLoading(false);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      }
    },
    [displayName, profile, companionId, companion, allCompleted, currentChapter, conceptLabel],
  );

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const newMsgs: ChatMsg[] = [...messages, { role: "user", content: text }];
    setMessages(newMsgs);
    callGemini(newMsgs);
  }, [input, loading, messages, callGemini]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <ImageBackground
        source={{ uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/images/CHAT%20BACK.jpg' }}
        style={{ flex: 1 }}
        resizeMode="cover"
      >
        <KeyboardAvoidingView
          style={st.root}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Header */}
          <Animated.View entering={FadeIn.duration(200)} style={st.header}>
            <Pressable onPress={onClose} style={st.closeBtn} hitSlop={12}>
              <X size={22} color="#0e7490" />
            </Pressable>
            <View style={st.avatarHeader}>
              <Text style={st.headerEmoji}>{companion.emoji}</Text>
            </View>
            <View style={st.headerTextWrap}>
              <Text style={st.headerTitle}>{companion.name}</Text>
              <Text style={st.headerSub}>עוזר לך עם: {conceptLabel}</Text>
            </View>
          </Animated.View>

          {/* Locked state — daily limit reached */}
          {locked ? (
            <View style={st.lockedContainer}>
              <Lock size={48} color="#0891b2" />
              <Text style={st.lockedTitle}>ניצלת את ההסבר החינמי להיום</Text>
              <Text style={st.lockedSubtitle}>
                משתמשי Pro מקבלים הסברים ללא הגבלה{"\n"}שדרג/י כדי להמשיך ללמוד
              </Text>
              <Pressable
                onPress={() => {
                  onClose();
                  useUpgradeModalStore.getState().show("chat");
                }}
                style={st.upgradeBtn}
              >
                <Text style={st.upgradeBtnText}>שדרג ל-Pro</Text>
              </Pressable>
              <Pressable onPress={onClose} style={st.closeLockBtn}>
                <Text style={st.closeLockText}>חזרה לשיעור</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Messages */}
              <ScrollView
                ref={scrollRef}
                style={st.messages}
                contentContainerStyle={st.messagesContent}
                onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
              >
                {/* Intro bubble */}
                <Animated.View entering={FadeInUp.delay(100).duration(300)} style={st.introBubble}>
                  <Text style={st.introText}>
                    💡 שאל/י אותי כל שאלה על <Text style={st.conceptBold}>{conceptLabel}</Text>.
                    {"\n"}אני כאן לעזור!
                  </Text>
                </Animated.View>

                {messages.map((msg, i) => (
                  <Animated.View
                    key={`msg-${i}`}
                    entering={FadeInUp.delay(50).duration(200)}
                    style={[st.msgRow, msg.role === "user" ? st.msgRowUser : st.msgRowBot]}
                  >
                    {msg.role === "assistant" && (
                      <View style={st.avatarCircle}>
                        <Text style={st.avatarEmoji}>{companion.emoji}</Text>
                      </View>
                    )}
                    <View
                      style={[st.bubble, msg.role === "user" ? st.userBubble : st.botBubble]}
                    >
                      <Text
                        style={[
                          st.bubbleText,
                          msg.role === "user" ? st.userText : st.botText,
                        ]}
                      >
                        {msg.content}
                      </Text>
                    </View>
                  </Animated.View>
                ))}

                {loading && (
                  <View style={[st.msgRow, st.msgRowBot]}>
                    <View style={st.avatarCircle}>
                      <Text style={st.avatarEmoji}>{companion.emoji}</Text>
                    </View>
                    <View style={[st.bubble, st.botBubble]}>
                      <TypingDots />
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Input bar */}
              <View style={st.inputBar}>
                <TextInput
                  style={st.textInput}
                  value={input}
                  onChangeText={setInput}
                  placeholder="שאל שאלה..."
                  placeholderTextColor="#64748b"
                  multiline
                  maxLength={500}
                  onSubmitEditing={sendMessage}
                accessibilityLabel="שאל שאלה..." />
                <Pressable
                  onPress={sendMessage}
                  disabled={!input.trim() || loading}
                  style={[st.sendBtn, (!input.trim() || loading) && st.sendBtnDisabled]}
                >
                  <Send size={20} color="#fff" />
                </Pressable>
              </View>
            </>
          )}
        </KeyboardAvoidingView>
      </ImageBackground>
    </Modal>
  );
}

/* ── Light theme styles (matching ChatScreen) ── */
const st = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "transparent",
  },
  // ── Header ──
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 48 : 32,
    paddingBottom: 10,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.15)",
    gap: 10,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(14,116,144,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarHeader: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#0891b2",
  },
  headerEmoji: {
    fontSize: 22,
  },
  headerTextWrap: {
    flex: 1,
    alignItems: "flex-end",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0e7490",
    writingDirection: "rtl",
  },
  headerSub: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6ee7b7",
    writingDirection: "rtl",
    marginTop: 2,
  },
  // ── Messages ──
  messages: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 20,
  },
  introBubble: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    padding: 14,
    marginBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  introText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#1e3a5f",
    textAlign: "right",
    writingDirection: "rtl",
  },
  conceptBold: {
    color: "#0891b2",
    fontWeight: "700",
  },
  msgRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  msgRowUser: {
    justifyContent: "flex-start",
  },
  msgRowBot: {
    justifyContent: "flex-end",
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#ede9fe",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEmoji: {
    fontSize: 13,
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  userBubble: {
    backgroundColor: "#ede9fe",
    borderTopLeftRadius: 4,
  },
  botBubble: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderTopRightRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
    writingDirection: "rtl",
    textAlign: "right",
  },
  userText: {
    color: "#1f2937",
  },
  botText: {
    color: "#1f2937",
  },
  // ── Typing ──
  typingRow: {
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
    backgroundColor: "#0891b2",
  },
  // ── Input ──
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 16 : 8,
    backgroundColor: "transparent",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#22d3ee",
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1f2937",
    maxHeight: 100,
    textAlign: "right",
    writingDirection: "rtl",
    shadowColor: "#22d3ee",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  sendBtn: {
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
  sendBtnDisabled: {
    backgroundColor: "#e5e7eb",
    shadowOpacity: 0,
  },
  // ── Locked state ──
  lockedContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  lockedTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0e7490",
    textAlign: "center",
    writingDirection: "rtl",
    marginTop: 8,
  },
  lockedSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: "#64748b",
    textAlign: "center",
    writingDirection: "rtl",
  },
  upgradeBtn: {
    backgroundColor: "#0891b2",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
    marginTop: 8,
    shadowColor: "#22d3ee",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  upgradeBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
  },
  closeLockBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  closeLockText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
});
