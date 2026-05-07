import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { ActivePosition, PendingLimitOrder } from './tradingHubTypes';
import { useEconomyStore } from '../economy/useEconomyStore';

/**
 * Fire a paper-trading event to the server. Logged in `paper_trades`,
 * mirrored into `paper_portfolio` (long-only, weighted-avg cost), and the
 * signed `cashDelta` is applied atomically to user_profiles.virtual_balance.
 *
 * Translation between models:
 *   - openPosition('buy',  price, amount) → BUY  trade of (amount/price) units, cashDelta = -amount
 *   - openPosition('sell', price, amount) → SELL trade — opening a short,    cashDelta = -amount
 *   - closePosition()                     → OPPOSITE trade type at currentPrice, cashDelta = +PnL-adjusted return
 *
 * skipPortfolio=true when closing a short: the BUY is audit-logged but must
 * not create a phantom long row in paper_portfolio.
 *
 * Auth (authId + syncToken) is resolved inside syncPaperTrading.logTrade so
 * this store doesn't need to import from the auth layer.
 */
/**
 * Fire a trade and reconcile local state with the server response.
 *
 *   - On HTTP 402 (server says insufficient balance, e.g. cross-device race),
 *     `onRejected` is invoked so the caller can undo its optimistic mutation
 *     (credit back the spend, remove the position, etc.). The local store had
 *     already been mutated optimistically; without rollback it would drift.
 *   - On 2xx, the server returns the post-update authoritative balance and we
 *     hard-set the local store. This corrects any pre-existing drift in one
 *     shot — preferable to letting it pile up until the next profile GET.
 *   - On network/parse error, we keep the optimistic state. The next profile
 *     GET on app open will reconcile.
 */
function logTradeFireAndForget(
  assetSymbol: string,
  tradeType: 'BUY' | 'SELL',
  priceAtExecution: number,
  amountInvested: number,
  cashDelta: number,
  skipPortfolio = false,
  onRejected?: () => void,
): void {
  if (priceAtExecution <= 0 || amountInvested <= 0) return;
  const quantity = amountInvested / priceAtExecution;
  import('../../db/sync/syncPaperTrading')
    .then((m) => m.logTrade({ assetSymbol, tradeType, quantity, priceAtExecution, cashDelta, skipPortfolio }))
    .then((result) => {
      if (result.ok) {
        useEconomyStore.getState().setVirtualBalance(result.virtualBalance);
      } else if (result.status === 402 && onRejected) {
        onRejected();
      }
      // network/parse errors (no status): keep optimistic state, reconcile later.
    })
    .catch(() => { /* non-fatal */ });
}

interface TradingStore {
  positions: ActivePosition[];
  pendingOrders: PendingLimitOrder[];

  /**
   * Open a long (`buy`) or short (`sell`) position. Debits virtual_balance by
   * amountInvested. Returns the new position id, or null if the user can't
   * afford it (insufficient virtual balance).
   */
  openPosition: (
    assetId: string,
    type: 'buy' | 'sell',
    entryPrice: number,
    amountInvested: number,
  ) => string | null;

  /**
   * Close a position. Credits virtual_balance with the PnL-adjusted return
   * (amountInvested × (1 + pnlPercent/100)). Callers should NOT separately
   * credit the economy store — the math now lives in one place.
   */
  closePosition: (positionId: string) => ActivePosition | null;

  updatePrices: (assetId: string, currentPrice: number) => void;

  placeLimitOrder: (
    assetId: string,
    limitPrice: number,
    amountInvested: number,
    onExecuted?: (positionId: string) => void,
  ) => string; // returns order id

  cancelLimitOrder: (orderId: string) => number; // returns refunded amount
}

function generateId(): string {
  return `pos_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function calcPnlPercent(
  type: 'buy' | 'sell',
  entryPrice: number,
  currentPrice: number,
): number {
  if (entryPrice === 0) return 0;
  const change = (currentPrice - entryPrice) / entryPrice;
  return type === 'buy' ? change * 100 : -change * 100;
}

export const useTradingStore = create<TradingStore>()(
  persist(
    (set, get) => ({
      positions: [],
      pendingOrders: [],

      openPosition: (assetId, type, entryPrice, amountInvested) => {
        // Affordability gate — same path used everywhere for paper trades.
        // Server applies the same check atomically; this is the optimistic UX.
        const debited = useEconomyStore.getState().spendCoins(amountInvested);
        if (!debited) return null;

        const id = generateId();
        const position: ActivePosition = {
          id,
          assetId,
          type,
          entryPrice,
          currentPrice: entryPrice,
          amountInvested,
          openedAt: Date.now(),
          pnlPercent: 0,
        };
        set((state) => ({
          positions: [...state.positions, position],
        }));
        logTradeFireAndForget(
          assetId,
          type === 'buy' ? 'BUY' : 'SELL',
          entryPrice,
          amountInvested,
          -amountInvested, // open: debit
          false,
          // Server rejected (e.g. cross-device race exhausted balance):
          // refund the local debit and remove the ghost position.
          () => {
            useEconomyStore.getState().addCoins(amountInvested, 'trading');
            set((state) => ({
              positions: state.positions.filter((p) => p.id !== id),
            }));
          },
        );
        return id;
      },

      closePosition: (positionId) => {
        const { positions } = get();
        const position = positions.find((p) => p.id === positionId) ?? null;
        if (!position) return null;
        set((state) => ({
          positions: state.positions.filter((p) => p.id !== positionId),
        }));
        // PnL-adjusted return — clamped to zero, same as the math the callers
        // used to do inline. closePosition is now the single source of truth
        // for paper-trading credits.
        const pnlFactor = 1 + position.pnlPercent / 100;
        const returned = Math.max(0, Math.round(position.amountInvested * pnlFactor));
        if (returned > 0) {
          useEconomyStore.getState().addCoins(returned, 'trading');
        }
        // Closing a long → SELL (decrements portfolio).
        // Closing a short → BUY, but skipPortfolio=true so no phantom long is created.
        logTradeFireAndForget(
          position.assetId,
          position.type === 'buy' ? 'SELL' : 'BUY',
          position.currentPrice,
          position.amountInvested,
          returned, // close: credit (PnL-adjusted)
          position.type === 'sell',
          // Rare: server rejected the close (would only happen if balance is
          // already negative, since credits always pass the gate). Undo the
          // local credit and restore the position so the user can retry.
          () => {
            if (returned > 0) {
              useEconomyStore.getState().spendCoins(returned);
            }
            set((state) => ({
              positions: [...state.positions, position],
            }));
          },
        );
        return position;
      },

      updatePrices: (assetId, currentPrice) => {
        // Update open positions
        const updatedPositions = get().positions.map((p) =>
          p.assetId === assetId
            ? {
                ...p,
                currentPrice,
                pnlPercent: calcPnlPercent(p.type, p.entryPrice, currentPrice),
              }
            : p,
        );

        // Execute any pending limit buy orders where price <= limitPrice
        const pendingForAsset = get().pendingOrders.filter(
          (o) => o.assetId === assetId && currentPrice <= o.limitPrice,
        );
        const remainingOrders = get().pendingOrders.filter(
          (o) => !(o.assetId === assetId && currentPrice <= o.limitPrice),
        );

        const newPositions = pendingForAsset.map((order) => {
          const id = generateId();
          const position: ActivePosition = {
            id,
            assetId: order.assetId,
            type: 'buy',
            entryPrice: currentPrice,
            currentPrice,
            amountInvested: order.amountInvested,
            openedAt: Date.now(),
            pnlPercent: 0,
          };
          return position;
        });

        set({
          positions: [...updatedPositions, ...newPositions],
          pendingOrders: remainingOrders,
        });

        // Limit orders execute as BUYs (the store only supports buy-side limits).
        // cashDelta=0 mirrors the pre-existing balance behavior of the limit-order
        // path (placeLimitOrder/cancelLimitOrder don't touch virtual_balance);
        // BuySheet doesn't actually exercise this flow today.
        for (const newPos of newPositions) {
          logTradeFireAndForget(newPos.assetId, 'BUY', newPos.entryPrice, newPos.amountInvested, 0);
        }
      },

      placeLimitOrder: (assetId, limitPrice, amountInvested) => {
        const id = generateId().replace('pos_', 'lmt_');
        const order: PendingLimitOrder = {
          id,
          assetId,
          side: 'buy',
          limitPrice,
          amountInvested,
          createdAt: Date.now(),
        };
        set((state) => ({
          pendingOrders: [...state.pendingOrders, order],
        }));
        return id;
      },

      cancelLimitOrder: (orderId) => {
        const order = get().pendingOrders.find((o) => o.id === orderId);
        if (!order) return 0;
        set((state) => ({
          pendingOrders: state.pendingOrders.filter((o) => o.id !== orderId),
        }));
        return order.amountInvested;
      },
    }),
    {
      name: 'trading-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        positions: state.positions,
        pendingOrders: state.pendingOrders,
      }),
    },
  ),
);
