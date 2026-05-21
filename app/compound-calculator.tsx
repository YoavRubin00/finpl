import { View } from "react-native";
import { useRouter } from "expo-router";
import { CompoundSimScreen } from "../src/features/chapter-1-content/simulations/CompoundSimScreen";
import { BackButton } from "../src/components/ui/BackButton";

export default function CompoundCalculatorRoute() {
  const router = useRouter();
  const goToTools = () => router.replace("/(tabs)/tools" as never);
  return (
    <View style={{ flex: 1 }}>
      <CompoundSimScreen onComplete={goToTools} />
      <View style={{ position: "absolute", top: 54, right: 16, zIndex: 50 }}>
        <BackButton color="#fff" onPress={goToTools} />
      </View>
    </View>
  );
}
