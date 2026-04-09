/**
 * SIM 29: עץ המשפחה (Family Tree — Estate Planning) — Module 5-29
 * Screen: set up family, view no-will scenario, create will, compare outcomes.
 * 4-phase decision-driven simulation (not auto-play).
 */

import { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { LottieIcon } from '../../../components/ui/LottieIcon';
import { GlowCard } from '../../../components/ui/GlowCard';
import { ConfettiExplosion } from '../../../components/ui/ConfettiExplosion';
import { tapHaptic, successHaptic, heavyHaptic } from '../../../utils/haptics';
import { useEstatePlanning } from './useEstatePlanning';
import type { FamilyMember, Asset, EstateOutcome, EstateScore } from './estateTypes';
import {
  TOTAL_ESTATE,
  LEGAL_FEES_WITHOUT_WILL,
  LEGAL_FEES_WITH_WILL,
  FROZEN_MONTHS_WITHOUT_WILL,
} from './estateData';
import Slider from '@react-native-community/slider';
import { SimLottieBackground } from '../../../components/ui/SimLottieBackground';
import { SIM5, GRADE_COLORS5, GRADE_HEBREW, SHADOW_STRONG, SHADOW_LIGHT, RTL, TYPE5, sim5Styles } from './simTheme';
import { getChapterTheme } from '../../../constants/theme';
import { formatShekel } from '../../../utils/format';
import { useSimReward } from '../../../hooks/useSimReward';

const _th5 = getChapterTheme('chapter-5');
const SIM_COMPLETE_XP = 35;
const SIM_COMPLETE_COINS = 40;

/* ── Lottie assets ── */
const LOTTIE_TREE = require('../../../../assets/lottie/wired-flat-443-tree-hover-pinch.json');
const LOTTIE_DOCUMENT = require('../../../../assets/lottie/wired-flat-56-document-hover-swipe.json');
const LOTTIE_HOUSE = require('../../../../assets/lottie/wired-flat-63-home-hover-3d-roll.json');
const LOTTIE_BUILDING = require('../../../../assets/lottie/wired-flat-483-building-hover-blinking.json');
const LOTTIE_MONEY = require('../../../../assets/lottie/wired-flat-413-money-bag-hover-shake.json');
const LOTTIE_SHIELD = require('../../../../assets/lottie/wired-flat-457-shield-security-hover-pinch.json');
const LOTTIE_CHART = require('../../../../assets/lottie/wired-flat-153-bar-chart-hover-pinch.json');
const LOTTIE_BALANCE = require('../../../../assets/lottie/wired-flat-402-legal-balance-legal-hover-pinch.json');
const LOTTIE_CLOCK = require('../../../../assets/lottie/wired-flat-45-clock-time-hover-pinch.json');
const LOTTIE_BULB = require('../../../../assets/lottie/wired-flat-36-bulb-hover-blink.json');
const LOTTIE_REPLAY = require('../../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json');
const LOTTIE_CHECK = require('../../../../assets/lottie/wired-flat-24-approved-checked-hover-pinch.json');
const LOTTIE_CROSS = require('../../../../assets/lottie/wired-flat-25-error-cross-hover-pinch.json');
const LOTTIE_TROPHY = require('../../../../assets/lottie/wired-flat-3263-trophy-circle-hover-roll.json');
const LOTTIE_GROWTH = require('../../../../assets/lottie/wired-flat-161-growth-hover-pinch.json');
const LOTTIE_ARROW = require('../../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');

/* Grade colors from shared theme */

const ASSET_EMOJI: Record<string, string> = {
  apartment: '🏠',
  savings: '🏦',
  investments: '📈',
  insurance: '🛡️',
};

// ── Sub-components ────────────────────────────────────────────────────

/** Family member node for the tree */
function FamilyNode({
  member,
  isActive,
  onToggle,
  showToggle,
}: {
  member: FamilyMember;
  isActive: boolean;
  onToggle: () => void;
  showToggle: boolean;
}) {
  return (
    <AnimatedPressable onPress={showToggle ? onToggle : undefined} accessibilityRole="button" accessibilityLabel={`${member.name} — ${isActive ? 'הסר' : 'הוסף'}`} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <View style={[familyNodeStyles.node, !isActive && familyNodeStyles.nodeInactive]}>
        <Text style={familyNodeStyles.emoji}>{member.emoji}</Text>
        <Text style={[familyNodeStyles.name, RTL]}>{member.name}</Text>
        <Text style={familyNodeStyles.age}>גיל {member.age}</Text>
        {showToggle && (
          <View style={[familyNodeStyles.toggle, isActive && familyNodeStyles.toggleActive]}>
            <Text style={familyNodeStyles.toggleText}>{isActive ? '✓' : '+'}</Text>
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
}

const familyNodeStyles = StyleSheet.create({
  node: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    minWidth: 80,
    borderWidth: 1,
    borderColor: SIM5.cardBorder,
  },
  nodeInactive: {
    opacity: 0.35,
    borderColor: SIM5.cardBorder,
  },
  emoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: SIM5.textPrimary,
    marginBottom: 2,
  },
  age: {
    fontSize: 13,
    color: SIM5.textMuted,
  },
  toggle: {
    marginTop: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: SIM5.trackBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#4ade80',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: SIM5.textPrimary,
  },
});

/** Asset card for no-will / with-will scenarios */
function AssetCard({
  asset,
  distribution,
  members,
  isFrozen,
}: {
  asset: Asset;
  distribution: Record<string, number>;
  members: FamilyMember[];
  isFrozen: boolean;
}) {
  const emoji = ASSET_EMOJI[asset.id] ?? '💰';

  return (
    <View style={assetCardStyles.card}>
      <View style={assetCardStyles.header}>
        <Text style={assetCardStyles.emoji}>{emoji}</Text>
        <View style={assetCardStyles.headerText}>
          <Text style={[assetCardStyles.name, RTL]}>{asset.name}</Text>
          <Text style={assetCardStyles.value}>{formatShekel(asset.value)}</Text>
        </View>
        {isFrozen && asset.type === 'property' && (
          <View style={assetCardStyles.frozenBadge}>
            <Text style={assetCardStyles.frozenText}>🧊 מוקפא</Text>
          </View>
        )}
      </View>
      <View style={assetCardStyles.distList}>
        {members.map((m) => {
          const amount = distribution[m.id] ?? 0;
          if (amount <= 0) return null;
          // What percentage of this asset does this member get?
          const pct = asset.value > 0 ? Math.round((amount / TOTAL_ESTATE) * 100) : 0;
          return (
            <View key={m.id} style={assetCardStyles.distRow}>
              <Text style={assetCardStyles.distEmoji}>{m.emoji}</Text>
              <Text style={[assetCardStyles.distName, RTL]}>{m.name}</Text>
              <Text style={assetCardStyles.distAmount}>{formatShekel(amount)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const assetCardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: SIM5.cardBorder,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 8,
  },
  emoji: {
    fontSize: 24,
    marginLeft: 10,
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: SIM5.textPrimary,
  },
  value: {
    fontSize: 14,
    color: SIM5.textMuted,
    fontWeight: '600',
  },
  frozenBadge: {
    backgroundColor: 'rgba(96, 165, 250, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.4)',
  },
  frozenText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#a78bfa',
  },
  distList: {
    gap: 4,
  },
  distRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  distEmoji: {
    fontSize: 16,
  },
  distName: {
    flex: 1,
    fontSize: 14,
    color: SIM5.textMuted,
    fontWeight: '600',
  },
  distAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: SIM5.textPrimary,
  },
});

/** Will allocation row — per asset per member */
function WillAssetSection({
  asset,
  members,
  decisions,
  onSetDecision,
  totalPercent,
}: {
  asset: Asset;
  members: FamilyMember[];
  decisions: { beneficiaryId: string; percentage: number }[];
  onSetDecision: (beneficiaryId: string, percentage: number) => void;
  totalPercent: number;
}) {
  const emoji = ASSET_EMOJI[asset.id] ?? '💰';
  const isComplete = Math.abs(totalPercent - 100) < 0.01;

  return (
    <View style={willStyles.assetSection}>
      <View style={willStyles.assetHeader}>
        <Text style={willStyles.assetEmoji}>{emoji}</Text>
        <Text style={[willStyles.assetName, RTL]}>{asset.name}</Text>
        <Text style={[willStyles.assetValue, RTL]}>{formatShekel(asset.value)}</Text>
        <View style={[willStyles.pctBadge, isComplete && willStyles.pctBadgeComplete]}>
          <Text style={[willStyles.pctText, isComplete && willStyles.pctTextComplete]}>
            {Math.round(totalPercent)}%
          </Text>
        </View>
      </View>

      {members.map((m) => {
        const existing = decisions.find((d) => d.beneficiaryId === m.id);
        const pct = existing?.percentage ?? 0;
        const amount = asset.value * (pct / 100);

        return (
          <View key={m.id} style={willStyles.memberRow}>
            <Text style={willStyles.memberEmoji}>{m.emoji}</Text>
            <Text style={[willStyles.memberName, RTL]}>{m.name}</Text>
            <View style={willStyles.sliderArea}>
              <Slider
                style={willStyles.slider}
                minimumValue={0}
                maximumValue={100}
                step={5}
                value={pct}
                onSlidingComplete={(val: number) => {
                  tapHaptic();
                  onSetDecision(m.id, val);
                }}
                minimumTrackTintColor={SIM5.primary}
                maximumTrackTintColor={SIM5.trackBg}
                thumbTintColor={SIM5.btnPrimary}
                accessibilityRole="adjustable"
                accessibilityLabel={`הקצאה ל-${m.name} מ-${asset.name}`}
                accessibilityValue={{ min: 0, max: 100, now: pct, text: `${pct}%` }}
              />
            </View>
            <Text style={willStyles.memberPct}>{pct}%</Text>
            {pct > 0 && <Text style={willStyles.memberAmount}>{formatShekel(amount)}</Text>}
          </View>
        );
      })}
    </View>
  );
}

const willStyles = StyleSheet.create({
  assetSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: SIM5.cardBorder,
  },
  assetHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  assetEmoji: {
    fontSize: 22,
  },
  assetName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: SIM5.textPrimary,
  },
  assetValue: {
    fontSize: 14,
    fontWeight: '600',
    color: SIM5.textMuted,
  },
  pctBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  pctBadgeComplete: {
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    borderColor: 'rgba(74, 222, 128, 0.3)',
  },
  pctText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ef4444',
  },
  pctTextComplete: {
    color: '#4ade80',
  },
  memberRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  memberEmoji: {
    fontSize: 18,
  },
  memberName: {
    width: 60,
    fontSize: 14,
    fontWeight: '600',
    color: SIM5.textMuted,
  },
  sliderArea: {
    flex: 1,
  },
  slider: {
    height: 28,
  },
  memberPct: {
    width: 32,
    fontSize: 14,
    fontWeight: '800',
    color: SIM5.btnPrimary,
    textAlign: 'center',
  },
  memberAmount: {
    width: 65,
    fontSize: 13,
    fontWeight: '600',
    color: SIM5.textMuted,
    textAlign: 'left',
  },
});

/** Conflict meter visualization */
function ConflictMeter({ score, label }: { score: number; label: string }) {
  const color = score > 50 ? '#ef4444' : score > 25 ? '#fbbf24' : '#4ade80';
  const emoji = score > 50 ? '😡' : score > 25 ? '😐' : '😊';

  return (
    <View style={conflictStyles.container}>
      <View style={conflictStyles.labelRow}>
        <Text style={conflictStyles.label}>{label}</Text>
        <Text style={[conflictStyles.value, { color }]}>{emoji} {score}/100</Text>
      </View>
      <View style={conflictStyles.track}>
        <View style={[conflictStyles.fill, { width: `${score}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const conflictStyles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: SIM5.textMuted,
  },
  value: {
    fontSize: 14,
    fontWeight: '800',
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: SIM5.trackBg,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});

// ── Score Screen ──────────────────────────────────────────────────────

function ScoreScreen({
  score,
  noWillOutcome,
  withWillOutcome,
  members,
  onReplay,
  onContinue,
}: {
  score: EstateScore;
  noWillOutcome: EstateOutcome;
  withWillOutcome: EstateOutcome;
  members: FamilyMember[];
  onReplay: () => void;
  onContinue: () => void;
}) {
  const gradeColor = GRADE_COLORS5[score.grade];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <ConfettiExplosion />

      {/* Hero */}
      <Animated.View entering={FadeInDown.duration(600)} style={styles.heroSection}>
        <LottieIcon source={LOTTIE_DOCUMENT} size={56} />
        <Text style={styles.heroTitle}>צוואה הושלמה!</Text>
      </Animated.View>

      {/* Grade */}
      <Animated.View entering={FadeInDown.duration(600).delay(100)} style={sim5Styles.gradeContainer}>
        <Text accessibilityLiveRegion="polite" style={[sim5Styles.gradeText, { color: gradeColor }]}>{GRADE_HEBREW[score.grade] ?? score.grade}</Text>
        <Text style={sim5Styles.gradeLabel}>דירוג תכנון עיזבון</Text>
      </Animated.View>

      {/* Side-by-side comparison */}
      <Animated.View entering={FadeInDown.duration(600).delay(200)}>
        <View style={sim5Styles.scoreCard}>
          <View style={styles.summaryCard}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <LottieIcon source={LOTTIE_CROSS} size={22} />
              <Text style={[styles.summaryTitle, RTL]}>בלי צוואה vs</Text>
              <LottieIcon source={LOTTIE_CHECK} size={22} />
              <Text style={[styles.summaryTitle, RTL]}>עם צוואה</Text>
            </View>

            <View style={compStyles.compRow}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <LottieIcon source={LOTTIE_BALANCE} size={22} />
                <Text style={compStyles.compLabel}>עלויות משפטיות</Text>
              </View>
              <View style={compStyles.compValues}>
                <Text style={[compStyles.compBad, compStyles.compVal]}>{formatShekel(score.noWillFees)}</Text>
                <Text style={compStyles.compArrow}>→</Text>
                <Text style={[compStyles.compGood, compStyles.compVal]}>{formatShekel(score.withWillFees)}</Text>
              </View>
            </View>

            <View style={compStyles.compRow}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <LottieIcon source={LOTTIE_CLOCK} size={22} />
                <Text style={compStyles.compLabel}>זמן טיפול</Text>
              </View>
              <View style={compStyles.compValues}>
                <Text style={[compStyles.compBad, compStyles.compVal]}>{score.noWillTime} חודשים</Text>
                <Text style={compStyles.compArrow}>→</Text>
                <Text style={[compStyles.compGood, compStyles.compVal]}>{score.withWillTime} חודשים</Text>
              </View>
            </View>

            <View style={compStyles.compRow}>
              <Text style={compStyles.compLabel}>💢 סכסוך משפחתי</Text>
              <View style={compStyles.compValues}>
                <Text style={[compStyles.compBad, compStyles.compVal]}>{score.noWillConflict}/100</Text>
                <Text style={compStyles.compArrow}>→</Text>
                <Text style={[compStyles.compGood, compStyles.compVal]}>{score.withWillConflict}/100</Text>
              </View>
            </View>

            {/* Savings highlight */}
            <View style={compStyles.savingsBox}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <LottieIcon source={LOTTIE_MONEY} size={22} />
                <Text style={compStyles.savingsTitle}>חסכת למשפחה</Text>
              </View>
              <Text style={compStyles.savingsAmount}>{formatShekel(score.feesSaved)}</Text>
              <Text style={compStyles.savingsTime}>+ {score.timeSaved} חודשים של המתנה</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Distribution comparison */}
      <Animated.View entering={FadeInDown.duration(600).delay(300)}>
        <View style={sim5Styles.scoreCard}>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryTitle, RTL]}>חלוקת העיזבון</Text>
            {members.map((m) => {
              const noWillAmt = noWillOutcome.distribution[m.id] ?? 0;
              const withWillAmt = withWillOutcome.distribution[m.id] ?? 0;
              return (
                <View key={m.id} style={compStyles.memberCompRow}>
                  <Text style={compStyles.memberCompEmoji}>{m.emoji}</Text>
                  <Text style={[compStyles.memberCompName, RTL]}>{m.name}</Text>
                  <View style={compStyles.memberCompVals}>
                    <Text style={compStyles.compBad}>{formatShekel(noWillAmt)}</Text>
                    <Text style={compStyles.compArrow}>→</Text>
                    <Text style={compStyles.compGood}>{formatShekel(withWillAmt)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </Animated.View>

      {/* Key lesson */}
      <Animated.View entering={FadeInDown.duration(600).delay(400)}>
        <View style={sim5Styles.scoreCard}>
          <View style={styles.lessonCard}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <LottieIcon source={LOTTIE_BULB} size={22} />
              <Text style={[styles.lessonText, RTL, { flex: 1 }]}>
                צוואה = מתנה אחרונה למשפחה. בלעדיה — המדינה מחליטה בשבילך.
              </Text>
            </View>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
              <LottieIcon source={LOTTIE_BULB} size={22} />
              <Text style={[styles.lessonSubtext, RTL, { flex: 1 }]}>
                טיפ: שקלו גם ייפוי כוח מתמשך — להגן על עצמכם בחיים, לא רק אחרי.
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Actions */}
      <Animated.View entering={FadeInUp.duration(600).delay(600)} style={sim5Styles.actionsRow}>
        <AnimatedPressable onPress={onReplay} style={sim5Styles.replayBtn} accessibilityRole="button" accessibilityLabel="שחק שוב">
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
            <View accessible={false}><LottieIcon source={LOTTIE_REPLAY} size={18} /></View>
            <Text style={sim5Styles.replayText}>שחק שוב</Text>
          </View>
        </AnimatedPressable>
        <AnimatedPressable onPress={onContinue} style={[sim5Styles.continueBtn, { justifyContent: 'center' }]} accessibilityRole="button" accessibilityLabel="המשך">
          <Text style={sim5Styles.continueText}>המשך</Text>
          <View style={{ position: 'absolute', left: 16 }} accessible={false}>
            <LottieIcon source={LOTTIE_ARROW} size={22} />
          </View>
        </AnimatedPressable>
      </Animated.View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const compStyles = StyleSheet.create({
  compRow: {
    flexDirection: 'column',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: SIM5.cardBorder,
  },
  compLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: SIM5.textMuted,
    marginBottom: 4,
    ...({ writingDirection: 'rtl', textAlign: 'right' } as Record<string, string>),
  },
  compValues: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  compVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  compBad: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
  },
  compArrow: {
    color: SIM5.textMuted,
    fontSize: 14,
  },
  compGood: {
    color: '#4ade80',
    fontSize: 14,
    fontWeight: '700',
  },
  savingsBox: {
    marginTop: 12,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.25)',
  },
  savingsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4ade80',
  },
  savingsAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#4ade80',
    marginBottom: 2,
  },
  savingsTime: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(74, 222, 128, 0.7)',
  },
  memberCompRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: SIM5.cardBorder,
  },
  memberCompEmoji: {
    fontSize: 20,
  },
  memberCompName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: SIM5.textMuted,
  },
  memberCompVals: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
});

// ── Main Screen ───────────────────────────────────────────────────────

interface EstatePlanningScreenProps {
  onComplete?: () => void;
}

export function EstatePlanningScreen({ onComplete }: EstatePlanningScreenProps) {
  const {
    state,
    score,
    willValidation,
    toggleFamilyMember,
    goToPhase,
    setWillDecision,
    autoGenerateWill,
    reset,
    allFamilyMembers,
  } = useEstatePlanning();

  useSimReward(state.isComplete, SIM_COMPLETE_XP, SIM_COMPLETE_COINS);

  const rewardsGranted = useRef(false);

  const CH5_LOTTIE: [ReturnType<typeof require>, ReturnType<typeof require>] = [
    require('../../../../assets/lottie/wired-flat-443-tree-hover-pinch.json'),
    require('../../../../assets/lottie/wired-flat-1019-document-signature-hand-hover-pinch.json'),
  ];

  // Reward granting
  useEffect(() => {
    if (state.isComplete && !rewardsGranted.current) {
      rewardsGranted.current = true;
      successHaptic();
    }
  }, [state.isComplete]);

  const handleToggleMember = useCallback(
    (memberId: string) => {
      tapHaptic();
      toggleFamilyMember(memberId);
    },
    [toggleFamilyMember],
  );

  const handleGoToPhase = useCallback(
    (phase: 'no-will-scenario' | 'with-will-scenario' | 'comparison') => {
      heavyHaptic();
      goToPhase(phase);
    },
    [goToPhase],
  );

  const handleAutoWill = useCallback(() => {
    tapHaptic();
    autoGenerateWill();
  }, [autoGenerateWill]);

  const handleReplay = useCallback(() => {
    rewardsGranted.current = false;
    reset();
  }, [reset]);

  const handleContinue = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  // ── Score screen ──────────────────────────────────────────────────
  if (state.isComplete && score && state.noWillOutcome && state.withWillOutcome) {
    return (
      <SimLottieBackground lottieSources={CH5_LOTTIE} chapterColors={_th5.gradient}>
        <ScoreScreen
          score={score}
          noWillOutcome={state.noWillOutcome}
          withWillOutcome={state.withWillOutcome}
          members={state.familyMembers}
          onReplay={handleReplay}
          onContinue={handleContinue}
        />
      </SimLottieBackground>
    );
  }

  // ── Phase 1: Family Setup ─────────────────────────────────────────
  if (state.phase === 'setup') {
    return (
      <SimLottieBackground lottieSources={CH5_LOTTIE} chapterColors={_th5.gradient}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
          {/* Title */}
          <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
              <LottieIcon source={LOTTIE_TREE} size={28} />
              <Text accessibilityRole="header" style={[styles.title, RTL]}>עץ המשפחה</Text>
            </View>
            <Text style={[styles.subtitle, RTL]}>
              הגדירו את המשפחה שלכם ותבינו מה קורה עם העיזבון
            </Text>
          </Animated.View>

          {/* Estate info */}
          <Animated.View entering={FadeInDown.duration(500).delay(100)}>
            <GlowCard glowColor="rgba(34,211,238,0.2)" style={{ backgroundColor: SIM5.cardBg }}>
              <View style={styles.propertyCard}>
                <LottieIcon source={LOTTIE_BUILDING} size={40} />
                <Text style={[styles.propertyTitle, RTL]}>סך העיזבון</Text>
                <Text style={styles.propertyValue}>{formatShekel(TOTAL_ESTATE)}</Text>
                <View style={styles.assetsList}>
                  {state.assets.map((a) => (
                    <View key={a.id} style={styles.assetMiniRow}>
                      <Text style={styles.assetMiniEmoji}>{ASSET_EMOJI[a.id] ?? '💰'}</Text>
                      <Text style={[styles.assetMiniName, RTL]}>{a.name}</Text>
                      <Text style={styles.assetMiniValue}>{formatShekel(a.value)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </GlowCard>
          </Animated.View>

          {/* Family tree */}
          <Animated.View entering={FadeInDown.duration(500).delay(200)}>
            <Text style={[styles.sectionTitle, RTL]}>👨‍👩‍👧‍👦 בני המשפחה</Text>
            <Text style={[styles.sectionSubtitle, RTL]}>לחצו כדי להוסיף או להסיר</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(500).delay(300)} style={styles.familyGrid}>
            {allFamilyMembers.map((m) => {
              const isActive = state.familyMembers.some((fm) => fm.id === m.id);
              return (
                <FamilyNode
                  key={m.id}
                  member={m}
                  isActive={isActive}
                  onToggle={() => handleToggleMember(m.id)}
                  showToggle
                />
              );
            })}
          </Animated.View>

          {/* Active members count */}
          <Animated.View entering={FadeIn.duration(400)} style={styles.activeCount}>
            <Text style={styles.activeCountText}>
              {state.familyMembers.length} בני משפחה פעילים
            </Text>
          </Animated.View>

          {/* Next button */}
          {state.familyMembers.length > 0 && (
            <Animated.View entering={FadeInUp.duration(500)} style={styles.completeArea}>
              <AnimatedPressable
                onPress={() => handleGoToPhase('no-will-scenario')}
                style={styles.completeBtn}
                accessibilityRole="button"
                accessibilityLabel="מה קורה בלי צוואה?"
              >
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                  <View accessible={false}><LottieIcon source={LOTTIE_CROSS} size={22} /></View>
                  <Text style={styles.completeBtnText}>מה קורה בלי צוואה? →</Text>
                </View>
              </AnimatedPressable>
            </Animated.View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SimLottieBackground>
    );
  }

  // ── Phase 2: No Will Scenario ──────────────────────────────────────
  if (state.phase === 'no-will-scenario' && state.noWillOutcome) {
    const outcome = state.noWillOutcome;

    return (
      <SimLottieBackground lottieSources={CH5_LOTTIE} chapterColors={_th5.gradient}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
          {/* Banner */}
          <Animated.View entering={FadeInDown.springify().damping(12)} style={noWillStyles.banner}>
            <LottieIcon source={LOTTIE_CROSS} size={40} />
            <Text style={[noWillStyles.bannerTitle, RTL]}>אין צוואה</Text>
            <Text style={[noWillStyles.bannerDesc, RTL]}>
              חוק הירושה הישראלי מחליט בשבילך
            </Text>
          </Animated.View>

          {/* Family with angry emojis */}
          <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.familyGrid}>
            {state.familyMembers.map((m) => {
              const amount = outcome.distribution[m.id] ?? 0;
              return (
                <View key={m.id} style={noWillStyles.memberCard}>
                  <Text style={noWillStyles.memberEmoji}>{m.emoji}</Text>
                  <Text style={noWillStyles.angryEmoji}>😠</Text>
                  <Text style={[noWillStyles.memberName, RTL]}>{m.name}</Text>
                  <Text style={noWillStyles.memberAmount}>{formatShekel(amount)}</Text>
                </View>
              );
            })}
          </Animated.View>

          {/* FROZEN stamp */}
          <Animated.View entering={FadeInDown.springify().damping(12).delay(400)}>
            <View style={noWillStyles.frozenCard}>
              <Text style={noWillStyles.frozenEmoji}>🧊</Text>
              <Text style={[noWillStyles.frozenTitle, RTL]}>נכסים מוקפאים!</Text>
              <Text style={[noWillStyles.frozenDesc, RTL]}>
                הדירה וחשבונות הבנק מוקפאים למשך {FROZEN_MONTHS_WITHOUT_WILL} חודשים
              </Text>
            </View>
          </Animated.View>

          {/* Legal fees & timeline */}
          <Animated.View entering={FadeInDown.duration(500).delay(500)}>
            <GlowCard glowColor="rgba(239, 68, 68, 0.2)" style={{ backgroundColor: SIM5.cardBg }}>
              <View style={styles.summaryCard}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <LottieIcon source={LOTTIE_MONEY} size={22} />
                  <Text style={[styles.summaryTitle, RTL]}>עלויות ובירוקרטיה</Text>
                </View>

                <View style={styles.statRow}>
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                    <LottieIcon source={LOTTIE_BALANCE} size={22} />
                    <Text style={styles.statLabel}>עלויות משפטיות</Text>
                  </View>
                  <Text style={[styles.statValue, { color: '#ef4444' }]}>{formatShekel(outcome.legalFees)}</Text>
                </View>
                <View style={styles.statRow}>
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                    <LottieIcon source={LOTTIE_CLOCK} size={22} />
                    <Text style={styles.statLabel}>זמן טיפול</Text>
                  </View>
                  <Text style={[styles.statValue, { color: '#ef4444' }]}>{outcome.timeToResolve} חודשים</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>🧊 נכסים מוקפאים</Text>
                  <Text style={[styles.statValue, { color: '#a78bfa' }]}>{outcome.frozenMonths} חודשים</Text>
                </View>

                <ConflictMeter score={outcome.familyConflict} label="💢 רמת סכסוך משפחתי" />
              </View>
            </GlowCard>
          </Animated.View>

          {/* Next */}
          <Animated.View entering={FadeInUp.duration(500).delay(600)} style={styles.completeArea}>
            <AnimatedPressable
              onPress={() => handleGoToPhase('with-will-scenario')}
              style={[styles.completeBtn, { backgroundColor: '#059669' }]}
              accessibilityRole="button"
              accessibilityLabel="עכשיו בואו נכתוב צוואה"
            >
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                <View accessible={false}><LottieIcon source={LOTTIE_CHECK} size={22} /></View>
                <Text style={[styles.completeBtnText, { color: '#fff' }]}>עכשיו בואו נכתוב צוואה →</Text>
              </View>
            </AnimatedPressable>
          </Animated.View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SimLottieBackground>
    );
  }

  // ── Phase 3: Create Will ───────────────────────────────────────────
  if (state.phase === 'with-will-scenario') {
    return (
      <SimLottieBackground lottieSources={CH5_LOTTIE} chapterColors={_th5.gradient}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
          {/* Banner */}
          <Animated.View entering={FadeInDown.duration(500)} style={withWillStyles.banner}>
            <LottieIcon source={LOTTIE_CHECK} size={40} />
            <Text style={[withWillStyles.bannerTitle, RTL]}>כותבים צוואה</Text>
            <Text style={[withWillStyles.bannerDesc, RTL]}>
              חלקו את הנכסים בדיוק כרצונכם
            </Text>
          </Animated.View>

          {/* Auto-generate button */}
          <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.autoWillArea}>
            <AnimatedPressable onPress={handleAutoWill} style={styles.autoWillBtn} accessibilityRole="button" accessibilityLabel="חלוקה שווה אוטומטית">
              <Text style={styles.autoWillText}>⚡ חלוקה שווה אוטומטית</Text>
            </AnimatedPressable>
          </Animated.View>

          {/* Asset allocation sections */}
          {state.assets.map((asset, i) => {
            const assetDecisions = state.willDecisions
              .filter((d) => d.assetId === asset.id)
              .map((d) => ({ beneficiaryId: d.beneficiaryId, percentage: d.percentage }));
            const totalPct = willValidation.assetAllocations[asset.id] ?? 0;

            return (
              <Animated.View key={asset.id} entering={FadeInDown.duration(500).delay(200 + i * 100)}>
                <WillAssetSection
                  asset={asset}
                  members={state.familyMembers}
                  decisions={assetDecisions}
                  onSetDecision={(beneficiaryId, pct) => setWillDecision(asset.id, beneficiaryId, pct)}
                  totalPercent={totalPct}
                />
              </Animated.View>
            );
          })}

          {/* Validation status */}
          <Animated.View entering={FadeIn.duration(400)}>
            <View style={[styles.validationRow, willValidation.isFullyAllocated && styles.validationComplete]}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                {willValidation.isFullyAllocated
                  ? <LottieIcon source={LOTTIE_CHECK} size={22} />
                  : null}
                <Text style={styles.validationText}>
                  {willValidation.isFullyAllocated
                    ? 'כל הנכסים מחולקים — מוכנים להשוואה!'
                    : '⚠️ חלקו 100% מכל נכס כדי להמשיך'}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Compare button */}
          {willValidation.isFullyAllocated && (
            <Animated.View entering={FadeInUp.duration(500)} style={styles.completeArea}>
              <AnimatedPressable
                onPress={() => handleGoToPhase('comparison')}
                style={styles.completeBtn}
                accessibilityRole="button"
                accessibilityLabel="השוואה מלאה"
              >
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                  <View accessible={false}><LottieIcon source={LOTTIE_CHART} size={22} /></View>
                  <Text style={styles.completeBtnText}>השוואה מלאה →</Text>
                </View>
              </AnimatedPressable>
            </Animated.View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SimLottieBackground>
    );
  }

  // Fallback — shouldn't reach here (comparison phase triggers isComplete → score screen)
  return null;
}

// ── Phase-specific styles ────────────────────────────────────────────

const noWillStyles = StyleSheet.create({
  banner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ef4444',
    marginBottom: 4,
  },
  bannerDesc: {
    fontSize: 14,
    color: SIM5.textMuted,
  },
  memberCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 14,
    padding: 10,
    minWidth: 80,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  memberEmoji: {
    fontSize: 28,
  },
  angryEmoji: {
    fontSize: 16,
    marginTop: -4,
    marginBottom: 2,
  },
  memberName: {
    fontSize: 13,
    fontWeight: '700',
    color: SIM5.textPrimary,
    marginBottom: 2,
  },
  memberAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#f97316',
  },
  frozenCard: {
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.3)',
  },
  frozenEmoji: {
    fontSize: 36,
    marginBottom: 6,
  },
  frozenTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#a78bfa',
    marginBottom: 4,
  },
  frozenDesc: {
    fontSize: 14,
    color: SIM5.textMuted,
    lineHeight: 20,
  },
});

const withWillStyles = StyleSheet.create({
  banner: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.25)',
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#4ade80',
    marginBottom: 4,
  },
  bannerDesc: {
    fontSize: 14,
    color: SIM5.textMuted,
  },
});

// ── Main styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 50,
  },

  // Header
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: SIM5.textOnGradient,
    marginBottom: 6,
    ...SHADOW_STRONG,
  },
  subtitle: {
    fontSize: 15,
    color: SIM5.textOnGradientMuted,
    ...SHADOW_LIGHT,
  },

  // Hero (score screen)
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: SIM5.cardBorder,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fbbf24',
  },

  // Property / estate info card
  propertyCard: {
    marginBottom: 0,
    padding: 16,
    alignItems: 'center',
  },
  propertyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: SIM5.textPrimary,
    marginBottom: 4,
    marginTop: 8,
  },
  propertyValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#4ade80',
    marginBottom: 12,
  },
  assetsList: {
    width: '100%',
    gap: 4,
  },
  assetMiniRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: SIM5.cardBorder,
  },
  assetMiniEmoji: {
    fontSize: 18,
  },
  assetMiniName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: SIM5.textMuted,
  },
  assetMiniValue: {
    fontSize: 14,
    fontWeight: '800',
    color: SIM5.textPrimary,
  },

  // Section
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: SIM5.textOnGradient,
    marginBottom: 4,
    marginTop: 4,
    ...SHADOW_STRONG,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: SIM5.textOnGradientMuted,
    marginBottom: 12,
    ...SHADOW_LIGHT,
  },

  // Family grid
  familyGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginBottom: 16,
  },

  // Active count
  activeCount: {
    alignItems: 'center',
    marginBottom: 16,
  },
  activeCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: SIM5.textOnGradientMuted,
    ...SHADOW_LIGHT,
  },

  // Complete button
  completeArea: {
    marginTop: 8,
    alignItems: 'center',
  },
  completeBtn: {
    backgroundColor: SIM5.btnPrimary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: SIM5.btnPrimaryBorder,
  },
  completeBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },

  // Auto-will
  autoWillArea: {
    alignItems: 'center',
    marginBottom: 16,
  },
  autoWillBtn: {
    backgroundColor: SIM5.trackBg,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: SIM5.cardBorder,
  },
  autoWillText: {
    fontSize: 14,
    fontWeight: '700',
    color: SIM5.dark,
  },

  // Validation
  validationRow: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  validationComplete: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    borderColor: 'rgba(74, 222, 128, 0.2)',
  },
  validationText: {
    fontSize: 14,
    fontWeight: '700',
    color: SIM5.textPrimary,
  },

  // Score screen
  gradeArea: {
    alignItems: 'center',
    marginBottom: 20,
  },
  gradeLetter: {
    fontSize: 64,
    fontWeight: '900',
  },
  gradeLabel: {
    fontSize: 14,
    color: SIM5.textMuted,
    marginTop: 4,
  },
  summaryCard: {
    padding: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: SIM5.textPrimary,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: SIM5.textMuted,
    lineHeight: 22,
  },
  statRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: SIM5.cardBorder,
  },
  statLabel: {
    fontSize: 14,
    color: SIM5.textMuted,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: SIM5.textPrimary,
  },
  lessonCard: {
    padding: 16,
  },
  lessonText: {
    fontSize: 15,
    fontWeight: '600',
    color: SIM5.dark,
    lineHeight: 24,
  },
  lessonSubtext: {
    fontSize: 14,
    fontWeight: '600',
    color: SIM5.primary,
    lineHeight: 20,
  },
  rewardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 20,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SIM5.cardBg,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
  },
  rewardIcon: {
    fontSize: 18,
  },
  rewardValue: {
    fontSize: 15,
    fontWeight: '700',
    color: SIM5.textPrimary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  replayBtn: {
    flex: 1,
    backgroundColor: SIM5.cardBg,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: SIM5.cardBorder,
  },
  replayBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: SIM5.dark,
  },
  continueBtn: {
    flex: 1,
    backgroundColor: SIM5.btnPrimary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: SIM5.btnPrimaryBorder,
  },
  continueBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
