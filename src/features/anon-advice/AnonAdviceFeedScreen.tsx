import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Image, FlatList } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Pencil } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useAnonAdviceStore } from './useAnonAdviceStore';
import { AnonAdviceComposeModal } from './AnonAdviceComposeModal';
import { PostCard } from './components/PostCard';
import { SEED_DILEMMAS, isSeedDilemma } from './seedDilemmas';
import type { AnonAdvicePost } from './anonAdviceTypes';
import { DUO } from '../../constants/theme';
import { GoldCoinIcon } from '../../components/ui/GoldCoinIcon';
import { A } from './strings';

const FILTERS: { id: string | null; label: string }[] = [
  { id: null, label: A.feedFilterAll },
  { id: 'משכנתא', label: A.feedFilterMortgage },
  { id: 'השקעות', label: A.feedFilterInvestments },
  { id: 'חיסכון', label: A.feedFilterSavings },
  { id: 'דירה ראשונה', label: A.feedFilterRealEstate },
];

export function AnonAdviceFeedScreen(): React.ReactElement {
  const insets = useSafeAreaInsets();
  const allPosts = useAnonAdviceStore((s) => s.getPosts)();
  const [filter, setFilter] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [reward, setReward] = useState<{ coins: number; xp: number; firstBonus: boolean } | null>(null);

  const realPosts: AnonAdvicePost[] = filter ? allPosts.filter((p) => p.tags.includes(filter)) : allPosts;
  // Cold-start: example dilemmas ONLY while the real feed is truly empty (no
  // filter active) — they self-retire the instant a real post exists.
  const showingSeeds = allPosts.length === 0 && filter === null;
  const posts: AnonAdvicePost[] = showingSeeds ? SEED_DILEMMAS : realPosts;

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
          onPress={() => router.replace('/(tabs)/friends' as never)}
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
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '900', color: DUO.text, writingDirection: 'rtl', textAlign: 'right' }}>
            {A.title}
          </Text>
          <Text style={{ fontSize: 12, color: DUO.textMuted, writingDirection: 'rtl', textAlign: 'right' }}>
            {A.subtitle}
          </Text>
        </View>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: DUO.blueSurface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Image
            source={require('../../../assets/webp/fin-happy.webp')}
            style={{ width: 34, height: 34 }}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Filter chips */}
      <View style={{ backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: DUO.border }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: 'row-reverse' }}
        >
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <Pressable
                key={f.id ?? 'all'}
                onPress={() => setFilter(f.id)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 18,
                  backgroundColor: active ? DUO.blue : DUO.bg,
                  borderWidth: 1,
                  borderColor: active ? DUO.blue : DUO.border,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#ffffff' : DUO.text }}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Feed */}
      {posts.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 }}>
          <Image
            source={require('../../../assets/webp/fin-empathic.webp')}
            style={{ width: 140, height: 140 }}
            resizeMode="contain"
          />
          <Text style={{ fontSize: 16, fontWeight: '800', color: DUO.text, writingDirection: 'rtl', textAlign: 'center' }}>
            {A.feedEmpty}
          </Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          ListHeaderComponent={
            showingSeeds ? (
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '800',
                  color: DUO.textMuted,
                  writingDirection: 'rtl',
                  textAlign: 'right',
                  paddingHorizontal: 20,
                  paddingBottom: 4,
                }}
                maxFontSizeMultiplier={1.15}
              >
                דוגמאות מהקהילה · שתפו דילמה אמיתית ותהיו הראשונים בפיד
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <PostCard
              post={item}
              // Seed examples have no store entry → the post screen would be
              // blank. They open the composer instead ("ask your own").
              onPress={() =>
                isSeedDilemma(item.id)
                  ? setComposing(true)
                  : router.push(`/anon-advice/post/${item.id}` as never)
              }
            />
          )}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 108 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Ask-the-community — full-width premium button pinned above the safe area */}
      <Animated.View
        entering={FadeIn.delay(200).duration(280)}
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: insets.bottom + 12,
        }}
      >
        <Pressable
          onPress={() => setComposing(true)}
          accessibilityRole="button"
          accessibilityLabel={A.feedComposeCta}
          style={({ pressed }) => ({
            borderRadius: 16,
            opacity: pressed ? 0.94 : 1,
            shadowColor: DUO.blueDark,
            shadowOpacity: 0.38,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 6 },
            elevation: 9,
          })}
        >
          <LinearGradient
            colors={['#2d74ce', DUO.blue, DUO.blueDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 16,
              paddingVertical: 16,
              paddingHorizontal: 20,
              flexDirection: 'row-reverse',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            <Pencil size={20} color="#ffffff" strokeWidth={2.5} />
            <Text
              style={{ fontSize: 16, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl', flexShrink: 1 }}
              maxFontSizeMultiplier={1.15}
              numberOfLines={1}
            >
              {A.feedComposeCta}
            </Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>

      {/* Compose modal */}
      <AnonAdviceComposeModal
        visible={composing}
        onClose={() => setComposing(false)}
        onPosted={(_id, r) => {
          setComposing(false);
          if (r) setReward(r);
        }}
      />

      {/* Reward toast */}
      {reward && (
        <Animated.View
          entering={FadeIn.duration(220)}
          style={{
            position: 'absolute',
            top: 100,
            left: 16,
            right: 16,
            backgroundColor: '#ffffff',
            borderRadius: 14,
            padding: 14,
            borderWidth: 1.5,
            borderColor: DUO.green,
            flexDirection: 'row-reverse',
            alignItems: 'center',
            gap: 10,
            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
          }}
        >
          <Image
            source={require('../../../assets/webp/fin-happy.webp')}
            style={{ width: 40, height: 40 }}
            resizeMode="contain"
          />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text
                style={{ fontSize: 14, fontWeight: '900', color: DUO.green, writingDirection: 'rtl', textAlign: 'right' }}
                maxFontSizeMultiplier={1.15}
              >
                {A.moderationApproved} +{reward.coins}
              </Text>
              <GoldCoinIcon size={16} />
              <Text
                style={{ fontSize: 14, fontWeight: '900', color: DUO.green, writingDirection: 'rtl' }}
                maxFontSizeMultiplier={1.15}
              >
                +{reward.xp} XP
              </Text>
            </View>
            {reward.firstBonus && (
              <Text
                style={{ fontSize: 12, color: DUO.text, writingDirection: 'rtl', textAlign: 'right' }}
                maxFontSizeMultiplier={1.15}
              >
                {A.rewardFirstPostBonus}
              </Text>
            )}
          </View>
          <Pressable onPress={() => setReward(null)}>
            <Text style={{ fontSize: 16, color: DUO.textMuted }}>✕</Text>
          </Pressable>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}
