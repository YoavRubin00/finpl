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
import { SvgXml } from "react-native-svg";
import Animated, { FadeInUp } from "react-native-reanimated";

import { tapHaptic } from "../../utils/haptics";
import { useAuthStore } from "../auth/useAuthStore";
import { signOut as lifecycleSignOut } from "../../lib/auth/lifecycle";
import { RTL, SHADOW_STRONG } from "../chapter-4-content/simulations/simTheme";
import { AnimatedPressable } from "../../components/ui/AnimatedPressable";
import { GlowCard } from "../../components/ui/GlowCard";
import { BackButton } from "../../components/ui/BackButton";
import { useFunStore } from "../../stores/useFunStore";
import { FinnMailModal } from "../fun/FinnMailModal";
import { track } from "../../lib/analytics/events";
import { WHATSAPP_COMMUNITY_URL, WHATSAPP_SVG } from "../social/whatsappCommunity";
import { SharkInsightToast } from "../../components/ui/SharkInsightToast";
import { FINN_EMPATHIC, FINN_HAPPY } from "../retention-loops/finnMascotConfig";
import { resetAllLocalStores, getLocalStorageKeys } from "../../lib/stores/registry";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SIGN_OUT_DIALOG } from "../settings/SettingsScreen";
import type { ImageSource } from "expo-image";

// In-app feedback toasts (replace the bare native Alert.alert("שגיאה") etc.).
// Voice (docs/BRAND.md): system speaks → plural.
interface MoreToast {
  title: string;
  body: string;
  shark: ImageSource;
  accentColor: string;
}
const MORE_TOASTS = {
  linkFailed: {
    title: "הקישור לא נפתח",
    body: "לא הצלחנו לפתוח את הקישור. בדקו את החיבור ונסו שוב.",
    shark: FINN_EMPATHIC,
    accentColor: "#ef4444",
  },
  progressReset: {
    title: "ההתקדמות אופסה",
    body: "מתחילים מהתחלה — נקי לגמרי. בהצלחה!",
    shark: FINN_HAPPY,
    accentColor: "#22c55e",
  },
} as const satisfies Record<string, MoreToast>;

const INSTAGRAM_URL = "https://www.instagram.com/finplay_?igsh=bjRtdHlrYWl5dG41&utm_source=qr";
// Official Instagram camera glyph with the brand gradient (warm bottom-left →
// cool top-right), mirroring the WhatsApp brand glyph above so the "follow us"
// row reads as a real social link, not a generic share icon (Yoav 2026-06-28).
const INSTAGRAM_SVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="igGrad" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#feda75"/><stop offset="0.25" stop-color="#fa7e1e"/><stop offset="0.5" stop-color="#d62976"/><stop offset="0.75" stop-color="#962fbf"/><stop offset="1" stop-color="#4f5bd5"/></linearGradient></defs><path fill="url(#igGrad)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`;

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

function SectionHeader({ title, first }: { title: string; first?: boolean }) {
  return (
    <View style={[styles.sectionHeader, first && styles.sectionHeaderFirst]} accessibilityRole="header">
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
  const devResetProgress = useAuthStore((s) => s.devResetProgress);
  const hasUnreadMail = useFunStore((s) => s.hasUnreadMail);
  const [showMailModal, setShowMailModal] = useState(false);
  const [toast, setToast] = useState<MoreToast | null>(null);

  // Progress reset that completes IN-APP (no "restart the app" step): every
  // registered zustand store resets its in-memory state via the registry (the
  // same helper sign-out uses), then its persisted key is dropped. Auth stays.
  function performProgressReset() {
    if (__DEV__) devResetProgress?.();
    resetAllLocalStores();
    const keys = getLocalStorageKeys();
    if (keys.length > 0) {
      AsyncStorage.multiRemove(keys).catch(() => { /* swallow */ });
    }
    setToast(MORE_TOASTS.progressReset);
  }

  function handleSignOut() {
    if (Platform.OS === "web") {
      lifecycleSignOut().catch(() => { /* swallow */ });
      setTimeout(() => router.replace("/(auth)/onboarding" as never), 100);
      return;
    }
    Alert.alert(
      SIGN_OUT_DIALOG.title,
      SIGN_OUT_DIALOG.message,
      [
        { text: SIGN_OUT_DIALOG.cancel, style: "cancel" },
        {
          text: SIGN_OUT_DIALOG.confirm,
          style: "destructive",
          onPress: async () => {
            await lifecycleSignOut();
            router.replace("/(auth)/onboarding" as never);
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
          <SectionHeader title="פיצ'רים" first />
          <Animated.View entering={FadeInUp.delay(100).duration(400)}>
            <GlowCard chapterGlow={STITCH_BLUE.glow} style={styles.cardGlow} pressable={false}>
              <View style={styles.cardInner}>
                {/* פנטזי ליג / לשחק עם המספרים / מחשבון חופש כלכלי / דו-קרב 1v1
                    / סקוואדים / חדשות הוסרו מכאן 2026-05-31 לבקשת המשתמש —
                    רק חנות נשארת. הניתובים `/fantasy`, `/simulator`,
                    `/fire-calculator`, `/duels`, `/squads`, `/finfeed` עדיין
                    קיימים ב-app/ ויכולים לחזור אם נחליט להחזיר אותם. */}
                <MoreRow
                  isFirst
                  isLast
                  icon={<SafeLottie source={require('../../../assets/lottie/wired-flat-3136-big-shop-hover-pinch.json')} style={styles.lottieIcon} autoPlay loop  />}
                  label="חנות"
                  onPress={() => router.push("/(tabs)/shop" as never)}
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
                  label="פנו אלינו לתמיכה"
                  onPress={() => {
                    // In-app support chat (SupportChatScreen) instead of
                    // bouncing to the mail composer / an email-address Alert.
                    tapHaptic();
                    router.push("/support" as never);
                  }}
                />
                <MoreRow
                  icon={<SvgXml xml={WHATSAPP_SVG} width={28} height={28} />}
                  label="קהילת WhatsApp"
                  onPress={() => {
                    try { track({ name: 'whatsapp_cta_tapped', props: { source: 'more_screen' } }); } catch { /* non-fatal */ }
                    Linking.openURL(WHATSAPP_COMMUNITY_URL).catch(() => setToast(MORE_TOASTS.linkFailed));
                  }}
                />
                <MoreRow
                  icon={<SvgXml xml={INSTAGRAM_SVG} width={28} height={28} />}
                  label="עקבו אחרינו באינסטגרם"
                  onPress={() => {
                    try { track({ name: 'instagram_cta_tapped', props: { source: 'more_screen' } }); } catch { /* non-fatal */ }
                    Linking.openURL(INSTAGRAM_URL).catch(() => setToast(MORE_TOASTS.linkFailed));
                  }}
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
                {/* DEV-ONLY (18.8): in production this row was a silent no-op
                    (devResetProgress exists only in __DEV__) that asked users
                    to restart the app. Wiping local stores while the server
                    still holds their progress would leave the two out of sync
                    (server resync would resurrect the "reset" state), so the
                    row is hidden for real users until a server-side reset
                    exists. */}
                {__DEV__ && (
                  <MoreRow
                    isFirst
                    icon={<SafeLottie source={require('../../../assets/lottie/wired-flat-1432-erase-hover-pinch.json')} style={styles.lottieIcon} autoPlay loop  />}
                    label="איפוס התקדמות (dev)"
                    onPress={() => {
                      Alert.alert("איפוס", "כל ההתקדמות תימחק. בטוח?", [
                        { text: "ביטול", style: "cancel" },
                        {
                          text: "אפס",
                          style: "destructive",
                          onPress: performProgressReset,
                        },
                      ]);
                    }}
                    danger
                  />
                )}
                <MoreRow
                  isFirst={!__DEV__}
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
      {/* In-app feedback toast (link failures / progress reset) — was Alert.alert. */}
      <SharkInsightToast
        visible={toast !== null}
        shark={toast?.shark ?? FINN_HAPPY}
        title={toast?.title ?? ""}
        body={toast?.body ?? ""}
        accentColor={toast?.accentColor}
        autoDismissMs={5000}
        onDismiss={() => setToast(null)}
      />
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
    paddingTop: 2,
  },
  sectionHeader: {
    marginTop: 28,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // First section sits right under the back-button row — no big top gap
  // (Yoav 2026-06-14: "חלק גדול במסך מתבזבז, תמצם את הכותרת למעלה").
  sectionHeaderFirst: {
    marginTop: 2,
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
