import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { FIRECalcScreen } from '../src/features/chapter-5-content/simulations/FIRECalcScreen';
import { ToolNextStepCard } from '../src/features/financial-tools/components/ToolNextStepCard';
import { tapHaptic } from '../src/utils/haptics';

const FIRE_ACCENT = '#7c3aed';

/**
 * FIRE simulator route. SafeArea-aware top bar reserves space for the back
 * button and a bottom strip pins the next-step card (lesson + sibling tool).
 */
export default function FireCalculatorRoute() {
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
      </View>

      <View style={{ flex: 1 }}>
        <FIRECalcScreen onComplete={goToTools} />
      </View>

      <SafeAreaView edges={['bottom']} style={styles.bottomStrip} pointerEvents="box-none">
        <ToolNextStepCard toolKey="fire" accentColor={FIRE_ACCENT} />
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ede9fe',
  },
  topBar: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row-reverse',
    alignItems: 'center',
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
  bottomStrip: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: 'rgba(237, 233, 254, 0.95)',
  },
});
