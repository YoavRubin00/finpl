import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { GraduationCap, Plus } from 'lucide-react-native';

import { STITCH } from '../../../constants/theme';
import { formatShekel } from '../../../utils/format';
import { tapHaptic } from '../../../utils/haptics';
import { SectionLabel } from '../../financial-tools/components/atoms';
import { FINN_STANDARD } from '../../retention-loops/finnMascotConfig';
import { lessonRouteById } from '../../subscription/moduleAccess';
import { track } from '../../../lib/analytics/events';
import { recommendPortfolioLesson, unitPriceToIls, type Holding } from './holdingsCatalog';
import { useHoldingsStore } from './useHoldingsStore';
import { useHoldingsQuotes } from './useHoldingsQuotes';
import { HoldingRow } from './HoldingRow';
import { AddHoldingModal } from './AddHoldingModal';

/**
 * "תיק המניות שלי" — real holdings with live prices, on the net-worth
 * dashboard. The differentiator vs tracker apps: the portfolio's SHAPE
 * feeds a lesson recommendation (concentration → diversification module,
 * no ETF → ETF module, …) so tracking loops back into learning.
 *
 * Reports the live ₪ total upward via onValueChange so the summary hero
 * includes it in the family's total net worth.
 */
export function HoldingsSection({
  onValueChange,
}: {
  onValueChange: (valueIls: number) => void;
}): React.ReactElement {
  const router = useRouter();
  const holdings = useHoldingsStore((s) => s.holdings);
  const tickers = useMemo(() => holdings.map((h) => h.ticker), [holdings]);
  const { data } = useHoldingsQuotes(tickers);

  const [editing, setEditing] = useState<Holding | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const usdIls = data?.usdIls ?? 0;

  const { totalIls, dayChangeIls, weighted } = useMemo(() => {
    let total = 0;
    let dayChange = 0;
    const rows: Array<{ holding: Holding; weight: number }> = [];
    if (data) {
      for (const h of holdings) {
        const q = data.quotes[h.ticker];
        if (!q) continue;
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
      weighted: rows.map((r) => ({
        holding: r.holding,
        weight: total > 0 ? r.weight / total : 0,
      })),
    };
  }, [holdings, data]);

  // Live value feeds the summary hero. Effect (not render-time call) so the
  // parent isn't set-stated mid-render.
  useEffect(() => {
    onValueChange(totalIls);
  }, [totalIls, onValueChange]);

  const viewedRef = useRef(false);
  useEffect(() => {
    if (viewedRef.current || holdings.length === 0) return;
    viewedRef.current = true;
    track({
      name: 'holdings_section_viewed',
      props: { holdings_count: holdings.length },
    });
  }, [holdings.length]);

  const reco = useMemo(
    () => (weighted.length > 0 ? recommendPortfolioLesson(weighted) : null),
    [weighted],
  );

  const handleAdd = () => {
    tapHaptic();
    setEditing(null);
    setModalVisible(true);
  };
  const handleEdit = (h: Holding) => {
    setEditing(h);
    setModalVisible(true);
  };
  const handleClose = () => {
    setModalVisible(false);
    setEditing(null);
  };

  const handleLessonCta = () => {
    if (!reco) return;
    tapHaptic();
    track({
      name: 'portfolio_lesson_cta_tapped',
      props: { module_id: reco.moduleId, reason: reco.reason },
    });
    router.push(lessonRouteById(reco.moduleId, 'chapter-4') as never);
  };

  const dayPct =
    totalIls - dayChangeIls > 0 ? (dayChangeIls / (totalIls - dayChangeIls)) * 100 : 0;

  return (
    <View style={styles.wrap}>
      <SectionLabel action="+ הוספה לתיק" onActionPress={handleAdd}>
        תיק המניות שלי
      </SectionLabel>

      {holdings.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>יש לכם מניות אמיתיות?</Text>
          <Text style={styles.emptyBody}>
            הוסיפו אותן וצפו בשווי חי — כולל שער דולר, שינוי יומי ורווח כולל.
          </Text>
          <Pressable
            onPress={handleAdd}
            style={styles.emptyCta}
            accessibilityRole="button"
            accessibilityLabel="הוספת מניה ראשונה"
          >
            {/* bg on inner View — Pressable function-style drops bg on Android */}
            <View style={styles.emptyCtaInner}>
              <Plus size={16} color="#ffffff" strokeWidth={3} />
              <Text style={styles.emptyCtaText}>הוספת מניה ראשונה</Text>
            </View>
          </Pressable>
          <Text style={styles.disclaimer}>
            מעקב בלבד — לא מחובר לחשבון מסחר ולא ייעוץ השקעות.
          </Text>
        </View>
      ) : (
        <>
          {totalIls > 0 ? (
            <View style={styles.totalCard}>
              <View style={styles.totalTextWrap}>
                <Text style={styles.totalLabel}>שווי חי</Text>
                <Text style={styles.totalValue}>{formatShekel(totalIls)}</Text>
              </View>
              {dayChangeIls !== 0 ? (
                <View
                  style={[
                    styles.dayPill,
                    dayChangeIls >= 0 ? styles.dayPillUp : styles.dayPillDown,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayPillText,
                      dayChangeIls >= 0 ? styles.dayPillTextUp : styles.dayPillTextDown,
                    ]}
                  >
                    {dayChangeIls >= 0 ? '+' : ''}
                    {formatShekel(dayChangeIls)} · {dayPct >= 0 ? '+' : ''}
                    {dayPct.toFixed(1)}% היום
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.listGap}>
            {holdings.map((h) => (
              <HoldingRow
                key={h.id}
                holding={h}
                quote={data?.quotes[h.ticker]}
                usdIls={usdIls}
                onPress={handleEdit}
              />
            ))}
          </View>

          {reco ? (
            <Pressable
              onPress={handleLessonCta}
              style={styles.recoCard}
              accessibilityRole="button"
              accessibilityLabel={`שיעור מומלץ: ${reco.title}`}
            >
              <ExpoImage
                source={FINN_STANDARD}
                accessible={false}
                style={styles.recoMascot}
                contentFit="contain"
              />
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

          <Text style={styles.disclaimer}>
            מעקב בלבד — לא מחובר לחשבון מסחר ולא ייעוץ השקעות.
          </Text>
        </>
      )}

      <AddHoldingModal visible={modalVisible} holding={editing} onClose={handleClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },

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
  emptyTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 12.5,
    fontWeight: '600',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
    textAlign: 'center',
    lineHeight: 18,
  },
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
  emptyCtaText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff',
    writingDirection: 'rtl',
  },

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
  totalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '900',
    color: STITCH.onSurface,
    letterSpacing: -0.4,
    writingDirection: 'rtl',
  },
  dayPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  dayPillUp: { backgroundColor: '#dcfce7' },
  dayPillDown: { backgroundColor: '#fee2e2' },
  dayPillText: { fontSize: 11, fontWeight: '900', writingDirection: 'rtl' },
  dayPillTextUp: { color: '#15803d' },
  dayPillTextDown: { color: '#dc2626' },

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
  recoTitle: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#0369a1',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  recoBody: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
    writingDirection: 'rtl',
    textAlign: 'right',
    marginTop: 1,
  },
  recoBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  recoBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0369a1',
    writingDirection: 'rtl',
  },

  disclaimer: {
    fontSize: 10.5,
    fontWeight: '600',
    color: STITCH.onSurfaceVariant,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
