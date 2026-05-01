import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { ActivePosition, PendingLimitOrder } from './tradingHubTypes';

/**
 * Fire a paper-trading event to the server. Logged in `paper_trades` and
 * mirrored into `paper_portfolio` (long-only, weighted-avg cost).
 *
 * Translation between models:
 *   - openPosition('buy',  price, amount) → BUY  trade of (amount/price) units
 *   - openPosition('sell', price, amount) → SELL trade — opening a short
 *   - closePosition() → the OPPOSITE trade type at currentPrice
 *
 * skipPortfolio=true when closing a short: the BUY is audit-logged but must
 * not create a phantom long row in paper_portfolio.
 *
 * Auth (authId + syncToken) is resolved inside syncPaperTrading.logTrade so
 * this store doesn't need to import from the auth layer.
 */
function logTradeFireAndForget(
  assetSymbol: string,
  tradeType: 'BUY' | 'SELL',
  priceAtExecution: number,
  amountInvested: number,
  skipPortfolio = false,
): void {
  if (priceAtExecution <= 0 || amountInvested <= 0) return;
  const quantity = amountInvested / priceAtExecution;
  import('../../db/sync/syncPaperTrading')
    .then((m) => m.logTrade({ assetSymbol, tradeType, quantity, priceAtExecution, skipPortfolio }))
    .catch(() => { /* non-fatal */ });
}

interface TradingStore {
  positions: ActivePosition[];
  pendingOrders: PendingLimitOrder[];

  openPosition: (
    assetId: string,
    type: 'buy' | 'sell',
    entryPrice: number,
    amountInvested: number,
  ) => string; // returns position id

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
        logTradeFireAndForget(assetId, type === 'buy' ? 'BUY' : 'SELL', entryPrice, amountInvested);
        return id;
      },

      closePosition: (positionId) => {
        const { positions } = get();
        const position = positions.find((p) => p.id === positionId) ?? null;
        if (!position) return null;
        set((state) => ({
          positions: state.positions.filter((p) => p.id !== positionId),
        }));
        // Closing a long → SELL (decrements portfolio).
        // Closing a short → BUY, but skipPortfolio=true so no phantom long is created.
        logTradeFireAndForget(
          position.assetId,
          position.type === 'buy' ? 'SELL' : 'BUY',
          position.currentPrice,
          position.amountInvested,
          position.type === 'sell',
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
        for (const newPos of newPositions) {
          logTradeFireAndForget(newPos.assetId, 'BUY', newPos.entryPrice, newPos.amountInvested);
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
