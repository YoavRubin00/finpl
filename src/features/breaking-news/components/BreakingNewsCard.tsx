import React from 'react';
import { View, Text, Pressable, StyleSheet, Alert, Linking } from 'react-native';
import { TrendingUp, TrendingDown, Minus, ExternalLink, X } from 'lucide-react-native';

import { STITCH } from '../../../constants/theme';
import { tapHaptic } from '../../../utils/haptics';
import { findCatalogEntry } from '../tickerCatalog';
import { HypeGauge } from './HypeGauge';
import type { CachedTickerSummary } from '../useBreakingNewsStore';

interface BreakingNewsCardProps {
  item: CachedTickerSummary;
  serverTradingDay: string | null;
  /** Fires when the user explicitly removes the ticker (long-press menu). */
  onRemove: (ticker: string) => void;
  /** Called when the card enters view / is tapped — used to clear the red dot. */
  onMarkRead: (ticker: string) => void;
}

/** One row in the Breaking News list. Shows the company badge + hype gauge
 *  on the top row (RTL: ticker leading right), then the AI summary, key
 *  events, and source chips. Designed to be scannable in <2s. */
export function BreakingNewsCard({
  item,
  serverTradingDay,
  onRemove,
  onMarkRead,
}: BreakingNewsCardProps): React.ReactElement {
  const catalog = findCatalogEntry(item.ticker);
  const summary = item.summary;
  const pending = !summary;
  const isFresh = serverTradingDay !== null && item.tradingDay === serverTradingDay;

  const handlePress = () => {
    tapHaptic();
    onMarkRead(item.ticker);
  };

  const handleLongPress = () => {
    Alert.alert(
      `${item.ticker} — הסרה מהמעקב?`,
      'תפסיק לקבל סיכומים יומיים על המניה הזו.',
      [
        { text: 'ביטול', style: 'cancel' },
        { text: 'הסר', style: 'destructive', onPress: () => onRemove(item.ticker) },
      ],
    );
  };

  const handleSourcePress = (url: string) => {
    tapHaptic();
    Alert.alert(
      'מעבר למקור חיצוני',
      'הקישור יפתח בדפדפן — להמשיך?',
      [
        { text: 'לא עכשיו', style: 'cancel' },
        { text: 'להמשיך', onPress: () => Linking.openURL(url).catch(() => undefined) },
      ],
    );
  };

  const SentimentIcon =
    summary?.sentiment === 'bullish' ? TrendingUp
      : summary?.sentiment === 'bearish' ? TrendingDown
        : Minus;
  const sentimentColor =
    summary?.sentiment === 'bullish' ? '#16a34a'
      : summary?.sentiment === 'bearish' ? '#dc2626'
        : '#64748b';
  const sentimentLabel =
    summary?.sentiment === 'bullish' ? 'חיובי'
      : summary?.sentiment === 'bearish' ? 'שלילי'
        : 'נייטרלי';

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.94 }]}
      accessibilityRole="button"
      accessibilityLabel={`סיכום יומי על ${catalog?.nameHe ?? item.ticker}`}
    >
      {/* Top row — ticker + sentiment + hype gauge */}
      <View style={styles.topRow}>
        <View style={styles.tickerBlock}>
          <Text style={styles.tickerSymbol} allowFontScaling={false}>{item.ticker}</Text>
          {catalog ? (
            <Text style={styles.tickerName} allowFontScaling={false} numberOfLines={1}>
              {catalog.nameHe}
            </Text>
          ) : null}
          {summary ? (
            <View style={[styles.sentimentChip, { backgroundColor: sentimentColor + '1a' }]}>
              <SentimentIcon size={11} color={sentimentColor} strokeWidth={2.6} />
              <Text style={[styles.sentimentText, { color: sentimentColor }]} allowFontScaling={false}>
                {sentimentLabel}
              </Text>
            </View>
          ) : null}
        </View>

        {summary ? (
          <HypeGauge value={summary.hypeIndex} />
        ) : (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>מחפש חדשות…</Text>
          </View>
        )}
      </View>

      {/* AI summary */}
      {summary ? (
        <Text style={styles.summary} allowFontScaling={false}>
          {summary.summary}
        </Text>
      ) : (
        <Text style={styles.pendingHint} allowFontScaling={false}>
          הסיכום הראשון שלך יהיה מוכן תוך כמה שניות — או מחר ב-9:00 לכל המאוחר.
        </Text>
      )}

      {/* Key events */}
      {summary && summary.keyEvents.length > 0 ? (
        <View style={styles.eventsList}>
          {summary.keyEvents.map((ev, i) => (
            <View key={i} style={styles.eventRow}>
              <View
                style={[
                  styles.eventDot,
                  {
                    backgroundColor:
                      ev.impact === 'high' ? '#dc2626'
                        : ev.impact === 'med' ? '#f59e0b'
                          : '#94a3b8',
                  },
                ]}
              />
              <Text style={styles.eventText} allowFontScaling={false}>{ev.title}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Source chips */}
      {summary && summary.sources.length > 0 ? (
        <View style={styles.sourcesRow}>
          {summary.sources.slice(0, 3).map((src, i) => (
            <Pressable
              key={i}
              onPress={() => handleSourcePress(src.url)}
              style={({ pressed }) => [styles.sourceChip, pressed && { opacity: 0.7 }]}
              accessibilityRole="link"
              accessibilityLabel={src.title}
            >
              <ExternalLink size={11} color={STITCH.primary} strokeWidth={2.4} />
              <Text
                style={styles.sourceText}
                allowFontScaling={false}
                numberOfLines={1}
              >
                {src.title}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Freshness footer */}
      {summary && !isFresh ? (
        <Text style={styles.staleHint} allowFontScaling={false}>
          הסיכום הזה מיום מסחר {item.tradingDay} — סיכום היום יגיע ב-9:00.
        </Text>
      ) : null}

      {/* Long-press hint — discoverability for the remove action. */}
      <View style={styles.removeHintRow}>
        <X size={10} color="#94a3b8" />
        <Text style={styles.removeHint} allowFontScaling={false}>
          לחיצה ארוכה להסרה מהמעקב
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  tickerBlock: {
    alignItems: 'flex-end',
    gap: 4,
  },
  tickerSymbol: {
    fontSize: 22,
    fontWeight: '900',
    color: STITCH.onSurface,
    letterSpacing: -0.4,
  },
  tickerName: {
    fontSize: 12,
    fontWeight: '600',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
    textAlign: 'right',
    maxWidth: 160,
  },
  sentimentChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  sentimentText: {
    fontSize: 11,
    fontWeight: '800',
    writingDirection: 'rtl',
  },
  pendingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#fef3c7',
    borderRadius: 999,
  },
  pendingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400e',
    writingDirection: 'rtl',
  },
  summary: {
    fontSize: 14,
    fontWeight: '600',
    color: STITCH.onSurface,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 21,
  },
  pendingHint: {
    fontSize: 13,
    fontWeight: '500',
    color: STITCH.onSurfaceVariant,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 19,
  },
  eventsList: {
    gap: 6,
  },
  eventRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  eventText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: STITCH.onSurface,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  sourcesRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
  },
  sourceChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: STITCH.primary + '12',
    borderRadius: 8,
    maxWidth: '49%',
  },
  sourceText: {
    fontSize: 11,
    fontWeight: '700',
    color: STITCH.primary,
    writingDirection: 'rtl',
  },
  staleHint: {
    fontSize: 11,
    color: STITCH.onSurfaceVariant,
    fontStyle: 'italic',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  removeHintRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingTop: 2,
  },
  removeHint: {
    fontSize: 10,
    color: '#94a3b8',
    writingDirection: 'rtl',
  },
});
