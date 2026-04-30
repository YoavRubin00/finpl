import React from 'react';
import { View, Text, Pressable } from 'react-native';
import type { AnonAdvicePost } from '../anonAdviceTypes';
import { AnonAvatar } from './AnonAvatar';
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
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        marginHorizontal: 16,
        marginBottom: 12,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: post.isSelf ? DUO.blue : DUO.border,
        padding: 14,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <AnonAvatar alias={post.alias} size={32} isSelf={post.isSelf} />
        <Text style={{ fontSize: 11, color: DUO.textMuted }}>{formatTimeAgo(post.createdAt)}</Text>
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
      >
        ❓ {post.question}
      </Text>

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
            <Text style={{ fontSize: 11, color: DUO.textMuted, fontWeight: '700' }}>{t}</Text>
          </View>
        ))}
        <View style={{ flex: 1 }} />
        <Text style={{ fontSize: 12, fontWeight: '700', color: DUO.blue }}>
          💬 {post.replyCount}
        </Text>
      </View>
    </Pressable>
  );
}
