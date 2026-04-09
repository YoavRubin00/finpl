/** Tracks a single concept the user has failed on */
export interface FailedConcept {
  conceptTag: string;
  moduleId: string;
  failCount: number;
  lastFailedAt: number;
}

/** Per-question failure record for granular tracking */
export interface QuestionFailure {
  questionId: string;
  conceptTag: string;
  moduleId: string;
  timestamp: number;
}
