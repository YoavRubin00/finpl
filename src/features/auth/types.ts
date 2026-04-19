export type PasswordStrength = "weak" | "medium" | "strong";

export type FinancialGoal =
  | "cash-flow"
  | "investing"
  | "army-release"
  | "expand-horizons"
  | "unsure";

/** Dream selection, Duolingo-style "pick your dream" onboarding step */
export type FinancialDream = "trip" | "car" | "apartment" | "freedom";

export interface DreamOption {
  id: FinancialDream;
  emoji: string;
  label: string;
  sub: string;
  targetNIS: number;
}

export type KnowledgeLevel =
  | "none"
  | "beginner"
  | "some"
  | "experienced"
  | "expert";

export type AgeGroup = "minor" | "adult";

export type LearningTime = "morning" | "evening" | "during-day";

export type LearningStyle =
  | "theory-first"
  | "practice-along"
  | "no-preference";

export type DeadlineStress = "no-stress" | "maybe" | "high-stress";

export type DailyGoalMinutes = 5 | 10 | 15 | 30;

export type CompanionId =
  | "warren-buffett"
  | "moshe-peled"
  | "rachel"
  | "robot";

export interface UserProfile {
  displayName: string;
  // Q0, Dream (Duolingo-style)
  financialDream: FinancialDream | null;
  // Q1, Goal
  financialGoal: FinancialGoal;
  // Q2, Knowledge
  knowledgeLevel: KnowledgeLevel;
  // Q3, Age gate
  ageGroup: AgeGroup;
  birthYear: number;
  // Q4, When to learn
  learningTime: LearningTime;
  // Q5, How to learn
  learningStyle: LearningStyle;
  // Q6, Deadline stress
  deadlineStress: DeadlineStress;
  // Q7, Daily commitment
  dailyGoalMinutes: DailyGoalMinutes;
  // Q8, Companion
  companionId: CompanionId;
  // Avatar
  avatarId: string | null;
  ownedAvatars: string[];
}
