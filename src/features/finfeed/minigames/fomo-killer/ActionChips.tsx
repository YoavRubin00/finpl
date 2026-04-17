import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  FadeInUp,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { EyeOff, Flag, Plus } from 'lucide-react-native';
import { tapHaptic, heavyHaptic } from '../../../../utils/haptics';
import { FOMO_MOTION } from './theme';
import type { UserAction } from './types';

interface Props {
  personaName: string;
  visible: boolean;
  onAction: (action: UserAction) => void;
}

/**
 * Three big Stitch-style action buttons fixed at the bottom of the chat.
 * "Add ₪500" has a breathing glow — visual temptation, part of the lesson.
 */
export function ActionChips({ personaName, visible, onAction }: Props) {
  const reduceMotion = useReducedMotion();
  const tempGlow = useSharedValue(0);

  useEffect(() => {
    if (!visible || reduceMotion) {
      cancelAnimation(tempGlow);
      tempGlow.value = 0;
      return;
    }
    tempGlow.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(tempGlow);
  }, [visible, reduceMotion, tempGlow]);

  const tempGlowStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + tempGlow.value * 0.4,
  }));

  if (!visible) return null;

  const handlePress = (action: UserAction) => {
    if (action === 'add') {
      heavyHaptic();
    } else {
      tapHaptic();
    }
    onAction(action);
  };

  return (
    <Animated.View
      entering={FadeInUp.duration(260).delay(FOMO_MOTION.chipAppearDelayMs)}
      style={styles.container}
    >
      <View style={styles.row}>
        <ActionButton
          label="התעלם"
          icon={<EyeOff size={22} color="#ffffff" strokeWidth={2.6} />}
          bg="rgba(71,85,105,0.85)"
          borderBottom="#1e293b"
          accessibilityLabel={`התעלם מהודעה של ${personaName}`}
          accessibilityHint="ממשיך להודעה הבאה"
          onPress={() => handlePress('ignore')}
        />
        <ActionButton
          label="ספאם"
          icon={<Flag size={22} color="#ffffff" strokeWidth={2.6} />}
          bg="rgba(220,38,38,0.82)"
          borderBottom="#7f1d1d"
          accessibilityLabel={`דווח על הודעה של ${personaName} כספאם`}
          accessibilityHint="מסמן כהונאה ומעניק XP"
          onPress={() => handlePress('report')}
        />
        <ActionButton
          label="הוסף ₪500"
          icon={<Plus size={22} color="#ffffff" strokeWidth={2.6} />}
          bg="rgba(22,163,74,0.82)"
          borderBottom="#14532d"
          pulseStyle={tempGlowStyle}
          accessibilityLabel="הוסף חמש מאות שקלים למניה"
          accessibilityHint="שים לב — יכולה להיות מלכודת פומו"
          onPress={() => handlePress('add')}
        />
      </View>
    </Animated.View>
  );
}

interface ActionButtonProps {
  label: string;
  icon: React.ReactNode;
  bg: string;
  borderBottom: string;
  pulseStyle?: ReturnType<typeof useAnimatedStyle>;
  accessibilityLabel: string;
  accessibilityHint: string;
  onPress: () => void;
}

function ActionButton({
  label,
  icon,
  bg,
  borderBottom,
  pulseStyle,
  accessibilityLabel,
  accessibilityHint,
  onPress,
}: ActionButtonProps) {
  return (
    <View style={styles.buttonWrap}>
      {pulseStyle && (
        <Animated.View
          pointerEvents="none"
          style={[styles.pulseInner, pulseStyle]}
        />
      )}
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: bg,
            borderBottomColor: borderBottom,
          },
          pressed && {
            transform: [{ translateY: 2 }],
            borderBottomWidth: 2,
            marginTop: 2,
          },
        ]}
      >
        <View style={styles.iconSlot}>{icon}</View>
        <Text
          style={styles.label}
          allowFontScaling={false}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {label}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonWrap: {
    flex: 1,
    position: 'relative',
    overflow: 'visible',
  },
  pulseInner: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(74,222,128,0.55)',
    shadowColor: '#22c55e',
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  button: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 8,
    minHeight: 64,
    borderRadius: 16,
    borderBottomWidth: 4,
  },
  iconSlot: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  label: {
    fontSize: 13,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.2,
    textAlign: 'center',
    writingDirection: 'rtl',
    includeFontPadding: false,
    flexShrink: 1,
  },
});
