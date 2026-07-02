import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Dices, TrendingUp } from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import { tapHaptic, successHaptic, errorHaptic } from '../../../utils/haptics';
import { useEconomyStore } from '../../economy/useEconomyStore';
import { useAuthStore } from '../../auth/useAuthStore';
import { tokenStore } from '../../../lib/auth/secureStore';
import { fetchBetOdds, placeBet, type ChoiceOdds } from '../../../db/sync/syncCrowdBets';
import type { CrowdWisdomQuestion } from '../types';

const STAKES = [50, 100, 250] as const;

interface BetPanelProps {
  question: CrowdWisdomQuestion;
  selectedChoiceId: string | null;
}

/**
 * Parimutuel coin betting on a crowd question. The payout price is set by the
 * pool in REAL TIME — when the crowd piles onto a choice its odds drop, and a
 * contrarian pick pays more. Odds are locked at placement.
 */
export function BetPanel({ question, selectedChoiceId }: BetPanelProps): React.ReactElement | null {
  const coins = useEconomyStore((s) => s.coins);
  const spendCoins = useEconomyStore((s) => s.spendCoins);

  const [open, setOpen] = useState(false);
  const [stake, setStake] = useState<number>(100);
  const [odds, setOdds] = useState<ChoiceOdds[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState<{ lockedOdds: number; potentialPayout: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        if (!cancelled) setError('ההימורים לא זמינים כרגע. נסו שוב עוד רגע.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, question.id]);

  if (!selectedChoiceId && !placed) return null;

  const selectedOdds = odds?.find((o) => o.choiceId === selectedChoiceId)?.odds ?? null;
  const potential = selectedOdds !== null ? Math.round(stake * selectedOdds) : null;

  const handlePlace = async (): Promise<void> => {
    if (!selectedChoiceId || placing || placed) return;
    setError(null);
    if (coins < stake) {
      errorHaptic();
      setError('אין מספיק מטבעות להימור הזה.');
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
      if (!spendCoins(stake)) {
        setError('אין מספיק מטבעות להימור הזה.');
        return;
      }
      successHaptic();
      setPlaced({ lockedOdds: result.lockedOdds, potentialPayout: result.potentialPayout });
      setOdds(result.odds);
    } catch (e) {
      errorHaptic();
      setError(e instanceof Error ? e.message : 'ההימור לא נקלט. נסו שוב.');
    } finally {
      setPlacing(false);
    }
  };

  if (placed) {
    return (
      <Animated.View entering={FadeIn.duration(240)} style={[styles.panel, styles.placedPanel]}>
        <Text style={styles.placedTitle}>ההימור נעול: {stake} 🪙 × פי {placed.lockedOdds}</Text>
        <Text style={styles.placedSub}>
          רווח פוטנציאלי: {placed.potentialPayout} מטבעות אם צדקתם. השער ננעל לפי הקופה בזמן ההימור.
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
        accessibilityLabel="הימור מטבעות על התשובה"
        style={styles.openChip}
      >
        <Dices size={14} color="#7c3aed" strokeWidth={2.4} />
        <Text style={styles.openChipText}>רוצים לשים מטבעות על זה? השער נקבע בזמן אמת</Text>
      </Pressable>
    );
  }

  return (
    <Animated.View entering={FadeInDown.duration(240)} style={styles.panel}>
      <View style={styles.headerRow}>
        <Dices size={16} color="#7c3aed" strokeWidth={2.4} />
        <Text style={styles.title}>הימור מטבעות</Text>
        {loading && <ActivityIndicator size="small" color="#7c3aed" />}
      </View>

      {/* Stake chips */}
      <View style={styles.stakesRow}>
        {STAKES.map((s) => {
          const active = stake === s;
          return (
            <Pressable
              key={s}
              onPress={() => {
                tapHaptic();
                setStake(s);
              }}
              accessibilityRole="button"
              accessibilityLabel={`הימור ${s} מטבעות`}
              style={[styles.stakeChip, active && styles.stakeChipActive]}
            >
              <Text style={[styles.stakeChipText, active && styles.stakeChipTextActive]}>
                {s} 🪙
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Live odds line */}
      {selectedOdds !== null && potential !== null ? (
        <View style={styles.oddsRow}>
          <TrendingUp size={14} color="#15803d" strokeWidth={2.4} />
          <Text style={styles.oddsText}>
            שער חי: פי {selectedOdds} · רווח פוטנציאלי {potential} 🪙
          </Text>
        </View>
      ) : (
        !loading && (
          <Text style={styles.oddsHint}>
            השער נקבע לפי ההימורים של כולם — כשכולם על אותה תשובה, הרווח עליה קטן.
          </Text>
        )
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Pressable
        onPress={handlePlace}
        disabled={placing || selectedOdds === null}
        accessibilityRole="button"
        accessibilityLabel="ביצוע ההימור"
        style={[styles.placeBtn, (placing || selectedOdds === null) && styles.placeBtnDisabled]}
      >
        <Text style={styles.placeBtnText}>
          {placing ? 'נועל שער…' : `המרו ${stake} 🪙 על הבחירה`}
        </Text>
      </Pressable>

      <Text style={styles.disclaimer}>
        מטבעות משחק בלבד — לא כסף אמיתי ולא ניתן לפדיון.
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  openChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  openChipText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    color: '#7c3aed',
    writingDirection: 'rtl',
    textAlign: 'right',
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
  stakesRow: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  stakeChip: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#ddd6fe',
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    alignItems: 'center',
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
  oddsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  oddsText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#15803d',
    writingDirection: 'rtl',
    textAlign: 'right',
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
    alignItems: 'center',
  },
  placeBtnDisabled: {
    backgroundColor: '#c4b5fd',
  },
  placeBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#ffffff',
  },
  disclaimer: {
    fontSize: 10,
    color: '#8b5cf6',
    writingDirection: 'rtl',
    textAlign: 'center',
  },
});
