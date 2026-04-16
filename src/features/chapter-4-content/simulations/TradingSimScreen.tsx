/**
 * SIM 22: סימולטור מסחר (Trading Simulator) — Module 4-22
 * Mock brokerage screen with live price ticks. 3 rounds teaching:
 * Market Order, Limit Order, Stop-Loss.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { SimLottieBackground } from '../../../components/ui/SimLottieBackground';
import { LottieIcon } from '../../../components/ui/LottieIcon';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { GlowCard } from '../../../components/ui/GlowCard';
import { ConfettiExplosion } from '../../../components/ui/ConfettiExplosion';
import { tapHaptic, successHaptic, heavyHaptic } from '../../../utils/haptics';
import { useTradingSim } from './useTradingSim';
import type { StockTick, OrderType } from './tradingSimTypes';
import { SIM4, GRADE_COLORS4, GRADE_HEBREW, SHADOW_STRONG, SHADOW_LIGHT, RTL, TYPE4, sim4Styles } from './simTheme';
import { formatShekel } from '../../../utils/format';


const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 80;
const CHART_HEIGHT = 180;

/* ── Lottie assets ── */
const LOTTIE_CHART = require('../../../../assets/lottie/wired-flat-153-bar-chart-hover-pinch.json');
const LOTTIE_ROCKET = require('../../../../assets/lottie/wired-flat-489-rocket-space-hover-flying.json');
const LOTTIE_TARGET = require('../../../../assets/lottie/wired-flat-458-goal-target-hover-hit.json');
const LOTTIE_SHIELD = require('../../../../assets/lottie/wired-flat-457-shield-security-hover-pinch.json');
const LOTTIE_MONEY = require('../../../../assets/lottie/wired-flat-413-money-bag-hover-shake.json');
const LOTTIE_GROWTH = require('../../../../assets/lottie/wired-flat-161-growth-hover-pinch.json');
const LOTTIE_BULB = require('../../../../assets/lottie/wired-flat-36-bulb-hover-blink.json');
const LOTTIE_REPLAY = require('../../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json');
const LOTTIE_CHECK = require('../../../../assets/lottie/wired-flat-24-approved-checked-hover-pinch.json');
const LOTTIE_CROSS = require('../../../../assets/lottie/wired-flat-25-error-cross-hover-pinch.json');
const LOTTIE_PLAY = require('../../../../assets/lottie/wired-flat-29-play-pause-circle-hover-pinch.json');
const LOTTIE_TROPHY = require('../../../../assets/lottie/wired-flat-3263-trophy-circle-hover-roll.json');
const LOTTIE_STAR = require('../../../../assets/lottie/wired-flat-237-star-rating-hover-pinch.json');
const LOTTIE_DOCUMENT = require('../../../../assets/lottie/wired-flat-56-document-hover-swipe.json');
const LOTTIE_CLOCK = require('../../../../assets/lottie/wired-flat-45-clock-time-hover-pinch.json');
const LOTTIE_ARROW = require('../../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');

const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  market: 'פקודת מרקט',
  limit: 'פקודת לימיט',
  'stop-loss': 'סטופ לוס',
};

const ORDER_TYPE_COLORS: Record<OrderType, string> = {
  market: '#22c55e',
  limit: '#818cf8',
  'stop-loss': '#ef4444',
};

const ORDER_TYPE_LOTTIES: Record<OrderType, ReturnType<typeof require>> = {
  market: LOTTIE_ROCKET,
  limit: LOTTIE_TARGET,
  'stop-loss': LOTTIE_SHIELD,
};

// ── Helpers ───────────────────────────────────────────────────────────
function formatPrice(n: number): string {
  return `₪${n.toFixed(0)}`;
}

/* ================================================================== */
/*  LiveChart — real-time price line chart                              */
/* ================================================================== */

function LiveChart({
  visibleTicks,
  allTicks,
  orderExecutedAt,
  triggerPrice,
  orderType,
}: {
  visibleTicks: StockTick[];
  allTicks: StockTick[];
  orderExecutedAt: number | null;
  triggerPrice: number | null;
  orderType: OrderType;
}) {
  if (visibleTicks.length < 2) {
    return (
      <View style={chartStyles.container}>
        <View style={chartStyles.chartArea}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: CHART_HEIGHT / 2 - 10 }}>
            <LottieIcon source={LOTTIE_CLOCK} size={18} />
            <Text style={chartStyles.waitingText}>ממתין לנתונים...</Text>
          </View>
        </View>
      </View>
    );
  }

  // Use all ticks for scale (so chart doesn't jump around)
  const allPrices = allTicks.map((t) => t.price);
  const maxPrice = Math.max(...allPrices) * 1.02;
  const minPrice = Math.min(...allPrices) * 0.98;
  const range = maxPrice - minPrice || 1;

  const stepX = CHART_WIDTH / (allTicks.length - 1);

  const points = visibleTicks.map((tick, i) => ({
    x: i * stepX,
    y: CHART_HEIGHT - ((tick.price - minPrice) / range) * CHART_HEIGHT,
    price: tick.price,
    time: tick.time,
  }));

  const startPrice = visibleTicks[0].price;
  const lastPoint = points[points.length - 1];

  // Trigger price line position
  const triggerY =
    triggerPrice != null
      ? CHART_HEIGHT - ((triggerPrice - minPrice) / range) * CHART_HEIGHT
      : null;

  return (
    <View style={chartStyles.container}>
      {/* Y-axis labels */}
      <View style={chartStyles.yAxis}>
        <Text style={chartStyles.yLabel}>{formatPrice(maxPrice)}</Text>
        <Text style={chartStyles.yLabel}>{formatPrice((maxPrice + minPrice) / 2)}</Text>
        <Text style={chartStyles.yLabel}>{formatPrice(minPrice)}</Text>
      </View>

      {/* Chart area */}
      <View style={chartStyles.chartArea}>
        {/* Grid lines */}
        <View style={[chartStyles.gridLine, { top: 0 }]} />
        <View style={[chartStyles.gridLine, { top: CHART_HEIGHT / 2 }]} />
        <View style={[chartStyles.gridLine, { top: CHART_HEIGHT }]} />

        {/* Trigger price line (for limit/stop-loss) */}
        {triggerY != null && (
          <View
            style={[
              chartStyles.triggerLine,
              {
                top: triggerY,
                borderColor:
                  orderType === 'limit' ? ORDER_TYPE_COLORS.limit : ORDER_TYPE_COLORS['stop-loss'],
              },
            ]}
          >
            <Text
              style={[
                chartStyles.triggerLabel,
                {
                  color:
                    orderType === 'limit' ? ORDER_TYPE_COLORS.limit : ORDER_TYPE_COLORS['stop-loss'],
                },
              ]}
            >
              {formatPrice(triggerPrice!)}
            </Text>
          </View>
        )}

        {/* Line segments */}
        {points.map((point, i) => {
          if (i === 0) return null;
          const prev = points[i - 1];
          const dx = point.x - prev.x;
          const dy = point.y - prev.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          const isUp = point.price >= startPrice;

          return (
            <View
              key={`line-${i}`}
              style={[
                chartStyles.lineSegment,
                {
                  left: prev.x,
                  top: prev.y,
                  width: length,
                  transform: [{ rotate: `${angle}deg` }],
                  backgroundColor: isUp ? '#22c55e' : '#ef4444',
                },
              ]}
            />
          );
        })}

        {/* Current price dot (last point) */}
        {lastPoint && (
          <View
            style={[
              chartStyles.currentDot,
              {
                left: lastPoint.x - 6,
                top: lastPoint.y - 6,
                backgroundColor:
                  lastPoint.price >= startPrice ? '#22c55e' : '#ef4444',
              },
            ]}
          />
        )}

        {/* Order execution marker */}
        {orderExecutedAt != null && orderExecutedAt < points.length && (
          <View
            style={[
              chartStyles.executionMarker,
              {
                left: points[orderExecutedAt].x - 12,
                top: points[orderExecutedAt].y - 28,
              },
            ]}
          >
            <LottieIcon
              source={orderType === 'stop-loss' ? LOTTIE_SHIELD : LOTTIE_CHECK}
              size={18}
            />
            <View
              style={[
                chartStyles.executionLine,
                {
                  backgroundColor: ORDER_TYPE_COLORS[orderType],
                },
              ]}
            />
          </View>
        )}

        {/* X-axis: tick labels */}
        <View style={chartStyles.xLabelsRow}>
          <Text style={[chartStyles.xLabel, { left: 0 }]}>0</Text>
          <Text
            style={[
              chartStyles.xLabel,
              { left: (CHART_WIDTH / 2) - 7 },
            ]}
          >
            15
          </Text>
          <Text
            style={[
              chartStyles.xLabel,
              { left: CHART_WIDTH - 14 },
            ]}
          >
            30
          </Text>
        </View>
      </View>
    </View>
  );
}

/* ================================================================== */
/*  InstructionBubble — animated hint for each round                   */
/* ================================================================== */

function InstructionBubble({
  instruction,
  orderType,
}: {
  instruction: string;
  orderType: OrderType;
}) {
  const color = ORDER_TYPE_COLORS[orderType];
  return (
    <Animated.View
      entering={FadeInDown.springify().damping(20)}
      style={[
        instructionStyles.bubble,
        { borderColor: color, backgroundColor: `${color}15` },
      ]}
    >
      <LottieIcon source={ORDER_TYPE_LOTTIES[orderType]} size={24} />
      <Text style={[instructionStyles.text, RTL]}>{instruction}</Text>
    </Animated.View>
  );
}

/* ================================================================== */
/*  PortfolioBar — cash, holdings, P&L display                         */
/* ================================================================== */

function PortfolioBar({
  cash,
  holdingsValue,
  pnl,
}: {
  cash: number;
  holdingsValue: number;
  pnl: number;
}) {
  return (
    <View style={portfolioStyles.container}>
      <View style={portfolioStyles.item}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
          <LottieIcon source={LOTTIE_MONEY} size={16} />
          <Text style={portfolioStyles.label}>מזומן</Text>
        </View>
        <Text style={portfolioStyles.value}>{formatShekel(cash)}</Text>
      </View>
      <View style={portfolioStyles.divider} />
      <View style={portfolioStyles.item}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
          <LottieIcon source={LOTTIE_CHART} size={16} />
          <Text style={portfolioStyles.label}>אחזקות</Text>
        </View>
        <Text style={portfolioStyles.value}>{formatShekel(holdingsValue)}</Text>
      </View>
      <View style={portfolioStyles.divider} />
      <View style={portfolioStyles.item}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
          <LottieIcon source={LOTTIE_GROWTH} size={16} />
          <Text style={portfolioStyles.label}>רווח/הפסד</Text>
        </View>
        <Text
          style={[
            portfolioStyles.value,
            { color: pnl >= 0 ? '#22c55e' : '#ef4444' },
          ]}
        >
          {pnl >= 0 ? '+' : ''}
          {formatShekel(pnl)}
        </Text>
      </View>
    </View>
  );
}

/* ================================================================== */
/*  OrderPanel — order controls per round type                         */
/* ================================================================== */

function OrderPanel({
  orderType,
  isPlaying,
  orderPlaced,
  onMarketOrder,
  onLimitOrder,
  onStopLoss,
  currentPrice,
  holdings,
}: {
  orderType: OrderType;
  isPlaying: boolean;
  orderPlaced: boolean;
  onMarketOrder: () => void;
  onLimitOrder: () => void;
  onStopLoss: () => void;
  currentPrice: number;
  holdings: number;
}) {
  if (!isPlaying || orderPlaced) return null;

  const color = ORDER_TYPE_COLORS[orderType];

  if (orderType === 'market') {
    return (
      <Animated.View entering={FadeInUp.delay(100)} style={orderStyles.panel}>
        <AnimatedPressable
          onPress={onMarketOrder}
          style={[orderStyles.mainBtn, { backgroundColor: color }]}
          accessibilityRole="button"
          accessibilityLabel={`קנה עכשיו — ${formatPrice(currentPrice)}`}
        >
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
            <View accessible={false}><LottieIcon source={LOTTIE_ROCKET} size={22} /></View>
            <Text style={orderStyles.mainBtnText}>קנה עכשיו — {formatPrice(currentPrice)}</Text>
          </View>
        </AnimatedPressable>
        <Text style={[orderStyles.hint, RTL]} numberOfLines={1}>
          קנייה מיידית במחיר הנוכחי
        </Text>
      </Animated.View>
    );
  }

  if (orderType === 'limit') {
    return (
      <Animated.View entering={FadeInUp.delay(100)} style={orderStyles.panel}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
          <LottieIcon source={LOTTIE_TARGET} size={18} />
          <Text style={[orderStyles.targetText, RTL]}>
            מחיר יעד: {formatPrice(230)}
          </Text>
        </View>
        <AnimatedPressable
          onPress={onLimitOrder}
          style={[orderStyles.mainBtn, { backgroundColor: color }]}
          accessibilityRole="button"
          accessibilityLabel="הגדר לימיט ב-₪230"
        >
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
            <View accessible={false}><LottieIcon source={LOTTIE_TARGET} size={22} /></View>
            <Text style={orderStyles.mainBtnText}>הגדר לימיט ב-₪230</Text>
          </View>
        </AnimatedPressable>
        <Text style={[orderStyles.hint, RTL]} numberOfLines={1}>
          קנייה רק כשהמחיר יגיע ל-₪230
        </Text>
      </Animated.View>
    );
  }

  // stop-loss
  return (
    <Animated.View entering={FadeInUp.delay(100)} style={orderStyles.panel}>
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
        <LottieIcon source={LOTTIE_SHIELD} size={18} />
        <Text style={[orderStyles.targetText, RTL]}>
          רצפת הגנה: {formatPrice(200)}
        </Text>
      </View>
      <AnimatedPressable
        onPress={onStopLoss}
        style={[
          orderStyles.mainBtn,
          { backgroundColor: color },
          holdings <= 0 && orderStyles.disabledBtn,
        ]}
        disabled={holdings <= 0}
        accessibilityRole="button"
        accessibilityLabel="הגדר סטופ לוס ב-₪200"
      >
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
          <View accessible={false}><LottieIcon source={LOTTIE_SHIELD} size={22} /></View>
          <Text style={orderStyles.mainBtnText}>הגדר סטופ לוס ב-₪200</Text>
        </View>
      </AnimatedPressable>
      <Text style={[orderStyles.hint, RTL]} numberOfLines={1}>
        מכירה אוטומטית אם המחיר נופל ל-₪200
      </Text>
    </Animated.View>
  );
}

/* ================================================================== */
/*  SharkLessonCard — unified lesson and next button                   */
/* ================================================================== */

function SharkLessonCard({
  lesson,
  orderType,
  isLastRound,
  onNext,
}: {
  lesson: string;
  orderType: OrderType;
  isLastRound: boolean;
  onNext: () => void;
}) {
  const [showBtn, setShowBtn] = useState(false);

  useEffect(() => {
    // Reset timer when lesson changes (new round)
    setShowBtn(false);
    const timer = setTimeout(() => setShowBtn(true), 3000);
    return () => clearTimeout(timer);
  }, [lesson]);

  return (
    <Animated.View entering={FadeInDown.springify().damping(20).delay(200)} style={{ marginTop: 16 }}>
      <GlowCard
        glowColor={`${ORDER_TYPE_COLORS[orderType]}40`}
        style={styles.statsCard}
      >
        <View style={{ flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 12 }}>
          <Text style={{ fontSize: 32 }}>🦈</Text>
          <Text style={[styles.lessonText, RTL, { flex: 1, lineHeight: 22, fontWeight: '700' }]}>
            {lesson}
          </Text>
        </View>

        {showBtn && (
          <Animated.View entering={FadeInUp}>
            <AnimatedPressable
              onPress={onNext}
              style={[sim4Styles.continueBtn, { marginTop: 20, justifyContent: 'center' }]}
              accessibilityRole="button"
              accessibilityLabel={isLastRound ? 'סיום תרגול' : 'המשך'}
            >
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                <Text style={sim4Styles.continueText}>
                  {isLastRound ? 'סיום תרגול' : 'המשך'}
                </Text>
                <View style={{ transform: [{ rotate: '180deg' }] }} accessible={false}>
                  <LottieIcon source={isLastRound ? LOTTIE_TROPHY : LOTTIE_PLAY} size={22} />
                </View>
              </View>
            </AnimatedPressable>
          </Animated.View>
        )}
      </GlowCard>
    </Animated.View>
  );
}

/* ================================================================== */
/*  ScoreScreen — final results after all 3 rounds                     */
/* ================================================================== */

function ScoreScreen({
  score,
  orders,
  onReplay,
  onContinue,
}: {
  score: NonNullable<ReturnType<typeof useTradingSim>['score']>;
  orders: ReturnType<typeof useTradingSim>['state']['orders'];
  onReplay: () => void;
  onContinue: () => void;
}) {
  const [showConfetti, setShowConfetti] = useState(true);
  const scoreInsets = useSafeAreaInsets();

  const gradeColor = GRADE_COLORS4[score.grade] ?? '#ef4444';

  const gradeLotties: Record<string, ReturnType<typeof require>> = {
    S: LOTTIE_TROPHY,
    A: LOTTIE_STAR,
    B: LOTTIE_CHECK,
    C: LOTTIE_CHART,
    F: LOTTIE_CROSS,
  };

  const gradeLabels: Record<string, string> = {
    S: 'סוחר אגדי',
    A: 'סוחר מצוין',
    B: 'סוחר טוב',
    C: 'סוחר מתחיל',
    F: 'צריך תרגול',
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(40, scoreInsets.bottom + 24) }]}>
      {showConfetti && (
        <ConfettiExplosion onComplete={() => setShowConfetti(false)} />
      )}

      {/* Grade banner */}
      <Animated.View entering={FadeInDown.springify().damping(22)} style={sim4Styles.gradeContainer}>
        <View accessible={false}><LottieIcon source={gradeLotties[score.grade] || LOTTIE_CHART} size={56} /></View>
        <Text accessibilityLiveRegion="polite" style={[sim4Styles.gradeText, { color: gradeColor }]}>{GRADE_HEBREW[score.grade] ?? score.grade}</Text>
        <Text style={[sim4Styles.gradeLabel, { color: gradeColor }]}>
          {gradeLabels[score.grade] ?? ''}
        </Text>
      </Animated.View>

      {/* P&L Summary */}
      <Animated.View entering={FadeInUp.delay(100)}>
        <View style={[sim4Styles.scoreCard, { marginTop: 12 }]}>
          <View style={sim4Styles.scoreCardInner}>
            <Text style={[sim4Styles.scoreTotalLabel, { textAlign: 'center' }]}>
              סיכום מסחר
            </Text>
            <Text
              style={[
                sim4Styles.scoreTotalValue,
                { textAlign: 'center', color: score.totalPnL >= 0 ? '#22c55e' : '#ef4444' },
              ]}
            >
              {score.totalPnL >= 0 ? '+' : ''}{formatShekel(score.totalPnL)}
            </Text>
            <Text style={[sim4Styles.scoreRowLabel, { textAlign: 'center' }]}>
              רווח/הפסד כולל
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Round-by-round breakdown */}
      <Animated.View entering={FadeInUp.delay(200)}>
        <View style={[sim4Styles.scoreCard, { marginTop: 12 }]}>
          <View style={sim4Styles.scoreCardInner}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
              <LottieIcon source={LOTTIE_DOCUMENT} size={22} />
              <Text style={[sim4Styles.scoreTotalLabel, RTL]}>סיכום סבבים</Text>
            </View>
            {orders.map((order, i) => (
              <View key={`order-${i}`} style={sim4Styles.scoreRow}>
                <View style={sim4Styles.scoreRowLeft}>
                  <LottieIcon source={ORDER_TYPE_LOTTIES[order.type]} size={18} />
                  <Text style={[sim4Styles.scoreRowLabel, RTL]}>
                    {ORDER_TYPE_LABELS[order.type]}
                  </Text>
                </View>
                <Text
                  style={[
                    sim4Styles.scoreRowValue,
                    {
                      color:
                        order.status === 'executed'
                          ? '#22c55e'
                          : '#ef4444',
                    },
                  ]}
                >
                  {order.status === 'executed'
                    ? `${formatPrice(order.executedPrice ?? 0)}`
                    : 'לא בוצע'}
                </Text>
                <View style={{ marginLeft: 4 }}>
                  <LottieIcon source={order.status === 'executed' ? LOTTIE_CHECK : LOTTIE_CROSS} size={16} />
                </View>
              </View>
            ))}
            <View style={sim4Styles.scoreDivider}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4, flex: 1 }}>
                <LottieIcon source={LOTTIE_TARGET} size={18} />
                <Text style={[sim4Styles.scoreRowLabel, RTL]}>פקודות שבוצעו</Text>
              </View>
              <Text style={sim4Styles.scoreRowValue}>{score.ordersExecuted}/3</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Lessons learned */}
      <Animated.View entering={FadeInUp.delay(300)}>
        <View style={[sim4Styles.scoreCard, { marginTop: 12 }]}>
          <View style={sim4Styles.scoreCardInner}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
              <LottieIcon source={LOTTIE_DOCUMENT} size={22} />
              <Text style={[sim4Styles.scoreTotalLabel, RTL]}>מה למדנו?</Text>
            </View>
            {score.lessonsLearned.map((lesson, i) => (
              <View key={`lesson-${i}`} style={[lessonStyles.item, { marginTop: i === 0 ? 8 : 0 }]}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                  <LottieIcon source={ORDER_TYPE_LOTTIES[(['market', 'limit', 'stop-loss'] as const)[i]]} size={18} />
                  <Text style={[lessonStyles.text, RTL, { flex: 1 }]}>
                    {lesson}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </Animated.View>

      {/* Key lesson */}
      <Animated.View entering={FadeInUp.delay(400)}>
        <View style={[sim4Styles.scoreCard, { marginTop: 12 }]}>
          <View style={[sim4Styles.scoreCardInner, sim4Styles.insightRow]}>
            <LottieIcon source={LOTTIE_TARGET} size={22} />
            <Text style={[sim4Styles.insightText, RTL, { flex: 1 }]}>
              מרקט = מהיר אבל יקר. לימיט = חכם אבל אולי לא יתמלא. סטופ לוס = הביטוח שלך.
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Actions */}
      <Animated.View entering={FadeInUp.delay(600)} style={sim4Styles.actionsRow}>
        <AnimatedPressable onPress={onReplay} style={sim4Styles.replayBtn} accessibilityRole="button" accessibilityLabel="שחק שוב">
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
            <View accessible={false}><LottieIcon source={LOTTIE_REPLAY} size={18} /></View>
            <Text style={sim4Styles.replayText}>שחק שוב</Text>
          </View>
        </AnimatedPressable>
        <AnimatedPressable onPress={onContinue} style={[sim4Styles.continueBtn, { justifyContent: 'center' }]} accessibilityRole="button" accessibilityLabel="המשך">
          <Text style={sim4Styles.continueText}>המשך</Text>
          <View style={{ position: 'absolute', left: 16 }} accessible={false}>
            <LottieIcon source={LOTTIE_ARROW} size={22} />
          </View>
        </AnimatedPressable>
      </Animated.View>
    </ScrollView>
  );
}

/* ================================================================== */
/*  Main Screen                                                        */
/* ================================================================== */

interface TradingSimScreenProps {
  onComplete?: () => void;
}

export function TradingSimScreen({ onComplete }: TradingSimScreenProps) {
  const sim = useTradingSim();
  const insets = useSafeAreaInsets();
  const rewardsGranted = useRef(false);

  // Track which tick the order was executed at (for chart marker)
  const [executedAtTick, setExecutedAtTick] = useState<number | null>(null);
  const prevOrderCount = useRef(0);

  // Price animation
  const priceScale = useSharedValue(1);
  const prevPrice = useRef(sim.currentPrice);

  useEffect(() => {
    const diff = Math.abs(sim.currentPrice - prevPrice.current);
    prevPrice.current = sim.currentPrice;
    if (diff > 3) {
      priceScale.value = withSequence(
        withSpring(1.05, { damping: 20, stiffness: 250 }),
        withSpring(1, { damping: 22, stiffness: 180 }),
      );
    }
  }, [sim.currentPrice, priceScale]);

  // Detect order execution
  useEffect(() => {
    const executedOrders = sim.state.orders.filter((o) => o.status === 'executed');
    if (executedOrders.length > prevOrderCount.current) {
      prevOrderCount.current = executedOrders.length;
      setExecutedAtTick(sim.currentTick);
      successHaptic();
    }
  }, [sim.state.orders, sim.currentTick]);

  // Reset execution marker on new round
  useEffect(() => {
    setExecutedAtTick(null);
    prevOrderCount.current = sim.state.orders.filter((o) => o.status === 'executed').length;
  }, [sim.state.currentRound, sim.state.orders]);

  // Grant rewards on completion
  useEffect(() => {
    if (sim.state.isComplete && !rewardsGranted.current) {
      rewardsGranted.current = true;
      successHaptic();
    }
  }, [sim.state.isComplete]);

  const priceAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: priceScale.value }],
  }));

  // ── Handlers ──────────────────────────────────────────────────────
  const handleStartRound = useCallback(() => {
    tapHaptic();
    sim.startRound();
  }, [sim]);

  const handleMarketOrder = useCallback(() => {
    heavyHaptic();
    sim.placeMarketOrder();
  }, [sim]);

  const handleLimitOrder = useCallback(() => {
    tapHaptic();
    sim.placeLimitOrder(230); // Round 2 target
  }, [sim]);

  const handleStopLoss = useCallback(() => {
    tapHaptic();
    sim.placeStopLoss(200); // Round 3 target
  }, [sim]);

  const handleNextRound = useCallback(() => {
    tapHaptic();
    sim.nextRound();
  }, [sim]);

  const handleReplay = useCallback(() => {
    tapHaptic();
    rewardsGranted.current = false;
    prevOrderCount.current = 0;
    setExecutedAtTick(null);
    sim.reset();
  }, [sim]);

  const handleContinue = useCallback(() => {
    tapHaptic();
    onComplete?.();
  }, [onComplete]);

  const CH4_LOTTIE: [ReturnType<typeof require>, ReturnType<typeof require>] = [
    require('../../../../assets/lottie/wired-flat-947-investment-hover-pinch.json'),
    require('../../../../assets/lottie/wired-flat-955-demand-hover-click.json'),
  ];

  // ── Score Phase ───────────────────────────────────────────────────
  if (sim.state.isComplete && sim.score) {
    return (
      <SimLottieBackground lottieSources={CH4_LOTTIE} chapterColors={SIM4.gradient}>
      <ScoreScreen
        score={sim.score}
        orders={sim.state.orders}
        onReplay={handleReplay}
        onContinue={handleContinue}
      />
      </SimLottieBackground>
    );
  }

  // ── Check if order was placed this round ──────────────────────────
  const orderPlaced = sim.state.orders.some(
    (o) =>
      o.type === sim.currentRoundData.orderType &&
      (o.status === 'executed' || o.status === 'pending'),
  );

  // Trigger price for chart line
  const triggerPrice =
    sim.currentRoundData.orderType === 'limit'
      ? 230
      : sim.currentRoundData.orderType === 'stop-loss'
        ? 200
        : null;

  const roundNum = sim.state.currentRound + 1;
  const isLastRound = sim.state.currentRound >= 2;

  // ── Trading Phase ─────────────────────────────────────────────────
  return (
    <SimLottieBackground lottieSources={CH4_LOTTIE} chapterColors={SIM4.gradient}>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(40, insets.bottom + 16) }]}>
      {/* Title */}
      <Animated.View entering={FadeIn.duration(400)}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <View accessible={false}><LottieIcon source={LOTTIE_CHART} size={28} /></View>
          <Text accessibilityRole="header" style={styles.title}>סימולטור מסחר</Text>
        </View>
        <Text style={[styles.subtitle, RTL]}>
          סבב {roundNum}/3 — {ORDER_TYPE_LABELS[sim.currentRoundData.orderType]}
        </Text>
      </Animated.View>

      {/* Round progress indicator */}
      <Animated.View entering={FadeInUp.delay(50)} style={roundStyles.progressRow}>
        {[0, 1, 2].map((i) => {
          const isActive = i === sim.state.currentRound;
          const isDone = i < sim.state.currentRound;
          const type: OrderType = (['market', 'limit', 'stop-loss'] as const)[i];
          return (
            <View
              key={`round-${i}`}
              style={[
                roundStyles.dot,
                {
                  backgroundColor: isDone
                    ? '#22c55e'
                    : isActive
                      ? ORDER_TYPE_COLORS[type]
                      : SIM4.trackBg,
                  borderColor: isActive
                    ? ORDER_TYPE_COLORS[type]
                    : SIM4.cardBorder,
                },
              ]}
            >
              {isDone ? (
                <LottieIcon source={LOTTIE_CHECK} size={18} />
              ) : (
                <LottieIcon source={ORDER_TYPE_LOTTIES[type]} size={18} />
              )}
            </View>
          );
        })}
      </Animated.View>

      {/* Instruction bubble */}
      {!sim.isPlaying && !sim.roundComplete && (
        <InstructionBubble
          instruction={sim.currentRoundData.instruction}
          orderType={sim.currentRoundData.orderType}
        />
      )}

      {/* Start round button (before playing) */}
      {!sim.isPlaying && !sim.roundComplete && (
        <Animated.View entering={FadeInUp.delay(200)} style={styles.controlsRow}>
          <AnimatedPressable
            onPress={handleStartRound}
            style={[
              styles.startBtn,
              { backgroundColor: ORDER_TYPE_COLORS[sim.currentRoundData.orderType] },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`התחל סבב ${roundNum}`}
          >
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
              <View accessible={false}><LottieIcon source={LOTTIE_PLAY} size={22} /></View>
              <Text style={styles.startBtnText}>התחל סבב {roundNum}</Text>
            </View>
          </AnimatedPressable>
        </Animated.View>
      )}

      {/* Live chart (during play or after round) */}
      {(sim.isPlaying || sim.roundComplete) && (
        <Animated.View entering={FadeInUp.delay(100)}>
          <GlowCard
            glowColor={`${ORDER_TYPE_COLORS[sim.currentRoundData.orderType]}20`}
            style={styles.statsCard}
          >
            <View style={chartHeaderStyles.row}>
              <Text style={chartHeaderStyles.label}>TSLA</Text>
              <Animated.View style={priceAnimStyle}>
                <Text
                  style={[
                    chartHeaderStyles.price,
                    {
                      color:
                        sim.currentPrice >= sim.currentRoundData.stockData[0].price
                          ? '#22c55e'
                          : '#ef4444',
                    },
                  ]}
                >
                  {formatPrice(sim.currentPrice)}
                </Text>
              </Animated.View>
            </View>
            <LiveChart
              visibleTicks={sim.visibleTicks}
              allTicks={sim.currentRoundData.stockData}
              orderExecutedAt={executedAtTick}
              triggerPrice={triggerPrice}
              orderType={sim.currentRoundData.orderType}
            />
          </GlowCard>
        </Animated.View>
      )}

      {/* Portfolio bar */}
      {(sim.isPlaying || sim.roundComplete) && (
        <Animated.View entering={FadeInUp.delay(150)}>
          <PortfolioBar
            cash={sim.state.cash}
            holdingsValue={sim.holdingsValue}
            pnl={sim.state.cash + sim.holdingsValue - sim.config.startingCash}
          />
        </Animated.View>
      )}

      {/* Order panel (during play, before order placed) */}
      <OrderPanel
        orderType={sim.currentRoundData.orderType}
        isPlaying={sim.isPlaying}
        orderPlaced={orderPlaced}
        onMarketOrder={handleMarketOrder}
        onLimitOrder={handleLimitOrder}
        onStopLoss={handleStopLoss}
        currentPrice={sim.currentPrice}
        holdings={sim.state.holdings}
      />

      {/* Order status (after order placed, during play) */}
      {orderPlaced && sim.isPlaying && (
        <Animated.View entering={FadeInUp.delay(100)}>
          <GlowCard glowColor="rgba(34,197,94,0.15)" style={styles.statsCard}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <LottieIcon
                source={sim.state.orders[sim.state.orders.length - 1]?.status === 'pending' ? LOTTIE_CLOCK : LOTTIE_CHECK}
                size={22}
              />
              <Text style={[styles.statsTitle, { textAlign: 'center', marginBottom: 0 }]}>
                {sim.state.orders[sim.state.orders.length - 1]?.status === 'pending'
                  ? 'ממתין לביצוע...'
                  : 'פקודה בוצעה!'}
              </Text>
            </View>
          </GlowCard>
        </Animated.View>
      )}

      {/* Round complete: lesson + next button */}
      {sim.roundComplete && (
        <SharkLessonCard
          lesson={sim.currentRoundData.targetLesson}
          orderType={sim.currentRoundData.orderType}
          isLastRound={isLastRound}
          onNext={handleNextRound}
        />
      )}
    </ScrollView>
    </SimLottieBackground>
  );
}

/* ================================================================== */
/*  Styles                                                              */
/* ================================================================== */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SIM4.cardBg,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    color: SIM4.textOnGradient,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    ...SHADOW_STRONG,
  },
  subtitle: {
    color: SIM4.textOnGradientMuted,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
    ...SHADOW_LIGHT,
  },
  statsCard: {
    marginTop: 12,
    padding: 16,
    backgroundColor: SIM4.cardBg,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: SIM4.cardBorder,
  },
  statsTitle: {
    color: SIM4.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  lessonText: {
    color: SIM4.dark,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 24,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  startBtn: {
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: SIM4.cardBorder,
  },
  startBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  nextBtn: {
    backgroundColor: SIM4.btnPrimary,
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: SIM4.btnPrimaryBorder,
  },
  nextBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});

const roundStyles = StyleSheet.create({
  progressRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  dot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});

const instructionStyles = StyleSheet.create({
  bubble: {
    marginTop: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  text: {
    color: SIM4.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    lineHeight: 22,
  },
});

const chartHeaderStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    color: SIM4.textMuted,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  price: {
    fontSize: 24,
    fontWeight: '900',
  },
});

const portfolioStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginTop: 12,
    backgroundColor: SIM4.cardBg,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: SIM4.cardBorder,
  },
  item: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    backgroundColor: SIM4.cardBorder,
  },
  label: {
    color: SIM4.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  value: {
    color: SIM4.textPrimary,
    fontSize: 14,
    fontWeight: '900',
  },
});

const orderStyles = StyleSheet.create({
  panel: {
    marginTop: 12,
    alignItems: 'center',
  },
  targetText: {
    color: SIM4.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  mainBtn: {
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  mainBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  hint: {
    color: SIM4.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  disabledBtn: {
    opacity: 0.4,
  },
});

const lessonStyles = StyleSheet.create({
  item: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: SIM4.cardBorder,
  },
  text: {
    color: SIM4.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
});

const chartStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: CHART_HEIGHT + 30,
    marginTop: 8,
  },
  yAxis: {
    width: 45,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  yLabel: {
    color: SIM4.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  chartArea: {
    flex: 1,
    height: CHART_HEIGHT,
    position: 'relative',
  },
  waitingText: {
    color: SIM4.textMuted,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: SIM4.cardBorder,
  },
  triggerLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 0,
    borderTopWidth: 2,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
  },
  triggerLabel: {
    position: 'absolute',
    right: 0,
    top: -16,
    fontSize: 12,
    fontWeight: '800',
  },
  lineSegment: {
    position: 'absolute',
    height: 3,
    borderRadius: 1.5,
    transformOrigin: 'left center',
  },
  currentDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: SIM4.cardBg,
  },
  executionMarker: {
    position: 'absolute',
    alignItems: 'center',
    width: 24,
  },
  executionLine: {
    width: 2,
    height: 8,
    borderRadius: 1,
  },
  xLabelsRow: {
    position: 'absolute',
    top: CHART_HEIGHT + 4,
    left: 0,
    right: 0,
    height: 20,
  },
  xLabel: {
    position: 'absolute',
    color: SIM4.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    width: 20,
  },
});
