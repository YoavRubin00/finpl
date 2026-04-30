import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import LottieView from "lottie-react-native";
import { SafeLottie } from "../../components/ui/SafeLottie";
import Animated, { FadeInUp } from "react-native-reanimated";

import { tapHaptic } from "../../utils/haptics";
import { useAuthStore } from "../auth/useAuthStore";
import { RTL, SHADOW_STRONG } from "../chapter-4-content/simulations/simTheme";
import { AnimatedPressable } from "../../components/ui/AnimatedPressable";
import { GlowCard } from "../../components/ui/GlowCard";
import { BackButton } from "../../components/ui/BackButton";
import { FinnMailModal } from "../fun/FinnMailModal";

const WHATSAPP_URL = "https://chat.whatsapp.com/Clx7d0eFQmyHuQPppH6f7m?mode=gi_t";
const INSTAGRAM_URL = "https://www.instagram.com/finplay_?igsh=bjRtdHlrYWl5dG41&utm_source=qr";

// Stitch Premium Blue Theme
const STITCH_BLUE = {
  primary: "#0ea5e9", // Sky Blue
  glow: "#38bdf8",
  dim: "#f0f9ff",
  success: "#10b981",
  textPrimary: "#0f172a",
  textSecondary: "#64748b",
  textOnGradientMuted: "#ffffff",
  cardBorder: "#bae6fd",
  gradient: ["#0284c7", "#38bdf8"] as const,
};

// ---------------------------------------------------------------------------
// Section Header
// ---------------------------------------------------------------------------

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader} accessibilityRole="header">
      <Text style={[styles.sectionTitle, RTL]}>{title}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Row Components
// ---------------------------------------------------------------------------

interface MoreRowProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  badge?: string;
  badgeColor?: string;
  badgeLottie?: boolean;
  danger?: boolean;
  disabled?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
}

function MoreRow({ icon, label, onPress, badge, badgeColor = STITCH_BLUE.textSecondary, badgeLottie, danger, disabled, isFirst, isLast }: MoreRowProps) {
  const content = (
    <View style={[
      styles.row,
      isFirst && { borderTopLeftRadius: 20, borderTopRightRadius: 20 },
      isLast && { borderBottomLeftRadius: 20, borderBottomRightRadius: 20, borderBottomWidth: 0 },
      danger && { backgroundColor: "rgba(239, 68, 68, 0.05)", borderBottomColor: "rgba(239, 68, 68, 0.1)" }
    ]}>
      <View style={styles.rowLeft}>
        {badgeLottie ? (
          <View accessible={false} style={styles.lottieBadgeWrapper}>
            <LottieView
              source={require("../../../assets/lottie/Pro Animation 3rd.json")}
              style={{ width: 22, height: 22 }}
              autoPlay
              loop
            />
          </View>
        ) : badge ? (
          <View style={[styles.badge, { backgroundColor: badgeColor }]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : (
          <ChevronLeft size={20} color={danger ? "#ef4444" : STITCH_BLUE.textSecondary} />
        )}
      </View>
      <View style={styles.rowCenter}>
        <Text style={[styles.rowLabel, RTL, danger && { color: "#ef4444" }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <View style={[styles.rowIconWrapper, danger && { backgroundColor: "rgba(239, 68, 68, 0.08)" }]} accessible={false}>
        <View style={styles.rowIconInner}>{icon}</View>
      </View>
    </View>
  );

  return (
    <AnimatedPressable onPress={() => { if (disabled) return; tapHaptic(); onPress(); }} disabled={disabled} style={disabled && { opacity: 0.5 }} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }}>
      {content}
    </AnimatedPressable>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export function MoreScreen() {
  const router = useRouter();
  const signOut = useAuthStore((s) => s.signOut);
  const devResetProgress = useAuthStore((s) => s.devResetProgress);
  const [showMailModal, setShowMailModal] = useState(false);

  function handleSignOut() {
    if (Platform.OS === "web") {
      signOut();
      setTimeout(() => router.replace("/(auth)/onboarding" as never), 100);
      return;
    }
    Alert.alert(
      "יציאה מהחשבון",
      "בטוח שאתה רוצה לצאת?",
      [
        { text: "ביטול", style: "cancel" },
        {
          text: "יציאה",
          style: "destructive",
          onPress: () => {
            signOut();
            setTimeout(() => router.replace("/(auth)/onboarding" as never), 100);
          },
        },
      ]
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f0f9ff' }}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={{ alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 8 }}>
          <BackButton color={STITCH_BLUE.textPrimary} />
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Section 1: Features ── */}
          <SectionHeader title="פיצ'רים" />
          <Animated.View entering={FadeInUp.delay(100).duration(400)}>
            <GlowCard chapterGlow={STITCH_BLUE.glow} style={styles.cardGlow} pressable={false}>
              <View style={styles.cardInner}>
                <MoreRow
                  isFirst
                  icon={<SafeLottie source={require('../../../assets/lottie/wired-flat-3136-big-shop-hover-pinch.json')} style={styles.lottieIcon} autoPlay loop  />}
                  label="חנות"
                  onPress={() => router.push("/(tabs)/shop" as never)}
                />
                <MoreRow
                  icon={<SafeLottie source={require('../../../assets/lottie/wired-flat-161-growth-hover-pinch.json')} style={styles.lottieIcon} autoPlay loop  />}
                  label="לשחק עם המספרים"
                  onPress={() => router.push("/simulator")}
                />
                <MoreRow
                  icon={<SafeLottie source={require('../../../assets/lottie/wired-flat-489-rocket-space-hover-flying.json')} style={styles.lottieIcon} autoPlay loop  />}
                  label="מחשבון חופש כלכלי"
                  badge="חדש"
                  onPress={() => router.push("/fire-calculator")}
                />
                <MoreRow
                  icon={<SafeLottie source={require('../../../assets/lottie/wired-flat-426-brain-hover-pinch.json')} style={styles.lottieIcon} autoPlay loop  />}
                  label="תובנות AI"
                  onPress={() => router.push("/ai-insights" as never)}
                  badgeLottie
                />
                <MoreRow
                  icon={<SafeLottie source={require('../../../assets/lottie/wired-flat-458-goal-target-hover-hit.json')} style={styles.lottieIcon} autoPlay loop  />}
                  label="דו-קרב 1v1"
                  onPress={() => router.push("/duels")}
                  badge="בקרוב"
                  disabled
                />
                <MoreRow
                  icon={<SafeLottie source={require('../../../assets/lottie/wired-flat-411-news-newspaper-hover-pinch.json')} style={styles.lottieIcon} autoPlay loop  />}
                  label="חדשות"
                  onPress={() => router.push("/finfeed")}
                  badge="בקרוב"
                  disabled
                />
                <MoreRow
                  isLast
                  icon={<Text style={{ fontSize: 24 }}>🛡️</Text>}
                  label="הקבוצה"
                  onPress={() => router.push("/clan")}
                />
              </View>
            </GlowCard>
          </Animated.View>


          {/* ── Section 3: Account ── */}
          <SectionHeader title="חשבון" />
          <Animated.View entering={FadeInUp.delay(200).duration(400)}>
            <GlowCard chapterGlow={STITCH_BLUE.glow} style={styles.cardGlow} pressable={false}>
              <View style={styles.cardInner}>
                <MoreRow
                  isFirst
                  icon={<SafeLottie source={require('../../../assets/lottie/wired-flat-400-bookmark-hover-flutter.json')} style={styles.lottieIcon} autoPlay loop  />}
                  label="פריטים שמורים"
                  onPress={() => router.push("/saved-items" as never)}
                  badgeLottie
                />
                <MoreRow
                  icon={<SafeLottie source={require('../../../assets/lottie/wired-flat-35-edit-hover-circle.json')} style={styles.lottieIcon} autoPlay loop  />}
                  label="הגדרות"
                  onPress={() => router.push("/settings")}
                />
                <MoreRow
                  isLast
                  icon={<SafeLottie source={require('../../../assets/lottie/wired-flat-412-gift-hover-squeeze.json')} style={styles.lottieIcon} autoPlay loop  />}
                  label="רשת העושר, הזמן חברים"
                  onPress={() => router.push("/referral")}
                />
              </View>
            </GlowCard>
          </Animated.View>

          {/* ── Section 4: Info ── */}
          <SectionHeader title="מידע" />
          <Animated.View entering={FadeInUp.delay(300).duration(400)}>
            <GlowCard chapterGlow={STITCH_BLUE.glow} style={styles.cardGlow} pressable={false}>
              <View style={styles.cardInner}>
                <MoreRow
                  isFirst
                  icon={<SafeLottie source={require('../../../assets/lottie/wired-flat-202-chat-hover-oscillate.json')} style={styles.lottieIcon} autoPlay loop  />}
                  label="קהילת WhatsApp"
                  onPress={() => Linking.openURL(WHATSAPP_URL).catch(() => Alert.alert("שגיאה"))}
                />
                <MoreRow
                  icon={<SafeLottie source={require('../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json')} style={styles.lottieIcon} autoPlay loop  />}
                  label="עקבו אחרינו באינסטגרם"
                  onPress={() => Linking.openURL(INSTAGRAM_URL).catch(() => Alert.alert("שגיאה"))}
                />
                <MoreRow
                  icon={<SafeLottie source={require('../../../assets/lottie/wired-flat-56-document-hover-swipe.json')} style={styles.lottieIcon} autoPlay loop  />}
                  label="משפטי ופרטיות"
                  onPress={() => router.push("/legal")}
                />
                <MoreRow
                  isLast
                  icon={<SafeLottie source={require('../../../assets/lottie/wired-flat-24-approved-checked-hover-pinch.json')} style={styles.lottieIcon} autoPlay loop  />}
                  label="הצהרת נגישות"
                  onPress={() => router.push("/accessibility-statement")}
                />
              </View>
            </GlowCard>
          </Animated.View>

          {/* ── Actions ── */}
          <SectionHeader title="פעולות" />
          <Animated.View entering={FadeInUp.delay(400).duration(400)}>
            <GlowCard chapterGlow="rgba(239, 68, 68, 0.4)" style={styles.cardGlow} pressable={false}>
              <View style={styles.cardInner}>
                <MoreRow
                  isFirst
                  icon={<SafeLottie source={require('../../../assets/lottie/wired-flat-1432-erase-hover-pinch.json')} style={styles.lottieIcon} autoPlay loop  />}
                  label="איפוס התקדמות"
                  onPress={() => {
                    Alert.alert("איפוס", "כל ההתקדמות תימחק. בטוח?", [
                      { text: "ביטול", style: "cancel" },
                      {
                        text: "אפס",
                        style: "destructive",
                        onPress: () => {
                          devResetProgress();
                          Alert.alert("בוצע", "הפעל מחדש את האפליקציה כדי להשלים את האיפוס.");
                        },
                      },
                    ]);
                  }}
                  danger
                />
                <MoreRow
                  isLast
                  icon={<SafeLottie source={require('../../../assets/lottie/wired-flat-3335-door-sign-hover-attempt.json')} style={styles.lottieIcon} autoPlay loop  />}
                  label="יציאה מהחשבון"
                  onPress={handleSignOut}
                  danger
                />
              </View>
            </GlowCard>
          </Animated.View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Fun Mail Modal */}
        <FinnMailModal visible={showMailModal} onClose={() => setShowMailModal(false)} />
      </SafeAreaView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 60,
    zIndex: 10,
  },
  headerRightAnchor: {
    position: 'absolute',
    right: 20,
    top: 16,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 8,
  },
  sectionHeader: {
    marginTop: 28,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: STITCH_BLUE.textSecondary,
    letterSpacing: 0.5,
  },
  cardGlow: {
    borderRadius: 20,
    padding: 0,
    ...SHADOW_STRONG,
  },
  cardInner: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 16,
    gap: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1.5,
    borderBottomColor: STITCH_BLUE.cardBorder,
  },
  rowLeft: {
    flexShrink: 1,
    paddingLeft: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowCenter: {
    flex: 1,
    alignItems: "flex-end",
    justifyContent: 'center',
    paddingRight: 10,
  },
  rowLabel: {
    fontSize: 17,
    fontWeight: "900",
    color: STITCH_BLUE.textPrimary,
    textAlign: 'right',
  },
  rowIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: STITCH_BLUE.dim,
    justifyContent: "center",
    alignItems: "center",
  },
  rowIconInner: {
    width: 28,
    height: 28,
  },
  lottieIcon: {
    width: '100%',
    height: '100%',
  },
  badge: {
    backgroundColor: STITCH_BLUE.textSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginRight: 4,
  },
  badgeText: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "800",
  },
  lottieBadgeWrapper: {
    marginRight: 4,
    backgroundColor: STITCH_BLUE.dim,
    padding: 4,
    borderRadius: 8,
  },
  bottomSpacer: {
    height: 40,
  },
});
