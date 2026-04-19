/**
 * SIM 22: סימולטור מסחר (Trading Simulator), Module 4-22
 * Types for the mock brokerage trading simulation.
 */

export interface StockTick {
  time: number; // tick index (0-29)
  price: number;
}

export type OrderType = 'market' | 'limit' | 'stop-loss';

export type OrderStatus = 'pending' | 'executed' | 'cancelled';

export interface TradeOrder {
  type: OrderType;
  triggerPrice?: number; // for limit and stop-loss orders
  executedPrice?: number; // filled price
  status: OrderStatus;
}

export interface TradingRound {
  id: string;
  instruction: string; // Hebrew instruction text
  orderType: OrderType;
  stockData: StockTick[]; // 30 simulated price ticks
  targetLesson: string; // Hebrew lesson learned after round
}

export interface TradingSimConfig {
  rounds: TradingRound[];
  startingCash: number; // ₪10,000
}

export interface TradingSimState {
  currentRound: number; // 0-2 index
  cash: number;
  holdings: number; // number of shares held
  orders: TradeOrder[];
  pnl: number; // profit and loss
  isComplete: boolean;
}

export type TradingSimGrade = 'S' | 'A' | 'B' | 'C' | 'F';

export interface TradingSimScore {
  grade: TradingSimGrade;
  totalPnL: number;
  ordersExecuted: number;
  lessonsLearned: string[];
}
