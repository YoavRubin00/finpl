import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { TrendingUp } from 'lucide-react-native';
import { CompoundSimScreen } from '../src/features/chapter-1-content/simulations/CompoundSimScreen';
import { ToolHeader } from '../src/features/financial-tools/components/ToolHeader';
import { ToolTutorialMount } from '../src/features/financial-tools/components/ToolTutorialMount';
import { useToolInstrumentation } from '../src/features/financial-tools/hooks/useToolInstrumentation';
import { useTutorialStore } from '../src/stores/useTutorialStore';

/**
 * Compound-interest calculator route.
 *
 * Uses the shared ToolHeader, the same top bar as the other seven calculators
 * (it had a one-off bar: floating white circle + centred emoji title).
 * ToolHeader is rendered WITHOUT `toolKey` on purpose: analytics and the
 * first-visit tutorial stay with useToolInstrumentation + ToolTutorialMount
 * below, so nothing fires twice.
 */
export default function CompoundCalculatorRoute() {
  useToolInstrumentation('compound');
  const router = useRouter();
  // While the 3-step tool tutorial is showing, hold back the sim's own
  // narration so the two Captain Shark tracks don't overlap (user report
  // 2026-05-31). The instant the tutorial overlay marks itself seen, the
  // suppress flag flips false and the sim's useEffect re-runs to start audio.
  const hasSeenCompoundTutorial = useTutorialStore((s) => s.hasSeenToolTutorial['compound'] ?? false);
  const goToTools = () => {
    router.replace('/(tabs)/tools' as never);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <ToolHeader title="ריבית דריבית" Icon={TrendingUp} accentColor="#15803d" />

      <View style={styles.body}>
        <CompoundSimScreen onComplete={goToTools} suppressAudio={!hasSeenCompoundTutorial} />
      </View>

      <ToolTutorialMount toolKey="compound" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // White behind the status bar so it joins the white ToolHeader bar.
  container: { flex: 1, backgroundColor: '#ffffff' },
  body: { flex: 1, backgroundColor: '#f0fdf4' },
});
