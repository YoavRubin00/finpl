import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Send, Lock } from 'lucide-react-native';
import { Image as ExpoImage } from 'expo-image';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { LottieIcon } from '../../components/ui/LottieIcon';
import { FINN_STANDARD } from '../retention-loops/finnMascotConfig';
import { tapHaptic, successHaptic } from '../../utils/haptics';
import { useAuthStore } from '../auth/useAuthStore';
import { useChapterUIStore } from '../chapter-1-content/useChapterUIStore';
import { useProgress } from '../chapter-1-content/useProgress';
import { useIsPro } from '../subscription/useSubscription';
import { buildSystemPrompt } from '../chat/buildChatPrompt';
import { getModuleChatFAQs, getDefaultFAQsForTitle } from './moduleChatFAQs';
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

interface Message {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

/**
 * Dedicated, topic-scoped chat. Mirrors the main ChatScreen's
 * WhatsApp-style look (companion avatar header, Finn bot bubbles,
 * suggestion chips, send bar) but lives at its own route so the
 * surface stays focused: pre-baked module FAQs + free-tier daily
 * 2-message gate that converts to a Pro upsell. Yoav R6 2026-06-10:
 * "צריך להפתח כמסך יעודי... שיראה כמו מסך הצאט, אבל שלא יוביל אל
 * מסך הצאט אלא אל צאט יעודי".
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

  // Curated FAQs first, fall back to title-anchored defaults so EVERY
  // module that opens a chat shows relevant suggested questions even
  // before the registry is fully curated (Yoav R6 2026-06-10: "שיופיע
  // פשוט לכל מודולה שפותחים צאט שאלות על המודולה רלוונטיות").
  const presetQuestions = useMemo(() => {
    const curated = getModuleChatFAQs(moduleId);
    if (curated && curated.length > 0) return curated;
    if (moduleInfo) return getDefaultFAQsForTitle(moduleInfo.module.title);
    return [];
  }, [moduleId, moduleInfo]);

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
    const userMsg: Message = { role: 'user', text: trimmed, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    if (!isPro) recordSend();
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
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
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.text,
          })),
        }),
      });
      const json = (await res.json()) as { text?: string; error?: string };
      const reply = json.text ?? 'אופס, משהו השתבש. ננסה שוב?';
      setMessages((prev) => [...prev, { role: 'assistant', text: reply, timestamp: Date.now() }]);
      successHaptic();
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'בעיית חיבור. ננסה שוב בעוד דקה?', timestamp: Date.now() },
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
      <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={rtl.text} allowFontScaling={false}>המודולה לא נמצאה</Text>
        </SafeAreaView>
      </View>
    );
  }

  const limitHit = !isPro && remaining <= 0;
  const formatTime = (ts: number): string => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }} keyboardVerticalOffset={0}>
          {/* WhatsApp-style header — companion avatar + name + status */}
          <View style={headerStyles.container}>
            <View style={headerStyles.row}>
              <Pressable
                onPress={() => router.back()}
                style={headerStyles.backBtn}
                accessibilityRole="button"
                accessibilityLabel="חזרה"
                hitSlop={10}
              >
                <ChevronLeft size={24} color="#0e7490" strokeWidth={2.6} />
              </Pressable>
              <View style={headerStyles.avatarCircle}>
                {companion.headerImage
                  ? <ExpoImage source={companion.headerImage} style={{ width: 36, height: 36 }} contentFit="contain" accessible={false} />
                  : companion.headerLottie
                    ? <View><LottieIcon source={companion.headerLottie} size={36} autoPlay loop /></View>
                    : <Text style={headerStyles.avatarEmoji}>{companion.emoji}</Text>}
              </View>
              <View style={headerStyles.info}>
                <Text style={headerStyles.name} allowFontScaling={false}>{companion.name}</Text>
                <Text style={headerStyles.status} allowFontScaling={false} numberOfLines={1}>
                  {loading ? 'מקליד...' : moduleInfo.module.title}
                </Text>
              </View>
            </View>
          </View>

          {/* Messages */}
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={msgStyles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {messages.length === 0 && (
              <Animated.View entering={FadeInDown.duration(360)} style={msgStyles.welcomeRow}>
                <View style={msgStyles.avatarCircle}>
                  <ExpoImage
                    source={FINN_STANDARD}
                    style={{ width: 22, height: 22 }}
                    contentFit="contain"
                    accessible={false}
                  />
                </View>
                <View style={[msgStyles.bubble, msgStyles.botBubble]}>
                  <Text style={[msgStyles.botText, rtl.text]} allowFontScaling={false}>
                    {`שלום! אני כאן בשביל לעזור לך עם הנושא של "${moduleInfo.module.title}". בחר אחת מהשאלות הנפוצות, או כתוב שאלה משלך 👇`}
                  </Text>
                </View>
              </Animated.View>
            )}
            {messages.map((msg, idx) => {
              const isBot = msg.role === 'assistant';
              return (
                <View
                  key={idx}
                  style={[
                    msgStyles.messageRow,
                    isBot ? msgStyles.messageRowBot : msgStyles.messageRowUser,
                  ]}
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
                    ]}
                  >
                    <Text
                      style={[
                        isBot ? msgStyles.botText : msgStyles.userText,
                        rtl.text,
                      ]}
                      allowFontScaling={false}
                    >
                      {isBot ? msg.text : `\u2067${msg.text}\u2069`}
                    </Text>
                    <View style={msgStyles.metaRow}>
                      <Text style={msgStyles.timestamp} allowFontScaling={false}>
                        {formatTime(msg.timestamp)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
            {loading && (
              <View style={[msgStyles.messageRow, msgStyles.messageRowBot]}>
                <View style={msgStyles.avatarCircle}>
                  <ExpoImage source={FINN_STANDARD} style={{ width: 22, height: 22 }} contentFit="contain" accessible={false} />
                </View>
                <View style={[msgStyles.bubble, msgStyles.botBubble, { paddingVertical: 14 }]}>
                  <ActivityIndicator color="#0e7490" />
                </View>
              </View>
            )}
          </ScrollView>

          {/* Preset FAQ chips — only before the first send */}
          {messages.length === 0 && presetQuestions.length > 0 && (
            <Animated.View entering={FadeIn.delay(200).duration(300)} style={chipStyles.container}>
              {presetQuestions.slice(0, 2).map((q) => (
                <Pressable
                  key={q}
                  onPress={() => sendMessage(q)}
                  style={chipStyles.chip}
                  disabled={loading || limitHit}
                  accessibilityRole="button"
                  accessibilityLabel={q}
                >
                  <Text style={chipStyles.chipText} numberOfLines={2} allowFontScaling={false}>{q}</Text>
                </Pressable>
              ))}
            </Animated.View>
          )}

          {/* Limit banner or input bar */}
          {limitHit ? (
            <View style={limitStyles.wrap}>
              <Lock size={20} color="#7c2d12" strokeWidth={2.4} />
              <View style={{ flex: 1 }}>
                <Text style={[limitStyles.title, rtl.text]} allowFontScaling={false}>
                  {`הגעת ל-${DAILY_LIMIT} השאלות החינמיות של היום`}
                </Text>
                <Text style={[limitStyles.subtitle, rtl.text]} allowFontScaling={false}>
                  שדרוג ל-Pro מסיר את ההגבלה
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  tapHaptic();
                  router.push('/pricing' as never);
                }}
                style={limitStyles.upgradeBtn}
                accessibilityRole="button"
                accessibilityLabel="שדרג ל-Pro"
              >
                <Text style={limitStyles.upgradeText} allowFontScaling={false}>שדרג</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={inputStyles.bar}>
                <Pressable
                  onPress={() => sendMessage(input)}
                  style={[inputStyles.sendBtn, (!input.trim() || loading) && inputStyles.sendBtnDisabled]}
                  disabled={!input.trim() || loading}
                  accessibilityRole="button"
                  accessibilityLabel="שלח"
                  hitSlop={6}
                >
                  <Send size={20} color="#ffffff" strokeWidth={2.6} />
                </Pressable>
                <TextInput
                  value={input}
                  onChangeText={setInput}
                  placeholder="כתוב שאלה..."
                  placeholderTextColor="#94a3b8"
                  style={[inputStyles.input, rtl.text]}
                  multiline
                  maxLength={300}
                  editable={!loading}
                  onSubmitEditing={() => sendMessage(input)}
                  blurOnSubmit
                />
              </View>
              {!isPro && (
                <Text style={[inputStyles.quotaHint, rtl.text]} allowFontScaling={false}>
                  {`נותרו לך ${remaining} שאלות חינמיות היום`}
                </Text>
              )}
            </>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const rtl = StyleSheet.create({
  text: { writingDirection: 'rtl', textAlign: 'right' },
});

const headerStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0891b2',
  },
  avatarEmoji: { fontSize: 20 },
  info: { flex: 1, alignItems: 'flex-end' },
  name: { fontSize: 16, fontWeight: '700', color: '#0e7490', writingDirection: 'rtl' },
  status: { fontSize: 12, color: '#059669', writingDirection: 'rtl' },
});

const msgStyles = StyleSheet.create({
  scrollContent: { flexGrow: 1, paddingTop: 12, paddingBottom: 8 },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'flex-end',
    paddingHorizontal: 4,
  },
  messageRowBot: { justifyContent: 'flex-end' },
  messageRowUser: { justifyContent: 'flex-start' },
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
  bubble: { maxWidth: '82%', borderRadius: 16, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8 },
  botBubble: { backgroundColor: '#f1f5f9', borderTopRightRadius: 4 },
  userBubble: { backgroundColor: '#ede9fe', borderTopLeftRadius: 4 },
  botText: { color: '#1f2937', fontSize: 14, lineHeight: 22 },
  userText: { color: '#1f2937', fontSize: 14, lineHeight: 22 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 3, marginTop: 2, paddingBottom: 2 },
  timestamp: { fontSize: 10, color: '#64748b' },
});

const chipStyles = StyleSheet.create({
  container: {
    flexDirection: 'row-reverse',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  chip: {
    flex: 1,
    backgroundColor: '#ecfeff',
    borderWidth: 1.5,
    borderColor: '#67e8f9',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 56,
    justifyContent: 'center',
  },
  chipText: {
    color: '#0e7490',
    fontSize: 13,
    fontWeight: '700',
    writingDirection: 'rtl',
    textAlign: 'center',
  },
});

const inputStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  input: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '500',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0e7490',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#94a3b8' },
  quotaHint: {
    color: '#0e7490',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 4,
    backgroundColor: '#ffffff',
  },
});

const limitStyles = StyleSheet.create({
  wrap: {
    backgroundColor: '#fff7ed',
    borderTopWidth: 1,
    borderTopColor: '#fdba74',
    padding: 16,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  title: { color: '#7c2d12', fontWeight: '900', fontSize: 13 },
  subtitle: { color: '#9a3412', fontWeight: '600', fontSize: 11, marginTop: 2 },
  upgradeBtn: {
    backgroundColor: '#7c2d12',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  upgradeText: { color: '#ffffff', fontWeight: '900', fontSize: 14 },
});
