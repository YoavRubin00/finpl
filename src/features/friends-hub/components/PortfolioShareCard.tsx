import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeOut,
  useReducedMotion,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { Heart, MessageCircle, Send, ChevronDown, ShieldCheck, ScrollText, Plus } from 'lucide-react-native';
import { FANTASY, F2_SECTORS, type FantasySectorId } from '../../../constants/theme';
import { tapHaptic } from '../../../utils/haptics';
import { AvatarImage } from '../../avatars/AvatarImage';
import { useAuthStore } from '../../auth/useAuthStore';
import { usePortfolioShareStore } from '../../portfolio-share/usePortfolioShareStore';
import { moderateWithSharkBot } from '../../moderation/sharkModeratorBot';
import { PortfolioComposerModal } from '../../portfolio-share/PortfolioComposerModal';
import type {
  SharedPick,
  SharedPortfolio,
  PortfolioComment,
} from '../../portfolio-share/portfolioShareTypes';

const TEXT_PRIMARY = '#1f2937';
const TEXT_MUTED = '#6b7280';
// C1 (a11y): darkened #9ca3af → #6b7280 so info-bearing meta text (allocation %,
// timestamps, day X/5, labels, placeholder) passes WCAG AA (~4.8:1 on white).
const TEXT_FAINT = '#6b7280';
const FEED_BG = '#f3f4f6';

const NUM_STYLE = { fontVariant: ['tabular-nums' as const] };
const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

type TierKey = 'silver' | 'gold' | 'diamond';
const TIER_META: Record<TierKey, { label: string; emoji: string; color: string; bg: string }> = {
  silver:  { label: 'ליגת הכסף',     emoji: '🥈', color: '#475569', bg: '#f1f5f9' },
  gold:    { label: 'ליגת הזהב',     emoji: '🥇', color: '#a16207', bg: '#fef9c3' },
  diamond: { label: 'ליגת היהלומים', emoji: '💎', color: '#0e7490', bg: '#cffafe' },
};

function sectorColor(sector: FantasySectorId): string {
  return (F2_SECTORS[sector] ?? F2_SECTORS.tech).g1;
}

// ─── Atoms ──────────────────────────────────────────────────────────────────
function TierChip({ tier }: { tier: TierKey }): React.ReactElement {
  const t = TIER_META[tier];
  return (
    <View style={{
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 3,
      backgroundColor: t.bg,
      paddingVertical: 2,
      paddingHorizontal: 7,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: `${t.color}33`,
    }}>
      <Text style={{ fontSize: 10 }}>{t.emoji}</Text>
      <Text style={{ fontSize: 9, fontWeight: '900', color: t.color, letterSpacing: 0.2 }}>
        {t.label}
      </Text>
    </View>
  );
}

function PickPill({ pick }: { pick: SharedPick }): React.ReactElement {
  const sector = F2_SECTORS[pick.sector] ?? F2_SECTORS.tech;
  const positive = pick.weeklyChange >= 0;
  return (
    <View style={{ alignItems: 'center', gap: 4, minWidth: 56 }}>
      <View style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden' }}>
        <LinearGradient
          colors={[sector.g1, sector.g2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: pick.isLeverage ? 2 : 0,
            borderColor: '#facc15',
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '900', color: '#fff', letterSpacing: 0.2 }}>
            {pick.ticker}
          </Text>
          {pick.isLeverage && (
            <Text style={{ fontSize: 7, fontWeight: '900', color: '#fff', opacity: 0.9, marginTop: 1 }}>
              ×2
            </Text>
          )}
        </LinearGradient>
      </View>
      <Text style={[
        {
          fontSize: 10,
          fontWeight: '900',
          color: positive ? FANTASY.positiveDark : FANTASY.negativeDark,
        },
        NUM_STYLE,
      ]}>
        {positive ? '+' : ''}{pick.weeklyChange.toFixed(1)}%
      </Text>
      <Text style={[
        { fontSize: 9, fontWeight: '700', color: TEXT_FAINT },
        NUM_STYLE,
      ]}>
        {pick.allocationPct}%
      </Text>
    </View>
  );
}

/** Stacked bar: how much of the portfolio each holding really takes. */
function AllocationStackBar({ picks }: { picks: SharedPick[] }): React.ReactElement {
  return (
    <View style={{ gap: 5, marginTop: 10, paddingHorizontal: 6 }}>
      <View style={{ height: 14, borderRadius: 7, overflow: 'hidden', flexDirection: 'row-reverse', backgroundColor: '#e5e7eb' }}>
        {picks.map((p) => (
          <View
            key={p.ticker}
            style={{
              width: `${p.allocationPct}%`,
              backgroundColor: sectorColor(p.sector),
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {p.allocationPct >= 14 && (
              <Text style={{ fontSize: 7, fontWeight: '900', color: '#ffffff' }} numberOfLines={1}>
                {p.allocationPct}%
              </Text>
            )}
          </View>
        ))}
      </View>
      {/* Legend */}
      <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
        {picks.map((p) => (
          <View key={p.ticker} style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 3 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: sectorColor(p.sector) }} />
            <Text style={[{ fontSize: 9, fontWeight: '800', color: TEXT_MUTED }, NUM_STYLE]}>
              {p.ticker} {p.allocationPct}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function CommentRow({ comment }: { comment: PortfolioComment }): React.ReactElement {
  return (
    <View style={{ flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 8, marginTop: 8 }}>
      <AvatarImage avatarId={comment.avatarId} size={26} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{
          backgroundColor: FEED_BG,
          borderRadius: 14,
          paddingVertical: 6,
          paddingHorizontal: 10,
        }}>
          <Text style={{ fontSize: 11, fontWeight: '900', color: TEXT_PRIMARY, ...RTL }} numberOfLines={1}>
            {comment.author}
          </Text>
          <Text style={{ fontSize: 12, color: TEXT_PRIMARY, ...RTL, lineHeight: 17, marginTop: 1 }}>
            {comment.text}
          </Text>
        </View>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingHorizontal: 10, marginTop: 3 }}>
          <Text style={{ fontSize: 10, color: TEXT_FAINT, fontWeight: '700' }}>
            {comment.ago}
          </Text>
          {comment.likes > 0 && (
            <Text style={{ fontSize: 10, color: TEXT_MUTED, fontWeight: '800' }}>אהבתי · {comment.likes}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Portfolio post ─────────────────────────────────────────────────────────
function PortfolioPost({ pf }: { pf: SharedPortfolio }): React.ReactElement {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState('');
  const toggleLike = usePortfolioShareStore((s) => s.toggleLike);
  const addComment = usePortfolioShareStore((s) => s.addComment);
  const myAvatarId = useAuthStore((s) => s.profile?.avatarId ?? null);

  const reduced = useReducedMotion();
  const likeScale = useSharedValue(1);
  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: likeScale.value }] }));

  const positive = pf.totalReturn >= 0;
  const visibleComments = expanded ? pf.comments : pf.comments.slice(0, 1);

  const onLikePress = (): void => {
    const willLike = !pf.likedBySelf;
    tapHaptic();
    toggleLike(pf.id);
    // Juice: a spring pop only when adding a like, and only if motion is allowed.
    if (willLike && !reduced) {
      likeScale.value = withSequence(
        withSpring(1.35, { damping: 6, stiffness: 260 }),
        withSpring(1, { damping: 9, stiffness: 220 }),
      );
    }
  };

  const submitComment = (): void => {
    if (!draft.trim()) return;
    tapHaptic();
    addComment(pf.id, draft, myAvatarId);
    setDraft('');
    setExpanded(true);
  };

  return (
    <View style={{ backgroundColor: '#fff', paddingVertical: 12 }}>
      {/* Header: avatar + name + tier + return */}
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingHorizontal: 14 }}>
        <AvatarImage avatarId={pf.avatarId} size={38} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 13, fontWeight: '900', color: TEXT_PRIMARY, ...RTL }} numberOfLines={1}>
            {pf.author}{pf.isSelf ? ' (אני)' : ''}
          </Text>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <TierChip tier={pf.tier} />
            <Text style={{ fontSize: 10, color: TEXT_FAINT, fontWeight: '700' }}>
              · יום {pf.weekDay}/5
            </Text>
          </View>
        </View>
        <View style={{
          backgroundColor: positive ? FANTASY.positiveSoft : FANTASY.negativeSoft,
          borderWidth: 1,
          borderColor: positive ? FANTASY.positiveStroke : FANTASY.negativeStroke,
          paddingVertical: 5,
          paddingHorizontal: 10,
          borderRadius: 10,
          alignItems: 'center',
        }}>
          <Text style={{ fontSize: 8, fontWeight: '900', color: TEXT_FAINT, letterSpacing: 0.6, textTransform: 'uppercase' }}>
            תשואה
          </Text>
          <Text style={[
            {
              fontSize: 16,
              fontWeight: '900',
              color: positive ? FANTASY.positiveDark : FANTASY.negativeDark,
              lineHeight: 17,
            },
            NUM_STYLE,
          ]}>
            {positive ? '+' : ''}{pf.totalReturn.toFixed(2)}%
          </Text>
        </View>
      </View>

      {/* Caption */}
      {pf.caption.length > 0 && (
        <Text style={{
          fontSize: 13,
          color: TEXT_PRIMARY,
          ...RTL,
          lineHeight: 19,
          paddingHorizontal: 14,
          marginTop: 10,
        }}>
          {pf.caption}
        </Text>
      )}

      {/* Portfolio snapshot: pick pills + allocation stack */}
      <View style={{ marginTop: 12, marginHorizontal: 14 }}>
        <LinearGradient
          colors={['#f8fafc', '#ffffff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            borderRadius: 14,
            borderWidth: 1,
            borderColor: '#e5e7eb',
            paddingVertical: 12,
            paddingHorizontal: 8,
          }}
        >
          <Text style={{
            fontSize: 9,
            fontWeight: '900',
            color: TEXT_FAINT,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            ...RTL,
            paddingHorizontal: 6,
            marginBottom: 8,
          }}>
            התיק של {pf.author}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ flexDirection: 'row-reverse', paddingHorizontal: 4, gap: 10 }}
          >
            {pf.picks.map((pick) => (
              <PickPill key={pick.ticker} pick={pick} />
            ))}
          </ScrollView>
          <AllocationStackBar picks={pf.picks} />
        </LinearGradient>
      </View>

      {/* Like / comment counts */}
      <View style={{
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        marginTop: 10,
      }}>
        {/* C13: read as one node "N אהבו" (heart is decorative). */}
        <View
          style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}
          accessible
          accessibilityRole="text"
          accessibilityLabel={`${pf.likes} אהבו`}
        >
          <View style={{
            width: 16, height: 16, borderRadius: 8,
            backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center',
          }}>
            <Heart size={9} color="#fff" fill="#fff" strokeWidth={2.5} />
          </View>
          <Text style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: '700' }}>
            {pf.likes}
          </Text>
        </View>
        <Text style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: '700' }}>
          {pf.comments.length} תגובות
        </Text>
      </View>

      {/* Action bar */}
      <View style={{
        flexDirection: 'row-reverse',
        marginHorizontal: 14,
        marginTop: 6,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        paddingTop: 6,
      }}>
        <Pressable
          onPress={onLikePress}
          accessibilityRole="button"
          accessibilityLabel="אהבתי"
          accessibilityState={{ selected: pf.likedBySelf }}
          hitSlop={{ top: 8, bottom: 8 }}
          style={({ pressed }) => ({
            flex: 1,
            flexDirection: 'row-reverse',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            paddingVertical: 8,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Animated.View style={heartStyle}>
            <Heart
              size={16}
              color={pf.likedBySelf ? '#ef4444' : TEXT_MUTED}
              fill={pf.likedBySelf ? '#ef4444' : 'transparent'}
              strokeWidth={2}
            />
          </Animated.View>
          <Text style={{
            fontSize: 12,
            fontWeight: '800',
            color: pf.likedBySelf ? '#ef4444' : TEXT_MUTED,
          }}>
            אהבתי
          </Text>
        </Pressable>
        <Pressable
          onPress={() => { tapHaptic(); setExpanded((v) => !v); }}
          accessibilityRole="button"
          accessibilityLabel="הגב"
          hitSlop={{ top: 8, bottom: 8 }}
          style={({ pressed }) => ({
            flex: 1,
            flexDirection: 'row-reverse',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            paddingVertical: 8,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <MessageCircle size={16} color={TEXT_MUTED} strokeWidth={2} />
          <Text style={{ fontSize: 12, fontWeight: '800', color: TEXT_MUTED }}>הגב</Text>
        </Pressable>
      </View>

      {/* Comments */}
      <View style={{ paddingHorizontal: 14 }}>
        {visibleComments.map((comment) => (
          <CommentRow key={comment.id} comment={comment} />
        ))}
        {!expanded && pf.comments.length > 1 && (
          <Pressable
            onPress={() => setExpanded(true)}
            style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 8 }}
            hitSlop={6}
          >
            <Text style={{ fontSize: 11, fontWeight: '900', color: TEXT_MUTED }}>
              צפה בעוד {pf.comments.length - 1} תגובות
            </Text>
            <ChevronDown size={12} color={TEXT_MUTED} strokeWidth={2.5} />
          </Pressable>
        )}
      </View>

      {/* Comment composer */}
      <View style={{
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
        marginTop: 10,
      }}>
        <AvatarImage avatarId={myAvatarId} size={26} />
        <View style={{
          flex: 1,
          backgroundColor: FEED_BG,
          borderRadius: 999,
          paddingVertical: 7,
          paddingHorizontal: 12,
          flexDirection: 'row-reverse',
          alignItems: 'center',
          gap: 8,
        }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="כתבו תגובה…"
            placeholderTextColor={TEXT_FAINT}
            accessibilityLabel="כתבו תגובה"
            onSubmitEditing={submitComment}
            style={{
              flex: 1,
              fontSize: 12,
              color: TEXT_PRIMARY,
              textAlign: 'right',
              writingDirection: 'rtl',
              padding: 0,
            }}
          />
          {draft.length > 0 && (
            <Pressable
              onPress={submitComment}
              accessibilityRole="button"
              accessibilityLabel="שלח תגובה"
              hitSlop={8}
            >
              <Send size={14} color="#1877f2" strokeWidth={2.4} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Main card ──────────────────────────────────────────────────────────────
export function PortfolioShareCard(): React.ReactElement {
  const portfolios = usePortfolioShareStore((s) => s.portfolios);
  const sharePortfolio = usePortfolioShareStore((s) => s.sharePortfolio);
  // A7: count of REAL reactions from others on the user's own shared portfolios
  // (primitive — reactive & safe under zustand v5, no useShallow needed).
  const selfReactions = usePortfolioShareStore((s) => s.getSelfReactionCount());
  const displayName = useAuthStore((s) => s.displayName);
  const myAvatarId = useAuthStore((s) => s.profile?.avatarId ?? null);
  const reduced = useReducedMotion();

  const reactionLabel =
    selfReactions === 1
      ? 'מישהו הגיב לתיק שלך'
      : `${selfReactions} אנשים הגיבו לתיק שלך`;

  const [composerOpen, setComposerOpen] = useState(false);
  const [rewardToast, setRewardToast] = useState<number | null>(null);
  const [moderationNote, setModerationNote] = useState<string | null>(null);

  // Honest-data policy (2026-07-02): only REAL user-generated portfolios are
  // shown — the seeded demo portfolios (fabricated authors, invented returns,
  // fake likes) are filtered out. Real content the user created stays.
  const feed = portfolios
    .filter((pf) => pf.isSelf)
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  const handleShare = async (picks: SharedPick[], caption: string): Promise<void> => {
    // Shark moderator bot reviews the caption before it hits the feed.
    if (caption.trim().length > 0) {
      const verdict = await moderateWithSharkBot(caption);
      if (!verdict.ok) {
        setModerationNote(verdict.reason ?? 'הכיתוב לא עבר את קפטן שארק. נסו ניסוח אחר.');
        setTimeout(() => setModerationNote(null), 4000);
        return;
      }
    }
    const { rewardCoins } = sharePortfolio({
      picks,
      caption,
      authorName: displayName?.trim() ? displayName : 'אני',
      avatarId: myAvatarId,
    });
    if (rewardCoins > 0) {
      setRewardToast(rewardCoins);
      setTimeout(() => setRewardToast(null), 3200);
    }
  };

  return (
    <View style={{ backgroundColor: '#fff' }}>
      {/* Header + add-portfolio CTA */}
      <View style={{
        paddingHorizontal: 14,
        paddingTop: 14,
        paddingBottom: 4,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
      }}>
        <View style={{
          width: 36, height: 36, borderRadius: 10,
          backgroundColor: FANTASY.primaryTint,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <ScrollText size={18} color={FANTASY.primary} strokeWidth={2.4} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '900', color: TEXT_PRIMARY, ...RTL }}>
            תיקי השקעות מהקהילה
          </Text>
          <Text style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: '700', ...RTL, marginTop: 1 }}>
            הרכיבו תיק, שתפו — והקהילה תגיב
          </Text>
        </View>
        <Pressable
          onPress={() => { tapHaptic(); setComposerOpen(true); }}
          accessibilityRole="button"
          accessibilityLabel="הוסיפו תיק השקעות"
          style={({ pressed }) => ({
            borderRadius: 999,
            opacity: pressed ? 0.9 : 1,
            shadowColor: '#3b82f6',
            shadowOpacity: 0.35,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 3 },
            elevation: 5,
          })}
        >
          <LinearGradient
            colors={['#93c5fd', '#3b82f6', '#1d4ed8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              flexDirection: 'row-reverse',
              alignItems: 'center',
              gap: 4,
              borderRadius: 999,
              borderWidth: 1.5,
              borderColor: '#bfdbfe',
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Plus size={14} color="#ffffff" strokeWidth={3} />
            <Text
              style={{ fontSize: 12, fontWeight: '900', color: '#ffffff', flexShrink: 1 }}
              maxFontSizeMultiplier={1.15}
            >
              הוסיפו תיק
            </Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* A7 — REAL reactions from others on YOUR shared portfolio. Silent until
          someone genuinely reacts (selfReactions is 0 by design when there are
          no real cross-user interactions — no fabricated activity). */}
      {selfReactions > 0 && (
        <Animated.View
          entering={reduced ? undefined : FadeInDown.duration(240)}
          accessibilityLiveRegion="polite"
          accessibilityRole="text"
          accessibilityLabel={reactionLabel}
          style={{
            marginHorizontal: 14,
            marginTop: 8,
            flexDirection: 'row-reverse',
            alignItems: 'center',
            gap: 8,
            backgroundColor: '#fef2f2',
            borderWidth: 1,
            borderColor: '#fecaca',
            borderRadius: 12,
            paddingVertical: 9,
            paddingHorizontal: 12,
          }}
        >
          <View style={{
            width: 22, height: 22, borderRadius: 11,
            backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center',
          }}>
            <Heart size={12} color="#fff" fill="#fff" strokeWidth={2.5} />
          </View>
          <Text style={{ fontSize: 13, fontWeight: '900', color: '#b91c1c', flex: 1, ...RTL }}>
            {reactionLabel}
          </Text>
        </Animated.View>
      )}

      {/* Moderation note */}
      {moderationNote && (
        <Animated.View
          entering={FadeInDown.duration(220)}
          exiting={FadeOut.duration(220)}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={{
            marginHorizontal: 14,
            marginTop: 8,
            backgroundColor: '#fff7ed',
            borderWidth: 1,
            borderColor: '#fdba74',
            borderRadius: 12,
            paddingVertical: 8,
            paddingHorizontal: 12,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#c2410c', ...RTL }}>
            {moderationNote}
          </Text>
        </Animated.View>
      )}

      {/* Share reward toast */}
      {rewardToast && (
        <Animated.View
          entering={FadeInDown.duration(220)}
          exiting={FadeOut.duration(220)}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={{
            marginHorizontal: 14,
            marginTop: 8,
            backgroundColor: '#dcfce7',
            borderWidth: 1,
            borderColor: '#86efac',
            borderRadius: 12,
            paddingVertical: 8,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '900', color: '#15803d' }}>
            התיק שותף! +{rewardToast} מטבעות
          </Text>
        </Animated.View>
      )}

      {/* Posts — real user content only */}
      {feed.length === 0 ? (
        <View style={{ paddingHorizontal: 14, paddingVertical: 20, alignItems: 'center', gap: 12 }}>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 14, fontWeight: '900', color: TEXT_PRIMARY, ...RTL }} maxFontSizeMultiplier={1.15}>
              עוד אין תיקים משותפים
            </Text>
            <Text style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: '600', textAlign: 'center', writingDirection: 'rtl' }} maxFontSizeMultiplier={1.15}>
              הרכיבו תיק ראשון — והקהילה תגיב
            </Text>
          </View>
          {/* Prominent entry — the header chip is easy to miss, so the empty
              state gets its own full CTA that opens the portfolio builder. */}
          <Pressable
            onPress={() => { tapHaptic(); setComposerOpen(true); }}
            accessibilityRole="button"
            accessibilityLabel="הרכיבו תיק השקעות ושתפו"
            style={({ pressed }) => ({
              alignSelf: 'stretch',
              borderRadius: 14,
              opacity: pressed ? 0.92 : 1,
              shadowColor: '#3b82f6',
              shadowOpacity: 0.35,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            })}
          >
            <LinearGradient
              colors={['#93c5fd', '#3b82f6', '#1d4ed8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flexDirection: 'row-reverse',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: '#bfdbfe',
                paddingVertical: 13,
                paddingHorizontal: 16,
              }}
            >
              <Plus size={16} color="#ffffff" strokeWidth={3} />
              <Text
                style={{ fontSize: 14, fontWeight: '900', color: '#ffffff', flexShrink: 1 }}
                maxFontSizeMultiplier={1.15}
              >
                הרכיבו תיק ושתפו
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      ) : (
        feed.map((pf, i) => (
          <React.Fragment key={pf.id}>
            {i > 0 && <View style={{ height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 14 }} />}
            <PortfolioPost pf={pf} />
          </React.Fragment>
        ))
      )}

      {/* Legal disclaimer */}
      <View style={{
        backgroundColor: '#fef2f2',
        borderTopWidth: 1,
        borderTopColor: '#fee2e2',
        paddingVertical: 10,
        paddingHorizontal: 14,
        flexDirection: 'row-reverse',
        alignItems: 'flex-start',
        gap: 8,
      }}>
        <ShieldCheck size={14} color="#b91c1c" strokeWidth={2.4} style={{ marginTop: 1 }} />
        <Text style={{
          flex: 1,
          fontSize: 10,
          color: '#7f1d1d',
          fontWeight: '700',
          lineHeight: 15,
          ...RTL,
        }}>
          התוכן בעמוד זה אינו מהווה ייעוץ השקעות, שיווק השקעות או תחליף לכזה. השיתוף נועד למטרות בידור וקהילה
          במסגרת משחק הפנטזי-ליג בלבד, ואינו מבוסס על נתונים אישיים שלך. כל החלטת השקעה היא באחריותך — היוועץ
          עם בעל רישיון מוסמך לפני ביצוע פעולה אמיתית בשוק ההון.
        </Text>
      </View>

      <PortfolioComposerModal
        visible={composerOpen}
        onClose={() => setComposerOpen(false)}
        onShare={handleShare}
      />
    </View>
  );
}