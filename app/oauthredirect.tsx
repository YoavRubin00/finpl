import { View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OAuthRedirect() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff", justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#0891b2" />
    </SafeAreaView>
  );
}
