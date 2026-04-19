import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeInUp } from "react-native-reanimated";
import LottieView from "lottie-react-native";
import { Lock, RefreshCw } from "lucide-react-native";

import { BackButton } from "../../components/ui/BackButton";
import { SafeLottie } from "../../components/ui/SafeLottie";
import { useSubscriptionStore } from "../subscription/useSubscriptionStore";
import { useEconomyStore } from "../economy/useEconomyStore";
import { useAuthStore } from "../auth/useAuthStore";
import { useChapterStore } from "../chapter-1-content/useChapterStore";
import { useAITelemetryStore } from "../ai-personalization/useAITelemetryStore";
import { useAdaptiveStore } from "../social/useAdaptiveStore";
import { useWeeklyInsightStore } from "./useWeeklyInsightStore";
import { MODULE_NAMES } from "../chat/chatData";
import { getLevelFromXP } from "../../utils/progression";
import { getApiBase } from "../../db/apiBase";
import { tapHaptic } from "../../utils/haptics";
import { SHADOW_STRONG } from "../chapter-4-content/simulations/simTheme";

const FINN_PROFILE = require('../../../assets/IMAGES/finn/finn-profile.png');
const FINN_EXCITED = require('../../../assets/lottie/fin-excited.json');

interface Insight {
  category: 'progress' | 'next' | 'strength' | 'tip';
  emoji: string;
  title: string;
  body: string;
}

const BUBBLE_COLOR: Record<Insight['category'], string> = {
  progress: '#e0f2fe',
  next:     '#ede9fe',
  strength: '#fef9c3',
  tip:      '#dcfce7',
};

const BUBBLE_BORDER: Record<Insight['category'], string> = {
  progress: '#bae6fd',
  next:     '#c4b5fd',
  strength: '#fde68a',
  tip:      '#bbf7d0',
};

const LOCKED_PREVIEWS = [
  { emoji: '📊', label: 'קצב ההתקדמות שלכם' },
  { emoji: '💡', label: 'הצעד הבא המומלץ' },
  { emoji: '⭐', label: 'נקודת החוזק שלכם' },
];

/* ── Shared context builder ── */
function useInsightContext() {
  const xp = useEconomyStore((s) => s.xp);
  const streak = useEconomyStore((s) => s.streak);
  const displayName = useAuthStore((s) => s.displayName);
  const profile = useAuthStore((s) => s.profile);
  const chapterProgress = useChapterStore((s) => s.progress);
  const aiProfile = useAITelemetryStore((s) => s.profile);
  const weakConcepts = useAdaptiveStore((s) =>
    s.getConsistentlyFailedConcepts().map((c) => c.conceptTag),
  );
  return { xp, streak, displayName, profile, chapterProgress, aiProfile, weakConcepts };
}

async function fetchFromAPI(ctx: ReturnType<typeof useInsightContext>): Promise<Insight[]> {
  const { xp, streak, displayName, profile, chapterProgress, aiProfile, weakConcepts } = ctx;
  const allModuleIds = Object.values(chapterProgress).flatMap((cp) => cp.completedModules);
  const completedModuleNames = allModuleIds.map((id) => MODULE_NAMES[id] ?? id).filter(Boolean);
  const lastModuleName = allModuleIds.length > 0
    ? (MODULE_NAMES[allModuleIds[allModuleIds.length - 1]] ?? null)
    : null;
  const level = getLevelFromXP(xp);
  const knowledgeGapNames = (aiProfile?.knowledgeGaps ?? []).map((id) => MODULE_NAMES[id] ?? id);

  const res = await fetch(`${getApiBase()}/api/ai/insights`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: displayName ?? 'משתמש',
      xp, level, streak,
      completedModuleNames, lastModuleName,
      financialGoal: profile?.financialGoal,
      knowledgeLevel: profile?.knowledgeLevel,
      persona: aiProfile?.persona ?? null,
      knowledgeGaps: knowledgeGapNames,
      recommendedActions: aiProfile?.recommendedActions ?? [],
      weakConcepts,
    }),
  });
  const data = (await res.json()) as { ok: boolean; insights: Insight[]; error?: string };
  if (!res.ok || !data.ok) throw new Error(data.error ?? 'שגיאה');
  return data.insights;
}

/* ── Speech bubble ── */
function InsightBubble({ insight, index }: { insight: Insight; index: number }) {
  const bg = BUBBLE_COLOR[insight.category];
  const border = BUBBLE_BORDER[insight.category];
  return (
    <Animated.View
      entering={FadeInUp.delay(index * 110).duration(400)}
      style={styles.bubbleRow}
      accessibilityLabel={`${insight.title}: ${insight.body}`}
    >
      <Image source={FINN_PROFILE} style={styles.avatar} accessibilityLabel="Finn" />
      <View style={[styles.bubble, { backgroundColor: bg, borderColor: border }]}>
        <View style={[styles.bubbleTailBorder, { borderLeftColor: border }]} />
        <View style={[styles.bubbleTail, { borderLeftColor: bg }]} />
        <View style={styles.bubbleHeader}>
          <Text style={styles.bubbleEmoji}>{insight.emoji}</Text>
          <Text style={styles.bubbleTitle}>{insight.title}</Text>
        </View>
        <Text style={styles.bubbleBody}>{insight.body}</Text>
      </View>
    </Animated.View>
  );
}

/* ── Locked placeholder bubble ── */
function LockedBubble({ emoji, label, index }: { emoji: string; label: string; index: number }) {
  return (
    <Animated.View
      entering={FadeInUp.delay(index * 80).duration(350)}
      style={[styles.bubbleRow, { opacity: 0.45 }]}
    >
      <View style={[styles.avatar, styles.avatarLocked]} />
      <View style={[styles.bubble, styles.bubbleLocked]}>
        <View style={[styles.bubbleTailBorder, { borderLeftColor: '#e2e8f0' }]} />
        <View style={[styles.bubbleTail, { borderLeftColor: '#f1f5f9' }]} />
        <View style={styles.bubbleHeader}>
          <Text style={styles.bubbleEmoji}>{emoji}</Text>
          <Text style={[styles.bubbleTitle, { color: '#94a3b8' }]}>{label}</Text>
          <Lock size={14} color="#94a3b8" />
        </View>
        <View style={styles.lockedLines}>
          <View style={[styles.lockedLine, { width: '88%' }]} />
          <View style={[styles.lockedLine, { width: '64%', marginTop: 6 }]} />
        </View>
      </View>
    </Animated.View>
  );
}

/* ── Skeleton ── */
function SkeletonBubble({ index }: { index: number }) {
  return (
    <Animated.View entering={FadeInUp.delay(index * 80).duration(350)} style={styles.bubbleRow}>
      <View style={[styles.avatar, styles.avatarSkeleton]} />
      <View style={[styles.bubble, styles.skeletonBubble]}>
        <View style={[styles.skeletonLine, { width: '45%', marginBottom: 10 }]} />
        <View style={[styles.skeletonLine, { width: '90%' }]} />
        <View style={[styles.skeletonLine, { width: '70%', marginTop: 6 }]} />
      </View>
    </Animated.View>
  );
}

/* ── Upgrade CTA card ── */
function UpgradeCTA({ onPress }: { onPress: () => void }) {
  return (
    <Animated.View entering={FadeInUp.delay(200).duration(400)} style={styles.ctaCard}>
      <LottieView
        source={require('../../../assets/lottie/Pro Animation 3rd.json')}
        autoPlay loop
        style={styles.ctaLottie}
      />
      <View style={styles.ctaText}>
        <Text style={styles.ctaTitle}>עוד 3 תובנות ממתינות לכם 👀</Text>
        <Text style={styles.ctaSub}>שדרגו לPRO וקבלו ניתוח מלא בכל שבוע</Text>
      </View>
      <TouchableOpacity
        style={styles.ctaBtn}
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="שדרג לפרו"
      >
        <Text style={styles.ctaBtnText}>שדרגו עכשיו</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ─────────────────────────── Main Screen ─────────────────────────── */

export function AIInsightsScreen() {
  const router = useRouter();
  const isPro = useSubscriptionStore((s) => s.tier === 'pro' && s.status === 'active');
  const ctx = useInsightContext();
  const { aiProfile, displayName } = ctx;

  const weeklyStore = useWeeklyInsightStore();

  // Pro state
  const [proInsights, setProInsights] = useState<Insight[]>([]);
  const [proLoading, setProLoading] = useState(false);
  const [proError, setProError] = useState<string | null>(null);

  // Free state
  const [freeLoading, setFreeLoading] = useState(false);
  const [freeError, setFreeError] = useState<string | null>(null);

  /* ── Pro: fetch all 4 insights ── */
  const fetchPro = useCallback(async () => {
    setProLoading(true);
    setProError(null);
    tapHaptic();
    try {
      const insights = await fetchFromAPI(ctx);
      setProInsights(insights);
    } catch (e: unknown) {
      setProError(e instanceof Error ? e.message : 'שגיאה בטעינת התובנות. נסו שוב.');
    } finally {
      setProLoading(false);
    }
  }, [ctx]);

  /* ── Free: fetch weekly teaser (1 insight — tip category) ── */
  const fetchFree = useCallback(async () => {
    if (!weeklyStore.shouldRefetch()) return;
    setFreeLoading(true);
    setFreeError(null);
    try {
      const insights = await fetchFromAPI(ctx);
      // Prefer the 'tip' category as the teaser; fallback to first
      const teaser = insights.find((i) => i.category === 'tip') ?? insights[0];
      weeklyStore.saveInsight({ emoji: teaser.emoji, title: teaser.title, body: teaser.body });
    } catch {
      setFreeError('שגיאת רשת. נסו שוב מאוחר יותר.');
    } finally {
      setFreeLoading(false);
    }
  }, [ctx, weeklyStore]);

  useEffect(() => {
    if (isPro) {
      fetchPro();
    } else {
      fetchFree();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const personaLabel =
    aiProfile?.persona === 'Aggressive' ? 'אוהבי סיכון' :
    aiProfile?.persona === 'Balanced'   ? 'מאוזנים' :
    aiProfile?.persona === 'Conservative' || aiProfile?.persona === 'Risk-Averse' ? 'שמרנים' :
    null;

  /* ── Intro banner (shared) ── */
  const IntroBanner = (
    <Animated.View entering={FadeInUp.duration(400)} style={styles.introRow}>
      <SafeLottie source={FINN_EXCITED} style={styles.finnLarge} autoPlay loop />
      <View style={styles.introTextWrap}>
        <Text style={styles.introGreeting}>
          {displayName ? `היי ${displayName}! 👋` : 'היי! 👋'}
        </Text>
        <Text style={styles.introSub}>
          {personaLabel
            ? `זיהיתי שאתם ${personaLabel} — הנה התובנות שלי:`
            : 'הנה התובנות האישיות שלי עבורכם:'}
        </Text>
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton color="#0f172a" />
        <Text style={styles.headerTitle}>תובנות AI</Text>
        {isPro ? (
          <TouchableOpacity
            onPress={fetchPro}
            disabled={proLoading}
            style={[styles.refreshBtn, proLoading && { opacity: 0.3 }]}
            accessibilityRole="button"
            accessibilityLabel="רענן תובנות"
          >
            <RefreshCw size={18} color="#0ea5e9" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* ── PRO FLOW ── */}
      {isPro ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {IntroBanner}
          {proLoading
            ? [0, 1, 2, 3].map((i) => <SkeletonBubble key={i} index={i} />)
            : proError
              ? (
                <Animated.View entering={FadeInUp.duration(400)} style={styles.errorBox}>
                  <Text style={styles.errorText}>{proError}</Text>
                  <TouchableOpacity onPress={fetchPro} style={styles.retryBtn}>
                    <Text style={styles.retryText}>נסו שוב</Text>
                  </TouchableOpacity>
                </Animated.View>
              )
              : proInsights.map((insight, i) => (
                <InsightBubble key={insight.category} insight={insight} index={i} />
              ))
          }
          <View style={{ height: 40 }} />
        </ScrollView>

      /* ── FREE FLOW ── */
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {IntroBanner}

          {freeLoading ? (
            <SkeletonBubble index={0} />
          ) : freeError ? (
            <Animated.View entering={FadeInUp.duration(400)} style={styles.errorBox}>
              <Text style={styles.errorText}>{freeError}</Text>
            </Animated.View>
          ) : weeklyStore.cachedInsight ? (
            <>
              {/* 1 real insight */}
              <InsightBubble
                insight={{ ...weeklyStore.cachedInsight, category: 'tip' }}
                index={0}
              />

              {/* Upgrade CTA */}
              <UpgradeCTA onPress={() => router.push('/pricing' as never)} />

              {/* 3 locked previews */}
              {LOCKED_PREVIEWS.map((p, i) => (
                <LockedBubble key={p.label} emoji={p.emoji} label={p.label} index={i + 1} />
              ))}

              <Text style={styles.weeklyNote}>
                💡 תובנה חדשה תופיע כל שבוע — PRO מקבל את כולן ∞
              </Text>
            </>
          ) : (
            /* Edge case: no cached insight yet and not loading */
            <Animated.View entering={FadeInUp.duration(400)} style={styles.errorBox}>
              <Text style={styles.errorText}>טוענים את התובנה השבועית שלכם…</Text>
            </Animated.View>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

/* ─────────────────────────── Styles ─────────────────────────── */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f9ff' },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#bae6fd',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  refreshBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#f0f9ff', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#bae6fd',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },

  /* Finn intro */
  introRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 20, gap: 12 },
  finnLarge: { width: 80, height: 80 },
  introTextWrap: { flex: 1, alignItems: 'flex-end' },
  introGreeting: { fontSize: 17, fontWeight: '800', color: '#0f172a', textAlign: 'right' },
  introSub: { fontSize: 13, color: '#475569', textAlign: 'right', marginTop: 4, lineHeight: 18 },

  /* Bubble row */
  bubbleRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', marginBottom: 16, gap: 8 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 2, borderColor: '#bae6fd', backgroundColor: '#e0f2fe',
  },
  avatarSkeleton: { backgroundColor: '#e2e8f0', borderColor: '#e2e8f0' },
  avatarLocked: { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' },
  bubble: {
    flex: 1, borderRadius: 16, borderTopRightRadius: 4,
    padding: 14, borderWidth: 1.5, position: 'relative',
    ...SHADOW_STRONG,
  },
  bubbleTailBorder: {
    position: 'absolute', right: -11, top: 13,
    width: 0, height: 0,
    borderTopWidth: 8, borderTopColor: 'transparent',
    borderBottomWidth: 8, borderBottomColor: 'transparent',
    borderLeftWidth: 11,
  },
  bubbleTail: {
    position: 'absolute', right: -9, top: 14, zIndex: 1,
    width: 0, height: 0,
    borderTopWidth: 7, borderTopColor: 'transparent',
    borderBottomWidth: 7, borderBottomColor: 'transparent',
    borderLeftWidth: 10,
  },
  bubbleHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 6 },
  bubbleEmoji: { fontSize: 20 },
  bubbleTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', textAlign: 'right', flex: 1 },
  bubbleBody: { fontSize: 14, color: '#334155', textAlign: 'right', lineHeight: 21 },

  /* Locked */
  bubbleLocked: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' },
  lockedLines: {},
  lockedLine: { height: 10, borderRadius: 5, backgroundColor: '#e2e8f0' },

  /* Skeleton */
  skeletonBubble: { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' },
  skeletonLine: { height: 11, borderRadius: 6, backgroundColor: '#e2e8f0' },

  /* CTA */
  ctaCard: {
    backgroundColor: '#0c4a6e',
    borderRadius: 20,
    padding: 18,
    marginVertical: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    ...SHADOW_STRONG,
  },
  ctaLottie: { width: 52, height: 52 },
  ctaText: { flex: 1, alignItems: 'flex-end' },
  ctaTitle: { fontSize: 14, fontWeight: '800', color: '#ffffff', textAlign: 'right' },
  ctaSub: { fontSize: 12, color: '#7dd3fc', textAlign: 'right', marginTop: 2 },
  ctaBtn: {
    backgroundColor: '#38bdf8',
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12,
    borderBottomWidth: 3, borderBottomColor: '#0284c7',
  },
  ctaBtnText: { color: '#0c4a6e', fontWeight: '900', fontSize: 13 },

  /* Weekly note */
  weeklyNote: {
    textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 8,
  },

  /* Error */
  errorBox: {
    backgroundColor: '#fef2f2', borderRadius: 16,
    padding: 24, alignItems: 'center', gap: 12,
  },
  errorText: { fontSize: 14, color: '#ef4444', textAlign: 'center' },
  retryBtn: { backgroundColor: '#ef4444', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
