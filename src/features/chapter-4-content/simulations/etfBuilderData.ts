/**
 * SIM 21: בנה את הסל (Build the ETF Basket) — Module 4-21
 * ETF catalog data for the basket builder simulation.
 */

import type { ETFProduct, ETFBuilderConfig } from './etfBuilderTypes';

// ── ETF Catalog ──────────────────────────────────────────────────────
export const ETF_CATALOG: ETFProduct[] = [
  {
    id: 'sp500',
    name: '‎S&P‎ 500 — מדד 500 הגדולות',
    emoji: '🇺🇸',
    type: 'stocks',
    expenseRatio: 0.03,
    topHoldings: ['Apple 7%', 'Microsoft 6%', 'Amazon 3.5%', 'NVIDIA 3%', 'Alphabet 2%'],
    annualReturn: 0.10,
    riskLevel: 3,
  },
  {
    id: 'nasdaq100',
    name: 'NASDAQ 100 — טכנולוגיה',
    emoji: '💻',
    type: 'stocks',
    expenseRatio: 0.20,
    topHoldings: ['Apple 12%', 'Microsoft 10%', 'NVIDIA 7%', 'Amazon 5%', 'Meta 4%'],
    annualReturn: 0.14,
    riskLevel: 4,
  },
  {
    id: 'gov-bonds',
    name: 'אג"ח ממשלתי — Government Bonds',
    emoji: '🏛️',
    type: 'bonds',
    expenseRatio: 0.10,
    topHoldings: ['אג"ח ממשלת ישראל 30%', 'US Treasury 25%', 'German Bund 15%', 'UK Gilt 15%', 'Japan JGB 15%'],
    annualReturn: 0.03,
    riskLevel: 1,
  },
  {
    id: 'ta125',
    name: 'TA-125 — מדד תל אביב 125',
    emoji: '🇮🇱',
    type: 'stocks',
    expenseRatio: 0.25,
    topHoldings: ['לאומי 6%', 'פועלים 5%', 'טבע 4%', 'נייס 4%', 'אלביט 3%'],
    annualReturn: 0.08,
    riskLevel: 3,
  },
  {
    id: 'reit-global',
    name: 'REIT Global — נדל"ן עולמי',
    emoji: '🏠',
    type: 'real-estate',
    expenseRatio: 0.30,
    topHoldings: ['Prologis 8%', 'American Tower 6%', 'Equinix 5%', 'Simon Property 4%', 'Realty Income 3%'],
    annualReturn: 0.07,
    riskLevel: 3,
  },
  {
    id: 'emerging',
    name: 'Emerging Markets — שווקים מתפתחים',
    emoji: '🌍',
    type: 'emerging',
    expenseRatio: 0.40,
    topHoldings: ['TSMC 6%', 'Tencent 4%', 'Samsung 3%', 'Alibaba 2%', 'Reliance 2%'],
    annualReturn: 0.06,
    riskLevel: 4,
  },
  {
    id: 'europe-stoxx',
    name: 'STOXX 600 — אירופה',
    emoji: '🇪🇺',
    type: 'stocks',
    expenseRatio: 0.15,
    topHoldings: ['Nestlé 3%', 'ASML 2.5%', 'Roche 2%', 'LVMH 2%', 'SAP 1.5%'],
    annualReturn: 0.07,
    riskLevel: 3,
  },
  {
    id: 'gold',
    name: 'Gold ETF — זהב',
    emoji: '🥇',
    type: 'bonds', // treated as defensive asset alongside bonds
    expenseRatio: 0.25,
    topHoldings: ['זהב פיזי 90%', 'חוזי זהב עתידיים 4%', 'כסף פיזי 3%', 'פלטינה 2%', 'מזומן 1%'],
    annualReturn: 0.05,
    riskLevel: 2,
  },
];

// ── Config ────────────────────────────────────────────────────────────
export const etfBuilderConfig: ETFBuilderConfig = {
  availableETFs: ETF_CATALOG,
  maxETFs: 5,
  budget: 50_000,
};
