import { useEconomyStore } from '../../economy/useEconomyStore';
import { usePayslipMetaStore } from '../usePayslipMetaStore';

const FIRST_TIME_XP = 50;
const FIRST_TIME_COINS = 25;
const REPEAT_XP = 15;
const REPEAT_COINS = 5;
const DAILY_CAP = 4;

export interface PayslipRewardResult {
  xp: number;
  coins: number;
  isFirstTime: boolean;
  capped: boolean;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function grantPayslipReward(): PayslipRewardResult {
  const meta = usePayslipMetaStore.getState();
  const today = todayISO();
  const sameDay = meta.lastDate === today;
  const usedToday = sameDay ? meta.dailyCount : 0;

  if (usedToday >= DAILY_CAP) {
    return { xp: 0, coins: 0, isFirstTime: false, capped: true };
  }

  const isFirstTime = !meta.everUsed;
  const xp = isFirstTime ? FIRST_TIME_XP : REPEAT_XP;
  const coins = isFirstTime ? FIRST_TIME_COINS : REPEAT_COINS;

  const economy = useEconomyStore.getState();
  economy.addXP(xp, isFirstTime ? 'payslip_first' : 'payslip_repeat');
  economy.addCoins(coins);

  meta.incrementDailyCount(today);
  if (isFirstTime) {
    meta.setEverUsed();
  }

  return { xp, coins, isFirstTime, capped: false };
}
