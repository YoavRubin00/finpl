import React from "react";
import { Pressable, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { FINN_STANDARD } from "../../retention-loops/finnMascotConfig";

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
            color: "#f0f9ff",
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
        <ExpoImage
          source={FINN_STANDARD}
          accessible={false}
          style={{ width: 140, height: 140 }}
          contentFit="contain"
        />
      </View>

      <View style={{ gap: 14 }}>
        <Text
          style={{
            color: "#bae6fd",
            fontSize: 16,
            lineHeight: 24,
            textAlign: "right",
            writingDirection: "rtl",
            fontFamily: "Heebo_500Medium",
          }}
        >
          הוצאות פתאומיות מתקרבות לעו״ש שלך. בוחרים הגנה מהתפריט למטה (קרן חירום,
          ביטוח, ניהול תקציב) ומקישים על בסיס פנוי כדי למקם אותה במסלול.
        </Text>
        <Text
          style={{
            color: "#f0f9ff",
            fontSize: 14,
            lineHeight: 22,
            textAlign: "right",
            writingDirection: "rtl",
            fontFamily: "Heebo_700Bold",
          }}
        >
          3 חודשים · עו״ש מתחיל ב-₪5,000 · 900 מטבעות להתחיל
        </Text>
      </View>

      <View style={{ gap: 10 }}>
        <Pressable
          onPress={onStart}
          accessibilityRole="button"
          accessibilityLabel="התחל קרב Tower Defense"
          style={{
            backgroundColor: "#0ea5e9",
            paddingVertical: 18,
            borderRadius: 20,
            alignItems: "center",
            borderBottomWidth: 4,
            borderBottomColor: "#0369a1",
          }}
        >
          <Text
            style={{
              color: "#ffffff",
              fontSize: 18,
              fontWeight: "900",
              fontFamily: "Heebo_900Black",
              writingDirection: "rtl",
            }}
          >
            קדימה נתחיל
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
              color: "#bae6fd",
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