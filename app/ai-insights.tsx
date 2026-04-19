import { View } from "react-native";
import { AIInsightsScreen } from "../src/features/ai-insights/AIInsightsScreen";

export default function AIInsightsPage() {
  return (
    <View style={{ flex: 1, backgroundColor: '#f0f9ff' }}>
      <AIInsightsScreen />
    </View>
  );
}
