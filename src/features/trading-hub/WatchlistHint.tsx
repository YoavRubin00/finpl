import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Star, X } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { FINN_STANDARD } from '../retention-loops/finnMascotConfig';
import { useTradingHubUiStore } from './useTradingHubUiStore';
import { useTutorialStore } from '../../stores/useTutorialStore';
import { tapHaptic } from '../../utils/haptics';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

/**
 * One-time hint shown above the asset carousel: tells the user that long-press
 * adds an asset to their watchlist. Auto-dismisses the moment they actually star
 * something, otherwise can be dismissed via the X.
 */
export function WatchlistHint() {
  const hasSeenHint = useTutorialStore((s) => s.hasSeenWatchlistHint);
  const markSeen = useTutorialStore((s) => s.markWatchlistHintSeen);
  const watchlistCount = useTradingHubUiStore((s) => s.watchlist.length);

  // First star = implicit acknowledgement; never show again.
  useEffect(() => {
    if (!hasSeenHint && watchlistCount > 0) {
      markSeen();
    }
  }, [hasSeenHint, watchlistCount, markSeen]);

  if (hasSeenHint) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(150)}
      style={styles.container}
      accessibilityRole="text"
      accessibilityLabel="טיפ של קפטן שארק: לחיצה ארוכה על נכס מוסיפה אותו לרשימת המעקב"
    >
      <ExpoImage source={FINN_STANDARD} style={styles.avatar} contentFit="contain" />
      <View style={styles.textCol}>
        <View style={styles.headerRow}>
          <Star size={12} color="#d97706" fill="#fbbf24" strokeWidth={2.2} />
          <Text style={[RTL, styles.label]}>טיפ של שארק</Text>
        </View>
        <Text style={[RTL, styles.text]}>
          לחיצה ארוכה על נכס תוסיף אותו לרשימת המעקב ⭐
        </Text>
      </View>
      <Pressable
        onPress={() => { tapHaptic(); markSeen(); }}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="הסתר טיפ"
        style={styles.dismissBtn}
      >
        <X size={14} color="#94a3b8" strokeWidth={2.4} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fffbeb',
    borderWidth: 1.5,
    borderColor: '#fef3c7',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 12,
    marginTop: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  textCol: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#b45309',
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