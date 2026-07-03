import { create } from 'zustand';
import { useAuthStore } from '../auth/useAuthStore';
import { tokenStore } from '../../lib/auth/secureStore';
import { captureEvent } from '../../lib/posthog';
import {
  fetchFriendGraph,
  sendFriendRequestApi,
  respondFriendRequestApi,
  removeFriendApi,
  type FriendView,
  type FriendRequestView,
} from '../../db/sync/syncFriends';

/**
 * SERVER-BACKED friend graph (Yoav 2026-07-03: "הוסף חבר" must actually work).
 * Replaces the old local store whose sendFriendRequest was a guaranteed no-op
 * (it only accepted ids from the permanently-empty FRIEND_PROFILES list — the
 * 2026-07-03 audit's #1 broken finding). The server (/api/friends/graph +
 * friendships table) is the single source of truth; this store is a thin
 * client cache with optimistic outgoing state. NOT persisted — refresh() runs
 * on every friends-screen mount, and stale friendship state is worse than a
 * short spinner. Guests have no graph (friendship requires an account) — the
 * screen gates them via requestGuestGate.
 */
interface FriendsState {
  friends: FriendView[];
  incoming: FriendRequestView[];
  outgoing: FriendRequestView[];
  loading: boolean;
  /** True once a refresh() has completed (success OR failure) — lets the UI
   *  distinguish "loading" from a real, honest empty state. */
  loaded: boolean;
  refresh: () => Promise<void>;
  /** Send a request to a directory-search result. Optimistic: the target id is
   *  added to `outgoing` immediately; a failed call rolls it back. Returns the
   *  server state ('pending' | 'friends') or null on failure/guest. */
  request: (target: FriendView) => Promise<'pending' | 'friends' | null>;
  respond: (requestId: string, accept: boolean) => Promise<void>;
  removeFriend: (targetUserId: string) => Promise<void>;
}

async function authArgs(): Promise<{ authId: string; syncToken: string | null } | null> {
  const auth = useAuthStore.getState();
  if (auth.isGuest || !auth.email) return null;
  const syncToken = await tokenStore.get();
  return { authId: auth.email, syncToken };
}

export const useFriendsStore = create<FriendsState>()((set, get) => ({
  friends: [],
  incoming: [],
  outgoing: [],
  loading: false,
  loaded: false,

  refresh: async () => {
    const args = await authArgs();
    if (!args) {
      set({ friends: [], incoming: [], outgoing: [], loading: false, loaded: true });
      return;
    }
    if (get().loading) return;
    set({ loading: true });
    try {
      const graph = await fetchFriendGraph(args);
      set({ ...graph, loading: false, loaded: true });
    } catch {
      // Keep whatever we had; the screen shows its own retry affordance.
      set({ loading: false, loaded: true });
    }
  },

  request: async (target) => {
    const args = await authArgs();
    if (!args) return null;
    // Optimistic: show the pending chip immediately.
    const prev = get().outgoing;
    if (!prev.some((r) => r.id === target.id) && !get().friends.some((f) => f.id === target.id)) {
      set({ outgoing: [...prev, { ...target, requestId: `optimistic-${target.id}` }] });
    }
    try {
      const state = await sendFriendRequestApi({ ...args, targetUserId: target.id });
      try { captureEvent('friend_request_sent', { result: state }); } catch { /* non-fatal */ }
      // Pull the truth (also picks up an instant mutual-accept). Fire-and-forget.
      void get().refresh();
      return state === 'friends' ? 'friends' : 'pending';
    } catch {
      set({ outgoing: get().outgoing.filter((r) => r.id !== target.id) });
      return null;
    }
  },

  respond: async (requestId, accept) => {
    const args = await authArgs();
    if (!args) return;
    // Optimistic: move/remove the incoming row immediately.
    const row = get().incoming.find((r) => r.requestId === requestId);
    set({ incoming: get().incoming.filter((r) => r.requestId !== requestId) });
    if (row && accept) set({ friends: [...get().friends, row] });
    try {
      await respondFriendRequestApi({ ...args, requestId, accept });
      try { captureEvent('friend_request_responded', { accepted: accept }); } catch { /* non-fatal */ }
    } catch {
      /* refresh() below restores the truth on failure */
    }
    void get().refresh();
  },

  removeFriend: async (targetUserId) => {
    const args = await authArgs();
    if (!args) return;
    set({
      friends: get().friends.filter((f) => f.id !== targetUserId),
      outgoing: get().outgoing.filter((r) => r.id !== targetUserId),
    });
    try {
      await removeFriendApi({ ...args, targetUserId });
    } catch {
      /* refresh restores the truth */
    }
    void get().refresh();
  },
}));
