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
import { FOMO_MOTION, FOMO_TOKENS } from './theme';
import type { UserAction } from './types';

interface Props {
  personaName: string;
  visible: boolean;
  onAction: (action: UserAction) => void;
}

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
          icon={<EyeOff size={26} color={FOMO_TOKENS.ignoreText} strokeWidth={2.4} />}
          bg={FOMO_TOKENS.ignoreBg}
          border={FOMO_TOKENS.ignoreBorder}
          borderBottom="#334155"
          textColor={FOMO_TOKENS.ignoreText}
          accessibilityLabel={`התעלם מהודעה של ${personaName}`}
          accessibilityHint="ממשיך להודעה הבאה"
          onPress={() => handlePress('ignore')}
        />
        <ActionButton
          label="ספאם"
          icon={<Flag size={26} color={FOMO_TOKENS.reportText} strokeWidth={2.6} />}
          bg={FOMO_TOKENS.reportBg}
          border={FOMO_TOKENS.reportBorder}
          borderBottom="#991b1b"
          textColor={FOMO_TOKENS.reportText}
          accessibilityLabel={`דווח על הודעה של ${personaName} כספאם`}
          accessibilityHint="מסמן כהונאה ומעניק XP"
          onPress={() => handlePress('report')}
        />
        <ActionButton
          label="הוסף ₪500"
          icon={<Plus size={26} color={FOMO_TOKENS.tempText} strokeWidth={2.6} />}
          bg={FOMO_TOKENS.tempBg}
          border={FOMO_TOKENS.tempBorder}
          borderBottom="#15803d"
          textColor={FOMO_TOKENS.tempText}
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
  border: string;
  borderBottom: string;
  textColor: string;
  pulseStyle?: ReturnType<typeof useAnimatedStyle>;
  accessibilityLabel: string;
  accessibilityHint: string;
  onPress: () => void;
}

function ActionButton({
  label,
  icon,
  bg,
  border,
  borderBottom,
  textColor,
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
        hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: bg,
            borderColor: border,
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
          style={[styles.label, { color: textColor }]}
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
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 12,
    zIndex: 2,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: 6,
  },
  buttonWrap: {
    flex: 1,
    position: 'relative',
    overflow: 'visible',
    zIndex: 2,
  },
  pulseInner: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(74,222,128,0.2)',
    shadowColor: '#22c55e',
    shadowOpacity: 0.7,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  button: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 8,
    minHeight: 84,
    borderRadius: 18,
    borderWidth: 1.5,
    borderBottomWidth: 4,
  },
  iconSlot: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.3,
    textAlign: 'center',
    writingDirection: 'rtl',
    includeFontPadding: false,
    flexShrink: 1,
  },
});