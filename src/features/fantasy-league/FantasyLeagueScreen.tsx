import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, ActivityIndicator, Dimensions, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing } from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import { CLASH, DUO, TEXT_SHADOW } from '../../constants/theme';
import { useFantasyStore } from './useFantasyStore';
import { CURRENT_LEAGUE } from './fantasyData';
import { TRADABLE_ASSETS } from '../trading-hub/tradingHubData';
import { fetchLatestPrice } from '../trading-hub/marketApiService';
import type { TradableAsset } from '../trading-hub/tradingHubTypes';
import { successHaptic } from '../../utils/haptics';
import { useEconomyStore } from '../economy/useEconomyStore';
import type { FantasyPosition, LeaderboardEntry } from './fantasyTypes';
import { DraftScreen } from './DraftScreen';

interface SellResult {
  assetName: string;
  pnl: number;
  pnlPercent: number;
}

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

type TabId = 'leaderboard' | 'portfolio' | 'draft';

const FANTASY_TABS: { id: TabId; label: string }[] = [
  { id: 'leaderboard', label: 'דירוג' },
  { id: 'portfolio', label: 'התיק' },
  { id: 'draft', label: 'דראפט' },
];

function useCountdown(endDate: string | undefined): string {
  const computeRemaining = useCallback(() => {
    if (!endDate) return 'טוען...';
    const diff = new Date(endDate).getTime() - Date.now();
    if (diff <= 0) return 'הליגה הסתיימה';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    const pad = (n: number) => n.toString().padStart(2, '0');

    if (days > 0) {
      return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }, [endDate]);

  const [remaining, setRemaining] = useState(computeRemaining);

  useEffect(() => {
    setRemaining(computeRemaining());
    const interval = setInterval(() => {
      setRemaining(computeRemaining());
    }, 1000);
    return () => clearInterval(interval);
  }, [computeRemaining]);

  return remaining;
}

function RankBadge({ rank }: { rank: number }) {
  const medals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
  if (medals[rank]) {
    return <Text style={{ fontSize: 20 }}>{medals[rank]}</Text>;
  }
  return (
    <Text style={{ fontSize: 16, fontWeight: '800', color: '#64748b', ...TEXT_SHADOW }}>
      {rank}
    </Text>
  );
}

function LeaderboardRow({ entry, index }: { entry: LeaderboardEntry; index: number }) {
  const isLocal = entry.playerId === 'local';
  const pnlColor = entry.pnlPercent >= 0 ? '#4ade80' : CLASH.redBadge;
  const changeIcon = entry.change === '+1' ? '▲' : entry.change === '-1' ? '▼' : '';
  const changeColor = entry.change === '+1' ? '#4ade80' : entry.change === '-1' ? CLASH.redBadge : '#64748b';

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).springify()}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isLocal ? 'rgba(212, 160, 23, 0.15)' : CLASH.cardBg,
        borderRadius: 14,
        borderWidth: isLocal ? 2 : 1,
        borderColor: isLocal ? CLASH.goldBorder : 'rgba(42, 90, 140, 0.3)',
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 8,
        ...(isLocal
          ? {
              shadowColor: CLASH.goldLight,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 8,
            }
          : {}),
      }}
    >
      {/* Rank */}
      <View style={{ width: 36, alignItems: 'center' }}>
        <RankBadge rank={entry.rank} />
      </View>

      {/* Change indicator */}
      <View style={{ width: 20, alignItems: 'center' }}>
        <Text style={{ fontSize: 10, color: changeColor }}>{changeIcon}</Text>
      </View>

      {/* Name */}
      <View style={{ flex: 1, marginLeft: 8 }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: isLocal ? '900' : '600',
            color: isLocal ? CLASH.goldLight : '#e2e8f0',
            ...TEXT_SHADOW,
          }}
        >
          {isLocal ? `⭐ ${entry.displayName}` : entry.displayName}
        </Text>
      </View>

      {/* Portfolio Value */}
      <View style={{ alignItems: 'flex-end', marginRight: 4 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '700',
            color: isLocal ? CLASH.goldLight : '#e2e8f0',
            ...TEXT_SHADOW,
          }}
        >
          {entry.portfolioValue.toLocaleString()} FC
        </Text>
        <Text style={{ fontSize: 12, fontWeight: '600', color: pnlColor }}>
          {entry.pnlPercent >= 0 ? '+' : ''}
          {entry.pnlPercent.toFixed(2)}%
        </Text>
      </View>
    </Animated.View>
  );
}

function PnlSparkline({ pnlPercent }: { pnlPercent: number }) {
  const color = pnlPercent >= 0 ? '#4ade80' : CLASH.redBadge;
  // Simple 5-segment color bar indicating direction & magnitude
  const segments = 5;
  const magnitude = Math.min(Math.abs(pnlPercent) / 3, 1); // normalize 0-3% to 0-1
  const filledCount = Math.max(1, Math.ceil(magnitude * segments));

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4 }}>
      {Array.from({ length: segments }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 6,
            height: i < filledCount ? 8 + i * 2 : 6,
            borderRadius: 2,
            backgroundColor: i < filledCount ? color : 'rgba(148, 163, 184, 0.2)',
          }}
        />
      ))}
    </View>
  );
}

function PositionRow({
  position,
  index,
  onSell,
}: {
  position: FantasyPosition;
  index: number;
  onSell: (positionId: string, currentPrice: number) => void;
}) {
  const pnlColor = position.pnlPercent >= 0 ? '#4ade80' : CLASH.redBadge;
  const totalValue = position.quantity * position.currentPrice;
  const swipeableRef = useRef<Swipeable>(null);

  const renderRightActions = () => (
    <Pressable
      onPress={() => {
        swipeableRef.current?.close();
        onSell(position.id, position.currentPrice);
      }}
      style={({ pressed }) => ({
        backgroundColor: pressed ? '#b91c1c' : CLASH.redBadge,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        marginBottom: 8,
        marginLeft: 8,
      })}
    >
      <Text style={{ fontSize: 22, marginBottom: 2 }}>💰</Text>
      <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff' }}>מכור</Text>
    </Pressable>
  );

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        overshootRight={false}
        friction={2}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: CLASH.cardBg,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: 'rgba(42, 90, 140, 0.3)',
            paddingHorizontal: 14,
            paddingVertical: 12,
            marginBottom: 8,
          }}
        >
          {/* Asset info */}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#e2e8f0', ...TEXT_SHADOW }}>
              {position.assetName}
            </Text>
            <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              {position.quantity} × {position.currentPrice.toFixed(2)} FC
            </Text>
          </View>

          {/* Sparkline */}
          <View style={{ marginHorizontal: 10 }}>
            <PnlSparkline pnlPercent={position.pnlPercent} />
          </View>

          {/* Value + PnL */}
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#e2e8f0', ...TEXT_SHADOW }}>
              {totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} FC
            </Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: pnlColor }}>
              {position.pnlPercent >= 0 ? '+' : ''}
              {position.pnlPercent.toFixed(2)}%
            </Text>
          </View>
        </View>
      </Swipeable>
    </Animated.View>
  );
}

const TYPE_LABELS: Record<string, string> = {
  stock: 'מניה',
  index: 'מדד',
  commodity: 'סחורה',
  crypto: 'קריפטו',
};

const TYPE_COLORS: Record<string, string> = {
  stock: '#60a5fa',
  index: '#a78bfa',
  commodity: '#fbbf24',
  crypto: '#34d399',
};

function AssetRow({
  asset,
  index,
  onSelect,
}: {
  asset: TradableAsset;
  index: number;
  onSelect: (asset: TradableAsset) => void;
}) {
  const [price, setPrice] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchLatestPrice(asset.id).then((p) => {
      if (!cancelled) setPrice(p);
    });
    return () => { cancelled = true; };
  }, [asset.id]);

  const typeColor = TYPE_COLORS[asset.type] ?? '#64748b';

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
      <Pressable
        onPress={() => onSelect(asset)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: pressed ? 'rgba(42, 90, 140, 0.4)' : CLASH.cardBg,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: 'rgba(42, 90, 140, 0.3)',
          paddingHorizontal: 14,
          paddingVertical: 12,
          marginBottom: 8,
        })}
      >
        {/* Symbol emoji */}
        <Text style={{ fontSize: 24, width: 36, textAlign: 'center' }}>{asset.symbol}</Text>

        {/* Name + type badge */}
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#e2e8f0', ...TEXT_SHADOW }}>
            {asset.name}
          </Text>
          <View
            style={{
              alignSelf: 'flex-start',
              backgroundColor: `${typeColor}22`,
              borderRadius: 6,
              paddingHorizontal: 8,
              paddingVertical: 2,
              marginTop: 4,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '600', color: typeColor }}>
              {TYPE_LABELS[asset.type] ?? asset.type}
            </Text>
          </View>
        </View>

        {/* Live price */}
        <View style={{ alignItems: 'flex-end' }}>
          {price !== null ? (
            <Text style={{ fontSize: 14, fontWeight: '700', color: CLASH.goldLight, ...TEXT_SHADOW }}>
              ${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </Text>
          ) : (
            <ActivityIndicator size="small" color={CLASH.goldLight} />
          )}
          <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{asset.id}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function BuyConfirmSheet({
  asset,
  cashRemaining,
  onClose,
  onConfirm,
}: {
  asset: TradableAsset | null;
  cashRemaining: number;
  onClose: () => void;
  onConfirm: (assetId: string, assetName: string, quantity: number, price: number) => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState<number | null>(null);
  const [overBudget, setOverBudget] = useState(false);

  useEffect(() => {
    if (!asset) return;
    setQuantity(1);
    setPrice(null);
    setOverBudget(false);
    let cancelled = false;
    fetchLatestPrice(asset.id).then((p) => {
      if (!cancelled) setPrice(p);
    });
    return () => { cancelled = true; };
  }, [asset]);

  const cost = price !== null ? quantity * price : 0;

  useEffect(() => {
    if (price !== null) {
      setOverBudget(cost > cashRemaining);
    }
  }, [cost, cashRemaining, price]);

  const adjustQuantity = (delta: number) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  if (!asset) return null;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose} accessibilityViewIsModal>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: '#0d2847',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 12,
            paddingBottom: 32,
          }}
        >
          {/* Handle bar */}
          <View style={{ alignItems: 'center', marginBottom: 8 }}>
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: 'rgba(148, 163, 184, 0.4)',
              }}
            />
          </View>

          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 }}>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={{ fontSize: 16, color: '#64748b', fontWeight: '600' }}>✕</Text>
            </Pressable>
            <Text style={[{ fontSize: 18, fontWeight: '800', color: CLASH.goldLight, ...TEXT_SHADOW }, RTL]}>
              קנייה
            </Text>
          </View>

          {/* Asset info */}
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 36, marginBottom: 4 }}>{asset.symbol}</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#e2e8f0', ...TEXT_SHADOW }}>
              {asset.name}
            </Text>
            {price !== null ? (
              <Text style={{ fontSize: 16, fontWeight: '700', color: CLASH.goldLight, marginTop: 4, ...TEXT_SHADOW }}>
                ${price.toLocaleString(undefined, { maximumFractionDigits: 2 })} למניה
              </Text>
            ) : (
              <ActivityIndicator size="small" color={CLASH.goldLight} style={{ marginTop: 8 }} />
            )}
          </View>

          {/* Quantity control */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20, gap: 16 }}>
            <Pressable
              onPress={() => adjustQuantity(-1)}
              style={({ pressed }) => ({
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: pressed ? 'rgba(42, 90, 140, 0.6)' : CLASH.cardBg,
                borderWidth: 1,
                borderColor: 'rgba(42, 90, 140, 0.5)',
                justifyContent: 'center',
                alignItems: 'center',
              })}
            >
              <Text style={{ fontSize: 24, fontWeight: '900', color: '#e2e8f0' }}>−</Text>
            </Pressable>

            <View
              style={{
                minWidth: 80,
                paddingHorizontal: 16,
                paddingVertical: 10,
                backgroundColor: CLASH.cardBg,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: CLASH.goldBorder,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 28, fontWeight: '900', color: CLASH.goldLight, ...TEXT_SHADOW }}>
                {quantity}
              </Text>
            </View>

            <Pressable
              onPress={() => adjustQuantity(1)}
              style={({ pressed }) => ({
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: pressed ? 'rgba(42, 90, 140, 0.6)' : CLASH.cardBg,
                borderWidth: 1,
                borderColor: 'rgba(42, 90, 140, 0.5)',
                justifyContent: 'center',
                alignItems: 'center',
              })}
            >
              <Text style={{ fontSize: 24, fontWeight: '900', color: '#e2e8f0' }}>+</Text>
            </Pressable>
          </View>

          {/* Cost display */}
          <View
            style={{
              marginHorizontal: 20,
              backgroundColor: overBudget ? 'rgba(239, 68, 68, 0.15)' : CLASH.cardBg,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: overBudget ? CLASH.redBadge : 'rgba(42, 90, 140, 0.3)',
              padding: 14,
              marginBottom: 20,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[{ fontSize: 14, fontWeight: '600', color: '#64748b' }, RTL]}>
                עלות
              </Text>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: '900',
                  color: overBudget ? CLASH.redBadge : CLASH.goldLight,
                  ...TEXT_SHADOW,
                }}
              >
                {price !== null ? `${cost.toLocaleString(undefined, { maximumFractionDigits: 0 })} FC` : '—'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
              <Text style={[{ fontSize: 12, fontWeight: '600', color: '#64748b' }, RTL]}>
                מזומן פנוי
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748b' }}>
                {cashRemaining.toLocaleString(undefined, { maximumFractionDigits: 0 })} FC
              </Text>
            </View>
            {overBudget && (
              <Text style={[{ fontSize: 13, fontWeight: '700', color: CLASH.redBadge, marginTop: 8 }, RTL]}>
                ⚠️ חריגה מהתקציב!
              </Text>
            )}
          </View>

          {/* Confirm button */}
          <Pressable
            onPress={() => {
              if (price !== null && !overBudget) {
                onConfirm(asset.id, asset.name, quantity, price);
              }
            }}
            disabled={price === null || overBudget}
            style={({ pressed }) => ({
              marginHorizontal: 20,
              backgroundColor: price === null || overBudget
                ? 'rgba(148, 163, 184, 0.2)'
                : pressed
                  ? '#b8860b'
                  : CLASH.goldBorder,
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: 'center',
              shadowColor: CLASH.goldLight,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: price === null || overBudget ? 0 : 0.4,
              shadowRadius: 10,
              elevation: price === null || overBudget ? 0 : 6,
            })}
          >
            <Text
              style={{
                fontSize: 17,
                fontWeight: '900',
                color: price === null || overBudget ? '#64748b' : '#0d2847',
              }}
            >
              אשר קנייה
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function AssetPickerSheet({
  visible,
  onClose,
  onSelectAsset,
}: {
  visible: boolean;
  onClose: () => void;
  onSelectAsset: (asset: TradableAsset) => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} accessibilityViewIsModal>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: '#0d2847',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: '80%',
            paddingTop: 12,
          }}
        >
          {/* Handle bar */}
          <View style={{ alignItems: 'center', marginBottom: 8 }}>
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: 'rgba(148, 163, 184, 0.4)',
              }}
            />
          </View>

          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 20,
              marginBottom: 12,
            }}
          >
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={{ fontSize: 16, color: '#64748b', fontWeight: '600' }}>✕</Text>
            </Pressable>
            <Text
              style={[
                { fontSize: 18, fontWeight: '800', color: CLASH.goldLight, ...TEXT_SHADOW },
                RTL,
              ]}
            >
              בחר נכס לקנייה
            </Text>
          </View>

          {/* Asset list */}
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {TRADABLE_ASSETS.map((asset, idx) => (
              <AssetRow
                key={asset.id}
                asset={asset}
                index={idx}
                onSelect={onSelectAsset}
              />
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const CONFETTI_COLORS = ['#FFD700', '#FF6B6B', '#4ade80', '#60a5fa', '#a78bfa', '#fbbf24', '#f472b6'];
const CONFETTI_COUNT = 30;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  size: number;
  rotation: number;
}

function ConfettiBurst({ visible }: { visible: boolean }) {
  const pieces = useMemo<ConfettiPiece[]>(() =>
    Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * SCREEN_WIDTH,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 6 + Math.random() * 8,
      rotation: Math.random() * 360,
    })),
  []);

  if (!visible) return null;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}>
      {pieces.map((piece) => (
        <ConfettiPieceView key={piece.id} piece={piece} />
      ))}
    </View>
  );
}

function ConfettiPieceView({ piece }: { piece: ConfettiPiece }) {
  const translateY = useSharedValue(-20);
  const opacity = useSharedValue(1);
  const rotate = useSharedValue(0);

  useEffect(() => {
    const duration = 1800 + Math.random() * 1200;
    const delay = Math.random() * 400;
    translateY.value = withDelay(delay, withTiming(SCREEN_HEIGHT + 20, { duration, easing: Easing.out(Easing.quad) }));
    rotate.value = withDelay(delay, withTiming(piece.rotation + 720, { duration }));
    opacity.value = withDelay(delay + duration * 0.6, withTiming(0, { duration: duration * 0.4 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: -10,
          left: piece.x,
          width: piece.size,
          height: piece.size * 1.4,
          backgroundColor: piece.color,
          borderRadius: 2,
        },
        animatedStyle,
      ]}
    />
  );
}

interface LeagueReward {
  xp: number;
  coins: number;
  gems: number;
}

const TIER_REWARDS: Record<number, LeagueReward> = {
  1: { xp: 300, coins: 500, gems: 5 },
  2: { xp: 200, coins: 300, gems: 3 },
  3: { xp: 100, coins: 150, gems: 1 },
};
const DEFAULT_REWARD: LeagueReward = { xp: 50, coins: 100, gems: 0 };

function getRewardForRank(rank: number): LeagueReward {
  return TIER_REWARDS[rank] ?? DEFAULT_REWARD;
}

function LeagueResultsOverlay({
  visible,
  rank,
  reward,
  onClose,
}: {
  visible: boolean;
  rank: number;
  reward: LeagueReward;
  onClose: () => void;
}) {
  if (!visible) return null;

  const medals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
  const medal = medals[rank] ?? '🏅';
  const isTopThree = rank <= 3;

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose} accessibilityViewIsModal>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' }}>
        <Animated.View
          entering={FadeInDown.springify()}
          style={{
            backgroundColor: '#0d2847',
            borderRadius: 24,
            borderWidth: 2,
            borderColor: isTopThree ? CLASH.goldBorder : 'rgba(42, 90, 140, 0.5)',
            padding: 28,
            marginHorizontal: 24,
            alignItems: 'center',
            width: '85%',
            ...(isTopThree
              ? {
                  shadowColor: CLASH.goldLight,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.5,
                  shadowRadius: 20,
                  elevation: 10,
                }
              : {}),
          }}
        >
          {/* Medal + Title */}
          <Text style={{ fontSize: 56, marginBottom: 8 }}>{medal}</Text>
          <Text style={{ fontSize: 24, fontWeight: '900', color: isTopThree ? CLASH.goldLight : '#e2e8f0', ...TEXT_SHADOW, marginBottom: 4 }}>
            הליגה הסתיימה!
          </Text>
          <Text style={[{ fontSize: 18, fontWeight: '700', color: '#64748b', marginBottom: 20 }, RTL]}>
            סיימת במקום {rank}
          </Text>

          {/* Rewards Card */}
          <View
            style={{
              backgroundColor: 'rgba(42, 90, 140, 0.2)',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: 'rgba(42, 90, 140, 0.4)',
              padding: 16,
              width: '100%',
              marginBottom: 24,
            }}
          >
            <Text style={[{ fontSize: 15, fontWeight: '800', color: CLASH.goldLight, marginBottom: 12, ...TEXT_SHADOW }, RTL]}>
              פרסים:
            </Text>
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#4ade80' }}>+{reward.xp} XP</Text>
                <Text style={[{ fontSize: 14, color: '#64748b' }, RTL]}>ניסיון</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#fbbf24' }}>+{reward.coins} Coins</Text>
                <Text style={[{ fontSize: 14, color: '#64748b' }, RTL]}>מטבעות</Text>
              </View>
              {reward.gems > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#a78bfa' }}>+{reward.gems} Gems</Text>
                  <Text style={[{ fontSize: 14, color: '#64748b' }, RTL]}>יהלומים</Text>
                </View>
              )}
            </View>
          </View>

          {/* Close Button */}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#b8860b' : CLASH.goldBorder,
              borderRadius: 14,
              paddingVertical: 14,
              paddingHorizontal: 40,
              shadowColor: CLASH.goldLight,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.4,
              shadowRadius: 10,
              elevation: 6,
            })}
          >
            <Text style={{ fontSize: 17, fontWeight: '900', color: '#0d2847' }}>
              אחלה!
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

function SellResultToast({ result, onDone }: { result: SellResult; onDone: () => void }) {
  const isProfitable = result.pnl >= 0;
  const color = isProfitable ? '#4ade80' : CLASH.redBadge;

  useEffect(() => {
    const timer = setTimeout(onDone, 2500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <Animated.View
      entering={FadeInDown.springify()}
      style={{
        position: 'absolute',
        bottom: 100,
        left: 20,
        right: 20,
        zIndex: 90,
        backgroundColor: CLASH.cardBg,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: color,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 8,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={[{ fontSize: 15, fontWeight: '800', color: '#e2e8f0', ...TEXT_SHADOW }, RTL]}>
          {result.assetName} נמכר
        </Text>
        <Text style={[{ fontSize: 13, fontWeight: '600', color: '#64748b', marginTop: 2 }, RTL]}>
          {isProfitable ? '+30 XP, +50 Coins' : 'ללא רווח'}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 20, fontWeight: '900', color, ...TEXT_SHADOW }}>
          {isProfitable ? '+' : ''}{result.pnl.toFixed(0)} FC
        </Text>
        <Text style={{ fontSize: 13, fontWeight: '700', color }}>
          {isProfitable ? '+' : ''}{result.pnlPercent.toFixed(2)}%
        </Text>
      </View>
    </Animated.View>
  );
}
function EntryGateOverlay({
  visible,
  onEnter,
  onCancel,
}: {
  visible: boolean;
  onEnter: () => void;
  onCancel: () => void;
}) {
  const gems = useEconomyStore((s) => s.gems);
  const coins = useEconomyStore((s) => s.coins);
  const spendGems = useEconomyStore((s) => s.spendGems);
  const spendCoins = useEconomyStore((s) => s.spendCoins);
  const [method, setMethod] = useState<'gems' | 'coins'>('gems');
  
  if (!visible) return null;

  const canAfford = method === 'gems' ? gems >= 5 : coins >= 500;

  const handlePay = () => {
    if (method === 'gems' && gems >= 5) {
      spendGems(5);
      onEnter();
    } else if (method === 'coins' && coins >= 500) {
      spendCoins(500);
      onEnter();
    }
  };

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onCancel} accessibilityViewIsModal>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' }}>
        <Animated.View
          entering={FadeInDown.springify()}
          style={{
            backgroundColor: '#0d2847',
            borderRadius: 24,
            borderWidth: 2,
            borderColor: CLASH.goldBorder,
            padding: 24,
            marginHorizontal: 20,
            alignItems: 'center',
            width: '85%',
            shadowColor: CLASH.goldLight,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          <Text style={{ fontSize: 56, marginBottom: 8 }}>🐳</Text>
          <Text style={{ fontSize: 24, fontWeight: '900', color: CLASH.goldLight, ...TEXT_SHADOW, marginBottom: 8, textAlign: 'center' }}>
            ליגת הלווייתנים
          </Text>
          <Text style={[{ fontSize: 16, fontWeight: '600', color: '#64748b', marginBottom: 20, textAlign: 'center' }, RTL]}>
            השתתף בליגת המסחר השבועית.
            בנה תיק, התחרה מול אחרים, וזכה בפרסי ענק!
          </Text>

          {/* Payment Method Selector */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24, width: '100%' }}>
            <Pressable
              onPress={() => setMethod('gems')}
              style={{
                flex: 1,
                borderWidth: 2,
                borderColor: method === 'gems' ? '#a78bfa' : 'rgba(167, 139, 250, 0.3)',
                backgroundColor: method === 'gems' ? 'rgba(167, 139, 250, 0.15)' : 'transparent',
                borderRadius: 16,
                padding: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 24, marginBottom: 4 }}>💎</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#e2e8f0' }}>5</Text>
            </Pressable>
            <Pressable
              onPress={() => setMethod('coins')}
              style={{
                flex: 1,
                borderWidth: 2,
                borderColor: method === 'coins' ? '#fbbf24' : 'rgba(251, 191, 36, 0.3)',
                backgroundColor: method === 'coins' ? 'rgba(251, 191, 36, 0.15)' : 'transparent',
                borderRadius: 16,
                padding: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 24, marginBottom: 4 }}></Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#e2e8f0' }}>500</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={handlePay}
            disabled={!canAfford}
            style={({ pressed }) => ({
              backgroundColor: !canAfford ? 'rgba(148, 163, 184, 0.3)' : pressed ? '#b8860b' : CLASH.goldBorder,
              borderRadius: 14,
              paddingVertical: 14,
              width: '100%',
              alignItems: 'center',
              marginBottom: 12,
            })}
          >
            <Text style={{ fontSize: 17, fontWeight: '900', color: !canAfford ? '#64748b' : '#0d2847' }}>
              {canAfford ? 'היכנס לליגה' : 'אין מספיק מטבעות'}
            </Text>
          </Pressable>
          
          <Pressable onPress={onCancel} style={{ padding: 8 }}>
            <Text style={{ color: '#64748b', fontSize: 15, fontWeight: '600' }}>חזור אחורה</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

export function FantasyLeagueScreen() {
  const { currentLeague, portfolio, initPortfolio, getLeaderboard, refreshPrices, computePortfolioValue, sellAsset, buyAsset } =
    useFantasyStore();
  const countdown = useCountdown(currentLeague?.endDate);
  const [activeTab, setActiveTab] = useState<TabId>('leaderboard');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<TradableAsset | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [sellResult, setSellResult] = useState<SellResult | null>(null);
  const [showResultsOverlay, setShowResultsOverlay] = useState(false);
  const [leagueReward, setLeagueReward] = useState<LeagueReward>(DEFAULT_REWARD);
  const addXP = useEconomyStore((s) => s.addXP);
  const addCoins = useEconomyStore((s) => s.addCoins);
  const addGems = useEconomyStore((s) => s.addGems);
  const [showEntryGate, setShowEntryGate] = useState(false);

  // Finn arena splash on enter — static 1.5s or tap to dismiss
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!portfolio) {
      setShowEntryGate(true);
    }
  }, [portfolio]);

  // Auto-refresh prices every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      refreshPrices();
    }, 30_000);
    return () => clearInterval(interval);
  }, [refreshPrices]);

  const leaderboard = getLeaderboard();

  // Confetti burst on top-3 finish when league ends
  const leagueEnded = countdown === 'הליגה הסתיימה';
  const localPlayerRank = leaderboard.find((e) => e.playerId === 'local')?.rank ?? 99;
  const confettiTriggeredRef = useRef(false);

  const rewardsClaimedRef = useRef(false);

  useEffect(() => {
    if (leagueEnded && localPlayerRank <= 3 && !confettiTriggeredRef.current) {
      confettiTriggeredRef.current = true;
      setShowConfetti(true);
    }
  }, [leagueEnded, localPlayerRank]);

  // League end detection: show results overlay + distribute rewards once
  useEffect(() => {
    if (leagueEnded && !rewardsClaimedRef.current) {
      rewardsClaimedRef.current = true;
      const reward = getRewardForRank(localPlayerRank);
      setLeagueReward(reward);
      addXP(reward.xp, 'sim_complete');
      addCoins(reward.coins);
      if (reward.gems > 0) {
        addGems(reward.gems);
      }
      successHaptic();
      setShowResultsOverlay(true);
    }
  }, [leagueEnded, localPlayerRank, addXP, addCoins, addGems]);

  return (
    <View style={{ flex: 1, backgroundColor: DUO.surface }}>
      {showSplash && (
        <Pressable onPress={() => setShowSplash(false)} style={{ ...StyleSheet.absoluteFillObject, zIndex: 100, backgroundColor: '#0c1929', justifyContent: 'center', alignItems: 'center' }}>
          <Image source={{ uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/images/finn/finn-arena.png' }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        </Pressable>
      )}
      <ConfettiBurst visible={showConfetti} />
      {sellResult && (
        <SellResultToast result={sellResult} onDone={() => setSellResult(null)} />
      )}
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={{ flex: 1, paddingHorizontal: 20 }}>
          {/* Header */}
          <View style={{ alignItems: 'center', paddingTop: 16, paddingBottom: 12 }}>
            <Text
              style={{
                fontSize: 28,
                fontWeight: '900',
                color: '#1f2937',
              }}
            >
              🏆 {currentLeague?.name ?? 'ליגת השבוע'}
            </Text>
            <View
              style={{
                marginTop: 8,
                backgroundColor: CLASH.cardBg,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: CLASH.goldBorder,
                paddingHorizontal: 16,
                paddingVertical: 6,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: countdown === 'הליגה הסתיימה' ? CLASH.redBadge : '#e2e8f0',
                  letterSpacing: 2,
                  ...TEXT_SHADOW,
                }}
              >
                ⏱ {countdown}
              </Text>
            </View>
          </View>

          {/* Tab Switcher */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: CLASH.cardBg,
              borderRadius: 12,
              padding: 4,
              marginBottom: 12,
            }}
          >
            {FANTASY_TABS.map((tab) => (
              <Pressable
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  alignItems: 'center',
                  backgroundColor:
                    activeTab === tab.id ? CLASH.goldBorder : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '700',
                    color: activeTab === tab.id ? '#0d2847' : '#64748b',
                  }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Tab Content */}
          {activeTab === 'draft' ? (
            <DraftScreen />
          ) : activeTab === 'leaderboard' ? (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            >
              {leaderboard.map((entry, idx) => (
                <LeaderboardRow key={entry.playerId} entry={entry} index={idx} />
              ))}
            </ScrollView>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Portfolio Summary Card */}
              {(() => {
                const totalValue = computePortfolioValue();
                const startingBudget = portfolio?.startingBudget ?? 10_000;
                const pnlPercent = startingBudget > 0
                  ? ((totalValue - startingBudget) / startingBudget) * 100
                  : 0;
                const pnlColor = pnlPercent >= 0 ? '#4ade80' : CLASH.redBadge;

                return (
                  <View
                    style={{
                      backgroundColor: CLASH.cardBg,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: CLASH.goldBorder,
                      padding: 16,
                      marginBottom: 12,
                    }}
                  >
                    {/* Total Value Row */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <Text style={[{ fontSize: 14, fontWeight: '600', color: '#64748b' }, RTL]}>
                        שווי כולל
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                        <Text style={{ fontSize: 24, fontWeight: '900', color: CLASH.goldLight, ...TEXT_SHADOW }}>
                          {totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} FC
                        </Text>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: pnlColor }}>
                          {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                        </Text>
                      </View>
                    </View>

                    {/* Cash Remaining Row */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[{ fontSize: 14, fontWeight: '600', color: '#64748b' }, RTL]}>
                        מזומן פנוי
                      </Text>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#e2e8f0', ...TEXT_SHADOW }}>
                        {portfolio?.cashRemaining.toLocaleString(undefined, { maximumFractionDigits: 0 }) ?? '0'} FC
                      </Text>
                    </View>
                  </View>
                );
              })()}

              {/* Positions List */}
              {portfolio && portfolio.positions.length > 0 ? (
                <>
                  <Text style={[{ fontSize: 16, fontWeight: '700', color: '#e2e8f0', marginBottom: 8, ...TEXT_SHADOW }, RTL]}>
                    פוזיציות ({portfolio.positions.length})
                  </Text>
                  {portfolio.positions.map((pos, idx) => (
                    <PositionRow
                      key={pos.id}
                      position={pos}
                      index={idx}
                      onSell={(positionId, currentPrice) => {
                        const pos = portfolio.positions.find((p) => p.id === positionId);
                        if (!pos) return;
                        const pnl = (currentPrice - pos.buyPrice) * pos.quantity;
                        const pnlPct = ((currentPrice - pos.buyPrice) / pos.buyPrice) * 100;
                        sellAsset(positionId, currentPrice);
                        setSellResult({ assetName: pos.assetName, pnl, pnlPercent: pnlPct });
                        if (pnl > 0) {
                          addXP(30, 'sim_complete');
                          addCoins(50);
                          successHaptic();
                        }
                      }}
                    />
                  ))}
                </>
              ) : (
                <View style={{ alignItems: 'center', paddingTop: 40 }}>
                  <Text style={{ fontSize: 48, marginBottom: 12 }}>📊</Text>
                  <Text style={[{ fontSize: 16, fontWeight: '600', color: '#64748b' }, RTL]}>
                    אין פוזיציות פתוחות
                  </Text>
                  <Text style={[{ fontSize: 14, color: 'rgba(148, 163, 184, 0.6)', marginTop: 4 }, RTL]}>
                    קנה נכסים כדי להתחיל לסחור!
                  </Text>
                </View>
              )}

              {/* Buy Assets Button */}
              <Pressable
                onPress={() => setPickerVisible(true)}
                style={({ pressed }) => ({
                  marginTop: 16,
                  backgroundColor: pressed ? '#b8860b' : CLASH.goldBorder,
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: 'center',
                  shadowColor: CLASH.goldLight,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.4,
                  shadowRadius: 10,
                  elevation: 6,
                })}
              >
                <Text style={{ fontSize: 17, fontWeight: '900', color: '#0d2847' }}>
                  + קנה נכסים
                </Text>
              </Pressable>
            </ScrollView>
          )}

          {/* Asset Picker Bottom Sheet */}
          <AssetPickerSheet
            visible={pickerVisible}
            onClose={() => setPickerVisible(false)}
            onSelectAsset={(asset) => {
              setSelectedAsset(asset);
              setPickerVisible(false);
            }}
          />

          {/* League Results Overlay */}
          <LeagueResultsOverlay
            visible={showResultsOverlay}
            rank={localPlayerRank}
            reward={leagueReward}
            onClose={() => setShowResultsOverlay(false)}
          />

          {/* Buy Confirmation Sheet */}
          <BuyConfirmSheet
            asset={selectedAsset}
            cashRemaining={portfolio?.cashRemaining ?? 0}
            onClose={() => setSelectedAsset(null)}
            onConfirm={(assetId, assetName, quantity, price) => {
              buyAsset(assetId, assetName, quantity, price);
              successHaptic();
              setSelectedAsset(null);
            }}
          />

          {/* Entry Gate Sheet */}
          <EntryGateOverlay
            visible={showEntryGate}
            onEnter={() => {
              setShowEntryGate(false);
              initPortfolio(CURRENT_LEAGUE);
              successHaptic();
            }}
            onCancel={() => {
              // Usually we'd go back in navigation, but closing the modal is fine
              setShowEntryGate(false);
            }}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}
