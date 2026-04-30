import React, { useMemo } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { router } from 'expo-router';
import { useAnonAdviceStore } from '../../anon-advice/useAnonAdviceStore';
import { formatAlias } from '../../anon-advice/anonAdviceData';
import { STITCH, DUO } from '../../../constants/theme';

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return 'כרגע';
  if (min < 60) return `לפני ${min} ד׳`;
  const h = Math.floor(min / 60);
  if (h < 24) return `לפני ${h} ש׳`;
  return `לפני ${Math.floor(h / 24)} ימ׳`;
}

export function AnonAdviceHeroCard(): React.ReactElement {
  const rawPosts = useAnonAdviceStore((s) => s.posts);

  const { recent, total } = useMemo(() => {
    const approved = rawPosts.filter((p) => p.status === 'approved');
    const sorted = [...approved].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return { recent: sorted.slice(0, 2), total: approved.length };
  }, [rawPosts]);

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
        onPress={() => router.push('/anon-advice' as never)}
        accessibilityRole="button"
        accessibilityLabel={`ייעוץ אנונימי, ${total} שאלות פתוחות. לחץ לצפייה בכולן`}
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
            style={{
              fontSize: 12,
              color: STITCH.onSurfaceVariant,
              writingDirection: 'rtl',
              textAlign: 'right',
              marginTop: 1,
            }}
          >
            תכל'ס, כולם לפעמים נתקעים. שתף — מישהו יענה · {total} שאלות פתוחות
          </Text>
        </View>
        <Text style={{ fontSize: 20, color: STITCH.primary }}>‹</Text>
      </Pressable>

      {/* ── Preview posts ── */}
      {recent.map((post, idx) => (
        <Pressable
          key={post.id}
          onPress={() => router.push(`/anon-advice/post/${post.id}` as never)}
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
          {/* Author row */}
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 6, gap: 8 }}>
            <Text style={{ fontSize: 22 }}>{post.alias.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: STITCH.onSurface,
                  writingDirection: 'rtl',
                  textAlign: 'right',
                }}
              >
                {formatAlias(post.alias)}
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: STITCH.onSurfaceVariant }}>{timeAgo(post.createdAt)}</Text>
          </View>

          {/* Question */}
          <Text
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

          {/* Tags + reply count */}
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
            {post.tags.slice(0, 2).map((t) => (
              <View
                key={t}
                style={{
                  backgroundColor: DUO.blueSurface,
                  borderRadius: 8,
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '800', color: DUO.blue }}>{t}</Text>
              </View>
            ))}
            <View style={{ flex: 1 }} />
            <Text style={{ fontSize: 12, color: STITCH.onSurfaceVariant }}>💬 {post.replyCount}</Text>
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
          style={{
            backgroundColor: '#fffbeb',
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 6,
            alignSelf: 'flex-end',
            borderWidth: 1,
            borderColor: '#fde68a',
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '800',
              color: STITCH.tertiaryGold,
              writingDirection: 'rtl',
            }}
          >
            +50 🪙 על פוסט · +10 🪙 על תגובה
          </Text>
        </View>

        <Pressable
          onPress={() => router.push('/anon-advice' as never)}
          accessibilityRole="button"
          accessibilityLabel="פתח ייעוץ אנונימי ושאל את הקהילה"
          style={({ pressed }) => ({
            backgroundColor: pressed ? DUO.blueDark : DUO.blue,
            borderRadius: 12,
            paddingVertical: 12,
            alignItems: 'center',
            shadowColor: DUO.blue,
            shadowOpacity: 0.3,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 3 },
            elevation: 3,
          })}
        >
          <Text style={{ fontSize: 14, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl' }}>
            שאל את הקהילה
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
