import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { FIRECalcScreen } from '../src/features/chapter-5-content/simulations/FIRECalcScreen';
import { BackButton } from '../src/components/ui/BackButton';

export default function FireCalculatorRoute() {
  const router = useRouter();
  const goToTools = () => router.replace('/(tabs)/tools' as never);
  return (
    <View style={{ flex: 1 }}>
      <FIRECalcScreen onComplete={goToTools} />
      {/* Floating back button → tools hub */}
      <View style={{ position: 'absolute', top: 54, right: 16, zIndex: 50 }}>
        <BackButton color="#fff" onPress={goToTools} />
      </View>
    </View>
  );
}
