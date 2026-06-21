import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  Platform,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Check, ArrowUpRight, ChevronDown, ChevronUp, Send, X } from 'lucide-react-native';
import { getApiBase } from '../../db/apiBase';
import {
  FollowupQuestionBubble,
  FollowupAnswerBubble,
  FollowupLoadingBubble,
} from '../stock-analyst/components/FollowupBubbles';
import { useModuleComprehensionStore } from './useModuleComprehensionStore';
import type { ConversationTurn } from './useSharkVoiceStore';

// Look & feel intentionally mirrors the Stock-Analyst DeepAnalysisCard: a
// light-blue (sky) panel of white, collapsible sections floating on a deep
// navy background, plus a free-text "talk to Shark" follow-up — same as the
// analyst's follow-up Q&A.

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };
const PROD_API_BASE = 'https://finpl.vercel.app';

function resolveBase(): string {
  if (Platform.OS === 'web') {
    const w = (globalThis as { location?: { hostname?: string } }).location;
    const host = w?.hostname ?? '';
    if (host === 'localhost' || host === '127.0.0.1') return PROD_API_BASE;
  }
  return getApiBase() || PROD_API_BASE;
}

interface Props {
  moduleId: string;
  moduleTitle: string;
  onDone: () => void;
}

function scoreColor(score: number): string {
  if (score >= 75) return '#16a34a';
  if (score >= 45) return '#e9a200';
  return '#ef4444';
}
function scoreLabel(score: number): string {
  if (score >= 85) return 'שליטה מצוינת';
  if (score >= 70) return 'הבנה טובה';
  if (score >= 45) return 'בדרך הנכונה';
  return 'שווה לחזור על זה';
}

/* ───────────────── collapsible section (mirrors DeepAnalysisCard) ──────── */
function Section({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}): React.ReactElement {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={styles.section}>
      <Pressable onPress={() => setOpen((v) => !v)} accessibilityRole="button" style={styles.sectionHeader}>
        <Text style={[RTL, styles.sectionTitle]}>{title}</Text>
        {open ? <ChevronUp size={18} color="#0369a1" /> : <ChevronDown size={18} color="#0369a1" />}
      </Pressable>
      {open ? <View style={{ padding: 14, gap: 10 }}>{children}</View> : null}
    </View>
  );
}

export function ModuleComprehensionReportScreen({
  moduleId,
  moduleTitle,
  onDone,
}: Props): React.ReactElement {
  const stored = useModuleComprehensionStore((s) => s.reportsByModuleId[moduleId]);
  const inputs = useModuleComprehensionStore((s) => s.inputsByModuleId[moduleId]);
  const generating = useModuleComprehensionStore((s) => s.generatingModuleId === moduleId);
  const errored = useModuleComprehensionStore((s) => s.erroredModuleId === moduleId);
  const generateReport = useModuleComprehensionStore((s) => s.generateReport);

  const report = stored?.report ?? null;

  // Kick off generation if the report isn't ready yet. Idempotent + quota-free
  // (the weekly quota is consumed upstream by the offer/card that opened us).
  useEffect(() => {
    if (!report && !generating) void generateReport(moduleId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId]);

  /* ── follow-up Q&A ── */
  const [followups, setFollowups] = useState<ConversationTurn[]>([]);
  const [followupLoading, setFollowupLoading] = useState(false);
  const [draft, setDraft] = useState('');

  const askShark = async (raw: string) => {
    const q = raw.trim();
    if (!q || followupLoading) return;
    setDraft('');
    setFollowups((prev) => [...prev, { role: 'user', text: q }]);
    setFollowupLoading(true);
    try {
      const res = await fetch(`${resolveBase()}/api/ai/comprehension-followup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleTitle,
          concepts: inputs?.concepts ?? [],
          keyPoints: inputs?.keyPoints ?? [],
          report: report ?? {},
          transcript: inputs?.transcript ?? [],
          history: followups.slice(-8),
          question: q,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; answer?: string };
      const answer =
        data?.ok && data.answer ? data.answer : 'לא הצלחתי לענות הפעם — נסה שוב בעוד רגע.';
      setFollowups((prev) => [...prev, { role: 'shark', text: answer }]);
    } catch {
      setFollowups((prev) => [
        ...prev,
        { role: 'shark', text: 'לא הצלחתי לענות הפעם — נסה שוב בעוד רגע.' },
      ]);
    } finally {
      setFollowupLoading(false);
    }
  };

  const suggestions = useMemo(
    () => ['למה זה הציון שלי?', 'איך אשתפר?', 'הסבר לי נקודה אחת לשיפור'],
    [],
  );

  /* ── loading ── */
  if (!report && generating) {
    return (
      <View style={styles.loadingWrap}>
        <ExpoImage
          source={require('../../../assets/webp/shark-call-thinking.webp')}
          style={{ width: 160, height: 160 }}
          contentFit="contain"
        />
        <ActivityIndicator color="#38bdf8" style={{ marginTop: 12 }} />
        <Text style={[RTL, styles.loadingText]}>קפטן שארק מסכם איך הלך לך…</Text>
      </View>
    );
  }

  /* ── error / no report ── */
  if (!report) {
    return (
      <View style={styles.loadingWrap}>
        <ExpoImage
          source={require('../../../assets/webp/shark-call-listening.webp')}
          style={{ width: 140, height: 140 }}
          contentFit="contain"
        />
        <Text style={[RTL, styles.loadingText]}>
          {errored ? 'לא הצלחנו להפיק סיכום הפעם — אבל כל הכבוד שסיימת!' : 'אין עדיין דוח למודולה הזו.'}
        </Text>
        {errored ? (
          <Pressable
            style={[styles.cta, { backgroundColor: '#0ea5e9' }]}
            onPress={() => void generateReport(moduleId)}
            accessibilityRole="button"
          >
            <Text style={styles.ctaText}>נסה שוב</Text>
          </Pressable>
        ) : null}
        <Pressable style={styles.cta} onPress={onDone} accessibilityRole="button">
          <Text style={styles.ctaText}>המשך</Text>
        </Pressable>
      </View>
    );
  }

  const sc = report.understandingScore;
  const col = scoreColor(sc);
  const canSend = !followupLoading && draft.trim().length > 0;

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.topBar}>
        <Pressable onPress={onDone} hitSlop={12} accessibilityRole="button" accessibilityLabel="סגור" style={styles.closeBtn}>
          <X size={20} color="#e2e8f0" strokeWidth={2.6} />
        </Pressable>
        <Text style={[RTL, styles.topBarTitle]} numberOfLines={1}>דוח סיכום שיעור</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Sky panel — mirrors DeepAnalysisCard */}
        <View style={styles.panel}>
          <Animated.View entering={FadeIn.duration(300)} style={styles.headerRow}>
            <ExpoImage
              source={require('../../../assets/webp/shark-call-talking-1.webp')}
              style={{ width: 56, height: 56 }}
              contentFit="contain"
            />
            <View style={{ flex: 1 }}>
              <Text style={[RTL, styles.kicker]}>בדיקת ההבנה של קפטן שארק</Text>
              <Text style={[RTL, styles.moduleTitle]} numberOfLines={1}>{moduleTitle}</Text>
            </View>
          </Animated.View>

          {/* Summary card — score + verdict */}
          <Animated.View entering={FadeInDown.delay(80).duration(360)} style={styles.summaryCard}>
            <View style={[styles.scoreRing, { borderColor: col }]}>
              <Text style={[styles.scoreNum, { color: col }]}>{sc}</Text>
              <Text style={styles.scoreOf}>מתוך 100</Text>
            </View>
            <Text style={[styles.scoreLabel, { color: col }]}>{scoreLabel(sc)}</Text>
            <Text style={[RTL, styles.verdict]}>{report.verdictHe}</Text>
          </Animated.View>

          {report.strengthsHe.length > 0 && (
            <Section title="מה תפסת טוב" defaultOpen>
              {report.strengthsHe.map((s, i) => (
                <View key={`s${i}`} style={styles.bulletRow}>
                  <View style={[styles.bulletIcon, { backgroundColor: '#dcfce7' }]}>
                    <Check size={14} color="#16a34a" />
                  </View>
                  <Text style={[RTL, styles.bulletText]}>{s}</Text>
                </View>
              ))}
            </Section>
          )}

          {report.improvementsHe.length > 0 && (
            <Section title="שווה לחזק" defaultOpen>
              {report.improvementsHe.map((s, i) => (
                <View key={`i${i}`} style={styles.bulletRow}>
                  <View style={[styles.bulletIcon, { backgroundColor: '#fef3c7' }]}>
                    <ArrowUpRight size={14} color="#b45309" />
                  </View>
                  <Text style={[RTL, styles.bulletText]}>{s}</Text>
                </View>
              ))}
            </Section>
          )}

          {report.perConcept.length > 0 && (
            <Section title="לפי מושג">
              {report.perConcept.map((p, i) => (
                <View key={`c${i}`} style={styles.conceptRow}>
                  <View style={styles.conceptHeader}>
                    <Text style={[RTL, styles.conceptName]} numberOfLines={2}>{p.concept}</Text>
                    <Text style={[styles.conceptPct, { color: scoreColor(p.graspPct) }]}>{p.graspPct}%</Text>
                  </View>
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${p.graspPct}%`, backgroundColor: scoreColor(p.graspPct) }]} />
                  </View>
                </View>
              ))}
            </Section>
          )}
        </View>

        {/* Talk to Shark about the report */}
        <Text style={[RTL, styles.followupHeading]}>דבר עם שארק על הדוח</Text>
        <View style={{ gap: 10 }}>
          {followups.map((t, i) =>
            t.role === 'user' ? (
              <FollowupQuestionBubble key={`f${i}`} text={t.text} />
            ) : (
              <FollowupAnswerBubble key={`f${i}`} text={t.text} />
            ),
          )}
          {followupLoading ? <FollowupLoadingBubble /> : null}
        </View>
      </ScrollView>

      {/* Footer — follow-up input */}
      <View style={styles.footer}>
        {followups.length === 0 && draft.length === 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ flexDirection: 'row-reverse', gap: 6, paddingBottom: 8 }}
          >
            {suggestions.map((s) => (
              <Pressable key={s} onPress={() => askShark(s)} accessibilityRole="button" style={styles.suggestChip}>
                <Text style={styles.suggestChipText}>{s}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
        <View style={styles.inputPill}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="שאל את שארק על הדוח…"
            placeholderTextColor="#64748b"
            editable={!followupLoading}
            maxLength={500}
            style={styles.input}
            onSubmitEditing={() => askShark(draft)}
          />
          <Pressable
            onPress={() => askShark(draft)}
            accessibilityRole="button"
            accessibilityLabel="שלח שאלה"
            disabled={!canSend}
            style={[styles.sendBtn, { backgroundColor: canSend ? '#0369a1' : '#94a3b8' }]}
          >
            {followupLoading ? <ActivityIndicator size="small" color="#fff" /> : <Send size={16} color="#fff" />}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1735' },
  topBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(56,189,248,0.18)',
  },
  topBarTitle: { color: '#f1f5f9', fontSize: 17, fontWeight: '800', flex: 1, textAlign: 'center' },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { padding: 12, paddingBottom: 24, gap: 16 },
  loadingWrap: {
    flex: 1,
    backgroundColor: '#0b1735',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
  },
  loadingText: { color: '#cbd5e1', fontSize: 16, fontWeight: '600', marginTop: 8, textAlign: 'center' },

  // Sky panel — same family as DeepAnalysisCard's light-blue wrapper.
  panel: {
    gap: 10,
    backgroundColor: '#bfdbfe',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#38bdf8',
    shadowColor: '#0369a1',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  kicker: { color: '#0369a1', fontSize: 13, fontWeight: '700' },
  moduleTitle: { color: '#0c4a6e', fontSize: 20, fontWeight: '900' },

  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  scoreRing: {
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNum: { fontSize: 40, fontWeight: '900', lineHeight: 44 },
  scoreOf: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  scoreLabel: { fontSize: 17, fontWeight: '800' },
  verdict: { fontSize: 15, color: '#0f172a', lineHeight: 22, textAlign: 'center' },

  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0f2fe',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#f0f9ff',
  },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: '#0c4a6e' },
  bulletRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10 },
  bulletIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  bulletText: { flex: 1, fontSize: 14, color: '#0f172a', lineHeight: 21 },
  conceptRow: { gap: 6 },
  conceptHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  conceptName: { flex: 1, fontSize: 13, color: '#475569', fontWeight: '600' },
  conceptPct: { fontSize: 13, fontWeight: '800' },
  track: { height: 8, borderRadius: 4, backgroundColor: '#e6e9ee', overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },

  followupHeading: { color: '#e2e8f0', fontSize: 15, fontWeight: '800', marginTop: 4 },

  footer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(56,189,248,0.18)',
    backgroundColor: 'rgba(2,6,23,0.6)',
  },
  suggestChip: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  suggestChipText: { color: '#cbd5e1', fontSize: 11, fontWeight: '700', writingDirection: 'rtl' },
  inputPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 8,
    writingDirection: 'rtl',
    textAlign: 'right',
    fontWeight: '600',
  },
  sendBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  cta: { backgroundColor: '#0369a1', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 40, alignItems: 'center', marginTop: 12 },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
