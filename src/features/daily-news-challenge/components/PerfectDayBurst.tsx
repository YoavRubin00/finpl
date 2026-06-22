import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp, useReducedMotion } from 'react-native-reanimated';
import { Image as ExpoImage } from 'expo-image';

import { ConfettiExplosion } from '../../../components/ui/ConfettiExplosion';
import { FINN_DANCING } from '../../retention-loops/finnMascotConfig';
import { doubleHeavyHaptic } from '../../../utils/haptics';
import { STITCH } from '../../../constants/theme';

interface PerfectDayBurstProps {
  /** Set to true once when the user enters the chests page after a 2/2 day. */
  show: boolean;
}

/**
 * Inline (non-modal) celebration for a perfect day: confetti + Finn dancing +
 * gold badge. Renders only while `show` is true; parent can keep it mounted.
 */
export function PerfectDayBurst({ show }: PerfectDayBurstProps): React.ReactElement | null {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (show && !reduceMotion) doubleHeavyHaptic();
  }, [show, reduceMotion]);

  if (!show) return null;

  return (
    <View style={styles.wrap} pointerEvents="none">
      {!reduceMotion && <ConfettiExplosion />}
      <Animated.View entering={FadeInUp.duration(360)} style={styles.badgeRow}>
        <View style={styles.finnWrap}>
          <ExpoImage
            source={FINN_DANCING}
            style={styles.finn}
            contentFit="contain"
            accessible={false}
          />
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeIcon} allowFontScaling={false}>🏆</Text>
          <Text style={styles.badgeTitle} allowFontScaling={false}>יום מושלם!</Text>
          <Text style={styles.badgeSub} allowFontScaling={false}>+1 💎 בונוס לכל תיבה</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  badgeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    shadowColor: '#facc15',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 10,
  },
  finnWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(250, 204, 21, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  finn: {
    width: 64,
    height: 64,
  },
  badge: {
    alignItems: 'flex-end',
    gap: 2,
  },
  badgeIcon: {
    fontSize: 18,
  },
  badgeTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#facc15',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  badgeSub: {
    fontSize: 11,
    fontWeight: '700',
    color: STITCH.surfaceLow,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
});
