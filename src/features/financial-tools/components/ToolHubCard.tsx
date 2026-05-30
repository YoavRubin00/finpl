import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Lock, Zap } from 'lucide-react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { STITCH } from '../../../constants/theme';
import { tapHaptic } from '../../../utils/haptics';
import type { ToolMeta } from '../toolsRegistry';

interface ToolHubCardProps {
  tool: ToolMeta;
  /** Index in the grid — used for staggered entry. */
  index: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Stitch-style tool tile. Renders inside a 2-column grid in the hub.
 * Shows: corner gradient halo, icon tile (tinted gradient), label + subtitle,
 * bottom accent band in the tool's hue, footer with XP chip (active) or lock
 * icon (coming_soon). Press feedback is a soft spring scale-down.
 *
 * Memoized: registry entries are module-level constants, so `tool` is
 * referentially stable. `index` only changes on registry edits. With
 * React.memo, a parent state change in the hub no longer cascades into
 * every card.
 */
function ToolHubCardInner({ tool, index }: ToolHubCardProps): React.ReactElement {
  const router = useRouter();
  const isComingSoon = tool.status === 'coming_soon';
  const { Icon } = tool;

  const pressScale = useSharedValue(1);
  const pressAnim = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const handlePress = () => {
    tapHaptic();
    if (!isComingSoon) {
      router.push(tool.route as never);
    }
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(80 + index * 50).duration(360)}
      style={styles.outer}
    >
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={() => {
          pressScale.value = withSpring(0.96, { damping: 18, stiffness: 280 });
        }}
        onPressOut={() => {
          pressScale.value = withSpring(1, { damping: 16, stiffness: 220 });
        }}
        style={[styles.card, isComingSoon && styles.cardDisabled, pressAnim]}
        accessibilityRole="button"
        accessibilityLabel={tool.label}
        accessibilityHint={isComingSoon ? 'בקרוב' : tool.subtitle}
        accessibilityState={{ disabled: isComingSoon }}
      >
        {/* Top-left gradient halo — richer than a flat tinted disc */}
        <LinearGradient
          colors={
            isComingSoon
              ? ['rgba(148,163,184,0.22)', 'rgba(148,163,184,0)']
              : [tool.hue + '38', tool.hue + '00']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.halo}
          pointerEvents="none"
        />

        {/* Icon tile with subtle gradient fill */}
        <LinearGradient
          colors={
            isComingSoon
              ? [STITCH.surfaceLow, STITCH.surfaceLow]
              : [tool.light, tool.hue + '1A']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[
            styles.iconTile,
            {
              borderColor: isComingSoon ? STITCH.surfaceHighest : tool.hue + '4D',
              shadowColor: isComingSoon ? 'transparent' : tool.hue,
            },
          ]}
        >
          <Icon
            size={22}
            color={isComingSoon ? STITCH.onSurfaceVariant : tool.hue}
            strokeWidth={2.4}
          />
        </LinearGradient>

        <Text
          style={[styles.label, isComingSoon && styles.labelDisabled]}
          numberOfLines={1}
        >
          {tool.label}
        </Text>
        <Text
          style={[styles.subtitle, isComingSoon && styles.subtitleDisabled]}
          numberOfLines={2}
        >
          {tool.subtitle}
        </Text>

        {/* Footer divider + chip */}
        <View style={styles.footerDivider} />
        <View style={styles.footer}>
          <View style={styles.footerRight}>
            {isComingSoon ? (
              <>
                <Lock size={11} color={STITCH.onSurfaceVariant} strokeWidth={2.6} />
                <Text style={styles.footerText}>בקרוב</Text>
              </>
            ) : (
              <>
                <Zap size={11} color={tool.hue} strokeWidth={2.8} fill={tool.hue} />
                <Text style={[styles.footerText, { color: tool.hue }]}>
                  +{tool.xpReward} XP
                </Text>
              </>
            )}
          </View>
          <View
            style={[
              styles.chevronCircle,
              {
                backgroundColor: isComingSoon ? STITCH.surfaceLow : tool.hue,
                shadowColor: isComingSoon ? 'transparent' : tool.hue,
              },
            ]}
          >
            <ChevronLeft
              size={12}
              color={isComingSoon ? STITCH.onSurfaceVariant : '#ffffff'}
              strokeWidth={3.2}
            />
          </View>
        </View>

        {/* Bottom accent band — colored hairline that lifts the tile */}
        {!isComingSoon ? (
          <LinearGradient
            colors={[tool.hue + '00', tool.hue + 'CC', tool.hue + '00']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.bottomAccent}
            pointerEvents="none"
          />
        ) : null}
      </AnimatedPressable>
    </Animated.View>
  );
}

export const ToolHubCard = React.memo(ToolHubCardInner);

const styles = StyleSheet.create({
  outer: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  card: {
    flex: 1, // Stretch to the row's tallest sibling so cards in the same row
             // share an identical height regardless of subtitle line count.
    backgroundColor: STITCH.surfaceLowest,
    borderRadius: 18,
    padding: 12,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
    overflow: 'hidden',
    minHeight: 158,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  cardDisabled: {
    opacity: 0.65,
  },
  halo: {
    position: 'absolute',
    top: -28,
    left: -28,
    width: 110,
    height: 110,
    borderRadius: 110,
  },
  iconTile: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '900',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
    textAlign: 'right',
    lineHeight: 18,
  },
  labelDisabled: {
    color: STITCH.onSurfaceVariant,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
    textAlign: 'right',
    marginTop: 3,
    lineHeight: 15,
  },
  subtitleDisabled: {
    color: STITCH.onSurfaceVariant,
    opacity: 0.7,
  },
  footerDivider: {
    height: 1,
    backgroundColor: STITCH.surfaceHighest,
    // `marginTop: 'auto'` pushes the divider + footer to the bottom of the
    // card, so the chevron sits at the same height across every tile in a row
    // regardless of subtitle line count (1 vs 2 lines).
    marginTop: 'auto',
    marginBottom: 8,
    paddingTop: 10,
  },
  footer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 10,
    fontWeight: '900',
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
  },
  chevronCircle: {
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  // A 2px colored sweep at the bottom — gives the tile a finished, gilt-edge
  // feel without competing with the chevron.
  bottomAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
  },
});
