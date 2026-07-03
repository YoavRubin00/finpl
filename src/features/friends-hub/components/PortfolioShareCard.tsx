import React, { useState, useEffect, useCallback } from 'react';
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
import { Heart, MessageCircle, Send, ChevronDown, ShieldCheck, ScrollText, Plus, Star } from 'lucide-react-native';
import { FANTASY, F2_SECTORS, type FantasySectorId } from '../../../constants/theme';
import { tapHaptic, successHaptic } from '../../../utils/haptics';
import { track } from '../../../lib/analytics/events';
import { AvatarImage } from '../../avatars/AvatarImage';
import { useAuthStore } from '../../auth/useAuthStore';
import { usePortfolioShareStore } from '../../portfolio-share/usePortfolioShareStore';
import { moderateWithSharkBot } from '../../moderation/sharkModeratorBot';
import { requestGuestGate } from '../../auth/guestValueGate';
import { PortfolioComposerModal } from '../../portfolio-share/PortfolioComposerModal';
import type { SharedPick } from '../../portfolio-share/portfolioShareTypes';
import type { RatedPortfolio, RatedPick, RatedComment } from '../../../db/sync/syncPortfolioShare';

const TEXT_PRIMARY = '#1f2937';
const TEXT_MUTED = '#6b7280';
const TEXT_FAINT = '#6b7280';
const FEED_BG = '#f3f4f6';
const STAR_GOLD = '#f59e0b';

const NUM_STYLE = { fontVariant: ['tabular-nums' as const] };
const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

function timeAgo(iso: string): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return 'עכשיו';
  if (min < 60) return `לפני ${min} ד׳`;
  const h = Math.floor(min / 60);
  if (h < 24) return `לפני ${h} ש׳`;
  return `לפני ${Math.floor(h / 24)} ימ׳`;
}

function sectorColor(sector: FantasySectorId): string {
  return (F2_SECTORS[sector] ?? F2_SECTORS.tech).g1;
}

// ─── Atoms ──────────────────────────────────────────────────────────────────
function PickPill({ pick }: { pick: RatedPick }): React.ReactElement {
  const sector = F2_SECTORS[pick.sector] ?? F2_SECTORS.tech;
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
            <Text style={{ fontSize: 7, fontWeight: '900', color: '#fff', opacity: 0.9, marginTop: 1 }}>×2</Text>
          )}
        </LinearGradient>
      </View>
      <Text style={[{ fontSize: 9, fontWeight: '700', color: TEXT_FAINT }, NUM_STYLE]}>
        {pick.allocationPct}%
      </Text>
    </View>
  );
}

function AllocationStackBar({ picks }: { picks: RatedPick[] }): React.ReactElement {
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

/** Read-only community average — app-store style (numeric + filled stars). */
function StarDisplay({ avg, count }: { avg: number; count: number }): React.ReactElement {
  const rounded = Math.round(avg);
  return (
    <View
      style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`דירוג ממוצע ${avg.toFixed(1)} מתוך 5, ${count} דירוגים`}
    >
      <Text style={[{ fontSize: 15, fontWeight: '900', color: STAR_GOLD }, NUM_STYLE]}>{avg.toFixed(1)}</Text>
      <View style={{ flexDirection: 'row-reverse', gap: 1 }} importantForAccessibility="no-hide-descendants">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} size={15} color={STAR_GOLD} fill={i <= rounded ? STAR_GOLD : 'transparent'} strokeWidth={2} />
        ))}
      </View>
      <Text style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: '700' }}>
        · {count === 1 ? 'דירוג אחד' : `${count} דירוגים`}
      </Text>
    </View>
  );
}

/** Interactive 1-5 star rater (others' portfolios). */
function StarRate({ value, onRate }: { value: number | null; onRate: (n: number) => void }): React.ReactElement {
  return (
    <View style={{ flexDirection: 'row-reverse', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable key={i} onPress={() => onRate(i)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`דרגו ${i} כוכבים`}>
          <Star size={26} color={STAR_GOLD} fill={value != null && i <= value ? STAR_GOLD : 'transparent'} strokeWidth={2} />
        </Pressable>
      ))}
    </View>
  );
}

function CommentRow({ comment }: { comment: RatedComment }): React.ReactElement {
  return (
    <View style={{ flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 8, marginTop: 8 }}>
      <AvatarImage avatarId={comment.authorAvatarId} size={26} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ backgroundColor: FEED_BG, borderRadius: 14, paddingVertical: 6, paddingHorizontal: 10 }}>
          <Text style={{ fontSize: 11, fontWeight: '900', color: TEXT_PRIMARY, ...RTL }} numberOfLines={1}>
            {comment.authorName}{comment.isSelf ? ' (אני)' : ''}
          </Text>
          <Text style={{ fontSize: 12, color: TEXT_PRIMARY, ...RTL, lineHeight: 17, marginTop: 1 }}>
            {comment.body}
          </Text>
        </View>
        <Text style={{ fontSize: 10, color: TEXT_FAINT, fontWeight: '700', paddingHorizontal: 10, marginTop: 3 }}>
          {timeAgo(comment.createdAt)}
        </Text>
      </View>
    </View>
  );
}

// ─── Portfolio post ─────────────────────────────────────────────────────────
function PortfolioPost({
  pf,
  onRewardCoins,
}: {
  pf: RatedPortfolio;
  onRewardCoins: (coins: number) => void;
}): React.ReactElement {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState('');
  const rate = usePortfolioShareStore((s) => s.rate);
  const toggleLike = usePortfolioShareStore((s) => s.toggleLike);
  const addComment = usePortfolioShareStore((s) => s.addComment);
  const displayName = useAuthStore((s) => s.displayName);
  const myAvatarId = useAuthStore((s) => s.profile?.avatarId ?? null);
  const isGuest = !useAuthStore((s) => s.email);

  const reduced = useReducedMotion();
  const likeScale = useSharedValue(1);
  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: likeScale.value }] }));

  const visibleComments = expanded ? pf.comments : pf.comments.slice(0, 1);

  const onRate = useCallback(
    (stars: number) => {
      if (isGuest) { requestGuestGate('portfolio_rate'); return; }
      successHaptic();
      void (async () => {
        const res = await rate(pf.id, stars);
        try { track({ name: 'portfolio_rated', props: { stars } }); } catch { /* non-fatal */ }
        if (res && res.rewardCoins > 0) onRewardCoins(res.rewardCoins);
      })();
    },
    [pf.id, isGuest, rate, onRewardCoins],
  );

  const onLikePress = (): void => {
    if (isGuest) { requestGuestGate('portfolio_like'); return; }
    const willLike = !pf.likedByYou;
    tapHaptic();
    void toggleLike(pf.id);
    if (willLike && !reduced) {
      likeScale.value = withSequence(
        withSpring(1.35, { damping: 6, stiffness: 260 }),
        withSpring(1, { damping: 9, stiffness: 220 }),
      );
    }
  };

  const submitComment = (): void => {
    const text = draft.trim();
    if (!text) return;
    if (isGuest) { requestGuestGate('portfolio_comment'); return; }
    tapHaptic();
    setDraft('');
    setExpanded(true);
    void (async () => {
      const verdict = await moderateWithSharkBot(text);
      if (!verdict.ok) return; // Shark bot blocked it — silently drop (kept honest, no fake post)
      await addComment(pf.id, text, displayName?.trim() ? displayName : 'אני', myAvatarId);
    })();
  };

  return (
    <View style={{ backgroundColor: '#fff', paddingVertical: 12 }}>
      {/* Header: avatar + name + time */}
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingHorizontal: 14 }}>
        <AvatarImage avatarId={pf.authorAvatarId} size={38} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 13, fontWeight: '900', color: TEXT_PRIMARY, ...RTL }} numberOfLines={1}>
            {pf.authorName}{pf.isSelf ? ' (אני)' : ''}
          </Text>
          <Text style={{ fontSize: 10, color: TEXT_FAINT, fontWeight: '700', ...RTL, marginTop: 2 }}>
            {timeAgo(pf.createdAt)}
          </Text>
        </View>
      </View>

      {/* Caption */}
      {pf.caption.length > 0 && (
        <Text style={{ fontSize: 13, color: TEXT_PRIMARY, ...RTL, lineHeight: 19, paddingHorizontal: 14, marginTop: 10 }}>
          {pf.caption}
        </Text>
      )}

      {/* Portfolio snapshot */}
      <View style={{ marginTop: 12, marginHorizontal: 14 }}>
        <LinearGradient
          colors={['#f8fafc', '#ffffff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', paddingVertical: 12, paddingHorizontal: 8 }}
        >
          <Text style={{ fontSize: 9, fontWeight: '900', color: TEXT_FAINT, letterSpacing: 0.8, textTransform: 'uppercase', ...RTL, paddingHorizontal: 6, marginBottom: 8 }}>
            התיק של {pf.authorName}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row-reverse', paddingHorizontal: 4, gap: 10 }}>
            {pf.picks.map((pick) => (
              <PickPill key={pick.ticker} pick={pick} />
            ))}
          </ScrollView>
          <AllocationStackBar picks={pf.picks} />
        </LinearGradient>
      </View>

      {/* Rating — real community average + your 1-5 stars */}
      <View style={{ paddingHorizontal: 14, marginTop: 12, gap: 8 }}>
        {pf.ratingCount > 0 && <StarDisplay avg={pf.ratingAvg ?? 0} count={pf.ratingCount} />}
        {!pf.isSelf ? (
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: TEXT_MUTED }}>
              {pf.yourRating != null
                ? 'הדירוג שלך:'
                : pf.ratingCount === 0
                  ? 'עדיין אין דירוגים · היו הראשונים לדרג:'
                  : 'דרגו את התיק:'}
            </Text>
            <StarRate value={pf.yourRating} onRate={onRate} />
          </View>
        ) : (
          pf.ratingCount === 0 && (
            <Text style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: '700', ...RTL }}>
              עדיין אין דירוגים לתיק שלך
            </Text>
          )
        )}
      </View>

      {/* Like / comment counts */}
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, marginTop: 12 }}>
        {pf.likeCount > 0 ? (
          <View
            style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}
            accessible
            accessibilityRole="text"
            accessibilityLabel={`${pf.likeCount} אהבו`}
          >
            <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' }}>
              <Heart size={9} color="#fff" fill="#fff" strokeWidth={2.5} />
            </View>
            <Text style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: '700' }}>{pf.likeCount}</Text>
          </View>
        ) : <View />}
        {pf.commentCount > 0 ? (
          <Text style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: '700' }}>{pf.commentCount} תגובות</Text>
        ) : null}
      </View>

      {/* Action bar */}
      <View style={{ flexDirection: 'row-reverse', marginHorizontal: 14, marginTop: 6, borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 6 }}>
        <Pressable
          onPress={onLikePress}
          accessibilityRole="button"
          accessibilityLabel="אהבתי"
          accessibilityState={{ selected: pf.likedByYou }}
          hitSlop={{ top: 8, bottom: 8 }}
          style={({ pressed }) => ({ flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, opacity: pressed ? 0.6 : 1 })}
        >
          <Animated.View style={heartStyle}>
            <Heart size={16} color={pf.likedByYou ? '#ef4444' : TEXT_MUTED} fill={pf.likedByYou ? '#ef4444' : 'transparent'} strokeWidth={2} />
          </Animated.View>
          <Text style={{ fontSize: 12, fontWeight: '800', color: pf.likedByYou ? '#ef4444' : TEXT_MUTED }}>אהבתי</Text>
        </Pressable>
        <Pressable
          onPress={() => { tapHaptic(); setExpanded((v) => !v); }}
          accessibilityRole="button"
          accessibilityLabel="הגב"
          hitSlop={{ top: 8, bottom: 8 }}
          style={({ pressed }) => ({ flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, opacity: pressed ? 0.6 : 1 })}
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
          <Pressable onPress={() => setExpanded(true)} style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 8 }} hitSlop={6}>
            <Text style={{ fontSize: 11, fontWeight: '900', color: TEXT_MUTED }}>צפו בעוד {pf.comments.length - 1} תגובות</Text>
            <ChevronDown size={12} color={TEXT_MUTED} strokeWidth={2.5} />
          </Pressable>
        )}
      </View>

      {/* Comment composer */}
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingHorizontal: 14, marginTop: 10 }}>
        <AvatarImage avatarId={myAvatarId} size={26} />
        <View style={{ flex: 1, backgroundColor: FEED_BG, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="כתבו תגובה…"
            placeholderTextColor={TEXT_FAINT}
            accessibilityLabel="כתבו תגובה"
            onSubmitEditing={submitComment}
            maxLength={300}
            style={{ flex: 1, fontSize: 12, color: TEXT_PRIMARY, textAlign: 'right', writingDirection: 'rtl', padding: 0 }}
          />
          {draft.length > 0 && (
            <Pressable onPress={submitComment} accessibilityRole="button" accessibilityLabel="שלחו תגובה" hitSlop={8}>
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
  const loaded = usePortfolioShareStore((s) => s.loaded);
  const refresh = usePortfolioShareStore((s) => s.refresh);
  const share = usePortfolioShareStore((s) => s.share);
  const displayName = useAuthStore((s) => s.displayName);
  const myAvatarId = useAuthStore((s) => s.profile?.avatarId ?? null);
  const isGuest = !useAuthStore((s) => s.email);
  const reduced = useReducedMotion();

  const [composerOpen, setComposerOpen] = useState(false);
  const [rewardToast, setRewardToast] = useState<string | null>(null);
  const [moderationNote, setModerationNote] = useState<string | null>(null);

  // Pull the real feed on mount (and when auth changes the caller identity).
  useEffect(() => {
    void refresh();
  }, [refresh, isGuest]);

  useEffect(() => {
    if (loaded) {
      try { track({ name: 'pf_feed_viewed', props: { count: portfolios.length } }); } catch { /* non-fatal */ }
    }
    // Only once per load transition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const showReward = useCallback((coins: number, prefix: string) => {
    setRewardToast(`${prefix} +${coins} מטבעות`);
    setTimeout(() => setRewardToast(null), 3200);
  }, []);

  const handleShare = async (picks: SharedPick[], caption: string): Promise<void> => {
    if (isGuest) { requestGuestGate('portfolio_share'); return; }
    if (caption.trim().length > 0) {
      const verdict = await moderateWithSharkBot(caption);
      if (!verdict.ok) {
        setModerationNote(verdict.reason ?? 'הכיתוב לא עבר את קפטן שארק. נסו ניסוח אחר.');
        setTimeout(() => setModerationNote(null), 4000);
        return;
      }
    }
    const { portfolio, rewardCoins } = await share({
      picks,
      caption,
      displayName: displayName?.trim() ? displayName : 'אני',
      avatarId: myAvatarId,
    });
    if (portfolio) {
      try { track({ name: 'portfolio_shared_server', props: { picks: picks.length } }); } catch { /* non-fatal */ }
    }
    if (rewardCoins > 0) showReward(rewardCoins, 'התיק שותף!');
  };

  return (
    <View style={{ backgroundColor: '#fff' }}>
      {/* Header + add-portfolio CTA */}
      <View style={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: FANTASY.primaryTint, alignItems: 'center', justifyContent: 'center' }}>
          <ScrollText size={18} color={FANTASY.primary} strokeWidth={2.4} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '900', color: TEXT_PRIMARY, ...RTL }}>תיקי השקעות מהקהילה</Text>
          <Text style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: '700', ...RTL, marginTop: 1 }}>
            הרכיבו תיק, שתפו — והקהילה תדרג ותגיב
          </Text>
        </View>
        <Pressable
          onPress={() => { tapHaptic(); setComposerOpen(true); }}
          accessibilityRole="button"
          accessibilityLabel="הוסיפו תיק השקעות"
          style={({ pressed }) => ({ borderRadius: 999, opacity: pressed ? 0.9 : 1, shadowColor: '#3b82f6', shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 5 })}
        >
          <LinearGradient
            colors={['#93c5fd', '#3b82f6', '#1d4ed8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4, borderRadius: 999, borderWidth: 1.5, borderColor: '#bfdbfe', paddingHorizontal: 12, paddingVertical: 8 }}
          >
            <Plus size={14} color="#ffffff" strokeWidth={3} />
            <Text style={{ fontSize: 12, fontWeight: '900', color: '#ffffff', flexShrink: 1 }} maxFontSizeMultiplier={1.15}>
              הוסיפו תיק
            </Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Moderation note */}
      {moderationNote && (
        <Animated.View
          entering={FadeInDown.duration(220)}
          exiting={FadeOut.duration(220)}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={{ marginHorizontal: 14, marginTop: 8, backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fdba74', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12 }}
        >
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#c2410c', ...RTL }}>{moderationNote}</Text>
        </Animated.View>
      )}

      {/* Reward toast (share or rate) */}
      {rewardToast && (
        <Animated.View
          entering={FadeInDown.duration(220)}
          exiting={FadeOut.duration(220)}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={{ marginHorizontal: 14, marginTop: 8, backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#86efac', borderRadius: 12, paddingVertical: 8, alignItems: 'center' }}
        >
          <Text style={{ fontSize: 13, fontWeight: '900', color: '#15803d' }}>{rewardToast}</Text>
        </Animated.View>
      )}

      {/* Posts — real community content only */}
      {portfolios.length === 0 ? (
        <View style={{ paddingHorizontal: 14, paddingVertical: 20, alignItems: 'center', gap: 12 }}>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 14, fontWeight: '900', color: TEXT_PRIMARY, ...RTL }} maxFontSizeMultiplier={1.15}>
              עוד אין תיקים משותפים
            </Text>
            <Text style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: '600', textAlign: 'center', writingDirection: 'rtl' }} maxFontSizeMultiplier={1.15}>
              הרכיבו תיק ראשון — והקהילה תדרג ותגיב
            </Text>
          </View>
          <Pressable
            onPress={() => { tapHaptic(); setComposerOpen(true); }}
            accessibilityRole="button"
            accessibilityLabel="הרכיבו תיק השקעות ושתפו"
            style={({ pressed }) => ({ alignSelf: 'stretch', borderRadius: 14, opacity: pressed ? 0.92 : 1, shadowColor: '#3b82f6', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 })}
          >
            <LinearGradient
              colors={['#93c5fd', '#3b82f6', '#1d4ed8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 14, borderWidth: 1.5, borderColor: '#bfdbfe', paddingVertical: 13, paddingHorizontal: 16 }}
            >
              <Plus size={16} color="#ffffff" strokeWidth={3} />
              <Text style={{ fontSize: 14, fontWeight: '900', color: '#ffffff', flexShrink: 1 }} maxFontSizeMultiplier={1.15}>
                הרכיבו תיק ושתפו
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      ) : (
        portfolios.map((pf, i) => (
          <React.Fragment key={pf.id}>
            {i > 0 && <View style={{ height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 14 }} />}
            <PortfolioPost pf={pf} onRewardCoins={(coins) => showReward(coins, 'דירגתם!')} />
          </React.Fragment>
        ))
      )}

      {/* Legal disclaimer */}
      <View style={{ backgroundColor: '#fef2f2', borderTopWidth: 1, borderTopColor: '#fee2e2', paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 8 }}>
        <ShieldCheck size={14} color="#b91c1c" strokeWidth={2.4} style={{ marginTop: 1 }} />
        <Text style={{ flex: 1, fontSize: 10, color: '#7f1d1d', fontWeight: '700', lineHeight: 15, ...RTL }}>
          התוכן בעמוד זה אינו מהווה ייעוץ השקעות, שיווק השקעות או תחליף לכזה. השיתוף נועד למטרות בידור וקהילה
          במסגרת משחק הפנטזי-ליג בלבד, ואינו מבוסס על נתונים אישיים שלך. כל החלטת השקעה היא באחריותך — היוועצו
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
