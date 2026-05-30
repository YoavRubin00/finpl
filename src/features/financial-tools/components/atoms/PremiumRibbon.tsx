import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { STITCH } from '../../../../constants/theme';

interface PremiumRibbonProps {
  children?: string;
  /** Smaller variant for tight spaces (hub cards). */
  compact?: boolean;
}

/**
 * Gold gradient pill — marks premium tools on the hub and elsewhere.
 * Uses the STITCH gold tokens; not a one-off color.
 */
export function PremiumRibbon({
  children = 'פרימיום',
  compact = false,
}: PremiumRibbonProps): React.ReactElement {
  return (
    <View style={[styles.shadow, compact && styles.shadowCompact]}>
      <LinearGradient
        colors={[STITCH.tertiaryGoldBright, STITCH.tertiaryGold]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.pill, compact && styles.pillCompact]}
      >
        <Svg width={compact ? 10 : 12} height={compact ? 10 : 12} viewBox="0 0 24 24">
          <Path
            d="M12 2 L13.5 10.5 L22 12 L13.5 13.5 L12 22 L10.5 13.5 L2 12 L10.5 10.5 Z"
            fill="#3a2400"
          />
        </Svg>
        <Text style={[styles.text, compact && styles.textCompact]}>{children}</Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: STITCH.tertiaryGold,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
    alignSelf: 'flex-start',
    borderRadius: 999,
  },
  shadowCompact: {
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  pill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillCompact: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 3,
  },
  text: {
    fontSize: 10,
    fontWeight: '900',
    color: '#3a2400',
    letterSpacing: 0.6,
    writingDirection: 'rtl',
  },
  textCompact: {
    fontSize: 9,
    letterSpacing: 0.4,
  },
});
