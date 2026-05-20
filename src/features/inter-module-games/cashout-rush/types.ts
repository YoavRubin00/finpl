export interface CashoutSessionResult {
  cashedOut: boolean;
  multiplier: number; // 1.0 = no gain; crashed = 0
  crashedAtMultiplier: number;
  tookOffEarly: boolean;
}

export interface CashoutEducationStats {
  totalSessions: number;
  totalCashouts: number;
  averageMultiplier: number;
  bestMultiplier: number;
}
