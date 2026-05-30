import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { tapHaptic } from '../src/utils/haptics';

/**
 * Generic "coming soon" placeholder. Used by toolsRegistry entries whose
 * destination screen isn't built yet (e.g. portfolio-analyzer, cashflow).
 * Stays minimal so it doesn't accidentally read as a finished feature.
 */
export default function ComingSoonRoute() {
  const router = useRouter();
  const goBack = () => {
    tapHaptic();
    router.replace('/(tabs)/tools' as never);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.topBar}>
        <Pressable
          onPress={goBack}
          style={styles.backCircle}
          accessibilityRole="button"
          accessibilityLabel="חזרה לכלים"
          hitSlop={10}
        >
          <ChevronRight size={20} color="#0f172a" strokeWidth={2.8} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text style={styles.emoji}>🛠️</Text>
        <Text style={styles.title}>בקרוב כאן</Text>
        <Text style={styles.subtitle}>
          הכלי הזה עוד בעבודה. נחזור עם משהו שווה — בינתיים תפסו את שאר הכלים בטאב.
        </Text>
        <Pressable onPress={goBack} style={styles.cta} accessibilityRole="button" accessibilityLabel="חזרה לכלים">
          <Text style={styles.ctaText}>חזרה לכלים</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  topBar: { paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row-reverse' },
  backCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 8, elevation: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)',
  },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
  emoji: { fontSize: 64 },
  title: { fontSize: 26, fontWeight: '900', color: '#0f172a', writingDirection: 'rtl' },
  subtitle: { fontSize: 15, color: '#475569', textAlign: 'center', writingDirection: 'rtl', lineHeight: 22 },
  cta: {
    marginTop: 12,
    backgroundColor: '#0891b2',
    paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16,
    borderBottomWidth: 3, borderBottomColor: '#0e7490',
  },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '900', writingDirection: 'rtl' },
});
