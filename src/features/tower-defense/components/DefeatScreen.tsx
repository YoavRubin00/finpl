import React from "react";
import { Pressable, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { FINN_EMPATHIC } from "../../retention-loops/finnMascotConfig";

interface Props {
  onRetry: () => void;
  onBack: () => void;
}

export function DefeatScreen({ onRetry, onBack }: Props) {
  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: 24,
        paddingVertical: 40,
        justifyContent: "space-between",
        gap: 24,
      }}
    >
      <View style={{ alignItems: "center", gap: 18 }}>
        <ExpoImage
          source={FINN_EMPATHIC}
          accessible={false}
          style={{ width: 140, height: 140 }}
          contentFit="contain"
        />
        <Text
          style={{
            color: "#f0f9ff",
            fontSize: 34,
            fontWeight: "900",
            fontFamily: "Heebo_900Black",
            textAlign: "center",
            writingDirection: "rtl",
          }}
        >
          ההוצאות גברו עליך
        </Text>
      </View>

      <View
        style={{
          backgroundColor: "rgba(12, 74, 110, 0.6)",
          borderRadius: 20,
          borderWidth: 2.5,
          borderColor: "rgba(56, 189, 248, 0.5)",
          padding: 20,
        }}
      >
        <Text
          style={{
            color: "#bae6fd",
            fontSize: 15,
            lineHeight: 24,
            textAlign: "right",
            writingDirection: "rtl",
            fontFamily: "Heebo_500Medium",
          }}
        >
          טיפ: שילוב של קרן חירום (נגד הוצאות גדולות) + ניהול תקציב (נגד
          שופינג) בד״כ מספיק להחזיק 3 חודשים. נסה שוב בהרכב חכם יותר.
        </Text>
      </View>

      <View style={{ gap: 10 }}>
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="נסה שוב את הקרב"
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
            נסה שוב
          </Text>
        </Pressable>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="חזור למפת הפרקים"
          style={{ paddingVertical: 12, alignItems: "center" }}
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
