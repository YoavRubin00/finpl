import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles, RefreshCw } from 'lucide-react-native';

import { STITCH } from '../../../constants/theme';
import { tapHaptic } from '../../../utils/haptics';
import { useFinancialProfileStore, hasAnyFinancialData } from '../useFinancialProfileStore';
import { describeProfileFreshness } from '../financialProfile';

interface ProfileFingerprintProps {
  /** Brand accent color used for the sparkle icon and edit affordance. */
  accentColor: string;
}

/**
 * Thin banner that sits below the ToolHeader on every calculator screen.
 * Communicates "the inputs you see are based on your saved profile" and
 * provides a one-tap path to the editable Financial Profile screen.
 *
 * Two states:
 *   - has saved data → "מבוסס על הנתונים שלך · עודכן לפני N ימים"
 *   - empty profile  → "השלם את הפרופיל הפיננסי כדי להאיץ"
 */
export function ProfileFingerprint({ accentColor }: ProfileFingerprintProps) {
  const router = useRouter();
  const profile = useFinancialProfileStore((s) => s.profile);
  const hasData = hasAnyFinancialData(profile);
  const freshness = describeProfileFreshness(profile.updatedAt);

  const handlePress = () => {
    tapHaptic();
    router.push('/financial-profile' as never);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.bar,
        { backgroundColor: accentColor + '12', borderColor: accentColor + '33' },
        pressed && styles.barPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel="עדכון פרופיל פיננסי"
      hitSlop={4}
    >
      <Sparkles size={14} color={accentColor} strokeWidth={2.4} />

      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: accentColor }]} numberOfLines={1} allowFontScaling={false}>
          {hasData ? 'מבוסס על הנתונים שלך' : 'השלם את הפרופיל הפיננסי'}
        </Text>
        {hasData && freshness ? (
          <Text style={styles.subtitle} numberOfLines={1} allowFontScaling={false}>
            {freshness}
          </Text>
        ) : !hasData ? (
          <Text style={styles.subtitle} numberOfLines={1} allowFontScaling={false}>
            כדי שהכלים יתחילו לפרה-מלא את הנתונים
          </Text>
        ) : null}
      </View>

      <View style={[styles.editBadge, { backgroundColor: accentColor + '1a' }]}>
        <RefreshCw size={12} color={accentColor} strokeWidth={2.6} />
        <Text style={[styles.editText, { color: accentColor }]} allowFontScaling={false}>
          {hasData ? 'עדכון' : 'השלמה'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  barPressed: {
    opacity: 0.75,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '600',
    color: STITCH.onSurfaceVariant,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 1,
  },
  editBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  editText: {
    fontSize: 11,
    fontWeight: '800',
    writingDirection: 'rtl',
  },
});
