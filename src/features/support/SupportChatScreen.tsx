/**
 * SupportChatScreen — "פנו אלינו לתמיכה" full-screen Shark chat reached
 * from MoreScreen. Shark greets the user, the user types a free-text
 * support message, and on send the message is persisted via POST
 * /api/support/send → Neon support_messages table.
 *
 * Differs from SharkFeedbackChatModal in three ways:
 *  - full-screen Expo Router page (not a Modal), so back gesture closes it
 *  - posts to /api/support/send (separate inbox table)
 *  - sends platform + app_version so ops can triage by device
 */
import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Alert,
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
import { Image as ExpoImage } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Send, ArrowLeft } from "lucide-react-native";
import { getApiBase } from "../../db/apiBase";
import { useAuthStore } from "../auth/useAuthStore";
import { FINN_STANDARD, FINN_TALKING } from "../retention-loops/finnMascotConfig";
import { tapHaptic, successHaptic } from "../../utils/haptics";
import appConfig from "../../../app.json";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

const INITIAL_MSG = "שלום! אני קפטן שארק 🦈\nאיך החוויה שלך באפליקציה עד עכשיו? ספר/י לי על משהו שאהבת, משהו שמטריד, או כל הצעה לשיפור.";
const THANK_YOU_MSG = "תודה! קיבלנו את ההודעה ונחזור אליך במייל אם צריך. אתה עוזר לנו לבנות אפליקציה טובה יותר 💙";
const ERROR_MSG = "אופס, ההודעה לא נשלחה. בדוק את החיבור ונסה שוב.";

const APP_VERSION = ((): string => {
  try {
    return (appConfig as { expo?: { version?: string } }).expo?.version ?? "unknown";
  } catch {
    return "unknown";
  }
})();

function TypingDots() {
  const reducedMotion = useReducedMotion();
  const d1 = useSharedValue(0);
  const d2 = useSharedValue(0);
  const d3 = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      d1.value = 0.6;
      d2.value = 0.6;
      d3.value = 0.6;
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

export function SupportChatScreen() {
  const router = useRouter();
  const safeInsets = useSafeAreaInsets();
  const email = useAuthStore((s) => s.email);
  const authId = email ?? "guest";

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setMessages([{ role: "assistant", content: INITIAL_MSG }]);
    }, 300);
    return () => clearTimeout(t);
  }, []);

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/more");
  }, [router]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || sent) return;
    tapHaptic();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const response = await fetch(`${getApiBase()}/api/support/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authId,
          email,
          message: text,
          platform: Platform.OS,
          appVersion: APP_VERSION,
        }),
      });
      if (!response.ok) throw new Error(`http_${response.status}`);
      successHaptic();
      // Small artificial delay so the typing-dot animation has time to read
      // as "Shark is replying" — feels less robotic than instant ack.
      setTimeout(() => {
        setMessages((prev) => [...prev, { role: "assistant", content: THANK_YOU_MSG }]);
        setLoading(false);
        setSent(true);
      }, 700);
    } catch {
      setLoading(false);
      setMessages((prev) => [...prev, { role: "assistant", content: ERROR_MSG }]);
      Alert.alert("שגיאה", "ההודעה לא נשלחה. נסה שוב או צור קשר באינסטגרם.");
    }
  }, [input, loading, sent, authId, email]);

  const canSend = !!input.trim() && !loading && !sent;

  return (
    <View style={{ flex: 1, backgroundColor: "#f0f9ff" }}>
      <KeyboardAvoidingView
        style={st.root}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <Animated.View
          entering={FadeIn.duration(200)}
          style={[st.header, { paddingTop: Math.max(safeInsets.top + 10, 44) }]}
        >
          <Pressable
            onPress={goBack}
            style={st.closeBtn}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="חזור"
          >
            <ArrowLeft size={22} color="#0e7490" />
          </Pressable>
          <View style={st.avatarHeader}>
            <ExpoImage source={FINN_STANDARD} style={st.avatarHeaderImage} contentFit="contain" />
          </View>
          <View style={st.headerTextWrap}>
            <Text style={st.headerTitle}>קפטן שארק — תמיכה</Text>
            <Text style={st.headerSub}>נחזור אליך תוך 48 שעות</Text>
          </View>
        </Animated.View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={st.messages}
          contentContainerStyle={st.messagesContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
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
              <View style={[st.bubble, msg.role === "user" ? st.userBubble : st.botBubble]}>
                <Text style={[st.bubbleText, msg.role === "user" ? st.userText : st.botText]}>
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

        {/* Input bar */}
        <View style={[st.inputBar, { paddingBottom: Math.max(safeInsets.bottom + 10, 16) }]}>
          <TextInput
            style={st.textInput}
            value={input}
            onChangeText={setInput}
            placeholder={sent ? "תודה! נחזור אליך." : "כתוב/י את ההודעה שלך..."}
            placeholderTextColor="#64748b"
            multiline
            maxLength={4000}
            editable={!sent}
            onSubmitEditing={sendMessage}
            accessibilityLabel="הודעת תמיכה"
          />
          <Pressable
            onPress={sendMessage}
            disabled={!canSend}
            accessibilityRole="button"
            accessibilityLabel="שלח הודעה"
            accessibilityState={{ disabled: !canSend }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[st.sendBtn, !canSend && st.sendBtnDisabled]}
          >
            <Send size={20} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
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
    borderBottomColor: "rgba(14,116,144,0.15)",
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
  headerTextWrap: {
    flex: 1,
    alignItems: "flex-end",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0e7490",
    writingDirection: "rtl",
  },
  headerSub: {
    fontSize: 12,
    fontWeight: "600",
    color: "#059669",
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
  bubble: {
    maxWidth: "78%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: "#0891b2",
    borderBottomLeftRadius: 4,
  },
  botBubble: {
    backgroundColor: "#ffffff",
    borderBottomRightRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(14,116,144,0.15)",
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
    writingDirection: "rtl",
    textAlign: "right",
  },
  userText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  botText: {
    color: "#0f172a",
    fontWeight: "500",
  },
  typingRow: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    minHeight: 18,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#0891b2",
  },
  inputBar: {
    flexDirection: "row-reverse",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderTopWidth: 1,
    borderTopColor: "rgba(14,116,144,0.15)",
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 140,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#bae6fd",
    borderRadius: 22,
    fontSize: 15,
    color: "#0f172a",
    writingDirection: "rtl",
    textAlign: "right",
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0891b2",
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 3,
    borderBottomColor: "#0e7490",
  },
  sendBtnDisabled: {
    backgroundColor: "#cbd5e1",
    borderBottomColor: "#94a3b8",
  },
});
