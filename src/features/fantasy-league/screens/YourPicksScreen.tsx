import React, { useCallback, useEffect, useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { FANTASY, type FantasySectorId } from '../../../constants/theme';
import { tapHaptic, successHaptic } from '../../../utils/haptics';
import { useFantasyStore } from '../useFantasyStore';
import { F2Header, F2Ambient } from '../v2/components';
import { F2Button, F2Panel } from '../v2/atoms';
import type { StockCategoryId } from '../fantasyTypes';
import { YourPicksRow } from '../components/YourPicksRow';
import { SharkConfirmModal } from '../components/SharkConfirmModal';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

// Map app category → v2 sector id (same map DraftLobbyScreen uses).
const CATEGORY_TO_SECTOR: Record<StockCategoryId, FantasySectorId> = {
  tech: 'tech',
  spec_growth: 'spec_growth',
  energy: 'energy',
  israel: 'israel',
  crypto: 'crypto',
};

/**
 * Phase-2 draft screen — pick allocation + captain (×2) + vice (×1.5).
 * Reached from DraftLobbyScreen after all 5 picks are confirmed.
 *
 * Defaults: on first arrival (no allocations set), call
 * `redistributeAllocationsEqually` so each pick lands at exactly 20% × 5 = 100%.
 * Otherwise preserve whatever the user already adjusted.
 *
 * The "צאו לקרב" CTA only enables when `isReadyForBattle()` is true (picks=5,
 * captain+vice on distinct stocks, allocations sum to entry pool). The
 * "חזור לדרפט" ghost button below it returns to /fantasy/draft — captain,
 * vice, and allocations all persist in the store across the round trip.
 */
export function YourPicksScreen(): React.ReactElement {
  const currentEntry = useFantasyStore((s) => s.currentEntry);
  const picks = currentEntry?.picks ?? [];
  const setAllocation = useFantasyStore((s) => s.setAllocation);
  const setCaptain = useFantasyStore((s) => s.setCaptain);
  const setVice = useFantasyStore((s) => s.setVice);
  const redistributeAllocationsEqually = useFantasyStore((s) => s.redistributeAllocationsEqually);
  const isReadyForBattle = useFantasyStore((s) => s.isReadyForBattle);
  const lockDraft = useFantasyStore((s) => s.lockDraft);

  const insets = useSafeAreaInsets();
  const [confirmJoin, setConfirmJoin] = React.useState(false);

  const poolMax = currentEntry?.coinsPaid ?? 0;
  const allocatedTotal = useMemo(
    () => picks.reduce((s, p) => s + p.allocation, 0),
    [picks],
  );
  const poolRemaining = poolMax - allocatedTotal;
  const balanced = poolRemaining === 0 && poolMax > 0;
  const ready = isReadyForBattle();

  // Apply 20%-each default once: only when picks exist but no allocation set yet.
  useEffect(() => {
    if (picks.length === 0) return;
    const sum = picks.reduce((s, p) => s + p.allocation, 0);
    if (sum === 0) redistributeAllocationsEqually();
  }, [picks.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBack = useCallback(() => {
    tapHaptic();
    router.replace('/fantasy/draft');
  }, []);

  const handleConfirm = useCallback(() => {
    successHaptic();
    lockDraft();
    setConfirmJoin(false);
    router.push('/fantasy/live');
  }, [lockDraft]);

  const handleBattle = useCallback(() => {
    if (!ready) return;
    setConfirmJoin(true);
  }, [ready]);

  const hint = !currentEntry
    ? 'אין דראפט פעיל — חזור ובחר מניות'
    : picks.length < 5
      ? `חסרות ${5 - picks.length} מניות — חזור לדרפט`
      : !currentEntry.captainTicker
        ? 'סמן מניה אחת ל-×2 (קפטן)'
        : !currentEntry.viceTicker
          ? 'סמן מניה אחרת ל-×1.5 (משנה)'
          : !balanced
            ? poolRemaining > 0
              ? `נשאר לחלק ${poolRemaining.toLocaleString('en-US')} 🪙`
              : 'ההקצאה חורגת מהקופה'
            : null;

  return (
    <View style={{ flex: 1, backgroundColor: FANTASY.bg }}>
      <F2Ambient tone="sky" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <F2Header
          eyebrow="דראפט · שלב 2"
          title="הבחירות שלך"
          back
          onBack={handleBack}
        />

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 220 + insets.bottom, paddingHorizontal: 16, gap: 12 }}
        >
          {/* Intro / total bar */}
          <Animated.View entering={FadeInDown.duration(280)}>
            <F2Panel pad={12}>
              <Text style={{ fontSize: 13, fontWeight: '900', color: FANTASY.ink, ...RTL }}>
                סמנו מניה ל-×2 ומניה ל-×1.5 — וקבעו את ההקצאה
              </Text>
              <Text style={{ fontSize: 11, color: FANTASY.inkMuted, marginTop: 4, ...RTL }}>
                ברירת מחדל: 20% לכל מניה. הקפטן והמשנה חייבים להיות שתי מניות שונות.
              </Text>

              {/* Pool progress */}
              <View
                style={{
                  flexDirection: 'row-reverse',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '900',
                    color: FANTASY.inkFaint,
                    letterSpacing: 0.6,
                    textTransform: 'uppercase',
                  }}
                >
                  קופת הליגה
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '900',
                    color: balanced ? FANTASY.positiveDark : FANTASY.warningDark,
                    fontVariant: ['tabular-nums' as const],
                  }}
                >
                  {allocatedTotal.toLocaleString('en-US')} / {poolMax.toLocaleString('en-US')} 🪙
                </Text>
              </View>
              <View
                style={{
                  height: 8,
                  marginTop: 6,
                  borderRadius: 999,
                  backgroundColor: FANTASY.surfaceMuted,
                  overflow: 'hidden',
                  flexDirection: 'row-reverse',
                }}
              >
                <View
                  style={{
                    height: '100%',
                    width: `${poolMax > 0 ? Math.min(100, (allocatedTotal / poolMax) * 100) : 0}%`,
                    backgroundColor: balanced ? FANTASY.positive : FANTASY.primary,
                    borderRadius: 999,
                  }}
                />
              </View>
            </F2Panel>
          </Animated.View>

          {/* Picks list */}
          <View style={{ gap: 8 }}>
            {picks.map((p) => {
              const sector = CATEGORY_TO_SECTOR[p.categoryId] ?? 'tech';
              const isCaptain = currentEntry?.captainTicker === p.ticker;
              const isVice = currentEntry?.viceTicker === p.ticker;
              return (
                <YourPicksRow
                  key={p.ticker}
                  ticker={p.ticker}
                  name={p.stockName}
                  sector={sector}
                  allocation={p.allocation}
                  poolMax={poolMax}
                  poolRemaining={poolRemaining}
                  isCaptain={isCaptain}
                  isVice={isVice}
                  onAllocationChange={(amount) => setAllocation(p.ticker, amount)}
                  onToggleCaptain={() => setCaptain(isCaptain ? null : p.ticker)}
                  onToggleVice={() => setVice(isVice ? null : p.ticker)}
                />
              );
            })}
          </View>
        </ScrollView>

        {/* Sticky footer — stacked CTAs */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: FANTASY.surfaceCard,
            borderTopWidth: 1,
            borderTopColor: FANTASY.border,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom + 8, 18),
            gap: 8,
          }}
        >
          {hint ? (
            <Text
              style={{
                fontSize: 11,
                fontWeight: '800',
                color: FANTASY.warningDark,
                textAlign: 'center',
                writingDirection: 'rtl',
              }}
            >
              {hint}
            </Text>
          ) : null}

          <F2Button tone="primary" size="lg" onPress={handleBattle} disabled={!ready}>
            צאו לקרב
          </F2Button>

          <F2Button tone="ghost" size="md" onPress={handleBack}>
            חזור לדרפט
          </F2Button>
        </View>

        {/* Final confirm modal — uses the selected tier's gradient */}
        <SharkConfirmModal
          visible={confirmJoin}
          title="לנעול את התיק?"
          message="לאחר נעילה לא ניתן לשנות עד יום שני 09:00 — סיום הדראפט וסטארט התחרות."
          confirmLabel="כן, נעלו את התיק"
          cancelLabel="עוד רגע"
          tier={currentEntry?.tier ?? 'silver'}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmJoin(false)}
        />
      </SafeAreaView>
    </View>
  );
}
