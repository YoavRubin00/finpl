import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Users, Clock } from "lucide-react-native";

const RTL_CENTER = { writingDirection: "rtl" as const, textAlign: "center" as const };

export default function FriendsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.iconHalo}>
        <Users size={44} color="#64748b" strokeWidth={2} />
      </View>

      <Text style={[styles.title, RTL_CENTER]} allowFontScaling={false}>
        חברים
      </Text>

      <View style={styles.comingSoonBadge}>
        <Clock size={14} color="#64748b" strokeWidth={2.5} />
        <Text style={styles.comingSoonText} allowFontScaling={false}>
          בקרוב
        </Text>
      </View>

      <Text style={[styles.subtitle, RTL_CENTER]} allowFontScaling={false}>
        אזור החברים שלכם — אתגרים, התראות ודירוגים.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  iconHalo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#334155",
    letterSpacing: 0.3,
  },
  comingSoonBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  comingSoonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#64748b",
    writingDirection: "rtl",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
    lineHeight: 20,
    marginTop: 4,
    maxWidth: 300,
  },
});