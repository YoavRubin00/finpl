/**
 * MysteryBoxCard — animated gift box with rotating conic-gradient glow.
 *
 * Source: `assets/DESIGN/Design System_files/premium-cards.jsx` (MysteryBoxCard).
 * Square card. CTA shows gem cost.
 *
 * Usage:
 *   <MysteryBoxCard cost={50} possibleRewards={['XP','💎','🪙','❤️','⚡']} onPress={...} />
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Rect, Text as SvgText } from 'react-native-svg';
import { Diamond } from 'lucide-react-native';

interface Props {
  cost?: number;
  possibleRewards?: readonly string[];
  totalRewardCount?: number;
  onPress?: () => void;
}

export const MysteryBoxCard = React.memo(function MysteryBoxCard({
  cost = 50,
  possibleRewards = ['XP', '💎', '🪙', '❤️', '⚡'],
  totalRewardCount = 17,
  onPress,
}: Props) {
  const rot = useSharedValue(0);
  useEffect(() => {
    rot.value = withRepeat(
      withTiming(360, { duration: 4000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [rot]);
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot.value}deg` }],
  }));

  const extraCount = Math.max(0, totalRewardCount - possibleRewards.length);

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`תיבת הפתעה, ${cost} יהלומים`}>
      <LinearGradient
        colors={['#7c3aed', '#ec4899', '#f59e0b']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.outer}
      >
        <View style={styles.inner}>
          <View style={styles.tagPill}>
            <LinearGradient
              colors={['#ec4899', '#f59e0b']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.tagText} allowFontScaling={false}>מסתורי</Text>
          </View>

          {/* Box visual with rotating glow */}
          <View style={styles.boxWrap}>
            <Animated.View style={[styles.glowRing, ringStyle]}>
              <LinearGradient
                colors={['transparent', '#ec489966', 'transparent', '#f59e0b66', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>

            <Svg width={80} height={80} viewBox="0 0 80 80">
              <Defs>
                <SvgLinearGradient id="mboxG" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#a78bfa" />
                  <Stop offset="0.5" stopColor="#ec4899" />
                  <Stop offset="1" stopColor="#f59e0b" />
                </SvgLinearGradient>
              </Defs>
              <Rect x={14} y={22} width={52} height={52} rx={6} fill="url(#mboxG)" stroke="#1a1035" strokeWidth={2} />
              <Rect x={10} y={18} width={60} height={14} rx={4} fill="url(#mboxG)" stroke="#1a1035" strokeWidth={2} />
              <Rect x={36} y={18} width={8} height={56} fill="#fbbf24" stroke="#1a1035" strokeWidth={1.5} />
              <Rect x={10} y={22} width={60} height={6} fill="#fbbf24" stroke="#1a1035" strokeWidth={1.5} />
              <SvgText x={40} y={58} fontSize={28} fontWeight="900" textAnchor="middle" fill="#fff" stroke="#1a1035" strokeWidth={1}>
                ?
              </SvgText>
            </Svg>
          </View>

          <Text style={styles.title} allowFontScaling={false}>תיבת הפתעה</Text>

          {/* Possible rewards row */}
          <View style={styles.rewardsRow}>
            {possibleRewards.slice(0, 5).map((r, i) => (
              <View key={i} style={styles.rewardChip}>
                <Text style={styles.rewardEmoji}>{r}</Text>
              </View>
            ))}
            {extraCount > 0 && (
              <View style={[styles.rewardChip, styles.rewardChipDashed]}>
                <Text style={styles.rewardMore} allowFontScaling={false}>+{extraCount}</Text>
              </View>
            )}
          </View>

          {/* CTA */}
          <View style={styles.cta}>
            <LinearGradient
              colors={['#ec4899', '#be185d']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.ctaSep} allowFontScaling={false}>פתח · </Text>
            <Text style={styles.ctaCost} allowFontScaling={false}>{cost}</Text>
            <Text style={styles.ctaGem} allowFontScaling={false}>💎</Text>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  outer: {
    borderRadius: 22,
    padding: 2.5,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 8,
  },
  inner: {
    borderRadius: 19.5,
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 12,
    backgroundColor: 'rgba(10,22,40,0.94)',
    alignItems: 'center',
    overflow: 'hidden',
  },
  tagPill: {
    position: 'absolute',
    top: 8,
    insetInlineStart: 8,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  tagText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.8,
  },
  boxWrap: {
    width: 120,
    height: 110,
    marginTop: 8,
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glowRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.7,
  },
  title: {
    fontSize: 14,
    fontWeight: '900',
    color: '#fef3c7',
    marginBottom: 6,
    writingDirection: 'rtl' as const,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  rewardsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 10,
  },
  rewardChip: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardChipDashed: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.18)',
  },
  rewardEmoji: {
    fontSize: 11,
  },
  rewardMore: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a8c2',
  },
  cta: {
    width: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  ctaCost: {
    fontSize: 13,
    fontWeight: '900',
    color: '#fff',
    fontVariant: ['tabular-nums'] as const,
  },
  ctaSep: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    opacity: 0.85,
  },
  ctaGem: {
    fontSize: 16,
    marginInlineStart: 2,
  },
});
