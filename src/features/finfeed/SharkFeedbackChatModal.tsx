import React, { useState, useRef, useEffect, useCallback } from "react";
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
} from "react-native";
import Animated, {
  FadeIn,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  useReducedMotion,
  withRepeat,
  withSequence,
  withSpring,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { X, Send } from "lucide-react-native";
import { Image as ExpoImage } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getApiBase } from "../../db/apiBase";
import { useAuthStore } from "../auth/useAuthStore";
import { FINN_STANDARD, FINN_TALKING } from "../retention-loops/finnMascotConfig";
import { tapHaptic, successHaptic } from "../../utils/haptics";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

function TypingDots() {
  const reducedMotion = useReducedMotion();
  const d1 = useSharedValue(0);
  const d2 = useSharedValue(0);
  const d3 = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      // Static dots, readable, no distracting animation
      d1.value = withTiming(0.6, { duration: 0 });
      d2.value = withTiming(0.6, { duration: 0 });
      d3.value = withTiming(0.6, { duration: 0 });
      return;
    }
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
  }, [d1, d2, d3, reducedMotion]);

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
  onClose: () => void;
}

const INITIAL_MSG = "איך הולך לך עד עכשיו? נשמח לשמוע איך אפשר להשתפר.";
const THANK_YOU_MSG = "תודה רבה! זה עוזר לנו להשתפר עבורך.";

export function SharkFeedbackChatModal({ visible, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const safeInsets = useSafeAreaInsets();
  const authId = useAuthStore((s) => s.email ?? "guest");

  useEffect(() => {
    if (visible) {
      // Greeting fires exactly once on open, the state reset below handles re-opens.
      const t = setTimeout(() => {
        setMessages([{ role: "assistant", content: INITIAL_MSG }]);
      }, 300);
      return () => clearTimeout(t);
    }
    setMessages([]);
    setInput("");
    setLoading(false);
  }, [visible]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    tapHaptic();
    setInput("");
    
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      await fetch(`${getApiBase()}/api/sync/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authId,
          message: text,
        }),
      });
      setTimeout(() => {
        successHaptic();
        setMessages((prev) => [...prev, { role: "assistant", content: THANK_YOU_MSG }]);
        setLoading(false);
        setTimeout(() => onClose(), 2500); 
      }, 800);
    } catch {
      setLoading(false);
      setMessages((prev) => [...prev, { role: "assistant", content: "אופס, משהו השתבש בשליחה." }]);
    }
  }, [input, loading, authId, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "#f0f9ff" }}>
        <KeyboardAvoidingView
          style={st.root}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Header, top padding has a floor so the status bar never overlaps
               content even when safe-area insets aren't reported inside the Modal. */}
          <Animated.View entering={FadeIn.duration(200)} style={[st.header, { paddingTop: Math.max(safeInsets.top + 10, 44) }]}>
            <Pressable onPress={onClose} style={st.closeBtn} hitSlop={12} accessibilityRole="button">
              <X size={22} color="#0e7490" />
            </Pressable>
            <View style={st.avatarHeader}>
              <ExpoImage source={FINN_STANDARD} style={st.avatarHeaderImage} contentFit="contain" />
            </View>
            <View style={st.headerTextWrap}>
              <Text style={st.headerTitle}>קפטן שארק</Text>
              <Text style={st.headerSub}>משוב מהיר</Text>
            </View>
          </Animated.View>

          {/* Messages */}
          <ScrollView
            ref={scrollRef}
            style={st.messages}
            contentContainerStyle={st.messagesContent}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map((msg, i) => (
              <Animated.View
                key={`msg-${i}`}
                entering={FadeInUp.delay(50).duration(200)}
                style={[st.msgRow, msg.role === "user" ? st.msgRowUser : st.msgRowBot]}
              >
                {msg.role === "assistant" && (
                  <View style={st.avatarCircle}>
                    <ExpoImage source={FINN_STANDARD} style={st.avatarCircleImage} contentFit="contain" />
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
                  <ExpoImage source={FINN_TALKING} style={st.avatarCircleImage} contentFit="contain" />
                </View>
                <View style={[st.bubble, st.botBubble]}>
                  <TypingDots />
                </View>
              </View>
            )}
          </ScrollView>

          {/* Input bar, respects bottom safe area (gesture bar / home indicator) */}
          <View style={[st.inputBar, { paddingBottom: Math.max(safeInsets.bottom + 10, 16) }]}>
            <TextInput
              style={st.textInput}
              value={input}
              onChangeText={setInput}
              placeholder="הפידבק שלך..."
              placeholderTextColor="#64748b"
              multiline
              maxLength={1000}
              onSubmitEditing={sendMessage}
              accessibilityLabel="הקלד כאן..." 
            />
            <Pressable
              onPress={sendMessage}
              disabled={!input.trim() || loading}
              accessibilityRole="button"
              accessibilityLabel="שלח משוב"
              accessibilityState={{ disabled: !input.trim() || loading }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[st.sendBtn, (!input.trim() || loading) && st.sendBtnDisabled]}
            >
              <Send size={20} color="#fff" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
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
    overflow: "visible",
  },
  avatarHeaderImage: {
    width: 56,
    height: 56,
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
  messages: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 20,
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
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  avatarCircleImage: {
    width: 38,
    height: 38,
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
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 10,
    // paddingBottom applied inline via safeInsets so gesture bar never clips the input.
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
});
