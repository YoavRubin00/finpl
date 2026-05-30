import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  PanResponder,
  Platform,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import LottieView from "lottie-react-native";
import { AnimatedPressable } from "../../../components/ui/AnimatedPressable";
import { ConfettiExplosion } from "../../../components/ui/ConfettiExplosion";
import { GoldCoinIcon } from "../../../components/ui/GoldCoinIcon";
import { FINN_HAPPY } from "../../retention-loops/finnMascotConfig";
import { SPRING_BOUNCY, SPRING_SMOOTH } from "../../../utils/animations";
import {
  tapHaptic,
  successHaptic,
  errorHaptic,
  heavyHaptic,
  doubleHeavyHaptic,
} from "../../../utils/haptics";
import type {
  GamePhase,
  Merchant,
  BarterItem,
} from "./barterPuzzleData";
import {
  TARGET_MERCHANT,
  SWAP_MERCHANTS,
  STARTING_ITEM,
  COIN_ITEM,
  FINN_COMMENT,
  INSIGHT_TEXT,
} from "./barterPuzzleData";

const { width: SW } = Dimensions.get("window");
const RTL = { writingDirection: "rtl" as const, textAlign: "right" as const };
const RTL_CENTER = { writingDirection: "rtl" as const, textAlign: "center" as const };

const COIN_LOTTIE = require("../../../../assets/lottie/wired-flat-298-coins-hover-jump.json");

// ─── Helpers ────────────────────────────────────────────────────────────────

function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

// ─── Main Screen ────────────────────────────────────────────────────────────

export function BarterPuzzleScreen({
  onComplete,
}: {
  onComplete: (score: number) => void;
}) {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [heldItem, setHeldItem] = useState<BarterItem>(STARTING_ITEM);
  const [speech, setSpeech] = useState<string>("");
  const [speechKey, setSpeechKey] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [coinAccepted, setCoinAccepted] = useState<Set<string>>(new Set());

  // Merchant slot positions (measured via onLayout)
  const merchantPositions = useRef<Record<string, { x: number; y: number }>>({});

  // ── Phase transitions ──

  const startGame = useCallback(() => {
    tapHaptic();
    setPhase("reject");
  }, []);

  const handleReject = useCallback(() => {
    errorHaptic();
    setSpeech(TARGET_MERCHANT.rejectLine);
    setSpeechKey((k) => k + 1);
    // Skip the chicken→François barter swap (Yoav 2026-05-27 — the rejection
    // scene is enough to demonstrate the friction of barter). Go straight to
    // the coin reveal so users don't have to drag through an extra step.
    setTimeout(() => {
      setSpeech("");
      setPhase("coinDrop");
    }, 1200);
  }, []);

  const handleSwap1 = useCallback(() => {
    successHaptic();
    setSpeech(SWAP_MERCHANTS[0].acceptLine);
    setSpeechKey((k) => k + 1);
    setHeldItem({ emoji: SWAP_MERCHANTS[0].gives, label: SWAP_MERCHANTS[0].givesLabel });
    setShowHint(false);
    // Skip swap2+payDebt → go straight to coin phase after one barter trade
    setTimeout(() => {
      setSpeech("");
      setPhase("coinDrop");
    }, 1200);
  }, []);

  const handleSwap2 = useCallback(() => {
    successHaptic();
    setSpeech(SWAP_MERCHANTS[1].acceptLine);
    setSpeechKey((k) => k + 1);
    setHeldItem({ emoji: SWAP_MERCHANTS[1].gives, label: SWAP_MERCHANTS[1].givesLabel });
    setTimeout(() => {
      setPhase("payDebt");
      setSpeech("");
    }, 800);
  }, []);

  const handlePayDebt = useCallback(() => {
    successHaptic();
    setSpeech(TARGET_MERCHANT.acceptLine);
    setSpeechKey((k) => k + 1);
    setTimeout(() => setPhase("coinDrop"), 1500);
  }, []);

  const handleCoinDrop = useCallback(() => {
    heavyHaptic();
    setHeldItem(COIN_ITEM);
    setPhase("moneyPhase");
    setSpeech("");
  }, []);

  const handleCoinAccept = useCallback(
    (merchantId: string) => {
      successHaptic();
      setCoinAccepted((prev) => {
        const next = new Set(prev);
        next.add(merchantId);
        if (next.size >= 2) {
          setTimeout(() => {
            doubleHeavyHaptic();
            setShowConfetti(true);
            setTimeout(() => setPhase("insight"), 600);
          }, 400);
        }
        return next;
      });
    },
    [],
  );

  const handleFinish = useCallback(() => {
    tapHaptic();
    onComplete(100);
  }, [onComplete]);

  // ── Drop handler ──

  const handleDrop = useCallback(
    (x: number, y: number) => {
      // Find closest merchant within 120px
      let closestId = "";
      let closestDist = 120;
      for (const [id, pos] of Object.entries(merchantPositions.current)) {
        const d = distance(x, y, pos.x, pos.y);
        if (d < closestDist) {
          closestDist = d;
          closestId = id;
        }
      }
      if (!closestId) return false;

      if (phase === "moneyPhase") {
        if (!coinAccepted.has(closestId)) {
          handleCoinAccept(closestId);
          return true;
        }
        return false;
      }

      if (phase === "reject" && closestId === "abu-hasan") {
        handleReject();
        return false; // spring back
      }
      if (phase === "swap1" && closestId === "francois") {
        handleSwap1();
        return true;
      }
      if (phase === "swap2" && closestId === "yossi") {
        handleSwap2();
        return true;
      }
      if (phase === "payDebt" && closestId === "abu-hasan") {
        handlePayDebt();
        return true;
      }

      return false;
    },
    [phase, coinAccepted, handleReject, handleSwap1, handleSwap2, handlePayDebt, handleCoinAccept],
  );

  // ── Render ──

  if (phase === "intro") {
    return <IntroCard onStart={startGame} />;
  }

  if (phase === "insight") {
    return (
      <View style={styles.container}>
        {showConfetti && <ConfettiExplosion onComplete={() => setShowConfetti(false)} />}
        <InsightCard onFinish={handleFinish} />
      </View>
    );
  }

  if (phase === "coinDrop") {
    return (
      <View style={styles.container}>
        <FinnBubble text={FINN_COMMENT} />
        <CoinDropAuto onComplete={handleCoinDrop} />
      </View>
    );
  }

  // Active game phases: reject, swap1, swap2, payDebt, moneyPhase
  // Clear stale positions, only visible merchants should have registered positions
  const visibleMerchantIds = new Set<string>();
  const visibleMerchants: Merchant[] = [];
  if (phase === "reject" || phase === "payDebt" || phase === "moneyPhase") {
    visibleMerchants.push(TARGET_MERCHANT);
    visibleMerchantIds.add(TARGET_MERCHANT.id);
  }
  if (phase === "swap1" || phase === "moneyPhase") {
    visibleMerchants.push(SWAP_MERCHANTS[0]);
    visibleMerchantIds.add(SWAP_MERCHANTS[0].id);
  }
  if (phase === "swap2") {
    visibleMerchants.push(SWAP_MERCHANTS[1]);
    visibleMerchantIds.add(SWAP_MERCHANTS[1].id);
  }
  // Remove stale positions of merchants that are no longer visible
  for (const id of Object.keys(merchantPositions.current)) {
    if (!visibleMerchantIds.has(id)) {
      delete merchantPositions.current[id];
    }
  }
  // In moneyPhase show all
  if (phase === "moneyPhase" && !visibleMerchants.find((m) => m.id === TARGET_MERCHANT.id)) {
    visibleMerchants.unshift(TARGET_MERCHANT);
  }

  const inMoneyPhaseTitle = phase === "moneyPhase";
  const phaseTitle =
    inMoneyPhaseTitle
      ? "גרור את המטבע לכל סוחר"
      : phase === "payDebt"
        ? "עכשיו תן לאבו-חסן את הדגים!"
        : "גרור את הפריט לסוחר הנכון";

  return (
    <View style={styles.container}>
      {showConfetti && <ConfettiExplosion onComplete={() => setShowConfetti(false)} />}

      {/* Title — render the gold-coin icon (same as the wallet header) as a sibling
          rather than an emoji, so the visual matches the app's currency icon and
          doesn't depend on the device's emoji font (🪙 falls back to a moon glyph
          on older OS fonts). */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.phaseTitleRow}>
        <Text style={styles.phaseTitle}>{phaseTitle}</Text>
        {inMoneyPhaseTitle && <GoldCoinIcon size={20} />}
      </Animated.View>

      {/* Merchants */}
      <View style={styles.merchantsRow}>
        {visibleMerchants.map((m) => (
          <MerchantSlot
            key={m.id}
            merchant={m}
            accepted={coinAccepted.has(m.id)}
            inMoneyPhase={phase === "moneyPhase"}
            onLayout={(x, y) => {
              merchantPositions.current[m.id] = { x, y };
            }}
          />
        ))}
      </View>

      {/* Speech bubble */}
      {speech !== "" && (
        <Animated.View
          key={`speech-${speechKey}`}
          entering={ZoomIn.duration(250)}
          style={styles.speechBubble}
        >
          <Text style={styles.speechText}>{speech}</Text>
        </Animated.View>
      )}

      {/* Hint */}
      {showHint && (
        <Animated.Text entering={FadeInDown.delay(300).duration(400)} style={styles.hintText}>
          אולי מישהו אחר כן רוצה {heldItem.label}? 🤔
        </Animated.Text>
      )}

      {/* Draggable item */}
      <View style={styles.itemArea}>
        <DraggableItem item={heldItem} onDrop={handleDrop} isCoin={phase === "moneyPhase"} />
      </View>
    </View>
  );
}

// ─── IntroCard ──────────────────────────────────────────────────────────────

function IntroCard({ onStart }: { onStart: () => void }) {
  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.springify().damping(14)} style={styles.introCard}>
        <Text style={styles.introEmoji}>🐔</Text>
        <Text style={styles.introTitle}>אתגר סחר חליפין</Text>
        <Text style={styles.introBody}>
          אתה חייב לאבו-חסן 🧔 דגים 🐟{"\n"}
          אבל יש לך רק תרנגולת 🐔{"\n"}
          מצא דרך לשלם!
        </Text>
        <AnimatedPressable
          onPress={onStart}
          style={styles.startBtn}
          accessibilityRole="button"
          accessibilityLabel="התחל אתגר סחר חליפין"
        >
          <Text style={styles.startBtnText}>יאללה בוא נפתור</Text>
        </AnimatedPressable>
      </Animated.View>
    </View>
  );
}

// ─── MerchantSlot ───────────────────────────────────────────────────────────

function MerchantSlot({
  merchant,
  accepted,
  inMoneyPhase,
  onLayout,
}: {
  merchant: Merchant;
  accepted: boolean;
  inMoneyPhase: boolean;
  onLayout: (x: number, y: number) => void;
}) {
  const viewRef = useRef<View>(null);

  const measureLayout = useCallback(() => {
    if (viewRef.current) {
      viewRef.current.measureInWindow((x, y, w, h) => {
        onLayout(x + w / 2, y + h / 2);
      });
    }
  }, [onLayout]);

  // Re-measure after entry animation settles (spring takes ~400ms)
  useEffect(() => {
    const timer = setTimeout(measureLayout, 500);
    return () => clearTimeout(timer);
  }, [measureLayout]);

  return (
    <Animated.View entering={FadeInDown.springify().damping(14)}>
      <View
        ref={viewRef}
        onLayout={measureLayout}
        style={[styles.merchantCard, accepted && styles.merchantAccepted]}
      >
        <Text style={styles.merchantEmoji}>{merchant.emoji}</Text>
        <Text style={styles.merchantName}>{merchant.name}</Text>
        {!accepted ? (
          <View style={styles.wantsBadge}>
            {inMoneyPhase ? (
              <View style={styles.wantsRow}>
                <Text style={styles.wantsText}>רוצה</Text>
                <GoldCoinIcon size={14} />
              </View>
            ) : (
              <Text style={styles.wantsText}>רוצה {merchant.wants}</Text>
            )}
          </View>
        ) : (
          <Animated.View entering={ZoomIn.duration(300)} style={styles.checkBadge}>
            <Text style={styles.checkText}>✅</Text>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}

// ─── DraggableItem ──────────────────────────────────────────────────────────

function DraggableItem({
  item,
  onDrop,
  isCoin,
}: {
  item: BarterItem;
  onDrop: (x: number, y: number) => boolean;
  isCoin: boolean;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  // Keep a ref to the latest onDrop so PanResponder always uses the current phase
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        scale.value = withSpring(1.1, SPRING_SMOOTH);
      },
      onPanResponderMove: (_, gesture) => {
        translateX.value = gesture.dx;
        translateY.value = gesture.dy;
      },
      onPanResponderRelease: (_, gesture) => {
        const dropX = gesture.moveX;
        const dropY = gesture.moveY;
        const accepted = onDropRef.current(dropX, dropY);
        if (!accepted) {
          translateX.value = withSpring(0, SPRING_SMOOTH);
          translateY.value = withSpring(0, SPRING_SMOOTH);
        } else {
          translateX.value = withSpring(0, SPRING_SMOOTH);
          translateY.value = withSpring(0, SPRING_SMOOTH);
        }
        scale.value = withSpring(1, SPRING_SMOOTH);
      },
    }),
  ).current;

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // Coin glow
  const coinGlow = useSharedValue(0.4);
  useEffect(() => {
    if (isCoin) {
      coinGlow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    }
    return () => cancelAnimation(coinGlow);
  }, [isCoin]);

  const coinGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: isCoin ? coinGlow.value : 0,
  }));

  return (
    <Animated.View
      entering={ZoomIn.springify()}
      style={[styles.draggableWrap, animStyle, coinGlowStyle]}
      accessibilityRole="button"
      accessibilityLabel={`גרור ${item.label} לסוחר`}
      accessibilityHint="גרור את הפריט אל הסוחר שרוצה אותו"
      {...panResponder.panHandlers}
    >
      {isCoin && Platform.OS !== "web" ? (
        <LottieView
          source={COIN_LOTTIE}
          style={{ width: 64, height: 64 }}
          autoPlay
          loop
        />
      ) : (
        <Text style={styles.itemEmoji}>{item.emoji}</Text>
      )}
      <Text style={styles.itemLabel}>{item.label}</Text>
      <Text style={styles.dragHint}>☝️ גרור</Text>
    </Animated.View>
  );
}

// ─── CoinDropAuto ──────────────────────────────────────────────────────────
// Auto-progressive coin reveal — no explicit "קבל מטבעות" button. The coin
// drops from above with a spring, the user sees + hears it land (heavy
// haptic), then it transitions itself to the moneyPhase where the draggable
// coin appears. Removes friction: the user proved they completed the barter
// puzzle, no reason to ask them to tap again to claim the reward.

const COIN_DROP_TOTAL_MS = 1700;
const COIN_FLY_OUT_DELAY_MS = 1100;

function CoinDropAuto({ onComplete }: { onComplete: () => void }) {
  const coinY = useSharedValue(-260);
  const coinScale = useSharedValue(0.4);
  const coinOpacity = useSharedValue(0);

  useEffect(() => {
    // Stage 1 (0ms): coin falls from above into the visible "you got coins" spot.
    coinOpacity.value = withTiming(1, { duration: 220 });
    coinY.value = withSpring(0, SPRING_BOUNCY);
    coinScale.value = withSpring(1, SPRING_BOUNCY);

    // Stage 2 (1100ms): fly toward the bottom-of-screen draggable position
    // (the spot where the coin will appear in moneyPhase). Then fade.
    const flyOut = setTimeout(() => {
      try { heavyHaptic(); } catch { /* haptics optional */ }
      coinY.value = withTiming(220, { duration: 480, easing: Easing.in(Easing.cubic) });
      coinScale.value = withTiming(0.7, { duration: 480 });
      coinOpacity.value = withTiming(0, { duration: 420 });
    }, COIN_FLY_OUT_DELAY_MS);

    // Stage 3 (1700ms): hand off to moneyPhase — the coin now reappears in
    // the screen as the draggable item, completing the visual continuity.
    const handoff = setTimeout(() => {
      onComplete();
    }, COIN_DROP_TOTAL_MS);

    return () => {
      clearTimeout(flyOut);
      clearTimeout(handoff);
    };
  }, []);

  const coinStyle = useAnimatedStyle(() => ({
    opacity: coinOpacity.value,
    transform: [{ translateY: coinY.value }, { scale: coinScale.value }],
  }));

  return (
    <Animated.View
      style={[styles.coinDropWrap, coinStyle]}
      accessibilityLiveRegion="polite"
      accessibilityLabel="קיבלת מטבעות"
    >
      <LottieView
        source={COIN_LOTTIE}
        autoPlay
        loop
        style={{ width: 140, height: 140 }}
      />
    </Animated.View>
  );
}

// ─── FinnBubble ─────────────────────────────────────────────────────────────

function FinnBubble({ text }: { text: string }) {
  return (
    <Animated.View entering={FadeInUp.delay(200).duration(400)} style={styles.finnWrap}>
      <ExpoImage
        source={FINN_HAPPY}
        accessible={false}
        style={{ width: 80, height: 80 }}
        contentFit="contain"
      />
      <View style={styles.finnBubble}>
        <Text style={styles.finnText}>{text}</Text>
      </View>
    </Animated.View>
  );
}

// ─── InsightCard ────────────────────────────────────────────────────────────

function InsightCard({ onFinish }: { onFinish: () => void }) {
  return (
    <Animated.View entering={FadeInDown.springify().damping(14)} style={styles.insightCard}>
      <ExpoImage
        source={FINN_HAPPY}
        accessible={false}
        style={{ width: 90, height: 90, alignSelf: "center", marginBottom: 12 }}
        contentFit="contain"
      />
      <Text style={styles.insightTitle}>💡 התובנה</Text>
      <Text style={styles.insightBody}>{INSIGHT_TEXT}</Text>
      <AnimatedPressable
        onPress={onFinish}
        style={styles.continueBtn}
        accessibilityRole="button"
        accessibilityLabel="המשך לשיעור"
      >
        <Text style={styles.continueBtnText}>המשך</Text>
      </AnimatedPressable>
    </Animated.View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fef9ef",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  // Phase title
  phaseTitleRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 24,
  },
  phaseTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#92400e",
    ...RTL_CENTER,
  },

  // Merchants row
  merchantsRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
    marginBottom: 20,
  },
  merchantCard: {
    width: 100,
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  merchantAccepted: {
    borderColor: "#4ade80",
    backgroundColor: "#f0fdf4",
  },
  merchantEmoji: {
    fontSize: 40,
    marginBottom: 4,
  },
  merchantName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#374151",
    marginBottom: 6,
    ...RTL,
  },
  wantsBadge: {
    backgroundColor: "#fef3c7",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  wantsRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
  },
  wantsText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#92400e",
    ...RTL,
  },
  checkBadge: {
    marginTop: 2,
  },
  checkText: {
    fontSize: 22,
  },

  // Speech bubble
  speechBubble: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#fbbf24",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginVertical: 12,
    maxWidth: SW * 0.8,
    shadowColor: "#fbbf24",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  speechText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#78350f",
    ...RTL_CENTER,
  },

  // Hint
  hintText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#57534e",
    ...RTL_CENTER,
    marginBottom: 8,
  },

  // Item area
  itemArea: {
    marginTop: "auto",
    paddingBottom: 20,
    alignItems: "center",
  },
  draggableWrap: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderWidth: 2,
    borderColor: "#d97706",
    shadowColor: "#d97706",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  itemEmoji: {
    fontSize: 56,
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: "#92400e",
    marginTop: 4,
    ...RTL,
  },
  dragHint: {
    fontSize: 12,
    color: "#78716c",
    marginTop: 6,
    fontWeight: "600",
  },

  // Intro card
  introCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    maxWidth: SW * 0.85,
  },
  introEmoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#78350f",
    marginBottom: 14,
    ...RTL,
  },
  introBody: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6b7280",
    ...RTL_CENTER,
    lineHeight: 26,
    marginBottom: 24,
  },
  startBtn: {
    backgroundColor: "#f59e0b",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 36,
  },
  startBtnText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#fff",
  },

  // Coin drop
  coinDropWrap: {
    marginTop: 40,
    shadowColor: "#f59e0b",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    elevation: 10,
  },
  coinDropBtn: {
    backgroundColor: "#f59e0b",
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderWidth: 2,
    borderColor: "#d97706",
  },
  coinDropText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#fff",
    textAlign: "center",
  },

  // Finn bubble
  finnWrap: {
    alignItems: "center",
    marginBottom: 20,
  },
  finnBubble: {
    backgroundColor: "#eff6ff",
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: "#93c5fd",
    maxWidth: SW * 0.8,
  },
  finnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e40af",
    ...RTL_CENTER,
  },

  // Insight card
  insightCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
    maxWidth: SW * 0.85,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  insightTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#78350f",
    ...RTL_CENTER,
    marginBottom: 12,
  },
  insightBody: {
    fontSize: 17,
    fontWeight: "600",
    color: "#6b7280",
    ...RTL_CENTER,
    lineHeight: 28,
    marginBottom: 24,
  },
  continueBtn: {
    backgroundColor: "#16a34a",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  continueBtnText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#fff",
  },
});
