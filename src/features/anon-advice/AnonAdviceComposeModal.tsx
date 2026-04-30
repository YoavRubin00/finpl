import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  Pressable,
  ScrollView,
  Image,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAnonAdviceStore } from './useAnonAdviceStore';
import {
  MIN_SITUATION_LENGTH,
  MAX_SITUATION_LENGTH,
  MIN_QUESTION_LENGTH,
  MAX_QUESTION_LENGTH,
  MAX_OPTION_LENGTH,
  clientFallbackModerate,
} from './anonAdviceData';
import { PendingModerationOverlay } from './components/PendingModerationOverlay';
import { DUO } from '../../constants/theme';
import { A } from './strings';
import type { ModerationResult, RephraseResult } from './anonAdviceTypes';

interface AnonAdviceComposeModalProps {
  visible: boolean;
  onClose: () => void;
  onPosted?: (postId: string, reward: { coins: number; xp: number; firstBonus: boolean } | null) => void;
}

function pickImageWeb(): Promise<string | null> {
  return new Promise((resolve) => {
    const g = globalThis as unknown as {
      document?: {
        createElement: (tag: string) => {
          type: string;
          accept: string;
          onchange: () => void;
          click: () => void;
          files?: { [index: number]: unknown; length: number } | null;
        };
      };
      FileReader?: new () => {
        result: string | ArrayBuffer | null;
        onload: () => void;
        onerror: () => void;
        readAsDataURL: (f: unknown) => void;
      };
    };
    if (Platform.OS !== 'web' || !g.document || !g.FileReader) {
      resolve(null);
      return;
    }
    const input = g.document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new g.FileReader!();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };
    input.click();
  });
}

export function AnonAdviceComposeModal({ visible, onClose, onPosted }: AnonAdviceComposeModalProps): React.ReactElement {
  const submitPost = useAnonAdviceStore((s) => s.submitPost);
  const canPostToday = useAnonAdviceStore((s) => s.canPostToday);

  const [situation, setSituation] = useState('');
  const [question, setQuestion] = useState('');
  const [option1, setOption1] = useState('');
  const [option2, setOption2] = useState('');
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [moderating, setModerating] = useState(false);
  const [rephrasing, setRephrasing] = useState(false);
  const [originalDraft, setOriginalDraft] = useState<{ s: string; q: string; o1: string; o2: string } | null>(null);
  const [rejection, setRejection] = useState<string | null>(null);

  const reset = useCallback(() => {
    setSituation('');
    setQuestion('');
    setOption1('');
    setOption2('');
    setImageUri(undefined);
    setError(null);
    setOriginalDraft(null);
    setRejection(null);
  }, []);

  function handleClose(): void {
    if (moderating || rephrasing) return;
    reset();
    onClose();
  }

  async function handlePickImage(): Promise<void> {
    if (Platform.OS === 'web') {
      const dataUrl = await pickImageWeb();
      if (dataUrl) setImageUri(dataUrl);
    } else {
      Alert.alert('בקרוב', 'העלאת תמונה ממכשיר תהיה זמינה בעדכון הבא. כרגע ניתן להעלות מהדפדפן.');
    }
  }

  async function handleRephrase(): Promise<void> {
    if (rephrasing || moderating) return;
    if (situation.trim().length < 20) {
      setError('כדי לנסח מחדש, התיאור צריך להיות לפחות 20 תווים.');
      return;
    }
    setError(null);
    setOriginalDraft({ s: situation, q: question, o1: option1, o2: option2 });
    setRephrasing(true);
    try {
      const res = await fetch('/api/anon-advice/rephrase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          situation,
          question,
          options: [option1, option2].filter((o) => o.trim().length > 0),
        }),
      });
      const data = (await res.json()) as RephraseResult;
      if (data.ok) {
        if (data.situation) setSituation(data.situation);
        if (data.question) setQuestion(data.question);
        if (Array.isArray(data.options)) {
          setOption1(data.options[0] ?? '');
          setOption2(data.options[1] ?? '');
        }
      } else {
        setError(data.error ?? 'הניסוח נכשל. נסו שוב.');
        setOriginalDraft(null);
      }
    } catch {
      setError('בעיית רשת. הניסוח לא הסתיים.');
      setOriginalDraft(null);
    } finally {
      setRephrasing(false);
    }
  }

  function handleRevert(): void {
    if (!originalDraft) return;
    setSituation(originalDraft.s);
    setQuestion(originalDraft.q);
    setOption1(originalDraft.o1);
    setOption2(originalDraft.o2);
    setOriginalDraft(null);
  }

  async function handleSubmit(): Promise<void> {
    setError(null);
    if (!canPostToday()) {
      setError(A.rewardDailyCapPost);
      return;
    }
    const s = situation.trim();
    const q = question.trim();
    const o1 = option1.trim();
    const o2 = option2.trim();
    const opts = [o1, o2].filter((o) => o.length > 0);

    if (s.length < MIN_SITUATION_LENGTH) {
      setError(A.validationSituationTooShort(MIN_SITUATION_LENGTH));
      return;
    }
    if (s.length > MAX_SITUATION_LENGTH) {
      setError(A.validationSituationTooLong(MAX_SITUATION_LENGTH));
      return;
    }
    if (q.length < MIN_QUESTION_LENGTH) {
      setError(A.validationQuestionTooShort(MIN_QUESTION_LENGTH));
      return;
    }
    if (q.length > MAX_QUESTION_LENGTH) {
      setError(A.validationQuestionTooLong(MAX_QUESTION_LENGTH));
      return;
    }
    if (opts.length === 0) {
      setError(A.validationOptionsRequired);
      return;
    }
    // Local PII pre-check
    const fullText = `${s} ${q}`;
    const localCheck = clientFallbackModerate(fullText);
    if (!localCheck.ok && /ת״ז|טלפון|מזהים/.test(localCheck.reason ?? '')) {
      setError(localCheck.reason ?? '');
      return;
    }

    setModerating(true);
    let mod: ModerationResult = { ok: true, tags: [] };
    try {
      const res = await fetch('/api/anon-advice/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ situation: s, question: q, options: opts }),
      });
      mod = (await res.json()) as ModerationResult;
    } catch {
      // Network failure → fallback
      const fb = clientFallbackModerate(s);
      mod = { ok: fb.ok, reason: fb.reason, tags: [] };
    }

    if (!mod.ok) {
      setModerating(false);
      setRejection(mod.reason ?? A.moderationRejectedDefault);
      return;
    }

    const result = submitPost({
      situation: s,
      question: q,
      options: opts,
      imageUri,
      tags: mod.tags ?? [],
      status: 'approved',
    });

    setModerating(false);
    onPosted?.(result.post.id, result.reward);
    reset();
    onClose();
  }

  const sLen = situation.length;
  const qLen = question.length;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: DUO.bg }} edges={['top']}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row-reverse',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: DUO.border,
            backgroundColor: '#ffffff',
          }}
        >
          <Pressable onPress={handleClose} hitSlop={12} disabled={moderating || rephrasing}>
            <Text style={{ fontSize: 22, color: DUO.textMuted }}>✕</Text>
          </Pressable>
          <Text
            style={{
              flex: 1,
              fontSize: 17,
              fontWeight: '900',
              color: DUO.text,
              writingDirection: 'rtl',
              textAlign: 'right',
              marginRight: 12,
            }}
          >
            {A.composeTitle}
          </Text>
          <Image
            source={require('../../../assets/webp/fin-standard.webp')}
            style={{ width: 36, height: 36 }}
            resizeMode="contain"
          />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
          {/* Section 1 — תיאור */}
          <SectionLabel num={1} title={A.composeSituationLabel} />
          <TextInput
            value={situation}
            onChangeText={setSituation}
            placeholder={A.composeSituationPlaceholder}
            placeholderTextColor="#94a3b8"
            multiline
            maxLength={MAX_SITUATION_LENGTH}
            style={inputStyle({ minHeight: 130 })}
            editable={!moderating && !rephrasing}
          />
          <CharCounter current={sLen} max={MAX_SITUATION_LENGTH} min={MIN_SITUATION_LENGTH} />

          {/* Section 2 — דילמה */}
          <SectionLabel num={2} title={A.composeQuestionLabel} />
          <TextInput
            value={question}
            onChangeText={setQuestion}
            placeholder={A.composeQuestionPlaceholder}
            placeholderTextColor="#94a3b8"
            multiline
            maxLength={MAX_QUESTION_LENGTH}
            style={inputStyle({ minHeight: 60 })}
            editable={!moderating && !rephrasing}
          />
          <CharCounter current={qLen} max={MAX_QUESTION_LENGTH} min={MIN_QUESTION_LENGTH} />

          {/* Section 3 — אופציות */}
          <SectionLabel num={3} title={A.composeOptionsLabel} />
          <TextInput
            value={option1}
            onChangeText={setOption1}
            placeholder={A.composeOption1Placeholder}
            placeholderTextColor="#94a3b8"
            maxLength={MAX_OPTION_LENGTH}
            style={inputStyle()}
            editable={!moderating && !rephrasing}
          />
          <View style={{ height: 8 }} />
          <TextInput
            value={option2}
            onChangeText={setOption2}
            placeholder={A.composeOption2Placeholder}
            placeholderTextColor="#94a3b8"
            maxLength={MAX_OPTION_LENGTH}
            style={inputStyle()}
            editable={!moderating && !rephrasing}
          />

          {/* Image upload */}
          <SectionLabel num={4} title={A.composeImageLabel} />
          <Text style={{ fontSize: 12, color: DUO.textMuted, writingDirection: 'rtl', textAlign: 'right', marginBottom: 8 }}>
            {A.composeImageHelp}
          </Text>
          {imageUri ? (
            <View style={{ alignItems: 'flex-end', gap: 8 }}>
              <Image source={{ uri: imageUri }} style={{ width: '100%', height: 180, borderRadius: 12 }} resizeMode="cover" />
              <Pressable onPress={() => setImageUri(undefined)}>
                <Text style={{ color: DUO.red, fontSize: 13, fontWeight: '700' }}>{A.composeRemoveImage}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={handlePickImage}
              style={({ pressed }) => ({
                backgroundColor: pressed ? DUO.bg : '#ffffff',
                borderWidth: 1.5,
                borderColor: DUO.border,
                borderStyle: 'dashed',
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
              })}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: DUO.blue, writingDirection: 'rtl' }}>
                {A.composeAddImage}
              </Text>
            </Pressable>
          )}

          {/* Error / rejection */}
          {error && (
            <View style={{ marginTop: 14, padding: 10, backgroundColor: '#fee2e2', borderRadius: 10 }}>
              <Text style={{ fontSize: 13, color: DUO.red, writingDirection: 'rtl', textAlign: 'right' }}>{error}</Text>
            </View>
          )}

          {rejection && (
            <View style={{ marginTop: 14, padding: 14, backgroundColor: '#fff7ed', borderRadius: 12, borderWidth: 1, borderColor: '#fdba74' }}>
              <Text style={{ fontSize: 14, fontWeight: '900', color: DUO.orangeDark, writingDirection: 'rtl', textAlign: 'right', marginBottom: 6 }}>
                {A.moderationRejected}
              </Text>
              <Text style={{ fontSize: 13, color: DUO.text, writingDirection: 'rtl', textAlign: 'right', lineHeight: 19 }}>
                {rejection}
              </Text>
              <Pressable onPress={() => setRejection(null)} style={{ marginTop: 8 }}>
                <Text style={{ color: DUO.blue, fontSize: 13, fontWeight: '700', textAlign: 'right' }}>
                  {A.moderationEdit}
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>

        {/* Sticky footer — actions */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: DUO.border,
            padding: 12,
            gap: 10,
          }}
        >
          <View style={{ flexDirection: 'row-reverse', gap: 10 }}>
            <Pressable
              onPress={originalDraft ? handleRevert : handleRephrase}
              disabled={rephrasing || moderating}
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: pressed ? DUO.blueSurface : '#ffffff',
                borderWidth: 1.5,
                borderColor: DUO.blue,
                borderRadius: 14,
                paddingVertical: 12,
                alignItems: 'center',
                flexDirection: 'row-reverse',
                gap: 8,
                justifyContent: 'center',
                opacity: rephrasing || moderating ? 0.6 : 1,
              })}
            >
              {rephrasing ? (
                <ActivityIndicator color={DUO.blue} size="small" />
              ) : (
                <Image source={require('../../../assets/webp/fin-standard.webp')} style={{ width: 22, height: 22 }} resizeMode="contain" />
              )}
              <Text style={{ fontSize: 14, fontWeight: '800', color: DUO.blue, writingDirection: 'rtl' }}>
                {rephrasing ? A.composeRephrasing : originalDraft ? A.composeRephraseRevert : A.composeRephraseWithShark}
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={moderating || rephrasing}
            style={({ pressed }) => ({
              backgroundColor: moderating || rephrasing ? '#94a3b8' : pressed ? DUO.blueDark : DUO.blue,
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: 'center',
            })}
          >
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl' }}>
              {A.composeSubmit}
            </Text>
          </Pressable>
        </View>

        <PendingModerationOverlay visible={moderating} />
      </SafeAreaView>
    </Modal>
  );
}

function SectionLabel({ num, title }: { num: number; title: string }): React.ReactElement {
  return (
    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginTop: 18, marginBottom: 8 }}>
      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: DUO.blue, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '900' }}>{num}</Text>
      </View>
      <Text style={{ fontSize: 15, fontWeight: '900', color: DUO.text, writingDirection: 'rtl' }}>{title}</Text>
    </View>
  );
}

function inputStyle(extra: { minHeight?: number } = {}): object {
  return {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: DUO.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: DUO.text,
    writingDirection: 'rtl',
    textAlign: 'right',
    minHeight: extra.minHeight ?? 44,
    textAlignVertical: 'top',
  };
}

function CharCounter({ current, max, min }: { current: number; max: number; min: number }): React.ReactElement {
  const ok = current >= min;
  return (
    <Text
      style={{
        fontSize: 11,
        color: ok ? DUO.green : DUO.textMuted,
        writingDirection: 'rtl',
        textAlign: 'left',
        marginTop: 4,
      }}
    >
      {current} / {max}
      {!ok && current > 0 ? `  (מינ׳ ${min})` : ''}
    </Text>
  );
}