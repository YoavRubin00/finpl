import { useCallback, useState } from 'react';
import { useAuthStore } from '../auth/useAuthStore';
import { requestGuestGate } from '../auth/guestValueGate';
import { submitCrowdVote, type CrowdQuestionStats } from '../../db/sync/syncCrowdQuestion';
import { useInvestorsJournalStore } from './useInvestorsJournalStore';
import { track } from '../../lib/analytics/events';
import { tapHaptic, successHaptic, errorHaptic } from '../../utils/haptics';

/**
 * Journal forecast votes ride the crowd-question rails (crowd_question_votes)
 * — the same REAL cross-user counting as the TA-35 weekly forecast and the
 * dilemma polls. Each event gets its own deterministic date-bucket in the
 * 1965-1975 range: clear of real daily buckets (today), the TA-35 weekly
 * buckets (~2007) and the dilemma buckets (1985-1995), and identical on every
 * device so counts aggregate globally.
 */
export function journalQuestionId(eventId: string): string {
  return `evt-${eventId}`.slice(0, 80);
}

export function journalVoteBucket(eventId: string): string {
  let hash = 0;
  for (let i = 0; i < eventId.length; i += 1) {
    hash = (hash * 31 + eventId.charCodeAt(i)) | 0;
  }
  const day = Math.abs(hash) % 3650;
  const d = new Date(Date.UTC(1975, 0, 1) - day * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export interface JournalVote {
  votedIndex: 0 | 1 | null;
  submitting: boolean;
  optimisticStats: CrowdQuestionStats | null;
  vote: (index: 0 | 1) => void;
}

export function useJournalVote(eventId: string): JournalVote {
  const votedEvents = useInvestorsJournalStore((s) => s.votedEvents);
  const recordVote = useInvestorsJournalStore((s) => s.recordVote);
  const authEmail = useAuthStore((s) => s.email);
  const [optimisticStats, setOptimisticStats] = useState<CrowdQuestionStats | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const votedIndex = votedEvents[eventId] ?? null;

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
            questionId: journalQuestionId(eventId),
            choice: index === 0 ? 'a' : 'b',
            voteDateIL: journalVoteBucket(eventId),
          });
          recordVote(eventId, index); // local record + one-time XP
          setOptimisticStats({ countA: result.countA, countB: result.countB, total: result.total });
          successHaptic();
          // Analytics — same pair as the TA-35 weekly forecast (shared rails):
          // the per-feature vote event + the North-Star social_action.
          try {
            track({ name: 'crowd_vote_submitted', props: { question_id: journalQuestionId(eventId), choice_id: index === 0 ? 'a' : 'b', is_bet: false, surface: 'investors_journal' } });
            track({ name: 'social_action', props: { action_type: 'crowd_vote', surface: 'investors_journal' } });
          } catch { /* non-fatal */ }
        } catch {
          errorHaptic(); // offline — user can tap again
        } finally {
          setSubmitting(false);
        }
      })();
    },
    [votedIndex, submitting, authEmail, eventId, recordVote],
  );

  return { votedIndex, submitting, optimisticStats, vote };
}
