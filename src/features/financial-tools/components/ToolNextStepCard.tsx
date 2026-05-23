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
      <Text style={styles.sectionLabel} allowFontScaling={false}>
        מה הלאה
      </Text>

      <View style={styles.row}>
        {/* Primary action — wider, brand-colored */}
        <Pressable
          onPress={handleAction}
          style={({ pressed }) => [
            styles.actionBtn,
            { backgroundColor: accentColor },
            pressed && styles.btnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={entry.actionLabel}
          hitSlop={4}
        >
          {isExternal ? (
            <ExternalLink size={16} color="#ffffff" strokeWidth={2.4} />
          ) : (
            <ArrowLeft size={16} color="#ffffff" strokeWidth={2.4} />
          )}
          <Text style={styles.actionText} allowFontScaling={false} numberOfLines={2}>
            {entry.actionLabel}
          </Text>
        </Pressable>

        {/* Lesson chip — quieter, outlined */}
        <Pressable
          onPress={handleLesson}
          style={({ pressed }) => [
            styles.lessonBtn,
            { borderColor: accentColor + '4d' },
            pressed && styles.btnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`למד: ${entry.lessonLabel}`}
          hitSlop={4}
        >
          <BookOpen size={16} color={accentColor} strokeWidth={2.4} />
          <Text
            style={[styles.lessonText, { color: accentColor }]}
            allowFontScaling={false}
            numberOfLines={2}
          >
            {entry.lessonLabel}
          </Text>
        </Pressable>
      </View>
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: STITCH.onSurfaceVariant,
    textAlign: 'right',
    writingDirection: 'rtl',
    letterSpacing: 0.4,
  },
  row: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  actionBtn: {
    flex: 1.4,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    minHeight: 48,
  },
  actionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
    writingDirection: 'rtl',
    flexShrink: 1,
  },
  lessonBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: '#ffffff',
    minHeight: 48,
  },
  lessonText: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    writingDirection: 'rtl',
    flexShrink: 1,
  },
  btnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
});
