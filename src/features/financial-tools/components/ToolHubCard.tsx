import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Lock, Zap } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { STITCH } from '../../../constants/theme';
import { tapHaptic } from '../../../utils/haptics';
import type { ToolMeta } from '../toolsRegistry';
import { PremiumRibbon } from './atoms/PremiumRibbon';

interface ToolHubCardProps {
  tool: ToolMeta;
  /** Index in the grid — used for staggered entry. */
  index: number;
}

/**
 * Stitch-style tool tile. Renders inside a 2-column grid in the hub.
 * Shows: corner color halo, emoji icon, label + subtitle, footer with
 * XP chip (active) or lock icon (coming_soon), premium ribbon if applicable.
 *
 * Memoized: the registry entries are module-level constants, so the `tool`
 * prop is referentially stable across re-renders. `index` only changes on
 * registry edits. With `React.memo`, a parent state change in the hub no
 * longer cascades into all 10 cards.
 */
function ToolHubCardInner({ tool, index }: ToolHubCardProps): React.ReactElement {
  const router = useRouter();
  const isComingSoon = tool.status === 'coming_soon';
  const { Icon } = tool;

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
      <Pressable
        onPress={handlePress}
        style={[styles.card, isComingSoon && styles.cardDisabled]}
        accessibilityRole="button"
        accessibilityLabel={tool.label}
        accessibilityHint={isComingSoon ? 'בקרוב' : tool.subtitle}
        accessibilityState={{ disabled: isComingSoon }}
      >
        {/* Corner color halo */}
        <View
          style={[styles.halo, { backgroundColor: tool.hue + '22' }]}
          pointerEvents="none"
        />

        {/* Badge cluster top-left */}
        {tool.premiumDark && !isComingSoon ? (
          <View style={styles.badge}>
            <PremiumRibbon compact />
          </View>
        ) : null}

        {/* Icon tile */}
        <View
          style={[
            styles.iconTile,
            {
              backgroundColor: isComingSoon ? STITCH.surfaceLow : tool.light,
              borderColor: isComingSoon ? STITCH.surfaceHighest : tool.hue + '40',
            },
          ]}
        >
          <Icon
            size={22}
            color={isComingSoon ? STITCH.onSurfaceVariant : tool.hue}
            strokeWidth={2.4}
          />
        </View>

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
      </Pressable>
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
    backgroundColor: STITCH.surfaceLowest,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
    overflow: 'hidden',
    minHeight: 158,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardDisabled: {
    opacity: 0.65,
  },
  halo: {
    position: 'absolute',
    top: -22,
    left: -22,
    width: 90,
    height: 90,
    borderRadius: 90,
  },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 2,
  },
  iconTile: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
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
    marginTop: 10,
    marginBottom: 8,
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
  },
});
