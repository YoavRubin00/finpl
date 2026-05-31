import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tapHaptic } from '../../utils/haptics';
import { useIsPro } from '../subscription/useSubscription';
import { useUsageStore } from '../subscription/useUsageStore';
import { useStockAnalystStore } from './useStockAnalystStore';
import { useAnalystSubmit } from './hooks/useAnalystSubmit';
import { SharkTabletHeader } from './components/SharkTabletHeader';
import { ModeToggle } from './components/ModeToggle';
import { HorizonSelector } from './components/HorizonSelector';
import { AnalystInput } from './components/AnalystInput';
import { QuickActionChips } from './components/QuickActionChips';
import { UserQueryBubble } from './components/UserQueryBubble';
import { CaptainTextBubble } from './components/CaptainTextBubble';
import { StockCard } from './components/StockCard';
import { DeepAnalysisCard } from './components/DeepAnalysisCard';
import { PortfolioContextCard } from './components/PortfolioContextCard';
import { MissedOpportunityCard } from './components/MissedOpportunityCard';
import { CaptainWarningCard } from './components/CaptainWarningCard';
import { LoadingBubble } from './components/LoadingBubble';
import { WaitGameOverlay } from './components/WaitGameOverlay';
import { AnalysisReadyToast } from './components/AnalysisReadyToast';
import { FirstLaunchConsentModal } from './components/FirstLaunchConsentModal';
import { CapExceededAnalystModal } from './components/CapExceededAnalystModal';
import { HistoryModal } from './components/HistoryModal';
import { IntroVideo } from './components/IntroVideo';
import {
  FollowupAnswerBubble,
  FollowupLoadingBubble,
  FollowupQuestionBubble,
} from './components/FollowupBubbles';
import { FollowupInput } from './components/FollowupInput';
import { fetchFollowupAnswer } from './services/stockAnalystClient';
import { useAnalystHistoryStore } from './useAnalystHistoryStore';
import type { AnalystMessage } from './types';

const CONSENT_KEY = 'stock-analyst:consent-v1';

export function StockAnalystScreen(): React.ReactElement {
  const mode = useStockAnalystStore((s) => s.mode);
  const horizon = useStockAnalystStore((s) => s.horizon);
  const ticker = useStockAnalystStore((s) => s.ticker);
  const loading = useStockAnalystStore((s) => s.loading);
  const messages = useStockAnalystStore((s) => s.messages);
  const setMode = useStockAnalystStore((s) => s.setMode);
  const setHorizon = useStockAnalystStore((s) => s.setHorizon);
  const setTicker = useStockAnalystStore((s) => s.setTicker);
  const appendMessage = useStockAnalystStore((s) => s.appendMessage);
  const clearSession = useStockAnalystStore((s) => s.clearSession);
  const removeMessage = useStockAnalystStore((s) => s.removeMessage);

  // Tier-bucketed remaining uses — Pro is Infinity, Free pulls from
  // useUsageStore which buckets by day (quick) and ISO week (deep). Subscribed
  // via selectors so the ModeToggle counter ticks down immediately after a
  // successful analysis without needing a re-render of the parent.
  const isPro = useIsPro();
  const quickRemaining = useUsageStore((s) => s.remainingUses('analyst-quick', isPro));
  const deepRemaining = useUsageStore((s) => s.remainingUses('analyst-deep', isPro));

  const pendingDeepCard = useStockAnalystStore((s) => s.pendingDeepCard);
  const revealPendingDeepCard = useStockAnalystStore((s) => s.revealPendingDeepCard);
  const waitOverlayVisible = useStockAnalystStore((s) => s.waitOverlayVisible);
  const closeWaitOverlay = useStockAnalystStore((s) => s.closeWaitOverlay);

  const { submit } = useAnalystSubmit();

  const [consentVisible, setConsentVisible] = useState(false);
  const [capModalMode, setCapModalMode] = useState<'quick' | 'deep' | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [introVisible, setIntroVisible] = useState(true);
  const historyCount = useAnalystHistoryStore((s) => s.entries.length);

  const scrollRef = useRef<ScrollView>(null);
  const greetedRef = useRef(false);

  // First-launch consent gate (persisted to AsyncStorage)
  useEffect(() => {
    (async () => {
      try {
        const consented = await AsyncStorage.getItem(CONSENT_KEY);
        if (!consented) setConsentVisible(true);
      } catch {
        setConsentVisible(true);
      }
    })();
  }, []);

  // Initial greeting once
  useEffect(() => {
    if (greetedRef.current) return;
    greetedRef.current = true;
    appendMessage({
      id: 'greet',
      kind: 'captain-text',
      pose: 'hello',
      text: 'אהוי! אני קפטן שארק, האנליסט החינוכי שלך. הקלד טיקר ואצלול לנתח. בחר קצרה לסקירה מהירה, או מעמיקה לניתוח עומק עם חשיבה מורחבת.',
      ts: Date.now(),
    });
    return () => {
      clearSession();
      greetedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll on new messages.
  //  - When a quick/deep card lands, scroll to its TOP so the user starts
  //    reading from the Fundamentals header (not the price-targets footer).
  //  - Otherwise (user query, captain text, etc.) scroll to end as usual.
  const cardOffsetsRef = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    const last = messages[messages.length - 1];
    const t = setTimeout(() => {
      if (last && (last.kind === 'quick-card' || last.kind === 'deep-card')) {
        const y = cardOffsetsRef.current.get(last.id);
        if (typeof y === 'number') {
          scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
          return;
        }
      }
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 150);
    return () => clearTimeout(t);
  }, [messages.length, loading, messages]);

  const handleConsentAccept = async () => {
    try { await AsyncStorage.setItem(CONSENT_KEY, '1'); } catch { /* non-fatal */ }
    setConsentVisible(false);
  };

  const handleSubmit = async () => {
    if (!ticker.trim()) return;
    const result = await submit(ticker);
    if (!result.ok && result.reason === 'gate') {
      setCapModalMode(mode);
      return;
    }
    setTicker('');
  };

  const handleQuickAnalyzeNvda = async () => {
    const result = await submit('NVDA');
    if (!result.ok && result.reason === 'gate') setCapModalMode(mode);
  };
  const handlePortfolioStatus = () => {
    setTicker('SPY');
  };

  const proLikely = isPro;
  const memoMessages = useMemo(() => messages, [messages]);
  // Once an analysis card lands, hide the full composer (chips + mode +
  // horizon + input) and surface a single "ניתוח חדש" CTA. Keeps focus on
  // the result and prevents accidental re-runs.
  const hasAnalysis = useMemo(
    () => messages.some((m) => m.kind === 'quick-card' || m.kind === 'deep-card'),
    [messages],
  );

  // Follow-up Q&A — find the latest analysis card and use it as context.
  const latestAnalysis = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const m = messages[i];
      if (m.kind === 'quick-card' || m.kind === 'deep-card') return m;
    }
    return null;
  }, [messages]);

  const [followupLoading, setFollowupLoading] = useState(false);

  const handleFollowupSubmit = async (question: string) => {
    if (!latestAnalysis) return;
    const qId = `fq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const loadingId = `fl-${Date.now()}`;
    appendMessage({ id: qId, kind: 'followup-question', text: question, ts: Date.now() });
    appendMessage({ id: loadingId, kind: 'followup-loading', ts: Date.now() });
    setFollowupLoading(true);

    try {
      // Build conversation history from prior follow-up turns
      const history = messages
        .filter((m) => m.kind === 'followup-question' || m.kind === 'followup-answer')
        .map((m) => ({
          role: m.kind === 'followup-question' ? ('user' as const) : ('shark' as const),
          text: (m as { text: string }).text,
        }))
        .slice(-8);

      const answer = await fetchFollowupAnswer({
        ticker: latestAnalysis.data.ticker,
        companyName: latestAnalysis.data.companyName,
        mode: latestAnalysis.kind === 'deep-card' ? 'deep' : 'quick',
        analysisJson: JSON.stringify(latestAnalysis.data).slice(0, 12000),
        history,
        question,
      });

      removeMessage(loadingId);
      appendMessage({
        id: `fa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        kind: 'followup-answer',
        text: answer,
        ts: Date.now(),
      });
    } catch (err) {
      removeMessage(loadingId);
      const detail = err instanceof Error ? err.message : 'שגיאה לא ידועה';
      appendMessage({
        id: `fe-${Date.now()}`,
        kind: 'error',
        text: `לא הצלחנו לקבל תשובה: ${detail}`,
        ts: Date.now(),
      });
    } finally {
      setFollowupLoading(false);
    }
  };

  const handleStartNewAnalysis = () => {
    clearSession();
    setTicker('');
    cardOffsetsRef.current.clear();
    // Re-seed the greeting so the empty state feels intentional.
    appendMessage({
      id: 'greet',
      kind: 'captain-text',
      pose: 'hello',
      text: 'אהוי! אני קפטן שארק, האנליסט החינוכי שלך. הקלד טיקר ואצלול לנתח. בחר קצרה לסקירה מהירה, או מעמיקה לניתוח עומק עם חשיבה מורחבת.',
      ts: Date.now(),
    });
  };

  const showHero = memoMessages.length <= 1; // empty or only the greeting

  return (
    <View style={{ flex: 1, backgroundColor: '#0b1735' }}>
      {/* Deep ocean gradient — matches the dark navy mockup vibe */}
      <LinearGradient
        colors={['#1e3a8a', '#1e293b', '#0b1735', '#020617']}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Subtle vertical light streaks (water-shaft feel) */}
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={['rgba(56,189,248,0.08)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.6 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <SharkTabletHeader
          loading={loading}
          historyCount={historyCount}
          onOpenHistory={() => setHistoryVisible(true)}
        />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          // Was `behavior=undefined` on Android — which disabled avoidance entirely
          // and let the keyboard cover the input. `'height'` is the recommended
          // value on Android (works with `adjustResize` in the manifest), and
          // `'padding'` is the canonical value on iOS.
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          // 0 on both — SafeAreaView already wraps this view and consumes the
          // top inset; the SharkTabletHeader above is a sibling INSIDE the same
          // safe area, so KeyboardAvoidingView's own top edge is already
          // correctly placed and needs no extra offset.
          keyboardVerticalOffset={0}
        >
          {/* Chat feed */}
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{
              padding: 12,
              paddingTop: showHero ? 8 : 12,
              paddingBottom: 20,
              gap: 12,
              flexGrow: 1,
            }}
            showsVerticalScrollIndicator={false}
            // Lets the user tap chips/suggestions while the keyboard is open
            // without the first tap silently being eaten to dismiss it.
            keyboardShouldPersistTaps="handled"
            // iOS-only: auto-pads the scroll content so the focused TextInput
            // is always visible above the keyboard, even mid-sentence.
            automaticallyAdjustKeyboardInsets
          >
            {showHero ? (
              <View style={{ alignItems: 'center', paddingTop: 16, paddingBottom: 8, gap: 14 }}>
                {/* Crop the top ~10% of the source WebP — the export has a
                    small grime patch above the captain's head that ruins
                    the silhouette. Wrapper clips, image is shifted up so
                    only the dirty band is hidden. */}
                <View style={{ width: 180, height: 162, overflow: 'hidden' }}>
                  <ExpoImage
                    source={require('../../../assets/webp/fin-tablet-1.webp')}
                    style={{ width: 180, height: 180, marginTop: -18 }}
                    contentFit="contain"
                  />
                </View>
                {/* Gold "Captain of the Sea" title pill — matches mockup */}
                <LinearGradient
                  colors={['#fde68a', '#fbbf24', '#f59e0b']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 999,
                    shadowColor: '#f59e0b',
                    shadowOpacity: 0.5,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 3 },
                    elevation: 4,
                  }}
                >
                  <Text
                    style={{
                      color: '#7c2d12',
                      fontSize: 13,
                      fontWeight: '900',
                      writingDirection: 'rtl',
                      letterSpacing: 0.4,
                    }}
                  >
                    אנליסט פיננסי
                  </Text>
                </LinearGradient>
                <Text
                  style={{
                    color: '#cbd5e1',
                    fontSize: 13,
                    lineHeight: 19,
                    writingDirection: 'rtl',
                    textAlign: 'center',
                    paddingHorizontal: 28,
                    marginTop: 4,
                  }}
                >
                  הקלד טיקר למטה ואצלול לנתח, או לחץ על אחד הצ׳יפים כדי להתחיל.
                </Text>
              </View>
            ) : (
              memoMessages.map((m) => (
                <View
                  key={m.id}
                  onLayout={(e) => {
                    // Record the Y position of card-style messages so we can
                    // scroll back to their top once the analysis lands.
                    if (m.kind === 'quick-card' || m.kind === 'deep-card') {
                      cardOffsetsRef.current.set(m.id, e.nativeEvent.layout.y);
                    }
                  }}
                >
                  <MessageRow m={m} />
                </View>
              ))
            )}
          </ScrollView>

          {/* Bottom composer — hidden once an analysis card is showing.
              Replaced by a follow-up Q&A input + a "new analysis" CTA. */}
          {hasAnalysis ? (
            <View style={styles.newAnalysisBar}>
              <FollowupInput
                loading={followupLoading}
                onSubmit={handleFollowupSubmit}
              />
              <Pressable
                onPress={() => { tapHaptic(); handleStartNewAnalysis(); }}
                accessibilityRole="button"
                accessibilityLabel="ניתוח חדש"
                style={{ borderRadius: 14, overflow: 'hidden', marginTop: 10 }}
              >
                <LinearGradient
                  colors={['#0ea5e9', '#0369a1']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    flexDirection: 'row-reverse',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    paddingVertical: 12,
                  }}
                >
                  <Plus size={16} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>
                    ניתוח חדש
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          ) : (
            <View style={styles.composer}>
              <QuickActionChips
                onAnalyzeNvda={handleQuickAnalyzeNvda}
                onPortfolioStatus={handlePortfolioStatus}
              />
              <ModeToggle
                mode={mode}
                onChange={setMode}
                quickRemaining={proLikely ? null : quickRemaining}
                deepRemaining={proLikely ? null : deepRemaining}
              />
              <HorizonSelector value={horizon} onChange={setHorizon} />
              <AnalystInput
                value={ticker}
                onChange={setTicker}
                onSubmit={handleSubmit}
                loading={loading}
              />
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Consent must wait for the intro video to finish (or be skipped) so it
          doesn't overlap the full-screen video. The intro is the very first
          thing the user sees; the disclaimer is the gate to actually using
          the analyst, so it should land right after. */}
      <FirstLaunchConsentModal
        visible={consentVisible && !introVisible}
        onAccept={handleConsentAccept}
      />
      <CapExceededAnalystModal
        visible={capModalMode !== null}
        mode={capModalMode ?? 'quick'}
        isPro={isPro}
        onClose={() => setCapModalMode(null)}
      />
      <HistoryModal visible={historyVisible} onClose={() => setHistoryVisible(false)} />
      {introVisible ? <IntroVideo onDone={() => setIntroVisible(false)} /> : null}

      {/* Wait-state minigame overlay — mounts above the chat while the user
          taps "🎮 שחק בינתיים" inside LoadingBubble. Self-contained: picks
          a random game from the registry and renders it in freePlay mode. */}
      <WaitGameOverlay visible={waitOverlayVisible} onClose={closeWaitOverlay} />

      {/* Analysis-ready toast — surfaces when a deep analysis has landed but
          hasn't been revealed yet. Tap → reveals the deep card AND closes
          any open wait overlay (handled inside revealPendingDeepCard). */}
      <AnalysisReadyToast visible={!!pendingDeepCard} onReveal={revealPendingDeepCard} />
    </View>
  );
}

function MessageRow({ m }: { m: AnalystMessage }): React.ReactElement | null {
  const router = useRouter();
  // The simulator button on every StockCard used to be a no-op because
  // the parent never supplied onOpenSimulator. Wire it here so taps land
  // on the compound-interest simulator (/(tabs)/simulator) — a generic
  // calculator, not stock-specific, so we don't bother threading the
  // ticker through (the screen has its own inputs).
  const openSimulator = useCallback(() => {
    router.push('/(tabs)/simulator' as never);
  }, [router]);
  switch (m.kind) {
    case 'user-query':
      return <UserQueryBubble text={m.text} />;
    case 'captain-text':
      return <CaptainTextBubble text={m.text} pose={m.pose} />;
    case 'quick-card':
      return <StockCard data={m.data} onOpenSimulator={openSimulator} />;
    case 'deep-card':
      return <DeepAnalysisCard data={m.data} />;
    case 'portfolio-context':
      return <PortfolioContextCard data={m.data} />;
    case 'missed-opportunity':
      return <MissedOpportunityCard data={m.data} />;
    case 'captain-warning':
      return <CaptainWarningCard data={m.data} />;
    case 'loading':
      return <LoadingBubble mode={m.mode} ticker={m.ticker} />;
    case 'followup-question':
      return <FollowupQuestionBubble text={m.text} />;
    case 'followup-answer':
      return <FollowupAnswerBubble text={m.text} />;
    case 'followup-loading':
      return <FollowupLoadingBubble />;
    case 'error':
      return (
        <View
          style={{
            backgroundColor: '#fee2e2',
            borderColor: '#fca5a5',
            borderWidth: 1,
            borderRadius: 12,
            padding: 12,
          }}
        >
          <Text style={{ color: '#7f1d1d', fontSize: 13, writingDirection: 'rtl', textAlign: 'right' }}>
            {m.text}
          </Text>
        </View>
      );
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  composer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 8,
    backgroundColor: 'rgba(2,6,23,0.65)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(56,189,248,0.18)',
  },
  newAnalysisBar: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: 'rgba(2,6,23,0.7)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(56,189,248,0.18)',
  },
});
