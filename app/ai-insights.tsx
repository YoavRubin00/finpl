import { SafeAreaView } from "react-native-safe-area-context";
import { AIInsightsScreen } from "../src/features/ai-insights/AIInsightsScreen";

export default function AIInsightsPage() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f0f9ff' }} edges={['top', 'bottom']}>
      <AIInsightsScreen />
    </SafeAreaView>
  );
}
