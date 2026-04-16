import type { CrashPoint, PhaseDef } from "./types";

export const HOLD_TARGET_MS = 15_000;

export const PHASES: ReadonlyArray<PhaseDef> = [
  {
    phase: "fear",
    startMs: 0,
    endMs: 5_000,
    label: "פחד",
    vignetteOpacity: 0.25,
    vignetteColor: "#b91c1c",
    shakeEnabled: false,
  },
  {
    phase: "panic",
    startMs: 5_000,
    endMs: 10_000,
    label: "פאניקה",
    vignetteOpacity: 0.55,
    vignetteColor: "#991b1b",
    shakeEnabled: true,
  },
  {
    phase: "hope",
    startMs: 10_000,
    endMs: 15_000,
    label: "תקווה",
    vignetteOpacity: 0.2,
    vignetteColor: "#166534",
    shakeEnabled: false,
  },
];

export const CRASH_CURVE: ReadonlyArray<CrashPoint> = [
  { t: 0, y: 0.1 },
  { t: 0.08, y: 0.22 },
  { t: 0.15, y: 0.34 },
  { t: 0.22, y: 0.3 },
  { t: 0.33, y: 0.5 },
  { t: 0.42, y: 0.62 },
  { t: 0.5, y: 0.58 },
  { t: 0.58, y: 0.72 },
  { t: 0.66, y: 0.82 },
  { t: 0.73, y: 0.78 },
  { t: 0.8, y: 0.85 },
  { t: 0.86, y: 0.82 },
  { t: 0.92, y: 0.78 },
  { t: 0.97, y: 0.55 },
  { t: 1.0, y: 0.15 },
];

export const REWARD = {
  xp: 150,
  coins: 300,
};

export function phaseAtTime(elapsedMs: number): PhaseDef {
  for (const p of PHASES) {
    if (elapsedMs >= p.startMs && elapsedMs < p.endMs) return p;
  }
  return PHASES[PHASES.length - 1];
}

export function curveYAt(progress: number): number {
  const clamped = Math.max(0, Math.min(1, progress));
  for (let i = 1; i < CRASH_CURVE.length; i++) {
    const a = CRASH_CURVE[i - 1];
    const b = CRASH_CURVE[i];
    if (clamped <= b.t) {
      const span = b.t - a.t;
      const local = span === 0 ? 0 : (clamped - a.t) / span;
      return a.y + (b.y - a.y) * local;
    }
  }
  return CRASH_CURVE[CRASH_CURVE.length - 1].y;
}
