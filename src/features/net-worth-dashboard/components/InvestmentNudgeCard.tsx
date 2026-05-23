import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ChevronLeft, TrendingUp } from 'lucide-react-native';
import { STITCH } from '../../../constants/theme';
import { tapHaptic } from '../../../utils/haptics';
import { formatShekel } from '../../../utils/format';

interface InvestmentNudgeCardProps {
  /** Sum of "idle" balances — cash + checking. Drives the headline copy. */
  idleCash: number;
}

const ACCENT = '#16a34a';
const ACCENT_DARK = '#15803d';
const INFLATION_ANNUAL = 0.035;

/**
 * Inline CTA card nudging the user to put idle cash to work. Headline copy
 * is dynamic — if the user has meaningful idle cash, it quotes the exact
 * shekel amount and the inflation loss. Otherwise it falls back to a
 * generic invitation. Always routes to `/bridge?tab=investments` so the
 * user lands on real investment partners (Cover, Lightyear, etc.).
 */
export function InvestmentNudgeCard({ idleCash }: InvestmentNudgeCardProps): React.ReactElement {
  const router = useRouter();
  const hasIdleCash = idleCash >= 5000;
  const inflationLoss = idleCash * INFLATION_ANNUAL;

  const handlePress = () => {
    tapHaptic();
    router.push('/bridge?tab=investments' as never);
  };

  return (
    <Pressable onPress={handlePress} accessibilityRole="button" accessibilityLabel="עברו לעמוד ההשקעות">
      <LinearGradient
        colors={['#dcfce7', '#ffffff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <TrendingUp size={18} color={ACCENT_DARK} strokeWidth={2.6} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>
              {hasIdleCash
                ? 'הכסף שלכם יכול לעבוד חזק יותר'
                : 'מוכנים להתחיל להשקיע?'}
            </Text>
            <Text style={styles.subtitle}>
              {hasIdleCash
                ? `${formatShekel(idleCash)} יושבים בעו"ש ובמזומן — מאבדים כ-${formatShekel(inflationLoss)} בשנה לאינפלציה.`
                : 'אפיק השקעה פסיבי במדדים גלובליים — הדרך הפשוטה ביותר להגדיל את ההון לאורך זמן.'}
            </Text>
          </View>
        </View>

        <View style={styles.cta}>
          <Text style={styles.ctaText}>בחנו אפיקי השקעה אמיתיים</Text>
          <ChevronLeft size={18} color="#ffffff" strokeWidth={2.8} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#86efac',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
    gap: 12,
  },
  header: {
    flexDirection: 'row-reverse',
    gap: 12,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#bbf7d0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, alignItems: 'flex-end' },
  title: {
    fontSize: 14,
    fontWeight: '900',
    color: ACCENT_DARK,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
    textAlign: 'right',
    marginTop: 4,
    lineHeight: 18,
  },
  cta: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: ACCENT_DARK,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff',
    writingDirection: 'rtl',
  },
});
