/**
 * SIM: ציר הזמן של המשברים — Crisis Timeline
 * Types for the historical crises prediction simulation.
 */

export interface CrisisEvent {
  id: string;
  year: number;
  name: string;           // Hebrew
  emoji: string;
  peakToTrough: number;   // % drop (negative)
  recoveryMonths: number; // Months to recover
  spLevel: number;        // S&P 500 at trough
  description: string;    // Hebrew — what happened
  grahamLesson: string;   // Hebrew — what Graham would say
  crowdAction: string;    // Hebrew — what the crowd did
  surprisingFact: string; // Hebrew — one surprising data point
}

export interface TimelinePrediction {
  eventId: string;
  predictedRecovery: number; // User's guess in months
  actual: number;
  accuracy: number;          // 0-100
}

export type TimelineGrade = 'S' | 'A' | 'B' | 'C' | 'F';
