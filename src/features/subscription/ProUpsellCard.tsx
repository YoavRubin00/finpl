import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { AnimatedPressable } from "../../components/ui/AnimatedPressable";
import { LottieIcon } from "../../components/ui/LottieIcon";
import { tapHaptic } from "../../utils/haptics";
import { captureEvent } from "../../lib/posthog";

/**
 * THE canonical "upgrade to Pro" call-to-action — the deep-blue navy card from
 * the Profile screen, extracted so every smart upsell moment uses the exact
 * same format (Yoav: "באותו פורמט שמופיע במסך הפרופיל, עם הכחול העמוק").
 *
 * Use sparingly and only at genuine friction moments (out of energy, etc.) —
 * never on positive-momentum screens. Routes to /pricing with a `source` tag
 * for conversion attribution.
 */
export function ProUpsellCard({
  source,
  headline = "אנרגיה אינסופית + בוסט XP",
  active = true,
  onPress,
}: {
  /** analytics + pricing attribution tag, e.g. 'energy_depleted' */
  source: string;
  /** white headline line (the value prop for this moment) */
  headline?: string;
  /** drive the Lottie loop (pass screen focus when available) */
  active?: boolean;
  /** override the default navigation (e.g. to dismiss a modal first). Analytics still fire. */
  onPress?: () => void;
}) {
  const router = useRouter();
  return (
    <AnimatedPressable
      onPress={() => {
        tapHaptic();
        try { captureEvent("pro_upsell_tapped", { source }); } catch { /* non-fatal */ }
        if (onPress) onPress();
        else router.push(`/pricing?source=${source}` as never);
      }}
      accessibilityRole="button"
      accessibilityLabel="שדרגו ל-PRO"
    >
      <LinearGradient
        colors={["#0a2540", "#164e63", "#0a2540"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(103,232,249,0.35)" }}
      >
        {["✦", "✦", "✦", "✦", "✦"].map((s, i) => (
          <Text
            key={i}
            style={{
              position: "absolute",
              color: i % 2 === 0 ? "#facc15" : "#67e8f9",
              fontSize: i === 2 ? 10 : 7,
              opacity: 0.6,
              top: [8, 16, 6, 22, 12][i],
              left: [12, 60, 130, 200, 260][i],
            }}
          >{s}</Text>
        ))}
        <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", padding: 16 }}>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12 }}>
            <View
              style={{ width: 48, height: 48, overflow: "hidden", borderRadius: 14, backgroundColor: "rgba(14,116,144,0.3)", borderWidth: 1, borderColor: "rgba(103,232,249,0.5)", alignItems: "center", justifyContent: "center" }}
              accessible={false}
            >
              <LottieIcon source={require("../../../assets/lottie/Pro Animation 3rd.json")} size={40} autoPlay loop active={active} />
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 11, fontWeight: "800", letterSpacing: 2, color: "#facc15", textTransform: "uppercase" }}>
                שדרגו ל-PRO
              </Text>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#ffffff", marginTop: 2 }}>
                {headline}
              </Text>
              <Text style={{ fontSize: 11, color: "rgba(103,232,249,0.8)", marginTop: 2 }}>
                ✦ בלי לעצור אף פעם ✦ בלעדי לחברים ✦
              </Text>
            </View>
          </View>
          <View style={{ borderRadius: 20, backgroundColor: "rgba(250,204,21,0.15)", borderWidth: 1.5, borderColor: "rgba(250,204,21,0.5)", paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: "900", color: "#facc15" }}>PRO</Text>
          </View>
        </View>
      </LinearGradient>
    </AnimatedPressable>
  );
}
