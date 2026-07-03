import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronRight, ChevronLeft, Search, X, Gift } from 'lucide-react-native';
import { useShallow } from 'zustand/react/shallow';
import { AvatarImage } from '../avatars/AvatarImage';
import { tapHaptic } from '../../utils/haptics';
import { useFriendsStore } from './useFriendsStore';
import { FRIEND_PROFILES } from './friendsData';
import type { CommunityProfile } from './friendsTypes';

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

function formatCoins(coins: number): string {
  return coins.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

interface ProfileRowProps {
  profile: CommunityProfile;
  onOpen: (id: string) => void;
  onPrimaryAction: (id: string) => void;
}

/** Friend row: avatar + name + level + coins, small "הסרה" button. */
function FriendRow({ profile, onOpen, onPrimaryAction }: ProfileRowProps): React.ReactElement {
  return (
    <Pressable
      onPress={() => onOpen(profile.id)}
      accessibilityRole="button"
      accessibilityLabel={`פרופיל של ${profile.name}`}
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
      <AvatarImage avatarId={profile.avatarId} size={48} />
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
          {profile.name} · {profile.title}
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
          רמה {profile.level} · {formatCoins(profile.coinsWon)} מטבעות
        </Text>
      </View>
      <Pressable
        onPress={() => onPrimaryAction(profile.id)}
        accessibilityRole="button"
        accessibilityLabel={`הסרה של ${profile.name} מהחברים`}
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
    </Pressable>
  );
}

/** Search-result row: avatar + name + level + coins, blue "הוספה" / "נשלחה בקשה". */
function ResultRow({ profile, onOpen, onPrimaryAction }: ProfileRowProps): React.ReactElement {
  return (
    <Pressable
      onPress={() => onOpen(profile.id)}
      accessibilityRole="button"
      accessibilityLabel={`פרופיל של ${profile.name}`}
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
      <AvatarImage avatarId={profile.avatarId} size={48} />
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
          {profile.name} · {profile.title}
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
          רמה {profile.level} · {formatCoins(profile.coinsWon)} מטבעות
        </Text>
      </View>
      {profile.requestPending ? (
        <View
          style={{
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 12,
            backgroundColor: COLORS.pendingBg,
          }}
          accessible
          accessibilityLabel={`בקשת חברות ל${profile.name} נשלחה`}
        >
          <Text maxFontSizeMultiplier={1.15} style={{ fontSize: 12, fontWeight: '700', color: COLORS.muted }}>
            נשלחה בקשה
          </Text>
        </View>
      ) : (
        <Pressable
          onPress={() => onPrimaryAction(profile.id)}
          accessibilityRole="button"
          accessibilityLabel={`הוספת ${profile.name} לחברים`}
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
    </Pressable>
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
  const { friendIds, pendingIds } = useFriendsStore(
    useShallow((s) => ({ friendIds: s.friendIds, pendingIds: s.pendingIds }))
  );
  const sendFriendRequest = useFriendsStore((s) => s.sendFriendRequest);
  const removeFriend = useFriendsStore((s) => s.removeFriend);

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const profiles: CommunityProfile[] = useMemo(
    () =>
      FRIEND_PROFILES.map((profile) => ({
        ...profile,
        isFriend: friendIds.includes(profile.id),
        requestPending: pendingIds.includes(profile.id),
      })),
    [friendIds, pendingIds]
  );

  const query = search.trim();
  const isSearching = query.length > 0;

  // Real accepted friends (from the store) — never fabricated.
  const friends = useMemo(() => profiles.filter((p) => p.isFriend), [profiles]);
  const hasAnyFriends = friends.length > 0;

  // Friends filtered by the live query (so search narrows the list too).
  const matchingFriends = useMemo(
    () =>
      !isSearching
        ? friends
        : friends.filter((p) => p.name.includes(query) || p.title.includes(query)),
    [friends, query, isSearching]
  );

  // Directory results = real, non-friend profiles matching the query. Empty
  // today (FRIEND_PROFILES = []) — the honest empty state below reflects that.
  const results = useMemo(
    () =>
      !isSearching
        ? []
        : profiles.filter(
            (p) => !p.isFriend && (p.name.includes(query) || p.title.includes(query))
          ),
    [profiles, query, isSearching]
  );

  const selectedProfile = selectedId
    ? profiles.find((p) => p.id === selectedId) ?? null
    : null;

  const handleSendRequest = (id: string): void => {
    tapHaptic();
    sendFriendRequest(id);
  };

  const handleRemove = (id: string): void => {
    tapHaptic();
    removeFriend(id);
  };

  const handleOpenProfile = (id: string): void => {
    tapHaptic();
    setSelectedId(id);
  };

  const handleClearSearch = (): void => {
    tapHaptic();
    setSearch('');
  };

  const handleOpenReferral = (): void => {
    tapHaptic();
    router.push('/referral' as never);
  };

  const closeModal = (): void => setSelectedId(null);

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

        {/* Search results — only while searching */}
        {isSearching ? (
          <View style={{ marginBottom: 22 }}>
            <SectionTitle title="תוצאות חיפוש" />
            {results.length === 0 ? (
              <EmptyCard
                title="לא נמצאו משתמשים בשם הזה"
                subtitle="מאגר המשתמשים נפתח ככל שהקהילה גדלה. בינתיים אפשר להזמין חברים חדשים למעלה."
              />
            ) : (
              results.map((profile) => (
                <ResultRow
                  key={profile.id}
                  profile={profile}
                  onOpen={handleOpenProfile}
                  onPrimaryAction={handleSendRequest}
                />
              ))
            )}
          </View>
        ) : null}

        {/* Your friends — real accepted friends only */}
        <SectionTitle title="החברים שלך" count={friends.length} />
        {!hasAnyFriends ? (
          <EmptyCard
            title="עוד אין לכם חברים — חפשו ותוסיפו את הראשונים"
            subtitle="חפשו חבר למעלה לפי שם, או הזמינו חברים חדשים לאפליקציה."
          />
        ) : matchingFriends.length === 0 ? (
          <EmptyCard title="אין חבר בשם הזה ברשימה שלכם" />
        ) : (
          matchingFriends.map((profile) => (
            <FriendRow
              key={profile.id}
              profile={profile}
              onOpen={handleOpenProfile}
              onPrimaryAction={handleRemove}
            />
          ))
        )}
      </ScrollView>

      {/* Profile modal */}
      <Modal
        visible={selectedProfile !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        {selectedProfile ? (
          <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
            {/* Modal header */}
            <View
              style={{
                flexDirection: 'row-reverse',
                alignItems: 'center',
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
                  closeModal();
                }}
                accessibilityRole="button"
                accessibilityLabel="סגירת הפרופיל"
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
                <X size={18} color={COLORS.text} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 24, alignItems: 'center' }}>
              <AvatarImage avatarId={selectedProfile.avatarId} size={120} />
              <Text
                maxFontSizeMultiplier={1.2}
                style={{
                  fontSize: 22,
                  fontWeight: '900',
                  color: COLORS.text,
                  writingDirection: 'rtl',
                  textAlign: 'center',
                  marginTop: 16,
                }}
              >
                {selectedProfile.name}
              </Text>
              <Text
                maxFontSizeMultiplier={1.2}
                style={{
                  fontSize: 15,
                  color: COLORS.muted,
                  writingDirection: 'rtl',
                  textAlign: 'center',
                  marginTop: 4,
                }}
              >
                {selectedProfile.title}
              </Text>

              {/* Stats row */}
              <View
                style={{
                  flexDirection: 'row-reverse',
                  backgroundColor: COLORS.card,
                  borderRadius: 16,
                  padding: 16,
                  marginTop: 24,
                  alignSelf: 'stretch',
                }}
              >
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 18, fontWeight: '900', color: COLORS.text }}>
                    {selectedProfile.level}
                  </Text>
                  <Text
                    maxFontSizeMultiplier={1.2}
                    style={{
                      fontSize: 12,
                      color: COLORS.muted,
                      writingDirection: 'rtl',
                      textAlign: 'center',
                      marginTop: 2,
                    }}
                  >
                    רמה
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 18, fontWeight: '900', color: COLORS.text }}>
                    {formatCoins(selectedProfile.coinsWon)}
                  </Text>
                  <Text
                    maxFontSizeMultiplier={1.2}
                    style={{
                      fontSize: 12,
                      color: COLORS.muted,
                      writingDirection: 'rtl',
                      textAlign: 'center',
                      marginTop: 2,
                    }}
                  >
                    מטבעות שהרוויח
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text
                    maxFontSizeMultiplier={1.2}
                    style={{
                      fontSize: 14,
                      fontWeight: '900',
                      color: COLORS.text,
                      writingDirection: 'rtl',
                      textAlign: 'center',
                    }}
                  >
                    {selectedProfile.favoriteRoom}
                  </Text>
                  <Text
                    maxFontSizeMultiplier={1.2}
                    style={{
                      fontSize: 12,
                      color: COLORS.muted,
                      writingDirection: 'rtl',
                      textAlign: 'center',
                      marginTop: 2,
                    }}
                  >
                    חדר מועדף
                  </Text>
                </View>
              </View>

              {/* Primary action */}
              {selectedProfile.isFriend ? (
                <Pressable
                  onPress={() => handleRemove(selectedProfile.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`הסרה של ${selectedProfile.name} מהחברים`}
                  style={{
                    marginTop: 24,
                    alignSelf: 'stretch',
                    borderRadius: 16,
                    paddingVertical: 14,
                    alignItems: 'center',
                    backgroundColor: COLORS.card,
                    borderWidth: 1,
                    borderColor: COLORS.danger,
                  }}
                >
                  <Text maxFontSizeMultiplier={1.15} style={{ fontSize: 15, fontWeight: '800', color: COLORS.danger }}>
                    הסרת חברות
                  </Text>
                </Pressable>
              ) : selectedProfile.requestPending ? (
                <View
                  style={{
                    marginTop: 24,
                    alignSelf: 'stretch',
                    borderRadius: 16,
                    paddingVertical: 14,
                    alignItems: 'center',
                    backgroundColor: COLORS.pendingBg,
                  }}
                  accessible
                  accessibilityLabel="בקשת החברות נשלחה"
                >
                  <Text maxFontSizeMultiplier={1.15} style={{ fontSize: 15, fontWeight: '800', color: COLORS.muted }}>
                    נשלחה בקשה
                  </Text>
                </View>
              ) : (
                <Pressable
                  onPress={() => handleSendRequest(selectedProfile.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`הוספת ${selectedProfile.name} לחברים`}
                  style={{
                    marginTop: 24,
                    alignSelf: 'stretch',
                    borderRadius: 16,
                    paddingVertical: 14,
                    alignItems: 'center',
                    backgroundColor: COLORS.blue,
                  }}
                >
                  <Text maxFontSizeMultiplier={1.15} style={{ fontSize: 15, fontWeight: '800', color: '#ffffff' }}>
                    הוספה לחברים
                  </Text>
                </Pressable>
              )}

              {selectedProfile.requestPending ? (
                <Text
                  maxFontSizeMultiplier={1.3}
                  style={{
                    fontSize: 12,
                    color: COLORS.muted,
                    writingDirection: 'rtl',
                    textAlign: 'center',
                    marginTop: 10,
                  }}
                >
                  הבקשה נשלחה. נעדכן אתכם כשהיא תאושר.
                </Text>
              ) : null}
            </ScrollView>
          </View>
        ) : (
          <View style={{ flex: 1, backgroundColor: COLORS.bg }} />
        )}
      </Modal>
    </SafeAreaView>
  );
}
