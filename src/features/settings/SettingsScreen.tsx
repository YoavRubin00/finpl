import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Switch,
  StyleSheet,
  Alert,
  Platform,
  Pressable,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import LottieView from "lottie-react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import { tapHaptic } from "../../utils/haptics";
import { useAuthStore } from "../auth/useAuthStore";
import { useNotificationStore } from "../notifications/useNotificationStore";
import { useAudioStore } from "../../stores/useAudioStore";
import { AVATAR_LIST, DEFAULT_AVATAR_EMOJI } from "../avatars/avatarData";
import type { CompanionId } from "../auth/types";
import { SIM4, RTL, SHADOW_LIGHT, SHADOW_STRONG } from "../chapter-4-content/simulations/simTheme";
import { AnimatedPressable } from "../../components/ui/AnimatedPressable";
import { BackButton } from "../../components/ui/BackButton";
import { GlowCard } from "../../components/ui/GlowCard";

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

const CHAT_STYLE_NAMES: Record<CompanionId, string> = {
  "warren-buffett": "חכם וסבלני",
  "moshe-peled": "ישיר ותכל׳סי",
  "rachel": "חם ומעודד",
  "robot": "אנליטי ומדויק",
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

function Divider() {
  return <View style={styles.divider} />;
}

// ---------------------------------------------------------------------------
// Row Components
// ---------------------------------------------------------------------------

interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
  right?: React.ReactNode;
  subtitle?: string;
  isFirst?: boolean;
  isLast?: boolean;
}

function SettingsRow({ icon, label, onPress, right, subtitle, isFirst, isLast }: SettingsRowProps) {
  const content = (
    <View style={[
      styles.row,
      isFirst && { borderTopLeftRadius: 20, borderTopRightRadius: 20 },
      isLast && { borderBottomLeftRadius: 20, borderBottomRightRadius: 20, borderBottomWidth: 0 },
    ]}>
      <View style={styles.rowLeft}>
        {right ?? <ChevronLeft size={20} color={STITCH_BLUE.textSecondary} />}
      </View>
      <View style={styles.rowCenter}>
        <Text style={[styles.rowLabel, RTL]}>{label}</Text>
        {subtitle ? <Text style={[styles.rowSubtitle, RTL]}>{subtitle}</Text> : null}
      </View>
      <View style={styles.rowIconWrapper} accessible={false}>
        <View style={styles.rowIconInner}>{icon}</View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <AnimatedPressable onPress={() => { tapHaptic(); onPress(); }} style={styles.pressableRow} accessibilityRole="button" accessibilityLabel={label}>
        {content}
      </AnimatedPressable>
    );
  }

  return content;
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export function SettingsScreen() {
  const router = useRouter();

  // Auth store
  const displayName = useAuthStore((s) => s.displayName);
  const profile = useAuthStore((s) => s.profile);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const signOut = useAuthStore((s) => s.signOut);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);

  // Notification store
  const permissionGranted = useNotificationStore((s) => s.permissionGranted);
  const preferences = useNotificationStore((s) => s.preferences);
  const requestPermission = useNotificationStore((s) => s.requestPermission);
  const scheduleStreakReminder = useNotificationStore((s) => s.scheduleStreakReminder);
  const cancelChannel = useNotificationStore((s) => s.cancelChannel);
  const setPreference = useNotificationStore((s) => s.setPreference);

  // Local state for editing display name
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(displayName ?? "");

  // Audio store
  const musicEnabled = useAudioStore((s) => s.musicEnabled);
  const toggleMusic = useAudioStore((s) => s.toggleMusic);
  const sfxEnabled = useAudioStore((s) => s.sfxEnabled);
  const toggleSfx = useAudioStore((s) => s.toggleSfx);

  // Chat tone
  const companionId: CompanionId = profile?.companionId ?? "warren-buffett";
  const [showChatPicker, setShowChatPicker] = useState(false);

  // Toggle states
  const streakEnabled = preferences.streak;
  const challengeEnabled = preferences.challenge;

  // Avatar info
  const currentAvatarId = profile?.avatarId ?? "lion";
  const currentAvatar = AVATAR_LIST.find((a) => a.id === currentAvatarId);

  // Member since
  const createdAt = useAuthStore((s) => s.createdAt);
  const memberSinceLabel = (() => {
    const d = createdAt ? new Date(createdAt) : new Date();
    return d.toLocaleDateString("he-IL", { year: "numeric", month: "long" });
  })();

  // Handlers
  function handleSaveName() {
    const trimmed = nameValue.trim();
    if (trimmed.length > 0) {
      updateProfile({ displayName: trimmed });
    } else {
      setNameValue(displayName ?? "");
    }
    setEditingName(false);
  }

  async function handleToggleStreak(value: boolean) {
    if (value) {
      if (!permissionGranted) {
        const granted = await requestPermission();
        if (!granted) {
          showPermissionDeniedAlert();
          return;
        }
      }
      await scheduleStreakReminder();
      setPreference("streak", true);
    } else {
      await cancelChannel("streak");
      setPreference("streak", false);
    }
  }

  async function handleToggleChest(value: boolean) {
    if (value) {
      if (!permissionGranted) {
        const granted = await requestPermission();
        if (!granted) {
          showPermissionDeniedAlert();
          return;
        }
      }
      setPreference("chest", true);
    } else {
      await cancelChannel("chest");
      setPreference("chest", false);
    }
  }

  async function handleToggleChallenge(value: boolean) {
    if (value) {
      if (!permissionGranted) {
        const granted = await requestPermission();
        if (!granted) {
          showPermissionDeniedAlert();
          return;
        }
      }
      setPreference("challenge", true);
    } else {
      await cancelChannel("challenge");
      setPreference("challenge", false);
    }
  }

  function handleContactSupport() {
    Linking.openURL("mailto:yoav.finplay@gmail.com?subject=FinPlay%20Support").catch(() => {
      Alert.alert("שגיאה", "לא ניתן לפתוח את אפליקציית האימייל. ניתן לפנות ל-yoav.finplay@gmail.com");
    });
  }

  function handleSignOut() {
    Alert.alert("התנתקות", "להתנתק מהחשבון?", [
      { text: "ביטול", style: "cancel" },
      { text: "התנתק", onPress: () => { signOut(); router.replace("/login" as never); } },
    ]);
  }

  function handleDeleteAccount() {
    Alert.alert(
      "מחיקת חשבון",
      "פעולה זו תמחק לצמיתות את כל הנתונים שלך, התקדמות, מטבעות, פרופיל והישגים. לא ניתן לשחזר. להמשיך?",
      [
        { text: "ביטול", style: "cancel" },
        {
          text: "מחק לצמיתות",
          style: "destructive",
          onPress: () => {
            Alert.alert("אישור אחרון", "האם אתה בטוח לחלוטין?", [
              { text: "ביטול", style: "cancel" },
              {
                text: "כן, מחק",
                style: "destructive",
                onPress: async () => {
                  try {
                    await deleteAccount();
                    router.replace("/login" as never);
                  } catch {
                    Alert.alert("שגיאה", "המחיקה נכשלה. נסה שוב או צור קשר עם התמיכה.");
                  }
                },
              },
            ]);
          },
        },
      ],
    );
  }

  function showPermissionDeniedAlert() {
    Alert.alert(
      "התראות חסומות",
      "כדי לקבל התראות, יש לאפשר אותן בהגדרות המכשיר.",
      [{ text: "הבנתי", style: "default" }],
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f0f9ff' }}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header, matches MoreScreen */}
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 }}>
          <BackButton color="#0369a1" />
          <Text style={[RTL, { fontSize: 18, fontWeight: '900', color: '#0369a1' }]}>הגדרות</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Profile Section ── */}
          <SectionHeader title="פרופיל אישי" />
          <Animated.View entering={FadeInUp.delay(100).duration(400)}>
            <GlowCard chapterGlow={STITCH_BLUE.glow} style={styles.cardGlow} pressable={false}>
              <View style={styles.cardInner}>
                <SettingsRow
                  isFirst
                  icon={
                    <LottieView
                      source={require("../../../assets/lottie/wired-flat-35-edit-hover-circle.json")}
                      style={styles.lottieIcon}
                      autoPlay
                      loop
                    />
                  }
                  label="שם תצוגה"
                  right={
                    editingName ? (
                      <TextInput
                        style={styles.nameInput}
                        value={nameValue}
                        onChangeText={setNameValue}
                        onBlur={handleSaveName}
                        onSubmitEditing={handleSaveName}
                        autoFocus
                        returnKeyType="done"
                        maxLength={30}
                        accessibilityLabel="עריכת שם תצוגה"
                      />
                    ) : (
                      <AnimatedPressable
                        onPress={() => {
                          setNameValue(displayName ?? "");
                          setEditingName(true);
                        }}
                        style={styles.editBtn}
                        accessibilityRole="button"
                        accessibilityLabel="ערוך שם תצוגה"
                      >
                        <Text style={[styles.valueText, RTL]} numberOfLines={1} ellipsizeMode="tail">
                          {displayName ?? "---"}
                        </Text>
                      </AnimatedPressable>
                    )
                  }
                />
                <Divider />
                <SettingsRow
                  icon={
                    <LottieView
                      source={require("../../../assets/lottie/wired-flat-44-avatar-user-in-circle-hover-looking-around.json")}
                      style={styles.lottieIcon}
                      autoPlay
                      loop
                    />
                  }
                  label="אווטאר"
                  subtitle={currentAvatar?.name ?? "ברירת מחדל"}
                  onPress={() => router.push("/profile")}
                  right={
                    <View style={styles.avatarPreview}>
                      <Text style={styles.avatarEmoji}>{currentAvatar?.emoji ?? DEFAULT_AVATAR_EMOJI}</Text>
                      <ChevronLeft size={16} color={STITCH_BLUE.textSecondary} />
                    </View>
                  }
                />
                <Divider />
                <SettingsRow
                  isLast
                  icon={
                    <LottieView
                      source={require("../../../assets/lottie/wired-flat-28-calendar-hover-pinch.json")}
                      style={styles.lottieIcon}
                      autoPlay
                      loop
                    />
                  }
                  label="חבר/ה מאז"
                  right={
                    <View style={styles.badgeWrapper}>
                      <Text style={styles.badgeText}>{memberSinceLabel}</Text>
                    </View>
                  }
                />
              </View>
            </GlowCard>
          </Animated.View>

          {/* ── Notifications Section ── */}
          <SectionHeader title="התראות" />
          <Animated.View entering={FadeInUp.delay(200).duration(400)}>
            <GlowCard chapterGlow={STITCH_BLUE.glow} style={styles.cardGlow} pressable={false}>
              <View style={styles.cardInner}>
                <SettingsRow
                  isFirst
                  icon={
                    <LottieView
                      source={require("../../../assets/lottie/wired-flat-193-bell-notification-hover-ring.json")}
                      style={styles.lottieIcon}
                      autoPlay
                      loop
                    />
                  }
                  label="תזכורת יומית"
                  subtitle={permissionGranted ? "מופעל" : "התראות כבויות"}
                  right={
                    <Switch
                      value={streakEnabled}
                      onValueChange={handleToggleStreak}
                      trackColor={{ false: STITCH_BLUE.dim, true: STITCH_BLUE.success }}
                      thumbColor="#ffffff"
                      ios_backgroundColor={STITCH_BLUE.dim}
                      accessibilityLabel="תזכורת יומית"
                      accessibilityRole="switch"
                    />
                  }
                />
                <Divider />
                <SettingsRow
                  isLast
                  icon={
                    <LottieView
                      source={require("../../../assets/lottie/wired-flat-2804-fire-flame-hover-pinch.json")}
                      style={styles.lottieIcon}
                      autoPlay
                      loop
                    />
                  }
                  label="סטריק בסכנה"
                  subtitle={permissionGranted ? "אזהרה לפני שהרצף נשבר" : "התראות כבויות"}
                  right={
                    <Switch
                      value={challengeEnabled}
                      onValueChange={handleToggleChallenge}
                      trackColor={{ false: STITCH_BLUE.dim, true: STITCH_BLUE.success }}
                      thumbColor="#ffffff"
                      ios_backgroundColor={STITCH_BLUE.dim}
                      accessibilityLabel="סטריק בסכנה"
                      accessibilityRole="switch"
                    />
                  }
                />
                <SettingsRow
                  icon={
                    <LottieView
                      source={require("../../../assets/lottie/wired-flat-45-clock-time-hover-pinch.json")}
                      style={styles.lottieIcon}
                      autoPlay
                      loop
                    />
                  }
                  label="בוקר טוב עם קפטן שארק"
                  subtitle="טיפ פיננסי כל בוקר"
                  right={
                    <Switch
                      value={preferences.morning}
                      onValueChange={async (v) => {
                        if (v && !permissionGranted) { const g = await requestPermission(); if (!g) { showPermissionDeniedAlert(); return; } }
                        setPreference("morning", v);
                      }}
                      trackColor={{ false: STITCH_BLUE.dim, true: STITCH_BLUE.success }}
                      thumbColor="#ffffff"
                      ios_backgroundColor={STITCH_BLUE.dim}
                      accessibilityLabel="בוקר טוב עם קפטן שארק"
                      accessibilityRole="switch"
                    />
                  }
                />
                <SettingsRow
                  icon={
                    <LottieView
                      source={require("../../../assets/lottie/wired-flat-193-bell-notification-hover-ring.json")}
                      style={styles.lottieIcon}
                      autoPlay
                      loop
                    />
                  }
                  label="תזכורת חזרה"
                  subtitle="קפטן שארק מתגעגע אם לא באת"
                  right={
                    <Switch
                      value={preferences.inactivity}
                      onValueChange={async (v) => {
                        if (v && !permissionGranted) { const g = await requestPermission(); if (!g) { showPermissionDeniedAlert(); return; } }
                        if (!v) cancelChannel("inactivity").catch(() => {});
                        setPreference("inactivity", v);
                      }}
                      trackColor={{ false: STITCH_BLUE.dim, true: STITCH_BLUE.success }}
                      thumbColor="#ffffff"
                      ios_backgroundColor={STITCH_BLUE.dim}
                      accessibilityLabel="תזכורת חזרה"
                      accessibilityRole="switch"
                    />
                  }
                />
                <SettingsRow
                  icon={
                    <LottieView
                      source={require("../../../assets/lottie/wired-flat-153-bar-chart-hover-pinch.json")}
                      style={styles.lottieIcon}
                      autoPlay
                      loop
                    />
                  }
                  label="עדכוני שוק"
                  subtitle="קפטן שארק מעדכן על תנועות בשוק"
                  right={
                    <Switch
                      value={preferences.marketHook}
                      onValueChange={async (v) => {
                        if (v && !permissionGranted) { const g = await requestPermission(); if (!g) { showPermissionDeniedAlert(); return; } }
                        if (!v) cancelChannel("marketHook").catch(() => {});
                        setPreference("marketHook", v);
                      }}
                      trackColor={{ false: STITCH_BLUE.dim, true: STITCH_BLUE.success }}
                      thumbColor="#ffffff"
                      ios_backgroundColor={STITCH_BLUE.dim}
                      accessibilityLabel="עדכוני שוק"
                      accessibilityRole="switch"
                    />
                  }
                />
              </View>
            </GlowCard>
          </Animated.View>

          {/* ── General Section ── */}
          <SectionHeader title="כללי" />
          <Animated.View entering={FadeInUp.delay(300).duration(400)}>
            <GlowCard chapterGlow={STITCH_BLUE.glow} style={styles.cardGlow} pressable={false}>
              <View style={styles.cardInner}>
                <SettingsRow
                  isFirst
                  icon={
                    <LottieView
                      source={require("../../../assets/lottie/wired-flat-36-bulb-hover-blink.json")}
                      style={styles.lottieIcon}
                      autoPlay
                      loop
                    />
                  }
                  label="מוזיקת רקע"
                  subtitle={musicEnabled ? "מופעלת" : "כבויה"}
                  right={
                    <Switch
                      value={musicEnabled}
                      onValueChange={toggleMusic}
                      trackColor={{ false: STITCH_BLUE.dim, true: STITCH_BLUE.success }}
                      thumbColor="#ffffff"
                      ios_backgroundColor={STITCH_BLUE.dim}
                      accessibilityLabel="מוזיקת רקע"
                      accessibilityRole="switch"
                    />
                  }
                />
                <Divider />
                <SettingsRow
                  icon={
                    <Text style={{ fontSize: 20 }}>🔊</Text>
                  }
                  label="צלילי מקשים"
                  subtitle={sfxEnabled ? "מופעלים" : "כבויים"}
                  right={
                    <Switch
                      value={sfxEnabled}
                      onValueChange={toggleSfx}
                      trackColor={{ false: STITCH_BLUE.dim, true: STITCH_BLUE.success }}
                      thumbColor="#ffffff"
                      ios_backgroundColor={STITCH_BLUE.dim}
                      accessibilityLabel="צלילי מקשים"
                      accessibilityRole="switch"
                    />
                  }
                />
                <Divider />
                <SettingsRow
                  icon={
                    <LottieView
                      source={require("../../../assets/lottie/wired-flat-202-chat-hover-oscillate.json")}
                      style={styles.lottieIcon}
                      autoPlay
                      loop
                    />
                  }
                  label="סגנון צ'אט"
                  subtitle={CHAT_STYLE_NAMES[companionId]}
                  onPress={() => setShowChatPicker(true)}
                  right={
                    <ChevronLeft size={20} color={STITCH_BLUE.textSecondary} />
                  }
                />
                <Divider />
                <SettingsRow
                  icon={
                    <LottieView
                      source={require("../../../assets/lottie/wired-flat-36-bulb-hover-blink.json")}
                      style={styles.lottieIcon}
                      autoPlay
                      loop
                    />
                  }
                  label="אודות FinPlay"
                  right={
                    <View style={styles.badgeWrapper}>
                      <Text style={styles.badgeText}>v1.0.0</Text>
                    </View>
                  }
                />
                <Divider />
                <SettingsRow
                  isLast
                  icon={
                    <LottieView
                      source={require("../../../assets/lottie/wired-flat-56-document-hover-swipe.json")}
                      style={styles.lottieIcon}
                      autoPlay
                      loop
                    />
                  }
                  label="משפטי ופרטיות"
                  onPress={() => router.push("/legal")}
                />
              </View>
            </GlowCard>
          </Animated.View>

          {/* ── Account Section ── */}
          <SectionHeader title="חשבון" />
          <Animated.View entering={FadeInUp.delay(400).duration(400)}>
            <GlowCard chapterGlow={STITCH_BLUE.glow} style={styles.cardGlow} pressable={false}>
              <View style={styles.cardInner}>
                <SettingsRow
                  isFirst
                  icon={
                    <LottieView
                      source={require("../../../assets/lottie/wired-flat-202-chat-hover-oscillate.json")}
                      style={styles.lottieIcon}
                      autoPlay
                      loop
                    />
                  }
                  label="צור קשר עם התמיכה"
                  subtitle="yoav.finplay@gmail.com"
                  onPress={handleContactSupport}
                />
                <Divider />
                <SettingsRow
                  icon={
                    <LottieView
                      source={require("../../../assets/lottie/wired-flat-44-avatar-user-in-circle-hover-looking-around.json")}
                      style={styles.lottieIcon}
                      autoPlay
                      loop
                    />
                  }
                  label="התנתק"
                  onPress={handleSignOut}
                />
                <Divider />
                <SettingsRow
                  isLast
                  icon={
                    <LottieView
                      source={require("../../../assets/lottie/wired-flat-2804-fire-flame-hover-pinch.json")}
                      style={styles.lottieIcon}
                      autoPlay
                      loop
                    />
                  }
                  label="מחק חשבון לצמיתות"
                  subtitle="מוחק את כל הנתונים שלך"
                  onPress={handleDeleteAccount}
                />
              </View>
            </GlowCard>
          </Animated.View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Chat tone picker modal, Stitched Aesthetic */}
        {showChatPicker && (
          <Animated.View entering={FadeInDown} style={styles.modalOverlay}>
            <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowChatPicker(false)} accessibilityRole="button" accessibilityLabel="סגור בחירת סגנון צ׳אט" />
            <GlowCard chapterGlow={STITCH_BLUE.glow} style={styles.modalCard} pressable={false}>
              <View style={styles.modalInner}>
                <Text style={[styles.modalTitle, RTL]}>בחר סגנון צ׳אט</Text>
                <View style={styles.modalOptions}>
                  {(Object.entries(CHAT_STYLE_NAMES) as [CompanionId, string][]).map(([id, label]) => {
                    const isSelected = id === companionId;
                    return (
                      <AnimatedPressable
                        key={id}
                        onPress={() => {
                          updateProfile({ companionId: id });
                          setShowChatPicker(false);
                          tapHaptic();
                        }}
                        style={[
                          styles.chatStyleBtn,
                          isSelected && { backgroundColor: STITCH_BLUE.primary, borderColor: STITCH_BLUE.dim },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={label}
                        accessibilityState={{ selected: isSelected }}
                      >
                        <Text style={[
                          styles.chatStyleText, RTL,
                          isSelected && { color: "#ffffff", fontWeight: "900" },
                        ]}>
                          {label}
                        </Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              </View>
            </GlowCard>
          </Animated.View>
        )}
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
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    zIndex: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e0f2fe',
    justifyContent: "center",
    alignItems: "center",
    ...SHADOW_LIGHT,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    ...SHADOW_STRONG,
  },
  headerSpacer: {
    width: 44,
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
    fontSize: 18,
    fontWeight: "900",
    color: "#0369a1",
    letterSpacing: 0.5,
  },
  cardGlow: {
    borderRadius: 20,
    padding: 0, // Override GlowCard default padding
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
    borderBottomColor: SIM4.cardBorder,
  },
  pressableRow: {
    // handled internally by AnimatedPressable
  },
  rowLeft: {
    flexShrink: 1,
    paddingLeft: 4,
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
  rowSubtitle: {
    fontSize: 13,
    fontWeight: "700",
    color: STITCH_BLUE.textSecondary,
    marginTop: 4,
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
  divider: {
    height: 0, // Handled by row bottom borders
  },
  lottieIcon: {
    width: '100%',
    height: '100%',
  },
  nameInput: {
    fontSize: 16,
    color: STITCH_BLUE.primary,
    fontWeight: "800",
    textAlign: "right",
    writingDirection: "rtl",
    backgroundColor: STITCH_BLUE.dim,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexShrink: 1,
  },
  editBtn: {
    backgroundColor: STITCH_BLUE.dim,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    flexShrink: 1,
  },
  valueText: {
    fontSize: 16,
    color: STITCH_BLUE.primary,
    fontWeight: "800",
    flexShrink: 1,
  },
  avatarPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: STITCH_BLUE.dim,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 12,
  },
  avatarEmoji: {
    fontSize: 22,
  },
  badgeWrapper: {
    backgroundColor: STITCH_BLUE.dim,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    flexShrink: 1,
  },
  badgeText: {
    fontSize: 14,
    color: STITCH_BLUE.primary,
    fontWeight: "800",
    flexShrink: 1,
  },
  bottomSpacer: {
    height: 40,
  },
  /* Modal */
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: 9999,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 24,
  },
  modalInner: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    gap: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: STITCH_BLUE.textPrimary,
    textAlign: "center",
  },
  modalOptions: {
    gap: 12,
  },
  chatStyleBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: STITCH_BLUE.cardBorder,
  },
  chatStyleText: {
    fontSize: 17,
    fontWeight: "800",
    color: STITCH_BLUE.textSecondary,
    textAlign: "center",
  },
});

