import React from 'react';
import { Image as ExpoImage } from "expo-image";
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Lock } from 'lucide-react-native';
import LottieView from '../../components/ui/SafeLottieView';
import { FINN_STANDARD } from '../retention-loops/finnMascotConfig';
import { tapHaptic } from '../../utils/haptics';
import { useScenarioLabStore } from '../scenario-lab/useScenarioLabStore';
import type { FeedScenario } from './types';
import { STITCH } from '../../constants/theme';

interface Props {
  item: FeedScenario;
  isActive: boolean;
}

export const FeedScenarioCard = React.memo(function FeedScenarioCard({ item }: Props) {
  const router = useRouter();
  const getBestGrade = useScenarioLabStore((s) => s.getBestGrade);
  const scenario = item.scenario;
  const grade = getBestGrade(scenario.id);
  const isCompleted = !!grade;
  const locked = item.locked ?? false;

  return (
    <View style={styles.container}>
      <Animated.View>
        <Pressable
          onPress={() => {
            if (locked) return;
            tapHaptic();
            router.push(`/scenario-lab?id=${scenario.id}` as never);
          }}
          style={locked ? { opacity: 0.55 } : undefined}
          accessibilityRole="button"
          accessibilityLabel={locked ? `תרחיש נעול: ${scenario.title}` : `פתח תרחיש: ${scenario.title}`}
        >
          <LinearGradient
            colors={locked ? ['#f1f5f9', '#e2e8f0', '#f1f5f9'] : ['#f0f9ff', '#e0f2fe', '#f0f9ff']}
            style={styles.card}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            {/* Grade badge or New tag */}
            {!locked && isCompleted ? (
              <View style={styles.gradeBadge}>
                <Text style={styles.gradeText}>{grade}</Text>
              </View>
            ) : !locked ? (
              <View style={styles.newTag}>
                <Text style={styles.newTagText}>חדש!</Text>
              </View>
            ) : null}

            {/* Emoji */}
            <Text style={styles.emoji}>{scenario.emoji}</Text>

            {/* Title */}
            <Text style={styles.title}>{scenario.title}</Text>

            {/* Briefing */}
            <Text style={styles.briefing} numberOfLines={3}>{scenario.briefing}</Text>

            {/* Difficulty */}
            <View style={styles.diffRow}>
              {[1, 2, 3].map((d) => (
                <Text key={d} style={{ fontSize: 14, opacity: d <= scenario.difficulty ? 1 : 0.3 }}>⭐</Text>
              ))}
            </View>

            {/* CTA */}
            <View style={styles.ctaBtn}>
              <Text style={styles.ctaText}>{locked ? '🔒 שלב 3' : isCompleted ? 'שחק שוב' : 'התחל תרחיש'}</Text>
            </View>
          </LinearGradient>
        </Pressable>

        {/* Suggest scenario button — aligned right */}
        <View style={styles.suggestRow}>
          <Pressable
            onPress={() => {
              tapHaptic();
              router.push('/suggest-scenario' as never);
            }}
            style={({ pressed }) => [styles.suggestBtn, pressed && { opacity: 0.8 }]}
            accessibilityRole="button"
            accessibilityLabel="הצע תרחיש לצוות"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.suggestText}>הצע תרחיש לצוות</Text>
            <View pointerEvents="none">
              <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 56, height: 56 }} contentFit="contain" />
            </View>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  card: {
    borderRadius: 32, // 'lg' softer radius
    padding: 24,
    alignItems: 'center',
    gap: 12,
    // Soft ambient shadow instead of hard borders
    shadowColor: '#001b3d',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.05,
    shadowRadius: 32,
    elevation: 4,
  },
  lockedRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    backgroundColor: '#94a3b8',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 8,
  },
  lockedRibbonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
    writingDirection: 'rtl' as const,
  },
  lockedOverlay: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 4,
    zIndex: 10,
  },
  lockedText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#94a3b8',
    writingDirection: 'rtl' as const,
  },
  gradeBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#facc15',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1a1035',
  },
  newTag: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  newTagText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#fff',
  },
  emoji: {
    fontSize: 56,
    marginTop: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: STITCH.onSurface, // on_surface
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  briefing: {
    fontSize: 14,
    lineHeight: 22,
    color: STITCH.onSurfaceVariant, // on_surface_variant
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  diffRow: {
    flexDirection: 'row',
    gap: 4,
  },
  ctaBtn: {
    marginTop: 8,
    backgroundColor: '#0891b2',
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: '#0e7490',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    writingDirection: 'rtl',
  },
  suggestRow: {
    alignItems: 'flex-end',
    marginTop: 12,
  },
  suggestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: STITCH.surface, // surface tonal layering
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  suggestText: {
    fontSize: 13,
    fontWeight: '700',
    color: STITCH.primary, // primary
    writingDirection: 'rtl',
    textAlign: 'right',
    flex: 1,
  },
});
