import React, { useCallback, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Image as ExpoImage } from 'expo-image';
import { Paperclip, Send } from 'lucide-react-native';

import { TypingDots } from '../../../components/ui/TypingDots';
import { FINN_TALKING } from '../../retention-loops/finnMascotConfig';
import { tapHaptic } from '../../../utils/haptics';
import { streamChatRequest } from '../../../utils/streamChat';
import type { PayslipResult } from '../types';

interface PayslipChatProps {
  result: PayslipResult;
  fileName?: string;
  /** Fired when the chat input gains focus. The parent screen uses this to
   *  scroll its outer ScrollView so the input bar lands above the keyboard. */
  onInputFocus?: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const STARTER_QUESTIONS: readonly string[] = [
  'מה הניכויים העיקריים שלי?',
  'האם יש לי תשלום חסר או חריג?',
  'כמה אני מפריש לפנסיה החודש?',
];

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

/**
 * Dedicated chat panel that opens below a successful payslip analysis.
 *
 * Reuses the existing `/api/ai/chat` streaming endpoint (no new server route).
 * The "attached document" the user sees referenced in the header chip is
 * actually the parsed `PayslipResult` JSON — that's what's stuffed into the
 * system prompt, since Gemini already extracted everything structured from
 * the original image. Avoids a second multimodal round-trip and keeps every
 * chat turn cheap.
 *
 * Styling mirrors [ChatScreen.tsx:889-1012](src/features/chat/ChatScreen.tsx#L889)
 * deliberately — bubble shapes, input bar, send button, starter chips — so
 * the experience feels continuous with the main app chat.
 */
export function PayslipChat({ result, fileName, onInputFocus }: PayslipChatProps): React.ReactElement {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  const buildSystemPrompt = useCallback((): string => {
    const compact = {
      payPeriod: result.payPeriod,
      brutto: result.brutto,
      netto: result.netto,
      totalDeductions: result.totalDeductions,
      deductions: result.deductions.map((d) => ({
        kind: d.kind,
        label: d.label,
        amount: d.amount,
      })),
      metrics: result.metrics.map((m) => ({
        kind: m.kind,
        label: m.label,
        value: m.value,
        unit: m.unit,
      })),
      anomalies: result.anomalies.map((a) => ({
        severity: a.severity,
        title: a.title,
        description: a.description,
        suggestion: a.suggestion,
      })),
      sharkSummary: result.sharkSummary,
      actionItems: result.actionItems,
    };
    return [
      'אתה שארק, אנליסט שכר ישראלי, חבר טוב שמסביר בעברית פשוטה וברורה.',
      'ענה בקצר וישיר (2-4 משפטים), עם דוגמאות מספריות מהתלוש הספציפי הזה.',
      'ענה רק על בסיס הנתונים שצורפו למטה. אל תמציא מספרים שאינם כתובים שם.',
      'אם המשתמש שואל על נושא שאין עליו מידע בתלוש — אמור בכנות "זה לא מופיע בתלוש".',
      '',
      'נתוני תלוש השכר של המשתמש (JSON):',
      JSON.stringify(compact),
    ].join('\n');
  }, [result]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;
      tapHaptic();
      const now = Date.now();
      const userMessage: ChatMessage = { role: 'user', content: trimmed, timestamp: now };
      const nextMessages: ChatMessage[] = [...messages, userMessage];
      setMessages(nextMessages);
      setInput('');
      setLoading(true);

      // Append a placeholder assistant bubble that we mutate as chunks arrive.
      const assistantStamp = now + 1;
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '', timestamp: assistantStamp },
      ]);

      const history = nextMessages.map((m) => ({
        role: (m.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
        content: m.content,
      }));

      const res = await streamChatRequest(
        { systemPrompt: buildSystemPrompt(), messages: history, maxOutputTokens: 600 },
        (chunk) => {
          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.timestamp === assistantStamp);
            if (idx === -1) return prev;
            const updated = [...prev];
            updated[idx] = { ...updated[idx], content: updated[idx].content + chunk };
            return updated;
          });
        },
      );

      if (!res.ok) {
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.timestamp === assistantStamp);
          if (idx === -1) return prev;
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            content: res.error ?? 'שגיאת רשת. נסה שוב.',
          };
          return updated;
        });
      }

      setLoading(false);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    },
    [buildSystemPrompt, loading, messages],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, RTL]} allowFontScaling={false}>
          שאל את שארק על התלוש שלך
        </Text>
        {fileName ? (
          <View style={styles.attachmentChip}>
            <Paperclip size={12} color="#0369a1" strokeWidth={2.4} />
            <Text style={styles.attachmentText} numberOfLines={1} allowFontScaling={false}>
              מצורף: {fileName}
            </Text>
          </View>
        ) : null}
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 ? (
          <View style={styles.starterIntro}>
            <Text style={[styles.starterIntroText, RTL]} allowFontScaling={false}>
              לא בטוח מה לשאול? התחל מאחת השאלות הבאות:
            </Text>
          </View>
        ) : null}

        {messages.map((msg) => {
          const isBot = msg.role === 'assistant';
          const isEmpty = isBot && msg.content.length === 0;
          return (
            <Animated.View
              key={msg.timestamp}
              entering={FadeIn.duration(160)}
              style={[
                styles.messageRow,
                isBot ? styles.messageRowBot : styles.messageRowUser,
              ]}
            >
              {isBot ? (
                <View style={styles.avatarCircle}>
                  <ExpoImage
                    source={FINN_TALKING}
                    style={{ width: 22, height: 22 }}
                    contentFit="contain"
                    accessible={false}
                  />
                </View>
              ) : null}
              <View style={[styles.bubble, isBot ? styles.botBubble : styles.userBubble]}>
                {isEmpty ? (
                  <TypingDots />
                ) : (
                  <Text style={[isBot ? styles.botText : styles.userText, RTL]}>
                    {'⁧' + msg.content + '⁩'}
                  </Text>
                )}
              </View>
            </Animated.View>
          );
        })}
      </ScrollView>

      {messages.length === 0 ? (
        <View style={styles.chipRow}>
          {STARTER_QUESTIONS.map((q) => (
            <Pressable
              key={q}
              onPress={() => void sendMessage(q)}
              style={({ pressed }) => [
                styles.chip,
                q.length > 28 && styles.chipLong,
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={q}
            >
              <Text
                style={styles.chipText}
                allowFontScaling={false}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {q}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.inputBar}>
        <View style={styles.inputWrapper}>
          <TextInput
            value={input}
            onChangeText={setInput}
            editable={!loading}
            placeholder="שאל שאלה על התלוש שלך…"
            placeholderTextColor="#94a3b8"
            multiline
            maxLength={500}
            style={[styles.textInput, RTL]}
            accessibilityLabel="שאלה לשארק על התלוש"
            onFocus={onInputFocus}
          />
        </View>
        <Pressable
          onPress={() => void sendMessage(input)}
          disabled={!input.trim() || loading}
          accessibilityRole="button"
          accessibilityLabel="שלח"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[
            styles.sendButton,
            (!input.trim() || loading) && styles.sendButtonDisabled,
          ]}
        >
          <Send size={18} color={input.trim() && !loading ? '#ffffff' : '#94a3b8'} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    gap: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0c4a6e',
  },
  attachmentChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    maxWidth: 180,
  },
  attachmentText: {
    color: '#0369a1',
    fontSize: 11,
    fontWeight: '700',
    writingDirection: 'rtl',
  },
  scroll: {
    maxHeight: 360,
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 12,
  },
  starterIntro: {
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  starterIntroText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'flex-end',
    paddingHorizontal: 8,
  },
  messageRowBot: {
    justifyContent: 'flex-end',
  },
  messageRowUser: {
    justifyContent: 'flex-start',
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    overflow: 'hidden',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
  },
  botBubble: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderTopRightRadius: 4,
  },
  userBubble: {
    backgroundColor: '#ede9fe',
    borderTopLeftRadius: 4,
  },
  botText: {
    color: '#1f2937',
    fontSize: 14,
    lineHeight: 22,
  },
  userText: {
    color: '#1f2937',
    fontSize: 14,
    lineHeight: 22,
  },
  chipRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  chip: {
    flex: 1,
    minHeight: 56,
    borderWidth: 1.5,
    borderColor: '#bae6fd',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9ff',
    overflow: 'hidden',
  },
  chipLong: {
    flex: 1.5,
  },
  chipText: {
    color: '#1e3a5f',
    fontSize: 12,
    fontWeight: '600',
    writingDirection: 'rtl',
    textAlign: 'center',
    lineHeight: 16,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#22d3ee',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  textInput: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#1f2937',
    fontSize: 14,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0ea5e9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#e5e7eb',
    shadowOpacity: 0,
  },
});
