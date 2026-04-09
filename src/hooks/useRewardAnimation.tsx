import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { StyleSheet, View } from "react-native";

import { usePathname } from "expo-router";
import { useEconomyStore } from "../features/economy/useEconomyStore";
import { RewardPopup, type RewardType } from "../components/ui/RewardPopup";
import {
  ParticleBurst,
  type ParticleColor,
} from "../components/ui/ParticleBurst";
import { FlyingRewards } from "../components/ui/FlyingRewards";
import { ConfettiExplosion } from "../components/ui/ConfettiExplosion";
import { successHaptic } from "../utils/haptics";

interface FlyingEntry {
  id: number;
  amount: number;
  type: "coins" | "xp" | "gems";
}

interface RewardEntry {
  id: number;
  amount: number;
  type: RewardType;
}

interface PendingRewards {
  xp: number;
  coins: number;
  gems: number;
}

interface RewardAnimationContextValue {
  triggerReward: (amount: number, type: RewardType) => void;
}

const RewardAnimationContext = createContext<RewardAnimationContextValue>({
  triggerReward: () => {},
});

let nextId = 0;

const isTabPath = (p: string): boolean =>
  p === "/" || p === "/(tabs)" || p.startsWith("/(tabs)") || p === "/fantasy" || p === "/squads" || p === "/finfeed";

export function RewardAnimationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [rewards, setRewards] = useState<RewardEntry[]>([]);
  const [particles, setParticles] = useState<
    { id: number; color: ParticleColor }[]
  >([]);
  const [flyingRewards, setFlyingRewards] = useState<FlyingEntry[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const prevXP = useRef<number | null>(null);
  const prevCoins = useRef<number | null>(null);
  const prevGems = useRef<number | null>(null);
  const pendingRewards = useRef<PendingRewards>({ xp: 0, coins: 0, gems: 0 });
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const fireRewardAnimations = useCallback(
    (xpAmount: number, coinAmount: number, gemsAmount: number) => {
      let delay = 0;

      if (xpAmount > 0) {
        const id = nextId++;
        setRewards((prev) => [...prev, { id, amount: xpAmount, type: "xp" }]);
        setParticles((prev) => [...prev, { id, color: "violet" as ParticleColor }]);
        const flyId = nextId++;
        setFlyingRewards((prev) => [...prev, { id: flyId, amount: xpAmount, type: "xp" }]);
        setShowConfetti(true);
        successHaptic();
        delay = 200;
      }

      if (coinAmount > 0) {
        setTimeout(() => {
          const id = nextId++;
          setRewards((prev) => [...prev, { id, amount: coinAmount, type: "coins" }]);
          setParticles((prev) => [...prev, { id, color: "gold" as ParticleColor }]);
          successHaptic();
        }, delay);
        const flyId = nextId++;
        setTimeout(() => {
          setFlyingRewards((prev) => [...prev, { id: flyId, amount: coinAmount, type: "coins" }]);
        }, delay > 0 ? 150 : 0);
        if (delay === 0) setShowConfetti(true);
        delay = delay > 0 ? delay + 200 : 200;
      }

      if (gemsAmount > 0) {
        setTimeout(() => {
          const id = nextId++;
          setRewards((prev) => [...prev, { id, amount: gemsAmount, type: "gems" }]);
          setParticles((prev) => [...prev, { id, color: "cyan" as ParticleColor }]);
          successHaptic();
        }, delay);
        const flyId = nextId++;
        setTimeout(() => {
          setFlyingRewards((prev) => [...prev, { id: flyId, amount: gemsAmount, type: "gems" }]);
        }, delay > 0 ? delay - 50 : 0);
        if (delay === 0) setShowConfetti(true);
      }
    },
    [],
  );

  const triggerReward = useCallback((amount: number, type: RewardType) => {
    if (amount <= 0) return;
    const id = nextId++;
    setRewards((prev) => [...prev, { id, amount, type }]);

    const particleColor: ParticleColor =
      type === "xp" ? "violet" : type === "gems" ? "cyan" : "gold";
    setParticles((prev) => [...prev, { id, color: particleColor }]);

    successHaptic();
  }, []);

  // Subscribe to economy store changes
  useEffect(() => {
    const unsub = useEconomyStore.subscribe((state, prevState) => {
      if (prevXP.current === null) prevXP.current = prevState.xp;
      if (prevCoins.current === null) prevCoins.current = prevState.coins;
      if (prevGems.current === null) prevGems.current = prevState.gems;

      const xpDiff = state.xp - (prevXP.current ?? state.xp);
      const coinsDiff = state.coins - (prevCoins.current ?? state.coins);
      const gemsDiff = state.gems - (prevGems.current ?? state.gems);

      prevXP.current = state.xp;
      prevCoins.current = state.coins;
      prevGems.current = state.gems;

      const hasReward = xpDiff > 0 || coinsDiff > 0 || gemsDiff > 0;
      if (!hasReward) return;

      // Always fire immediately, regardless of what screen we are on
      fireRewardAnimations(
        xpDiff > 0 ? xpDiff : 0,
        coinsDiff > 0 ? coinsDiff : 0,
        gemsDiff > 0 ? gemsDiff : 0,
      );
    });

    return unsub;
  }, [fireRewardAnimations]);

  const removeReward = useCallback((id: number) => {
    setRewards((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const removeParticle = useCallback((id: number) => {
    setParticles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const removeFlyingReward = useCallback((id: number) => {
    setFlyingRewards((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const hasOverlay =
    rewards.length > 0 || particles.length > 0 || flyingRewards.length > 0 || showConfetti;

  return (
    <RewardAnimationContext.Provider value={{ triggerReward }}>
      {children}
      {hasOverlay && (
        <View style={styles.overlay} pointerEvents="none">
          {showConfetti && (
            <ConfettiExplosion onComplete={() => setShowConfetti(false)} />
          )}
          {flyingRewards.map((f) => (
            <FlyingRewards
              key={`fly-${f.id}`}
              type={f.type}
              amount={f.amount}
              onComplete={() => removeFlyingReward(f.id)}
            />
          ))}
          {particles.map((p) => (
            <ParticleBurst
              key={`p-${p.id}`}
              color={p.color}
              onComplete={() => removeParticle(p.id)}
            />
          ))}
          {rewards.map((r) => (
            <RewardPopup
              key={`r-${r.id}`}
              amount={r.amount}
              type={r.type}
              onComplete={() => removeReward(r.id)}
            />
          ))}
        </View>
      )}
    </RewardAnimationContext.Provider>
  );
}

export function useRewardAnimation() {
  return useContext(RewardAnimationContext);
}



const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
});
