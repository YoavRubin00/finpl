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
        <Flame size={36} color="#f59e0b" strokeWidth={2.6} />
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
          style={({ pressed }) => [styles.notifBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
          accessibilityRole="button"
          accessibilityLabel="אשר התראות"
        >
          <BellRing size={18} color="#ffffff" strokeWidth={2.6} />
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
        <Icon size={16} color="#1d4ed8" strokeWidth={2.6} />
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
  // Amber-on-amber-tint instead of red — pairs with the new sky-blue
  // accent used across the rest of the screen, while the warm flame still
  // says "breaking" without screaming "error" (user feedback 2026-06-03:
  // "אדום+ורוד לא מתאים, שיהיה אחיד עם שאר האפליקציה").
  heroIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 2,
    borderColor: '#fde68a',
    shadowColor: '#f59e0b',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
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
  // Solid pastel blue tile w/ subtle glow — replaces flat primary@8% which
  // read as disabled. Matches the gaming-neon polish on the rest of the
  // screen (hourChip + ticker card).
  featureIconBg: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: '#93c5fd',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: STITCH.onSurface,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  // Solid blue Duo-style CTA (was outline-only sky-blue tint that read as
  // disabled / link text — user feedback 2026-06-01: "כפתור אשר התראות לא
  // ברור שהוא לחיץ"). Same palette as TimelineOrderCard "אני אסתדר" + the
  // pearl referral CTA.
  notifBtn: {
    alignSelf: 'stretch',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#1d4ed8',
    borderBottomWidth: 4,
    borderBottomColor: '#1e3a8a',
    shadowColor: '#1e3a8a',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  notifBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
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
