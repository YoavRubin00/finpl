export type HodlPhase = "idle" | "fear" | "panic" | "hope" | "victory" | "paperHands";

export interface PhaseDef {
  phase: HodlPhase;
  startMs: number;
  endMs: number;
  label: string;
  vignetteOpacity: number;
  vignetteColor: string;
  shakeEnabled: boolean;
}

export interface HodlResult {
  won: boolean;
  heldForMs: number;
  xpEarned: number;
  coinsEarned: number;
}

export interface CrashPoint {
  t: number;
  y: number;
}
