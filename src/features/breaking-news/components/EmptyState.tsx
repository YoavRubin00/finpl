import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Sparkles, Bell, BellRing, Check, Newspaper, Flame, TrendingUp } from 'lucide-react-native';

import { STITCH } from '../../../constants/theme';
import { CalculateButton } from '../../financial-tools/components/atoms/CalculateButton';

interface EmptyStateProps {
  onPickFirstTicker: () => void;
  /** Request OS notification permission so the daily summary push can fire. */
  onEnableNotifications: () => void;
  /** True once the user has granted notification permission. */
  notificationsEnabled: boolean;
}

/**
 * First-run state for users who haven't tracked any tickers yet. Sells the
 * tool's value (daily AI summary + hype score + push at 9:00) and routes
 * straight into the ticker picker.
 */
export function EmptyState({
  onPickFirstTicker,
  onEnableNotifications,
  notificationsEnabled,
}: EmptyStateProps): React.ReactElement {
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

      <View style={{ alignSelf: 'stretch', marginTop: 8 }}>
        <CalculateButton
          label="בחר את המניה הראשונה שלך"
          variant="blue"
          iconLeft={<TrendingUp size={18} color="#ffffff" strokeWidth={2.6} />}
          onPress={onPickFirstTicker}
          accessibilityLabel="בחר את המניה הראשונה שלך"
        />
      </View>

      {notificationsEnabled ? (
        <View style={styles.notifEnabledRow}>
          <Check size={16} color="#15803d" strokeWidth={3} />
          <Text style={styles.notifEnabledText} allowFontScaling={false}>
            התראות מופעלות — הסיכום יגיע כל בוקר
          </Text>
        </View>
      ) : (
        <Pressable
          onPress={onEnableNotifications}
          style={({ pressed }) => [styles.notifBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
          accessibilityRole="button"
          accessibilityLabel="אשר התראות"
        >
          <BellRing size={18} color={STITCH.primary} strokeWidth={2.6} />
          <Text style={styles.notifBtnText} allowFontScaling={false}>
            אשר התראות
          </Text>
        </Pressable>
      )}
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
  notifBtn: {
    alignSelf: 'stretch',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: STITCH.primary + '12',
    borderWidth: 1.5,
    borderColor: STITCH.primary + '40',
  },
  notifBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: STITCH.primary,
    writingDirection: 'rtl',
  },
  notifEnabledRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
  },
  notifEnabledText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803d',
    writingDirection: 'rtl',
  },
});
