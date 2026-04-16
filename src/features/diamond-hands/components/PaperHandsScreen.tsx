import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import { DH_ASSETS } from "../diamondHandsAssets";

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
            color: "#fefce8",
            fontSize: 32,
            fontWeight: "900",
            fontFamily: "Heebo_900Black",
            textAlign: "center",
            writingDirection: "rtl",
          }}
        >
          ידיים רכות.
        </Text>
        <Image
          source={{ uri: DH_ASSETS.diamondCracking }}
          style={{ width: 140, height: 140 }}
          resizeMode="contain"
        />
        <Text
          style={{
            color: "#a7f3d0",
            fontSize: 15,
            textAlign: "center",
            writingDirection: "rtl",
            fontFamily: "Heebo_500Medium",
          }}
        >
          החזקת {seconds} שניות מתוך 15
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
            color: "#fefce8",
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
            color: "#a7f3d0",
            fontSize: 14,
            lineHeight: 22,
            textAlign: "right",
            writingDirection: "rtl",
            fontFamily: "Heebo_500Medium",
          }}
        >
          זה לא אישי. המוח שלנו מתוכנן לברוח מסכנה, וירידה חדה בגרף מדליקה את
          אותן מערכות פחד כמו חיה טורפת. היסטורית, שווקים מגוונים התאוששו מכל
          ירידה משמעותית — אך ביצועי עבר לא מבטיחים עתיד. חוזרים מחר?
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
          borderColor: "#d4a017",
        }}
      >
        <Text
          style={{
            color: "#d4a017",
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
