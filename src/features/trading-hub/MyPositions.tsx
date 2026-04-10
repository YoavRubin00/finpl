/**
 * MyPositions — Shows all open positions with live P&L.
 * Includes "Close Position" button that liquidates trades and shows result overlay.
 */
import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { CLASH, TEXT_SHADOW } from '../../constants/theme';
import { useTradingStore } from './useTradingStore';
import { useEconomyStore } from '../economy/useEconomyStore';
import { ASSET_BY_ID } from './tradingHubData';
import { ActivePosition } from './tradingHubTypes';
import { tapHaptic } from '../../utils/haptics';
import { StockIcon } from './StockIcon';

interface CloseResult {
  assetId: string;
  type: 'buy' | 'sell';
  invested: number;
  returned: number;
  pnlPercent: number;
}

export function MyPositions() {
  const positions = useTradingStore((s) => s.positions);
  const closePosition = useTradingStore((s) => s.closePosition);
  const addCoins = useEconomyStore((s) => s.addCoins);

  const [closeResult, setCloseResult] = useState<CloseResult | null>(null);

  const handleClose = useCallback(
    (pos: ActivePosition) => {
      tapHaptic();
      const closed = closePosition(pos.id);
      if (!closed) return;

      const pnlFactor = 1 + closed.pnlPercent / 100;
      const returnedCoins = Math.max(0, Math.round(closed.amountInvested * pnlFactor));

      if (returnedCoins > 0) {
        addCoins(returnedCoins);
      }

      setCloseResult({
        assetId: closed.assetId,
        type: closed.type,
        invested: closed.amountInvested,
        returned: returnedCoins,
        pnlPercent: closed.pnlPercent,
      });
    },
    [closePosition, addCoins],
  );

  if (positions.length === 0 && !closeResult) return null;

  const isProfit = closeResult ? closeResult.pnlPercent >= 0 : false;

  return (
    <>
      {positions.length > 0 && (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.container}>
          <Text style={styles.sectionTitle}>📊 הפוזיציות שלי</Text>

          {positions.map((pos) => {
            const asset = ASSET_BY_ID.get(pos.assetId);
            const isPosProfit = pos.pnlPercent >= 0;
            const pnlColor = isPosProfit ? '#22c55e' : '#ef4444';
            const pnlSign = isPosProfit ? '+' : '';
            const typeLabel = pos.type === 'buy' ? 'לונג ↑' : 'שורט ↓';
            const typeBg = pos.type === 'buy'
              ? 'rgba(34, 197, 94, 0.15)'
              : 'rgba(239, 68, 68, 0.15)';
            const typeColor = pos.type === 'buy' ? '#4ade80' : '#f87171';

            return (
              <View key={pos.id} style={styles.positionCard}>
                {/* Top row: asset info + type badge */}
                <View style={styles.topRow}>
                  <View style={[styles.typeBadge, { backgroundColor: typeBg }]}>
                    <Text style={[styles.typeText, { color: typeColor }]}>{typeLabel}</Text>
                  </View>
                  <View style={styles.assetInfo}>
                    <StockIcon assetId={pos.assetId} size={24} />
                    <Text style={styles.assetName}>{pos.assetId}</Text>
                  </View>
                </View>

                {/* Price row */}
                <View style={styles.priceRow}>
                  <View style={styles.priceCol}>
                    <Text style={styles.priceLabel}>מחיר כניסה</Text>
                    <Text style={styles.priceValue}>${pos.entryPrice.toFixed(2)}</Text>
                  </View>
                  <View style={styles.priceDivider} />
                  <View style={styles.priceCol}>
                    <Text style={styles.priceLabel}>מחיר נוכחי</Text>
                    <Text style={[styles.priceValue, { color: pnlColor }]}>
                      ${pos.currentPrice.toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Bottom row: invested + P&L + close button */}
                <View style={styles.bottomRow}>
                  <View style={[styles.pnlBadge, { backgroundColor: pnlColor + '20' }]}>
                    <Text style={[styles.pnlText, { color: pnlColor }]}>
                      {pnlSign}{pos.pnlPercent.toFixed(2)}%
                    </Text>
                  </View>
                  <Text style={styles.investedText}>
                    💰 {pos.amountInvested.toLocaleString()} מטבעות
                  </Text>
                </View>

                {/* Close Position Button */}
                <Pressable
                  onPress={() => handleClose(pos)}
                  style={({ pressed }) => [
                    styles.closeBtn,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <LinearGradient
                    colors={['#6b21a8', '#7c3aed']}
                    style={styles.closeBtnGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.closeBtnText}>סגור פוזיציה</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            );
          })}
        </Animated.View>
      )}

      {/* Close Result Overlay */}
      <Modal
        visible={closeResult !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setCloseResult(null)}
      >
        <Pressable style={styles.overlay} onPress={() => setCloseResult(null)}>
          <Pressable style={styles.resultSheet} onPress={() => {}}>
            <LinearGradient
              colors={[CLASH.bgSecondary, CLASH.bgPrimary]}
              style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
            />
            <Animated.View entering={FadeIn.duration(400)} style={styles.resultContent}>
              {/* Emoji */}
              <Text style={styles.resultEmoji}>
                {isProfit ? '🎉' : '📉'}
              </Text>

              {/* Title */}
              <Text style={styles.resultTitle}>
                {isProfit ? 'רווח!' : 'הפסד'}
              </Text>

              {/* Asset info */}
              {closeResult && (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                    <StockIcon assetId={closeResult.assetId} size={28} />
                    <Text style={styles.resultAsset}>
                      {closeResult.assetId} ({closeResult.type === 'buy' ? 'לונג' : 'שורט'})
                    </Text>
                  </View>

                  {/* P&L Badge */}
                  <View
                    style={[
                      styles.resultPnlBadge,
                      {
                        backgroundColor: isProfit
                          ? 'rgba(34, 197, 94, 0.15)'
                          : 'rgba(239, 68, 68, 0.15)',
                        borderColor: isProfit ? '#22c55e40' : '#ef444440',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.resultPnlText,
                        { color: isProfit ? '#22c55e' : '#ef4444' },
                      ]}
                    >
                      {isProfit ? '+' : ''}{closeResult.pnlPercent.toFixed(2)}%
                    </Text>
                  </View>

                  {/* Coins summary */}
                  <View style={styles.coinsSummary}>
                    <View style={styles.coinsRow}>
                      <Text style={styles.coinsLabel}>השקעה</Text>
                      <Text style={styles.coinsValue}>
                        💰 {closeResult.invested.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.coinsDivider} />
                    <View style={styles.coinsRow}>
                      <Text style={styles.coinsLabel}>קיבלת בחזרה</Text>
                      <Text
                        style={[
                          styles.coinsValue,
                          { color: isProfit ? '#22c55e' : '#ef4444' },
                        ]}
                      >
                        💰 {closeResult.returned.toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  {/* Motivational message */}
                  <Text style={styles.resultMessage}>
                    {isProfit
                      ? 'כל הכבוד! קראת את השוק נכון 💪'
                      : 'לא נורא, זו הזדמנות ללמוד! 📚'}
                  </Text>
                </>
              )}

              {/* Dismiss button */}
              <Pressable
                onPress={() => setCloseResult(null)}
                style={({ pressed }) => [
                  styles.dismissBtn,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <LinearGradient
                  colors={[CLASH.goldBorder, '#b8860b']}
                  style={styles.dismissGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.dismissText}>
                    {isProfit ? 'יאללה, עוד עסקה!' : 'חוזרים לזירה!'}
                  </Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 12,
  },
  positionCard: {
    backgroundColor: CLASH.cardBg,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: CLASH.goldBorder + '20',
    padding: 14,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  assetInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  assetName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '800',
    writingDirection: 'rtl',
  },
  priceRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    padding: 10,
  },
  priceCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  priceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    writingDirection: 'rtl',
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
  },
  priceDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  bottomRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  investedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    writingDirection: 'rtl',
  },
  pnlBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pnlText: {
    fontSize: 13,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  closeBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  closeBtnGradient: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff',
    writingDirection: 'rtl',
    ...TEXT_SHADOW,
  },

  // ── Result Overlay ──
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultSheet: {
    width: '85%',
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: CLASH.goldBorder + '30',
    padding: 28,
    overflow: 'hidden',
  },
  resultContent: {
    alignItems: 'center',
  },
  resultEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 8,
    ...TEXT_SHADOW,
  },
  resultAsset: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 16,
    writingDirection: 'rtl',
  },
  resultPnlBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  resultPnlText: {
    fontSize: 24,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  coinsSummary: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    marginBottom: 16,
  },
  coinsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  coinsLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    writingDirection: 'rtl',
  },
  coinsValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
  },
  coinsDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 8,
  },
  resultMessage: {
    fontSize: 14,
    fontWeight: '700',
    color: '#cbd5e1',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: 20,
    lineHeight: 22,
  },
  dismissBtn: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  dismissGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
    ...TEXT_SHADOW,
  },
});
