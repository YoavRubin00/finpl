import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Sparkles, Bell, Newspaper, Flame } from 'lucide-react-native';

import { STITCH } from '../../../constants/theme';

interface EmptyStateProps {
  onPickFirstTicker: () => void;
}

/**
 * First-run state for users who haven't tracked any tickers yet. Sells the
 * tool's value (daily AI summary + hype score + push at 9:00) and routes
 * straight into the ticker picker.
 */
export function EmptyState({ onPickFirstTicker }: EmptyStateProps): React.ReactElement {
  return (
    <View style={styles.wrap}>
      <View style={styles.heroIconWrap}>
        <Flame size={32} color="#dc2626" strokeWidth={2.4} />
      </View>

      <Text style={styles.title} allowFontScaling={false}>
        חדשות מתפרצות
      </Text>
      <Text style={styles.subtitle} allowFontScaling={false}>
        תבחר מניה — נסכם לך כל בוקר את כל מה שקרה איתה אתמול: חדשות, סנטימנט וויראליות בסושיאל.
      </Text>

      <View style={styles.featuresList}>
        <FeatureRow Icon={Newspaper} text="סיכום AI ב-2 משפטים מ-10 מקורות אמיתיים" />
        <FeatureRow Icon={Sparkles} text="מדד הייפ חברתי 0–100" />
        <FeatureRow Icon={Bell} text="התראה כל בוקר ב-9:00" />
      </View>

      <Pressable
        onPress={onPickFirstTicker}
        style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
        accessibilityLabel="בחר את המניה הראשונה שלך"
      >
        <Text style={styles.ctaText} allowFontScaling={false}>
          בחר את המניה הראשונה שלך
        </Text>
      </Pressable>

      <Text style={styles.hint} allowFontScaling={false}>
        💡 הפעל התראות כדי לקבל את הסיכום אוטומטית
      </Text>
    </View>
  );
}

function FeatureRow({
  Icon,
  text,
}: {
  Icon: typeof Sparkles;
  text: string;
}): React.ReactElement {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIconBg}>
        <Icon size={16} color={STITCH.primary} strokeWidth={2.4} />
      </View>
      <Text style={styles.featureText} allowFontScaling={false}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: 'center',
    gap: 12,
  },
  heroIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#dc2626',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: STITCH.onSurface,
    textAlign: 'center',
    writingDirection: 'rtl',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: STITCH.onSurfaceVariant,
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 21,
    maxWidth: 320,
  },
  featuresList: {
    alignSelf: 'stretch',
    gap: 8,
    paddingTop: 12,
    paddingBottom: 4,
  },
  featureRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: STITCH.surfaceHighest,
  },
  featureIconBg: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: STITCH.primary + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: STITCH.onSurface,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  cta: {
    alignSelf: 'stretch',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#2563eb',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    writingDirection: 'rtl',
  },
  hint: {
    fontSize: 12,
    fontWeight: '600',
    color: STITCH.onSurfaceVariant,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: 4,
  },
});
