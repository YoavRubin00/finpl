import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { CompoundSimScreen } from '../src/features/chapter-1-content/simulations/CompoundSimScreen';
import { ToolTutorialMount } from '../src/features/financial-tools/components/ToolTutorialMount';
import { tapHaptic } from '../src/utils/haptics';

/**
 * Compound-interest tutorial route. SafeArea-aware top bar reserves space
 * for the back button so the user always has an obvious exit.
 */
export default function CompoundCalculatorRoute() {
  const router = useRouter();
  const goToTools = () => {
    tapHaptic();
    router.replace('/(tabs)/tools' as never);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.topBar}>
        <Pressable
          onPress={goToTools}
          style={styles.backCircle}
          accessibilityRole="button"
          accessibilityLabel="חזרה לכלים"
          hitSlop={10}
        >
          <ChevronRight size={20} color="#0f172a" strokeWidth={2.8} />
        </Pressable>
        <View style={styles.titleWrap} pointerEvents="none">
          <Text style={styles.titleEmoji}>📈</Text>
          <Text style={styles.title} accessibilityRole="header">
            ריבית דריבית
          </Text>
        </View>
        {/* Spacer mirrors the back button so the title sits perfectly centered. */}
        <View style={styles.backCircleSpacer} />
      </View>

      <View style={{ flex: 1 }}>
        <CompoundSimScreen onComplete={goToTools} />
      </View>

      <ToolTutorialMount toolKey="compound" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4',
  },
  topBar: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  backCircleSpacer: {
    width: 38,
    height: 38,
  },
  titleWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  titleEmoji: {
    fontSize: 20,
    lineHeight: 24,
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
    writingDirection: 'rtl',
    letterSpacing: -0.3,
  },
});
