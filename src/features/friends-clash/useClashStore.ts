import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEconomyStore } from '../economy/useEconomyStore';
import { getClashRound } from './clashQuestions';
import type { ClashInvite, ClashSession } from './types';

interface ClashState {
  invites: ClashInvite[];
  activeSession: ClashSession | null;

  // Invite actions
  startClash: (id: string) => void;
  dismissInvite: (id: string) => void;

  // Game actions
  answerQuestion: (optionIndex: number) => boolean; // returns isCorrect
  nextQuestion: () => void;
  finishClash: () => 'win' | 'lose' | 'draw';
  resetSession: () => void;
}

const MOCK_END_TIME = new Date(
  Date.now() + 22 * 60 * 60 * 1000
).toISOString();

const mockInvites: ClashInvite[] = [
  {
    id: 'clash-001',
    opponentName: 'יונתן',
    opponentAvatarPath: 'assets/images/avatar-opponent.png',
    endTime: MOCK_END_TIME,
    status: 'pending',
  },
  {
    id: 'clash-002',
    opponentName: 'נועה',
    opponentAvatarPath: 'assets/images/avatar-opponent.png',
    endTime: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
  },
];

/** Simulate opponent answer — gets ~60% right */
function simulateOpponentAnswer(): boolean {
  return Math.random() < 0.6;
}

const QUESTIONS_PER_CLASH = 5;
const SECONDS_PER_QUESTION = 15;

export const useClashStore = create<ClashState>()(
  persist(
    (set, get) => ({
      invites: mockInvites,
      activeSession: null,

      startClash: (id: string) => {
        const invite = get().invites.find((i) => i.id === id);
        if (!invite) return;

        const questions = getClashRound(QUESTIONS_PER_CLASH);

        // Set invite to active
        set((state) => ({
          invites: state.invites.map((inv) =>
            inv.id === id ? { ...inv, status: 'active' as const } : inv
          ),
          activeSession: {
            inviteId: id,
            opponentName: invite.opponentName,
            questions,
            currentQuestionIndex: 0,
            userScore: 0,
            opponentScore: 0,
            userAnswers: new Array(questions.length).fill(null),
            startedAt: new Date().toISOString(),
            timePerQuestion: SECONDS_PER_QUESTION,
            isComplete: false,
            result: null,
          },
        }));
      },

      dismissInvite: (id: string) => {
        set((state) => ({
          invites: state.invites.filter((inv) => inv.id !== id),
        }));
      },

      answerQuestion: (optionIndex: number): boolean => {
        const session = get().activeSession;
        if (!session || session.isComplete) return false;

        const question = session.questions[session.currentQuestionIndex];
        const isCorrect = optionIndex === question.correctAnswer;

        // Simulate opponent answer
        const opponentCorrect = simulateOpponentAnswer();

        const newAnswers = [...session.userAnswers];
        newAnswers[session.currentQuestionIndex] = optionIndex;

        set({
          activeSession: {
            ...session,
            userScore: session.userScore + (isCorrect ? question.xpReward : 0),
            opponentScore: session.opponentScore + (opponentCorrect ? question.xpReward : 0),
            userAnswers: newAnswers,
          },
        });

        return isCorrect;
      },

      nextQuestion: () => {
        const session = get().activeSession;
        if (!session) return;

        const nextIdx = session.currentQuestionIndex + 1;
        if (nextIdx >= session.questions.length) {
          // Auto-finish
          get().finishClash();
        } else {
          set({
            activeSession: {
              ...session,
              currentQuestionIndex: nextIdx,
            },
          });
        }
      },

      finishClash: (): 'win' | 'lose' | 'draw' => {
        const session = get().activeSession;
        if (!session) return 'draw';

        const result: 'win' | 'lose' | 'draw' =
          session.userScore > session.opponentScore
            ? 'win'
            : session.userScore < session.opponentScore
              ? 'lose'
              : 'draw';

        // Award XP/coins for win
        if (result === 'win') {
          useEconomyStore.getState().addXP(50, 'clash_win');
          useEconomyStore.getState().addCoins(30);
        } else if (result === 'draw') {
          useEconomyStore.getState().addXP(20, 'clash_draw');
          useEconomyStore.getState().addCoins(10);
        }

        // Mark invite completed
        set((state) => ({
          invites: state.invites.map((inv) =>
            inv.id === session.inviteId
              ? { ...inv, status: 'completed' as const }
              : inv
          ),
          activeSession: {
            ...session,
            isComplete: true,
            result,
          },
        }));

        return result;
      },

      resetSession: () => {
        set({ activeSession: null });
      },
    }),
    {
      name: 'clash-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        invites: state.invites,
      }),
    }
  )
);

export { QUESTIONS_PER_CLASH, SECONDS_PER_QUESTION };
