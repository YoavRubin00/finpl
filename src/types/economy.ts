export type XPSource =
  | "lesson_complete"
  | "quiz_correct"
  | "streak_bonus"
  | "challenge_complete"
  | "onboarding"
  | "daily_task"
  | "sim_complete"
  | "chest_reward"
  | "clash_win"
  | "clash_draw";

export type PyramidLayer = 0 | 1 | 2 | 3 | 4 | 5;

export interface TokenBalances {
  xp: number;
  coins: number;
  gems: number;
  streak: number;
}

export interface PyramidStatus {
  level: number;
  layer: PyramidLayer;
  layerName: string;
  xpToNextLevel: number;
  progressToNextLevel: number; // 0–1
}
