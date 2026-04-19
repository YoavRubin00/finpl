import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  useReducedMotion,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Sparkles } from 'lucide-react-native';
import { tapHaptic, successHaptic } from '../../../utils/haptics';
import { useSoundEffect } from '../../../hooks/useSoundEffect';
import { FeedStartButton } from '../minigames/shared/FeedStartButton';
import { DID_YOU_KNOW_ITEMS } from './didYouKnowData';
import { CATEGORY_THEMES } from './types';
import type { DidYouKnowItem } from './types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

interface Props {
  isActive: boolean;
  /** Optional specific item id; otherwise rotates by current date. */
  itemId?: string;
}

function pickItem(id?: string): DidYouKnowItem {
  if (id) {
    const direct = DID_YOU_KNOW_ITEMS.find((i) => i.id === id);
    if (direct) return direct;
    // Not a direct item id, hash the feed id so each feed slot picks a different
    // item (while staying stable for the session). Combined with the day so the
    // pool rotates over time.
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0x7fffffff;
    const day = Math.floor(Date.now() / 86400000);
    return DID_YOU_KNOW_ITEMS[(hash + day) % DID_YOU_KNOW_ITEMS.length];
  }
  const day = Math.floor(Date.now() / 86400000);
  return DID_YOU_KNOW_ITEMS[day % DID_YOU_KNOW_ITEMS.length];
}

export const DidYouKnowCard = React.memo(function DidYouKnowCard({ isActive: _isActive, itemId }: Props) {
  const item = useMemo(() => pickItem(itemId), [itemId]);
  const theme = CATEGORY_THEMES[item.category];
  const [revealed, setRevealed] = useState(false);
  const { playSound } = useSoundEffect();
  const reduceMotion = useReducedMotion();

  // Start at 0 so the manual spring owns the entire entrance, mixing this with
  // an `entering={ZoomIn}` prop caused a transform/scale fight that made the
  // highlight number stutter visibly.
  const highlightScale = useSharedValue(0);
  const highlightStyle = useAnimatedStyle(() => ({
    transform: [{ scale: highlightScale.value }],
  }));

  const handleReveal = () => {
    if (revealed) return;
    tapHaptic();
    playSound('btn_click_soft_2');
    setRevealed(true);
    setTimeout(() => successHaptic(), 120);
    if (reduceMotion) {
      highlightScale.value = withTiming(1, { duration: 220 });
    } else {
      highlightScale.value = withSequence(
        withSpring(1.12, { damping: 10, stiffness: 130, mass: 0.8 }),
        withSpring(1, { damping: 12, stiffness: 150, mass: 0.8 }),
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: theme.bg, borderColor: theme.border }]}>
        {/* Category chip + "הידעתם" header */}
        <Animated.View entering={FadeInDown.duration(280)} style={styles.header}>
          <View style={[styles.categoryChip, { backgroundColor: theme.chipBg }]}>
            <Text style={[styles.categoryLabel, { color: theme.chipText }]} allowFontScaling={false}>
              {theme.label}
            </Text>
          </View>
          <View style={styles.titleRow}>
            <Sparkles size={18} color={theme.accent} strokeWidth={2.5} />
            <Text style={[styles.title, { color: theme.accent }]} allowFontScaling={false}>
              הידעתם?
            </Text>
          </View>
        </Animated.View>

        {/* Finn + hero visual */}
        <Animated.View
          entering={FadeIn.duration(280).delay(80)}
          style={styles.heroRow}
        >
          {item.image ? (
            <ExpoImage
              source={item.image}
              style={styles.heroImage}
              contentFit="cover"
              accessible={false}
            />
          ) : (
            <View style={[styles.heroEmojiWrap, { backgroundColor: theme.chipBg }]}>
              <Text style={styles.heroEmoji} allowFontScaling={false} accessible={false}>
                {item.emoji}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Teaser, always visible */}
        <Text style={[styles.teaser, RTL]} allowFontScaling={false}>
          {item.teaser}
        </Text>

        {/* Reveal section */}
        {!revealed ? (
          <FeedStartButton
            label="לחצו לגלות"
            onPress={handleReveal}
            accessibilityLabel={`גלה את התשובה: ${item.teaser}`}
          />
        ) : (
          <Animated.View entering={FadeInUp.duration(360)} style={styles.revealBody}>
            <Animated.View
              style={[styles.highlightWrap, { backgroundColor: theme.accent }, highlightStyle]}
            >
              <Text style={styles.highlightText} allowFontScaling={false} numberOfLines={1}>
                {item.highlight}
              </Text>
            </Animated.View>

            <Animated.Text
              entering={FadeInUp.duration(320).delay(180)}
              style={[styles.punch, RTL]}
              allowFontScaling={false}
            >
              {item.punch}
            </Animated.Text>
          </Animated.View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 20,
    gap: 14,
  },
  header: {
    gap: 8,
  },
  categoryChip: {
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
    writingDirection: 'rtl',
  },
  titleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.3,
    writingDirection: 'rtl',
  },
  heroRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    minHeight: 110,
  },
  finn: {
    width: 84,
    height: 84,
  },
  heroImage: {
    flex: 1,
    height: 110,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  heroEmojiWrap: {
    flex: 1,
    height: 110,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: {
    fontSize: 58,
    lineHeight: 64,
  },
  teaser: {
    fontSize: 15,
    lineHeight: 22,
    color: '#1e293b',
    fontWeight: '700',
  },
  revealBody: {
    alignItems: 'center',
    gap: 12,
  },
  highlightWrap: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 18,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  highlightText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  punch: {
    fontSize: 14,
    lineHeight: 22,
    color: '#0f172a',
    fontWeight: '600',
  },
  source: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
