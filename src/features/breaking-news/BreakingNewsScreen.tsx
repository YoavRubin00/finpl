import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AlertTriangle, Bell, Crown, LogIn, Newspaper, Plus, Sparkles, X } from 'lucide-react-native';

import { STITCH } from '../../constants/theme';
import { tapHaptic } from '../../utils/haptics';
import { ToolHeader } from '../financial-tools/components/ToolHeader';
import { useAuthStore } from '../auth/useAuthStore';
import { useIsPro } from '../subscription/useSubscription';
import { BREAKING_NEWS_PRO_TICKER_CAP, BASIC_LIMITS } from '../subscription/subscriptionConstants';
import { useUpgradeModalStore } from '../../stores/useUpgradeModalStore';
import { useNotificationStore } from '../notifications/useNotificationStore';
import { captureEvent } from '../../lib/posthog';

import { BreakingNewsCard } from './components/BreakingNewsCard';
import { EmptyState } from './components/EmptyState';
import { TickerPickerSheet } from './components/TickerPickerSheet';
import { NotificationHourPicker } from './components/NotificationHourPicker';
import { CalculateButton } from '../financial-tools/components/atoms/CalculateButton';
import { useBreakingNewsStore } from './useBreakingNewsStore';
import {
  addTrackedTicker,
  fetchBreakingNewsList,
  generateBreakingNewsForTicker,
  removeTrackedTicker,
} from './breakingNewsApi';

// Light-mode STITCH treatment with blue accent — matches the rest of the
// app (DailyQuests, financial tools, Pearl sheet). User asked for "unified
// with the rest of the app, not dark mode" 2026-06-03 after a brief dark
// mode experiment.
const ACCENT = '#0ea5e9';

/** Turn a raw API error (e.g. `generate 500: {"error":...,"reqId":"abc-123"}`)
 *  into a friendly Hebrew banner — never surface server JSON to the user. Keeps
 *  the short reqId (when present) so support can grep the Vercel logs for it. */
function friendlyAddError(ticker: string, rawMessage: string): string {
  const reqId = rawMessage.match(/"reqId":"([^"]+)"/)?.[1];
  const code = reqId ? ` (קוד: ${reqId})` : '';
  if (/\b429\b/.test(rawMessage)) return 'יותר מדי בקשות כרגע. נסו שוב בעוד כמה דקות.';
  if (/\b401\b/.test(rawMessage)) return 'צריך להתחבר מחדש כדי להוסיף מניות.';
  return `לא הצלחנו ליצור סיכום ל-${ticker} כרגע. נסו שוב בעוד רגע${code}.`;
}

/**
 * Main screen for the Breaking News tool.
 *
 * Mount lifecycle:
 *   1. Render whatever's in the local cache instantly (Zustand persist).
 *   2. Fire a background /list refresh to overwrite with server truth.
 *   3. Drop into the EmptyState when there are zero tracked tickers.
 *
 * Add flow:
 *   - Hub button → check Pro gate → either open picker or fire upgrade modal.
 *   - On pick: optimistic add to local store → POST /track → POST /generate
 *     (so the first summary lands within seconds, not next day).
 */
export function BreakingNewsScreen(): React.ReactElement {
  const items = useBreakingNewsStore((s) => s.items);
  const serverTradingDay = useBreakingNewsStore((s) => s.serverTradingDay);
  const setItems = useBreakingNewsStore((s) => s.setItems);
  const addLocal = useBreakingNewsStore((s) => s.addLocal);
  const removeLocal = useBreakingNewsStore((s) => s.removeLocal);
  const markRead = useBreakingNewsStore((s) => s.markRead);
  const notificationHour = useBreakingNewsStore((s) => s.notificationHour);
  const setNotificationHour = useBreakingNewsStore((s) => s.setNotificationHour);

  // Guest users (and anyone whose auth-store email hasn't been hydrated yet)
  // can't hit the server endpoints — they all require authId. Gate the
  // whole feature behind a register CTA instead of letting the user pick a
  // ticker and then get a cryptic "Not authenticated" error from the api.
  const email = useAuthStore((s) => s.email);
  const isGuest = !email;

  const isPro = useIsPro();
  const showUpgrade = useUpgradeModalStore((s) => s.show);
  const scheduleBreakingNewsDaily = useNotificationStore((s) => s.scheduleBreakingNewsDaily);
  const notifPermissionGranted = useNotificationStore((s) => s.permissionGranted);
  const requestNotifPermission = useNotificationStore((s) => s.requestPermission);

  const [refreshing, setRefreshing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [hourPickerOpen, setHourPickerOpen] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  /** Tickers whose on-demand generation failed this session — drives the
   *  per-card "נסה שוב" state instead of an endless "מנתח חדשות" spinner. */
  const [failed, setFailed] = useState<Set<string>>(new Set());
  /** Inline error banner — replaces Alert.alert which doesn't render on
   *  React Native Web. Cleared when the user dismisses it or on next pick. */
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const trackedTickers = items.map((i) => i.ticker);
  const limit = isPro ? BREAKING_NEWS_PRO_TICKER_CAP : BASIC_LIMITS['breaking-news'];
  const atLimit = items.length >= limit;

  const refresh = useCallback(async () => {
    try {
      const res = await fetchBreakingNewsList();
      setItems(
        res.items.map((it) => ({
          ticker: it.ticker,
          addedAt: it.addedAt,
          summary: it.summary,
          tradingDay: it.tradingDay,
          generatedAt: it.generatedAt,
        })),
        res.tradingDay,
      );
    } catch {
      /* swallow — keep showing cached. user pulls to retry. */
    }
  }, [setItems]);

  // Tracks tickers we've already tried to on-demand backfill this session,
  // so re-renders don't re-fire generation (and rack up cost / hit the 5/hr
  // server rate limit).
  const backfillAttempted = useRef<Set<string>>(new Set());

  // Initial server refresh on mount — skip for guests (server requires authId).
  // After the refresh, on-demand backfill any ticker still pending today so
  // stale tickers (added before the fix / before today's cron) fill in within
  // seconds instead of waiting until tomorrow's 9:00 cron. Best-effort: a
  // failed generate leaves the card pending (we do NOT remove the ticker).
  useEffect(() => {
    if (isGuest) return;
    void (async () => {
      await refresh();
      const pending = useBreakingNewsStore.getState().items.filter((i) => !i.summary);
      let didGenerate = false;
      for (const it of pending) {
        if (backfillAttempted.current.has(it.ticker)) continue;
        backfillAttempted.current.add(it.ticker);
        setGenerating(it.ticker);
        didGenerate = true;
        try {
          await generateBreakingNewsForTicker(it.ticker);
        } catch (err) {
          // Surface the failure (card shows "נסה שוב") + log the real cause so
          // we can finally see WHY (401/429/500/504) in PostHog. Then STOP —
          // a failure is almost always systemic, so hammering the rest just
          // burns the 5/hr generate rate limit and hard-locks the user.
          const message = err instanceof Error ? err.message : String(err);
          try { captureEvent('breaking_news_generate_failed', { ticker: it.ticker, message, source: 'backfill' }); } catch { /* non-fatal */ }
          setFailed((prev) => new Set(prev).add(it.ticker));
          break;
        }
      }
      if (didGenerate) {
        setGenerating(null);
        await refresh();
      }
    })();
  }, [refresh, isGuest]);

  // Manual per-card retry after a failed generation. Clears the failed/attempted
  // marks for that ticker and tries once more.
  const handleRetryTicker = useCallback(async (ticker: string) => {
    tapHaptic();
    setFailed((prev) => { const next = new Set(prev); next.delete(ticker); return next; });
    backfillAttempted.current.delete(ticker);
    setGenerating(ticker);
    try {
      await generateBreakingNewsForTicker(ticker);
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      try { captureEvent('breaking_news_generate_failed', { ticker, message, source: 'retry' }); } catch { /* non-fatal */ }
      setFailed((prev) => new Set(prev).add(ticker));
    } finally {
      setGenerating(null);
    }
  }, [refresh]);

  // Keep the daily local notification synced with the user's preferred hour.
  // Runs once on mount and again any time `notificationHour` changes.
  // No-op when notification permission hasn't been granted yet.
  useEffect(() => {
    if (!notifPermissionGranted) return;
    if (items.length === 0) return; // No tickers → nothing to remind about.
    void scheduleBreakingNewsDaily(notificationHour);
  }, [notificationHour, notifPermissionGranted, items.length, scheduleBreakingNewsDaily]);

  const handleEnableNotifications = useCallback(async () => {
    tapHaptic();
    await requestNotifPermission();
    // If the user already has a ticker, sync the daily push right away.
    if (items.length > 0) {
      void scheduleBreakingNewsDaily(notificationHour);
    }
  }, [requestNotifPermission, items.length, scheduleBreakingNewsDaily, notificationHour]);

  const handleOpenPicker = () => {
    tapHaptic();
    if (atLimit && !isPro) {
      showUpgrade('breaking-news');
      return;
    }
    if (atLimit && isPro) {
      setErrorBanner(
        `הגעת למקסימום ${BREAKING_NEWS_PRO_TICKER_CAP} מניות. הסר אחת כדי להוסיף חדשה.`,
      );
      return;
    }
    setPickerOpen(true);
  };

  const handlePickTicker = async (ticker: string) => {
    setErrorBanner(null);
    setPickerOpen(false);
    // Optimistic: render the placeholder card immediately so the user sees feedback.
    addLocal(ticker);
    setGenerating(ticker);
    try {
      await addTrackedTicker(ticker);
      // Trigger on-demand generation so the user doesn't wait until tomorrow.
      await generateBreakingNewsForTicker(ticker);
      await refresh();
    } catch (err) {
      removeLocal(ticker);
      const message = err instanceof Error ? err.message : String(err);
      try { captureEvent('breaking_news_generate_failed', { ticker, message, source: 'add' }); } catch { /* non-fatal */ }
      // Friendly banner — never dump the raw server JSON
      // (`generate 500: {"error":...}`) at the user. Keep the full raw message
      // in the PostHog event above for diagnosis, and surface only a short
      // reqId here so support can correlate it with the Vercel logs.
      setErrorBanner(friendlyAddError(ticker, message));
    } finally {
      setGenerating(null);
    }
  };

  const handleRemoveTicker = async (ticker: string) => {
    tapHaptic();
    removeLocal(ticker);
    try {
      await removeTrackedTicker(ticker);
    } catch {
      // Best-effort. On next refresh the server is the source of truth.
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const hasItems = items.length > 0;

  if (isGuest) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ToolHeader
          title="חדשות מתפרצות"
          subtitle="סיכום AI יומי + מדד הייפ למניות שלך"
          accentColor={ACCENT}
          Icon={Sparkles}
          toolKey="breaking-news"
        />
        <ScrollView
          contentContainerStyle={styles.guestScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.guestIconWrap}>
            <LogIn size={32} color="#2563eb" strokeWidth={2.4} />
          </View>

          <Text style={styles.guestTitle} allowFontScaling={false}>
            צריך חשבון כדי לעקוב אחרי מניות
          </Text>
          <Text style={styles.guestSubtitle} allowFontScaling={false}>
            ההרשמה לוקחת 30 שניות. אחרי זה כל בוקר תקבל סיכום AI של החדשות והסנטימנט על המניות שבחרת.
          </Text>

          <View style={styles.guestFeatures}>
            <GuestFeatureRow Icon={Newspaper} text="סיכום AI יומי מ-10 מקורות אמיתיים" />
            <GuestFeatureRow Icon={Sparkles} text="מדד הייפ חברתי 0–100 לכל מניה" />
            <GuestFeatureRow Icon={Bell} text="התראה כל בוקר בשעה שתבחר" />
          </View>

          <View style={{ alignSelf: 'stretch', marginTop: 4 }}>
            <CalculateButton
              label="הירשם"
              variant="blue"
              iconLeft={<LogIn size={18} color="#ffffff" strokeWidth={2.6} />}
              onPress={() => router.push(`/(auth)/register?returnTo=${encodeURIComponent('/breaking-news')}` as never)}
              accessibilityLabel="הירשם"
            />
          </View>

          <Text style={styles.guestFinePrint} allowFontScaling={false}>
            חינם לחלוטין. בלי כרטיס אשראי.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ToolHeader
        title="חדשות מתפרצות"
        subtitle="סיכום AI יומי + מדד הייפ למניות שלך"
        accentColor={ACCENT}
        Icon={Sparkles}
        toolKey="breaking-news"
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={ACCENT} />
        }
      >
        {errorBanner ? (
          <View style={styles.errorBanner}>
            <AlertTriangle size={16} color="#991b1b" strokeWidth={2.4} />
            <Text style={styles.errorText} allowFontScaling={false}>{errorBanner}</Text>
            <Pressable
              onPress={() => setErrorBanner(null)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="סגור הודעה"
            >
              <X size={16} color="#991b1b" strokeWidth={2.4} />
            </Pressable>
          </View>
        ) : null}

        {!hasItems ? (
          <EmptyState
            onPickFirstTicker={handleOpenPicker}
            onEnableNotifications={handleEnableNotifications}
            notificationsEnabled={notifPermissionGranted}
          />
        ) : (
          <>
            <View style={styles.dayHeaderRow}>
              <Text style={styles.dayLabel} allowFontScaling={false}>
                {serverTradingDay ? `סיכום ליום ${serverTradingDay}` : 'הסיכום היומי שלך'}
              </Text>
              <Pressable
                onPress={() => { tapHaptic(); setHourPickerOpen(true); }}
                style={({ pressed }) => [styles.hourChip, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
                accessibilityRole="button"
                accessibilityLabel={`התראה יומית בשעה ${notificationHour}:00`}
              >
                <Bell size={13} color="#ffffff" strokeWidth={2.6} />
                <Text style={styles.hourChipText} allowFontScaling={false}>
                  התראה ב-{String(notificationHour).padStart(2, '0')}:00
                </Text>
              </Pressable>
            </View>

            {items.map((item) => (
              <BreakingNewsCard
                key={item.ticker}
                item={item}
                serverTradingDay={serverTradingDay}
                onRemove={handleRemoveTicker}
                onMarkRead={markRead}
                hasFailed={failed.has(item.ticker)}
                isGenerating={generating === item.ticker}
                onRetry={handleRetryTicker}
              />
            ))}

            {generating ? (
              <View style={styles.generatingRow}>
                <ActivityIndicator size="small" color={ACCENT} />
                <Text style={styles.generatingText} allowFontScaling={false}>
                  מנתח חדשות על {generating}…
                </Text>
              </View>
            ) : null}

            <Pressable
              onPress={handleOpenPicker}
              style={({ pressed }) => [
                styles.addBtn,
                atLimit && styles.addBtnLocked,
                pressed && { opacity: 0.85 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={atLimit ? 'שדרג ל-PRO' : 'הוסף מניה'}
            >
              {atLimit && !isPro ? (
                <Crown size={18} color="#ffffff" strokeWidth={2.6} />
              ) : (
                <Plus size={18} color="#ffffff" strokeWidth={2.6} />
              )}
              <Text
                style={[styles.addBtnText, atLimit && !isPro && styles.addBtnTextLocked]}
                allowFontScaling={false}
              >
                {atLimit && !isPro
                  ? `שדרג ל-PRO לעוד ${BREAKING_NEWS_PRO_TICKER_CAP - items.length} מניות`
                  : atLimit
                    ? `${items.length}/${limit} — הסר כדי להוסיף`
                    : 'הוסף מניה'}
              </Text>
            </Pressable>

            <Text style={styles.footerHint} allowFontScaling={false}>
              סיכומים חדשים נוצרים אוטומטית כל יום ב-9:00 בבוקר. ההתראה שלך תגיע ב-{String(notificationHour).padStart(2, '0')}:00.
            </Text>
          </>
        )}
      </ScrollView>

      <NotificationHourPicker
        visible={hourPickerOpen}
        currentHour={notificationHour}
        onClose={() => setHourPickerOpen(false)}
        onPick={(h) => {
          setNotificationHour(h);
          setHourPickerOpen(false);
        }}
      />

      <TickerPickerSheet
        visible={pickerOpen}
        alreadyTracked={trackedTickers}
        onClose={() => setPickerOpen(false)}
        onPick={handlePickTicker}
      />
    </SafeAreaView>
  );
}

function GuestFeatureRow({
  Icon,
  text,
}: {
  Icon: typeof Sparkles;
  text: string;
}): React.ReactElement {
  return (
    <View style={styles.guestFeatureRow}>
      <View style={styles.guestFeatureIconBg}>
        <Icon size={16} color="#2563eb" strokeWidth={2.4} />
      </View>
      <Text style={styles.guestFeatureText} allowFontScaling={false}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: STITCH.background,
  },
  scroll: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  dayHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: STITCH.onSurface,
    textAlign: 'right',
    writingDirection: 'rtl',
    letterSpacing: 0.2,
  },
  // Deep-blue Duo-style BUTTON (Yoav 2026-06-15: the hour control "מופיע בצבע
  // לבן ולא ככפתור"). Was a thin sky-blue (#0ea5e9) pill that read as a passive
  // chip; now a rounded-rect with a darker bottom edge + elevation so it
  // unmistakably reads as a tappable button — same deep-blue family as the
  // profile / upgrade CTAs.
  hourChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#0c4a6e',
    borderBottomWidth: 3,
    borderBottomColor: '#082f49',
    shadowColor: '#0c4a6e',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  hourChipText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ffffff',
    writingDirection: 'rtl',
    letterSpacing: 0.2,
  },
  errorBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#991b1b',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  generatingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 10,
  },
  generatingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400e',
    writingDirection: 'rtl',
  },
  // Deep-blue Duo-style CTA. Was sky-#0ea5e9 whose white label sat at ~2:1
  // contrast and washed out on bright screens (same class as the hourChip /
  // retry bugs, Yoav 2026-06-15) — deepened to #0c4a6e for legible white text,
  // unified with the hour button + upgrade CTA + profile CTA.
  addBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#0c4a6e',
    marginTop: 8,
    borderBottomWidth: 4,
    borderBottomColor: '#082f49',
    shadowColor: '#0c4a6e',
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  // At-limit + not-Pro upgrade state — DEEP BLUE to match the profile / chat
  // upgrade CTA (Yoav 2026-06-15: "קריאה לשדרג כמו בפרופיל, כחול עמוק"). Was
  // gold (#fbbf24) for a "premium" feel; deep-blue-on-white text actually has
  // higher contrast than the gold (which had failed WCAG white-on-amber before
  // 2026-06-06), so the legibility fix is preserved.
  addBtnLocked: {
    backgroundColor: '#0c4a6e',
    borderBottomColor: '#082f49',
    shadowColor: '#0c4a6e',
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    writingDirection: 'rtl',
    letterSpacing: 0.2,
  },
  // White text on the deep-blue upgrade button — high contrast.
  addBtnTextLocked: {
    color: '#ffffff',
  },
  footerHint: {
    fontSize: 11,
    color: STITCH.onSurfaceVariant,
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 16,
    marginTop: 4,
  },
  guestScroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 14,
  },
  guestIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#2563eb',
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  guestTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: STITCH.onSurface,
    textAlign: 'center',
    writingDirection: 'rtl',
    letterSpacing: -0.4,
  },
  guestSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: STITCH.onSurfaceVariant,
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 21,
    maxWidth: 340,
  },
  guestFeatures: {
    alignSelf: 'stretch',
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  guestFeatureRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  guestFeatureIconBg: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestFeatureText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: STITCH.onSurface,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  guestFinePrint: {
    fontSize: 12,
    fontWeight: '600',
    color: STITCH.onSurfaceVariant,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: 6,
  },
});
