import React from "react";
import { Pressable, Text, View } from "react-native";
import LottieView from "lottie-react-native";

const DIAMOND_LOTTIE = require("../../../../assets/lottie/Diamond.json");

interface Props {
  heldForMs: number;
  onClose: () => void;
}

export function PaperHandsScreen({ heldForMs, onClose }: Props) {
  const seconds = (heldForMs / 1000).toFixed(1);
  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: 28,
        paddingVertical: 40,
        justifyContent: "space-between",
      }}
    >
      <View style={{ alignItems: "center", gap: 14 }}>
        <Text
          style={{
            color: "#ef4444",
            fontSize: 13,
            letterSpacing: 2.5,
            fontFamily: "Heebo_700Bold",
          }}
        >
          Paper Hands
        </Text>
        <Text
          style={{
            color: "#f0f9ff",
            fontSize: 32,
            fontWeight: "900",
            fontFamily: "Heebo_900Black",
            textAlign: "center",
            writingDirection: "rtl",
          }}
        >
          ידיים רכות.
        </Text>
        <LottieView
          source={DIAMOND_LOTTIE}
          style={{ width: 160, height: 160, opacity: 0.7 }}
          autoPlay
          loop
          resizeMode="contain"
        />
        <Text
          style={{
            color: "#bae6fd",
            fontSize: 15,
            textAlign: "center",
            writingDirection: "rtl",
            fontFamily: "Heebo_500Medium",
          }}
        >
          החזקת {seconds} שניות מתוך 10
        </Text>
      </View>

      <View
        style={{
          borderRadius: 16,
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          borderWidth: 1.5,
          borderColor: "rgba(239, 68, 68, 0.35)",
          padding: 18,
          gap: 10,
        }}
      >
        <Text
          style={{
            color: "#f0f9ff",
            fontSize: 14,
            fontFamily: "Heebo_900Black",
            textAlign: "right",
            writingDirection: "rtl",
          }}
        >
          רוב המשקיעים הפרטיים מוכרים בירידה.
        </Text>
        <Text
          style={{
            color: "#bae6fd",
            fontSize: 14,
            lineHeight: 22,
            textAlign: "right",
            writingDirection: "rtl",
            fontFamily: "Heebo_500Medium",
          }}
        >
          זה לא אישי. המוח שלנו מתוכנן לברוח מסכנה, וירידה חדה בגרף מדליקה את
          אותן מערכות פחד כמו חיה טורפת. היסטורית, שווקים מגוונים התאוששו מכל
          ירידה משמעותית, אך ביצועי עבר לא מבטיחים עתיד. חוזרים מחר?
        </Text>
      </View>

      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="חזור לפיד"
        style={{
          backgroundColor: "rgba(10, 54, 34, 0.8)",
          paddingVertical: 16,
          borderRadius: 20,
          alignItems: "center",
          borderWidth: 2,
          borderColor: "#0ea5e9",
        }}
      >
        <Text
          style={{
            color: "#0ea5e9",
            fontSize: 16,
            fontWeight: "900",
            fontFamily: "Heebo_900Black",
            writingDirection: "rtl",
          }}
        >
          חזרה לפיד
        </Text>
      </Pressable>
    </View>
  );
}
