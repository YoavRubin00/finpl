import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Image, KeyboardAvoidingView } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ThumbsUp, MessageCircle } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useAnonAdviceStore } from './useAnonAdviceStore';
import { AnonAvatar } from './components/AnonAvatar';
import { DilemmaPoll } from './components/OptionPoll';
import { ReplyBubble } from './components/ReplyBubble';
import { MAX_REPLY_LENGTH } from './anonAdviceData';
import { DUO } from '../../constants/theme';
import { GoldCoinIcon } from '../../components/ui/GoldCoinIcon';
import { formatVoteCount } from '../friends-hub/lib/honestCounts';
import { tapHaptic } from '../../utils/haptics';
import { track } from '../../lib/analytics/events';
import { A } from './strings';

interface AnonAdvicePostScreenProps {
  postId: string;
}

export function AnonAdvicePostScreen({ postId }: AnonAdvicePostScreenProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const post = useAnonAdviceStore((s) => s.getPostById)(postId);
  const replies = useAnonAdviceStore((s) => s.getRepliesFor)(postId);
  const submitReply = useAnonAdviceStore((s) => s.submitReply);
  const canReplyToday = useAnonAdviceStore((s) => s.canReplyToday);
  const toggleReplyUpvote = useAnonAdviceStore((s) => s.toggleReplyUpvote);
  const upvotedReplyIds = useAnonAdviceStore((s) => s.upvotedReplyIds);
  const togglePostLike = useAnonAdviceStore((s) => s.togglePostLike);
  const likedPostIds = useAnonAdviceStore((s) => s.likedPostIds);
  const postLikes = useAnonAdviceStore((s) => s.postLikes);

  const [body, setBody] = useState('');
  const [agreedWith, setAgreedWith] = useState<0 | 1 | undefined>(undefined);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [coinToast, setCoinToast] = useState<number | null>(null);

  if (!post) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DUO.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: DUO.textMuted, fontSize: 15 }}>הפוסט לא נמצא</Text>
        <Pressable onPress={() => router.replace('/anon-advice' as never)} style={{ marginTop: 12 }}>
          <Text style={{ color: DUO.blue, fontSize: 14, fontWeight: '700' }}>חזרה</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  function handleSend(): void {
    if (!post) return;
    const trimmed = body.trim();
    if (!trimmed) {
      setReplyError(A.replyEmptyError);
      return;
    }
    if (!canReplyToday()) {
      setReplyError(A.rewardDailyCapReply);
      return;
    }
    const result = submitReply({ postId: post.id, body: trimmed, agreedWith });
    if (result) {
      try { track({ name: 'social_action', props: { action_type: 'anon_reply', surface: 'anon_advice' } }); } catch { /* non-fatal */ }
    }
    if (result?.reward) {
      setCoinToast(result.reward.coins);
      setTimeout(() => setCoinToast(null), 2200);
    }
    setBody('');
    setAgreedWith(undefined);
    setReplyError(null);
  }

  const likedBySelf = likedPostIds.includes(post.id);
  const likeCountLabel = formatVoteCount(postLikes[post.id] ?? 0); // null hides sub-100 counts
  const likeLabel = likeCountLabel ? `אהבתי · ${likeCountLabel}` : 'אהבתי';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DUO.bg }} edges={['top']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 10,
          gap: 10,
          backgroundColor: '#ffffff',
          borderBottomWidth: 1,
          borderBottomColor: DUO.border,
        }}
      >
        <Pressable
          onPress={() => router.replace('/anon-advice' as never)}
          hitSlop={12}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: DUO.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 18, color: DUO.text }}>→</Text>
        </Pressable>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '900', color: DUO.text, writingDirection: 'rtl', textAlign: 'right' }}>
          {A.title}
        </Text>
      </View>

      {/* 'padding' on BOTH platforms — deliberate (a2790a54): Android 15+
          edge-to-edge IGNORES adjustResize, so without padding the keyboard
          covers the reply composer ("המקלדת חוסמת", Yoav 2026-07-04). */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          {/* Author + meta */}
          <View
            style={{
              backgroundColor: '#ffffff',
              marginHorizontal: 16,
              marginTop: 14,
              borderRadius: 16,
              borderWidth: post.isSelf ? 1.5 : 1,
              borderColor: post.isSelf ? DUO.blue : DUO.border,
              padding: 16,
            }}
          >
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <AnonAvatar alias={post.alias} size={40} isSelf={post.isSelf} />
              {post.isSelf && (
                <View style={{ backgroundColor: DUO.blueSurface, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: DUO.blue }}>{A.postSelfBadge}</Text>
                </View>
              )}
            </View>

            {/* Section: תיאור */}
            <SectionHeader num={1} title={A.postSituation} />
            <Text
              style={{
                fontSize: 14,
                color: DUO.text,
                writingDirection: 'rtl',
                textAlign: 'right',
                lineHeight: 21,
                marginBottom: 14,
              }}
            >
              {post.situation}
            </Text>

            {/* Image (if any) */}
            {post.imageUri && (
              <Image
                source={{ uri: post.imageUri }}
                style={{ width: '100%', height: 200, borderRadius: 12, marginBottom: 14 }}
                resizeMode="cover"
              />
            )}

            {/* Section: דילמה */}
            <SectionHeader num={2} title={A.postQuestion} />
            <Text
              style={{
                fontSize: 16,
                fontWeight: '900',
                color: DUO.text,
                writingDirection: 'rtl',
                textAlign: 'right',
                lineHeight: 23,
                marginBottom: 14,
              }}
            >
              {post.question}
            </Text>

            {/* Section: אופציות — tap to vote, real cross-user percentages */}
            <SectionHeader num={3} title={A.postOptions} />
            <DilemmaPoll post={post} />

            {/* Tags */}
            {post.tags.length > 0 && (
              <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
                {post.tags.map((t) => (
                  <View
                    key={t}
                    style={{
                      backgroundColor: DUO.bg,
                      borderRadius: 10,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderWidth: 1,
                      borderColor: DUO.border,
                    }}
                  >
                    <Text style={{ fontSize: 11, color: DUO.textMuted, fontWeight: '700' }} maxFontSizeMultiplier={1.15} numberOfLines={1}>
                      {t}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Facebook-style action bar */}
            <View
              style={{
                flexDirection: 'row-reverse',
                alignItems: 'center',
                borderTopWidth: 1,
                borderTopColor: DUO.border,
                marginTop: 16,
                paddingTop: 6,
              }}
            >
              {/* Static styles — function-style drops on Android (known bug). */}
              <Pressable
                onPress={() => { tapHaptic(); togglePostLike(post.id); }}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityState={{ selected: likedBySelf }}
                accessibilityLabel="אהבתי"
                style={{
                  flex: 1,
                  height: 44,
                  flexDirection: 'row-reverse',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  borderRadius: 10,
                }}
                android_ripple={{ color: 'rgba(24,119,242,0.08)' }}
              >
                <ThumbsUp
                  size={18}
                  color={likedBySelf ? DUO.blue : DUO.textMuted}
                  fill={likedBySelf ? DUO.blue : 'transparent'}
                  strokeWidth={2.2}
                />
                <Text
                  style={{ fontSize: 13, fontWeight: '700', color: likedBySelf ? DUO.blue : DUO.textMuted, flexShrink: 1 }}
                  maxFontSizeMultiplier={1.15}
                  numberOfLines={1}
                >
                  {likeLabel}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => inputRef.current?.focus()}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="תגובה"
                style={{
                  flex: 1,
                  height: 44,
                  flexDirection: 'row-reverse',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  borderRadius: 10,
                }}
                android_ripple={{ color: 'rgba(107,114,128,0.08)' }}
              >
                <MessageCircle size={18} color={DUO.textMuted} strokeWidth={2.2} />
                <Text
                  style={{ fontSize: 13, fontWeight: '700', color: DUO.textMuted, flexShrink: 1 }}
                  maxFontSizeMultiplier={1.15}
                  numberOfLines={1}
                >
                  תגובה
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Replies */}
          <Text
            style={{
              fontSize: 14,
              fontWeight: '800',
              color: DUO.textMuted,
              writingDirection: 'rtl',
              textAlign: 'right',
              paddingHorizontal: 16,
              marginTop: 22,
              marginBottom: 10,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {A.postReplies(replies.length)}
          </Text>

          {replies.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 24, gap: 8 }}>
              <ExpoImage
                source={require('../../../assets/webp/fin-talking-1.webp')}
                style={{ width: 90, height: 90 }}
                contentFit="contain"
                autoplay
              />
              <Text style={{ fontSize: 13, color: DUO.textMuted, writingDirection: 'rtl', textAlign: 'center' }}>
                {A.postNoReplies}
              </Text>
            </View>
          ) : (
            replies.map((r, i) => (
              <ReplyBubble
                key={r.id}
                reply={r}
                index={i}
                isTopAnswer={i === 0 && (r.upvotes ?? 0) > 0 && replies.length > 1}
                upvotedBySelf={upvotedReplyIds.includes(r.id)}
                onToggleUpvote={toggleReplyUpvote}
              />
            ))
          )}
        </ScrollView>

        {/* Reply composer */}
        <View
          style={{
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: DUO.border,
            paddingHorizontal: 12,
            paddingTop: 10,
            paddingBottom: 12 + insets.bottom,
            gap: 8,
          }}
        >
          {/* Agree-with toggles */}
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 12, color: DUO.textMuted, writingDirection: 'rtl', fontWeight: '700' }}>
              {A.replyAgreeWithLabel}
            </Text>
            {[0, 1].map((idx) => {
              if (idx >= post.options.length) return null;
              const active = agreedWith === idx;
              return (
                <Pressable
                  key={idx}
                  onPress={() => setAgreedWith(active ? undefined : (idx as 0 | 1))}
                  style={{
                    backgroundColor: active ? (idx === 0 ? DUO.blue : DUO.green) : DUO.bg,
                    borderRadius: 14,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderWidth: 1,
                    borderColor: active ? 'transparent' : DUO.border,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: active ? '#ffffff' : DUO.text }}>
                    {A.replyAgreeOption(idx)}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => setAgreedWith(undefined)}
              style={{
                backgroundColor: agreedWith === undefined ? DUO.text : DUO.bg,
                borderRadius: 14,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderWidth: 1,
                borderColor: agreedWith === undefined ? 'transparent' : DUO.border,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: agreedWith === undefined ? '#ffffff' : DUO.textMuted }}>
                {A.replyAgreeNeutral}
              </Text>
            </Pressable>
          </View>

          {/* Input + send */}
          <View style={{ flexDirection: 'row-reverse', alignItems: 'flex-end', gap: 8 }}>
            <TextInput
              ref={inputRef}
              value={body}
              onChangeText={(t) => { setBody(t); setReplyError(null); }}
              placeholder={A.replyPlaceholder}
              placeholderTextColor="#94a3b8"
              multiline
              maxLength={MAX_REPLY_LENGTH}
              maxFontSizeMultiplier={1.15}
              style={{
                flex: 1,
                backgroundColor: DUO.bg,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: DUO.border,
                paddingHorizontal: 14,
                paddingVertical: 10,
                fontSize: 14,
                color: DUO.text,
                writingDirection: 'rtl',
                textAlign: 'right',
                maxHeight: 110,
              }}
            />
            <Pressable
              onPress={handleSend}
              disabled={!body.trim()}
              accessibilityRole="button"
              accessibilityLabel="שליחת תגובה"
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: !body.trim() ? '#cbd5e1' : DUO.blue,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 20, color: '#ffffff' }}>↑</Text>
            </Pressable>
          </View>

          {replyError && (
            <Text style={{ fontSize: 12, color: DUO.red, writingDirection: 'rtl', textAlign: 'right' }}>{replyError}</Text>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Coin toast */}
      {coinToast !== null && (
        <Animated.View
          entering={FadeIn.duration(180)}
          style={{
            position: 'absolute',
            top: 80,
            alignSelf: 'center',
            backgroundColor: DUO.green,
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 8,
            flexDirection: 'row-reverse',
            alignItems: 'center',
            gap: 6,
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 3 },
            elevation: 4,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '900', color: '#ffffff' }} maxFontSizeMultiplier={1.15}>
            +{coinToast}
          </Text>
          <GoldCoinIcon size={18} />
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

function SectionHeader({ num, title }: { num: number; title: string }): React.ReactElement {
  return (
    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 6 }}>
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: DUO.blueSurface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 10, fontWeight: '900', color: DUO.blue }}>{num}</Text>
      </View>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '800',
          color: DUO.textMuted,
          writingDirection: 'rtl',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {title}
      </Text>
    </View>
  );
}