import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { SEED_DILEMMAS, isSeedDilemma } from './seedDilemmas';
import type { AnonAdvicePost, AnonAdviceReply, AnonAlias, ModerationStatus } from './anonAdviceTypes';
import {
  generateAlias,
  REWARD_POST_XP,
  REWARD_POST_COINS,
  REWARD_REPLY_XP,
  REWARD_REPLY_COINS,
  REWARD_REPLY_VOTE_BONUS_COINS,
  FIRST_POST_BONUS_COINS,
  POST_AUTHOR_REPLY_XP,
  DAILY_POST_CAP,
  DAILY_REPLY_CAP,
  MIN_REPLY_LENGTH_FOR_REWARD,
} from './anonAdviceData';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * A5 (read-only, real self-data only) — the signed-in user's own weekly activity
 * in the anonymous-advice community. Every field is derived exclusively from the
 * user's real posts/replies/coin-earnings — never from other people. Consumed by
 * BATCH 6 ("השבוע שלך בקהילה") which only READS this getter.
 */
export interface AnonWeeklyCommunityStats {
  /** Approved posts the user authored in the last 7 days. */
  posts: number;
  /** Replies the user wrote in the last 7 days. */
  replies: number;
  /** Coins actually awarded to the user from advice (posts+replies) in the last 7 days. */
  coinsEarned: number;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** True when an ISO timestamp falls within the last 7 days. */
function withinLastWeek(iso: string): boolean {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && t >= Date.now() - WEEK_MS;
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

interface AnonAdviceState {
  posts: AnonAdvicePost[];
  replies: AnonAdviceReply[];
  selfAlias: AnonAlias | null;
  // Daily caps
  dailyPostsCount: number;
  dailyRepliesCount: number;
  dailyLimitDate: string | null;
  // Anti-double-reward: postIds where this user already received reply reward
  replyRewardsClaimed: string[];
  firstPostBonusGiven: boolean;
  // Reply ids this user marked helpful (toggle guard)
  upvotedReplyIds: string[];
  // Post ids this user "liked" (Facebook-style like toggle)
  likedPostIds: string[];
  // Local like counts per post — only real user likes accumulate here
  postLikes: Record<string, number>;
  // A4 — ids of the user's OWN posts that received a NEW inbound (non-self)
  // reply the author hasn't opened yet. Drives the "יש תגובה חדשה לשאלה שלך"
  // nudge. Stays empty until a genuine external reply arrives (honest — a
  // self-reply on your own post never counts as inbound interaction).
  unseenReplyPostIds: string[];
  // A5 — append-only ledger of coins ACTUALLY awarded to the user from advice
  // (posts + replies), each stamped with the award time. The weekly-summary
  // getter sums entries in the last 7 days — 100% real self-data.
  adviceCoinLedger: { at: string; coins: number }[];
  // Feed-level option votes this user already cast (one vote per post — the
  // dedupe guard for the in-card poll buttons). The vote itself is REAL.
  votedOptionByPost: Record<string, 0 | 1>;
  // Filter state (not persisted)

  // Selectors
  getPosts: () => AnonAdvicePost[];
  getPostById: (id: string) => AnonAdvicePost | undefined;
  getRepliesFor: (postId: string) => AnonAdviceReply[];
  ensureSelfAlias: () => AnonAlias;
  canPostToday: () => boolean;
  canReplyToday: () => boolean;
  remainingPostsToday: () => number;
  remainingRepliesToday: () => number;
  // A4 — ids of self posts with unseen inbound replies (read-only view of state)
  getUnseenReplyPostIds: () => string[];
  // A5 — the user's real weekly community stats (read-only; BATCH 6 consumes this)
  getWeeklyCommunityStats: () => AnonWeeklyCommunityStats;

  // Actions
  submitPost: (input: {
    situation: string;
    question: string;
    options: string[];
    imageUri?: string;
    tags?: string[];
    status: ModerationStatus;
    rejectionReason?: string;
  }) => { post: AnonAdvicePost; reward: { coins: number; xp: number; firstBonus: boolean } | null };
  submitReply: (input: {
    postId: string;
    body: string;
    agreedWith?: 0 | 1;
  }) => { reply: AnonAdviceReply; reward: { coins: number; xp: number } | null } | null;
  votePostOption: (postId: string, optionIndex: 0 | 1) => void;
  /** One-shot vote from the feed card (dedupe-guarded). Returns false if the
   *  user already voted on this post. */
  voteOnPostOnce: (postId: string, optionIndex: 0 | 1) => boolean;
  /** Cold-start: put the example dilemmas INTO the store so they behave exactly
   *  like real posts (post screen, replies, votes). Yoav ruling 2026-07-04 —
   *  they must not look like examples. Zero fabricated engagement: they start
   *  at 0 replies / 0 votes and retire once a real post exists (getPosts). */
  ensureSeedPosts: () => void;
  toggleReplyUpvote: (replyId: string) => void;
  togglePostLike: (postId: string) => void;
  // A4 — clear the "new reply" flag once the author has looked at that post
  markRepliesSeen: (postId: string) => void;
  resetDailyIfNeeded: () => void;
}

export const useAnonAdviceStore = create<AnonAdviceState>()(
  persist(
    (set, get) => ({
      // P0-5: no seed. The feed is empty until real posts exist (isSelf/server).
      posts: [],
      replies: [],
      selfAlias: null,
      dailyPostsCount: 0,
      dailyRepliesCount: 0,
      dailyLimitDate: null,
      replyRewardsClaimed: [],
      firstPostBonusGiven: false,
      upvotedReplyIds: [],
      likedPostIds: [],
      postLikes: {},
      unseenReplyPostIds: [],
      adviceCoinLedger: [],
      votedOptionByPost: {},

      getPosts: () => {
        // Example dilemmas show only while there is no real approved post —
        // the instant one exists they retire from every surface.
        const approved = get().posts.filter((p) => p.status === 'approved');
        const hasReal = approved.some((p) => !isSeedDilemma(p.id));
        const visible = hasReal ? approved.filter((p) => !isSeedDilemma(p.id)) : approved;
        return [...visible].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      },

      ensureSeedPosts: () => {
        const posts = get().posts;
        const hasSeeds = posts.some((p) => isSeedDilemma(p.id));
        const hasRealApproved = posts.some((p) => p.status === 'approved' && !isSeedDilemma(p.id));
        if (hasSeeds || hasRealApproved) return;
        set((state) => ({ posts: [...state.posts, ...SEED_DILEMMAS] }));
      },

      voteOnPostOnce: (postId, optionIndex) => {
        if (get().votedOptionByPost[postId] !== undefined) return false;
        set((state) => ({
          votedOptionByPost: { ...state.votedOptionByPost, [postId]: optionIndex },
        }));
        get().votePostOption(postId, optionIndex);
        return true;
      },

      getPostById: (id) => get().posts.find((p) => p.id === id),

      getRepliesFor: (postId) => {
        // Most-helpful first (Reddit-style), ties fall back to oldest-first.
        return [...get().replies]
          .filter((r) => r.postId === postId)
          .sort((a, b) => {
            const upvoteDiff = (b.upvotes ?? 0) - (a.upvotes ?? 0);
            if (upvoteDiff !== 0) return upvoteDiff;
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          });
      },

      ensureSelfAlias: () => {
        const existing = get().selfAlias;
        if (existing) return existing;
        const alias = generateAlias();
        set({ selfAlias: alias });
        return alias;
      },

      canPostToday: () => {
        get().resetDailyIfNeeded();
        return get().dailyPostsCount < DAILY_POST_CAP;
      },

      canReplyToday: () => {
        get().resetDailyIfNeeded();
        return get().dailyRepliesCount < DAILY_REPLY_CAP;
      },

      remainingPostsToday: () => {
        get().resetDailyIfNeeded();
        return Math.max(0, DAILY_POST_CAP - get().dailyPostsCount);
      },

      remainingRepliesToday: () => {
        get().resetDailyIfNeeded();
        return Math.max(0, DAILY_REPLY_CAP - get().dailyRepliesCount);
      },

      getUnseenReplyPostIds: () => get().unseenReplyPostIds,

      getWeeklyCommunityStats: () => {
        const state = get();
        const posts = state.posts.filter(
          (p) => p.isSelf && p.status === 'approved' && withinLastWeek(p.createdAt),
        ).length;
        const replies = state.replies.filter(
          (r) => r.isSelf && withinLastWeek(r.createdAt),
        ).length;
        const coinsEarned = state.adviceCoinLedger.reduce(
          (sum, e) => (withinLastWeek(e.at) ? sum + e.coins : sum),
          0,
        );
        return { posts, replies, coinsEarned };
      },

      resetDailyIfNeeded: () => {
        const today = todayISO();
        if (get().dailyLimitDate !== today) {
          set({ dailyPostsCount: 0, dailyRepliesCount: 0, dailyLimitDate: today });
        }
      },

      submitPost: (input) => {
        const alias = get().ensureSelfAlias();
        const post: AnonAdvicePost = {
          id: makeId('post'),
          alias,
          isSelf: true,
          situation: input.situation,
          question: input.question,
          options: input.options.filter((o) => o.trim().length > 0),
          tags: input.tags ?? [],
          imageUri: input.imageUri,
          createdAt: new Date().toISOString(),
          replyCount: 0,
          optionVotes: [0, 0],
          status: input.status,
          rejectionReason: input.rejectionReason,
        };

        set((state) => ({ posts: [post, ...state.posts] }));

        // No reward unless approved & under daily cap
        if (input.status !== 'approved') {
          return { post, reward: null };
        }

        get().resetDailyIfNeeded();
        if (get().dailyPostsCount >= DAILY_POST_CAP) {
          return { post, reward: null };
        }

        const isFirstPost = !get().firstPostBonusGiven;
        const bonusCoins = isFirstPost ? FIRST_POST_BONUS_COINS : 0;
        const totalCoins = REWARD_POST_COINS + bonusCoins;

        set((state) => ({
          dailyPostsCount: state.dailyPostsCount + 1,
          firstPostBonusGiven: state.firstPostBonusGiven || isFirstPost,
        }));

        // Apply economy reward via cross-store require()
        try {
          const economyMod = require('../economy/useEconomyUIStore');
          economyMod.useEconomyUIStore.getState().addCoins(totalCoins);
          economyMod.useEconomyUIStore.getState().addXP(REWARD_POST_XP, 'challenge_complete');
        } catch {
          /* economy store unavailable — silently skip */
        }

        // A5 — record the real coins earned so the weekly summary can sum them.
        set((state) => ({
          adviceCoinLedger: [...state.adviceCoinLedger, { at: new Date().toISOString(), coins: totalCoins }],
        }));

        return {
          post,
          reward: { coins: totalCoins, xp: REWARD_POST_XP, firstBonus: isFirstPost },
        };
      },

      submitReply: (input) => {
        const body = input.body.trim();
        if (!body) return null;

        const alias = get().ensureSelfAlias();
        const reply: AnonAdviceReply = {
          id: makeId('reply'),
          postId: input.postId,
          alias,
          isSelf: true,
          body,
          agreedWith: input.agreedWith,
          createdAt: new Date().toISOString(),
        };

        set((state) => {
          const newReplies = [...state.replies, reply];
          const newPosts = state.posts.map((p) => {
            if (p.id !== input.postId) return p;
            const newOptionVotes = [...p.optionVotes];
            if (input.agreedWith !== undefined) {
              newOptionVotes[input.agreedWith] = (newOptionVotes[input.agreedWith] ?? 0) + 1;
            }
            return { ...p, replyCount: p.replyCount + 1, optionVotes: newOptionVotes };
          });
          return { replies: newReplies, posts: newPosts };
        });

        // Award post-author XP if the post belongs to self (always — no daily cap on receiving)
        const parentPost = get().posts.find((p) => p.id === input.postId);
        if (parentPost?.isSelf) {
          try {
            const economyMod = require('../economy/useEconomyUIStore');
            economyMod.useEconomyUIStore.getState().addXP(POST_AUTHOR_REPLY_XP, 'challenge_complete');
          } catch { /* skip */ }

          // A4 — only a genuine INBOUND reply (someone else, not the author) counts
          // as "יש תגובה חדשה לשאלה שלך". A self-reply on your own post never does.
          // Stays dormant/honest until real external replies exist (server graph).
          if (!reply.isSelf) {
            set((state) => ({
              unseenReplyPostIds: state.unseenReplyPostIds.includes(parentPost.id)
                ? state.unseenReplyPostIds
                : [...state.unseenReplyPostIds, parentPost.id],
            }));
          }
        }

        // Reply reward — eligibility checks
        if (body.length < MIN_REPLY_LENGTH_FOR_REWARD) {
          return { reply, reward: null };
        }
        get().resetDailyIfNeeded();
        if (get().dailyRepliesCount >= DAILY_REPLY_CAP) {
          return { reply, reward: null };
        }
        // Anti-double: only first reply per post counts
        if (get().replyRewardsClaimed.includes(input.postId)) {
          return { reply, reward: null };
        }
        // Don't reward replies on your own post (prevents self-farming)
        if (parentPost?.isSelf) {
          return { reply, reward: null };
        }

        const voteBonus = input.agreedWith !== undefined ? REWARD_REPLY_VOTE_BONUS_COINS : 0;
        const coins = REWARD_REPLY_COINS + voteBonus;

        set((state) => ({
          dailyRepliesCount: state.dailyRepliesCount + 1,
          replyRewardsClaimed: [...state.replyRewardsClaimed, input.postId],
        }));

        try {
          const economyMod = require('../economy/useEconomyUIStore');
          economyMod.useEconomyUIStore.getState().addCoins(coins);
          economyMod.useEconomyUIStore.getState().addXP(REWARD_REPLY_XP, 'challenge_complete');
        } catch { /* skip */ }

        // A5 — record the real coins earned so the weekly summary can sum them.
        set((state) => ({
          adviceCoinLedger: [...state.adviceCoinLedger, { at: new Date().toISOString(), coins }],
        }));

        return { reply, reward: { coins, xp: REWARD_REPLY_XP } };
      },

      toggleReplyUpvote: (replyId) => {
        const alreadyUpvoted = get().upvotedReplyIds.includes(replyId);
        set((state) => ({
          upvotedReplyIds: alreadyUpvoted
            ? state.upvotedReplyIds.filter((id) => id !== replyId)
            : [...state.upvotedReplyIds, replyId],
          replies: state.replies.map((r) => {
            if (r.id !== replyId) return r;
            const current = r.upvotes ?? 0;
            return { ...r, upvotes: Math.max(0, current + (alreadyUpvoted ? -1 : 1)) };
          }),
        }));
      },

      togglePostLike: (postId) => {
        const alreadyLiked = get().likedPostIds.includes(postId);
        set((state) => {
          const current = state.postLikes[postId] ?? 0;
          const nextCount = Math.max(0, current + (alreadyLiked ? -1 : 1));
          return {
            likedPostIds: alreadyLiked
              ? state.likedPostIds.filter((id) => id !== postId)
              : [...state.likedPostIds, postId],
            postLikes: { ...state.postLikes, [postId]: nextCount },
          };
        });
      },

      votePostOption: (postId, optionIndex) => {
        set((state) => ({
          posts: state.posts.map((p) => {
            if (p.id !== postId) return p;
            const newVotes = [...p.optionVotes];
            newVotes[optionIndex] = (newVotes[optionIndex] ?? 0) + 1;
            return { ...p, optionVotes: newVotes };
          }),
        }));
      },

      markRepliesSeen: (postId) => {
        if (!get().unseenReplyPostIds.includes(postId)) return;
        set((state) => ({
          unseenReplyPostIds: state.unseenReplyPostIds.filter((id) => id !== postId),
        }));
      },
    }),
    {
      name: 'anon-advice-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        posts: state.posts,
        replies: state.replies,
        selfAlias: state.selfAlias,
        dailyPostsCount: state.dailyPostsCount,
        dailyRepliesCount: state.dailyRepliesCount,
        dailyLimitDate: state.dailyLimitDate,
        replyRewardsClaimed: state.replyRewardsClaimed,
        firstPostBonusGiven: state.firstPostBonusGiven,
        upvotedReplyIds: state.upvotedReplyIds,
        likedPostIds: state.likedPostIds,
        postLikes: state.postLikes,
        unseenReplyPostIds: state.unseenReplyPostIds,
        adviceCoinLedger: state.adviceCoinLedger,
        votedOptionByPost: state.votedOptionByPost,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (!Array.isArray(state.replyRewardsClaimed)) state.replyRewardsClaimed = [];
        if (!Array.isArray(state.upvotedReplyIds)) state.upvotedReplyIds = [];
        if (!Array.isArray(state.likedPostIds)) state.likedPostIds = [];
        if (!Array.isArray(state.unseenReplyPostIds)) state.unseenReplyPostIds = [];
        if (!Array.isArray(state.adviceCoinLedger)) state.adviceCoinLedger = [];
        if (state.postLikes === null || typeof state.postLikes !== 'object' || Array.isArray(state.postLikes)) {
          state.postLikes = {};
        }
        if (typeof state.firstPostBonusGiven !== 'boolean') state.firstPostBonusGiven = false;
        if (typeof state.dailyPostsCount !== 'number') state.dailyPostsCount = 0;
        if (typeof state.dailyRepliesCount !== 'number') state.dailyRepliesCount = 0;
        if (state.votedOptionByPost === null || typeof state.votedOptionByPost !== 'object' || Array.isArray(state.votedOptionByPost)) {
          state.votedOptionByPost = {};
        }
        // P0-5: NO re-seed. Posts/replies come only from real data (isSelf/server).
        if (!Array.isArray(state.posts)) state.posts = [];
        if (!Array.isArray(state.replies)) state.replies = [];
      },
    }
  )
);