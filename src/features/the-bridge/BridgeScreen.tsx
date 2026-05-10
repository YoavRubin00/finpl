import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  Linking,
  AppState,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Info } from 'lucide-react-native';
import { Image as ExpoImage } from 'expo-image';
import { FINN_DANCING } from '../retention-loops/finnMascotConfig';
import { GoldCoinIcon } from '../../components/ui/GoldCoinIcon';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  cancelAnimation,
  FadeInDown,
  ZoomIn,
  Easing,
} from 'react-native-reanimated';
import { useEconomyStore } from '../economy/useEconomyStore';
import { useSubscriptionStore } from '../subscription/useSubscriptionStore';
import { useAuthStore } from '../auth/useAuthStore';
import { useBridgeStore } from './useBridgeStore';
import { trackBridgeClick } from '../../utils/trackBridgeClick';
import { BRIDGE_BENEFITS } from './bridgeData';
import { BenefitCard } from './BenefitCard';
import { RedemptionModal } from './RedemptionModal';
import { AnimatedPressable } from '../../components/ui/AnimatedPressable';
import { BackButton } from '../../components/ui/BackButton';
import { ConfettiExplosion } from '../../components/ui/ConfettiExplosion';
import { LottieIcon } from '../../components/ui/LottieIcon';
import { CATEGORY_LABELS } from './types';
import type { Benefit, BenefitCategory } from './types';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

const ALL_CATEGORIES: BenefitCategory[] = [
  'investments',
  'bank-accounts',
  'insurance',
  'credit-cards',
  'education',
];

// ── Floating coin with individual animation ─────────────────────────────────
interface FloatingCoinProps {
  delay: number;
  size: number;
  x: number;
  y: number;
}

function FloatingCoin({ delay, size, x, y }: FloatingCoinProps) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-8, { duration: 1600 + delay * 0.1, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1600 + delay * 0.1, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
    return () => {
      cancelAnimation(translateY);
      cancelAnimation(opacity);
    };
  }, []);

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: x,
    top: y,
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={style}>
      <GoldCoinIcon size={size * 0.6} />
    </Animated.View>
  );
}

const COIN_POSITIONS: FloatingCoinProps[] = [
  { delay: 0, size: 52, x: 20, y: 4 },
  { delay: 150, size: 40, x: 72, y: 42 },
  { delay: 300, size: 36, x: 14, y: 58 },
  { delay: 80, size: 28, x: 96, y: 8 },
  { delay: 220, size: 24, x: 58, y: 76 },
];

// ── Category tab bar ─────────────────────────────────────────────────────────
function AnimatedTabBar({
  categories,
  activeCategory,
  onSelect,
}: {
  categories: BenefitCategory[];
  activeCategory: BenefitCategory;
  onSelect: (cat: BenefitCategory) => void;
}) {
  const tabsScrollRef = useRef<ScrollView>(null);
  const didInitialScroll = useRef(false);

  return (
    <ScrollView
      ref={tabsScrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.tabsRow, { flexDirection: 'row-reverse' }]}
      onContentSizeChange={() => {
        // RTL row-reverse: first item ('investments') is visually right-most.
        // Default scroll offset (0) shows the LAST items, so we jump to the end
        // once on mount to reveal 'investments' as the user expects.
        if (didInitialScroll.current) return;
        didInitialScroll.current = true;
        tabsScrollRef.current?.scrollToEnd({ animated: false });
      }}
    >
      {categories.map((cat) => {
        const isActive = activeCategory === cat;
        return (
          <AnimatedPressable
            key={cat}
            onPress={() => onSelect(cat)}
            style={[styles.tab, isActive && styles.tabActive]}
          >
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {CATEGORY_LABELS[cat]}
            </Text>
          </AnimatedPressable>
        );
      })}
    </ScrollView>
  );
}

// ── Pulsing progress fill ───────────────────────────────────────────────────
function PulsingProgressFill({ progressBarStyle }: { progressBarStyle: ReturnType<typeof useAnimatedStyle> }) {
  const glowOpacity = useSharedValue(0.7);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 1000 }),
        withTiming(0.7, { duration: 1000 }),
      ),
      -1,
      true,
    );
    return () => cancelAnimation(glowOpacity);
  }, [glowOpacity]);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowOpacity.value,
  }));

  return <Animated.View style={[styles.progressFill, progressBarStyle, glowStyle]} />;
}

// ── Main Screen ──────────────────────────────────────────────────────────────

interface BridgeScreenProps {
  walkthroughAutoScroll?: boolean;
}

export function BridgeScreen({ walkthroughAutoScroll }: BridgeScreenProps = {}) {
  const router = useRouter();
  const coins = useEconomyStore((s) => s.coins);
  const isPro = useSubscriptionStore((s) => s.tier === "pro" && s.status === "active");
  const email = useAuthStore((s) => s.email);
  const isBenefitRedeemed = useBridgeStore((s) => s.isBenefitRedeemed);
  const redeemBenefit = useBridgeStore((s) => s.redeemBenefit);
  const redeemedCount = useBridgeStore((s) => s.getRedeemedCount());
  const savedValue = useBridgeStore((s) => s.getTotalSavedValue());

  const { tab } = useLocalSearchParams<{ tab?: BenefitCategory }>();
  const [activeCategory, setActiveCategory] = useState<BenefitCategory>(
    tab && (ALL_CATEGORIES as string[]).includes(tab) ? tab : 'investments'
  );
  const [selectedBenefit, setSelectedBenefit] = useState<Benefit | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [successTitle, setSuccessTitle] = useState('');
  const [showPostRedemptionModal, setShowPostRedemptionModal] = useState(false);
  const awaitingReturnFromPartner = useRef(false);

  // Listen for return from partner website
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && awaitingReturnFromPartner.current) {
        awaitingReturnFromPartner.current = false;
        setTimeout(() => {
          setShowPostRedemptionModal(true);
        }, 600);
      }
    });
    return () => subscription.remove();
  }, []);

  // Progress bar
  const progressBarPct = useSharedValue(0);
  useEffect(() => {
    const maxCost = Math.max(...BRIDGE_BENEFITS.filter(b => !b.partnerAdSlot).map(b => b.costCoins));
    const pct = Math.min(coins / maxCost, 1);
    progressBarPct.value = withSpring(pct, { damping: 18, stiffness: 80 });
  }, [coins]);
  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressBarPct.value * 100}%` as `${number}%`,
  }));

  // PRO card pulsing border
  const proBorderOpacity = useSharedValue(0.4);
  useEffect(() => {
    if (isPro) return;
    proBorderOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0.4, { duration: 1000 }),
      ),
      -1,
      true,
    );
    return () => cancelAnimation(proBorderOpacity);
  }, [isPro]);
  const proBorderStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(56,189,248,${proBorderOpacity.value})`,
    shadowOpacity: proBorderOpacity.value * 0.5,
  }));

  const scrollViewRef = useRef<ScrollView>(null);

  // Walkthrough: slow auto-scroll so user sees the bridge content
  useEffect(() => {
    if (!walkthroughAutoScroll) return;
    let y = 0;
    let interval: ReturnType<typeof setInterval> | null = null;
    const delay = setTimeout(() => {
      interval = setInterval(() => {
        y += 120;
        scrollViewRef.current?.scrollTo({ y, animated: true });
        if (y >= 600 && interval) { clearInterval(interval); interval = null; }
      }, 2000);
    }, 1500);
    return () => {
      clearTimeout(delay);
      if (interval) clearInterval(interval);
    };
  }, [walkthroughAutoScroll]);

  const visibleBenefits = BRIDGE_BENEFITS.filter(b => b.category === activeCategory);

  const handleCardPress = useCallback((benefit: Benefit) => {
    setSelectedBenefit(benefit);
    setModalVisible(true);
  }, []);

  const handleCancel = useCallback(() => {
    setModalVisible(false);
    setSelectedBenefit(null);
  }, []);

  const openPartnerUrl = useCallback(async (url: string) => {
    // Don't gate on Linking.canOpenURL — on Android 11+ it returns false for
    // https URLs unless the manifest declares <queries> for the BROWSABLE
    // intent, which Expo's auto-generated manifest does not. Just attempt
    // openURL and surface any actual failure.
    try {
      awaitingReturnFromPartner.current = true;
      await Linking.openURL(url);
    } catch {
      awaitingReturnFromPartner.current = false;
      Alert.alert('שגיאה בפתיחת הקישור', 'בדקו את החיבור לאינטרנט ונסו שוב.');
    }
  }, []);

  // Direct purchase shortcut: bypasses the confirmation modal. Used by the
  // big blue cost button on the card itself — needed because the modal
  // confirm flow had visibility issues on Android.
  const handleQuickPurchase = useCallback((benefit: Benefit) => {
    const alreadyRedeemed = isBenefitRedeemed(benefit.id);
    if (alreadyRedeemed) {
      // Re-open partner URL only, don't re-spend.
      if (benefit.partnerUrl) {
        trackBridgeClick(benefit.id, 'link_open', email);
        openPartnerUrl(benefit.partnerUrl);
      }
      return;
    }
    const success = redeemBenefit(benefit.id);
    if (success) {
      setSuccessTitle(benefit.title);
      setShowConfetti(true);
      trackBridgeClick(benefit.id, 'redeem', email);
      if (benefit.partnerUrl) {
        openPartnerUrl(benefit.partnerUrl);
      }
    } else {
      const currentCoins = useEconomyStore.getState().coins;
      if (!benefit.isAvailable) {
        Alert.alert('ההטבה אינה זמינה כרגע', 'חזרו בקרוב!');
      } else if (currentCoins < benefit.costCoins) {
        Alert.alert(
          'אין מספיק מטבעות',
          `צריך ${benefit.costCoins.toLocaleString()} מטבעות להטבה הזו. יש לכם ${currentCoins.toLocaleString()}.`,
        );
      } else {
        Alert.alert('שגיאה ברכישה', 'נסו שוב מאוחר יותר.');
      }
    }
  }, [isBenefitRedeemed, redeemBenefit, openPartnerUrl, email]);

  const handleConfirm = useCallback(() => {
    if (!selectedBenefit) return;
    const alreadyRedeemed = isBenefitRedeemed(selectedBenefit.id);
    // Re-opening a previously redeemed benefit: just open the URL again,
    // don't re-spend coins.
    if (alreadyRedeemed) {
      setModalVisible(false);
      setSelectedBenefit(null);
      if (selectedBenefit.partnerUrl) {
        trackBridgeClick(selectedBenefit.id, 'link_open', email);
        openPartnerUrl(selectedBenefit.partnerUrl);
      }
      return;
    }
    const success = redeemBenefit(selectedBenefit.id);
    setModalVisible(false);
    setSelectedBenefit(null);
    if (success) {
      setSuccessTitle(selectedBenefit.title);
      setShowConfetti(true);
      trackBridgeClick(selectedBenefit.id, 'redeem', email);
      if (selectedBenefit.partnerUrl) {
        openPartnerUrl(selectedBenefit.partnerUrl);
      }
    } else {
      // Surface the failure to the user so they understand why nothing happened.
      const coins = useEconomyStore.getState().coins;
      if (!selectedBenefit.isAvailable) {
        Alert.alert('ההטבה אינה זמינה כרגע', 'חזרו בקרוב!');
      } else if (coins < selectedBenefit.costCoins) {
        Alert.alert(
          'אין מספיק מטבעות',
          `צריך ${selectedBenefit.costCoins.toLocaleString()} מטבעות להטבה הזו. יש לכם ${coins.toLocaleString()}.`,
        );
      } else {
        Alert.alert('ההמרה נכשלה', 'נסו שוב בעוד רגע.');
      }
    }
  }, [selectedBenefit, redeemBenefit, email, isBenefitRedeemed, openPartnerUrl]);

  return (
    <View style={styles.root}>
      {showConfetti && <ConfettiExplosion onComplete={() => setShowConfetti(false)} />}

      {/* Premium gradient background */}
      <LinearGradient
        colors={['#f0f9ff', '#e0f2fe', '#f0f9ff', '#ffffff']}
        locations={[0, 0.25, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.headerBar}>
          <BackButton onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/investments' as never)} />
          <Text style={styles.screenTitle}>הגשר להטבות</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Captain Shark celebration, dancing because you reached the bridge ── */}
          <Animated.View entering={FadeInDown.duration(400)} style={{ alignItems: 'center', marginBottom: 4 }}>
            <ExpoImage source={FINN_DANCING} style={{ width: 96, height: 96 }} contentFit="contain" accessible={false} />
          </Animated.View>

          {/* ── Hero Card: 3D glow premium card ── */}
          <Animated.View entering={FadeInDown.duration(500).delay(0)}>
            <View style={styles.heroOuter}>
              {/* 3D glow layer */}
              <View style={styles.heroGlow3D} />
              <LinearGradient
                colors={['#ffffff', '#f0f9ff', '#e0f2fe']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroCard}
              >
                {/* Top: Coin stack + stats */}
                <View style={styles.heroRow}>
                  {/* Coins side */}
                  <View style={styles.coinStack}>
                    <View pointerEvents="none" style={styles.coinAnimContainer}>
                      {COIN_POSITIONS.map((c, i) => (
                        <FloatingCoin key={i} {...c} />
                      ))}
                    </View>
                    <View style={styles.coinLabelBlock}>
                      <Text style={styles.coinCount}>{coins.toLocaleString()}</Text>
                      <Text style={styles.coinLabel}>המטבעות שלכם</Text>
                    </View>
                  </View>

                  {/* Stats side */}
                  <View style={styles.statsCol}>
                    <Pressable
                      onPress={() => {
                        const redeemed = BRIDGE_BENEFITS.filter(b => isBenefitRedeemed(b.id));
                        Alert.alert(
                          'הטבות שהומרו',
                          redeemed.length > 0
                            ? redeemed.map(b => `- ${b.title}`).join('\n')
                            : 'עדיין לא המרת הטבות',
                        );
                      }}
                      style={styles.statRow}
                    >
                      <View style={styles.statValueRow}>
                        <Text style={styles.statValue}>{redeemedCount}</Text>
                        <Info size={12} color="#64748b" />
                      </View>
                      <Text style={styles.statLabel}>הטבות הומרו</Text>
                    </Pressable>

                    <View style={styles.statDivider} />

                    <Pressable
                      onPress={() => {
                        Alert.alert(
                          'פירוט חיסכון',
                          `המרת ${redeemedCount} הטבות\nערך חיסכון משוער: ${savedValue}\n\n(הערכה בלבד, הערך בפועל תלוי בשימוש)`,
                        );
                      }}
                      style={styles.statRow}
                    >
                      <View style={styles.statValueRow}>
                        <Text style={[styles.statValue, { color: '#0369a1' }]}>{savedValue}</Text>
                        <Info size={12} color="#64748b" />
                      </View>
                      <Text style={styles.statLabel}>חסכתם</Text>
                    </Pressable>

                    <View style={styles.statDivider} />

                    <Pressable
                      onPress={() => scrollViewRef.current?.scrollTo({ y: 500, animated: true })}
                      style={styles.statRow}
                    >
                      <View style={styles.statValueRow}>
                        <Text style={[styles.statValue, { color: '#0284c7' }]}>
                          {BRIDGE_BENEFITS.filter(b => !b.partnerAdSlot).length}
                        </Text>
                        <Info size={12} color="#64748b" />
                      </View>
                      <Text style={styles.statLabel}>הטבות זמינות</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={{ marginTop: 16 }}>
                  <View style={styles.progressTrack}>
                    <PulsingProgressFill progressBarStyle={progressBarStyle} />
                  </View>
                </View>
              </LinearGradient>
            </View>
          </Animated.View>

          {/* Success toast */}
          {showConfetti && successTitle !== '' && (
            <Animated.View entering={FadeInDown.duration(300)} style={styles.successToast}>
              <Text style={styles.successToastText}>
                הצלחת! &ldquo;{successTitle}&rdquo; הומרה בהצלחה!
              </Text>
            </Animated.View>
          )}

          {/* Category Tabs */}
          <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <AnimatedTabBar
              categories={ALL_CATEGORIES}
              activeCategory={activeCategory}
              onSelect={setActiveCategory}
            />
          </Animated.View>

          {/* Benefit Cards */}
          {visibleBenefits.map((benefit, i) => (
            <Animated.View
              key={benefit.id}
              entering={
                i === 0
                  ? ZoomIn.duration(400).delay(300)
                  : FadeInDown.duration(400).delay(300 + i * 60)
              }
            >
              <BenefitCard
                benefit={benefit}
                coins={coins}
                isPro={isPro}
                isRedeemed={isBenefitRedeemed(benefit.id)}
                onPress={() => handleCardPress(benefit)}
                onPurchase={() => handleQuickPurchase(benefit)}
              />
            </Animated.View>
          ))}

          {visibleBenefits.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>אין הטבות בקטגוריה הזו כרגע</Text>
            </View>
          )}

          {/* PRO upsell card */}
          {!isPro && (
            <AnimatedPressable
              onPress={() => router.push('/pricing' as never)}
              style={{ marginTop: 20, marginBottom: 8 }}
            >
              <Animated.View style={[styles.proCard, proBorderStyle]}>
                <LinearGradient
                  colors={['#0c4a6e', '#0369a1', '#0284c7']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.proCardInner}
                >
                  <View style={styles.proRow}>
                    <View style={styles.proLeft}>
                      <View style={styles.proIconCircle}>
                        <LottieIcon source={require('../../../assets/lottie/Pro Animation 3rd.json')} size={36} autoPlay loop />
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.proLabel}>שדרגו ל-PRO</Text>
                        <Text style={styles.proTitle}>לבבות אינסופיים + בוסט XP</Text>
                      </View>
                    </View>
                    <View style={styles.proBadge}>
                      <Text style={styles.proBadgeText}>PRO</Text>
                    </View>
                  </View>
                </LinearGradient>
              </Animated.View>
            </AnimatedPressable>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>
      </SafeAreaView>

      <RedemptionModal
        visible={modalVisible}
        benefit={selectedBenefit}
        isRedeemed={selectedBenefit ? isBenefitRedeemed(selectedBenefit.id) : false}
        canAfford={selectedBenefit ? coins >= selectedBenefit.costCoins : true}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

      {/* Post Redemption Return Modal */}
      <Modal
        visible={showPostRedemptionModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowPostRedemptionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeInDown.duration(220)} style={styles.modalBackdrop} pointerEvents="none" />

          <Animated.View
            entering={FadeInDown.duration(320)}
            style={styles.postRedemptionCard}
          >
            <ExpoImage
              source={FINN_DANCING}
              style={{ width: 140, height: 140, marginBottom: 16 }}
              contentFit="contain"
              accessible={false}
            />

            <Text style={styles.postRedemptionTitle}>עשינו צעד משמעותי היום.</Text>
            <Text style={styles.postRedemptionBody}>
              בואו נמשיך ללמוד כדי להתפתח
            </Text>

            <Pressable
              onPress={() => setShowPostRedemptionModal(false)}
              accessibilityRole="button"
              accessibilityLabel="המשך"
              style={({ pressed }) => [
                styles.postRedemptionBtn,
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
              ]}
            >
              <Text style={styles.postRedemptionBtnText}>המשך</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f0f9ff',
  },

  // Header
  headerBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0c4a6e',
    ...RTL,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 48,
  },

  // Hero card, 3D glow effect
  heroOuter: {
    marginBottom: 8,
    position: 'relative',
  },
  heroGlow3D: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: 6,
    bottom: -4,
    borderRadius: 22,
    backgroundColor: 'rgba(14,165,233,0.12)',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  heroCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(186,230,253,0.6)',
    padding: 20,
    overflow: 'hidden',
    // Inner shadow/glow
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  heroRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  coinStack: {
    width: 140,
    alignItems: 'center',
    marginLeft: 20,
  },
  coinAnimContainer: {
    width: 140,
    height: 100,
    position: 'relative',
    overflow: 'hidden',
  },
  coinLabelBlock: {
    alignItems: 'center',
    marginTop: 4,
  },
  coinCount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0369a1',
    textShadowColor: 'rgba(14,165,233,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  coinLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },

  // Stats
  statsCol: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 8,
  },
  statRow: {
    alignItems: 'flex-end',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 50,
    height: 1,
    backgroundColor: 'rgba(186,230,253,0.6)',
    alignSelf: 'flex-end',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0ea5e9',
    textShadowColor: 'rgba(14,165,233,0.2)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    ...RTL,
    marginTop: 1,
  },

  // Progress
  progressTrack: {
    height: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(186,230,253,0.4)',
    overflow: 'hidden',
    transform: [{ scaleX: -1 }],
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#0ea5e9',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },

  // Success toast
  successToast: {
    backgroundColor: 'rgba(14,165,233,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.2)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 14,
  },
  successToastText: {
    color: '#0369a1',
    fontWeight: '700',
    fontSize: 13,
    ...RTL,
  },

  // Tabs
  tabsRow: {
    gap: 8,
    paddingVertical: 12,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(186,230,253,0.5)',
    backgroundColor: '#ffffff',
  },
  tabActive: {
    backgroundColor: '#f0f9ff',
    borderColor: '#38bdf8',
    borderBottomWidth: 3,
    borderBottomColor: '#0ea5e9',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#0369a1',
    fontWeight: '900',
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    ...RTL,
  },

  // PRO card
  proCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 14,
    elevation: 8,
    overflow: 'hidden',
  },
  proCardInner: {
    borderRadius: 16,
    overflow: 'hidden',
    padding: 16,
  },
  proRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  proLeft: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  proIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(14,165,233,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#38bdf8',
    textTransform: 'uppercase',
  },
  proTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 2,
  },
  proBadge: {
    borderRadius: 20,
    backgroundColor: 'rgba(56,189,248,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(56,189,248,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  proBadgeText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#38bdf8',
  },

  // Post Redemption Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  postRedemptionCard: {
    width: '85%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#0c4a6e',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  postRedemptionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: 8,
  },
  postRedemptionBody: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748b',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: 24,
    lineHeight: 22,
  },
  postRedemptionBtn: {
    backgroundColor: '#2563eb',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1d4ed8',
    borderBottomWidth: 4,
    borderBottomColor: '#1d4ed8',
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 10,
  },
  postRedemptionBtnText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
});
