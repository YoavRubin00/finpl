import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  
} from "react-native";
import { useRouter } from "expo-router";
import { Swords, ChevronRight } from "lucide-react-native";
import { CLASH, TEXT_SHADOW } from "../../constants/theme";
import { tapHaptic } from "../../utils/haptics";
import { DiamondBackground } from "../../components/ui/DiamondBackground";
import { GoldBorderCard } from "../../components/ui/GoldBorderCard";
import { SupercellButton } from "../../components/ui/SupercellButton";
import { useDuelsStore } from "./useDuelsStore";
import { DUEL_WIN_COINS, DUEL_LOSS_COINS, DUEL_WIN_GEMS } from "./duelData";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RecordBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={recordStyles.badge}>
      <Text style={[recordStyles.value, { color }]}>{value}</Text>
      <Text style={recordStyles.label}>{label}</Text>
    </View>
  );
}

const recordStyles = StyleSheet.create({
  badge: { alignItems: "center", minWidth: 60 },
  value: { fontSize: 28, fontWeight: "900", ...TEXT_SHADOW },
  label: { fontSize: 12, fontWeight: "600", color: "#94a3b8", marginTop: 2 },
});

// ---------------------------------------------------------------------------
// Main Screen (Lobby)
// ---------------------------------------------------------------------------

export function DuelsScreen() {
  const router = useRouter();
  const record = useDuelsStore((s) => s.record);

  // Finn arena splash on enter — static 1.5s or tap to dismiss
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleFindMatch = useCallback(() => {
    tapHaptic();
    router.push("/duels/battle" as never);
  }, [router]);

  const winRate = record.wins + record.losses > 0
    ? Math.round((record.wins / (record.wins + record.losses)) * 100)
    : 0;

  return (
    <View style={styles.container}>
      {showSplash && (
        <Pressable onPress={() => setShowSplash(false)} style={styles.finnSplash}>
          <Image source={{ uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/images/finn/finn-arena.png' }} style={styles.finnSplashImg} resizeMode="cover" />
        </Pressable>
      )}
      <DiamondBackground>
        {/* Back button */}
        <View style={styles.backRow}>
          <SupercellButton
            label="חזרה"
            variant="blue"
            size="sm"
            icon={<ChevronRight size={16} color="#fff" />}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as never)}
          />
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Swords size={56} color={CLASH.goldLight} />
          <Text style={styles.heroTitle}>{"דו-קרב 1v1"}</Text>
          <Text style={styles.heroSubtitle}>{"אתגר חברים לקרב ידע פיננסי מהיר!"}</Text>
        </View>

        {/* Record card */}
        <View style={styles.section}>
          <GoldBorderCard variant="gold" shimmer>
            <View style={styles.recordRow}>
              <RecordBadge label="ניצחונות" value={record.wins} color="#4ade80" />
              <RecordBadge label="הפסדים" value={record.losses} color="#ef4444" />
              <RecordBadge label="תיקו" value={record.draws} color="#fbbf24" />
            </View>
            {(record.wins + record.losses) > 0 && (
              <Text style={styles.winRate}>{`אחוז ניצחון: ${winRate}%`}</Text>
            )}
          </GoldBorderCard>
        </View>

        {/* Rules card */}
        <View style={styles.section}>
          <GoldBorderCard variant="blue">
            <Text style={styles.rulesTitle}>{"איך זה עובד?"}</Text>
            <Text style={styles.rulesText}>{`\u2694\uFE0F  60 שניות, כמה שיותר תשובות\n\u{1F3C6}  ניצחון = ${DUEL_WIN_COINS} מטבעות + ${DUEL_WIN_GEMS} ג'מס\n\u{1F4B0}  הפסד = ${DUEL_LOSS_COINS} מטבעות נחמה`}</Text>
          </GoldBorderCard>
        </View>

        {/* CTA */}
        <View style={styles.ctaSection}>
          <SupercellButton
            label="מצא יריב!"
            variant="green"
            size="lg"
            icon={<Swords size={22} color="#fff" />}
            onPress={handleFindMatch}
          />
        </View>
      </DiamondBackground>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CLASH.bgPrimary },
  backRow: {
    paddingHorizontal: 16,
    paddingTop: 56,
    alignItems: "flex-end",
  },
  hero: {
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 16,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: "#fff",
    marginTop: 12,
    ...TEXT_SHADOW,
    writingDirection: "rtl",
  },
  heroSubtitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#94a3b8",
    marginTop: 6,
    writingDirection: "rtl",
    textAlign: "center",
  },
  section: { paddingHorizontal: 16, marginTop: 16 },
  recordRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  winRate: {
    fontSize: 14,
    fontWeight: "700",
    color: CLASH.goldLight,
    textAlign: "center",
    marginTop: 12,
    writingDirection: "rtl",
  },
  rulesTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#fff",
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: 8,
    ...TEXT_SHADOW,
  },
  rulesText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#cbd5e1",
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 26,
  },
  ctaSection: { paddingHorizontal: 16, marginTop: 24 },
  finnSplash: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    backgroundColor: "#0c1929",
    justifyContent: "center",
    alignItems: "center",
  },
  finnSplashImg: {
    width: '85%',
    height: '85%',
  },
});
