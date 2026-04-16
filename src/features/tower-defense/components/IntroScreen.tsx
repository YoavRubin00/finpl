import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import { TD_ASSETS } from "../towerDefenseAssets";

interface Props {
  onStart: () => void;
  onBack: () => void;
}

export function IntroScreen({ onStart, onBack }: Props) {
  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: 24,
        paddingVertical: 32,
        justifyContent: "space-between",
        gap: 24,
      }}
    >
      <View style={{ alignItems: "center", gap: 16 }}>
        <Text
          style={{
            color: "#d4a017",
            fontSize: 14,
            letterSpacing: 2,
            fontFamily: "Heebo_700Bold",
          }}
        >
          מבחן סיום פרק 1
        </Text>
        <Text
          style={{
            color: "#fefce8",
            fontSize: 34,
            fontWeight: "900",
            fontFamily: "Heebo_900Black",
            textAlign: "center",
            writingDirection: "rtl",
            lineHeight: 40,
          }}
        >
          שומרים על הקופה
        </Text>
        <Image
          source={{ uri: TD_ASSETS.fortress }}
          style={{ width: 180, height: 180 }}
          resizeMode="contain"
        />
      </View>

      <View style={{ gap: 16 }}>
        <Text
          style={{
            color: "#a7f3d0",
            fontSize: 17,
            lineHeight: 26,
            textAlign: "right",
            writingDirection: "rtl",
            fontFamily: "Heebo_500Medium",
          }}
        >
          הוצאות פתאומיות מתקרבות לעו״ש שלך. תשתמש ב-Coins לבנות מגדלי הגנה —
          קרן חירום, ביטוח, ותקציב אוטומטי.
        </Text>
        <Text
          style={{
            color: "#fefce8",
            fontSize: 15,
            lineHeight: 22,
            textAlign: "right",
            writingDirection: "rtl",
            fontFamily: "Heebo_700Bold",
          }}
        >
          📅 3 חודשים · 🏰 עו״ש מתחיל ב-₪5,000 · 🪙 500 Coins להתחיל
        </Text>
        <Text
          style={{
            color: "#d4a017",
            fontSize: 13,
            lineHeight: 20,
            textAlign: "right",
            writingDirection: "rtl",
            fontFamily: "Heebo_500Medium",
          }}
        >
          ניצחון = +100 XP · +500 Coins · פתיחת פרק 2
        </Text>
      </View>

      <View style={{ gap: 10 }}>
        <Pressable
          onPress={onStart}
          accessibilityRole="button"
          accessibilityLabel="התחל קרב Tower Defense"
          style={{
            backgroundColor: "#d4a017",
            paddingVertical: 18,
            borderRadius: 20,
            alignItems: "center",
            borderBottomWidth: 4,
            borderBottomColor: "#92580a",
          }}
        >
          <Text
            style={{
              color: "#1b4332",
              fontSize: 18,
              fontWeight: "900",
              fontFamily: "Heebo_900Black",
              writingDirection: "rtl",
            }}
          >
            🏰 התחל קרב
          </Text>
        </Pressable>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="חזור למפת הפרקים"
          style={{
            paddingVertical: 12,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: "#a7f3d0",
              fontSize: 14,
              fontFamily: "Heebo_500Medium",
              writingDirection: "rtl",
            }}
          >
            חזור למפה
          </Text>
        </Pressable>
      </View>
    </View>
  );
}