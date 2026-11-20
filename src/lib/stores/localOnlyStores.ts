// src/lib/stores/localOnlyStores.ts
//
// Persisted stores that are NOT in the sign-out registry (registry.ts), so
// resetAllLocalStores() never touches them. Several hold data that only ever
// lives on the device (net worth, holdings, the financial profile, payslip
// details), which is why a normal sign-out keeps them.
//
// Deleting the account or the device's data must also empty them in MEMORY:
// clearAllPersistedState() removes the keys on disk, but a store that is
// loaded keeps its state, and zustand persist writes that state back on its
// next set(). Each store is loaded here on demand (a dynamic import, so none
// of them is pulled into app start-up), allowed to finish loading from disk
// (otherwise a late load would bring the old data back after the reset), then
// put back to its initial state.
//
// A store added later that persists outside the registry belongs in this list
// too (scripts/test-local-only-stores.ts fails until it is).

import { whenHydrated, type HydratingStore } from './whenHydrated';

export interface LocalOnlyStore extends HydratingStore {
  getInitialState(): unknown;
  setState(state: never, replace: true): void;
}

/** How long one store may take to load from disk before it is reset anyway. */
const HYDRATION_CAP_MS = 1500;

export const LOCAL_ONLY_STORES: ReadonlyArray<{ file: string; load: () => Promise<LocalOnlyStore> }> = [
  { file: 'features/anon-advice/useAnonAdviceStore', load: () => import('../../features/anon-advice/useAnonAdviceStore').then((m) => m.useAnonAdviceStore) },
  { file: 'features/breaking-news/useBreakingNewsStore', load: () => import('../../features/breaking-news/useBreakingNewsStore').then((m) => m.useBreakingNewsStore) },
  { file: 'features/crowd-wisdom/useCrowdWisdomStore', load: () => import('../../features/crowd-wisdom/useCrowdWisdomStore').then((m) => m.useCrowdWisdomStore) },
  { file: 'features/daily-news-challenge/useDailyNewsChallengeStore', load: () => import('../../features/daily-news-challenge/useDailyNewsChallengeStore').then((m) => m.useDailyNewsChallengeStore) },
  { file: 'features/financial-tools/useFinancialProfileStore', load: () => import('../../features/financial-tools/useFinancialProfileStore').then((m) => m.useFinancialProfileStore) },
  { file: 'features/investors-journal/useInvestorsJournalStore', load: () => import('../../features/investors-journal/useInvestorsJournalStore').then((m) => m.useInvestorsJournalStore) },
  { file: 'features/legal/useParentalConsent', load: () => import('../../features/legal/useParentalConsent').then((m) => m.useParentalConsentStore) },
  { file: 'features/legal/useTermsStore', load: () => import('../../features/legal/useTermsStore').then((m) => m.useTermsStore) },
  { file: 'features/net-worth-dashboard/holdings/useHoldingsStore', load: () => import('../../features/net-worth-dashboard/holdings/useHoldingsStore').then((m) => m.useHoldingsStore) },
  { file: 'features/net-worth-dashboard/useNetWorthStore', load: () => import('../../features/net-worth-dashboard/useNetWorthStore').then((m) => m.useNetWorthStore) },
  { file: 'features/payslip-analyzer/usePayslipMetaStore', load: () => import('../../features/payslip-analyzer/usePayslipMetaStore').then((m) => m.usePayslipMetaStore) },
  { file: 'features/pearls/usePearlsStore', load: () => import('../../features/pearls/usePearlsStore').then((m) => m.usePearlsStore) },
  { file: 'features/portfolio-share/usePortfolioShareStore', load: () => import('../../features/portfolio-share/usePortfolioShareStore').then((m) => m.usePortfolioShareStore) },
  { file: 'features/portfolio-share/useSeedEngagementStore', load: () => import('../../features/portfolio-share/useSeedEngagementStore').then((m) => m.useSeedEngagementStore) },
  { file: 'features/stock-analyst/useAnalystHistoryStore', load: () => import('../../features/stock-analyst/useAnalystHistoryStore').then((m) => m.useAnalystHistoryStore) },
  { file: 'features/trade-rooms/useTradeRoomsStore', load: () => import('../../features/trade-rooms/useTradeRoomsStore').then((m) => m.useTradeRoomsStore) },
];

/** Puts one store back to its initial state once it has finished loading. Never throws. */
export async function resetLoadedStore(store: LocalOnlyStore, capMs = HYDRATION_CAP_MS): Promise<void> {
  try {
    await whenHydrated(store, capMs);
    store.setState(store.getInitialState() as never, true);
  } catch {
    /* one store must never block the wipe */
  }
}

/** Every store in the list, in memory, in parallel. Never throws. */
export async function resetLocalOnlyStores(): Promise<void> {
  await Promise.all(
    LOCAL_ONLY_STORES.map(async ({ load }) => {
      try {
        await resetLoadedStore(await load());
      } catch {
        /* a module that fails to load holds nothing in memory */
      }
    }),
  );
}
