import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { ActivePosition, PendingLimitOrder } from './tradingHubTypes';

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
        return id;
      },

      closePosition: (positionId) => {
        const { positions } = get();
        const position = positions.find((p) => p.id === positionId) ?? null;
        if (!position) return null;
        set((state) => ({
          positions: state.positions.filter((p) => p.id !== positionId),
        }));
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
