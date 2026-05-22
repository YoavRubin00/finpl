import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { STITCH } from '../../constants/theme';
import { TOOLS_REGISTRY } from './toolsRegistry';
import { ToolHubCard } from './components/ToolHubCard';
import { SectionLabel } from './components/atoms/SectionLabel';
import { FinTip } from './components/atoms/FinTip';

/**
 * Financial Tools hub — the 6th global tab (rightmost in RTL bottom bar).
 * Stitch design: dark hero stat strip + 2-column grid of ToolHubCards.
 *
 * Active tools and coming-soon teasers come from `toolsRegistry.ts` —
 * adding a new tool is a one-line registry change.
 */

export function FinancialToolsScreen(): React.ReactElement {
  const activeCount = TOOLS_REGISTRY.filter((t) => t.status === 'active').length;
  const comingCount = TOOLS_REGISTRY.length - activeCount;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header — title centered; counter floats top-right as a corner chip. */}
      <View style={styles.header}>
        <Text style={styles.headerCounter}>
          {activeCount} כלים · {comingCount} בדרך
        </Text>
        <View style={styles.headerCenter}>
          <View style={styles.headerIconWrap}>
            <Text style={styles.headerEmoji}>🧰</Text>
          </View>
          <Text accessibilityRole="header" style={styles.headerTitle}>
            כלים פיננסיים
          </Text>
          <Text style={styles.headerSubtitle}>החלטות חכמות בנתונים אמיתיים</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <HeroStatStrip />

        <SectionLabel>כל הכלים</SectionLabel>

        <View style={styles.grid}>
          {TOOLS_REGISTRY.map((tool, i) => (
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
 * Dark gradient hero strip showing aggregate worth (mock value for now —
 * later wired to a real net-worth store). Reinforces the "premium intel"
 * positioning of the tools section.
 */
function HeroStatStrip(): React.ReactElement {
  return (
    <Animated.View entering={FadeInDown.duration(360)}>
      <LinearGradient
        colors={[STITCH.premiumDarkBg, STITCH.premiumDarkSurface, STITCH.premiumDarkAccent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroHalo} pointerEvents="none" />

        <View style={styles.heroRow}>
          <View style={styles.heroBadge}>
            <Svg width={12} height={12} viewBox="0 0 24 24">
              <Path
                d="M12 2 L13.5 10.5 L22 12 L13.5 13.5 L12 22 L10.5 13.5 L2 12 L10.5 10.5 Z"
                fill={STITCH.tertiaryGoldBright}
              />
            </Svg>
            <Text style={styles.heroBadgeText}>FIN ENGINE</Text>
          </View>
          <View style={styles.heroRight}>
            <Text style={styles.heroLabel}>שווי נקי משוער</Text>
            <Text style={styles.heroValue}>₪128,450</Text>
            <Text style={styles.heroDelta}>↗ +4.2% החודש</Text>
          </View>
        </View>
      </LinearGradient>
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
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: STITCH.surfaceHighest,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerCenter: {
    alignItems: 'center',
    gap: 6,
  },
  headerCounter: {
    position: 'absolute',
    top: 14,
    right: 12,
    fontSize: 10,
    fontWeight: '800',
    color: STITCH.onSurfaceVariant,
    letterSpacing: 0.4,
    backgroundColor: STITCH.surfaceLow,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    writingDirection: 'rtl',
  },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  headerEmoji: { fontSize: 22 },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: STITCH.onSurfaceVariant,
    writingDirection: 'rtl',
    textAlign: 'center',
    fontWeight: '600',
  },
  scroll: {
    padding: 16,
    paddingBottom: 120,
    gap: 14,
  },

  // Hero stat strip
  hero: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    overflow: 'hidden',
    shadowColor: STITCH.premiumDarkBg,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  heroHalo: {
    position: 'absolute',
    top: -30,
    left: -30,
    width: 130,
    height: 130,
    borderRadius: 130,
    backgroundColor: 'rgba(233,196,0,0.18)',
  },
  heroRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroRight: {
    alignItems: 'flex-end',
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: STITCH.premiumDarkText,
    letterSpacing: 0.4,
    writingDirection: 'rtl',
  },
  heroValue: {
    fontSize: 26,
    fontWeight: '900',
    color: STITCH.tertiaryGoldBright,
    letterSpacing: -0.5,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
    writingDirection: 'rtl',
  },
  heroDelta: {
    fontSize: 10,
    fontWeight: '800',
    color: '#86efac',
    marginTop: 2,
    writingDirection: 'rtl',
  },
  heroBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(233,196,0,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(233,196,0,0.4)',
  },
  heroBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: STITCH.tertiaryGoldBright,
    letterSpacing: 0.6,
  },

  // Grid
  grid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
  },
});
