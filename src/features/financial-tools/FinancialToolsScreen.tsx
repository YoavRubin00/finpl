import React, { useMemo } from 'react';
import { Pressable, ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, Sparkles, TrendingUp, UserCog, Wrench } from 'lucide-react-native';

import { STITCH } from '../../constants/theme';
import { formatShekel } from '../../utils/format';
import { tapHaptic } from '../../utils/haptics';
import { useNetWorthStore } from '../net-worth-dashboard/useNetWorthStore';
import { TOOLS_REGISTRY } from './toolsRegistry';
import { ToolHubCard } from './components/ToolHubCard';
import { FinTip } from './components/atoms/FinTip';
import { CountUpNumber } from './components/atoms/CountUpNumber';
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
  // Screen renders inside (tabs), which already reserves the status-bar
  // safe-area above GlobalWealthHeader + BoostBanner. Only a small gap
  // below the banner is needed here.
  // TOOL DILUTION + FLAT HUB (Yoav 11.7): hidden tools filtered out (9→5
  // sharp tools), and the two collapsible accordions replaced by one always-
  // open grid — every tool visible on the main screen, no tap-to-reveal.
  const visibleTools = useMemo(
    () => TOOLS_REGISTRY.filter((t) => !t.hidden),
    [],
  );
  const investorTools = useMemo(
    () => visibleTools.filter((t) => t.category === 'investor'),
    [visibleTools],
  );
  const financialTools = useMemo(
    () => visibleTools.filter((t) => t.category === 'financial'),
    [visibleTools],
  );
  const activeCount = useMemo(
    () => visibleTools.filter((t) => t.status === 'active').length,
    [visibleTools],
  );

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <View style={styles.header}>
        <LinearGradient
          colors={['#dbeafe', '#bfdbfe']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerIconCircle}
        >
          <Wrench size={20} color={FB_BLUE} strokeWidth={2.4} />
        </LinearGradient>
        <Text accessibilityRole="header" style={styles.headerTitle}>
          כלים פיננסיים
        </Text>
        <View style={styles.headerChip}>
          <Sparkles size={11} color={FB_BLUE} strokeWidth={2.8} fill={FB_BLUE} />
          <Text style={styles.headerChipText}>{activeCount} זמינים</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >

        <FinancialProfileCta />

        <HeroStatStrip />

        {/* Flat, always-open sections (Yoav 11.7): thin title rows instead of
            the tap-to-open AccordionSection — every tool is visible the moment
            the screen loads. */}
        <Text style={styles.sectionTitle} accessibilityRole="header">
          כלים למשקיעים
        </Text>
        <View style={styles.grid}>
          {investorTools.map((tool, i) => (
            <ToolHubCard key={tool.key} tool={tool} index={i} />
          ))}
        </View>

        <Text style={styles.sectionTitle} accessibilityRole="header">
          כלים פיננסיים
        </Text>
        <View style={styles.grid}>
          {financialTools.map((tool, i) => (
            <ToolHubCard key={tool.key} tool={tool} index={i} />
          ))}
        </View>

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
          colors={[STITCH.premiumDarkBg, STITCH.premiumDarkSurface]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroRow}>
            <View style={styles.heroRight}>
              <Text style={styles.heroLabel}>
                {hasAssets ? 'שווי נכסים כולל' : 'דשבורד הנכסים שלך'}
              </Text>
              {hasAssets ? (
                <CountUpNumber
                  value={totalValue}
                  format={formatShekel}
                  style={styles.heroValue}
                />
              ) : (
                <Text style={styles.heroValue}>+ הוסיפו נכסים</Text>
              )}
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

const FB_BLUE = '#1877f2';
const TEXT_PRIMARY = '#1f2937';

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: STITCH.background,
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15,23,42,0.06)',
  },
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: FB_BLUE,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '900',
    color: TEXT_PRIMARY,
    writingDirection: 'rtl',
    textAlign: 'right',
    letterSpacing: -0.3,
  },
  headerChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(24,119,242,0.18)',
  },
  headerChipText: {
    fontSize: 11,
    fontWeight: '900',
    color: FB_BLUE,
    writingDirection: 'rtl',
    letterSpacing: 0.2,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
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
  // Flat section title (replaces the AccordionSection header)
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: TEXT_PRIMARY,
    writingDirection: 'rtl',
    textAlign: 'right',
    marginTop: 4,
    marginBottom: -4,
  },
});
