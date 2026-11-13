import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Flame } from 'lucide-react-native';
import { FIRECalcScreen } from '../src/features/chapter-5-content/simulations/FIRECalcScreen';
import { ToolHeader } from '../src/features/financial-tools/components/ToolHeader';
import { ToolTutorialMount } from '../src/features/financial-tools/components/ToolTutorialMount';
import { useToolInstrumentation } from '../src/features/financial-tools/hooks/useToolInstrumentation';

/**
 * FIRE calculator route.
 *
 * Uses the shared ToolHeader, the same top bar as the other calculators (it
 * had a one-off bar: floating white circle + centred emoji title). ToolHeader
 * is rendered WITHOUT `toolKey` on purpose: analytics and the first-visit
 * tutorial stay with useToolInstrumentation + ToolTutorialMount below, so
 * nothing fires twice.
 */
export default function FireCalculatorRoute() {
  useToolInstrumentation('fire');
  const router = useRouter();
  const goToTools = () => {
    router.replace('/(tabs)/tools' as never);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <ToolHeader title="מחשבון החופש" Icon={Flame} accentColor="#7c3aed" />

      <View style={styles.body}>
        <FIRECalcScreen onComplete={goToTools} hideTitle />
      </View>

      <ToolTutorialMount toolKey="fire" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // White behind the status bar so it joins the white ToolHeader bar.
  container: { flex: 1, backgroundColor: '#ffffff' },
  body: { flex: 1, backgroundColor: '#ede9fe' },
});
