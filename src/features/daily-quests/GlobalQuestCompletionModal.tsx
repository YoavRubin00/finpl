import React, { useEffect, useState, useRef } from "react";
import { Modal, View, Text, StyleSheet, Pressable, Dimensions } from "react-native";
import Animated, { FadeIn, FadeInUp, useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing, cancelAnimation, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { STITCH } from "../../theme/Stitch";
import { Image as ExpoImage } from "expo-image";
import { FINN_DANCING } from "../retention-loops/finnMascotConfig";
import { LottieIcon } from "../../components/ui/LottieIcon";
import { ConfettiExplosion } from "../../components/ui/ConfettiExplosion";
import { FlyingRewards } from "../../components/ui/FlyingRewards";
import { useDailyQuestsStore } from "./useDailyQuestsStore";
import { useEconomyStore } from "../economy/useEconomyStore";
import { previewQuestReward } from "./useDailyQuestsStore";

const LOTTIE_CHEST = require("../../../assets/lottie/3D Treasure Box.json");
const { width } = Dimensions.get("window");

export function GlobalQuestCompletionModal() {
  const insets = useSafeAreaInsets();
  const newlyCompleted = useDailyQuestsStore((s) => s.newlyCompleted);
  const clearNewlyCompleted = useDailyQuestsStore((s) => s.clearNewlyCompleted);
  const rewardClaimed = useDailyQuestsStore((s) => s.rewardClaimed);
  const claimReward = useDailyQuestsStore((s) => s.claimReward);
  const streak = useEconomyStore((s) => s.streak);
  
  const [visible, setVisible] = useState(false);
  const [showClaimAnim, setShowClaimAnim] = useState(false);
  const [chestOpen, setChestOpen] = useState(false);

  useEffect(() => {
    if (newlyCompleted && !rewardClaimed) {
      setVisible(true);
    } else if (!newlyCompleted) {
      setVisible(false);
      setShowClaimAnim(false);
      setChestOpen(false);
    }
  }, [newlyCompleted, rewardClaimed]);

  const handleClaim = () => {
    if (showClaimAnim) return;
    setChestOpen(true);
    setShowClaimAnim(true);
    setTimeout(() => {
      claimReward();
      setTimeout(() => {
        setVisible(false);
        clearNewlyCompleted();
      }, 4000); // give time for flying coins and confetti
    }, 400);
  };

  const handleClose = () => {
    setVisible(false);
    clearNewlyCompleted(); // Dismiss it so it doesn't pop again, user can claim via normal sheet
  };

  const preview = previewQuestReward(streak);

  const reduceMotion = useReducedMotion();
  const chestPulse = useSharedValue(1);
  const chestGlowScale = useSharedValue(1);
  const chestGlowOpacity = useSharedValue(0.4);

  useEffect(() => {
    if (!visible || showClaimAnim || reduceMotion) {
      cancelAnimation(chestPulse);
      cancelAnimation(chestGlowScale);
      cancelAnimation(chestGlowOpacity);
      chestPulse.value = 1;
      chestGlowScale.value = 1;
      chestGlowOpacity.value = 0;
      return;
    }
    chestPulse.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 800, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.98, { duration: 800, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    chestGlowScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 800, easing: Easing.inOut(Easing.quad) }),
        withTiming(1.0, { duration: 800, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    chestGlowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [visible, showClaimAnim, reduceMotion]);

  const chestPulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: chestPulse.value }] }));
  const chestGlowStyle = useAnimatedStyle(() => ({
    opacity: chestGlowOpacity.value,
    transform: [{ scale: chestGlowScale.value }],
  }));

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Animated.View entering={FadeInUp.duration(400).springify()} style={[styles.card, { paddingBottom: Math.max(30, insets.bottom + 20) }]}>
          <Pressable style={styles.closeBtn} onPress={handleClose} accessibilityRole="button">
            <Text style={styles.closeText}>✕</Text>
          </Pressable>

          {/* Dancing Shark */}
          <ExpoImage source={FINN_DANCING} style={styles.shark} contentFit="contain" />
          
          <Text style={styles.title}>סיימת את המשימות היומיות!</Text>
          <Text style={styles.subtitle}>כל הכבוד. התיבה שלך מוכנה לפתיחה.</Text>

          {/* Chest */}
          <View style={styles.chestContainer}>
             <Animated.View pointerEvents="none" style={[styles.chestGlowHalo, chestGlowStyle]} />
             <Animated.View style={chestPulseStyle}>
               <Pressable
                 onPress={handleClaim}
                 disabled={showClaimAnim}
                 style={({ pressed }) => [styles.chestWrap, showClaimAnim && { opacity: 0.8 }, pressed && { transform: [{ scale: 0.95 }] }]}
               >
                 <LottieIcon source={LOTTIE_CHEST as unknown as number} size={160} autoPlay={false} active={chestOpen} loop={false} />
               </Pressable>
             </Animated.View>
          </View>

          <Text style={styles.tapHint}>לחצו על התיבה כדי לפתוח</Text>

          {showClaimAnim && (
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <ConfettiExplosion />
              <FlyingRewards type="xp" amount={preview.xp} onComplete={() => {}} />
              <FlyingRewards type="coins" amount={preview.coins} onComplete={() => {}} />
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: STITCH.surfaceLowest,
    borderRadius: 28,
    paddingTop: 40,
    paddingHorizontal: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    left: 16,
    padding: 8,
  },
  closeText: {
    fontSize: 22,
    color: STITCH.onSurfaceVariant,
    fontWeight: "700",
  },
  shark: {
    width: 140,
    height: 140,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: STITCH.onSurface,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: STITCH.onSurfaceVariant,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  chestContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
    width: 180,
    height: 180,
  },
  chestGlowHalo: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: STITCH.primaryCyan,
  },
  chestWrap: {
    padding: 10,
  },
  tapHint: {
    fontSize: 14,
    fontWeight: "800",
    color: STITCH.primaryCyan,
    marginTop: 20,
  },
});
