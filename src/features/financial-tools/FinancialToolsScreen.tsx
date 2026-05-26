import React, { useMemo } from 'react';
import { Pressable, ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, Sparkles, TrendingUp, UserCog } from 'lucide-react-native';

import { STITCH } from '../../constants/theme';
import { formatShekel } from '../../utils/format';
import { tapHaptic } from '../../utils/haptics';
import { useNetWorthStore } from '../net-worth-dashboard/useNetWorthStore';
import { TOOLS_REGISTRY } from './toolsRegistry';
import { ToolHubCard } from './components/ToolHubCard';
import { AccordionSection } from './components/AccordionSection';
import { FinTip } from './components/atoms/FinTip';
import { useFinancialProfileStore, hasAnyFinancialData } from './useFinancialProfileStore';
import { describeProfileFreshness } from './financialProfile';

/**
 * Financial Tools hub — the 6th global tab (rightmost in RTL bottom bar).
 * Stitch design: dark hero stat strip + 2-column grid of ToolHubCards.
 *
 * Active tools and coming-soon teasers come from `toolsRegistry.ts` —
 * adding a new tool is a one-line registry change.
 */

export function FinancialToolsScreen(): React.ReactElement {
  // Manually trim the top safe-area inset so the title sits closer to the
  // status bar. SafeAreaView with `edges={['top']}` was reserving the full
  // inset on iPhones (~47px), which left an unnecessary gap above the
  // header. We still keep enough room to clear the notch/status bar.
  const insets = useSafeAreaInsets();
  const topPad = Math.max(insets.top - 10, 6);

  const activeCount = TOOLS_REGISTRY.filter((t) => t.status === 'active').length;
  const comingCount = TOOLS_REGISTRY.length - activeCount;

  const investorTools = useMemo(
    () => TOOLS_REGISTRY.filter((t) => t.category === 'investor'),
    [],
  );
  const financialTools = useMemo(
    () => TOOLS_REGISTRY.filter((t) => t.category === 'financial'),
    [],
  );

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      {/* Header — compact: emoji + title on one row, subtitle as a tiny tagline. */}
      <View style={[styles.header, { paddingTop: topPad }]}>
        <Text style={styles.headerCounter}>
          {activeCount} כלים · {comingCount} בדרך
        </Text>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerEmoji}>🧰</Text>
          <Text accessibilityRole="header" style={styles.headerTitle}>
            כלים פיננסיים
          </Text>
        </View>
        <Text style={styles.headerSubtitle}>החלטות חכמות בנתונים אמיתיים</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <FinancialProfileCta />

        <HeroStatStrip />

        <AccordionSection
          title="כלים למשקיעים"
          count={investorTools.length}
          accent="investor"
        >
          <View style={styles.grid}>
            {investorTools.map((tool, i) => (
              <ToolHubCard key={tool.key} tool={tool} index={i} />
            ))}
          </View>
        </AccordionSection>

        <AccordionSection
          title="כלים פיננסיים"
          count={financialTools.length}
          accent="financial"
        >
          <View style={styles.grid}>
            {financialTools.map((tool, i) => (
              <ToolHubCard key={tool.key} tool={tool} index={i} />
            ))}
          </View>
        </AccordionSection>

        <FinTip
          kind="tip"
          text="כל כלי שתסיים נותן XP — סיימת את כולם? פותחת לך מערכת פיננסית מלאה."
        />
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Live entry point into the Net Worth dashboard. Reads from `useNetWorthStore`
 * — when empty, shows a CTA to add the first asset; when populated, shows the
 * user's real net worth + projected YoY growth. Tap anywhere → opens the
 * dashboard screen.
 */
function HeroStatStrip(): React.ReactElement {
  const router = useRouter();
  const totalValue = useNetWorthStore((s) => s.totalValue());
  const yoyDeltaPct = useNetWorthStore((s) => s.yoyDeltaPct());
  const annualGrowth = useNetWorthStore((s) => s.projectedAnnualGrowth());
  const hasAssets = totalValue > 0;

  const yoyText =
    hasAssets && yoyDeltaPct > 0
      ? `+${(yoyDeltaPct * 100).toFixed(1)}% השנה הקרובה (משוער)`
      : null;

  function handlePress() {
    tapHaptic();
    router.push('/net-worth-dashboard' as never);
  }

  return (
    <Animated.View entering={FadeInDown.duration(360)}>
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={
          hasAssets
            ? `שווי נכסים ${formatShekel(totalValue)}, פתיחת דשבורד הנכסים`
            : 'הוספת הנכסים הראשונים שלך'
        }
      >
        <LinearGradient
          colors={[STITCH.premiumDarkBg, STITCH.premiumDarkSurface, STITCH.premiumDarkAccent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroHalo} pointerEvents="none" />
          <View style={styles.heroHaloBottom} pointerEvents="none" />

          <View style={styles.heroRow}>
            <View style={styles.heroRight}>
              <Text style={styles.heroLabel}>
                {hasAssets ? 'שווי נכסים כולל' : 'דשבורד הנכסים שלך'}
              </Text>
              <Text style={styles.heroValue}>
                {hasAssets ? formatShekel(totalValue) : '+ הוסיפו נכסים'}
              </Text>
              {hasAssets && annualGrowth > 0 ? (
                <View style={styles.heroDeltaRow}>
                  <TrendingUp size={11} color="#86efac" strokeWidth={3} />
                  <Text style={styles.heroDelta}>{yoyText}</Text>
                </View>
              ) : (
                <Text style={styles.heroEmptyHint}>
                  לחצו לבניית התמונה הפיננסית שלכם
                </Text>
              )}
            </View>
            <View style={styles.heroChevron}>
              <ChevronLeft size={18} color="#ffffff" strokeWidth={2.8} />
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

/**
 * "בנה פרופיל פיננסי" CTA — sits between the net-worth hero and the tool
 * grid. When the user has never edited their financial profile, this is a
 * bright invite to fill it in once (so every tool below opens pre-filled).
 * Once data exists, it morphs into a quieter "עודכן לפני N · עדכון" badge
 * so it doesn't compete with the tools for attention.
 */
function FinancialProfileCta(): React.ReactElement {
  const router = useRouter();
  const profile = useFinancialProfileStore((s) => s.profile);
  const hasData = hasAnyFinancialData(profile);
  const freshness = describeProfileFreshness(profile.updatedAt);

  const handlePress = () => {
    tapHaptic();
    router.push('/financial-profile' as never);
  };

  return (
    <Animated.View entering={FadeInDown.delay(80).duration(360)}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [styles.profileCtaShell, pressed && { opacity: 0.92 }]}
        accessibilityRole="button"
        accessibilityLabel={hasData ? 'עדכון פרופיל פיננסי' : 'בניית פרופיל פיננסי'}
      >
        <LinearGradient
          colors={['#e6f4fb', '#bfe1f1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileCta}
        >
          <View style={styles.profileCtaIcon}>
            {hasData ? (
              <UserCog size={20} color="#053a5e" strokeWidth={2.4} />
            ) : (
              <Sparkles size={20} color="#053a5e" strokeWidth={2.4} />
            )}
          </View>
          <View style={styles.profileCtaBody}>
            <Text style={styles.profileCtaTitle}>
              {hasData ? 'הפרופיל הפיננסי שלך' : 'בנה פרופיל פיננסי'}
            </Text>
            <Text style={styles.profileCtaSubtitle}>
              {hasData
                ? `${freshness ?? 'נשמר'} · ההצעות וההמלצות מתאימות אישית אליך`
                : 'מילוי חד-פעמי · הצעות והמלצות מותאמות בכל הכלים'}
            </Text>
          </View>
          <ChevronLeft size={20} color="#053a5e" strokeWidth={2.4} />
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: STITCH.background,
  },
  header: {
    backgroundColor: STITCH.surfaceLowest,
    paddingHorizontal: 16,
    // paddingTop set inline at render so the screen can trim the safe-area inset.
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: STITCH.surfaceHighest,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  headerCounter: {
    position: 'absolute',
    top: 2,
    right: 12,
    fontSize: 10,
    fontWeight: '800',
    color: STITCH.onSurfaceVariant,
    letterSpacing: 0.4,
    backgroundColor: STITCH.surfaceLow,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    writingDirection: 'rtl',
  },
  headerEmoji: { fontSize: 18, lineHeight: 22 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 1,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 120,
    gap: 14,
  },

  // Hero stat strip
  hero: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    overflow: 'hidden',
    shadowColor: STITCH.premiumDarkBg,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 5,
  },
  heroHalo: {
    position: 'absolute',
    top: -26,
    left: -26,
    width: 110,
    height: 110,
    borderRadius: 110,
    backgroundColor: 'rgba(233,196,0,0.18)',
  },
  heroHaloBottom: {
    position: 'absolute',
    bottom: -38,
    right: -22,
    width: 130,
    height: 130,
    borderRadius: 130,
    backgroundColor: 'rgba(99,102,241,0.18)',
  },
  heroChevron: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  heroRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroRight: {
    flex: 1,
    alignItems: 'flex-end',
    paddingHorizontal: 8,
  },
  heroEmptyHint: {
    fontSize: 10,
    fontWeight: '700',
    color: STITCH.premiumDarkText,
    marginTop: 2,
    writingDirection: 'rtl',
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: STITCH.premiumDarkText,
    letterSpacing: 0.4,
    writingDirection: 'rtl',
  },
  heroValue: {
    fontSize: 24,
    fontWeight: '900',
    color: STITCH.tertiaryGoldBright,
    letterSpacing: -0.6,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
    writingDirection: 'rtl',
    textShadowColor: 'rgba(233,196,0,0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  heroDeltaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  heroDelta: {
    fontSize: 10,
    fontWeight: '800',
    color: '#86efac',
    writingDirection: 'rtl',
  },
  // Profile CTA (between hero and grid)
  profileCtaShell: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#0b1735',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  profileCta: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#8fc7e1',
  },
  profileCtaIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCtaBody: {
    flex: 1,
  },
  profileCtaTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#053a5e',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  profileCtaSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0b4a76',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 2,
  },
  // Grid
  grid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
  },
});
