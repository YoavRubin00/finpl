/**
 * DailyLearningSummary — "היום ב-Finpl"
 * Shows today's learning activities in a premium card with Share functionality.
 * Designed for the Profile screen.
 */
import { View, Text, Image, StyleSheet, Pressable, Share } from 'react-native';
import { Image as ExpoImage } from "expo-image";
import Animated, {
  FadeIn,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { FINN_STANDARD } from '../retention-loops/finnMascotConfig';
import { useDailyLogStore, type LearningEvent } from './useDailyLogStore';
import { useAuthStore } from '../auth/useAuthStore';
import { tapHaptic, successHaptic } from '../../utils/haptics';
import { useEffect } from 'react';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

const EVENT_TYPE_LABELS: Record<LearningEvent['type'], { emoji: string; label: string }> = {
  module: { emoji: '📚', label: 'פרק' },
  quiz: { emoji: '🧠', label: 'בוחן' },
  dilemma: { emoji: '🤔', label: 'דילמה' },
  investment: { emoji: '💰', label: 'השקעה' },
  'crash-game': { emoji: '📈', label: 'מרוץ הריבית' },
  'swipe-game': { emoji: '🐻', label: 'שורט או לונג' },
  'macro-event': { emoji: '🌍', label: 'אירוע מאקרו' },
};

export function DailyLearningSummary() {
  const displayName = useAuthStore((s) => s.displayName) ?? 'שחקן';
  const events = useDailyLogStore((s) => s.getTodayEvents());
  const getSummaryText = useDailyLogStore((s) => s.getTodaySummaryText);

  // Subtle pulse glow
  const pulse = useSharedValue(0.3);
  useEffect(() => {
    if (events.length > 0) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 1200 }),
          withTiming(0.3, { duration: 1200 }),
        ),
        -1,
        true,
      );
    }
  }, [events.length, pulse]);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: pulse.value,
  }));

  const handleShare = async () => {
    tapHaptic();
    const text = getSummaryText(displayName);
    if (!text) return;
    try {
      await Share.share({
        message: text,
      });
      successHaptic();
    } catch {
      // User cancelled
    }
  };

  // No events today — don't show card
  if (events.length === 0) {
    return null;
  }

  // Unique topics and event types
  const topics = [...new Set(events.map((e) => e.title))];
  const uniqueTypes = [...new Set(events.map((e) => e.type))];

  return (
    <Animated.View entering={FadeInUp.delay(500).duration(400)}>
      <Animated.View
        style={[
          {
            shadowColor: '#0ea5e9',
            shadowRadius: 12,
            elevation: 4,
          },
          glowStyle,
        ]}
      >
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTextCol}>
              <Text style={[styles.headerTitle, RTL]}>היום ב- FinPlay</Text>
              <Text style={[styles.headerSub, RTL]}>סיכום הלמידה של {displayName}</Text>
            </View>
          </View>

          {/* Topics learned */}
          <View style={styles.topicsList}>
            {topics.slice(0, 5).map((topic, i) => (
              <View key={i} style={styles.topicRow}>
                <Text style={[styles.topicText, RTL]}>• {topic}</Text>
              </View>
            ))}
            {topics.length > 5 && (
              <Text style={[styles.topicMore, RTL]}>...ועוד {topics.length - 5} נושאים</Text>
            )}
          </View>

          {/* Activity count */}
          <View style={styles.activityBadge}>
            <Text style={[styles.activityText, RTL]}>{events.length} פעילויות היום</Text>
          </View>

          {/* Activity types bubbles */}
          <View style={styles.typesRow}>
            {uniqueTypes.map((type) => {
              const meta = EVENT_TYPE_LABELS[type];
              return (
                <View key={type} style={styles.typePill}>
                  <Text style={styles.typePillEmoji}>{meta.emoji}</Text>
                  <Text style={[styles.typePillLabel, RTL]}>{meta.label}</Text>
                </View>
              );
            })}
          </View>

          {/* Share button */}
          <Pressable onPress={handleShare} style={styles.shareBtn}>
            <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 48, height: 48 }} contentFit="contain" />
            <Text style={styles.shareBtnText}>שתף את היום שלך!</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(14,165,233,0.2)',
    backgroundColor: '#f0f9ff',
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  headerEmoji: {
    fontSize: 28,
  },
  headerTextCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0369a1',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  topicsList: {
    gap: 6,
  },
  topicRow: {
    flexDirection: 'row-reverse',
  },
  topicText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: 22,
  },
  topicMore: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  activityBadge: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(14,165,233,0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.15)',
  },
  activityText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369a1',
  },
  typesRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  typePill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(14,165,233,0.06)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.12)',
  },
  typePillEmoji: {
    fontSize: 14,
  },
  typePillLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0369a1',
  },
  shareBtn: {
    flexDirection: 'row',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#0ea5e9',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shareBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
});
