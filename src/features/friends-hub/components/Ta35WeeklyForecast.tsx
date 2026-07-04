import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useAuthStore } from '../../auth/useAuthStore';
import { requestGuestGate } from '../../auth/guestValueGate';
import { submitCrowdVote, type CrowdQuestionStats } from '../../../db/sync/syncCrowdQuestion';
import { useLivePercents } from '../../crowd-question/computeLiveStats';
import { useCrowdQuestionStore, ta35WeeklyVoteBucket } from '../../crowd-question/useCrowdQuestionStore';
import { TA35_WEEKLY_QUESTION } from '../../crowd-question/crowdQuestionsData';
import { getIsraelWeekAnchorISO } from '../../../utils/israelTime';
import { track } from '../../../lib/analytics/events';
import { tapHaptic, successHaptic, errorHaptic } from '../../../utils/haptics';
import { STITCH } from '../../../constants/theme';
import type { CrowdOption } from '../../crowd-question/types';

/**
 * ת״א-35 — the WEEKLY crowd forecast, pinned in the friends-hub crowd-wisdom
 * card (Yoav 2026-07-04). One pick per Israel week (auto-resets Sunday), and
 * after voting the user sees the REAL percentages of this week's community
 * votes — server COUNT(*) only, never a seeded/invented split.
 */
export function Ta35WeeklyForecast(): React.ReactElement {
  const q = TA35_WEEKLY_QUESTION;
  // Subscribing to the raw entry keeps this in sync; staleness is resolved by
  // the selector below (a past week's pick reads as null → vote state again).
  const ta35Weekly = useCrowdQuestionStore((s) => s.ta35Weekly);
  const recordTa35WeeklyVote = useCrowdQuestionStore((s) => s.recordTa35WeeklyVote);
  const authEmail = useAuthStore((s) => s.email);

  const weekKey = getIsraelWeekAnchorISO();
  const voteBucket = useMemo(() => ta35WeeklyVoteBucket(weekKey), [weekKey]);
  const userVote: CrowdOption['id'] | null =
    ta35Weekly && ta35Weekly.weekKey === weekKey ? ta35Weekly.choice : null;

  const [optimisticStats, setOptimisticStats] = useState<CrowdQuestionStats | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [voteError, setVoteError] = useState(false);

  const handleVote = useCallback(
    (choice: CrowdOption['id']) => {
      if (userVote || submitting) return;
      if (!authEmail) {
        requestGuestGate('daily_question_vote');
        return;
      }
      tapHaptic();
      setSubmitting(true);
      setVoteError(false);
      void (async () => {
        try {
          const result = await submitCrowdVote({
            authId: authEmail,
            questionId: q.id,
            choice,
            voteDateIL: voteBucket,
          });
          recordTa35WeeklyVote(choice);
          setOptimisticStats({ countA: result.countA, countB: result.countB, total: result.total });
          successHaptic();
          try {
            track({ name: 'crowd_vote_submitted', props: { question_id: q.id, choice_id: choice, is_bet: false, surface: 'ta35_weekly' } });
            track({ name: 'social_action', props: { action_type: 'crowd_vote', surface: 'ta35_weekly' } });
          } catch { /* non-fatal */ }
        } catch {
          setVoteError(true);
          errorHaptic();
        } finally {
          setSubmitting(false);
        }
      })();
    },
    [userVote, submitting, authEmail, q.id, voteBucket, recordTa35WeeklyVote],
  );

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: STITCH.surfaceHighest }}>
      {/* Topic accent line — TA-35 cyan */}
      <View style={{ height: 3, backgroundColor: '#0891b2', opacity: 0.85 }} />
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        {/* Tag row */}
        <View style={{ flexDirection: 'row-reverse', gap: 6, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#0891b21A', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#0891b240' }}>
            <Text style={{ fontSize: 10, fontWeight: '900', color: '#0891b2' }}>🇮🇱 ת&quot;א-35</Text>
          </View>
          <View style={{ backgroundColor: '#ecfeff', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#a5f3fc' }}>
            <Text style={{ fontSize: 10, fontWeight: '900', color: '#0e7490', writingDirection: 'rtl' }}>
              תחזית השבוע · מתאפסת ביום ראשון
            </Text>
          </View>
        </View>

        {/* Question */}
        <Text
          style={{ fontSize: 14, fontWeight: '800', color: STITCH.onSurface, writingDirection: 'rtl', textAlign: 'right', marginBottom: 10, lineHeight: 20 }}
          numberOfLines={2}
          maxFontSizeMultiplier={1.3}
        >
          {q.text}
        </Text>

        {userVote === null ? (
          <>
            {/* Vote — two option buttons */}
            <View style={{ gap: 6 }}>
              {q.options.map((option) => (
                <Pressable
                  key={option.id}
                  onPress={() => handleVote(option.id)}
                  disabled={submitting}
                  accessibilityRole="button"
                  accessibilityLabel={`${option.label} — הצבעה לתחזית השבוע`}
                  style={({ pressed }) => ({ opacity: submitting ? 0.6 : pressed ? 0.85 : 1 })}
                >
                  <View
                    style={{
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: option.sentiment === 'green' ? '#f0fdf4' : '#fef2f2',
                      borderWidth: 1.5,
                      borderColor: option.sentiment === 'green' ? '#86efac' : '#fecaca',
                      flexDirection: 'row-reverse',
                      alignItems: 'center',
                      paddingHorizontal: 12,
                      gap: 8,
                    }}
                  >
                    {option.emoji && <Text style={{ fontSize: 14 }}>{option.emoji}</Text>}
                    <Text style={{ fontSize: 13, fontWeight: '800', color: option.sentiment === 'green' ? '#166534' : '#991b1b', writingDirection: 'rtl' }} maxFontSizeMultiplier={1.15}>
                      {option.label}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
            {voteError && (
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#dc2626', writingDirection: 'rtl', textAlign: 'right', marginTop: 8 }} accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.2}>
                לא הצלחנו לשמור את התחזית. נסו שוב.
              </Text>
            )}
          </>
        ) : (
          <Ta35WeeklyResults userVote={userVote} optimisticStats={optimisticStats} voteBucket={voteBucket} />
        )}
      </View>
    </View>
  );
}

/** Post-vote view — REAL weekly percentages from the server (or an honest
 *  "you're first" state), separated so the stats hook mounts only after voting. */
function Ta35WeeklyResults({
  userVote,
  optimisticStats,
  voteBucket,
}: {
  userVote: CrowdOption['id'];
  optimisticStats: CrowdQuestionStats | null;
  voteBucket: string;
}): React.ReactElement {
  const q = TA35_WEEKLY_QUESTION;
  const live = useLivePercents({ questionId: q.id, userVote, optimisticStats, voteDateIL: voteBucket });
  const pcts: Record<CrowdOption['id'], number> = { a: live.pctA, b: live.pctB };

  return (
    <View style={{ gap: 6 }}>
      {q.options.map((option) => {
        const isMine = userVote === option.id;
        const pct = pcts[option.id];
        const green = option.sentiment === 'green';
        return (
          <View
            key={option.id}
            accessible
            accessibilityRole="text"
            accessibilityLabel={`${option.label}: ${live.hasData ? `${pct} אחוז` : 'עדיין אין נתונים'}${isMine ? ', הבחירה שלך' : ''}`}
            style={{ height: 40, borderRadius: 10, backgroundColor: '#f1f5f9', borderWidth: isMine ? 2 : 1, borderColor: isMine ? (green ? '#16a34a' : '#dc2626') : '#e2e8f0', overflow: 'hidden', justifyContent: 'center' }}
          >
            {live.hasData && (
              <View
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: `${pct}%`,
                  backgroundColor: green ? (isMine ? '#bbf7d0' : '#dcfce7') : isMine ? '#fecaca' : '#fee2e2',
                }}
              />
            )}
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 12, gap: 6 }}>
              {option.emoji && <Text style={{ fontSize: 13 }}>{option.emoji}</Text>}
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a', writingDirection: 'rtl' }} maxFontSizeMultiplier={1.15}>
                {option.label}
              </Text>
              {isMine && (
                <View style={{ backgroundColor: '#ffffff', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1, borderWidth: 1, borderColor: green ? '#86efac' : '#fecaca' }}>
                  <Text style={{ fontSize: 9, fontWeight: '900', color: green ? '#15803d' : '#b91c1c', writingDirection: 'rtl' }}>✓ הבחירה שלך</Text>
                </View>
              )}
              <View style={{ flex: 1 }} />
              {live.hasData && (
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#0f172a' }}>{pct}%</Text>
              )}
            </View>
          </View>
        );
      })}
      <Text style={{ fontSize: 11, color: STITCH.onSurfaceVariant, fontWeight: '700', writingDirection: 'rtl', textAlign: 'right', marginTop: 2 }} maxFontSizeMultiplier={1.2}>
        {live.hasData
          ? `${live.total} ${live.total === 1 ? 'תחזית השבוע — אתם הראשונים!' : 'תחזיות מהקהילה השבוע'}`
          : 'עדיין אוספים תחזיות השבוע'}
      </Text>
    </View>
  );
}
