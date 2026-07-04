import { useCallback, useState } from 'react';
import { useAuthStore } from '../auth/useAuthStore';
import { requestGuestGate } from '../auth/guestValueGate';
import { submitCrowdVote, type CrowdQuestionStats } from '../../db/sync/syncCrowdQuestion';
import { useAnonAdviceStore } from './useAnonAdviceStore';
import { track } from '../../lib/analytics/events';
import { tapHaptic, successHaptic, errorHaptic } from '../../utils/haptics';

/**
 * Dilemma option votes ride the crowd-question infra (crowd_question_votes +
 * /api/crowd-question/vote|stats) so the percentages users see are REAL,
 * CROSS-USER counts — the same rails as the TA-35 weekly forecast
 * (Yoav 2026-07-04: "שיהיה ניתן לבחור ולראות מה אנשים חושבים").
 *
 * The votes table is unique per (user, vote_date_il), so every post gets its
 * own deterministic date-bucket in the 1980s — far from the real daily buckets
 * (today) and the TA-35 weekly buckets (~2007), and identical on every device
 * so the counts aggregate correctly.
 */
export function dilemmaQuestionId(postId: string): string {
  return `anon-${postId}`.slice(0, 80);
}

export function dilemmaVoteBucket(postId: string): string {
  let hash = 0;
  for (let i = 0; i < postId.length; i += 1) {
    hash = (hash * 31 + postId.charCodeAt(i)) | 0;
  }
  const day = Math.abs(hash) % 3650; // 10 years of distinct buckets
  const d = new Date(Date.UTC(1995, 0, 1) - day * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export interface DilemmaVote {
  /** The option this user picked (persisted), or null. */
  votedIndex: 0 | 1 | null;
  submitting: boolean;
  /** Fresh server counts returned by the vote call (seed for the live hook). */
  optimisticStats: CrowdQuestionStats | null;
  vote: (index: 0 | 1) => void;
}

export function useDilemmaVote(postId: string): DilemmaVote {
  const votedOptionByPost = useAnonAdviceStore((s) => s.votedOptionByPost);
  const voteOnPostOnce = useAnonAdviceStore((s) => s.voteOnPostOnce);
  const authEmail = useAuthStore((s) => s.email);
  const [optimisticStats, setOptimisticStats] = useState<CrowdQuestionStats | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const votedIndex = votedOptionByPost[postId] ?? null;

  const vote = useCallback(
    (index: 0 | 1) => {
      if (votedIndex !== null || submitting) return;
      if (!authEmail) {
        requestGuestGate('daily_question_vote');
        return;
      }
      tapHaptic();
      setSubmitting(true);
      void (async () => {
        try {
          const result = await submitCrowdVote({
            authId: authEmail,
            questionId: dilemmaQuestionId(postId),
            choice: index === 0 ? 'a' : 'b',
            voteDateIL: dilemmaVoteBucket(postId),
          });
          voteOnPostOnce(postId, index); // local record + dedupe guard
          setOptimisticStats({ countA: result.countA, countB: result.countB, total: result.total });
          successHaptic();
          // Analytics — same pair as the TA-35 forecast (shared crowd rails).
          try {
            track({ name: 'crowd_vote_submitted', props: { question_id: dilemmaQuestionId(postId), choice_id: index === 0 ? 'a' : 'b', is_bet: false, surface: 'dilemma' } });
            track({ name: 'social_action', props: { action_type: 'crowd_vote', surface: 'dilemma' } });
          } catch { /* non-fatal */ }
        } catch {
          errorHaptic(); // offline/server hiccup — user can simply tap again
        } finally {
          setSubmitting(false);
        }
      })();
    },
    [votedIndex, submitting, authEmail, postId, voteOnPostOnce],
  );

  return { votedIndex, submitting, optimisticStats, vote };
}
