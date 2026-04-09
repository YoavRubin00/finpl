import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";

export default function DailyChallengePage() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc", justifyContent: "center", alignItems: "center", padding: 32, gap: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "900", color: "#0369a1", textAlign: "center" }}>
        האתגר היומי
      </Text>
      <Text style={{ fontSize: 15, color: "#64748b", textAlign: "center", lineHeight: 24 }}>
        בקרוב כאן יופיעו משימות יומיות מותאמות אישית
      </Text>
      <Pressable
        onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)" as never)}
        style={{ backgroundColor: "#0891b2", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 }}
      >
        <Text style={{ fontSize: 16, fontWeight: "800", color: "#ffffff" }}>חזרה</Text>
      </Pressable>
    </View>
  );
}
