import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  FlatList,
  Alert,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { FANTASY, type FantasySectorId } from '../../../constants/theme';
import { useFantasyStore } from '../useFantasyStore';
import { STOCK_CATEGORIES, TIER_CONFIGS, COMPETITION_RULES } from '../fantasyData';
import { TierSelectionCard } from '../components/TierSelectionCard';
import { DraftCategoryTabs } from '../components/DraftCategoryTabs';
import { DraftProgressBar } from '../components/DraftProgressBar';
import { SharkAnalysisModal } from '../components/SharkAnalysisModal';
import { SharkConfirmModal } from '../components/SharkConfirmModal';
import { RulesModal } from '../components/RulesModal';
import { F2Header, F2Ambient, F2MarketCard, F2PickAllocationRow } from '../v2/components';
import { F2Panel, F2Section, F2Button } from '../v2/atoms';
import { F2CaptainBadge, F2Trophy, F2Chevron } from '../v2/icons';
import { GoldCoinIcon } from '../../../components/ui/GoldCoinIcon';
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
  const currentEntry = useFantasyStore((s) => s.currentEntry);
  const picks = currentEntry?.picks ?? [];
  // No hard manual lock — portfolio is editable for the entire draft phase
  // (Sat 20:00 → Mon 09:00). At competition start, phase logic freezes edits.
  const isLocked = false;
  const enterCompetition = useFantasyStore((s) => s.enterCompetition);
  const pickStock = useFantasyStore((s) => s.pickStock);
  const setCaptain = useFantasyStore((s) => s.setCaptain);
  const setAllocation = useFantasyStore((s) => s.setAllocation);
  const redistributeAllocationsEqually = useFantasyStore((s) => s.redistributeAllocationsEqually);

  const [selectedTier, setSelectedTier] = useState<FantasyTier>('silver');
  const [activeCategory, setActiveCategory] = useState<StockCategoryId>('tech');
  const [analysisStock, setAnalysisStock] = useState<DraftStock | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [confirmJoin, setConfirmJoin] = useState(false);
  const [errorModal, setErrorModal] = useState<{ title: string; message: string } | null>(null);

  const hasEntered = currentEntry !== null;
  const pickedCategories = picks.map((p) => p.categoryId);

  const activeCategoryData = STOCK_CATEGORIES.find((c) => c.id === activeCategory);
  const activeStocks = activeCategoryData?.stocks ?? [];

  // Real coin allocation pool — total = entry coins paid
  const poolMax = currentEntry?.coinsPaid ?? 0;
  const allocatedTotal = useMemo(
    () => picks.reduce((s, p) => s + p.allocation, 0),
    [picks],
  );
  const poolRemaining = poolMax - allocatedTotal;
  const allPicked = picks.length === 5;
  const allocationBalanced = allPicked && poolRemaining === 0;

  const handleEnter = useCallback(() => {
    setConfirmJoin(true);
  }, []);

  const handleConfirmJoin = useCallback(() => {
    setConfirmJoin(false);
    const config = TIER_CONFIGS[selectedTier];
    const ok = enterCompetition(selectedTier);
    if (!ok) {
      setErrorModal({
        title: 'הקופה לא מספיקה, מלח',
        message: `נדרשים ${config.entryCost.toLocaleString('he-IL')} מטבעות כדי לעלות על הסיפון. תאסוף קצת ונחזור לקרב!`,
      });
    }
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

  const handleContinueToLive = useCallback(() => {
    router.push('/fantasy/live');
  }, []);

  const handleToggleLeverage = useCallback(
    (ticker: string) => {
      if (!hasEntered) return;
      const isCurrent = currentEntry?.captainTicker === ticker;
      setCaptain(isCurrent ? null : ticker);
    },
    [currentEntry?.captainTicker, hasEntered, setCaptain],
  );

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
          contentContainerStyle={{ paddingBottom: 200, paddingHorizontal: 16, gap: 12 }}
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

          {/* ─── Rules card (always visible after entry) ─── */}
          {hasEntered && (
            <Animated.View entering={FadeInDown.delay(40).duration(320)}>
              <F2Panel pad={12}>
                <View style={{
                  flexDirection: 'row-reverse',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}>
                  <Text style={{ fontSize: 12, fontWeight: '900', color: FANTASY.ink, ...RTL }}>
                    📋 חוקים בקצרה
                  </Text>
                  <Pressable onPress={() => setShowRules(true)} hitSlop={8}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: FANTASY.primary }}>
                      כל החוקים ←
                    </Text>
                  </Pressable>
                </View>
                {COMPETITION_RULES.slice(0, 2).map((rule, i) => (
                  <View key={i} style={{ flexDirection: 'row-reverse', gap: 6, marginTop: 4 }}>
                    <Text style={{ fontSize: 12, color: FANTASY.gold, marginTop: 1 }}>•</Text>
                    <Text style={{
                      fontSize: 11,
                      color: FANTASY.inkMuted,
                      ...RTL,
                      flex: 1,
                      lineHeight: 17,
                    }}>
                      {rule}
                    </Text>
                  </View>
                ))}
              </F2Panel>
            </Animated.View>
          )}

          {/* ─── Coin allocation pool (real entry coins) ─── */}
          {hasEntered && picks.length > 0 && (
            <Animated.View entering={FadeInDown.delay(60).duration(320)}>
              <View style={{
                backgroundColor: FANTASY.surfaceCard,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: FANTASY.border,
                paddingVertical: 12,
                paddingHorizontal: 14,
                shadowColor: '#0f172a',
                shadowOpacity: 0.04,
                shadowOffset: { width: 0, height: 1 },
                shadowRadius: 2,
                elevation: 1,
                gap: 8,
              }}>
                <View style={{
                  flexDirection: 'row-reverse',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <Text style={{
                    fontSize: 10,
                    color: FANTASY.inkFaint,
                    fontWeight: '800',
                    letterSpacing: 0.6,
                    textTransform: 'uppercase',
                  }}>
                    קופת הליגה
                  </Text>
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 5 }}>
                    <GoldCoinIcon size={14} />
                    <Text style={[
                      { fontSize: 16, fontWeight: '900', color: poolRemaining === 0 ? FANTASY.positiveDark : FANTASY.ink },
                      { fontVariant: ['tabular-nums' as const] },
                    ]}>
                      {allocatedTotal.toLocaleString('en-US')}
                    </Text>
                    <Text style={{ fontSize: 10, color: FANTASY.inkMuted, fontWeight: '700' }}>
                      / {poolMax.toLocaleString('en-US')}
                    </Text>
                  </View>
                </View>
                <View style={{
                  height: 8,
                  borderRadius: 999,
                  backgroundColor: FANTASY.surfaceMuted,
                  overflow: 'hidden',
                  flexDirection: 'row-reverse',
                }}>
                  <View
                    style={{
                      height: '100%',
                      width: `${poolMax > 0 ? (allocatedTotal / poolMax) * 100 : 0}%`,
                      backgroundColor: poolRemaining === 0 ? FANTASY.positive : FANTASY.primary,
                      borderRadius: 999,
                    }}
                  />
                </View>
                {!isLocked && (
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{
                      fontSize: 11,
                      color: poolRemaining === 0 ? FANTASY.positiveDark : FANTASY.warningDark,
                      fontWeight: '800',
                      ...RTL,
                    }}>
                      {poolRemaining === 0
                        ? '✓ כל הקופה הוקצתה'
                        : `נשארו לחלק: ${poolRemaining.toLocaleString('en-US')} 🪙`}
                    </Text>
                    {picks.length > 0 && (
                      <Pressable
                        onPress={redistributeAllocationsEqually}
                        hitSlop={8}
                        style={({ pressed }) => ({
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 999,
                          backgroundColor: pressed ? FANTASY.primaryTint : FANTASY.surfaceLow,
                          borderWidth: 1,
                          borderColor: FANTASY.borderStrong,
                        })}
                        accessibilityLabel="חלוקה שווה"
                      >
                        <Text style={{ fontSize: 10, fontWeight: '900', color: FANTASY.primary }}>
                          ⚖ חלוקה שווה
                        </Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            </Animated.View>
          )}

          {/* ─── Allocation + ×2 leverage rows (after picks added) ─── */}
          {hasEntered && picks.length > 0 && (
            <Animated.View entering={FadeInDown.delay(80).duration(320)} style={{ gap: 10 }}>
              <View style={{
                backgroundColor: FANTASY.goldSoft,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: FANTASY.goldStroke,
                padding: 12,
                flexDirection: 'row-reverse',
                alignItems: 'center',
                gap: 10,
              }}>
                <F2CaptainBadge size={32} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: FANTASY.warningDark, ...RTL }}>
                    הקצה מטבעות + בחר מנוף ×2
                  </Text>
                  <Text style={{ fontSize: 11, color: FANTASY.warningDark, ...RTL, marginTop: 2 }}>
                    אפשר למנף מניה אחת ×2 על התשואה — בחר בחוכמה
                  </Text>
                </View>
              </View>

              <F2Section>הבחירות שלך</F2Section>
              <View style={{ gap: 7 }}>
                {picks.map((p) => {
                  const sector = CATEGORY_TO_SECTOR[p.categoryId] ?? 'tech';
                  const isLeverage = currentEntry?.captainTicker === p.ticker;
                  return (
                    <F2PickAllocationRow
                      key={p.ticker}
                      ticker={p.ticker}
                      name={p.stockName}
                      sector={sector}
                      allocation={p.allocation}
                      poolMax={poolMax}
                      poolRemaining={poolRemaining}
                      isLeverage={isLeverage}
                      onAllocationChange={(amount) => setAllocation(p.ticker, amount)}
                      onToggleLeverage={() => handleToggleLeverage(p.ticker)}
                    />
                  );
                })}
              </View>
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

        {/* ─── Sticky bottom: progress bar + continue CTA ─── */}
        {hasEntered && (
          <View style={styles.stickyBottom}>
            <View style={{
              backgroundColor: FANTASY.surfaceCard,
              borderTopWidth: 1,
              borderTopColor: FANTASY.border,
              paddingHorizontal: 16,
              paddingTop: 10,
              paddingBottom: 24,
              gap: 8,
            }}>
              {/* Status line */}
              <View style={{
                flexDirection: 'row-reverse',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}>
                <Text style={{
                  fontSize: 12,
                  fontWeight: '800',
                  color: picks.length === 5 && allocationBalanced
                    ? FANTASY.positiveDark
                    : FANTASY.inkMuted,
                  textAlign: 'center',
                  writingDirection: 'rtl',
                }}>
                  {picks.length < 5
                    ? `בחרת ${picks.length}/5 מניות`
                    : !allocationBalanced
                      ? `נשארו לחלק ${poolRemaining.toLocaleString('en-US')} 🪙`
                      : currentEntry?.captainTicker
                        ? `✓ מוכן · ${currentEntry.captainTicker} ממונף ×2`
                        : '✓ מוכן · ללא מנוף'}
                </Text>
              </View>

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

              {/* Continue CTA — primary when ready, ghost otherwise */}
              <F2Button
                tone={picks.length === 5 && allocationBalanced ? 'primary' : 'ghost'}
                size="lg"
                onPress={handleContinueToLive}
                disabled={picks.length === 5 && !allocationBalanced}
                iconRight={
                  picks.length === 5 && allocationBalanced
                    ? <F2Chevron size={14} color="#fff" dir="left" />
                    : undefined
                }
              >
                {picks.length === 5 && allocationBalanced
                  ? 'המשך ללוח החי'
                  : picks.length < 5
                    ? 'בנה את התיק להמשך'
                    : 'השלם הקצאה כדי להמשיך'}
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
        <RulesModal visible={showRules} onClose={() => setShowRules(false)} />

        {/* Captain Shark — join confirmation */}
        <SharkConfirmModal
          visible={confirmJoin}
          title={`עולים על הסיפון, ${TIER_CONFIGS[selectedTier].label}?`}
          message={`קופת הקרב — ${TIER_CONFIGS[selectedTier].entryCost.toLocaleString('he-IL')} מטבעות. תחלק חכם בין 5 המניות, מנף את הסוס המוביל, ותתפוס לי מקום בפודיום!`}
          confirmLabel="יוצאים לקרב 🦈"
          cancelLabel="עוד רגע"
          tone="gold"
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
