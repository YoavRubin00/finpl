import React from 'react';
import { View, Text, Pressable, StyleSheet, Alert, Linking } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { BookOpen, ChevronLeft, ExternalLink, ArrowLeft } from 'lucide-react-native';

import { STITCH } from '../../../constants/theme';
import { tapHaptic } from '../../../utils/haptics';
import { NEXT_STEPS, type FinancialToolKey } from '../financialNextStepMap';

interface ToolNextStepCardProps {
  /** Which tool is rendering this card — drives the lesson + action lookup. */
  toolKey: FinancialToolKey;
  /** Page accent. Drives the two derived shades for the buttons. */
  accentColor: string;
  /** Manual override for the primary action background. Used when
   *  `accentColor` collides with the page's share-result variant and a
   *  visually distinct shade reads better. */
  actionColor?: string;
  /** Paired bottom-border shadow for `actionColor`. Auto-derives a darker
   *  shade if omitted. */
  actionShadowColor?: string;
}

/**
 * Two stacked Duolingo-style CTAs that close every tool screen. Both share
 * the same shape as the "שתף תוצאה" `CalculateButton` (solid bg + 4px
 * bottom-border + sheen + spring-scale press) but render in two different
 * shades of the page accent so neither competes with the share button above.
 *
 *   • Primary action  — deeper shade of `accentColor`, white text/icon.
 *   • Lesson          — soft pastel of `accentColor`, dark accent text/icon.
 *
 * No wrapping card frame: each button sits as its own standalone block,
 * matching how the share button presents above.
 */
export function ToolNextStepCard({
  toolKey,
  accentColor,
  actionColor,
  actionShadowColor,
}: ToolNextStepCardProps) {
  const router = useRouter();
  const entry = NEXT_STEPS[toolKey];

  const handleLesson = () => {
    tapHaptic();
    router.push(`/lesson/${entry.lessonId}?chapterId=${entry.chapterId}` as never);
  };

  const handleAction = () => {
    tapHaptic();
    if (entry.actionUrl) {
      Alert.alert(
        'מעבר לאתר חיצוני',
        'נעבור לאתר רשמי של רשות המסים כדי להגיש את הבקשה — להמשיך?',
        [
          { text: 'לא עכשיו', style: 'cancel' },
          {
            text: 'להמשיך',
            onPress: () => {
              if (entry.actionUrl) {
                Linking.openURL(entry.actionUrl).catch(() => {
                  Alert.alert('שגיאה', 'לא הצלחנו לפתוח את הקישור. נסו שוב מאוחר יותר.');
                });
              }
            },
          },
        ],
      );
      return;
    }
    if (entry.actionRoute) {
      router.push(entry.actionRoute as never);
    }
  };

  const isExternal = !!entry.actionUrl;

  const actionBg = actionColor ?? mix(accentColor, 'black', 0.12);
  const actionShadow = actionShadowColor ?? mix(actionBg, 'black', 0.35);
  const lessonFg = mix(accentColor, 'black', 0.45);

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View style={[styles.headerDot, { backgroundColor: accentColor }]} />
        <Text style={styles.sectionLabel} allowFontScaling={false}>
          מה הלאה
        </Text>
      </View>

      <NextStepButton
        label={entry.actionLabel}
        bg={actionBg}
        shadow={actionShadow}
        fg="#ffffff"
        iconBg="rgba(255,255,255,0.22)"
        icon={
          isExternal ? (
            <ExternalLink size={18} color="#ffffff" strokeWidth={2.6} />
          ) : (
            <ArrowLeft size={18} color="#ffffff" strokeWidth={2.6} />
          )
        }
        onPress={handleAction}
      />

      <Pressable
        onPress={handleLesson}
        accessibilityRole="button"
        accessibilityLabel={`למד: ${entry.lessonLabel}`}
        hitSlop={8}
        style={({ pressed }) => [styles.lessonLink, pressed && { opacity: 0.55 }]}
      >
        <BookOpen size={14} color={lessonFg} strokeWidth={2.6} />
        <Text
          style={[styles.lessonLinkText, { color: lessonFg }]}
          allowFontScaling={false}
          numberOfLines={2}
        >
          {entry.lessonLabel}
        </Text>
      </Pressable>
    </View>
  );
}

function NextStepButton({
  label,
  bg,
  shadow,
  fg,
  iconBg,
  icon,
  onPress,
}: {
  label: string;
  bg: string;
  shadow: string;
  fg: string;
  iconBg: string;
  icon: React.ReactNode;
  onPress: () => void;
}): React.ReactElement {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 18, stiffness: 280 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 18, stiffness: 280 });
        }}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={4}
        style={[
          styles.btn,
          { backgroundColor: bg, borderBottomColor: shadow, shadowColor: bg },
        ]}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.sheen}
          pointerEvents="none"
        />
        <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>{icon}</View>
        <Text
          style={[styles.label, { color: fg }]}
          allowFontScaling={false}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {label}
        </Text>
        <ChevronLeft size={20} color={fg} strokeWidth={2.8} />
      </Pressable>
    </Animated.View>
  );
}

// Mix `hex` toward white or black by amount `t` (0..1). Used to derive
// distinct shades of the page accent for the two stacked buttons.
function mix(hex: string, toward: 'white' | 'black', t: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const target = toward === 'white' ? 255 : 0;
  const ch = (c: number) => {
    const v = Math.max(0, Math.min(255, Math.round(c + (target - c) * t)));
    return v.toString(16).padStart(2, '0');
  };
  return `#${ch(r)}${ch(g)}${ch(b)}`;
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  headerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: STITCH.onSurfaceVariant,
    textAlign: 'right',
    writingDirection: 'rtl',
    letterSpacing: 0.4,
  },
  btn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderBottomWidth: 4,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '52%',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl',
    letterSpacing: 0.2,
  },
  lessonLink: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  lessonLinkText: {
    fontSize: 13,
    fontWeight: '700',
    writingDirection: 'rtl',
    textAlign: 'right',
    textDecorationLine: 'underline',
    textDecorationStyle: 'solid',
  },
});
