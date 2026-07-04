import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { MessageCircle } from 'lucide-react-native';
import type { AnonAdvicePost } from '../anonAdviceTypes';
import { AnonAvatar } from './AnonAvatar';
import { DilemmaPoll } from './OptionPoll';
import { DUO } from '../../../constants/theme';
import { A } from '../strings';

interface PostCardProps {
  post: AnonAdvicePost;
  onPress: () => void;
}

function formatTimeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return A.timeAgo.justNow;
  if (min < 60) return A.timeAgo.minutes(min);
  const hours = Math.floor(min / 60);
  if (hours < 24) return A.timeAgo.hours(hours);
  return A.timeAgo.days(Math.floor(hours / 24));
}

export function PostCard({ post, onPress }: PostCardProps): React.ReactElement {
  return (
    // STATIC style only — a function-style ({pressed}) => ({...layout}) drops the
    // whole style on Android (known Pressable bug), which stripped these cards of
    // margins/padding/background (the "cramped, overflowing" feed Yoav saw).
    <Pressable
      onPress={onPress}
      style={{
        marginHorizontal: 16,
        marginBottom: 12,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: post.isSelf ? DUO.blue : DUO.border,
        padding: 14,
      }}
      android_ripple={{ color: 'rgba(24,119,242,0.05)' }}
    >
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
        <AnonAvatar alias={post.alias} size={32} isSelf={post.isSelf} />
        <Text
          style={{ fontSize: 11, color: DUO.textMuted, flexShrink: 0 }}
          maxFontSizeMultiplier={1.15}
          numberOfLines={1}
        >
          {formatTimeAgo(post.createdAt)}
        </Text>
      </View>

      {post.isSelf && (
        <View
          style={{
            alignSelf: 'flex-end',
            backgroundColor: DUO.blueSurface,
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 2,
            marginBottom: 8,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: '800', color: DUO.blue }}>{A.postSelfBadge}</Text>
        </View>
      )}

      {/* Situation snippet */}
      <Text
        style={{
          fontSize: 13,
          color: DUO.textMuted,
          writingDirection: 'rtl',
          textAlign: 'right',
          lineHeight: 19,
          marginBottom: 8,
        }}
        numberOfLines={3}
        maxFontSizeMultiplier={1.15}
      >
        {post.situation}
      </Text>

      {/* Question — emphasis */}
      <Text
        style={{
          fontSize: 15,
          fontWeight: '900',
          color: DUO.text,
          writingDirection: 'rtl',
          textAlign: 'right',
          marginBottom: 10,
        }}
        numberOfLines={2}
        maxFontSizeMultiplier={1.15}
      >
        {post.question}
      </Text>

      {/* Two-option poll — vote right from the feed; REAL cross-user
          percentages appear after picking (crowd-question rails). */}
      {post.options.length === 2 && (
        <View style={{ marginBottom: 10 }}>
          <DilemmaPoll post={post} />
        </View>
      )}

      {/* Tags + reply count */}
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {post.tags.slice(0, 3).map((t) => (
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
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <MessageCircle size={15} color={DUO.blue} strokeWidth={2.4} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: DUO.blue }} maxFontSizeMultiplier={1.15} numberOfLines={1}>
            {post.replyCount > 0 ? `${post.replyCount} תגובות` : 'הגיבו ראשונים'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
