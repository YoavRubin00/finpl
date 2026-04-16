import React from "react";
import { Pressable, Text, View } from "react-native";

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
        <Text style={{ fontSize: 84 }}>🥹</Text>
        <Text
          style={{
            color: "#f97316",
            fontSize: 14,
            letterSpacing: 3,
            fontFamily: "Heebo_700Bold",
          }}
        >
          אוברדרפט
        </Text>
        <Text
          style={{
            color: "#fefce8",
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
          backgroundColor: "rgba(0, 40, 20, 0.6)",
          borderRadius: 20,
          borderWidth: 2.5,
          borderColor: "rgba(249, 115, 22, 0.5)",
          padding: 20,
        }}
      >
        <Text
          style={{
            color: "#a7f3d0",
            fontSize: 15,
            lineHeight: 24,
            textAlign: "right",
            writingDirection: "rtl",
            fontFamily: "Heebo_500Medium",
          }}
        >
          💡 טיפ: שילוב של קרן חירום (נגד הוצאות גדולות) + תקציב אוטומטי (נגד
          שופינג) בד״כ מספיק להחזיק 3 חודשים. נסה שוב בהרכב חכם יותר.
        </Text>
      </View>

      <View style={{ gap: 10 }}>
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="נסה שוב את הקרב"
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
            🔄 נסה שוב
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
