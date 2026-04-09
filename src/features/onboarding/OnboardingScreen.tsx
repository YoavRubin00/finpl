import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProfilingFlow } from "./ProfilingFlow";

export function OnboardingScreen() {
  return (
    <SafeAreaView className="flex-1 bg-zinc-950" edges={["top", "bottom"]}>
      <View className="flex-1">
        <ProfilingFlow />
      </View>
    </SafeAreaView>
  );
}
