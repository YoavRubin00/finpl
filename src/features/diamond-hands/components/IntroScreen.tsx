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
            color: "#fefce8",
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
          source={{ uri: DH_ASSETS.diamondPristine }}
          style={{ width: 140, height: 140 }}
          resizeMode="contain"
        />
      </View>

      <View style={{ gap: 18 }}>
        <Text
          style={{
            color: "#fefce8",
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
            color: "#a7f3d0",
            fontSize: 15,
            lineHeight: 24,
            textAlign: "right",
            writingDirection: "rtl",
            fontFamily: "Heebo_500Medium",
          }}
        >
          תחזיק את הכפתור לחוץ 15 שניות רצוף. בלי להרים את האצבע. בלי רחמים.
          אם תחזיק — תרוויח. אם תרים — איבדת.
        </Text>
        <View
          style={{
            borderRadius: 16,
            backgroundColor: "rgba(212, 160, 23, 0.12)",
            borderWidth: 1.5,
            borderColor: "rgba(212, 160, 23, 0.4)",
            padding: 14,
            flexDirection: "row-reverse",
            justifyContent: "space-between",
          }}
        >
          <Text
            style={{
              color: "#d4a017",
              fontSize: 14,
              fontFamily: "Heebo_900Black",
            }}
          >
            +150 XP · +300 Coins
          </Text>
          <Text
            style={{
              color: "#a7f3d0",
              fontSize: 13,
              fontFamily: "Heebo_500Medium",
              writingDirection: "rtl",
            }}
          >
            תגמול ניצחון:
          </Text>
        </View>
      </View>

      <View style={{ gap: 10 }}>
        <Pressable
          onPress={onStart}
          accessibilityRole="button"
          accessibilityLabel="התחל מבחן ידיים של יהלום"
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
            💎 אני מוכן/ה
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
              color: "#a7f3d0",
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
