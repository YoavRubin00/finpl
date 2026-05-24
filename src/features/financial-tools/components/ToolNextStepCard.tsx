import React from 'react';
import { View, Text, Pressable, StyleSheet, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { BookOpen, ArrowLeft, ExternalLink } from 'lucide-react-native';

import { STITCH } from '../../../constants/theme';
import { tapHaptic } from '../../../utils/haptics';
import { NEXT_STEPS, type FinancialToolKey } from '../financialNextStepMap';

interface ToolNextStepCardProps {
  /** Which tool is rendering this card — drives the lesson + action lookup. */
  toolKey: FinancialToolKey;
  /** Brand accent that tints the primary action button. */
  accentColor: string;
}

/**
 * Two-CTA closing card for every Financial Tool. Renders directly above the
 * disclaimer at the bottom of each calculator's ScrollView. Left-side (RTL:
 * visually right) is a quiet "ללמוד עוד" chip linking to the relevant
 * lesson; right-side is the primary "next step" — usually a sibling tool
 * (auto-pre-filled from the shared financial profile) or, for tax-refund,
 * an external gov.il link wrapped in a confirm dialog.
 */
export function ToolNextStepCard({ toolKey, accentColor }: ToolNextStepCardProps) {
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

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View style={[styles.headerDot, { backgroundColor: accentColor }]} />
        <Text style={styles.sectionLabel} allowFontScaling={false}>
          מה הלאה
        </Text>
      </View>

      {/* Primary action — full-width, prominent CTA */}
      <Pressable
        onPress={handleAction}
        style={({ pressed }) => [
          styles.actionBtn,
          { backgroundColor: accentColor, shadowColor: accentColor },
          pressed && styles.btnPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={entry.actionLabel}
        hitSlop={4}
      >
        <View style={styles.actionIconWrap}>
          {isExternal ? (
            <ExternalLink size={18} color="#ffffff" strokeWidth={2.6} />
          ) : (
            <ArrowLeft size={18} color="#ffffff" strokeWidth={2.6} />
          )}
        </View>
        <Text
          style={styles.actionText}
          allowFontScaling={false}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {entry.actionLabel}
        </Text>
      </Pressable>

      {/* Lesson CTA — light-tinted, Duolingo-style button (same shape as
          CalculateButton, lighter shade so it sits as a secondary call). */}
      <Pressable
        onPress={handleLesson}
        style={({ pressed }) => [
          styles.lessonBtn,
          {
            backgroundColor: accentColor + '33',
            borderBottomColor: accentColor,
          },
          pressed && styles.lessonBtnPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`למד: ${entry.lessonLabel}`}
        hitSlop={4}
      >
        <View style={[styles.lessonIconWrap, { backgroundColor: accentColor + '40' }]}>
          <BookOpen size={18} color={accentColor} strokeWidth={2.6} />
        </View>
        <Text
          style={[styles.lessonText, { color: accentColor }]}
          allowFontScaling={false}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {entry.lessonLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
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
  actionBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    minHeight: 52,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  actionIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
    writingDirection: 'rtl',
    flexShrink: 1,
    letterSpacing: 0.2,
  },
  lessonBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderBottomWidth: 3,
    minHeight: 52,
  },
  lessonIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl',
    flexShrink: 1,
    lineHeight: 17,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  lessonBtnPressed: {
    opacity: 0.92,
    transform: [{ translateY: 1 }],
  },
});
