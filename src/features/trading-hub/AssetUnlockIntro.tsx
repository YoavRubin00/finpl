import { useEffect, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Lock, X } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useTradingHubUiStore } from './useTradingHubUiStore';
import { useTutorialStore } from '../../stores/useTutorialStore';
import { tapHaptic } from '../../utils/haptics';
import type { AssetType } from './tradingHubTypes';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

const ALL_TYPES: AssetType[] = ['index', 'commodity', 'stock', 'crypto'];

const TYPE_LABELS: Record<AssetType, string> = {
  index: 'מדדים',
  commodity: 'סחורות',
  stock: 'מניות בודדות',
  crypto: 'קריפטו',
};

const UNLOCK_HINTS: Record<AssetType, string> = {
  index: '',
  commodity: '',
  stock: 'נפתח בקנייה ראשונה',
  crypto: 'נפתח בסיום פרק 5',
};

/**
 * One-time inline strip below the asset carousel that explains progressive
 * unlock — which categories are open now and what unlocks the rest.
 * Auto-marked-seen the moment ALL types are unlocked, otherwise dismissable.
 */
export function AssetUnlockIntro() {
  const hasSeenIntro = useTutorialStore((s) => s.hasSeenAssetUnlockIntro);
  const markSeen = useTutorialStore((s) => s.markAssetUnlockIntroSeen);
  const unlockedTypes = useTradingHubUiStore((s) => s.unlockedAssetTypes);

  const lockedTypes = useMemo(
    () => ALL_TYPES.filter((t) => !unlockedTypes.includes(t)),
    [unlockedTypes],
  );

  // Once everything is unlocked, the intro is no longer useful.
  useEffect(() => {
    if (!hasSeenIntro && lockedTypes.length === 0) {
      markSeen();
    }
  }, [hasSeenIntro, lockedTypes.length, markSeen]);

  if (hasSeenIntro || lockedTypes.length === 0) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(150)}
      style={styles.container}
      accessibilityRole="text"
      accessibilityLabel={`רמזים על פתיחת קטגוריות נכסים: ${lockedTypes.map((t) => `${TYPE_LABELS[t]} — ${UNLOCK_HINTS[t]}`).join(', ')}`}
    >
      <View style={styles.headerRow}>
        <Lock size={12} color="#0e7490" strokeWidth={2.4} />
        <Text style={[RTL, styles.headerText]}>פתיחת קטגוריות</Text>
        <Pressable
          onPress={() => { tapHaptic(); markSeen(); }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="הסתר רמזים"
          style={styles.dismiss}
        >
          <X size={12} color="#94a3b8" strokeWidth={2.4} />
        </Pressable>
      </View>
      <View style={styles.lockedList}>
        {lockedTypes.map((t, idx) => (
          <Text key={t} style={[RTL, styles.lockedItem]}>
            🔒 {TYPE_LABELS[t]} — {UNLOCK_HINTS[t]}
            {idx < lockedTypes.length - 1 ? '' : ''}
          </Text>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ecfeff',
    borderWidth: 1,
    borderColor: '#cffafe',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 12,
    marginTop: 8,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  headerText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    color: '#0e7490',
  },
  dismiss: {
    padding: 2,
  },
  lockedList: {
    gap: 2,
  },
  lockedItem: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    lineHeight: 17,
  },
});