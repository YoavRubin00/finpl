import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useAuthStore } from '../auth/useAuthStore';
import { tokenStore } from '../../lib/auth/secureStore';
import { queryClient } from '../../lib/queryClient';
import { economyQueryKey } from '../economy/useEconomy';
import type { Economy } from '../../lib/api/economy';
import { claimSettledBets, type SettledPredictionResult } from '../../db/sync/syncCrowdBets';
import { getQuestionById } from './data/seedQuestions';
import { GoldCoinIcon } from '../../components/ui/GoldCoinIcon';
import { successHaptic, tapHaptic } from '../../utils/haptics';

/**
 * On app-open, credits (exactly once — server dedupes via claimed_at) every
 * prediction that settled while the user was away, and shows a summary — the
 * "צדקתם בזמן שהייתם בחוץ" beat, mirroring the assets' passive-income splash.
 * The server is the coin authority; here we only reflect the new balance + tell
 * the story. Guests are skipped (predictions require a registered account).
 */
export function PredictionResultsHost(): React.ReactElement | null {
  const isGuest = useAuthStore((s) => s.isGuest);
  const email = useAuthStore((s) => s.email);
  const [results, setResults] = useState<SettledPredictionResult[] | null>(null);
  const [visible, setVisible] = useState(false);
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current || isGuest || !email) return;
    firedRef.current = true;
    (async () => {
      try {
        const syncToken = await tokenStore.get();
        const claim = await claimSettledBets({ authId: email, syncToken });
        if (claim.credited > 0) {
          // Reflect the server-authoritative balance (drives the coin counter).
          queryClient.setQueryData<Economy | null>(economyQueryKey, (old) =>
            old ? { ...old, coins: claim.newBalance } : old,
          );
        }
        const shown = claim.results.filter((r) => r.payout > 0);
        if (shown.length > 0) {
          setResults(shown);
          setVisible(true);
          successHaptic();
        }
      } catch {
        /* non-fatal — never block the app on a claim failure */
      }
    })();
  }, [isGuest, email]);

  if (!visible || !results) return null;

  const totalWon = results.reduce((sum, r) => sum + (r.won ? r.payout : 0), 0);
  const dismiss = (): void => {
    tapHaptic();
    setVisible(false);
  };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <Animated.View entering={FadeInUp.duration(360)} style={styles.card}>
            <Text style={styles.title}>צדקתם בזמן שהייתם בחוץ</Text>
            <Text style={styles.subtitle}>התחזיות שלכם יושבו — הנה מה שהתקבל בחזרה.</Text>

            {totalWon > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>סה״כ זכייה</Text>
                <Text style={styles.totalValue}>{totalWon.toLocaleString('he-IL')}</Text>
                <GoldCoinIcon size={20} />
              </View>
            )}

            <ScrollView style={{ maxHeight: 260, alignSelf: 'stretch' }} showsVerticalScrollIndicator={false}>
              {results.map((r, i) => {
                const q = getQuestionById(r.questionId);
                return (
                  <View key={`${r.questionId}-${i}`} style={styles.resultRow}>
                    <View style={styles.payoutChip}>
                      <Text style={styles.payoutText}>+{r.payout.toLocaleString('he-IL')}</Text>
                      <GoldCoinIcon size={13} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultPrompt} numberOfLines={2}>
                        {q?.prompt ?? r.questionId}
                      </Text>
                      <Text style={styles.resultSub}>
                        {r.won ? 'התחזית שלכם צדקה' : 'התחזית בוטלה — המטבעות הוחזרו'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <Pressable
              onPress={dismiss}
              style={styles.cta}
              accessibilityRole="button"
              accessibilityLabel="מעולה, סגירה"
            >
              <Text style={styles.ctaText}>מעולה</Text>
            </Pressable>
          </Animated.View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.78)', justifyContent: 'center' },
  safe: { paddingHorizontal: 22 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#0c4a6e',
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
  title: { fontSize: 21, fontWeight: '900', color: '#0c4a6e', textAlign: 'center', writingDirection: 'rtl' },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#0e7490',
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 20,
  },
  totalRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  totalLabel: { fontSize: 13, fontWeight: '800', color: '#b45309' },
  totalValue: { fontSize: 20, fontWeight: '900', color: '#b45309', fontVariant: ['tabular-nums'] },
  resultRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  resultPrompt: { fontSize: 14, fontWeight: '800', color: '#0f172a', ...RTL },
  resultSub: { fontSize: 12, fontWeight: '600', color: '#64748b', marginTop: 2, ...RTL },
  payoutChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ecfdf5',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  payoutText: { fontSize: 13, fontWeight: '900', color: '#059669', fontVariant: ['tabular-nums'] },
  cta: {
    marginTop: 18,
    alignSelf: 'stretch',
    backgroundColor: '#0ea5e9',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#0284c7',
  },
  ctaText: { fontSize: 16, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl' },
});
