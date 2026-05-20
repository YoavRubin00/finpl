/**
 * FlashOfferBanner — wide horizontal "limited time" sale banner.
 *
 * Source: `assets/DESIGN/Design System_files/premium-cards.jsx` (FlashOfferBanner).
 * Sunburst discount badge (rotates) + countdown timer + sale price.
 *
 * Usage:
 *   <FlashOfferBanner discount={50} originalPrice="₪59.90" salePrice="₪29.90"
 *     timeLeftSeconds={2*3600 + 14*60 + 8} onPress={...} />
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

interface Props {
  title?: string;
  discount?: number;
  originalPrice?: string;
  salePrice?: string;
  timeLeftSeconds?: number;
  onPress?: () => void;
}

function formatHMS(s: number): string {
  if (s < 0) s = 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

export const FlashOfferBanner = React.memo(function FlashOfferBanner({
  title = 'חבילת מתחילים',
  discount = 50,
  originalPrice = '₪59.90',
  salePrice = '₪29.90',
  timeLeftSeconds,
  onPress,
}: Props) {
  const [remaining, setRemaining] = useState<number>(timeLeftSeconds ?? 8048);
  useEffect(() => {
    if (timeLeftSeconds === undefined) return;
    setRemaining(timeLeftSeconds);
  }, [timeLeftSeconds]);
  useEffect(() => {
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  // Sunburst rotation
  const rotation = useSharedValue(0);
  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 8000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [rotation]);
  const burstStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}, הנחת ${discount}%, ${salePrice}`}>
      <LinearGradient
        colors={['#dc2626', '#f59e0b']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.outer}
      >
        <LinearGradient
          colors={['#1a1035', '#7c2d12']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.inner}
        >
          {/* Sunburst discount badge */}
          <View style={styles.burstBox}>
            <Animated.View style={[StyleSheet.absoluteFill, burstStyle]}>
              <Svg width={90} height={90} viewBox="0 0 90 90">
                <Path
                  d="M45 4 L52 14 L64 8 L65 22 L78 22 L72 34 L84 40 L74 50 L82 62 L68 64 L66 78 L54 70 L46 82 L38 70 L26 78 L24 64 L10 62 L18 50 L8 40 L20 34 L14 22 L27 22 L28 8 L40 14 Z"
                  fill="#fbbf24"
                  stroke="#7c2d12"
                  strokeWidth={2}
                  strokeLinejoin="round"
                />
              </Svg>
            </Animated.View>
            <View style={styles.burstText}>
              <Text style={styles.burstPct} allowFontScaling={false}>{discount}%</Text>
              <Text style={styles.burstLabel} allowFontScaling={false}>הנחה</Text>
            </View>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <View style={styles.limitedPill}>
              <Text style={styles.limitedText} allowFontScaling={false}>⚡ זמן מוגבל</Text>
            </View>
            <Text style={styles.title} allowFontScaling={false} numberOfLines={1}>
              {title}
            </Text>
            <View style={styles.priceRow}>
              <Text style={styles.salePrice} allowFontScaling={false}>{salePrice}</Text>
              <Text style={styles.origPrice} allowFontScaling={false}>{originalPrice}</Text>
            </View>
            <View style={styles.timerPill}>
              <Text style={styles.timerEmoji}>⏱️</Text>
              <Text style={styles.timerText} allowFontScaling={false}>{formatHMS(remaining)}</Text>
            </View>
          </View>
        </LinearGradient>
      </LinearGradient>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  outer: {
    borderRadius: 22,
    padding: 2.5,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 8,
  },
  inner: {
    borderRadius: 19.5,
    padding: 14,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
    overflow: 'hidden',
  },
  burstBox: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  burstText: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  burstPct: {
    fontSize: 22,
    fontWeight: '900',
    color: '#7c2d12',
    fontVariant: ['tabular-nums'] as const,
    lineHeight: 22,
  },
  burstLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#7c2d12',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
  },
  limitedPill: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  limitedText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#fbbf24',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fef3c7',
    marginBottom: 4,
    writingDirection: 'rtl' as const,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  priceRow: {
    flexDirection: 'row-reverse',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 8,
  },
  salePrice: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fbbf24',
    fontVariant: ['tabular-nums'] as const,
  },
  origPrice: {
    fontSize: 11,
    color: '#94a8c2',
    textDecorationLine: 'line-through' as const,
    fontVariant: ['tabular-nums'] as const,
  },
  timerPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  timerEmoji: {
    fontSize: 10,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#fef3c7',
    fontVariant: ['tabular-nums'] as const,
    letterSpacing: 0.5,
  },
});
