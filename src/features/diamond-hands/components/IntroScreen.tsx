import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import { DH_ASSETS } from "../diamondHandsAssets";

interface Props {
  onStart: () => void;
  onClose: () => void;
}

export function IntroScreen({ onStart, onClose }: Props) {
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
            color: "#22d3ee",
            fontSize: 13,
            letterSpacing: 2.5,
            fontFamily: "Heebo_700Bold",
          }}
        >
          מבחן פאניקה
        </Text>
        <Text
          style={{
            color: "#f0f9ff",
            fontSize: 40,
            fontWeight: "900",
            fontFamily: "Heebo_900Black",
            textAlign: "center",
            writingDirection: "rtl",
            lineHeight: 44,
          }}
        >
          💎 ידיים של יהלום
        </Text>
        <Image
          source={DH_ASSETS.diamondPristine}
          style={{ width: 140, height: 140 }}
          resizeMode="contain"
        />
      </View>

      <View style={{ gap: 18 }}>
        <Text
          style={{
            color: "#f0f9ff",
            fontSize: 17,
            lineHeight: 26,
            textAlign: "right",
            writingDirection: "rtl",
            fontFamily: "Heebo_700Bold",
          }}
        >
          השוק קורס. כולם צועקים "תמכור!!"
        </Text>
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
          תחזיק את הכפתור לחוץ 10 שניות רצוף. בלי להרים את האצבע. בלי רחמים.
          אם תחזיק, תרוויח. אם תרים, איבדת.
        </Text>
      </View>

      <View style={{ gap: 10 }}>
        <Pressable
          onPress={onStart}
          accessibilityRole="button"
          accessibilityLabel="התחל מבחן ידיים של יהלום"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{
            backgroundColor: "#0ea5e9",
            paddingVertical: 18,
            borderRadius: 20,
            alignItems: "center",
            borderBottomWidth: 4,
            borderBottomColor: "#0369a1",
            shadowColor: "#0369a1",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: 8,
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
            קדימה נתחיל 💎
          </Text>
        </Pressable>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="סגור וחזור לפיד"
          style={{ paddingVertical: 10, alignItems: "center" }}
        >
          <Text
            style={{
              color: "#bae6fd",
              fontSize: 14,
              fontFamily: "Heebo_500Medium",
              writingDirection: "rtl",
            }}
          >
            אולי בפעם אחרת
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
