import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { FIRECalcScreen } from '../src/features/chapter-5-content/simulations/FIRECalcScreen';
import { BackButton } from '../src/components/ui/BackButton';

export default function FireCalculatorRoute() {
  const router = useRouter();
  return (
    <View style={{ flex: 1 }}>
      <FIRECalcScreen onComplete={() => router.back()} />
      {/* Floating back button */}
      <View style={{ position: 'absolute', top: 54, right: 16, zIndex: 50 }}>
        <BackButton color="#fff" />
      </View>
    </View>
  );
}
