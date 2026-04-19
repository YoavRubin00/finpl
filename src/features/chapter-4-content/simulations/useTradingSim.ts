/**
 * SIM 22: סימולטור מסחר (Trading Simulator), Module 4-22
 * Hook: simulates price ticks at 200ms intervals, handles market/limit/stop-loss orders,
 * tracks cash, holdings value, and P&L across 3 rounds.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

import type {
  TradeOrder,
  TradingSimState,
  TradingSimScore,
  TradingSimGrade,
} from './tradingSimTypes';
import { tradingSimConfig, TRADING_ROUNDS } from './tradingSimData';

// ── Constants ───────────────────────────────────────────────────────────

const TICK_INTERVAL_MS = 200;
const SHARES_PER_BUY = 10; // buy 10 shares per order for clean math

// ── Initial state ───────────────────────────────────────────────────────

function createInitialState(): TradingSimState {
  return {
    currentRound: 0,
    cash: tradingSimConfig.startingCash,
    holdings: 0,
    orders: [],
    pnl: 0,
    isComplete: false,
  };
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useTradingSim() {
  const [state, setState] = useState<TradingSimState>(createInitialState);
  const [currentTick, setCurrentTick] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [roundComplete, setRoundComplete] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const orderRef = useRef<TradeOrder | null>(null);

  const currentRoundData = TRADING_ROUNDS[state.currentRound] ?? TRADING_ROUNDS[0];
  const totalTicks = currentRoundData.stockData.length;

  // Current price from tick data
  const currentPrice = currentRoundData.stockData[Math.min(currentTick, totalTicks - 1)].price;

  // Visible ticks (for chart rendering)
  const visibleTicks = useMemo(
    () => currentRoundData.stockData.slice(0, currentTick + 1),
    [currentRoundData.stockData, currentTick],
  );

  // Holdings value at current price
  const holdingsValue = state.holdings * currentPrice;

  // ── Tick simulation ─────────────────────────────────────────────────

  useEffect(() => {
    if (isPlaying && !roundComplete) {
      tickRef.current = setInterval(() => {
        setCurrentTick((prev) => {
          const next = prev + 1;
          if (next >= totalTicks) {
            setIsPlaying(false);
            setRoundComplete(true);
            // Cancel any pending orders when round ends
            if (orderRef.current && orderRef.current.status === 'pending') {
              orderRef.current = { ...orderRef.current, status: 'cancelled' };
              setState((s) => ({
                ...s,
                orders: [...s.orders.slice(0, -1), { ...orderRef.current! }],
              }));
            }
            return prev;
          }

          // Check pending order triggers at new tick price
          const tickPrice = currentRoundData.stockData[next].price;
          const pending = orderRef.current;
          if (pending && pending.status === 'pending' && pending.triggerPrice !== undefined) {
            let triggered = false;

            if (pending.type === 'limit' && tickPrice <= pending.triggerPrice) {
              triggered = true;
            } else if (pending.type === 'stop-loss' && tickPrice <= pending.triggerPrice) {
              triggered = true;
            }

            if (triggered) {
              const executed: TradeOrder = {
                ...pending,
                executedPrice: tickPrice,
                status: 'executed',
              };
              orderRef.current = executed;

              setState((s) => {
                const updatedOrders = [...s.orders.slice(0, -1), executed];

                if (pending.type === 'limit') {
                  // Limit buy: spend cash, gain shares
                  const cost = tickPrice * SHARES_PER_BUY;
                  return {
                    ...s,
                    cash: s.cash - cost,
                    holdings: s.holdings + SHARES_PER_BUY,
                    orders: updatedOrders,
                  };
                } else {
                  // Stop-loss sell: sell all holdings at trigger price
                  const proceeds = tickPrice * s.holdings;
                  const pnlChange = proceeds - (s.orders.find((o) => o.type === 'market')?.executedPrice ?? tickPrice) * s.holdings;
                  return {
                    ...s,
                    cash: s.cash + proceeds,
                    holdings: 0,
                    pnl: s.pnl + pnlChange,
                    orders: updatedOrders,
                  };
                }
              });
            }
          }

          return next;
        });
      }, TICK_INTERVAL_MS);
    }

    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [isPlaying, roundComplete, totalTicks, currentRoundData.stockData]);

  // ── Actions ─────────────────────────────────────────────────────────

  /** Start playing price ticks for the current round. */
  const startRound = useCallback(() => {
    setCurrentTick(0);
    setRoundComplete(false);
    orderRef.current = null;
    setIsPlaying(true);
  }, []);

  /** Execute a market order, buy immediately at current price. */
  const placeMarketOrder = useCallback(() => {
    if (orderRef.current) return; // already placed an order this round

    const cost = currentPrice * SHARES_PER_BUY;
    const order: TradeOrder = {
      type: 'market',
      executedPrice: currentPrice,
      status: 'executed',
    };
    orderRef.current = order;

    setState((s) => ({
      ...s,
      cash: s.cash - cost,
      holdings: s.holdings + SHARES_PER_BUY,
      orders: [...s.orders, order],
    }));
  }, [currentPrice]);

  /** Place a limit order, buy when price drops to triggerPrice or below. */
  const placeLimitOrder = useCallback((triggerPrice: number) => {
    if (orderRef.current) return;

    const order: TradeOrder = {
      type: 'limit',
      triggerPrice,
      status: 'pending',
    };
    orderRef.current = order;

    setState((s) => ({
      ...s,
      orders: [...s.orders, order],
    }));
  }, []);

  /** Place a stop-loss order, sell all holdings when price drops to triggerPrice. */
  const placeStopLoss = useCallback((triggerPrice: number) => {
    if (orderRef.current) return;
    if (state.holdings <= 0) return; // need holdings to stop-loss

    const order: TradeOrder = {
      type: 'stop-loss',
      triggerPrice,
      status: 'pending',
    };
    orderRef.current = order;

    setState((s) => ({
      ...s,
      orders: [...s.orders, order],
    }));
  }, [state.holdings]);

  /** Advance to the next round or complete the simulation. */
  const nextRound = useCallback(() => {
    setState((s) => {
      const nextIdx = s.currentRound + 1;
      if (nextIdx >= TRADING_ROUNDS.length) {
        // Sell any remaining holdings at last price of final round
        const finalRound = TRADING_ROUNDS[s.currentRound];
        const finalPrice = finalRound.stockData[finalRound.stockData.length - 1].price;
        const proceeds = s.holdings * finalPrice;
        const finalCash = s.cash + proceeds;
        return {
          ...s,
          cash: finalCash,
          holdings: 0,
          pnl: finalCash - tradingSimConfig.startingCash,
          isComplete: true,
        };
      }
      return { ...s, currentRound: nextIdx };
    });
    setCurrentTick(0);
    setRoundComplete(false);
    orderRef.current = null;
  }, []);

  /** Reset to initial state. */
  const reset = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    setIsPlaying(false);
    setRoundComplete(false);
    setCurrentTick(0);
    orderRef.current = null;
    setState(createInitialState());
  }, []);

  // ── Score ───────────────────────────────────────────────────────────

  const score: TradingSimScore | null = useMemo(() => {
    if (!state.isComplete) return null;

    const executedOrders = state.orders.filter((o) => o.status === 'executed');
    const ordersExecuted = executedOrders.length;
    const totalPnL = state.pnl;

    const lessonsLearned = TRADING_ROUNDS
      .slice(0, state.currentRound + 1)
      .map((r) => r.targetLesson);

    let grade: TradingSimGrade;
    if (ordersExecuted >= 3 && totalPnL > 0) grade = 'S';
    else if (ordersExecuted >= 3) grade = 'A';
    else if (ordersExecuted >= 2) grade = 'B';
    else if (ordersExecuted >= 1) grade = 'C';
    else grade = 'F';

    return { grade, totalPnL, ordersExecuted, lessonsLearned };
  }, [state.isComplete, state.orders, state.pnl, state.currentRound]);

  return {
    state,
    config: tradingSimConfig,
    currentRoundData,
    currentTick,
    currentPrice,
    visibleTicks,
    holdingsValue,
    isPlaying,
    roundComplete,
    score,
    startRound,
    placeMarketOrder,
    placeLimitOrder,
    placeStopLoss,
    nextRound,
    reset,
  };
}
