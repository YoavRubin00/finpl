import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Send, Lock } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { tapHaptic, successHaptic } from '../../utils/haptics';
import { useAuthStore } from '../auth/useAuthStore';
import { useChapterUIStore } from '../chapter-1-content/useChapterUIStore';
import { useProgress } from '../chapter-1-content/useProgress';
import { useIsPro } from '../subscription/useSubscription';
import { buildSystemPrompt } from '../chat/buildChatPrompt';
import { getModuleChatFAQs } from './moduleChatFAQs';
import { useTopicChatLimitStore, DAILY_LIMIT } from './useTopicChatLimitStore';
import { chapter0Data } from '../chapter-0-content/chapter0Data';
import { chapter1Data } from '../chapter-1-content/chapter1Data';
import { chapter2Data } from '../chapter-2-content/chapter2Data';
import { chapter3Data } from '../chapter-3-content/chapter3Data';
import { chapter4Data } from '../chapter-4-content/chapter4Data';
import { chapter5Data } from '../chapter-5-content/chapter5Data';
import { COMPANION_PERSONALITIES as COMPANIONS } from '../chat/chatData';
import type { CompanionId } from '../auth/types';

const ALL_CHAPTERS = [chapter0Data, chapter1Data, chapter2Data, chapter3Data, chapter4Data, chapter5Data];

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };
const SCREEN_W = Dimensions.get('window').width;

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

/**
 * Dedicated topic-scoped chat screen. Reached from the topic-tree
 * `chat` chip — distinct from the global ChatScreen so the surface
 * stays minimal: a header with the module title, 2 preset FAQs as tap
 * chips, an input bar, and a daily 2-message limit that converts to a
 * Pro upgrade prompt. Yoav R6 2026-06-10: "צריך להפתח כמסך יעודי...
 * שיהיה מוגבל, ולאחר 2 הודעות ביום יקרא לשדרג לפרו".
 */
export function TopicChatScreen(): React.ReactElement {
  const params = useLocalSearchParams<{ moduleId?: string }>();
  const router = useRouter();
  const moduleId = String(params.moduleId ?? '');
  const isPro = useIsPro();
  const profile = useAuthStore((s) => s.profile);
  const displayName = useAuthStore((s) => s.displayName) ?? '';
  const currentChapterId = useChapterUIStore((s) => s.currentChapterId);
  const { data: progressData } = useProgress();
  const allCompletedModules = useMemo(
    () => (progressData ?? []).filter((m) => m.status === 'completed').map((m) => m.moduleId),
    [progressData],
  );

  const remaining = useTopicChatLimitStore((s) => s.remainingToday());
  const recordSend = useTopicChatLimitStore((s) => s.recordSend);

  const moduleInfo = useMemo(() => {
    for (const ch of ALL_CHAPTERS) {
      const mod = ch.modules.find((m) => m.id === moduleId);
      if (mod) return { module: mod, chapterId: ch.id };
    }
    return null;
  }, [moduleId]);

  const presetQuestions = useMemo(() => getModuleChatFAQs(moduleId) ?? [], [moduleId]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const companionId: CompanionId = profile?.companionId ?? 'warren-buffett';
  const companion = COMPANIONS[companionId];

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    if (!isPro && remaining <= 0) return;
    tapHaptic();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setLoading(true);
    if (!isPro) recordSend();
    try {
      const systemPrompt = buildSystemPrompt(
        displayName,
        profile ?? ({} as never),
        companionId,
        allCompletedModules,
        currentChapterId,
        undefined,
        moduleInfo
          ? {
              moduleId,
              moduleTitle: moduleInfo.module.title,
              phase: 'other' as const,
            }
          : undefined,
      );
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          system: systemPrompt,
          messages: [...messages, { role: 'user', content: trimmed }].map((m) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: 'text' in m ? m.text : (m as { content: string }).content,
          })),
        }),
      });
      const json = (await res.json()) as { text?: string; error?: string };
      const reply = json.text ?? 'אופס, משהו השתבש. ננסה שוב?';
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
      successHaptic();
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'בעיית חיבור. ננסה שוב בעוד דקה?' },
      ]);
    } finally {
      setLoading(false);
    }
  }, [
    loading,
    isPro,
    remaining,
    recordSend,
    displayName,
    profile,
    companionId,
    allCompletedModules,
    currentChapterId,
    moduleInfo,
    moduleId,
    messages,
  ]);

  if (!moduleInfo) {
    return (
      <SafeAreaView style={styles.fullScreen} edges={['top', 'bottom']}>
        <Text style={[styles.title, RTL]} allowFontScaling={false}>
          המודולה לא נמצאה
        </Text>
      </SafeAreaView>
    );
  }

  const limitHit = !isPro && remaining <= 0;

  return (
    <SafeAreaView style={styles.fullScreen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="חזרה"
          >
            <ChevronLeft size={24} color="#0c4a6e" strokeWidth={2.6} />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={[styles.title, RTL]} allowFontScaling={false} numberOfLines={1}>
              צ׳אט עם {companion?.name ?? 'המומחה'}
            </Text>
            <Text style={[styles.subtitle, RTL]} allowFontScaling={false} numberOfLines={1}>
              {moduleInfo.module.title}
            </Text>
          </View>
        </View>

        {/* Messages + preset chips */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 && (
            <Animated.View entering={FadeIn.duration(360)} style={styles.welcomeWrap}>
              <Text style={[styles.welcome, RTL]} allowFontScaling={false}>
                {`שלום, אני כאן בשביל לעזור לך עם הנושא של "${moduleInfo.module.title}". אפשר ללחוץ על אחת מהשאלות הנפוצות או לכתוב שאלה משלך.`}
              </Text>
            </Animated.View>
          )}
          {messages.map((m, idx) => (
            <View
              key={idx}
              style={[
                styles.bubble,
                m.role === 'user' ? styles.userBubble : styles.botBubble,
              ]}
            >
              <Text
                style={[
                  m.role === 'user' ? styles.userText : styles.botText,
                  RTL,
                ]}
                allowFontScaling={false}
              >
                {m.text}
              </Text>
            </View>
          ))}
          {loading && (
            <View style={[styles.bubble, styles.botBubble]}>
              <ActivityIndicator color="#0c4a6e" />
            </View>
          )}
        </ScrollView>

        {/* Preset chips — only shown before the first send */}
        {messages.length === 0 && presetQuestions.length > 0 && (
          <View style={styles.presetWrap}>
            {presetQuestions.slice(0, 2).map((q) => (
              <Pressable
                key={q}
                onPress={() => sendMessage(q)}
                style={styles.presetChip}
                disabled={loading || limitHit}
                accessibilityRole="button"
                accessibilityLabel={q}
              >
                <Text style={[styles.presetChipText, RTL]} allowFontScaling={false}>
                  {q}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Limit banner or input */}
        {limitHit ? (
          <View style={styles.limitWrap}>
            <Lock size={20} color="#7c2d12" strokeWidth={2.4} />
            <Text style={[styles.limitText, RTL]} allowFontScaling={false}>
              הגעת ל-{DAILY_LIMIT} הודעות היום
            </Text>
            <Pressable
              onPress={() => {
                tapHaptic();
                router.push('/pricing' as never);
              }}
              style={styles.upgradeBtn}
              accessibilityRole="button"
              accessibilityLabel="שדרג ל-Pro"
            >
              <Text style={styles.upgradeText} allowFontScaling={false}>
                שדרג ל-Pro
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.inputBar}>
            <Pressable
              onPress={() => sendMessage(input)}
              style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
              disabled={!input.trim() || loading}
              accessibilityRole="button"
              accessibilityLabel="שלח"
            >
              <Send size={20} color="#ffffff" strokeWidth={2.6} />
            </Pressable>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="כתוב שאלה..."
              placeholderTextColor="#94a3b8"
              style={[styles.input, RTL]}
              multiline
              maxLength={300}
              editable={!loading}
              onSubmitEditing={() => sendMessage(input)}
              blurOnSubmit
            />
          </View>
        )}

        {!isPro && !limitHit && (
          <Text style={[styles.quotaHint, RTL]} allowFontScaling={false}>
            {`נותרו לך ${remaining} שאלות היום`}
          </Text>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: '#f0f9ff',
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0f2fe',
    backgroundColor: '#ffffff',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0c4a6e',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0369a1',
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  welcomeWrap: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  welcome: {
    fontSize: 15,
    color: '#0c4a6e',
    lineHeight: 22,
    fontWeight: '600',
  },
  bubble: {
    maxWidth: SCREEN_W * 0.85,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#0c4a6e',
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  userText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  botText: {
    color: '#0c4a6e',
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
  },
  presetWrap: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  presetChip: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#7dd3fc',
  },
  presetChipText: {
    color: '#0369a1',
    fontSize: 14,
    fontWeight: '700',
  },
  inputBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0f2fe',
  },
  input: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0c4a6e',
    fontWeight: '600',
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0ea5e9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#94a3b8',
  },
  limitWrap: {
    backgroundColor: '#fff7ed',
    borderTopWidth: 1,
    borderTopColor: '#fdba74',
    padding: 16,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  limitText: {
    flex: 1,
    color: '#7c2d12',
    fontWeight: '800',
    fontSize: 14,
  },
  upgradeBtn: {
    backgroundColor: '#7c2d12',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  upgradeText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 14,
  },
  quotaHint: {
    color: '#0369a1',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 6,
    backgroundColor: '#ffffff',
    writingDirection: 'rtl',
  },
});
