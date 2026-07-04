import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  FlatList,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { FANTASY, type FantasySectorId } from '../../../constants/theme';
import { tapHaptic } from '../../../utils/haptics';
import { useFantasyStore } from '../useFantasyStore';
import { STOCK_CATEGORIES, TIER_CONFIGS, getNextCompetitionWeekId } from '../fantasyData';
import { getHypeStocksForWeek } from '../hypeStocks';
import { TierSelectionCard } from '../components/TierSelectionCard';
import { DraftCategoryTabs } from '../components/DraftCategoryTabs';
import { SharkAnalysisModal } from '../components/SharkAnalysisModal';
import { SharkConfirmModal } from '../components/SharkConfirmModal';
import { F2Header, F2Ambient, F2MarketCard } from '../v2/components';
import { F2Panel, F2Button } from '../v2/atoms';
import { F2Trophy, F2Chevron } from '../v2/icons';
import type { FantasyTier, StockCategoryId, DraftStock } from '../fantasyTypes';
import type { SparkPath } from '../v2/atoms';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

// Map app StockCategoryId → v2 sector id
const CATEGORY_TO_SECTOR: Record<StockCategoryId, FantasySectorId> = {
  tech: 'tech',
  spec_growth: 'spec_growth',
  energy: 'energy',
  israel: 'israel',
  crypto: 'crypto',
  hype: 'hype',
};

// Real AI score (35-98) — momentum-weighted, no random noise.
//   Base 62 (neutral)
//   + change × 3.5  (positive change boosts, negative drags)
//   + high-volatility bonus when |change| ≥ 6 (interesting trade)
//   + price-quality micro-bonus for sub-$50 (room to run)
function aiScoreFor(_ticker: string, change: number, price: number): number {
  let score = 62 + change * 3.5;
  if (Math.abs(change) >= 6) score += 4;
  if (price < 50) score += 2;
  return Math.round(Math.min(98, Math.max(35, score)));
}

function sparkForChange(change: number): SparkPath {
  if (change >= 8) return 'rally';
  if (change >= 3) return 'rising';
  if (change >= 0.5) return 'up';
  if (change > -0.5) return 'wave';
  if (change > -3) return 'flat';
  if (change > -8) return 'down';
  return 'crash';
}

function riskForChange(change: number): 'low' | 'med' | 'high' {
  const abs = Math.abs(change);
  if (abs < 2) return 'low';
  if (abs < 6) return 'med';
  return 'high';
}

export function DraftLobbyScreen(): React.ReactElement {
  // The draft screen builds the NEXT-week team (the `nextEntry` slot), which
  // runs in parallel with the live competition — never the live `currentEntry`.
  const nextEntry = useFantasyStore((s) => s.nextEntry);
  const picks = nextEntry?.picks ?? [];
  // No hard manual lock — the portfolio is editable for the whole draft window
  // (Thu 09:00 → Mon 09:00 IL). The Monday-09:00 rollover freezes edits.
  const isLocked = false;
  const enterCompetition = useFantasyStore((s) => s.enterCompetition);
  const pickStock = useFantasyStore((s) => s.pickStock);

  const insets = useSafeAreaInsets();
  const [selectedTier, setSelectedTier] = useState<FantasyTier>('silver');
  const [activeCategory, setActiveCategory] = useState<StockCategoryId>('tech');
  const [analysisStock, setAnalysisStock] = useState<DraftStock | null>(null);
  const [confirmJoin, setConfirmJoin] = useState(false);
  const [errorModal, setErrorModal] = useState<{ title: string; message: string } | null>(null);

  const hasEntered =
    nextEntry !== null && nextEntry.weekId === getNextCompetitionWeekId();
  const pickedCategories = picks.map((p) => p.categoryId);

  const activeCategoryData = STOCK_CATEGORIES.find((c) => c.id === activeCategory);
  // The hype category rotates weekly — surface THIS draft's set (for the week
  // being drafted), not the full pool. Other categories show their fixed roster.
  const activeStocks =
    activeCategory === 'hype'
      ? getHypeStocksForWeek(getNextCompetitionWeekId())
      : (activeCategoryData?.stocks ?? []);

  const allPicked = picks.length === 6;

  const handleEnter = useCallback(() => {
    setConfirmJoin(true);
  }, []);

  const handleConfirmJoin = useCallback(() => {
    setConfirmJoin(false);
    const config = TIER_CONFIGS[selectedTier];
    const result = enterCompetition(selectedTier);
    if (result === 'coins') {
      setErrorModal({
        title: 'הקופה לא מספיקה, מלח',
        message: `נדרשים ${config.entryCost.toLocaleString('he-IL')} מטבעות כדי לעלות על הסיפון. תאסוף קצת ונחזור לקרב!`,
      });
    } else if (result === 'closed') {
      setErrorModal({
        title: 'הדראפט סגור כרגע',
        message: 'הדראפט לשבוע הבא נפתח ביום חמישי ב-09:00. בינתיים — צוברים מטבעות ומתכוננים לקרב.',
      });
    }
    // 'already' = כבר נכנסת השבוע (ממשיכים לערוך); 'ok' = הצלחה. שניהם לא שגיאה.
  }, [selectedTier, enterCompetition]);

  const handlePickStock = useCallback(
    (stock: DraftStock) => {
      if (!hasEntered || isLocked) return;

      // Same-category swap → stay on this tab so the user sees the replacement happen.
      const isSwapInCategory = picks.some((p) => p.categoryId === stock.categoryId);

      pickStock(stock.categoryId, stock.ticker, stock.name, stock.mockPrice);

      if (isSwapInCategory) return;

      // First pick in this category → auto-advance to next un-picked category.
      const pickedIds = new Set<StockCategoryId>([
        ...picks.map((p) => p.categoryId),
        stock.categoryId,
      ]);
      const nextCategory = STOCK_CATEGORIES
        .map((c) => c.id)
        .find((id) => !pickedIds.has(id));
      if (nextCategory) setActiveCategory(nextCategory);
    },
    [hasEntered, isLocked, pickStock, picks],
  );

  const handleContinueToYourPicks = useCallback(() => {
    tapHaptic();
    router.push('/fantasy/your-picks');
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: FANTASY.bg }}>
      <F2Ambient tone="sky" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* ─── Header ─── */}
        <F2Header
          eyebrow="דראפט · ליגת מניות"
          title={isLocked ? 'התיק נעול ✓' : 'בנה את התיק'}
          back
          onBack={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/fantasy');
            }
          }}
        />

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 220 + insets.bottom, paddingHorizontal: 16, gap: 12 }}
        >
          {/* ─── Tier selection (pre-entry) ─── */}
          {!hasEntered && (
            <Animated.View entering={FadeInDown.delay(60).duration(320)} style={{ gap: 12 }}>
              <Text style={{
                fontSize: 13,
                fontWeight: '800',
                color: FANTASY.inkLabel,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                ...RTL,
              }}>
                בחר ליגה להצטרפות
              </Text>
              <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
                {Object.values(TIER_CONFIGS).map((config) => (
                  <TierSelectionCard
                    key={config.id}
                    config={config}
                    selected={selectedTier === config.id}
                    disabled={false}
                    onSelect={setSelectedTier}
                  />
                ))}
              </View>
              <F2Button
                tone="gold"
                onPress={handleEnter}
                icon={<F2Trophy size={14} color="#451a03" />}
              >
                הצטרף ל{TIER_CONFIGS[selectedTier].label}
              </F2Button>
            </Animated.View>
          )}

          {/* ─── Category tabs + grid (during draft) ─── */}
          {hasEntered && !isLocked && (
            <>
              <Animated.View entering={FadeInDown.delay(80).duration(320)}>
                <DraftCategoryTabs
                  categories={STOCK_CATEGORIES}
                  activeId={activeCategory}
                  pickedCategories={pickedCategories}
                  onSelect={setActiveCategory}
                />
              </Animated.View>

              {/* Category description card */}
              {activeCategoryData && (
                <Animated.View
                  entering={FadeIn.duration(220)}
                  key={activeCategory}
                >
                  <F2Panel pad={12}>
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10 }}>
                      <Text style={{ fontSize: 22, lineHeight: 28 }}>{activeCategoryData.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          fontSize: 13,
                          fontWeight: '900',
                          color: FANTASY.ink,
                          ...RTL,
                          marginBottom: 3,
                        }}>
                          {activeCategoryData.label}
                        </Text>
                        <Text style={{
                          fontSize: 11,
                          lineHeight: 17,
                          color: FANTASY.inkMuted,
                          ...RTL,
                        }}>
                          {activeCategoryData.description}
                        </Text>
                      </View>
                    </View>
                  </F2Panel>
                </Animated.View>
              )}

              {/* Stock grid 2-col */}
              <Animated.View entering={FadeInDown.delay(140).duration(320)}>
                <FlatList
                  data={activeStocks}
                  keyExtractor={(s) => s.ticker}
                  numColumns={2}
                  scrollEnabled={false}
                  columnWrapperStyle={{ gap: 8, marginBottom: 8 }}
                  renderItem={({ item, index }) => {
                    const sector = CATEGORY_TO_SECTOR[item.categoryId] ?? 'tech';
                    const isPicked = picks.some(
                      (p) => p.categoryId === item.categoryId && p.ticker === item.ticker,
                    );
                    const hot = item.mockWeeklyChange >= 5;
                    return (
                      <Animated.View
                        entering={FadeInDown.delay(index * 55).duration(280)}
                        style={{ flex: 1 }}
                      >
                        <Pressable
                          onPress={() => handlePickStock(item)}
                          onLongPress={() => setAnalysisStock(item)}
                          delayLongPress={250}
                        >
                          <F2MarketCard
                            ticker={item.ticker}
                            name={item.name}
                            sector={sector}
                            change={item.mockWeeklyChange}
                            aiScore={aiScoreFor(item.ticker, item.mockWeeklyChange, item.mockPrice)}
                            spark={sparkForChange(item.mockWeeklyChange)}
                            selected={isPicked}
                            hot={hot}
                            currency={item.currency ?? '$'}
                            price={item.mockPrice}
                            onPress={() => handlePickStock(item)}
                          />
                        </Pressable>
                      </Animated.View>
                    );
                  }}
                />
                <Text style={{
                  fontSize: 10,
                  color: FANTASY.inkFaint,
                  ...RTL,
                  marginTop: 4,
                  textAlign: 'center',
                }}>
                  💡 לחיצה ארוכה על מניה — ניתוח קפטן שארק
                </Text>
              </Animated.View>
            </>
          )}
        </ScrollView>

        {/* ─── Sticky bottom: progress dots + continue-to-phase-2 CTA ─── */}
        {hasEntered && (
          <View style={styles.stickyBottom}>
            <View style={{
              backgroundColor: FANTASY.surfaceCard,
              borderTopWidth: 1,
              borderTopColor: FANTASY.border,
              paddingHorizontal: 16,
              paddingTop: 10,
              paddingBottom: Math.max(insets.bottom + 8, 24),
              gap: 8,
            }}>
              <Text style={{
                fontSize: 12,
                fontWeight: '800',
                color: allPicked ? FANTASY.positiveDark : FANTASY.inkMuted,
                textAlign: 'center',
                writingDirection: 'rtl',
              }}>
                {allPicked ? '✓ כל המניות נבחרו — הזמן לסדר את התיק' : `בחרת ${picks.length}/6 מניות`}
              </Text>

              {/* Mini progress dots — 1 per category */}
              <View style={{
                flexDirection: 'row-reverse',
                gap: 6,
                justifyContent: 'center',
              }}>
                {STOCK_CATEGORIES.map((cat) => {
                  const isPicked = picks.some((p) => p.categoryId === cat.id);
                  return (
                    <View
                      key={cat.id}
                      style={{
                        width: 26,
                        height: 4,
                        borderRadius: 999,
                        backgroundColor: isPicked ? FANTASY.positive : FANTASY.surfaceMuted,
                      }}
                    />
                  );
                })}
              </View>

              {/* Continue to phase 2 — primary when all 5 picked, ghost otherwise */}
              <F2Button
                tone={allPicked ? 'primary' : 'ghost'}
                size="lg"
                onPress={handleContinueToYourPicks}
                disabled={!allPicked}
                iconRight={allPicked ? <F2Chevron size={14} color="#fff" dir="left" /> : undefined}
              >
                {allPicked ? 'המשך לסידור התיק' : 'בנה את התיק להמשך'}
              </F2Button>

              <Text style={{
                fontSize: 10,
                color: FANTASY.inkFaint,
                fontWeight: '700',
                textAlign: 'center',
                writingDirection: 'rtl',
              }}>
                💡 אפשר לערוך את התיק עד יום שני 09:00
              </Text>
            </View>
          </View>
        )}

        {/* ─── Modals ─── */}
        <SharkAnalysisModal
          stock={analysisStock}
          visible={analysisStock !== null}
          onClose={() => setAnalysisStock(null)}
          onPick={() => analysisStock && handlePickStock(analysisStock)}
          isPicked={
            analysisStock !== null &&
            picks.some(
              (p) => p.categoryId === analysisStock.categoryId && p.ticker === analysisStock.ticker,
            )
          }
        />
        {/* Captain Shark — join confirmation. CTA is tinted by the selected tier. */}
        <SharkConfirmModal
          visible={confirmJoin}
          title={`עולים על הסיפון, ${TIER_CONFIGS[selectedTier].label}?`}
          message={`קופת הקרב — ${TIER_CONFIGS[selectedTier].entryCost.toLocaleString('he-IL')} מטבעות. לחלק חכם בין 6 המניות, למנף את הסוס המוביל, ולהראות לשוק מי הכריש כאן.`}
          confirmLabel="צאו לקרב"
          cancelLabel="עוד רגע"
          tier={selectedTier}
          onConfirm={handleConfirmJoin}
          onCancel={() => setConfirmJoin(false)}
        />

        {/* Captain Shark — error (insufficient coins / generic) */}
        <SharkConfirmModal
          visible={errorModal !== null}
          title={errorModal?.title ?? ''}
          message={errorModal?.message ?? ''}
          confirmLabel="הבנתי"
          cancelLabel="סגור"
          tone="danger"
          onConfirm={() => setErrorModal(null)}
          onCancel={() => setErrorModal(null)}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  stickyBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});
