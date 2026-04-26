import { useMemo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { X } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { FINN_STANDARD } from '../retention-loops/finnMascotConfig';
import { useTradingStore } from './useTradingStore';
import { useTradingHubUiStore } from './useTradingHubUiStore';
import { useEconomyStore } from '../economy/useEconomyStore';
import { pickSharkTip } from './sharkTipsData';
import { tapHaptic } from '../../utils/haptics';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function SharkInlineTip() {
  const positions = useTradingStore((s) => s.positions);
  const streak = useEconomyStore((s) => s.streak);
  const dismissTipForToday = useTradingHubUiStore((s) => s.dismissTipForToday);
  const dismissedTipDate = useTradingHubUiStore((s) => s.dismissedTipDate);

  const today = todayKey();
  const tip = useMemo(
    () => pickSharkTip({ isoDate: today, positions, streak }),
    [today, positions, streak],
  );

  const handleDismiss = useCallback(() => {
    tapHaptic();
    dismissTipForToday(today);
  }, [dismissTipForToday, today]);

  if (dismissedTipDate === today) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(150)}
      style={styles.container}
      accessibilityRole="text"
      accessibilityLabel={`טיפ של קפטן שארק: ${tip.textHe}`}
    >
      <ExpoImage source={FINN_STANDARD} style={styles.avatar} contentFit="contain" />
      <View style={{ flex: 1 }}>
        <Text style={[RTL, styles.text]}>{tip.textHe}</Text>
      </View>
      <Pressable
        onPress={handleDismiss}
        style={styles.dismissBtn}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="הסתר טיפ להיום"
      >
        <X size={14} color="#64748b" strokeWidth={2.5} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ecfeff',
    borderWidth: 1.5,
    borderColor: '#a5f3fc',
    borderRadius: 14,
    padding: 10,
    marginHorizontal: 12,
    marginTop: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0e7490',
    marginBottom: 2,
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 18,
  },
  dismissBtn: {
    padding: 4,
  },
});
