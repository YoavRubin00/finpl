import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Check } from 'lucide-react-native';
import { DUO } from '../../../constants/theme';
import { useLivePercents } from '../../crowd-question/computeLiveStats';
import { dilemmaQuestionId, dilemmaVoteBucket, useDilemmaVote } from '../dilemmaCrowd';
import type { AnonAdvicePost } from '../anonAdviceTypes';
import type { CrowdQuestionStats } from '../../../db/sync/syncCrowdQuestion';

/**
 * Interactive two-option dilemma poll — tap to pick a side, then see the REAL
 * cross-user percentages (crowd-question rails, same as the TA-35 forecast).
 * Before voting no numbers are shown (no anchoring, nothing invented); after
 * voting the fills/percentages come from the server counts only.
 */
export function DilemmaPoll({ post }: { post: AnonAdvicePost }): React.ReactElement | null {
  const { votedIndex, submitting, optimisticStats, vote } = useDilemmaVote(post.id);
  if (post.options.length !== 2) return null;

  if (votedIndex === null) {
    return (
      <View style={{ gap: 8 }}>
        {([0, 1] as const).map((idx) => (
          <Pressable
            key={idx}
            onPress={() => vote(idx)}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel={`הצביעו: ${post.options[idx]}`}
            style={{
              flexDirection: 'row-reverse',
              alignItems: 'center',
              gap: 8,
              backgroundColor: '#ffffff',
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: DUO.border,
              paddingHorizontal: 12,
              paddingVertical: 10,
              opacity: submitting ? 0.6 : 1,
            }}
            android_ripple={{ color: 'rgba(24,119,242,0.08)' }}
          >
            <OptionLetter index={idx} />
            <Text
              style={{
                flex: 1,
                fontSize: 14,
                fontWeight: '700',
                color: DUO.text,
                writingDirection: 'rtl',
                textAlign: 'right',
              }}
              numberOfLines={2}
              maxFontSizeMultiplier={1.15}
            >
              {post.options[idx]}
            </Text>
          </Pressable>
        ))}
        <Text
          style={{ fontSize: 11, color: DUO.textMuted, fontWeight: '700', writingDirection: 'rtl', textAlign: 'right' }}
          maxFontSizeMultiplier={1.15}
        >
          בחרו צד — ותגלו מה הקהילה חושבת
        </Text>
      </View>
    );
  }

  return <DilemmaPollResults post={post} votedIndex={votedIndex} optimisticStats={optimisticStats} />;
}

/** Mounted only after the user voted, so the live-stats polling never runs
 *  for cards nobody engaged with. */
function DilemmaPollResults({
  post,
  votedIndex,
  optimisticStats,
}: {
  post: AnonAdvicePost;
  votedIndex: 0 | 1;
  optimisticStats: CrowdQuestionStats | null;
}): React.ReactElement {
  const live = useLivePercents({
    questionId: dilemmaQuestionId(post.id),
    userVote: votedIndex === 0 ? 'a' : 'b',
    optimisticStats,
    voteDateIL: dilemmaVoteBucket(post.id),
  });
  const pcts: [number, number] = [live.pctA, live.pctB];

  return (
    <View style={{ gap: 8 }}>
      {([0, 1] as const).map((idx) => {
        const isMine = votedIndex === idx;
        const pct = pcts[idx];
        return (
          <View
            key={idx}
            accessible
            accessibilityRole="text"
            accessibilityLabel={`${post.options[idx]}: ${live.hasData ? `${pct} אחוז` : 'עדיין אין נתונים'}${isMine ? ', הבחירה שלך' : ''}`}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              borderWidth: isMine ? 2 : 1.5,
              borderColor: isMine ? DUO.blue : DUO.border,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {live.hasData && (
              <View
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: `${pct}%`,
                  backgroundColor: isMine ? '#bfdbfe' : DUO.blueSurface,
                }}
              />
            )}
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                flexDirection: 'row-reverse',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <OptionLetter index={idx} />
              <Text
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontWeight: isMine ? '800' : '600',
                  color: DUO.text,
                  writingDirection: 'rtl',
                  textAlign: 'right',
                  flexShrink: 1,
                }}
                maxFontSizeMultiplier={1.15}
              >
                {post.options[idx]}
              </Text>
              {isMine && <Check size={15} color={DUO.blue} strokeWidth={3} />}
              {live.hasData && (
                <Text
                  style={{ fontSize: 13, fontWeight: '900', color: isMine ? DUO.blue : DUO.textMuted }}
                  maxFontSizeMultiplier={1.15}
                >
                  {pct}%
                </Text>
              )}
            </View>
          </View>
        );
      })}
      <Text
        style={{ fontSize: 11, color: DUO.textMuted, fontWeight: '700', writingDirection: 'rtl', textAlign: 'right' }}
        maxFontSizeMultiplier={1.15}
      >
        {live.hasData
          ? live.total === 1
            ? 'הצבעה אחת — אתם הראשונים!'
            : `${live.total} הצביעו`
          : 'עדיין אוספים הצבעות'}
      </Text>
    </View>
  );
}

function OptionLetter({ index }: { index: 0 | 1 }): React.ReactElement {
  return (
    <View
      style={{
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: index === 0 ? DUO.blue : DUO.green,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '900' }}>{index === 0 ? 'א׳' : 'ב׳'}</Text>
    </View>
  );
}

/** Legacy read-only poll (local counts) — kept for callers that only display. */
export function OptionPoll({ options, votes }: { options: string[]; votes: number[] }): React.ReactElement {
  const total = votes.reduce((s, v) => s + v, 0);
  return (
    <View style={{ gap: 8 }}>
      {options.map((opt, i) => {
        const count = votes[i] ?? 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <View
            key={i}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: DUO.border,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <View
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: `${pct}%`,
                backgroundColor: i === 0 ? DUO.blueSurface : DUO.greenSurface,
              }}
            />
            <View style={{ paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
              <OptionLetter index={i === 0 ? 0 : 1} />
              <Text
                style={{ flex: 1, fontSize: 14, fontWeight: '600', color: DUO.text, writingDirection: 'rtl', textAlign: 'right', flexShrink: 1 }}
                maxFontSizeMultiplier={1.15}
              >
                {opt}
              </Text>
              {total > 0 && (
                <Text style={{ fontSize: 13, fontWeight: '900', color: i === 0 ? DUO.blue : DUO.green }} maxFontSizeMultiplier={1.15}>
                  {pct}%
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
