export interface ClashInvite {
  id: string;
  opponentName: string;
  opponentAvatarPath: string;
  endTime: string; // ISO 8601 timestamp
  status: 'pending' | 'active' | 'completed';
}

export interface ClashQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  difficulty: 'easy' | 'medium' | 'hard';
  xpReward: number;
}

export interface ClashSession {
  inviteId: string;
  opponentName: string;
  questions: ClashQuestion[];
  currentQuestionIndex: number;
  userScore: number;
  opponentScore: number;
  userAnswers: (number | null)[];
  startedAt: string;
  timePerQuestion: number; // seconds
  isComplete: boolean;
  result: 'win' | 'lose' | 'draw' | null;
}
