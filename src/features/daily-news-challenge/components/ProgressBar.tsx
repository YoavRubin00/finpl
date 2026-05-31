import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';

interface Segment {
  /** Short Hebrew label shown above the segment when active. */
  label: string;
  /** True if this segment has been completed (filled green). */
  done: boolean;
  /** True if this segment is the active one (pulsing). */
  active: boolean;
}

interface ProgressBarProps {
  segments: Segment[];
  /** 1-based current step number for the "שלב X מתוך Y" label. */
  currentStep: number;
  totalSteps: number;
}

const FILLED = '#22c55e';
const ACTIVE = '#0ea5e9';
const TRACK = 'rgba(15,23,42,0.08)';

/**
 * Duolingo-style segmented progress bar for the news challenge.
 * Replaces the 3-dot indicator with a real bar so the user feels forward
 * momentum. The active segment pulses subtly; completed segments lock to a
 * solid green fill.
 */
export function ProgressBar({ segments, currentStep, totalSteps }: ProgressBarProps): React.ReactElement {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [pulse]);

  const activePulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label} allowFontScaling={false}>
          {`שלב ${currentStep} מתוך ${totalSteps}`}
        </Text>
      </View>

      <View style={styles.segmentsRow}>
        {segments.map((seg, i) => (
          <View key={i} style={styles.segmentTrack}>
            {seg.done && <View style={styles.segmentFill} />}
            {seg.active && !seg.done && (
              <Animated.View style={[styles.segmentActiveFill, activePulseStyle]} />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 6,
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    writingDirection: 'rtl' as const,
  },
  segmentsRow: {
    flexDirection: 'row-reverse',
    gap: 6,
  },
  segmentTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: TRACK,
    overflow: 'hidden',
  },
  segmentFill: {
    width: '100%',
    height: '100%',
    backgroundColor: FILLED,
    borderRadius: 999,
  },
  segmentActiveFill: {
    width: '100%',
    height: '100%',
    backgroundColor: ACTIVE,
    borderRadius: 999,
  },
});
