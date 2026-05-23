import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Sparkles } from 'lucide-react-native';

import { STITCH } from '../../constants/theme';
import { tapHaptic } from '../../utils/haptics';
import { ToolHeader } from '../financial-tools/components/ToolHeader';
import { useSubscriptionStore, BREAKING_NEWS_PRO_TICKER_CAP, BASIC_LIMITS } from '../subscription/useSubscriptionStore';
import { useUpgradeModalStore } from '../../stores/useUpgradeModalStore';

import { BreakingNewsCard } from './components/BreakingNewsCard';
import { EmptyState } from './components/EmptyState';
import { TickerPickerSheet } from './components/TickerPickerSheet';
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

  const isPro = useSubscriptionStore((s) => s.isPro());
  const showUpgrade = useUpgradeModalStore((s) => s.show);

  const [refreshing, setRefreshing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);

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

  // Initial server refresh on mount.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleOpenPicker = () => {
    tapHaptic();
    if (atLimit && !isPro) {
      showUpgrade('breaking-news');
      return;
    }
    if (atLimit && isPro) {
      Alert.alert(
        'הגעת למקסימום',
        `אפשר לעקוב אחרי עד ${BREAKING_NEWS_PRO_TICKER_CAP} מניות בו-זמנית. הסר אחת כדי להוסיף חדשה.`,
      );
      return;
    }
    setPickerOpen(true);
  };

  const handlePickTicker = async (ticker: string) => {
    // eslint-disable-next-line no-console
    console.log('[BreakingNews] handlePickTicker entry:', ticker);
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
      const message = err instanceof Error ? err.message : 'unknown';
      Alert.alert('משהו השתבש', `לא הצלחנו להוסיף את ${ticker} — נסה שוב. (${message.slice(0, 80)})`);
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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ToolHeader
        title="חדשות מתפרצות"
        subtitle="סיכום AI יומי + מדד הייפ למניות שלך"
        accentColor={ACCENT}
        Icon={Sparkles}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={ACCENT} />
        }
      >
        {!hasItems ? (
          <EmptyState onPickFirstTicker={handleOpenPicker} />
        ) : (
          <>
            <Text style={styles.dayLabel} allowFontScaling={false}>
              {serverTradingDay ? `סיכום ליום ${serverTradingDay}` : 'הסיכום היומי שלך'}
            </Text>

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
              סיכומים חדשים נוצרים אוטומטית כל יום ב-9:00 בבוקר. נקבל התראה ברגע שהם מוכנים.
            </Text>
          </>
        )}
      </ScrollView>

      <TickerPickerSheet
        visible={pickerOpen}
        alreadyTracked={trackedTickers}
        onClose={() => setPickerOpen(false)}
        onPick={handlePickTicker}
      />
    </SafeAreaView>
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
  dayLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: STITCH.onSurfaceVariant,
    textAlign: 'right',
    writingDirection: 'rtl',
    letterSpacing: 0.4,
    paddingHorizontal: 4,
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
});
