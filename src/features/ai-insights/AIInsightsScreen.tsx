import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Image as ExpoImage } from "expo-image";
import { Lock, RefreshCw } from "lucide-react-native";
import { useWeeklyInsightStore } from "./useWeeklyInsightStore";

import { BackButton } from "../../components/ui/BackButton";
import { useSubscriptionStore } from "../subscription/useSubscriptionStore";
import { useEconomyStore } from "../economy/useEconomyStore";
import { useAuthStore } from "../auth/useAuthStore";
import { useChapterStore } from "../chapter-1-content/useChapterStore";
import { useAITelemetryStore } from "../ai-personalization/useAITelemetryStore";
import { useAdaptiveStore } from "../social/useAdaptiveStore";
import { MODULE_NAMES } from "../chat/chatData";
import { getLevelFromXP } from "../../utils/progression";
import { getApiBase } from "../../db/apiBase";
import { tapHaptic } from "../../utils/haptics";

const CARD_SHADOW = {
  shadowColor: '#0ea5e9',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.12,
  shadowRadius: 8,
  elevation: 3,
} as const;

const FINN_PROFILE = require('../../../assets/IMAGES/finn/finn-profile.png');
const FINN_HAPPY = require('../../../assets/webp/fin-happy.webp');

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


/* ── Shared context builder ── */
function useInsightContext() {
  const xp = useEconomyStore((s) => s.xp);
  const streak = useEconomyStore((s) => s.streak);
  const displayName = useAuthStore((s) => s.displayName);
  const profile = useAuthStore((s) => s.profile);
  const chapterProgress = useChapterStore((s) => s.progress);
  const aiProfile = useAITelemetryStore((s) => s.profile);
  return { xp, streak, displayName, profile, chapterProgress, aiProfile };
}

async function fetchFromAPI(ctx: ReturnType<typeof useInsightContext>): Promise<Insight[]> {
  const { xp, streak, displayName, profile, chapterProgress, aiProfile } = ctx;
  const weakConcepts = useAdaptiveStore.getState().getConsistentlyFailedConcepts().map((c) => c.conceptTag);
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
      <ExpoImage source={FINN_PROFILE} style={styles.avatar} contentFit="cover" accessibilityLabel="Finn" />
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

const FALLBACK_FREE_INSIGHT: Insight = {
  category: 'strength',
  emoji: '⭐',
  title: 'נקודת החוזק שלכם',
  body: 'זיהיתי דפוס עקבי בלמידה שלכם, יש לכם בסיס יציב שמאפשר לכם להתקדם לנושאים מורכבים יותר. המשיכו ברצף כדי לחזק את הנקודה הזו.',
};

const BLURRED_TEASERS: Array<{
  category: Insight['category'];
  emoji: string;
}> = [
  { category: 'progress', emoji: '📊' },
  { category: 'next',     emoji: '💡' },
  { category: 'tip',      emoji: '💰' },
];

/* ── Locked bubble, text replaced with grey bars (skeleton style). Completely unreadable. ── */
function BlurredLockedBubble({ index }: { index: number }) {
  const t = BLURRED_TEASERS[index % BLURRED_TEASERS.length];
  const bg = BUBBLE_COLOR[t.category];
  const border = BUBBLE_BORDER[t.category];
  return (
    <Animated.View
      entering={FadeInUp.delay(index * 80).duration(350)}
      style={styles.bubbleRow}
      accessible
      accessibilityLabel={`תובנה נעולה ${index + 1}, זמינה למשתמשי PRO`}
    >
      <View style={[styles.avatar, { borderColor: border, backgroundColor: bg }]} />
      <View
        style={[styles.bubble, { backgroundColor: bg, borderColor: border }]}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <View style={[styles.bubbleTailBorder, { borderLeftColor: border }]} />
        <View style={[styles.bubbleTail, { borderLeftColor: bg }]} />
        <View style={styles.bubbleHeader}>
          <Text style={styles.bubbleEmoji}>{t.emoji}</Text>
          <View style={styles.blurBarTitle} />
          <Lock size={14} color="#64748b" />
        </View>
        <View style={[styles.blurBarBody, { width: '95%' }]} />
        <View style={[styles.blurBarBody, { width: '82%' }]} />
        <View style={[styles.blurBarBody, { width: '68%' }]} />
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
      <ExpoImage source={FINN_HAPPY} style={styles.ctaLottie} contentFit="contain" />
      <View style={styles.ctaText}>
        <Text style={styles.ctaTitle}>פתחו את הניתוח המלא 🔓</Text>
        <Text style={styles.ctaSub}>קצב ההתקדמות, נקודות חולשה והצעד הבא שלכם</Text>
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
  const { top: topInset, bottom: bottomInset } = useSafeAreaInsets();
  const isPro = useSubscriptionStore((s) => s.tier === 'pro' && s.status === 'active');
  const ctx = useInsightContext();
  const { aiProfile, displayName } = ctx;

  // Pro state
  const [proInsights, setProInsights] = useState<Insight[]>([]);
  const [proLoading, setProLoading] = useState(false);
  const [proError, setProError] = useState<string | null>(null);

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

  // Free state
  const [freeLoading, setFreeLoading] = useState(false);
  const cachedInsight = useWeeklyInsightStore((s) => s.cachedInsight);

  /* ── Free: 1 real insight per week, cached ── */
  const fetchFree = useCallback(async () => {
    const store = useWeeklyInsightStore.getState();
    if (!store.shouldRefetch()) return;
    setFreeLoading(true);
    try {
      const insights = await fetchFromAPI(ctx);
      const teaser = insights.find((i) => i.category === 'strength') ?? insights[0];
      store.saveInsight({ emoji: teaser.emoji, title: teaser.title, body: teaser.body });
    } catch {
      // silently fail, user still sees locked placeholders
    } finally {
      setFreeLoading(false);
    }
  }, [ctx]);

  useEffect(() => {
    if (isPro) fetchPro();
    else fetchFree();
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
      <ExpoImage source={FINN_HAPPY} style={styles.finnLarge} contentFit="contain" />
      <View style={styles.introTextWrap}>
        <Text style={styles.introGreeting}>
          {displayName ? `היי ${displayName}! 👋` : 'היי! 👋'}
        </Text>
        <Text style={styles.introSub}>
          {personaLabel
            ? `זיהיתי שאתם ${personaLabel}, הנה התובנות שלי:`
            : 'הנה התובנות האישיות שלי עבורכם:'}
        </Text>
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: 12 + topInset }]}>
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
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + bottomInset }]}
          showsVerticalScrollIndicator={false}
        >
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
        </ScrollView>

      /* ── FREE FLOW, 1 real insight + 3 locked ── */
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + bottomInset }]}
          showsVerticalScrollIndicator={false}
        >
          {IntroBanner}

          {/* 1 real insight, fallback to static tip if API hasn't loaded yet */}
          {freeLoading ? (
            <SkeletonBubble index={0} />
          ) : (
            <InsightBubble
              insight={cachedInsight ? { ...cachedInsight, category: 'strength' } : FALLBACK_FREE_INSIGHT}
              index={0}
            />
          )}

          {/* Upgrade CTA */}
          <UpgradeCTA onPress={() => router.push('/pricing' as never)} />

          {/* 3 blurred locked bubbles */}
          <BlurredLockedBubble index={0} />
          <BlurredLockedBubble index={1} />
          <BlurredLockedBubble index={2} />

          <Text style={styles.weeklyNote}>
            🔒 הניתוח המלא, קצב, חולשה, צעד הבא, זמין ב-PRO
          </Text>
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
    ...CARD_SHADOW,
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

  /* Locked-state grey bars, replace title/body text. Fully unreadable. */
  blurBarTitle: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#94a3b8',
    opacity: 0.55,
  },
  blurBarBody: {
    height: 11,
    borderRadius: 5,
    backgroundColor: '#94a3b8',
    opacity: 0.45,
    marginTop: 8,
  },

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
    ...CARD_SHADOW,
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

  /* Frosted overlay (replaces BlurView, cross-platform safe) */
  frostedOverlay: {
    top: 130,
    backgroundColor: 'rgba(240, 249, 255, 0.82)',
  },

  /* Free upgrade overlay */
  freeUpgradeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    paddingBottom: 40,
    alignItems: 'center',
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
