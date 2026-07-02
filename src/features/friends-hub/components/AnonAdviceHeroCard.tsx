import React, { useEffect, useMemo } from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  useReducedMotion,
  interpolate,
  FadeInDown,
} from 'react-native-reanimated';
import { UserRound, MessageCircle, Bell } from 'lucide-react-native';
import { useAnonAdviceStore } from '../../anon-advice/useAnonAdviceStore';
import {
  formatAnonLabel,
  REWARD_POST_COINS,
  REWARD_REPLY_COINS,
} from '../../anon-advice/anonAdviceData';
import { formatVoteCount } from '../lib/honestCounts';
import { GoldCoinIcon } from '../../../components/ui/GoldCoinIcon';
import { STITCH, DUO } from '../../../constants/theme';
import { tapHaptic, successHaptic } from '../../../utils/haptics';

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return 'כרגע';
  if (min < 60) return `לפני ${min} ד׳`;
  const h = Math.floor(min / 60);
  if (h < 24) return `לפני ${h} ש׳`;
  return `לפני ${Math.floor(h / 24)} ימ׳`;
}

/**
 * Premium CTA button — fantasy-league button language: gradient + border +
 * glow shadow + bold label + shimmer that respects reduced-motion.
 */
function PremiumCta({
  label,
  colors,
  glow,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  colors: readonly [string, string, ...string[]];
  glow: string;
  onPress: () => void;
  accessibilityLabel?: string;
}): React.ReactElement {
  const reduced = useReducedMotion();
  const shimmer = useSharedValue(0);
  useEffect(() => {
    if (reduced) {
      shimmer.value = 0;
      return;
    }
    shimmer.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [reduced, shimmer]);
  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0, 0.5, 0]),
    transform: [{ translateX: interpolate(shimmer.value, [0, 1], [-70, 70]) }],
  }));
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={8}
      style={({ pressed }) => ({
        borderRadius: 12,
        shadowColor: glow,
        shadowOpacity: 0.4,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 12,
          paddingVertical: 12,
          paddingHorizontal: 16,
          overflow: 'hidden',
          borderWidth: 1.5,
          borderColor: 'rgba(255,255,255,0.55)',
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', top: 0, bottom: 0, width: 70 }, shimmerStyle]}
        >
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.8)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Text
          maxFontSizeMultiplier={1.15}
          style={{ fontSize: 14, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl' }}
        >
          {label}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

export function AnonAdviceHeroCard(): React.ReactElement {
  const reduced = useReducedMotion();
  const rawPosts = useAnonAdviceStore((s) => s.posts);
  const unseenReplyPostIds = useAnonAdviceStore((s) => s.unseenReplyPostIds);
  const markRepliesSeen = useAnonAdviceStore((s) => s.markRepliesSeen);

  const { recent, total } = useMemo(() => {
    const approved = rawPosts.filter((p) => p.status === 'approved');
    const sorted = [...approved].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return { recent: sorted.slice(0, 2), total: approved.length };
  }, [rawPosts]);

  // Honest count — a number is shown ONLY once there are ≥100 real questions.
  // Below the threshold we show inviting copy with NO number (never a fake one).
  const countLabel = formatVoteCount(total);
  const isEmpty = total === 0;

  const subtitle = isEmpty
    ? 'עדיין אין שאלות פתוחות — היו הראשונים לשתף דילמה'
    : countLabel
      ? `תכל'ס, כולם לפעמים נתקעים · ${countLabel} שאלות פתוחות`
      : "תכל'ס, כולם לפעמים נתקעים. שתפו — מישהו יענה";

  const headerA11y = isEmpty
    ? 'ייעוץ אנונימי. היו הראשונים לשתף דילמה. לחצו לצפייה'
    : countLabel
      ? `ייעוץ אנונימי, ${countLabel} שאלות פתוחות. לחצו לצפייה בכולן`
      : 'ייעוץ אנונימי. לחצו לצפייה בשאלות הפתוחות';

  // A4 — the most-recent of the user's own posts that got a NEW inbound reply.
  // Dormant (null) until a real external reply exists — no fabricated nudge.
  const unseenReplyTarget =
    unseenReplyPostIds.length > 0 ? unseenReplyPostIds[unseenReplyPostIds.length - 1] : null;

  function openUnseenReply(): void {
    if (!unseenReplyTarget) return;
    successHaptic();
    markRepliesSeen(unseenReplyTarget);
    router.push(`/anon-advice/post/${unseenReplyTarget}` as never);
  }

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 14,
        backgroundColor: '#ffffff',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: STITCH.surfaceHighest,
        overflow: 'hidden',
        shadowColor: '#3e3c8f',
        shadowOpacity: 0.09,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
      }}
    >
      {/* ── Section header — tappable "see all" ── */}
      <Pressable
        onPress={() => { tapHaptic(); router.push('/anon-advice' as never); }}
        accessibilityRole="button"
        accessibilityLabel={headerA11y}
        style={({ pressed }) => ({
          flexDirection: 'row-reverse',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 14,
          backgroundColor: pressed ? STITCH.surfaceLow : '#ffffff',
          gap: 10,
        })}
      >
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: DUO.blueSurface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Image
            source={require('../../../../assets/webp/fin-empathic.webp')}
            style={{ width: 36, height: 36 }}
            resizeMode="contain"
            accessible={false}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '900',
              color: STITCH.onSurface,
              writingDirection: 'rtl',
              textAlign: 'right',
            }}
          >
            ייעוץ אנונימי
          </Text>
          <Text
            numberOfLines={2}
            maxFontSizeMultiplier={1.3}
            style={{
              fontSize: 12,
              color: STITCH.onSurfaceVariant,
              writingDirection: 'rtl',
              textAlign: 'right',
              marginTop: 1,
              flexShrink: 1,
            }}
          >
            {subtitle}
          </Text>
        </View>
        <Text style={{ fontSize: 20, color: STITCH.primary }}>‹</Text>
      </Pressable>

      {/* ── A4 · "יש תגובה חדשה לשאלה שלך" — real inbound reciprocity only.
           Renders ONLY when one of the user's own posts got a genuine external
           reply they haven't opened. Silent until that's real. ── */}
      {unseenReplyTarget && (
        <Animated.View entering={reduced ? undefined : FadeInDown.duration(260).springify()}>
          <Pressable
            onPress={openUnseenReply}
            accessibilityRole="button"
            accessibilityLabel="יש תגובה חדשה לשאלה שלך. לחצו לצפייה"
            style={({ pressed }) => ({
              flexDirection: 'row-reverse',
              alignItems: 'center',
              gap: 8,
              marginHorizontal: 12,
              marginBottom: 4,
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: pressed ? '#dbeafe' : DUO.blueSurface,
              borderWidth: 1,
              borderColor: '#bfdbfe',
            })}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: DUO.blue,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bell size={15} color="#ffffff" strokeWidth={2.4} fill="#ffffff" />
            </View>
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
              style={{
                flex: 1,
                fontSize: 13,
                fontWeight: '800',
                color: DUO.blueDark,
                writingDirection: 'rtl',
                textAlign: 'right',
              }}
            >
              יש תגובה חדשה לשאלה שלך
            </Text>
            <Text style={{ fontSize: 18, color: DUO.blue }}>‹</Text>
          </Pressable>
        </Animated.View>
      )}

      {/* ── C0 · honest empty state (no seed → no fake feed) ── */}
      {isEmpty && (
        <View
          accessible
          accessibilityLabel="המים שקטים כאן. שתפו דילמה ראשונה ופתחו את הדיון"
          style={{
            borderTopWidth: 1,
            borderTopColor: STITCH.surfaceHighest,
            alignItems: 'center',
            paddingHorizontal: 22,
            paddingVertical: 18,
            gap: 8,
          }}
        >
          <Image
            source={require('../../../../assets/webp/fin-empathic.webp')}
            style={{ width: 72, height: 72 }}
            resizeMode="contain"
            accessible={false}
          />
          <Text
            maxFontSizeMultiplier={1.3}
            style={{
              fontSize: 14,
              fontWeight: '800',
              color: STITCH.onSurface,
              writingDirection: 'rtl',
              textAlign: 'center',
              lineHeight: 20,
            }}
          >
            המים שקטים כאן
          </Text>
          <Text
            maxFontSizeMultiplier={1.3}
            style={{
              fontSize: 12,
              color: STITCH.onSurfaceVariant,
              writingDirection: 'rtl',
              textAlign: 'center',
              lineHeight: 18,
            }}
          >
            שתפו דילמה ראשונה ופתחו את הדיון — אנונימי לחלוטין
          </Text>
        </View>
      )}

      {/* ── Preview posts (real posts only) ── */}
      {recent.map((post) => (
        <Pressable
          key={post.id}
          onPress={() => { tapHaptic(); router.push(`/anon-advice/post/${post.id}` as never); }}
          accessibilityRole="button"
          accessibilityLabel={`פוסט: ${post.question}`}
          style={({ pressed }) => ({
            backgroundColor: pressed ? STITCH.surfaceLow : '#ffffff',
            borderTopWidth: 1,
            borderTopColor: STITCH.surfaceHighest,
            paddingHorizontal: 16,
            paddingVertical: 12,
          })}
        >
          {/* Author row — neutral anonymous identity (no animal emoji) */}
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 6, gap: 8 }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#f1f5f9',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserRound size={18} color={STITCH.onSurfaceVariant} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.15}
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: STITCH.onSurface,
                  writingDirection: 'rtl',
                  textAlign: 'right',
                }}
              >
                {formatAnonLabel(post.alias)}
              </Text>
            </View>
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.15}
              style={{ fontSize: 11, color: STITCH.onSurfaceVariant, flexShrink: 0 }}
            >
              {timeAgo(post.createdAt)}
            </Text>
          </View>

          {/* Question */}
          <Text
            maxFontSizeMultiplier={1.3}
            style={{
              fontSize: 14,
              fontWeight: '700',
              color: STITCH.onSurface,
              writingDirection: 'rtl',
              textAlign: 'right',
              lineHeight: 20,
              marginBottom: 8,
            }}
            numberOfLines={2}
          >
            {post.question}
          </Text>

          {/* Tags + comments action chip */}
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
            {post.tags.slice(0, 2).map((t) => (
              <View
                key={t}
                style={{
                  backgroundColor: DUO.blueSurface,
                  borderRadius: 8,
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                  flexShrink: 1,
                }}
              >
                <Text
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.15}
                  style={{ fontSize: 10, fontWeight: '800', color: DUO.blue }}
                >
                  {t}
                </Text>
              </View>
            ))}
            <View style={{ flex: 1 }} />
            {/* Comments — action chip only (no fabricated count) */}
            <View
              style={{
                flexDirection: 'row-reverse',
                alignItems: 'center',
                gap: 4,
                borderWidth: 1,
                borderColor: STITCH.surfaceHighest,
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}
            >
              <MessageCircle size={13} color={STITCH.onSurfaceVariant} strokeWidth={2.2} />
              <Text
                maxFontSizeMultiplier={1.15}
                style={{ fontSize: 11, fontWeight: '700', color: STITCH.onSurfaceVariant, writingDirection: 'rtl' }}
              >
                תגובות
              </Text>
            </View>
          </View>
        </Pressable>
      ))}

      {/* ── Reward chip + CTA ── */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: STITCH.surfaceHighest,
          padding: 14,
          gap: 10,
        }}
      >
        <View
          accessible
          accessibilityLabel={`${REWARD_POST_COINS} מטבעות על פוסט, ${REWARD_REPLY_COINS} על תגובה`}
          style={{
            backgroundColor: '#fffbeb',
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 6,
            alignSelf: 'flex-end',
            borderWidth: 1,
            borderColor: '#fde68a',
            flexDirection: 'row-reverse',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <Text
            maxFontSizeMultiplier={1.15}
            style={{ fontSize: 11, fontWeight: '800', color: STITCH.tertiaryGold, writingDirection: 'rtl' }}
          >
            +{REWARD_POST_COINS}
          </Text>
          <GoldCoinIcon size={12} />
          <Text
            maxFontSizeMultiplier={1.15}
            style={{ fontSize: 11, fontWeight: '800', color: STITCH.tertiaryGold, writingDirection: 'rtl' }}
          >
            על פוסט ·
          </Text>
          <Text
            maxFontSizeMultiplier={1.15}
            style={{ fontSize: 11, fontWeight: '800', color: STITCH.tertiaryGold, writingDirection: 'rtl' }}
          >
            +{REWARD_REPLY_COINS}
          </Text>
          <GoldCoinIcon size={12} />
          <Text
            maxFontSizeMultiplier={1.15}
            style={{ fontSize: 11, fontWeight: '800', color: STITCH.tertiaryGold, writingDirection: 'rtl' }}
          >
            על תגובה
          </Text>
        </View>

        <PremiumCta
          label="שאלו את הקהילה"
          colors={['#38bdf8', DUO.blue]}
          glow={DUO.blue}
          accessibilityLabel="פתחו ייעוץ אנונימי ושאלו את הקהילה"
          onPress={() => { tapHaptic(); router.push('/anon-advice' as never); }}
        />
      </View>
    </View>
  );
}
