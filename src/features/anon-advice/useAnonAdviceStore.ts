import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import type { AnonAdvicePost, AnonAdviceReply, AnonAlias, ModerationStatus } from './anonAdviceTypes';
import {
  SEED_POSTS,
  SEED_REPLIES,
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

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
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
  toggleReplyUpvote: (replyId: string) => void;
  togglePostLike: (postId: string) => void;
  resetDailyIfNeeded: () => void;
}

export const useAnonAdviceStore = create<AnonAdviceState>()(
  persist(
    (set, get) => ({
      posts: SEED_POSTS,
      replies: SEED_REPLIES,
      selfAlias: null,
      dailyPostsCount: 0,
      dailyRepliesCount: 0,
      dailyLimitDate: null,
      replyRewardsClaimed: [],
      firstPostBonusGiven: false,
      upvotedReplyIds: [],
      likedPostIds: [],
      postLikes: {},

      getPosts: () => {
        return [...get().posts]
          .filter((p) => p.status === 'approved')
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (!Array.isArray(state.replyRewardsClaimed)) state.replyRewardsClaimed = [];
        if (!Array.isArray(state.upvotedReplyIds)) state.upvotedReplyIds = [];
        if (!Array.isArray(state.likedPostIds)) state.likedPostIds = [];
        if (state.postLikes === null || typeof state.postLikes !== 'object' || Array.isArray(state.postLikes)) {
          state.postLikes = {};
        }
        if (typeof state.firstPostBonusGiven !== 'boolean') state.firstPostBonusGiven = false;
        if (typeof state.dailyPostsCount !== 'number') state.dailyPostsCount = 0;
        if (typeof state.dailyRepliesCount !== 'number') state.dailyRepliesCount = 0;
        // Ensure seeds exist (first-time install or after data wipe)
        if (!Array.isArray(state.posts) || state.posts.length === 0) {
          state.posts = SEED_POSTS;
          state.replies = SEED_REPLIES;
        }
      },
    }
  )
);