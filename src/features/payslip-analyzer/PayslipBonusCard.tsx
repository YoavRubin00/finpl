import { View, Text, Platform } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import { GlowCard } from "../../components/ui/GlowCard";
import { SupercellButton } from "../../components/ui/SupercellButton";
import { FINN_TABLET } from "../retention-loops/finnMascotConfig";

const RTL_TEXT = { writingDirection: "rtl" as const, textAlign: "right" as const };
const CHAPTER_1_GLOW = "#93c5fd";

export function PayslipBonusCard() {
  const router = useRouter();

  const handlePress = () => {
    router.push("/payslip-analyzer");
  };

  return (
    <GlowCard
      chapterGlow={CHAPTER_1_GLOW}
      shimmer
      pressable
      onPress={handlePress}
      accessibilityLabel="פתח את מנתח תלוש השכר"
      style={{
        padding: 16,
        backgroundColor: "#f0f9ff",
      }}
    >
      <View
        style={{
          flexDirection: "row-reverse",
          alignItems: "center",
          gap: 14,
        }}
      >
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: "#ffffff",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            borderWidth: 2,
            borderColor: CHAPTER_1_GLOW,
            shadowColor: CHAPTER_1_GLOW,
            shadowOpacity: 0.4,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: Platform.OS === "android" ? 4 : 0,
          }}
        >
          <ExpoImage
            source={FINN_TABLET}
            accessible={false}
            style={{ width: 56, height: 56 }}
            contentFit="contain"
          />
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          <Text
            style={{
              ...RTL_TEXT,
              fontSize: 11,
              fontWeight: "800",
              color: "#1d4ed8",
              letterSpacing: 0.6,
            }}
          >
            בונוס פרקטי
          </Text>
          <Text
            style={{
              ...RTL_TEXT,
              fontSize: 16,
              fontWeight: "900",
              color: "#0c4a6e",
              lineHeight: 22,
            }}
          >
            רוצה לנתח תלוש אמיתי?
          </Text>
          <Text
            style={{
              ...RTL_TEXT,
              fontSize: 12,
              color: "#475569",
              lineHeight: 18,
            }}
            numberOfLines={2}
          >
            העלה תלוש שכר שלך ופין יסביר מה כל שורה אומרת
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 14 }}>
        <SupercellButton
          label="בוא ננתח"
          variant="blue"
          size="sm"
          onPress={handlePress}
        />
      </View>
    </GlowCard>
  );
}
