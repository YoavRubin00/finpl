import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Send, X, MessageCircle } from 'lucide-react-native';

import { STITCH } from '../../../constants/theme';
import { tapHaptic } from '../../../utils/haptics';
import { postChatMessage } from '../dailyNewsChallengeApi';
import type { ChatTurn } from '../types';

interface ItemChatOverlayProps {
  visible: boolean;
  itemContext: string;
  itemHeadline: string;
  onClose: () => void;
}

/**
 * Minimal item-scoped chat overlay. AI mentor answers follow-up questions
 * about ONE specific news item (server gets `itemContext` as system prompt).
 *
 * Persistence: history is local to the overlay instance — closing wipes it.
 * This is intentional — keeps the AI focused on the current item.
 */
export function ItemChatOverlay({ visible, itemContext, itemHeadline, onClose }: ItemChatOverlayProps): React.ReactElement | null {
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    tapHaptic();
    setInput('');
    const userTurn: ChatTurn = { role: 'user', text, ts: Date.now() };
    setHistory((prev) => [...prev, userTurn]);
    setLoading(true);
    try {
      const reply = await postChatMessage({
        itemContext,
        history,
        message: text,
      });
      setHistory((prev) => [...prev, { role: 'assistant', text: reply, ts: Date.now() }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'תקלה בקבלת תשובה. נסה שוב.';
      setHistory((prev) => [...prev, { role: 'assistant', text: `⚠️ ${msg}`, ts: Date.now() }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [input, loading, itemContext, history]);

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(180)}
      style={styles.overlay}
    >
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="סגור צ'אט" />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 8, 16) }]}>
        {/* Header — JSX order is X → title → MessageCircle. Inside a
            flexDirection: 'row-reverse' parent that resolves to:
            X visually on the RIGHT, MessageCircle visually on the LEFT
            (user spec 2026-06-01: dismiss affordance belongs at the
            trailing edge of Hebrew RTL reading, icon decoration at the
            leading edge). */}
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="סגור">
            <X size={18} color={STITCH.onSurfaceVariant} strokeWidth={2.4} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} allowFontScaling={false}>שאל את הקפטן שארק</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1} allowFontScaling={false}>
              {itemHeadline}
            </Text>
          </View>
          <View style={styles.headerIconWrap}>
            <MessageCircle size={20} color={STITCH.primary} strokeWidth={2.4} />
          </View>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          // Explicit offset = 0 so the KAV's bottom padding equals the
          // raw keyboard height. Without this prop the default offset
          // can be off-by-a-status-bar on iOS, leaving the input partly
          // hidden under the keyboard (user report 2026-06-01: "המקלדת
          // מסתירה את החלונית"). Since this sheet sits flush at the
          // screen bottom (justifyContent: flex-end parent) the KAV's
          // local top == the sheet's top, so 0 is the correct anchor.
          keyboardVerticalOffset={0}
          style={{ flex: 1 }}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.messages}
            contentContainerStyle={styles.messagesContent}
            keyboardShouldPersistTaps="handled"
          >
            {history.length === 0 && (
              <View style={styles.emptyHint}>
                <Text style={styles.emptyHintText} allowFontScaling={false}>
                  💡 תוכל לשאול: "למה זה קרה?", "איך זה משפיע עליי?", "מה ההיסטוריה הדומה?"
                </Text>
              </View>
            )}
            {history.map((turn, idx) => (
              <View
                key={idx}
                style={[styles.bubble, turn.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}
              >
                <Text
                  style={[styles.bubbleText, turn.role === 'user' && { color: '#fff' }]}
                  allowFontScaling={false}
                >
                  {turn.text}
                </Text>
              </View>
            ))}
            {loading && (
              <View style={[styles.bubble, styles.bubbleAssistant]}>
                <ActivityIndicator size="small" color={STITCH.primary} />
              </View>
            )}
          </ScrollView>

          {/* Input */}
          <View style={styles.inputRow}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="הקלד שאלה..."
              placeholderTextColor="#94a3b8"
              style={styles.input}
              multiline
              maxLength={500}
              accessibilityLabel="הקלד שאלה לקפטן שארק"
              editable={!loading}
            />
            <Pressable
              onPress={handleSend}
              disabled={!input.trim() || loading}
              style={[styles.sendBtn, (!input.trim() || loading) && { opacity: 0.4 }]}
              accessibilityRole="button"
              accessibilityLabel="שלח"
            >
              <Send size={18} color="#fff" strokeWidth={2.6} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 1200,
    justifyContent: 'flex-end',
    ...(Platform.OS === 'web' ? { position: 'fixed' as 'absolute' } : {}),
  },
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.55)',
  },
  sheet: {
    // Explicit pixel height — percentage min/maxHeight inside a
    // justifyContent:'flex-end' parent was collapsing to content height
    // (~200px) which hid the KeyboardAvoidingView + input row entirely.
    // 70% of screen guarantees the input row is visible above the keyboard
    // and the messages ScrollView has room to grow.
    height: Math.round(SCREEN_HEIGHT * 0.7),
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: STITCH.surfaceHighest,
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
    textAlign: 'right',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: STITCH.surfaceLow,
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    padding: 12,
    gap: 8,
  },
  emptyHint: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyHintText: {
    fontSize: 13,
    fontWeight: '600',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  bubble: {
    maxWidth: '85%',
    padding: 10,
    borderRadius: 14,
  },
  bubbleUser: {
    alignSelf: 'flex-start',
    backgroundColor: STITCH.primary,
    borderBottomLeftRadius: 4,
  },
  bubbleAssistant: {
    alignSelf: 'flex-end',
    backgroundColor: STITCH.surfaceLow,
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontSize: 13,
    fontWeight: '600',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
    textAlign: 'right',
    lineHeight: 19,
  },
  inputRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: STITCH.surfaceHighest,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: STITCH.surfaceLow,
    fontSize: 14,
    color: STITCH.onSurface,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: STITCH.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
