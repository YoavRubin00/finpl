import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Image as ExpoImage } from 'expo-image';
import { tapHaptic } from '../../utils/haptics';
import { FINN_STANDARD } from '../retention-loops/finnMascotConfig';

/**
 * Fantasy League is gated behind "coming soon" (Yoav 2026-07-06) — the league
 * needs a real player base before it's fun; until then every entry point
 * (friends-hub button, /fantasy deep links, the tab route) lands here.
 *
 * ROLLBACK: flip FANTASY_COMING_SOON to false — both gates below read it and
 * fall through to the real screens. No other change needed.
 */
export const FANTASY_COMING_SOON = true;

export function FantasyComingSoonScreen(): React.ReactElement {
  const router = useRouter();
  const goBack = () => {
    tapHaptic();
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)' as never);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.topBar}>
        <Pressable
          onPress={goBack}
          style={styles.backCircle}
          accessibilityRole="button"
          accessibilityLabel="חזרה"
          hitSlop={10}
        >
          <ChevronRight size={20} color="#0f172a" strokeWidth={2.8} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <ExpoImage source={FINN_STANDARD} style={styles.finn} contentFit="contain" autoplay accessible={false} />
        <View style={styles.pill}>
          <Text style={styles.pillText} allowFontScaling={false}>בקרוב</Text>
        </View>
        <Text style={[styles.title, RTL_CENTER]} maxFontSizeMultiplier={1.3}>
          ליגת הפנטזי נפתחת בקרוב
        </Text>
        <Text style={[styles.sub, RTL_CENTER]} maxFontSizeMultiplier={1.3}>
          אנחנו משדרגים אותה כדי שיהיה שווה להתחרות.{'\n'}נעדכן אתכם ברגע שהשערים נפתחים.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const RTL_CENTER = { writingDirection: 'rtl' as const, textAlign: 'center' as const };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f9ff' },
  topBar: { paddingHorizontal: 16, paddingTop: 8 },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12, marginTop: -40 },
  finn: { width: 140, height: 140 },
  pill: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 999,
    borderBottomWidth: 3,
    borderBottomColor: '#d97706',
  },
  pillText: { fontSize: 15, fontWeight: '900', color: '#ffffff' },
  title: { fontSize: 22, fontWeight: '900', color: '#0c4a6e' },
  sub: { fontSize: 14.5, fontWeight: '600', color: '#475569', lineHeight: 22 },
});
