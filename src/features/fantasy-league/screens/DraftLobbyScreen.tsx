import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  FlatList,
  Alert,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { CLASH, DUO } from '../../../constants/theme';
import { FINN_FIRE, FINN_STANDARD } from '../../retention-loops/finnMascotConfig';
import { useFantasyStore } from '../useFantasyStore';
import { STOCK_CATEGORIES, TIER_CONFIGS, COMPETITION_RULES } from '../fantasyData';
import { TierSelectionCard } from '../components/TierSelectionCard';
import { DraftCategoryTabs } from '../components/DraftCategoryTabs';
import { StockDraftCard } from '../components/StockDraftCard';
import { DraftProgressBar } from '../components/DraftProgressBar';
import { SharkAnalysisModal } from '../components/SharkAnalysisModal';
import { RulesModal } from '../components/RulesModal';
import type { FantasyTier, StockCategoryId, DraftStock } from '../fantasyTypes';

export function DraftLobbyScreen(): React.ReactElement {
  const currentEntry = useFantasyStore((s) => s.currentEntry);
  const picks = currentEntry?.picks ?? [];
  const isLocked = !!currentEntry?.lockedAt;
  const enterCompetition = useFantasyStore((s) => s.enterCompetition);
  const pickStock = useFantasyStore((s) => s.pickStock);
  const lockDraft = useFantasyStore((s) => s.lockDraft);

  const [selectedTier, setSelectedTier] = useState<FantasyTier>('silver');
  const [activeCategory, setActiveCategory] = useState<StockCategoryId>('tech');
  const [analysisStock, setAnalysisStock] = useState<DraftStock | null>(null);
  const [showRules, setShowRules] = useState(false);

  const hasEntered = currentEntry !== null;
  const pickedCategories = picks.map((p) => p.categoryId);

  const activeStocks = STOCK_CATEGORIES.find((c) => c.id === activeCategory)?.stocks ?? [];

  const handleEnter = useCallback(() => {
    const config = TIER_CONFIGS[selectedTier];
    const title = `הצטרפות ל${config.label}`;
    const body = `עלות: ${config.entryCost.toLocaleString('he-IL')} מטבעות\n\nהמטבעות ינוכו מיד. בהצלחה!`;
    const errBody = `נדרשים ${config.entryCost.toLocaleString('he-IL')} מטבעות. צבור עוד ונחזור!`;

    const proceed = (): void => {
      const ok = enterCompetition(selectedTier);
      if (!ok) {
        if (Platform.OS === 'web') {
          window.alert(`אין מספיק מטבעות\n\n${errBody}`);
        } else {
          Alert.alert('אין מספיק מטבעות', errBody);
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${body}`)) proceed();
    } else {
      Alert.alert(title, body, [
        { text: 'ביטול', style: 'cancel' },
        { text: 'אישור ✓', onPress: proceed },
      ]);
    }
  }, [selectedTier, enterCompetition]);

  const handlePickStock = useCallback(
    (stock: DraftStock) => {
      if (!hasEntered || isLocked) return;
      const existing = picks.find((p) => p.categoryId === stock.categoryId);
      if (existing?.ticker === stock.ticker) {
        // Toggle off — re-pick same stock (no-op in store, just remove it)
        // Re-pick with null effectively via re-picking another in category
        return;
      }
      pickStock(stock.categoryId, stock.ticker, stock.name, stock.mockPrice);
    },
    [hasEntered, isLocked, picks, pickStock],
  );

  const handleLock = useCallback(() => {
    const title = 'נעל את הדראפט';
    const body = 'לאחר הנעילה לא ניתן לשנות מניות עד סוף השבוע. בטוח?';
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${body}`)) lockDraft();
    } else {
      Alert.alert(title, body, [
        { text: 'לא עדיין', style: 'cancel' },
        { text: 'נעל! 🔒', onPress: lockDraft },
      ]);
    }
  }, [lockDraft]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* ─── Header ─── */}
      <LinearGradient
        colors={[CLASH.bgPrimary, CLASH.bgSecondary, CLASH.bgPrimary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        {/* Back button */}
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="חזור"
        >
          <Text style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)' }}>→</Text>
        </Pressable>

        <View style={styles.headerContent}>
          {/* Finn */}
          <View style={styles.finnWrap}>
            <ExpoImage
              source={isLocked ? FINN_STANDARD : FINN_FIRE}
              style={{ width: 64, height: 64 }}
              contentFit="contain"
              accessible={false}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>
              {isLocked ? '✅ הדראפט נעול' : '🏹 בנה את התיק שלך'}
            </Text>
            <Text style={styles.headerSub}>
              {isLocked
                ? 'בהצלחה! התחרות מתחילה ביום ראשון'
                : 'בחר מניה אחת מכל קטגוריה'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[]}
        contentContainerStyle={{ paddingBottom: 180 }}
      >
        {/* ─── Rules summary ─── */}
        <Animated.View entering={FadeInDown.delay(60).duration(340)} style={styles.rulesCard}>
          <View style={styles.rulesHeader}>
            <Text style={styles.rulesTitle}>📋 חוקים בקצרה</Text>
            <Pressable
              onPress={() => setShowRules(true)}
              accessibilityRole="button"
              accessibilityLabel="קרא את כל החוקים"
            >
              <Text style={styles.rulesLink}>כל החוקים ←</Text>
            </Pressable>
          </View>
          {COMPETITION_RULES.slice(0, 3).map((rule, i) => (
            <View key={i} style={styles.ruleRow}>
              <Text style={styles.ruleDot}>•</Text>
              <Text style={styles.ruleText}>{rule}</Text>
            </View>
          ))}
        </Animated.View>

        {/* ─── Tier selection (pre-entry) ─── */}
        {!hasEntered && (
          <Animated.View entering={FadeInDown.delay(120).duration(340)} style={styles.tierSection}>
            <Text style={styles.sectionLabel}>בחר קטגוריה להשקעה</Text>
            <View style={styles.tierRow}>
              {Object.values(TIER_CONFIGS).map((config) => (
                <TierSelectionCard
                  key={config.id}
                  config={config}
                  selected={selectedTier === config.id}
                  disabled={false}
                  onSelect={setSelectedTier}
                />
              ))}
            </View>
            <Pressable
              onPress={handleEnter}
              style={({ pressed }) => [
                styles.enterBtn,
                { opacity: pressed ? 0.85 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="הצטרף לתחרות"
            >
              <LinearGradient
                colors={[CLASH.goldLight, CLASH.goldBorder]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.enterBtnGradient}
              >
                <Text style={styles.enterBtnText}>
                  הצטרף ל{TIER_CONFIGS[selectedTier].label} 🚀
                </Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}

        {/* ─── Weekly mission ─── */}
        {hasEntered && (
          <Animated.View entering={FadeInDown.delay(80).duration(300)} style={styles.missionCard}>
            <View style={styles.missionHeader}>
              <Text style={{ fontSize: 16 }}>🎯</Text>
              <Text style={styles.missionLabel}>משימת השבוע</Text>
              <View style={styles.missionXPBadge}>
                <Text style={styles.missionXPText}>+100 XP</Text>
              </View>
            </View>
            <Text style={styles.missionDesc}>בחר מניה מקטגוריית האנרגיה</Text>
          </Animated.View>
        )}

        {/* ─── Category tabs ─── */}
        {hasEntered && (
          <Animated.View entering={FadeInDown.delay(140).duration(300)}>
            <Text style={[styles.sectionLabel, { marginHorizontal: 16, marginTop: 8 }]}>
              בחר קטגוריה
            </Text>
            <DraftCategoryTabs
              categories={STOCK_CATEGORIES}
              activeId={activeCategory}
              pickedCategories={pickedCategories}
              onSelect={setActiveCategory}
            />
          </Animated.View>
        )}

        {/* ─── Stock grid ─── */}
        {hasEntered && (
          <Animated.View entering={FadeInDown.delay(180).duration(320)}>
            <FlatList
              data={activeStocks}
              keyExtractor={(s) => s.ticker}
              numColumns={2}
              scrollEnabled={false}
              contentContainerStyle={{ paddingHorizontal: 11, paddingBottom: 8 }}
              renderItem={({ item, index }) => {
                const isPicked = picks.some(
                  (p) => p.categoryId === item.categoryId && p.ticker === item.ticker,
                );
                return (
                  <Animated.View
                    entering={FadeInDown.delay(index * 55).duration(280)}
                    style={{ flex: 1 }}
                  >
                    <StockDraftCard
                      stock={item}
                      isPicked={isPicked}
                      onPick={() => handlePickStock(item)}
                      onAnalysis={() => setAnalysisStock(item)}
                    />
                  </Animated.View>
                );
              }}
            />
          </Animated.View>
        )}
      </ScrollView>

      {/* ─── Sticky bottom progress bar ─── */}
      {hasEntered && (
        <View style={styles.stickyBottom}>
          <DraftProgressBar
            categories={STOCK_CATEGORIES}
            picks={picks}
            onLock={handleLock}
            locked={isLocked}
          />
        </View>
      )}

      {/* ─── Modals ─── */}
      <SharkAnalysisModal
        stock={analysisStock}
        visible={analysisStock !== null}
        onClose={() => setAnalysisStock(null)}
        onPick={() => analysisStock && handlePickStock(analysisStock)}
        isPicked={
          analysisStock !== null &&
          picks.some(
            (p) => p.categoryId === analysisStock.categoryId && p.ticker === analysisStock.ticker,
          )
        }
      />
      <RulesModal visible={showRules} onClose={() => setShowRules(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: CLASH.bgPrimary,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  backBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  headerContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
  },
  finnWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(212,160,23,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(212,160,23,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  headerSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    writingDirection: 'rtl',
    textAlign: 'right',
    marginTop: 3,
  },
  rulesCard: {
    margin: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 8,
  },
  rulesHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  rulesTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.9)',
    writingDirection: 'rtl',
  },
  rulesLink: {
    fontSize: 12,
    color: CLASH.goldLight,
    fontWeight: '700',
  },
  ruleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 6,
  },
  ruleDot: {
    fontSize: 14,
    color: CLASH.goldBorder,
    marginTop: 1,
    flexShrink: 0,
  },
  ruleText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    writingDirection: 'rtl',
    textAlign: 'right',
    flex: 1,
    lineHeight: 18,
  },
  tierSection: {
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 8,
  },
  tierRow: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.7)',
    writingDirection: 'rtl',
    textAlign: 'right',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  enterBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: CLASH.goldGlow,
    shadowOpacity: 0.7,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  enterBtnGradient: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  enterBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000000',
  },
  missionCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(56,189,248,0.08)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.2)',
    gap: 6,
  },
  missionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  missionLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: '#7dd3fc',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  missionXPBadge: {
    backgroundColor: 'rgba(56,189,248,0.2)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  missionXPText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7dd3fc',
  },
  missionDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  stickyBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});