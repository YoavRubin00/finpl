/**
 * TradingPanel — order entry with 3 order types:
 *   מרקט (Market): immediate execution at current price
 *   לימיט (Limit): pending order executed when price reaches target
 *   מכירה (Sell): close an open position
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { CLASH, TEXT_SHADOW } from '../../constants/theme';
import { useEconomyStore } from '../economy/useEconomyStore';
import { useTradingStore } from './useTradingStore';
import { tapHaptic } from '../../utils/haptics';
import { ActivePosition } from './tradingHubTypes';

type OrderTab = 'market' | 'limit' | 'sell';

interface OrderTabConfig {
  id: OrderTab;
  label: string;
  description: string;
  color: string;
}

const ORDER_TABS: OrderTabConfig[] = [
  {
    id: 'market',
    label: 'מרקט',
    description: 'קנה מיד במחיר השוק הנוכחי — ביצוע מיידי וודאי',
    color: '#22c55e',
  },
  {
    id: 'limit',
    label: 'לימיט',
    description: 'הגדר מחיר יעד — הפקודה תתבצע רק כשהשוק יגיע לרמה שהגדרת',
    color: '#facc15',
  },
  {
    id: 'sell',
    label: 'מכירה',
    description: 'סגור פוזיציה פתוחה ומממש את הרווח או ההפסד שלך',
    color: '#f87171',
  },
];

interface TradingPanelProps {
  assetId: string;
  currentPrice: number;
  onTrade: (type: 'buy' | 'sell', amount: number, entryPrice: number) => void;
}

export function TradingPanel({ assetId, currentPrice, onTrade }: TradingPanelProps) {
  const [activeTab, setActiveTab] = useState<OrderTab>('market');
  const [amountText, setAmountText] = useState('');
  const [limitPriceText, setLimitPriceText] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const coins = useEconomyStore((s) => s.coins);
  const spendCoins = useEconomyStore((s) => s.spendCoins);
  const addCoins = useEconomyStore((s) => s.addCoins);
  const positions = useTradingStore((s) => s.positions);
  const pendingOrders = useTradingStore((s) => s.pendingOrders);
  const closePosition = useTradingStore((s) => s.closePosition);
  const cancelLimitOrder = useTradingStore((s) => s.cancelLimitOrder);

  const amount = Math.floor(Number(amountText) || 0);
  const limitPrice = parseFloat(limitPriceText) || 0;
  const isAmountValid = amount > 0 && amount <= coins;
  const isLimitValid = isAmountValid && limitPrice > 0;

  const tabConfig = ORDER_TABS.find((t) => t.id === activeTab)!;
  const assetPositions = positions.filter((p) => p.assetId === assetId);
  const assetPendingOrders = pendingOrders.filter((o) => o.assetId === assetId);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const handleMarketBuy = () => {
    if (!isAmountValid || currentPrice <= 0) return;
    tapHaptic();
    const success = spendCoins(amount);
    if (success) {
      onTrade('buy', amount, currentPrice);
      setAmountText('');
      showFeedback(`✅ קנית ${assetId} במחיר $${currentPrice.toFixed(2)}`);
    }
  };

  const handleLimitBuy = () => {
    if (!isLimitValid || currentPrice <= 0) return;
    tapHaptic();
    // Always execute immediately regardless of limit price
    const success = spendCoins(amount);
    if (success) {
      onTrade('buy', amount, currentPrice);
      setAmountText('');
      setLimitPriceText('');
      showFeedback(`✅ קנית ${assetId} במחיר $${currentPrice.toFixed(2)}`);
    }
  };

  const handleClosePosition = (pos: ActivePosition) => {
    tapHaptic();
    const closed = closePosition(pos.id);
    if (!closed) return;
    const pnlFactor = 1 + closed.pnlPercent / 100;
    const returned = Math.max(0, Math.round(closed.amountInvested * pnlFactor));
    if (returned > 0) addCoins(returned);
    const pnlSign = closed.pnlPercent >= 0 ? '+' : '';
    showFeedback(
      closed.pnlPercent >= 0
        ? `🎉 מכרת ברווח! ${pnlSign}${closed.pnlPercent.toFixed(2)}% • קיבלת ${returned.toLocaleString()} `
        : `📉 מכרת בהפסד ${pnlSign}${closed.pnlPercent.toFixed(2)}% • קיבלת ${returned.toLocaleString()} `,
    );
  };

  const handleCancelLimit = (orderId: string) => {
    tapHaptic();
    const refunded = cancelLimitOrder(orderId);
    if (refunded > 0) addCoins(refunded);
    showFeedback(`↩️ פקודה בוטלה — הוחזרו ${refunded.toLocaleString()} `);
  };

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.container}>
      {/* Order type tabs */}
      <View style={styles.tabRow}>
        {ORDER_TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <Pressable
              key={tab.id}
              onPress={() => { tapHaptic(); setActiveTab(tab.id); setFeedback(null); }}
              style={[
                styles.tab,
                isActive && { borderBottomColor: tab.color, borderBottomWidth: 2 },
              ]}
            >
              <Text style={[styles.tabLabel, isActive && { color: tab.color }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Description */}
      <View style={[styles.descBox, { borderColor: tabConfig.color + '30' }]}>
        <Text style={[styles.descText, { color: tabConfig.color + 'cc' }]}>
          {tabConfig.description}
        </Text>
      </View>

      {/* Feedback bar */}
      {feedback && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.feedbackBar}>
          <Text style={styles.feedbackText}>{feedback}</Text>
        </Animated.View>
      )}

      {/* ── MARKET tab ── */}
      {activeTab === 'market' && (
        <View style={styles.formSection}>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>💰 יתרה:</Text>
            <Text style={styles.balanceValue}>{coins.toLocaleString()} מטבעות</Text>
          </View>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="כמה מטבעות להשקיע?"
              placeholderTextColor="#64748b"
              keyboardType="number-pad"
              value={amountText}
              onChangeText={setAmountText}
              maxLength={8}
            accessibilityLabel="כמה מטבעות להשקיע?" />
            <Pressable style={styles.maxBtn} onPress={() => { tapHaptic(); setAmountText(String(coins)); }}>
              <Text style={styles.maxText}>MAX</Text>
            </Pressable>
          </View>
          {amountText.length > 0 && !isAmountValid && (
            <Text style={styles.errorText}>{amount <= 0 ? 'הזן מספר חיובי' : 'אין מספיק מטבעות'}</Text>
          )}
          <View style={styles.pricePreview}>
            <Text style={styles.pricePreviewLabel}>מחיר שוק נוכחי</Text>
            <Text style={styles.pricePreviewValue}>${currentPrice > 0 ? currentPrice.toFixed(2) : '—'}</Text>
          </View>
          <Pressable style={styles.ctaWrapper} onPress={handleMarketBuy} disabled={!isAmountValid}>
            <LinearGradient
              colors={isAmountValid ? ['#0891b2', '#0369a1'] : ['#334155', '#1e293b']}
              style={styles.ctaBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            >
              <Text style={styles.ctaText}>⚡ קנה מרקט</Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}

      {/* ── LIMIT tab ── */}
      {activeTab === 'limit' && (
        <View style={styles.formSection}>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>💰 יתרה:</Text>
            <Text style={styles.balanceValue}>{coins.toLocaleString()} מטבעות</Text>
          </View>
          {/* Limit price input */}
          <Text style={styles.fieldLabel}>מחיר לימיט יעד ($)</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder={`מחיר נוכחי: $${currentPrice > 0 ? currentPrice.toFixed(2) : '—'}`}
              placeholderTextColor="#64748b"
              keyboardType="decimal-pad"
              value={limitPriceText}
              onChangeText={setLimitPriceText}
              maxLength={12}
            />
          </View>
          <Text style={styles.fieldLabel}>סכום להשקעה (מטבעות)</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="כמה מטבעות?"
              placeholderTextColor="#64748b"
              keyboardType="number-pad"
              value={amountText}
              onChangeText={setAmountText}
              maxLength={8}
            accessibilityLabel="כמה מטבעות?" />
            <Pressable style={styles.maxBtn} onPress={() => { tapHaptic(); setAmountText(String(coins)); }}>
              <Text style={styles.maxText}>MAX</Text>
            </Pressable>
          </View>
          {amountText.length > 0 && !isAmountValid && (
            <Text style={styles.errorText}>{amount <= 0 ? 'הזן מספר חיובי' : 'אין מספיק מטבעות'}</Text>
          )}
          <Pressable style={styles.ctaWrapper} onPress={handleLimitBuy} disabled={!isLimitValid}>
            <LinearGradient
              colors={isLimitValid ? ['#0891b2', '#06b6d4'] : ['#334155', '#1e293b']}
              style={styles.ctaBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            >
              <Text style={[styles.ctaText, { color: isLimitValid ? '#fff' : '#64748b' }]}>
                📌 הצב פקודת לימיט
              </Text>
            </LinearGradient>
          </Pressable>

          {/* Active limit orders for this asset */}
          {assetPendingOrders.length > 0 && (
            <View style={styles.pendingSection}>
              <Text style={styles.pendingTitle}>⏳ פקודות לימיט פעילות</Text>
              {assetPendingOrders.map((order) => (
                <View key={order.id} style={styles.pendingRow}>
                  <Pressable onPress={() => handleCancelLimit(order.id)} style={styles.cancelBtn}>
                    <Text style={styles.cancelText}>ביטול</Text>
                  </Pressable>
                  <View style={styles.pendingInfo}>
                    <Text style={styles.pendingPrice}>יעד: ${order.limitPrice.toFixed(2)}</Text>
                    <Text style={styles.pendingAmount}>💰 {order.amountInvested.toLocaleString()}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* ── SELL tab ── */}
      {activeTab === 'sell' && (
        <View style={styles.formSection}>
          {assetPositions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyText}>אין פוזיציות פתוחות עבור {assetId}</Text>
              <Text style={styles.emptyHint}>קנה קודם עם פקודת מרקט או לימיט</Text>
            </View>
          ) : (
            assetPositions.map((pos) => {
              const isPosProfit = pos.pnlPercent >= 0;
              const pnlColor = isPosProfit ? '#22c55e' : '#ef4444';
              const pnlSign = isPosProfit ? '+' : '';
              return (
                <View key={pos.id} style={styles.posCard}>
                  <View style={styles.posTopRow}>
                    <Text style={[styles.posPnl, { color: pnlColor }]}>
                      {pnlSign}{pos.pnlPercent.toFixed(2)}%
                    </Text>
                    <View style={styles.posInfo}>
                      <Text style={styles.posType}>{pos.type === 'buy' ? 'לונג ↑' : 'שורט ↓'}</Text>
                      <Text style={styles.posAsset}>{assetId}</Text>
                    </View>
                  </View>
                  <View style={styles.posPriceRow}>
                    <Text style={styles.posPriceLabel}>כניסה: <Text style={styles.posPriceVal}>${pos.entryPrice.toFixed(2)}</Text></Text>
                    <Text style={styles.posPriceLabel}>נוכחי: <Text style={[styles.posPriceVal, { color: pnlColor }]}>${pos.currentPrice.toFixed(2)}</Text></Text>
                    <Text style={styles.posPriceLabel}>💰 {pos.amountInvested.toLocaleString()}</Text>
                  </View>
                  <Pressable onPress={() => handleClosePosition(pos)} style={styles.ctaWrapper}>
                    <LinearGradient
                      colors={['#ef4444', '#dc2626']}
                      style={styles.ctaBtn}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                    >
                      <Text style={styles.ctaText}>💸 סגור פוזיציה</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              );
            })
          )}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    backgroundColor: CLASH.cardBg,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: CLASH.goldBorder + '20',
    overflow: 'hidden',
  },
  // Tabs
  tabRow: {
    flexDirection: 'row-reverse',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748b',
    writingDirection: 'rtl',
  },
  // Description
  descBox: {
    marginHorizontal: 16,
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  descText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 18,
  },
  // Feedback
  feedbackBar: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#e2e8f0',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  // Form
  formSection: {
    padding: 16,
    paddingBottom: 24,
    gap: 10,
  },
  balanceRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    writingDirection: 'rtl',
  },
  balanceValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#facc15',
    fontVariant: ['tabular-nums'],
    writingDirection: 'rtl',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: -4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 46,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'right',
    writingDirection: 'rtl',
    fontVariant: ['tabular-nums'],
  },
  maxBtn: {
    height: 46,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 160, 23, 0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CLASH.goldBorder,
  },
  maxText: {
    fontSize: 12,
    fontWeight: '900',
    color: CLASH.goldLight,
  },
  errorText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ef4444',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  pricePreview: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pricePreviewLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    writingDirection: 'rtl',
  },
  pricePreviewValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
  },
  ctaWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 4,
  },
  ctaBtn: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
    writingDirection: 'rtl',
    ...TEXT_SHADOW,
  },
  // Pending orders
  pendingSection: {
    marginTop: 6,
    gap: 6,
  },
  pendingTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94a3b8',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  pendingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(250,204,21,0.06)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
  },
  pendingInfo: {
    flex: 1,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  pendingPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: '#facc15',
    fontVariant: ['tabular-nums'],
  },
  pendingAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  cancelBtn: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cancelText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#f87171',
    writingDirection: 'rtl',
  },
  // Sell tab positions
  posCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 12,
    gap: 8,
  },
  posTopRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  posInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  posType: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    writingDirection: 'rtl',
  },
  posAsset: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff',
  },
  posPnl: {
    fontSize: 18,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  posPriceRow: {
    flexDirection: 'row-reverse',
    gap: 12,
    flexWrap: 'wrap',
  },
  posPriceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    writingDirection: 'rtl',
  },
  posPriceVal: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 40,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94a3b8',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  emptyHint: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
