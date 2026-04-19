import { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, StyleSheet, Pressable, Modal, Dimensions } from "react-native";
import LottieView from "lottie-react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  FadeIn,
  ZoomIn,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useRetentionStore } from "./useRetentionStore";
import { useEconomyStore } from "../economy/useEconomyStore";
import { tapHaptic, successHaptic, heavyHaptic } from "../../utils/haptics";
import type { Chest, ChestRarity, ChestReward } from "./types";

const INSTANT_OPEN_GEM_COST = 15;

const RARITY_CONFIG: Record<ChestRarity, {
  colors: readonly [string, string];
  glow: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  rewardLabel: string;
}> = {
  common: {
    colors: ["#4b7a5c", "#6b9a7c"],
    glow: "#d4a017",
    label: "רגיל",
    icon: "cube-outline",
    rewardLabel: "תיבה רגילה",
  },
  rare: {
    colors: ["#a85e0a", "#e5a30a"],
    glow: "#facc15",
    label: "נדיר",
    icon: "cube",
    rewardLabel: "תיבה נדירה",
  },
  epic: {
    colors: ["#7c3aed", "#a78bfa"],
    glow: "#c084fc",
    label: "אפי",
    icon: "diamond",
    rewardLabel: "תיבה אפית",
  },
};

function formatTime(ms: number): string {
  if (ms <= 0) return "מוכן!";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function useCountdown(chest: Chest | null): string {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!chest || chest.status !== "unlocking" || !chest.unlockStartedAt) {
      setTimeLeft("");
      return;
    }

    const update = () => {
      const start = new Date(chest.unlockStartedAt!).getTime();
      const unlockMs = chest.unlockTimeMinutes * 60 * 1000;
      const remaining = start + unlockMs - Date.now();
      setTimeLeft(formatTime(Math.max(0, remaining)));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [chest?.status, chest?.unlockStartedAt, chest?.unlockTimeMinutes]);

  return timeLeft;
}

// ── Chest Opening Reward Modal ──

interface ChestRewardModalProps {
  visible: boolean;
  rarity: ChestRarity | null;
  reward: number;
  rewards?: ChestReward;
  streakBonusPercent?: number;
  onDismiss: () => void;
}

const { width: SCREEN_W } = Dimensions.get("window");

type ChestStage = 'static' | 'opening' | 'opened';

export function ChestRewardModal({ visible, rarity, reward, rewards, streakBonusPercent, onDismiss }: ChestRewardModalProps) {
  const [stage, setStage] = useState<ChestStage>('static');
  const lottieRef = useRef<LottieView>(null);
  const glowScale = useSharedValue(1);

  // Auto-open: skip static stage, play animation immediately when modal appears
  useEffect(() => {
    if (visible && rarity) {
      setStage('opening');
      heavyHaptic();
      // Small delay so Lottie is mounted before play()
      setTimeout(() => lottieRef.current?.play(), 50);
    } else {
      cancelAnimation(glowScale);
      glowScale.value = 1;
    }
  }, [visible, rarity]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
  }));

  const handleAnimationFinish = useCallback(() => {
    setStage('opened');
    successHaptic();
    setTimeout(() => successHaptic(), 300);
  }, []);

  if (!visible || !rarity) return null;
  const config = RARITY_CONFIG[rarity];

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onDismiss} accessibilityViewIsModal>
      <Pressable style={modalStyles.backdrop} onPress={onDismiss}>

        {/* Confetti, only after opened */}
        {stage === 'opened' && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
            <LottieView
              source={require("../../../assets/lottie/Confetti.json")}
              style={{ flex: 1 }}
              autoPlay
              loop={false}
            />
          </View>
        )}

        {/* Glow */}
        <Animated.View style={[modalStyles.glowUnderlay, { backgroundColor: config.glow + "33" }, glowStyle]} />

        <Animated.View entering={ZoomIn.springify().damping(14).stiffness(180)} style={[modalStyles.card, { borderColor: config.glow + "80", shadowColor: config.glow }]}>
          <LinearGradient
            colors={["#0d0d1a", config.colors[0] + "cc", config.colors[1] + "99"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={modalStyles.gradient}
          >
            {/* Treasure Box Lottie */}
            <LottieView
              ref={lottieRef}
              source={require("../../../assets/lottie/3D Treasure Box.json")}
              style={{ width: 160, height: 160, marginBottom: -12 }}
              autoPlay={false}
              loop={false}
              speed={1.8}
              progress={stage === 'static' ? 0 : undefined}
              onAnimationFinish={handleAnimationFinish}
            />

            {/* Stage: opened, rewards */}
            {stage === 'opened' && (
              <>

                <Animated.View entering={ZoomIn.springify().delay(150)} style={modalStyles.rewardPill}>
                  <LottieView source={require("../../../assets/lottie/Money.json")} style={{ width: 36, height: 36 }} autoPlay loop />
                  <Text style={modalStyles.rewardText}>+{rewards ? rewards.coins : reward}</Text>
                  <Text style={modalStyles.rewardLabel}>מטבעות</Text>
                </Animated.View>

                {rewards && rewards.xp > 0 && (
                  <Animated.View entering={ZoomIn.springify().delay(300)} style={[modalStyles.rewardPill, { borderColor: "rgba(56,189,248,0.4)" }]}>
                    <LottieView source={require("../../../assets/lottie/wired-flat-2431-number-5-hover-pinch.json")} style={{ width: 36, height: 36 }} autoPlay loop />
                    <Text style={[modalStyles.rewardText, { color: "#38bdf8" }]}>+{rewards.xp}</Text>
                    <Text style={[modalStyles.rewardLabel, { color: "#7dd3fc" }]}>XP</Text>
                  </Animated.View>
                )}

                {rewards && rewards.gems > 0 && (
                  <Animated.View entering={ZoomIn.springify().delay(450)} style={[modalStyles.rewardPill, { borderColor: "rgba(56,189,248,0.4)" }]}>
                    <LottieView source={require("../../../assets/lottie/Diamond.json")} style={{ width: 36, height: 36 }} autoPlay loop />
                    <Text style={[modalStyles.rewardText, { color: "#38bdf8" }]}>+{rewards.gems}</Text>
                    <Text style={[modalStyles.rewardLabel, { color: "#7dd3fc" }]}>יהלומים</Text>
                  </Animated.View>
                )}

                {streakBonusPercent != null && streakBonusPercent > 0 && (
                  <Animated.View entering={ZoomIn.springify().delay(600)} style={modalStyles.streakBonusBadge}>
                    <Ionicons name="flame" size={16} color="#f97316" />
                    <Text style={modalStyles.streakBonusText}>Streak Bonus +{streakBonusPercent}%</Text>
                    <Ionicons name="flame" size={16} color="#f97316" />
                  </Animated.View>
                )}

                <Animated.Text entering={FadeIn.delay(800)} style={modalStyles.tapHint}>
                  לחץ לסגור
                </Animated.Text>
              </>
            )}
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: Math.min(SCREEN_W - 48, 340),
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 2,
    shadowOpacity: 0.9,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
    elevation: 24,
  },
  glowUnderlay: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    shadowRadius: 60,
    shadowOpacity: 1,
    elevation: 0,
  },
  gradient: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 32,
    paddingHorizontal: 24,
    gap: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#ffffff",
    textAlign: "center",
    textShadowColor: "rgba(212,160,23,0.7)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  rewardPill: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: "rgba(250,204,21,0.35)",
    width: "100%" as const,
  },
  rewardText: {
    fontSize: 30,
    fontWeight: "900",
    color: "#facc15",
    flex: 1,
    textAlign: "center",
  },
  rewardLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fde68a",
  },
  streakBonusBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    backgroundColor: "rgba(249,115,22,0.15)",
    borderWidth: 1,
    borderColor: "rgba(249,115,22,0.4)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  streakBonusText: {
    fontSize: 14,
    fontWeight: "800" as const,
    color: "#fb923c",
  },
  tapHint: {
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    marginTop: 4,
  },
  openBtn: {
    marginTop: 8,
    borderRadius: 16,
    overflow: "hidden" as const,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    elevation: 8,
  },
  openBtnGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    paddingHorizontal: 36,
    paddingVertical: 14,
  },
  openBtnText: {
    fontSize: 18,
    fontWeight: "900" as const,
    color: "#ffffff",
    letterSpacing: 1,
  },
});

// ── Chest Slot ──

function ChestSlot({
  chest,
  onOpen,
  onGemOpen,
}: {
  chest: Chest | null;
  onOpen: (chestId: string, rarity: ChestRarity) => void;
  onGemOpen: (chestId: string, rarity: ChestRarity) => void;
}) {
  const countdown = useCountdown(chest);
  const startUnlocking = useRetentionStore((s) => s.startUnlockingChest);

  const handlePress = useCallback(() => {
    if (!chest) return;
    if (chest.status === "locked") {
      tapHaptic();
      startUnlocking(chest.id);
    } else if (chest.status === "unlocking") {
      tapHaptic();
      onGemOpen(chest.id, chest.rarity);
    } else if (chest.status === "ready") {
      heavyHaptic();
      onOpen(chest.id, chest.rarity);
    }
  }, [chest, startUnlocking, onOpen, onGemOpen]);

  if (!chest) {
    return (
      <View style={styles.slot}>
        <View style={styles.emptySlot}>
          <Ionicons name="add-circle-outline" size={28} color="#52525b" />
          <Text style={styles.emptyLabel}>ריק</Text>
        </View>
      </View>
    );
  }

  const config = RARITY_CONFIG[chest.rarity];
  const isReady = chest.status === "ready";

  const pulseScale = useSharedValue(1);
  const glowAnim = useSharedValue(0.3);

  useEffect(() => {
    if (isReady) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 700 }),
          withTiming(1, { duration: 700 }),
        ),
        -1,
        true,
      );
      glowAnim.value = withRepeat(
        withSequence(
          withTiming(0.9, { duration: 700 }),
          withTiming(0.3, { duration: 700 }),
        ),
        -1,
        true,
      );
    }
    return () => {
      cancelAnimation(pulseScale);
      cancelAnimation(glowAnim);
    };
  }, [isReady]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: isReady ? glowAnim.value : 0.3,
  }));

  return (
    <View style={styles.slot}>
      <Pressable onPress={handlePress}>
        <Animated.View style={[pulseStyle, glowStyle, { shadowColor: config.glow, shadowRadius: isReady ? 14 : 6, shadowOffset: { width: 0, height: 0 }, elevation: isReady ? 12 : 6 }]}>
          <LinearGradient
            colors={config.colors as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.chestSlot, { borderWidth: 1.5, borderColor: config.glow + "40" }]}
          >
            {isReady && (
              <View style={[styles.readyGlow, { backgroundColor: config.glow + "20" }]} />
            )}

            <Ionicons
              name={config.icon}
              size={30}
              color={isReady ? "#ffffff" : config.glow}
            />

            <Text style={styles.chestName} numberOfLines={1}>
              {config.label}
            </Text>

            {chest.status === "locked" && (
              <View style={[styles.statusBadge, { backgroundColor: "rgba(212,160,23,0.15)", borderWidth: 1, borderColor: "rgba(212,160,23,0.3)" }]}>
                <Ionicons name="lock-closed" size={10} color="#d4a017" />
                <Text style={[styles.statusText, { color: "#d4a017" }]}>לחץ לפתוח</Text>
              </View>
            )}
            {chest.status === "unlocking" && countdown !== "" && (
              <View style={{ alignItems: "center", gap: 3 }}>
                <View style={[styles.statusBadge, { backgroundColor: "#854d0e" }]}>
                  <Ionicons name="time-outline" size={10} color="#facc15" />
                  <Text style={[styles.statusText, { color: "#facc15", fontVariant: ["tabular-nums"] }]}>{countdown}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: "rgba(124,58,237,0.25)", borderWidth: 1, borderColor: "rgba(167,139,250,0.4)" }]}>
                  <Ionicons name="diamond" size={9} color="#a78bfa" />
                  <Text style={[styles.statusText, { color: "#a78bfa", fontSize: 9 }]}>{INSTANT_OPEN_GEM_COST}💎</Text>
                </View>
              </View>
            )}
            {isReady && (
              <View style={[styles.statusBadge, { backgroundColor: "rgba(74,222,128,0.15)", borderWidth: 1, borderColor: "rgba(74,222,128,0.3)" }]}>
                <Ionicons name="sparkles" size={10} color="#4ade80" />
                <Text style={[styles.statusText, { color: "#4ade80" }]}>פתח!</Text>
              </View>
            )}
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </View>
  );
}

// ── ChestsRow ──

// ── Gem Instant-Open Confirmation Modal ──

interface GemConfirmState {
  visible: boolean;
  chestId: string | null;
  rarity: ChestRarity | null;
}

function GemInstantOpenModal({
  state,
  onConfirm,
  onCancel,
}: {
  state: GemConfirmState;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const gems = useEconomyStore((s) => s.gems);
  const canAfford = gems >= INSTANT_OPEN_GEM_COST;

  if (!state.visible || !state.rarity) return null;

  const config = RARITY_CONFIG[state.rarity];

  return (
    <Modal transparent visible={state.visible} animationType="fade" onRequestClose={onCancel} accessibilityViewIsModal>
      <Pressable style={gemModalStyles.backdrop} onPress={onCancel}>
        <Animated.View entering={ZoomIn.springify().damping(14)} style={gemModalStyles.card}>
          <LinearGradient
            colors={["#1a0533", "#2d1b69"]}
            style={gemModalStyles.gradient}
          >
            <Ionicons name={config.icon} size={50} color={config.glow} />
            <Text style={gemModalStyles.title}>פתיחה מיידית</Text>
            <Text style={gemModalStyles.subtitle}>
              לפתוח את התיבה ה{config.label} עכשיו?
            </Text>

            <Pressable
              onPress={canAfford ? onConfirm : () => { onCancel(); router.push('/shop' as never); }}
              style={gemModalStyles.gemButton}
            >
              <Ionicons name="diamond" size={20} color="#a78bfa" />
              <Text style={gemModalStyles.gemButtonText}>
                {canAfford
                  ? `${INSTANT_OPEN_GEM_COST} ג׳מים, פתח!`
                  : `💎 קנה ג׳מס, חסרים ${INSTANT_OPEN_GEM_COST - gems}`}
              </Text>
            </Pressable>

            <Pressable onPress={onCancel} style={gemModalStyles.cancelButton}>
              <Text style={gemModalStyles.cancelText}>ביטול</Text>
            </Pressable>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const gemModalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: 280,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(167,139,250,0.4)",
    shadowColor: "#7c3aed",
    shadowOpacity: 0.6,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 15,
  },
  gradient: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 20,
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#ffffff",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    writingDirection: "rtl",
  },
  gemButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(124,58,237,0.3)",
    borderWidth: 1.5,
    borderColor: "rgba(167,139,250,0.5)",
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  gemButtonDisabled: {
    backgroundColor: "rgba(63,63,70,0.3)",
    borderColor: "rgba(113,113,122,0.3)",
  },
  gemButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#a78bfa",
    writingDirection: "rtl",
  },
  cantAfford: {
    fontSize: 11,
    color: "#ef4444",
    fontWeight: "600",
    writingDirection: "rtl",
  },
  cancelButton: {
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  cancelText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
    fontWeight: "600",
  },
});

// ── ChestsRow ──

export function ChestsRow() {
  const chestSlots = useRetentionStore((s) => s.chestSlots);
  const openReady = useRetentionStore((s) => s.openReadyChest);
  const instantOpenById = useRetentionStore((s) => s.instantOpenChestById);
  const spendGems = useEconomyStore((s) => s.spendGems);

  const [rewardModal, setRewardModal] = useState<{ visible: boolean; rarity: ChestRarity | null; reward: number }>({
    visible: false,
    rarity: null,
    reward: 0,
  });

  const [gemConfirm, setGemConfirm] = useState<GemConfirmState>({
    visible: false,
    chestId: null,
    rarity: null,
  });

  const handleOpenChest = useCallback(
    (chestId: string, rarity: ChestRarity) => {
      const reward = openReady(chestId);
      if (reward > 0) {
        successHaptic();
        setRewardModal({ visible: true, rarity, reward });
      }
    },
    [openReady],
  );

  const handleGemOpenRequest = useCallback(
    (chestId: string, rarity: ChestRarity) => {
      setGemConfirm({ visible: true, chestId, rarity });
    },
    [],
  );

  const handleGemConfirm = useCallback(() => {
    if (!gemConfirm.chestId || !gemConfirm.rarity) return;
    const paid = spendGems(INSTANT_OPEN_GEM_COST);
    if (!paid) return;

    const reward = instantOpenById(gemConfirm.chestId);
    const rarity = gemConfirm.rarity;
    setGemConfirm({ visible: false, chestId: null, rarity: null });

    if (reward > 0) {
      successHaptic();
      setRewardModal({ visible: true, rarity, reward });
    }
  }, [gemConfirm, spendGems, instantOpenById]);

  const handleGemCancel = useCallback(() => {
    setGemConfirm({ visible: false, chestId: null, rarity: null });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>💎 התיבות שלך</Text>
      <View style={styles.row}>
        {chestSlots.map((chest, index) => (
          <ChestSlot
            key={chest?.id ?? `empty-${index}`}
            chest={chest}
            onOpen={handleOpenChest}
            onGemOpen={handleGemOpenRequest}
          />
        ))}
      </View>

      <ChestRewardModal
        visible={rewardModal.visible}
        rarity={rewardModal.rarity}
        reward={rewardModal.reward}
        onDismiss={() => setRewardModal({ visible: false, rarity: null, reward: 0 })}
      />

      <GemInstantOpenModal
        state={gemConfirm}
        onConfirm={handleGemConfirm}
        onCancel={handleGemCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "rgba(0, 40, 20, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(212, 160, 23, 0.3)",
  },
  title: {
    color: "#d4a017",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right" as const,
    marginBottom: 10,
    marginRight: 8,
  },
  row: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    gap: 8,
  },
  slot: {
    flex: 1,
  },
  emptySlot: {
    height: 100,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(212, 160, 23, 0.25)",
    borderStyle: "dashed" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(0, 40, 20, 0.3)",
  },
  emptyLabel: {
    color: "#6b7280",
    fontSize: 10,
    marginTop: 4,
    fontWeight: "600" as const,
  },
  chestSlot: {
    height: 100,
    borderRadius: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 4,
    overflow: "hidden" as const,
  },
  readyGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
  },
  chestName: {
    fontSize: 11,
    fontWeight: "700" as const,
    marginTop: 4,
    color: "#ffffff",
  },
  statusBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 3,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
  },
  statusText: {
    color: "#e4e4e7",
    fontSize: 10,
    fontWeight: "700" as const,
  },
});
