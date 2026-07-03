import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronRight, ChevronLeft, Search, X, Gift } from 'lucide-react-native';
import { AvatarImage } from '../avatars/AvatarImage';
import { tapHaptic } from '../../utils/haptics';
import { useFriendsStore } from './useFriendsStore';
import { useAuthStore } from '../auth/useAuthStore';
import { requestGuestGate } from '../auth/guestValueGate';
import { tokenStore } from '../../lib/auth/secureStore';
import { searchUsers, type UserSearchResult } from '../../db/sync/searchUsers';
import type { FriendView, FriendRequestView } from '../../db/sync/syncFriends';

/** Minimum characters before we hit the directory search endpoint. */
const MIN_QUERY_LEN = 2;
/** Debounce window for the search input, in ms. */
const SEARCH_DEBOUNCE_MS = 350;

const COLORS = {
  bg: '#f3f4f6',
  card: '#ffffff',
  text: '#1f2937',
  muted: '#6b7280',
  blue: '#1877f2',
  border: '#e5e7eb',
  danger: '#ef4444',
  pendingBg: '#e5e7eb',
} as const;

interface GraphFriendRowProps {
  friend: FriendView;
  onRemove: (id: string) => void;
}

/** Accepted-friend row (server graph): avatar + name + level, "הסרה" button.
 *  Only privacy-safe fields — never coins/PII of другого user. */
function GraphFriendRow({ friend, onRemove }: GraphFriendRowProps): React.ReactElement {
  return (
    <View
      style={{
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 12,
        marginBottom: 8,
      }}
    >
      <AvatarImage avatarId={friend.avatarUrl} size={48} />
      <View style={{ flex: 1 }}>
        <Text
          maxFontSizeMultiplier={1.2}
          style={{
            fontSize: 15,
            fontWeight: '800',
            color: COLORS.text,
            writingDirection: 'rtl',
            textAlign: 'right',
          }}
        >
          {friend.displayName}
        </Text>
        <Text
          maxFontSizeMultiplier={1.2}
          style={{
            fontSize: 12,
            color: COLORS.muted,
            writingDirection: 'rtl',
            textAlign: 'right',
            marginTop: 2,
          }}
        >
          רמה {friend.level}
        </Text>
      </View>
      <Pressable
        onPress={() => onRemove(friend.id)}
        accessibilityRole="button"
        accessibilityLabel={`הסרה של ${friend.displayName} מהחברים`}
        hitSlop={8}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: COLORS.border,
          backgroundColor: COLORS.bg,
        }}
      >
        <Text maxFontSizeMultiplier={1.15} style={{ fontSize: 12, fontWeight: '700', color: COLORS.muted }}>
          הסרה
        </Text>
      </Pressable>
    </View>
  );
}

/** Incoming friend-request row: name + accept/decline. */
function IncomingRequestRow({
  request,
  onRespond,
}: {
  request: FriendRequestView;
  onRespond: (requestId: string, accept: boolean) => void;
}): React.ReactElement {
  return (
    <View
      style={{
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#bfdbfe',
      }}
    >
      <AvatarImage avatarId={request.avatarUrl} size={48} />
      <View style={{ flex: 1 }}>
        <Text
          maxFontSizeMultiplier={1.2}
          style={{ fontSize: 15, fontWeight: '800', color: COLORS.text, writingDirection: 'rtl', textAlign: 'right' }}
        >
          {request.displayName}
        </Text>
        <Text
          maxFontSizeMultiplier={1.2}
          style={{ fontSize: 12, color: COLORS.muted, writingDirection: 'rtl', textAlign: 'right', marginTop: 2 }}
        >
          רוצה להיות חבר · רמה {request.level}
        </Text>
      </View>
      <Pressable
        onPress={() => onRespond(request.requestId, true)}
        accessibilityRole="button"
        accessibilityLabel={`אישור בקשת החברות של ${request.displayName}`}
        hitSlop={8}
        style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: COLORS.blue }}
      >
        <Text maxFontSizeMultiplier={1.15} style={{ fontSize: 12, fontWeight: '800', color: '#ffffff' }}>
          אישור
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onRespond(request.requestId, false)}
        accessibilityRole="button"
        accessibilityLabel={`דחיית בקשת החברות של ${request.displayName}`}
        hitSlop={8}
        style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border }}
      >
        <Text maxFontSizeMultiplier={1.15} style={{ fontSize: 12, fontWeight: '700', color: COLORS.muted }}>
          דחייה
        </Text>
      </Pressable>
    </View>
  );
}

interface UserResultRowProps {
  user: UserSearchResult;
  pending: boolean;
  /** Already an accepted friend — renders a quiet "חברים" chip, no button. */
  isFriend?: boolean;
  onAdd: (id: string) => void;
}

/**
 * Directory search-result row for a REAL registered user. Renders only real,
 * privacy-safe fields returned by /api/users/search — display name + level +
 * (optional) avatar. NO coins/title/room (those would be fabricated). Blue
 * "הוספה" flips to "נשלחה בקשה" once a request is sent.
 */
function UserResultRow({ user, pending, isFriend, onAdd }: UserResultRowProps): React.ReactElement {
  return (
    <View
      style={{
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 12,
        marginBottom: 8,
      }}
    >
      <AvatarImage avatarId={user.avatarUrl} size={48} />
      <View style={{ flex: 1 }}>
        <Text
          maxFontSizeMultiplier={1.2}
          style={{
            fontSize: 15,
            fontWeight: '800',
            color: COLORS.text,
            writingDirection: 'rtl',
            textAlign: 'right',
          }}
        >
          {user.displayName}
        </Text>
        <Text
          maxFontSizeMultiplier={1.2}
          style={{
            fontSize: 12,
            color: COLORS.muted,
            writingDirection: 'rtl',
            textAlign: 'right',
            marginTop: 2,
          }}
        >
          רמה {user.level}
        </Text>
      </View>
      {isFriend ? (
        <View
          style={{
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 12,
            backgroundColor: '#dcfce7',
          }}
          accessible
          accessibilityLabel={`${user.displayName} כבר ברשימת החברים`}
        >
          <Text maxFontSizeMultiplier={1.15} style={{ fontSize: 12, fontWeight: '700', color: '#15803d' }}>
            חברים ✓
          </Text>
        </View>
      ) : pending ? (
        <View
          style={{
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 12,
            backgroundColor: COLORS.pendingBg,
          }}
          accessible
          accessibilityLabel={`בקשת חברות ל${user.displayName} נשלחה`}
        >
          <Text maxFontSizeMultiplier={1.15} style={{ fontSize: 12, fontWeight: '700', color: COLORS.muted }}>
            נשלחה בקשה
          </Text>
        </View>
      ) : (
        <Pressable
          onPress={() => onAdd(user.id)}
          accessibilityRole="button"
          accessibilityLabel={`הוספת ${user.displayName} לחברים`}
          hitSlop={8}
          style={{
            paddingHorizontal: 18,
            paddingVertical: 8,
            borderRadius: 12,
            backgroundColor: COLORS.blue,
          }}
        >
          <Text maxFontSizeMultiplier={1.15} style={{ fontSize: 12, fontWeight: '800', color: '#ffffff' }}>
            הוספה
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/** Loading card shown while the directory search is in flight. */
function LoadingCard(): React.ReactElement {
  return (
    <View
      style={{
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 8,
      }}
    >
      <ActivityIndicator size="small" color={COLORS.blue} />
      <Text
        maxFontSizeMultiplier={1.3}
        style={{
          fontSize: 14,
          fontWeight: '700',
          color: COLORS.muted,
          writingDirection: 'rtl',
          textAlign: 'right',
        }}
      >
        מחפשים…
      </Text>
    </View>
  );
}

/** Section heading — bold, RTL, optional real count. */
function SectionTitle({ title, count }: { title: string; count?: number }): React.ReactElement {
  return (
    <Text
      maxFontSizeMultiplier={1.2}
      style={{
        fontSize: 15,
        fontWeight: '900',
        color: COLORS.text,
        writingDirection: 'rtl',
        textAlign: 'right',
        marginBottom: 10,
      }}
    >
      {typeof count === 'number' && count > 0 ? `${title} (${count})` : title}
    </Text>
  );
}

/** Honest empty-state card — warm line + optional muted sub-line. No fabricated names/counts. */
function EmptyCard({ title, subtitle }: { title: string; subtitle?: string }): React.ReactElement {
  return (
    <View
      style={{
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 8,
      }}
    >
      <Text
        maxFontSizeMultiplier={1.3}
        style={{
          fontSize: 14,
          fontWeight: '700',
          color: COLORS.text,
          writingDirection: 'rtl',
          textAlign: 'right',
        }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          maxFontSizeMultiplier={1.3}
          style={{
            fontSize: 12.5,
            color: COLORS.muted,
            writingDirection: 'rtl',
            textAlign: 'right',
            marginTop: 6,
            lineHeight: 18,
          }}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function FriendsScreen(): React.ReactElement {
  // SERVER-BACKED graph (2026-07-03): friends/incoming/outgoing come from
  // /api/friends/graph — the audit's #1 broken finding was the old local
  // no-op store ("הוספה" did nothing). Arrays are stable store refs.
  const graphFriends = useFriendsStore((s) => s.friends);
  const incoming = useFriendsStore((s) => s.incoming);
  const outgoing = useFriendsStore((s) => s.outgoing);
  const graphLoaded = useFriendsStore((s) => s.loaded);
  const refreshGraph = useFriendsStore((s) => s.refresh);
  const requestFriend = useFriendsStore((s) => s.request);
  const respondRequest = useFriendsStore((s) => s.respond);
  const removeFriend = useFriendsStore((s) => s.removeFriend);
  const isGuest = useAuthStore((s) => s.isGuest);

  // The caller's identity for the authed directory search. Email is the real
  // cross-user key (auth_id) — same shape placeBet uses.
  const authId = useAuthStore((s) => s.email ?? 'guest');

  const [search, setSearch] = useState('');

  // Load the real graph on mount (guests resolve to an honest empty state).
  useEffect(() => {
    void refreshGraph();
  }, [refreshGraph]);

  // Real directory-search state (results come from /api/users/search — never
  // fabricated). `requestedIds` tracks add-buttons pressed this session so the
  // row optimistically flips to "נשלחה בקשה".
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [userResults, setUserResults] = useState<UserSearchResult[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(() => new Set());
  const searchSeqRef = useRef(0);

  const query = search.trim();
  const isSearching = query.length > 0;

  // Real accepted friends (server graph) — never fabricated.
  const hasAnyFriends = graphFriends.length > 0;

  // Friends filtered by the live query (so search narrows the list too).
  const matchingFriends = useMemo(
    () =>
      !isSearching
        ? graphFriends
        : graphFriends.filter((p) => p.displayName.includes(query)),
    [graphFriends, query, isSearching]
  );

  /** Search-result relationship state: hides "הוספה" when already sent/friends. */
  const outgoingIds = useMemo(() => new Set(outgoing.map((r) => r.id)), [outgoing]);
  const friendIdsSet = useMemo(() => new Set(graphFriends.map((f) => f.id)), [graphFriends]);

  const tooShort = isSearching && query.length < MIN_QUERY_LEN;

  // Debounce the raw input into the query we actually search on. Below the
  // min length we short-circuit to an empty debounced query (no request).
  useEffect(() => {
    if (query.length < MIN_QUERY_LEN) {
      setDebouncedQuery('');
      return;
    }
    setIsSearchLoading(true);
    const timer = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch real users for the debounced query. A monotonically increasing seq
  // guards against out-of-order responses (last query typed always wins).
  useEffect(() => {
    if (debouncedQuery.length < MIN_QUERY_LEN) {
      setUserResults([]);
      setIsSearchLoading(false);
      setSearchFailed(false);
      return;
    }
    let active = true;
    const seq = ++searchSeqRef.current;
    setIsSearchLoading(true);
    setSearchFailed(false);
    void (async () => {
      try {
        const syncToken = await tokenStore.get();
        const found = await searchUsers({ query: debouncedQuery, authId, syncToken });
        if (!active || seq !== searchSeqRef.current) return;
        setUserResults(found);
      } catch {
        if (!active || seq !== searchSeqRef.current) return;
        setUserResults([]);
        setSearchFailed(true);
      } finally {
        if (active && seq === searchSeqRef.current) setIsSearchLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [debouncedQuery, authId]);

  // Befriend a real user from the directory — a REAL server request now
  // (friendships table). Guests hit the register gate instead (friendship is
  // keyed to an account). Optimistic session state keeps the button flipped
  // while the server round-trip completes; the store's outgoing list is the
  // durable truth across visits.
  const handleAddUser = useCallback(
    (id: string): void => {
      tapHaptic();
      if (useAuthStore.getState().isGuest) {
        requestGuestGate('friend_request');
        return;
      }
      const user = userResults.find((u) => u.id === id);
      if (!user) return;
      setRequestedIds((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      void requestFriend({
        id: user.id,
        displayName: user.displayName,
        level: user.level,
        avatarUrl: user.avatarUrl,
      });
    },
    [requestFriend, userResults]
  );

  const handleRemove = (id: string): void => {
    tapHaptic();
    void removeFriend(id);
  };

  const handleRespond = useCallback(
    (requestId: string, accept: boolean): void => {
      tapHaptic();
      void respondRequest(requestId, accept);
    },
    [respondRequest]
  );

  const handleClearSearch = (): void => {
    tapHaptic();
    setSearch('');
  };

  const handleOpenReferral = (): void => {
    tapHaptic();
    router.push('/referral' as never);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={['top']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: COLORS.card,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
        }}
      >
        <Pressable
          onPress={() => {
            tapHaptic();
            router.replace('/(tabs)/friends' as never);
          }}
          accessibilityRole="button"
          accessibilityLabel="חזרה"
          hitSlop={12}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: COLORS.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronRight size={20} color={COLORS.text} />
        </Pressable>
        <Text
          maxFontSizeMultiplier={1.2}
          style={{
            flex: 1,
            fontSize: 18,
            fontWeight: '900',
            color: COLORS.text,
            writingDirection: 'rtl',
            textAlign: 'right',
          }}
        >
          החברים שלך
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Prominent search bar */}
        <View
          style={{
            flexDirection: 'row-reverse',
            alignItems: 'center',
            gap: 10,
            backgroundColor: COLORS.card,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: COLORS.border,
            paddingHorizontal: 16,
            paddingVertical: 4,
            marginBottom: 14,
          }}
        >
          <Search size={18} color={COLORS.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="חפשו חבר לפי שם…"
            placeholderTextColor={COLORS.muted}
            accessibilityLabel="חיפוש חבר לפי שם"
            returnKeyType="search"
            autoCorrect={false}
            maxFontSizeMultiplier={1.3}
            style={{
              flex: 1,
              paddingVertical: 10,
              fontSize: 15,
              color: COLORS.text,
              writingDirection: 'rtl',
              textAlign: 'right',
            }}
          />
          {isSearching ? (
            <Pressable
              onPress={handleClearSearch}
              accessibilityRole="button"
              accessibilityLabel="ניקוי החיפוש"
              hitSlop={10}
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: COLORS.bg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={14} color={COLORS.muted} />
            </Pressable>
          ) : null}
        </View>

        {/* Referral CTA — a SEPARATE option: invite brand-new users to the app */}
        <Pressable
          onPress={handleOpenReferral}
          accessibilityRole="button"
          accessibilityLabel="הזמינו חברים חדשים לאפליקציה"
          style={{
            flexDirection: 'row-reverse',
            alignItems: 'center',
            gap: 12,
            backgroundColor: COLORS.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            padding: 12,
            marginBottom: 22,
          }}
        >
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: '#e7f0ff',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Gift size={20} color={COLORS.blue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              maxFontSizeMultiplier={1.2}
              style={{
                fontSize: 14.5,
                fontWeight: '800',
                color: COLORS.text,
                writingDirection: 'rtl',
                textAlign: 'right',
              }}
            >
              הזמינו חברים חדשים לאפליקציה
            </Text>
            <Text
              maxFontSizeMultiplier={1.2}
              style={{
                fontSize: 12,
                color: COLORS.muted,
                writingDirection: 'rtl',
                textAlign: 'right',
                marginTop: 2,
              }}
            >
              מכירים מישהו שעוד לא כאן? הביאו אותו למים.
            </Text>
          </View>
          <ChevronLeft size={20} color={COLORS.muted} />
        </Pressable>

        {/* Search results — real registered users from the directory. */}
        {isSearching ? (
          <View style={{ marginBottom: 22 }}>
            <SectionTitle title="תוצאות חיפוש" />
            {tooShort ? (
              <EmptyCard title="הקלידו לפחות 2 תווים כדי לחפש" />
            ) : isSearchLoading ? (
              <LoadingCard />
            ) : searchFailed ? (
              <EmptyCard
                title="החיפוש נתקל בבעיה"
                subtitle="בדקו את החיבור ונסו שוב."
              />
            ) : userResults.length === 0 ? (
              <EmptyCard
                title="לא נמצאו משתמשים בשם הזה"
                subtitle="נסו שם אחר, או הזמינו חברים חדשים לאפליקציה למעלה."
              />
            ) : (
              userResults.map((user) => (
                <UserResultRow
                  key={user.id}
                  user={user}
                  pending={requestedIds.has(user.id) || outgoingIds.has(user.id)}
                  isFriend={friendIdsSet.has(user.id)}
                  onAdd={handleAddUser}
                />
              ))
            )}
          </View>
        ) : null}

        {/* Incoming friend requests — real pending rows from the server graph. */}
        {incoming.length > 0 ? (
          <View style={{ marginBottom: 22 }}>
            <SectionTitle title="בקשות חברות" count={incoming.length} />
            {incoming.map((request) => (
              <IncomingRequestRow key={request.requestId} request={request} onRespond={handleRespond} />
            ))}
          </View>
        ) : null}

        {/* Your friends — real accepted friends only (server graph) */}
        <SectionTitle title="החברים שלך" count={graphFriends.length} />
        {!graphLoaded ? (
          <LoadingCard />
        ) : !hasAnyFriends ? (
          <EmptyCard
            title={isGuest ? 'הירשמו כדי להוסיף חברים' : 'עוד אין לכם חברים — חפשו ותוסיפו את הראשונים'}
            subtitle={
              isGuest
                ? 'רשימת החברים נשמרת בחשבון — הירשמו וכל מה שצברתם יישמר.'
                : 'חפשו חבר למעלה לפי שם, או הזמינו חברים חדשים לאפליקציה.'
            }
          />
        ) : matchingFriends.length === 0 ? (
          <EmptyCard title="אין חבר בשם הזה ברשימה שלכם" />
        ) : (
          matchingFriends.map((friend) => (
            <GraphFriendRow key={friend.id} friend={friend} onRemove={handleRemove} />
          ))
        )}
      </ScrollView>

    </SafeAreaView>
  );
}
