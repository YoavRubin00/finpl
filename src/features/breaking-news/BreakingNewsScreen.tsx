import React, { useCallback, useEffect, useState } from 'react';
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
import { AlertTriangle, Bell, LogIn, Newspaper, Plus, Sparkles, X } from 'lucide-react-native';

import { STITCH } from '../../constants/theme';
import { tapHaptic } from '../../utils/haptics';
import { ToolHeader } from '../financial-tools/components/ToolHeader';
import { useAuthStore } from '../auth/useAuthStore';
import { useSubscriptionStore, BREAKING_NEWS_PRO_TICKER_CAP, BASIC_LIMITS } from '../subscription/useSubscriptionStore';
import { useUpgradeModalStore } from '../../stores/useUpgradeModalStore';
import { useNotificationStore } from '../notifications/useNotificationStore';

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

const ACCENT = '#dc2626';

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

  const isPro = useSubscriptionStore((s) => s.isPro());
  const showUpgrade = useUpgradeModalStore((s) => s.show);
  const scheduleBreakingNewsDaily = useNotificationStore((s) => s.scheduleBreakingNewsDaily);
  const notifPermissionGranted = useNotificationStore((s) => s.permissionGranted);

  const [refreshing, setRefreshing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [hourPickerOpen, setHourPickerOpen] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
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

  // Initial server refresh on mount — skip for guests (server requires authId).
  useEffect(() => {
    if (isGuest) return;
    void refresh();
  }, [refresh, isGuest]);

  // Keep the daily local notification synced with the user's preferred hour.
  // Runs once on mount and again any time `notificationHour` changes.
  // No-op when notification permission hasn't been granted yet.
  useEffect(() => {
    if (!notifPermissionGranted) return;
    if (items.length === 0) return; // No tickers → nothing to remind about.
    void scheduleBreakingNewsDaily(notificationHour);
  }, [notificationHour, notifPermissionGranted, items.length, scheduleBreakingNewsDaily]);

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
    // eslint-disable-next-line no-console
    console.log('[BreakingNews] handlePickTicker entry:', ticker);
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
      // Inline banner — Alert.alert silently no-ops on React Native Web, so
      // the user would otherwise see literally nothing.
      setErrorBanner(`לא הצלחנו להוסיף את ${ticker}: ${message.slice(0, 140)}`);
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
          <EmptyState onPickFirstTicker={handleOpenPicker} />
        ) : (
          <>
            <View style={styles.dayHeaderRow}>
              <Text style={styles.dayLabel} allowFontScaling={false}>
                {serverTradingDay ? `סיכום ליום ${serverTradingDay}` : 'הסיכום היומי שלך'}
              </Text>
              <Pressable
                onPress={() => { tapHaptic(); setHourPickerOpen(true); }}
                style={({ pressed }) => [styles.hourChip, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel={`התראה יומית בשעה ${notificationHour}:00`}
              >
                <Bell size={12} color={STITCH.primary} strokeWidth={2.4} />
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
              <Plus size={18} color="#ffffff" strokeWidth={2.6} />
              <Text style={styles.addBtnText} allowFontScaling={false}>
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
    paddingBottom: 80,
    gap: 12,
  },
  dayHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: STITCH.onSurfaceVariant,
    textAlign: 'right',
    writingDirection: 'rtl',
    letterSpacing: 0.4,
  },
  hourChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: STITCH.primary + '14',
    borderWidth: 1,
    borderColor: STITCH.primary + '33',
  },
  hourChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: STITCH.primary,
    writingDirection: 'rtl',
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
  addBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: ACCENT,
    marginTop: 8,
    shadowColor: ACCENT,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  addBtnLocked: {
    backgroundColor: '#64748b',
    shadowColor: '#64748b',
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    writingDirection: 'rtl',
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
