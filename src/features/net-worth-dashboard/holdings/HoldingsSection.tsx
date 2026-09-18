import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { GraduationCap, Plus, RefreshCw } from 'lucide-react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { STITCH } from '../../../constants/theme';
import { formatShekel } from '../../../utils/format';
import { tapHaptic } from '../../../utils/haptics';
import { SectionLabel } from '../../financial-tools/components/atoms';
import { FINN_HAPPY, FINN_STANDARD } from '../../retention-loops/finnMascotConfig';
import { lessonRouteById } from '../../subscription/moduleAccess';
import { track } from '../../../lib/analytics/events';
import { useNetWorthStore } from '../useNetWorthStore';
import { recommendPortfolioLesson, unitPriceToIls, type Holding } from './holdingsCatalog';
import { useHoldingsStore } from './useHoldingsStore';
import { useHoldingsQuotes } from './useHoldingsQuotes';
import { HoldingRow } from './HoldingRow';
import { AddHoldingModal } from './AddHoldingModal';

function timeHHMM(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * "תיק המניות שלי" — real holdings with live prices, on the net-worth
 * dashboard. The differentiator vs tracker apps: the portfolio's SHAPE
 * feeds a lesson recommendation so tracking loops back into learning.
 *
 * Writes a {value, count, at} snapshot into useNetWorthStore after every
 * quote fetch so the hero here and the Tools-hub strip count real stocks.
 * Honest states (UX-15): loading skeleton, "no price right now" per ticker,
 * fetch error, "updated HH:MM", estimated-FX notice, manual refresh.
 */
export function HoldingsSection(): React.ReactElement {
  const router = useRouter();
  const holdings = useHoldingsStore((s) => s.holdings);
  const removeHolding = useHoldingsStore((s) => s.removeHolding);
  const setHoldingsSnapshot = useNetWorthStore((s) => s.setHoldingsSnapshot);
  const tickers = useMemo(() => holdings.map((h) => h.ticker), [holdings]);
  const { data, isLoading, isError, isFetching, dataUpdatedAt, refetch } = useHoldingsQuotes(tickers);

  const [editing, setEditing] = useState<Holding | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  const usdIls = data?.usdIls ?? 0;

  const { totalIls, dayChangeIls, weighted, missingCount } = useMemo(() => {
    let total = 0;
    let dayChange = 0;
    let missing = 0;
    const rows: Array<{ holding: Holding; weight: number }> = [];
    if (data) {
      for (const h of holdings) {
        const q = data.quotes[h.ticker];
        if (!q) {
          missing += 1;
          continue;
        }
        const unitIls = unitPriceToIls(q.price, q.currency, h.ticker, data.usdIls);
        const v = h.units * unitIls;
        total += v;
        if (q.previousClose !== null) {
          const prevIls = unitPriceToIls(q.previousClose, q.currency, h.ticker, data.usdIls);
          dayChange += h.units * (unitIls - prevIls);
        }
        rows.push({ holding: h, weight: v });
      }
    }
    return {
      totalIls: total,
      dayChangeIls: dayChange,
      missingCount: missing,
      weighted: rows.map((r) => ({ holding: r.holding, weight: total > 0 ? r.weight / total : 0 })),
    };
  }, [holdings, data]);

  // Snapshot → store (hub hero + dashboard totals). Effect, not render-time.
  useEffect(() => {
    if (holdings.length === 0) {
      setHoldingsSnapshot(null);
      return;
    }
    if (!data) return;
    setHoldingsSnapshot({ valueIls: totalIls, count: holdings.length, at: dataUpdatedAt || Date.now() });
  }, [holdings.length, data, totalIls, dataUpdatedAt, setHoldingsSnapshot]);

  const viewedRef = useRef(false);
  useEffect(() => {
    if (viewedRef.current || holdings.length === 0) return;
    viewedRef.current = true;
    track({ name: 'holdings_section_viewed', props: { holdings_count: holdings.length } });
  }, [holdings.length]);

  const reco = useMemo(() => (weighted.length > 0 ? recommendPortfolioLesson(weighted) : null), [weighted]);

  const handleAdd = useCallback(() => {
    tapHaptic();
    setEditing(null);
    setModalVisible(true);
  }, []);
  const handleEdit = useCallback((h: Holding) => {
    setEditing(h);
    setModalVisible(true);
  }, []);
  const handleLongPress = useCallback(
    (h: Holding) => {
      tapHaptic();
      Alert.alert(h.nameHe, undefined, [
        { text: 'עריכה', onPress: () => handleEdit(h) },
        {
          text: 'הסרה מהתיק',
          style: 'destructive',
          onPress: () => {
            removeHolding(h.id);
            track({ name: 'holding_removed', props: { ticker: h.ticker, holdings_count: holdings.length - 1 } });
          },
        },
        { text: 'ביטול', style: 'cancel' },
      ]);
    },
    [handleEdit, removeHolding, holdings.length],
  );
  const handleClose = useCallback(() => {
    setModalVisible(false);
    setEditing(null);
  }, []);
  const handleFirstHolding = useCallback(() => {
    setCelebrate(true);
    setTimeout(() => setCelebrate(false), 4500);
  }, []);

  const handleLessonCta = () => {
    if (!reco) return;
    tapHaptic();
    track({ name: 'portfolio_lesson_cta_tapped', props: { module_id: reco.moduleId, reason: reco.reason } });
    router.push(lessonRouteById(reco.moduleId, 'chapter-4') as never);
  };

  const dayPct = totalIls - dayChangeIls > 0 ? (dayChangeIls / (totalIls - dayChangeIls)) * 100 : 0;
  const hasHoldings = holdings.length > 0;
  const quotesLoaded = data !== undefined;

  return (
    <View style={styles.wrap}>
      <SectionLabel action="+ הוספה לתיק" onActionPress={handleAdd}>
        תיק המניות שלי
      </SectionLabel>

      {celebrate ? (
        <Animated.View entering={FadeInDown.duration(320)} exiting={FadeOut.duration(200)} style={styles.celebrateCard}>
          <ExpoImage source={FINN_HAPPY} accessible={false} style={styles.celebrateMascot} contentFit="contain" />
          <Text style={styles.celebrateText}>יש לנו תיק. מהיום עוקבים ביחד.</Text>
        </Animated.View>
      ) : null}

      {!hasHoldings ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>יש לכם מניות אמיתיות?</Text>
          <Text style={styles.emptyBody}>
            הוסיפו אותן וצפו בשווי חי בשקלים — מניות מארה"ב, מהבורסה בתל אביב וקריפטו.
          </Text>
          <Pressable onPress={handleAdd} style={styles.emptyCta} accessibilityRole="button" accessibilityLabel="הוספת מניה ראשונה">
            {/* bg on inner View — Pressable function-style drops bg on Android */}
            <View style={styles.emptyCtaInner}>
              <Plus size={16} color="#ffffff" strokeWidth={3} />
              <Text style={styles.emptyCtaText}>הוספת מניה ראשונה</Text>
            </View>
          </Pressable>
          <Text style={styles.disclaimer}>מעקב בלבד — לא מחובר לחשבון מסחר ולא ייעוץ השקעות.</Text>
        </View>
      ) : (
        <>
          {/* Total card — always rendered once there are holdings, so the
              layout doesn't jump when the first quote lands. */}
          <View style={styles.totalCard}>
            <View style={styles.totalTextWrap}>
              <Text style={styles.totalLabel}>שווי חי</Text>
              {isLoading ? (
                <View style={styles.skeleton} accessibilityLabel="טוען מחירים" />
              ) : (
                <Text style={styles.totalValue}>{formatShekel(totalIls)}</Text>
              )}
            </View>
            <View style={styles.totalRight}>
              {!isLoading && dayChangeIls !== 0 ? (
                <View style={[styles.dayPill, dayChangeIls >= 0 ? styles.dayPillUp : styles.dayPillDown]}>
                  <Text style={[styles.dayPillText, dayChangeIls >= 0 ? styles.dayPillTextUp : styles.dayPillTextDown]}>
                    {dayChangeIls >= 0 ? '+' : ''}
                    {formatShekel(dayChangeIls)} · {dayPct >= 0 ? '+' : ''}
                    {dayPct.toFixed(1)}% היום
                  </Text>
                </View>
              ) : null}
              <Pressable
                onPress={() => {
                  tapHaptic();
                  void refetch();
                }}
                disabled={isFetching}
                style={styles.refreshBtn}
                accessibilityRole="button"
                accessibilityLabel="רענון מחירים"
                hitSlop={8}
              >
                {isFetching ? (
                  <ActivityIndicator size="small" color={STITCH.onSurfaceVariant} />
                ) : (
                  <RefreshCw size={14} color={STITCH.onSurfaceVariant} strokeWidth={2.4} />
                )}
                <Text style={styles.refreshText}>
                  {dataUpdatedAt ? `עודכן ${timeHHMM(dataUpdatedAt)}` : 'רענון'}
                </Text>
              </Pressable>
            </View>
          </View>

          {isError && !data ? (
            <Text style={styles.noticeText}>לא הצלחנו למשוך מחירים כרגע. נסו לרענן.</Text>
          ) : null}
          {data && !data.usdIlsLive ? (
            <Text style={styles.noticeText}>שער הדולר משוער — הסכומים בשקלים בקירוב.</Text>
          ) : null}
          {data && missingCount > 0 ? (
            <Text style={styles.noticeText}>
              {missingCount === 1 ? 'נייר אחד בלי מחיר כרגע' : `${missingCount} ניירות בלי מחיר כרגע`} — לא נכלל בסכום.
            </Text>
          ) : null}

          <View style={styles.listGap}>
            {holdings.map((h) => (
              <HoldingRow
                key={h.id}
                holding={h}
                quote={data?.quotes[h.ticker]}
                quotesLoaded={quotesLoaded}
                usdIls={usdIls}
                onPress={handleEdit}
                onLongPress={handleLongPress}
              />
            ))}
          </View>

          {reco ? (
            <Pressable onPress={handleLessonCta} style={styles.recoCard} accessibilityRole="button" accessibilityLabel={`שיעור מומלץ: ${reco.title}`}>
              <ExpoImage source={FINN_STANDARD} accessible={false} style={styles.recoMascot} contentFit="contain" />
              <View style={styles.recoTextWrap}>
                <Text style={styles.recoTitle}>{reco.title}</Text>
                <Text style={styles.recoBody}>{reco.body}</Text>
              </View>
              <View style={styles.recoBadge}>
                <GraduationCap size={14} color="#0369a1" strokeWidth={2.6} />
                <Text style={styles.recoBadgeText}>לשיעור</Text>
              </View>
            </Pressable>
          ) : null}

          <Text style={styles.disclaimer}>מעקב בלבד — לא מחובר לחשבון מסחר ולא ייעוץ השקעות.</Text>
        </>
      )}

      <AddHoldingModal visible={modalVisible} holding={editing} onClose={handleClose} onFirstHolding={handleFirstHolding} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },

  celebrateCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#dcfce7',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: '#86efac',
  },
  celebrateMascot: { width: 40, height: 40 },
  celebrateText: { flex: 1, fontSize: 13.5, fontWeight: '900', color: '#166534', writingDirection: 'rtl', textAlign: 'right' },

  emptyCard: {
    backgroundColor: STITCH.surfaceLowest,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
    gap: 8,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 15, fontWeight: '900', color: STITCH.onSurface, writingDirection: 'rtl', textAlign: 'center' },
  emptyBody: { fontSize: 12.5, fontWeight: '600', color: STITCH.onSurfaceVariant, writingDirection: 'rtl', textAlign: 'center', lineHeight: 18 },
  emptyCta: { borderRadius: 12, marginTop: 4 },
  emptyCtaInner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ec4899',
    borderRadius: 12,
    paddingHorizontal: 18,
    minHeight: 42,
    justifyContent: 'center',
  },
  emptyCtaText: { fontSize: 14, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl' },

  totalCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: STITCH.surfaceLowest,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
    gap: 10,
  },
  totalTextWrap: { alignItems: 'flex-end' },
  totalRight: { alignItems: 'flex-start', gap: 6 },
  totalLabel: { fontSize: 11, fontWeight: '700', color: STITCH.onSurfaceVariant, writingDirection: 'rtl' },
  totalValue: { fontSize: 20, fontWeight: '900', color: STITCH.onSurface, letterSpacing: -0.4, writingDirection: 'rtl' },
  skeleton: { width: 110, height: 22, borderRadius: 6, backgroundColor: STITCH.surfaceHigh, marginTop: 3 },
  dayPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  dayPillUp: { backgroundColor: '#dcfce7' },
  dayPillDown: { backgroundColor: '#fee2e2' },
  dayPillText: { fontSize: 11, fontWeight: '900', writingDirection: 'rtl' },
  dayPillTextUp: { color: '#15803d' },
  dayPillTextDown: { color: '#dc2626' },
  refreshBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingVertical: 2 },
  refreshText: { fontSize: 10.5, fontWeight: '700', color: STITCH.onSurfaceVariant, writingDirection: 'rtl' },
  noticeText: { fontSize: 11, fontWeight: '700', color: '#b45309', writingDirection: 'rtl', textAlign: 'right' },

  listGap: { gap: 10 },

  recoCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#e0f2fe',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: '#7dd3fc',
  },
  recoMascot: { width: 46, height: 46 },
  recoTextWrap: { flex: 1 },
  recoTitle: { fontSize: 13.5, fontWeight: '900', color: '#0369a1', writingDirection: 'rtl', textAlign: 'right' },
  recoBody: { fontSize: 11.5, fontWeight: '600', color: '#475569', writingDirection: 'rtl', textAlign: 'right', marginTop: 1 },
  recoBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: '#ffffff', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  recoBadgeText: { fontSize: 11, fontWeight: '900', color: '#0369a1', writingDirection: 'rtl' },

  disclaimer: { fontSize: 10.5, fontWeight: '600', color: STITCH.onSurfaceVariant, textAlign: 'center', writingDirection: 'rtl' },
});
