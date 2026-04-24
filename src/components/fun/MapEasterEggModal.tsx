import React, { useRef, useState, useCallback, useEffect } from "react";
import { View, Text, Modal, Pressable, StyleSheet, PanResponder, Dimensions } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Animated, { FadeIn, ZoomIn, FadeInDown } from "react-native-reanimated";
import { FINN_HAPPY } from "../../features/retention-loops/finnMascotConfig";
import { GoldCoinIcon } from "../ui/GoldCoinIcon";
import { tapHaptic } from "../../utils/haptics";

const SCREEN_W = Dimensions.get("window").width;
const CARD_W = SCREEN_W - 64;
const CARD_H = 300;
const CELL_SIZE = 28;
const COLS = Math.ceil(CARD_W / CELL_SIZE);
const ROWS = Math.ceil(CARD_H / CELL_SIZE);
const TOTAL_CELLS = COLS * ROWS;
const REVEAL_THRESHOLD = 0.4; // 40% scratched → auto-reveal

// Hidden treasure image (CDN-served, rare-use modal)
const TREASURE_IMAGE = { uri: "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/images/games/scratch_card_reward.png" };

interface MapEasterEggModalProps {
  visible: boolean;
  onClose: () => void;
  onClaim: () => void;
}

export function MapEasterEggModal({ visible, onClose, onClaim }: MapEasterEggModalProps) {
  const [scratched, setScratched] = useState<Set<number>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const layoutRef = useRef({ x: 0, y: 0 });
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  const handleScratch = useCallback((pageX: number, pageY: number) => {
    const localX = pageX - layoutRef.current.x;
    const localY = pageY - layoutRef.current.y;
    const col = Math.floor(localX / CELL_SIZE);
    const row = Math.floor(localY / CELL_SIZE);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;

    const idx = row * COLS + col;
    setScratched((prev) => {
      const next = new Set(prev);
      // Scratch a 3x3 area for thicker scratching
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = row + dr;
          const nc = col + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
            next.add(nr * COLS + nc);
          }
        }
      }
      // Auto-reveal when threshold reached
      if (next.size / TOTAL_CELLS >= REVEAL_THRESHOLD && !revealed) {
        setRevealed(true);
        tapHaptic();
      }
      return next;
    });
  }, [revealed]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => handleScratch(e.nativeEvent.pageX, e.nativeEvent.pageY),
      onPanResponderMove: (e) => handleScratch(e.nativeEvent.pageX, e.nativeEvent.pageY),
    })
  ).current;

  const handleClaim = useCallback(() => {
    tapHaptic();
    setClaimed(true);
    onClaim();
    closeTimerRef.current = setTimeout(onClose, 800);
  }, [onClaim, onClose]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(300)} style={styles.overlay}>
        <Animated.View entering={ZoomIn.duration(260)} style={styles.card}>
          {/* Finn */}
          <ExpoImage source={FINN_HAPPY} accessible={false} style={{ width: 80, height: 80, alignSelf: "center" }} contentFit="contain" />

          <Text style={styles.title}>מצאת הפתעה!</Text>
          <Text style={styles.subtitle}>גרד עם האצבע כדי לחשוף את הפרס</Text>

          {/* Scratch area */}
          <View
            style={styles.scratchArea}
            onLayout={(e) => {
              e.target.measureInWindow((x: number, y: number) => {
                layoutRef.current = { x, y };
              });
            }}
            {...panResponder.panHandlers}
          >
            {/* Hidden treasure image underneath */}
            <ExpoImage
              source={TREASURE_IMAGE}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />

            {/* Scratch overlay, cells that haven't been scratched */}
            {!revealed && (
              <View style={styles.scratchGrid}>
                {Array.from({ length: TOTAL_CELLS }).map((_, i) => {
                  if (scratched.has(i)) return <View key={i} style={[styles.cell, { backgroundColor: "transparent" }]} />;
                  return (
                    <View
                      key={i}
                      style={[styles.cell, { backgroundColor: "#cbd5e1" }]}
                    />
                  );
                })}
              </View>
            )}

            {/* Hint text on top */}
            {scratched.size === 0 && !revealed && (
              <View style={styles.hintOverlay}>
                <Text style={styles.hintText}>גרד כאן</Text>
                <Text style={{ fontSize: 28 }}>☝️</Text>
              </View>
            )}
          </View>

          {/* Claim button, appears after reveal */}
          {revealed && !claimed && (
            <Animated.View entering={FadeInDown.delay(200).duration(300)}>
              <Pressable
                onPress={handleClaim}
                style={styles.claimBtn}
                accessibilityRole="button"
                accessibilityLabel="קבל פרס: 50 מטבעות"
              >
                <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6 }}>
                  <Text style={styles.claimBtnText}>+50</Text>
                  <GoldCoinIcon size={24} />
                </View>
              </Pressable>
            </Animated.View>
          )}

          {claimed && (
            <Text style={styles.claimedText}>הפרס נאסף!</Text>
          )}

          {/* Close */}
          <Pressable
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="סגור"
          >
            <Text style={styles.closeBtnText}>סגור</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 28,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#0c4a6e",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0f172a",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 4,
    writingDirection: "rtl",
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
    textAlign: "center",
    marginBottom: 16,
    writingDirection: "rtl",
  },
  scratchArea: {
    width: "100%",
    height: CARD_H,
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#f1f5f9",
    marginBottom: 16,
  },
  scratchGrid: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
  },
  hintOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  hintText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#475569",
    writingDirection: "rtl",
  },
  claimBtn: {
    backgroundColor: "#0ea5e9",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#0ea5e9",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  claimBtnText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    writingDirection: "rtl",
  },
  claimedText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0ea5e9",
    textAlign: "center",
    marginBottom: 8,
  },
  closeBtn: {
    alignSelf: "center",
    paddingVertical: 6,
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
});
