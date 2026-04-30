import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useAnonAdviceStore } from './useAnonAdviceStore';
import { AnonAvatar } from './components/AnonAvatar';
import { OptionPoll } from './components/OptionPoll';
import { ReplyBubble } from './components/ReplyBubble';
import { MAX_REPLY_LENGTH } from './anonAdviceData';
import { DUO } from '../../constants/theme';
import { A } from './strings';

interface AnonAdvicePostScreenProps {
  postId: string;
}

export function AnonAdvicePostScreen({ postId }: AnonAdvicePostScreenProps): React.ReactElement {
  const post = useAnonAdviceStore((s) => s.getPostById)(postId);
  const replies = useAnonAdviceStore((s) => s.getRepliesFor)(postId);
  const submitReply = useAnonAdviceStore((s) => s.submitReply);
  const canReplyToday = useAnonAdviceStore((s) => s.canReplyToday);

  const [body, setBody] = useState('');
  const [agreedWith, setAgreedWith] = useState<0 | 1 | undefined>(undefined);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [coinToast, setCoinToast] = useState<number | null>(null);

  if (!post) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DUO.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: DUO.textMuted, fontSize: 15 }}>הפוסט לא נמצא</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
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
    if (result?.reward) {
      setCoinToast(result.reward.coins);
      setTimeout(() => setCoinToast(null), 2200);
    }
    setBody('');
    setAgreedWith(undefined);
    setReplyError(null);
  }

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
          onPress={() => router.back()}
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

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
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

            {/* Section: אופציות */}
            <SectionHeader num={3} title={A.postOptions} />
            <OptionPoll options={post.options} votes={post.optionVotes} />

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
                    <Text style={{ fontSize: 11, color: DUO.textMuted, fontWeight: '700' }}>{t}</Text>
                  </View>
                ))}
              </View>
            )}
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
              <Image
                source={require('../../../assets/webp/fin-talking-1.webp')}
                style={{ width: 90, height: 90 }}
                resizeMode="contain"
              />
              <Text style={{ fontSize: 13, color: DUO.textMuted, writingDirection: 'rtl', textAlign: 'center' }}>
                {A.postNoReplies}
              </Text>
            </View>
          ) : (
            replies.map((r, i) => <ReplyBubble key={r.id} reply={r} index={i} />)
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
            paddingBottom: 12,
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
              value={body}
              onChangeText={(t) => { setBody(t); setReplyError(null); }}
              placeholder={A.replyPlaceholder}
              placeholderTextColor="#94a3b8"
              multiline
              maxLength={MAX_REPLY_LENGTH}
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
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: !body.trim() ? '#cbd5e1' : pressed ? DUO.blueDark : DUO.blue,
                alignItems: 'center',
                justifyContent: 'center',
              })}
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
          <Text style={{ fontSize: 14, fontWeight: '900', color: '#ffffff' }}>
            {A.rewardReplyEarned(coinToast)}
          </Text>
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