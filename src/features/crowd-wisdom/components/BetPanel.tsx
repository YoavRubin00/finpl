import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { Target, TrendingUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  cancelAnimation,
  withTiming,
  Easing,
  useReducedMotion,
  interpolate,
} from 'react-native-reanimated';

import { tapHaptic, successHaptic, errorHaptic } from '../../../utils/haptics';
import { useEconomy, useSpendCoins } from '../../economy/useEconomy';
import { useAuthStore } from '../../auth/useAuthStore';
import { requestGuestGate } from '../../auth/guestValueGate';
import { tokenStore } from '../../../lib/auth/secureStore';
import { fetchBetOdds, placeBet, type ChoiceOdds } from '../../../db/sync/syncCrowdBets';
import { GoldCoinIcon } from '../../../components/ui/GoldCoinIcon';
import { useCrowdWisdomStore } from '../useCrowdWisdomStore';
import type { CrowdWisdomQuestion } from '../types';

// Quick-fill shortcuts — the stake itself is a free-typed amount (Yoav: not
// limited to 250).
const PRESETS = [50, 100, 250] as const;
const MIN_STAKE = 10;
// Mirrors the server cap in app/api/crowd-bets/place+api.ts (MAX_STAKE = 1000)
// so the user hits a Hebrew inline error, never the server's raw English 400.
const MAX_STAKE = 1000;

interface BetPanelProps {
  question: CrowdWisdomQuestion;
  selectedChoiceId: string | null;
}

/**
 * Coin PREDICTION panel for a crowd question (skill prediction, NOT gambling —
 * game-coins only, non-redeemable). The multiplier is peer/crowd-driven and set
 * in REAL TIME — when the crowd concentrates on one choice its multiplier drops,
 * and a contrarian, correct prediction pays more. The multiplier is locked at
 * placement. The stake is any whole coin amount the user types (≥10, ≤ balance).
 */
export function BetPanel({ question, selectedChoiceId }: BetPanelProps): React.ReactElement | null {
  const { data: economyData } = useEconomy();
  const coins = economyData?.coins ?? 0;
  const spendCoins = useSpendCoins();
  const reduced = useReducedMotion();

  const [open, setOpen] = useState(false);
  const [stakeText, setStakeText] = useState<string>('100');
  const [odds, setOdds] = useState<ChoiceOdds[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Placed state lives in the PERSISTED crowd-wisdom store (not component
  // state): the server holds one bet per user per question forever, so after an
  // app restart the stake CTA must stay replaced by the locked-prediction view
  // (re-placing would only 409). `?? null` keeps the selector reference-stable.
  const placed = useCrowdWisdomStore((s) => s.placedBets[question.id] ?? null);

  const choiceIds = question.choices.map((c) => c.id);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetchBetOdds({ questionId: question.id, choiceIds })
      .then((table) => {
        if (!cancelled) setOdds(table);
      })
      .catch(() => {
        if (!cancelled) setError('התחזיות לא זמינות כרגע. נסו שוב עוד רגע.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, question.id]);

  // Premium CTA shimmer (matches PremiumFantasyButton), respecting reduced motion.
  const shimmer = useSharedValue(0);
  useEffect(() => {
    if (reduced) {
      shimmer.value = 0;
      return;
    }
    shimmer.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(shimmer);
  }, [reduced, shimmer]);
  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0, 0.5, 0]),
    transform: [{ translateX: interpolate(shimmer.value, [0, 1], [-90, 90]) }],
  }));

  if (!selectedChoiceId && !placed) return null;

  const stake = parseInt(stakeText, 10);
  const stakeValid =
    Number.isFinite(stake) && stake >= MIN_STAKE && stake <= MAX_STAKE && stake <= coins;
  const selectedOdds = odds?.find((o) => o.choiceId === selectedChoiceId)?.odds ?? null;
  const potential = selectedOdds !== null && stakeValid ? Math.round(stake * selectedOdds) : null;

  const handleStakeChange = (text: string): void => {
    // Keep digits only, cap length so the payout row can't overflow.
    const digits = text.replace(/[^0-9]/g, '').slice(0, 8);
    setStakeText(digits);
    const typed = parseInt(digits, 10);
    if (Number.isFinite(typed) && typed > MAX_STAKE) {
      // Immediate feedback — the server rejects >MAX_STAKE with a raw English
      // 400, so the cap is explained here in Hebrew while typing.
      setError(`המקסימום לתחזית הוא ${MAX_STAKE.toLocaleString('he-IL')} מטבעות.`);
    } else if (error) {
      setError(null);
    }
  };

  const handlePlace = async (): Promise<void> => {
    if (!selectedChoiceId || placing || placed) return;
    setError(null);
    // Guests can't hold a prediction in the server ledger (it's keyed to a
    // real account) — a stake attempt IS the conversion moment: show the
    // register gate instead of sending a 'guest' bet (Yoav 2026-07-03 policy).
    if (useAuthStore.getState().isGuest) {
      requestGuestGate('prediction_attempt');
      return;
    }
    if (!Number.isFinite(stake) || stake < MIN_STAKE) {
      errorHaptic();
      setError(`המינימום לתחזית הוא ${MIN_STAKE} מטבעות.`);
      return;
    }
    if (stake > MAX_STAKE) {
      errorHaptic();
      setError(`המקסימום לתחזית הוא ${MAX_STAKE.toLocaleString('he-IL')} מטבעות.`);
      return;
    }
    if (stake > coins) {
      errorHaptic();
      setError('אין לכם מספיק מטבעות לתחזית הזו.');
      return;
    }
    setPlacing(true);
    try {
      const auth = useAuthStore.getState();
      const syncToken = await tokenStore.get();
      const result = await placeBet({
        authId: auth.email ?? 'guest',
        syncToken,
        questionId: question.id,
        choiceId: selectedChoiceId,
        choiceIds,
        stake,
      });
      spendCoins(stake);
      successHaptic();
      // Persisted (not setState) — flips this panel to the locked view now AND
      // on every future mount, incl. after app restarts.
      useCrowdWisdomStore.getState().recordPlacedBet(question.id, {
        stake,
        lockedOdds: result.lockedOdds,
        potentialPayout: result.potentialPayout,
        placedAt: Date.now(),
      });
      setOdds(result.odds);
    } catch (e) {
      errorHaptic();
      setError(e instanceof Error ? e.message : 'התחזית לא נקלטה. נסו שוב.');
    } finally {
      setPlacing(false);
    }
  };

  if (placed) {
    return (
      <Animated.View entering={FadeIn.duration(240)} style={[styles.panel, styles.placedPanel]}>
        <View style={styles.placedTitleRow}>
          <Text style={styles.placedTitle} maxFontSizeMultiplier={1.15}>התחזית נעולה:</Text>
          <Text style={styles.placedTitle} maxFontSizeMultiplier={1.15}>{placed.stake.toLocaleString('he-IL')}</Text>
          <GoldCoinIcon size={14} />
          <Text style={styles.placedTitle} maxFontSizeMultiplier={1.15}>· מכפיל פי {placed.lockedOdds}</Text>
        </View>
        <Text style={styles.placedSub}>
          זכייה צפויה אם צדקתם: {placed.potentialPayout.toLocaleString('he-IL')} מטבעות. המכפיל ננעל לפי הקהל ברגע התחזית.
        </Text>
      </Animated.View>
    );
  }

  if (!open) {
    return (
      <Pressable
        onPress={() => {
          tapHaptic();
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel="כמה מטבעות על התחזית — המכפיל נקבע לפי הקהל"
        hitSlop={6}
        style={({ pressed }) => [styles.ctaOuter, { opacity: pressed ? 0.92 : 1 }]}
      >
        <LinearGradient
          colors={['#a78bfa', '#7c3aed', '#6d28d9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ctaGradient}
        >
          <Animated.View pointerEvents="none" style={[styles.ctaShimmer, shimmerStyle]}>
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.8)', 'transparent']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          <View style={styles.ctaRow}>
            <View style={styles.ctaIconWrap}>
              <Target size={22} color="#ffffff" strokeWidth={2.6} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ctaTitle} maxFontSizeMultiplier={1.15} numberOfLines={1}>
                כמה מטבעות על התחזית
              </Text>
              <Text style={styles.ctaSub} maxFontSizeMultiplier={1.15} numberOfLines={1}>
                המכפיל נקבע לפי הקהל בזמן אמת
              </Text>
            </View>
            <GoldCoinIcon size={22} />
          </View>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Animated.View entering={FadeInDown.duration(240)} style={styles.panel}>
      <View style={styles.headerRow}>
        <Target size={16} color="#7c3aed" strokeWidth={2.4} />
        <Text style={styles.title}>תחזית מטבעות</Text>
        {loading && <ActivityIndicator size="small" color="#7c3aed" />}
      </View>

      {/* Balance */}
      <View style={styles.balanceRow}>
        <GoldCoinIcon size={14} />
        <Text style={styles.balanceText} maxFontSizeMultiplier={1.15}>
          היתרה שלכם: {coins.toLocaleString('he-IL')} מטבעות
        </Text>
      </View>

      {/* Free-amount input with quick-fill presets */}
      <View style={styles.stakesRow}>
        {PRESETS.map((s) => {
          const active = stake === s;
          return (
            <Pressable
              key={s}
              onPress={() => {
                tapHaptic();
                setStakeText(String(s));
                if (error) setError(null);
              }}
              accessibilityRole="button"
              accessibilityLabel={`מילוי מהיר ${s} מטבעות`}
              style={[styles.stakeChip, active && styles.stakeChipActive]}
            >
              <Text
                style={[styles.stakeChipText, active && styles.stakeChipTextActive]}
                maxFontSizeMultiplier={1.15}
              >
                {s.toLocaleString('he-IL')}
              </Text>
              <GoldCoinIcon size={11} />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.inputRow}>
        <Text style={styles.inputLabel} maxFontSizeMultiplier={1.15}>סכום התחזית</Text>
        <View style={styles.inputBox}>
          <TextInput
            value={stakeText}
            onChangeText={handleStakeChange}
            keyboardType="number-pad"
            inputMode="numeric"
            placeholder="0"
            placeholderTextColor="#c4b5fd"
            style={styles.input}
            maxLength={8}
            accessibilityLabel="סכום התחזית במטבעות"
            maxFontSizeMultiplier={1.15}
          />
          <GoldCoinIcon size={14} />
        </View>
      </View>

      {/* Live payout at the real, server-locked odds */}
      {selectedOdds !== null ? (
        <View style={styles.payoutCard}>
          <View style={styles.payoutTopRow}>
            <Text style={styles.payoutLabel} maxFontSizeMultiplier={1.15}>זכייה צפויה אם צדקתם</Text>
            <View style={styles.payoutOddsPill}>
              <TrendingUp size={13} color="#15803d" strokeWidth={2.6} />
              <Text style={styles.payoutOddsText} maxFontSizeMultiplier={1.15}>מכפיל צפוי · פי {selectedOdds}</Text>
            </View>
          </View>
          <View style={styles.payoutValueRow}>
            <Text style={styles.payoutBig} maxFontSizeMultiplier={1.15}>
              {potential !== null ? potential.toLocaleString('he-IL') : '—'}
            </Text>
            <GoldCoinIcon size={18} />
            <Text style={styles.payoutUnit} maxFontSizeMultiplier={1.15} numberOfLines={1}>
              מטבעות
            </Text>
          </View>
        </View>
      ) : (
        !loading && (
          <Text style={styles.oddsHint}>
            המכפיל נקבע לפי התחזיות של כולם — כשכולם על אותה תשובה, המכפיל עליה קטן.
          </Text>
        )
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Pressable
        onPress={handlePlace}
        disabled={placing || selectedOdds === null || !stakeValid}
        accessibilityRole="button"
        accessibilityLabel="נעילת התחזית"
        style={[styles.placeBtn, (placing || selectedOdds === null || !stakeValid) && styles.placeBtnDisabled]}
      >
        {placing ? (
          <Text style={styles.placeBtnText} maxFontSizeMultiplier={1.15}>נועל תחזית…</Text>
        ) : (
          <View style={styles.placeBtnInner}>
            <Text style={styles.placeBtnText} maxFontSizeMultiplier={1.15}>
              נעלו {Number.isFinite(stake) ? stake.toLocaleString('he-IL') : '0'}
            </Text>
            <GoldCoinIcon size={13} />
            <Text style={styles.placeBtnText} maxFontSizeMultiplier={1.15}>על התחזית</Text>
          </View>
        )}
      </Pressable>

      <Text style={styles.sharkLine}>
        קפטן שארק: המכפיל נקבע על ידי הקהל — כשכולם חוזים אותו דבר, הוא קטן.
      </Text>

      <Text style={styles.disclaimer}>
        מטבעות משחק בלבד — לא כסף אמיתי ולא ניתן לפדיון.
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ctaOuter: {
    borderRadius: 16,
    shadowColor: '#7c3aed',
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  ctaGradient: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#c4b5fd',
  },
  ctaShimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 100,
  },
  ctaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    minHeight: 30,
  },
  ctaIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    writingDirection: 'rtl',
    textAlign: 'right',
    letterSpacing: -0.2,
  },
  ctaSub: {
    fontSize: 11.5,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    writingDirection: 'rtl',
    textAlign: 'right',
    marginTop: 2,
    flexShrink: 1,
  },
  panel: {
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  placedPanel: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  placedTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
  },
  placedTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#15803d',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  placedSub: {
    fontSize: 11,
    color: '#166534',
    writingDirection: 'rtl',
    textAlign: 'right',
    lineHeight: 16,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
    color: '#5b21b6',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  balanceRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  balanceText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6d28d9',
    writingDirection: 'rtl',
    textAlign: 'right',
    flexShrink: 1,
  },
  stakesRow: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  stakeChip: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#ddd6fe',
    backgroundColor: '#ffffff',
    paddingVertical: 8,
  },
  stakeChipActive: {
    borderColor: '#7c3aed',
    backgroundColor: '#ede9fe',
  },
  stakeChipText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6b7280',
  },
  stakeChipTextActive: {
    color: '#5b21b6',
  },
  inputRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#5b21b6',
    writingDirection: 'rtl',
    textAlign: 'right',
    flexShrink: 1,
  },
  inputBox: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#ddd6fe',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
    color: '#5b21b6',
    textAlign: 'right',
    writingDirection: 'rtl',
    padding: 0,
  },
  payoutCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  payoutTopRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  payoutLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803d',
    writingDirection: 'rtl',
    textAlign: 'right',
    flexShrink: 1,
  },
  payoutOddsPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  payoutOddsText: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#15803d',
    fontVariant: ['tabular-nums'],
  },
  payoutValueRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  payoutBig: {
    fontSize: 22,
    fontWeight: '900',
    color: '#15803d',
    fontVariant: ['tabular-nums'],
  },
  payoutUnit: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
    writingDirection: 'rtl',
    textAlign: 'right',
    flexShrink: 1,
  },
  oddsHint: {
    fontSize: 11,
    color: '#6d28d9',
    writingDirection: 'rtl',
    textAlign: 'right',
    lineHeight: 16,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b91c1c',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  placeBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  placeBtnInner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 5,
  },
  placeBtnDisabled: {
    backgroundColor: '#c4b5fd',
  },
  placeBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#ffffff',
  },
  sharkLine: {
    fontSize: 11,
    color: '#6d28d9',
    fontWeight: '700',
    writingDirection: 'rtl',
    textAlign: 'right',
    lineHeight: 16,
  },
  disclaimer: {
    fontSize: 10,
    color: '#8b5cf6',
    writingDirection: 'rtl',
    textAlign: 'center',
  },
});
