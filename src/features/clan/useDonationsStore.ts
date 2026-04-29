import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import type { DonationRequest, Donation, ClanCurrency } from './clanTypes';
import {
  SEED_DONATION_REQUESTS,
  DAILY_DONATION_CAP_COINS,
  DAILY_DONATION_CAP_GEMS,
  MAX_DONATION_PER_TAP_COINS,
  MAX_DONATION_PER_TAP_GEMS,
  REP_PER_COIN,
  REP_PER_GEM,
  REP_THANK_BONUS,
  DONATION_REQUEST_TTL_HOURS,
  SELF_ID,
} from './clanData';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

interface DonationsState {
  requests: DonationRequest[];
  donations: Donation[]; // capped at 100
  // donor daily limits keyed by date
  dailyCoinsGiven: number;
  dailyGemsGiven: number;
  dailyLimitDate: string | null;
  // reputation accumulated by self
  selfReputation: number;
  // last donation timestamp per recipient (cooldown)
  lastDonatedToAt: Record<string, number>; // recipientId -> timestamp ms

  // Selectors
  getOpenRequests: () => DonationRequest[];
  canDonate: (currency: ClanCurrency, amount: number) => boolean;
  getRemainingCap: (currency: ClanCurrency) => number;
  maxPerTap: (currency: ClanCurrency) => number;

  // Internal helper (not exposed to consumers)
  _resetDailyIfNeeded: () => void;

  // Actions
  createRequest: (
    currency: ClanCurrency,
    amountRequested: number,
    note?: string
  ) => DonationRequest | null;
  donate: (requestId: string, currency: ClanCurrency, amount: number) => boolean;
  thankDonor: (donationId: string) => void;
  expireOldRequests: () => void;
}

export const useDonationsStore = create<DonationsState>()(
  persist(
    (set, get) => ({
      requests: SEED_DONATION_REQUESTS,
      donations: [],
      dailyCoinsGiven: 0,
      dailyGemsGiven: 0,
      dailyLimitDate: null,
      selfReputation: 0,
      lastDonatedToAt: {},

      getOpenRequests: () => {
        get().expireOldRequests();
        return get().requests.filter((r) => r.status === 'open');
      },

      canDonate: (currency, amount) => {
        const state = get();
        state._resetDailyIfNeeded();
        const remaining = state.getRemainingCap(currency);
        return remaining >= amount;
      },

      getRemainingCap: (currency) => {
        const state = get();
        if (state.dailyLimitDate !== todayISO()) {
          return currency === 'coins' ? DAILY_DONATION_CAP_COINS : DAILY_DONATION_CAP_GEMS;
        }
        const used = currency === 'coins' ? state.dailyCoinsGiven : state.dailyGemsGiven;
        const cap = currency === 'coins' ? DAILY_DONATION_CAP_COINS : DAILY_DONATION_CAP_GEMS;
        return Math.max(0, cap - used);
      },

      maxPerTap: (currency) =>
        currency === 'coins' ? MAX_DONATION_PER_TAP_COINS : MAX_DONATION_PER_TAP_GEMS,

      _resetDailyIfNeeded: () => {
        const today = todayISO();
        if (get().dailyLimitDate !== today) {
          set({ dailyCoinsGiven: 0, dailyGemsGiven: 0, dailyLimitDate: today });
        }
      },

      createRequest: (currency, amountRequested, note) => {
        const now = new Date();
        const expiry = new Date(now.getTime() + DONATION_REQUEST_TTL_HOURS * 3_600_000);

        // Self already has an open request?
        const existing = get().requests.find(
          (r) => r.requesterId === SELF_ID && r.status === 'open'
        );
        if (existing) return null;

        const req: DonationRequest = {
          id: makeId('req'),
          requesterId: SELF_ID,
          requesterName: 'את/ה',
          requesterAvatar: '🦈',
          currency,
          amountRequested,
          amountReceived: 0,
          createdAt: now.toISOString(),
          expiresAt: expiry.toISOString(),
          status: 'open',
          donorIds: [],
          note,
        };
        set((state) => ({ requests: [...state.requests, req] }));
        return req;
      },

      donate: (requestId, currency, amount) => {
        const state = get();
        state._resetDailyIfNeeded();

        const req = state.requests.find((r) => r.id === requestId);
        if (!req || req.status !== 'open') return false;
        if (req.requesterId === SELF_ID) return false; // can't self-donate

        // Cooldown check
        const lastMs = state.lastDonatedToAt[req.requesterId] ?? 0;
        if (Date.now() - lastMs < 60_000) return false;

        if (!state.canDonate(currency, amount)) return false;

        // Spend from economy store
        const economyStore = require('../economy/useEconomyStore').useEconomyStore;
        const spent =
          currency === 'coins'
            ? economyStore.getState().spendCoins(amount)
            : economyStore.getState().spendGems(amount);
        if (!spent) return false;

        const rep = currency === 'coins' ? amount * REP_PER_COIN : amount * REP_PER_GEM;

        const donation: Donation = {
          id: makeId('don'),
          requestId,
          donorId: SELF_ID,
          recipientId: req.requesterId,
          currency,
          amount,
          donatedAt: new Date().toISOString(),
          reputationGained: rep,
          thanked: false,
        };

        const newReceived = req.amountReceived + amount;
        const fulfilled = newReceived >= req.amountRequested;

        set((state) => ({
          donations: [...state.donations.slice(-99), donation],
          selfReputation: state.selfReputation + rep,
          dailyCoinsGiven:
            currency === 'coins' ? state.dailyCoinsGiven + amount : state.dailyCoinsGiven,
          dailyGemsGiven:
            currency === 'gems' ? state.dailyGemsGiven + amount : state.dailyGemsGiven,
          lastDonatedToAt: { ...state.lastDonatedToAt, [req.requesterId]: Date.now() },
          requests: state.requests.map((r) =>
            r.id === requestId
              ? {
                  ...r,
                  amountReceived: newReceived,
                  donorIds: [...r.donorIds, SELF_ID],
                  status: fulfilled ? 'fulfilled' : 'open',
                }
              : r
          ),
        }));

        // System chat message
        try {
          const chatStore = require('./useClanChatStore').useClanChatStore;
          chatStore.getState().addSystemMessage({
            kind: 'system',
            event: 'donation_sent',
            body: `את/ה תרמ/ה ${amount} ${currency === 'coins' ? '🪙' : '💎'} ל${req.requesterName}`,
            payload: { memberId: req.requesterId, amount, currency },
          });
        } catch { /* chat store may not be ready */ }

        return true;
      },

      thankDonor: (donationId) => {
        set((state) => ({
          donations: state.donations.map((d) =>
            d.id === donationId ? { ...d, thanked: true } : d
          ),
          // The donor gets rep bonus; for self-donations we give bonus to reputation
          selfReputation: state.donations.find((d) => d.id === donationId && d.recipientId === SELF_ID)
            ? state.selfReputation // recipient is self — donor gets bonus, we just mark thanked
            : state.selfReputation,
        }));
        // If we are the donor, apply thank bonus to our rep
        const donation = get().donations.find((d) => d.id === donationId);
        if (donation?.donorId === SELF_ID) {
          set((state) => ({ selfReputation: state.selfReputation + REP_THANK_BONUS }));
        }
      },

      expireOldRequests: () => {
        const now = new Date().toISOString();
        set((state) => ({
          requests: state.requests.map((r) =>
            r.status === 'open' && r.expiresAt < now ? { ...r, status: 'expired' } : r
          ),
        }));
      },
    }),
    {
      name: 'clan-donations-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        requests: state.requests,
        donations: state.donations.slice(-100),
        dailyCoinsGiven: state.dailyCoinsGiven,
        dailyGemsGiven: state.dailyGemsGiven,
        dailyLimitDate: state.dailyLimitDate,
        selfReputation: state.selfReputation,
        lastDonatedToAt: state.lastDonatedToAt,
      }),
    }
  )
);
