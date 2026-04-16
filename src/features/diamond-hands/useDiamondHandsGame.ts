import { useCallback, useEffect, useRef, useState } from "react";
import {
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { HOLD_TARGET_MS, phaseAtTime } from "./diamondHandsData";
import type { HodlPhase } from "./types";

interface UseDiamondHandsArgs {
  onVictory: () => void;
  onPaperHands: (heldForMs: number) => void;
}

interface Subscription {
  remove: () => void;
}

interface GyroModule {
  Gyroscope: {
    isAvailableAsync: () => Promise<boolean>;
    setUpdateInterval: (ms: number) => void;
    addListener: (
      fn: (data: { x: number; y: number; z: number }) => void
    ) => Subscription;
  };
}

let gyroModuleCache: GyroModule | null | undefined = undefined;
async function loadGyroModule(): Promise<GyroModule | null> {
  if (gyroModuleCache !== undefined) return gyroModuleCache;
  try {
    const mod = (await import("expo-sensors")) as unknown as GyroModule;
    if (
      mod &&
      mod.Gyroscope &&
      typeof mod.Gyroscope.addListener === "function"
    ) {
      gyroModuleCache = mod;
      return mod;
    }
  } catch {
    // Module not available or errored — fall back silently.
  }
  gyroModuleCache = null;
  return null;
}

export function useDiamondHandsGame({
  onVictory,
  onPaperHands,
}: UseDiamondHandsArgs) {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<HodlPhase>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isHolding, setIsHolding] = useState(false);

  const startedAtRef = useRef<number | null>(null);
  const holdingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishedRef = useRef(false);
  const gyroSubRef = useRef<Subscription | null>(null);

  const shakeX = useSharedValue(0);
  const shakeRotate = useSharedValue(0);

  const clearTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stopGyro = useCallback(() => {
    if (gyroSubRef.current) {
      try {
        gyroSubRef.current.remove();
      } catch {
        // ignore — already removed
      }
      gyroSubRef.current = null;
    }
    shakeX.value = withTiming(0, { duration: 200 });
    shakeRotate.value = withTiming(0, { duration: 200 });
  }, [shakeX, shakeRotate]);

  const startGyro = useCallback(async () => {
    if (reduceMotion) return;
    if (gyroSubRef.current) return;
    const mod = await loadGyroModule();
    if (!mod) return;
    try {
      const available = await mod.Gyroscope.isAvailableAsync();
      if (!available) return;
      mod.Gyroscope.setUpdateInterval(60);
      const sub = mod.Gyroscope.addListener((data) => {
        const clampedX = Math.max(-3, Math.min(3, data.x * 6));
        const clampedZ = Math.max(-2.5, Math.min(2.5, data.z * 4));
        shakeX.value = clampedX;
        shakeRotate.value = clampedZ;
      });
      gyroSubRef.current = sub;
    } catch {
      stopGyro();
    }
  }, [shakeX, shakeRotate, stopGyro, reduceMotion]);

  const finish = useCallback(
    (won: boolean) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      const heldFor = startedAtRef.current
        ? Date.now() - startedAtRef.current
        : 0;
      clearTimers();
      stopGyro();
      if (won) {
        setPhase("victory");
        onVictory();
      } else {
        setPhase("paperHands");
        onPaperHands(heldFor);
      }
    },
    [clearTimers, stopGyro, onVictory, onPaperHands]
  );

  const tick = useCallback(() => {
    if (finishedRef.current) return;
    if (!startedAtRef.current) return;
    if (!holdingRef.current) {
      finish(false);
      return;
    }
    const elapsed = Date.now() - startedAtRef.current;
    setElapsedMs(elapsed);
    const nextPhase = phaseAtTime(elapsed).phase;
    setPhase((prev) => (prev === nextPhase ? prev : nextPhase));
    if (elapsed >= HOLD_TARGET_MS) {
      finish(true);
    }
  }, [finish]);

  const start = useCallback(() => {
    finishedRef.current = false;
    startedAtRef.current = Date.now();
    holdingRef.current = true;
    setIsHolding(true);
    setElapsedMs(0);
    setPhase("fear");
    clearTimers();
    intervalRef.current = setInterval(tick, 100);
  }, [clearTimers, tick]);

  const release = useCallback(() => {
    holdingRef.current = false;
    setIsHolding(false);
  }, []);

  const reHold = useCallback(() => {
    if (finishedRef.current) return;
    holdingRef.current = true;
    setIsHolding(true);
  }, []);

  const reset = useCallback(() => {
    finishedRef.current = false;
    holdingRef.current = false;
    startedAtRef.current = null;
    clearTimers();
    stopGyro();
    setIsHolding(false);
    setElapsedMs(0);
    setPhase("idle");
  }, [clearTimers, stopGyro]);

  useEffect(() => {
    if (phase === "panic") {
      void startGyro();
    } else {
      stopGyro();
    }
  }, [phase, startGyro, stopGyro]);

  useEffect(() => {
    return () => {
      clearTimers();
      stopGyro();
    };
  }, [clearTimers, stopGyro]);

  return {
    phase,
    elapsedMs,
    isHolding,
    start,
    release,
    reHold,
    reset,
    shakeX,
    shakeRotate,
  };
}
