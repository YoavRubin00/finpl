import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import { useHeartsStore } from "../subscription/useHeartsStore";
import { FlyingRewards } from "../../components/ui/FlyingRewards";
import { ParticleBurst } from "../../components/ui/ParticleBurst";
import { RewardPopup } from "../../components/ui/RewardPopup";
import { ConfettiExplosion } from "../../components/ui/ConfettiExplosion";
import { EnergyLossOverlay } from "./EnergyLossOverlay";
import { EnergyMinusToast } from "./EnergyMinusToast";
import { successHaptic, heavyHaptic, tapHaptic } from "../../utils/haptics";

/**
 * Global energy-change animation layer. Mounts ONCE at the app root (inside
 * RewardAnimationProvider) and subscribes to useHeartsStore's `lastEnergyDelta`
 * PUSH signal, so a GAIN/LOSS animation fires on every spend/grant from ANY
 * screen — no per-call-site wiring. Mirrors RewardAnimationProvider (coins/XP).
 *
 * Loss tiering (by `source`): wrong-answer PENALTY → dramatic EnergyLossOverlay
 * (the old in-lesson heart-break); usage COST (chat/analyst-tool) → subtle
 * EnergyMinusToast. Gain juice: ParticleBurst + flying battery + "+N ⚡" popup,
 * with confetti on milestone sources (combo/perfect-lesson/practice). Reduced
 * motion collapses everything to a single static number.
 */

let nextId = 0;

// A loss from these sources is a usage COST (subtle), not a wrong-answer penalty.
const COST_SOURCES = new Set(["chat", "analyst-tool"]);
// A gain from these sources is a "peak moment" → bigger celebration (confetti).
const MILESTONE_SOURCES = new Set(["combo", "perfect-lesson", "practice"]);

interface GainEntry { id: number; amount: number }
interface LossEntry { id: number; amount: number; dramatic: boolean; isLast: boolean }

export function EnergyAnimationProvider({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  const delta = useHeartsStore((s) => s.lastEnergyDelta);
  const lastNonce = useRef(0);

  const [gains, setGains] = useState<GainEntry[]>([]);
  const [losses, setLosses] = useState<LossEntry[]>([]);
  const [bursts, setBursts] = useState<{ id: number }[]>([]);
  const [popups, setPopups] = useState<{ id: number; amount: number }[]>([]);
  const [confetti, setConfetti] = useState(false);

  useEffect(() => {
    if (!delta || delta.nonce === lastNonce.current) return;
    lastNonce.current = delta.nonce;

    if (delta.type === "gain") {
      const milestone = MILESTONE_SOURCES.has(delta.source) || delta.amount >= 2;
      const id = nextId++;
      // The "+N ⚡" number always shows (also the reduced-motion fallback).
      setPopups((p) => [...p, { id, amount: delta.amount }]);
      if (reduceMotion) return;
      setGains((p) => [...p, { id, amount: delta.amount }]);
      setBursts((p) => [...p, { id }]);
      if (milestone) {
        setConfetti(true);
        successHaptic();
      } else {
        tapHaptic();
      }
      return;
    }

    // loss
    const id = nextId++;
    const dramatic = !reduceMotion && !COST_SOURCES.has(delta.source);
    const isLast = useHeartsStore.getState().getHearts() <= 0;
    setLosses((p) => [...p, { id, amount: delta.amount, dramatic, isLast }]);
    if (!reduceMotion) {
      if (dramatic) heavyHaptic();
      else tapHaptic();
    }
  }, [delta, reduceMotion]);

  const hasOverlay =
    gains.length > 0 || losses.length > 0 || bursts.length > 0 || popups.length > 0 || confetti;

  return (
    <>
      {children}
      {hasOverlay && (
        <View style={styles.overlay} pointerEvents="none">
          {confetti && <ConfettiExplosion onComplete={() => setConfetti(false)} />}
          {bursts.map((b) => (
            <ParticleBurst
              key={`eb-${b.id}`}
              color="violet"
              onComplete={() => setBursts((p) => p.filter((x) => x.id !== b.id))}
            />
          ))}
          {gains.map((g) => (
            <FlyingRewards
              key={`eg-${g.id}`}
              type="energy"
              amount={g.amount}
              onComplete={() => setGains((p) => p.filter((x) => x.id !== g.id))}
            />
          ))}
          {popups.map((pp) => (
            <RewardPopup
              key={`ep-${pp.id}`}
              type="energy"
              amount={pp.amount}
              onComplete={() => setPopups((p) => p.filter((x) => x.id !== pp.id))}
            />
          ))}
          {losses.map((l) =>
            l.dramatic ? (
              <EnergyLossOverlay
                key={`el-${l.id}`}
                visible
                originY={120}
                isLastHeart={l.isLast}
                onFinish={() => setLosses((p) => p.filter((x) => x.id !== l.id))}
              />
            ) : (
              <EnergyMinusToast
                key={`el-${l.id}`}
                amount={l.amount}
                reduceMotion={reduceMotion}
                onComplete={() => setLosses((p) => p.filter((x) => x.id !== l.id))}
              />
            ),
          )}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9998,
  },
});
