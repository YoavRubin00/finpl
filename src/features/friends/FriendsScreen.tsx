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
import { ChevronRight } from 'lucide-react-native';
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
        <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.muted }}>הסרה</Text>
      </Pressable>
    </Pressable>
  );
}

/** Suggestion row: avatar + name + level + coins, "הצע חברות" / "ממתין…" button. */
function SuggestionRow({ profile, onOpen, onPrimaryAction }: ProfileRowProps): React.ReactElement {
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
          accessibilityLabel={`הצעת החברות ל${profile.name} ממתינה לאישור`}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.muted }}>ממתין…</Text>
        </View>
      ) : (
        <Pressable
          onPress={() => onPrimaryAction(profile.id)}
          accessibilityRole="button"
          accessibilityLabel={`הצעת חברות ל${profile.name}`}
          hitSlop={8}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 12,
            backgroundColor: COLORS.blue,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#ffffff' }}>הצע חברות</Text>
        </Pressable>
      )}
    </Pressable>
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
  const visibleProfiles = useMemo(
    () =>
      query.length === 0
        ? profiles
        : profiles.filter(
            (p) => p.name.includes(query) || p.title.includes(query)
          ),
    [profiles, query]
  );

  const friends = visibleProfiles.filter((p) => p.isFriend);
  const suggestions = visibleProfiles.filter((p) => !p.isFriend);

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
        {/* Search */}
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="חיפוש לפי שם…"
          placeholderTextColor={COLORS.muted}
          accessibilityLabel="חיפוש לפי שם"
          style={{
            backgroundColor: COLORS.card,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: COLORS.border,
            paddingHorizontal: 18,
            paddingVertical: 10,
            fontSize: 14,
            color: COLORS.text,
            writingDirection: 'rtl',
            textAlign: 'right',
            marginBottom: 20,
          }}
        />

        {/* Friends section */}
        <Text
          style={{
            fontSize: 15,
            fontWeight: '900',
            color: COLORS.text,
            writingDirection: 'rtl',
            textAlign: 'right',
            marginBottom: 10,
          }}
        >
          החברים שלך ({friends.length})
        </Text>
        {friends.length === 0 ? (
          <View
            style={{
              backgroundColor: COLORS.card,
              borderRadius: 16,
              padding: 16,
              marginBottom: 8,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                color: COLORS.muted,
                writingDirection: 'rtl',
                textAlign: 'right',
              }}
            >
              עדיין אין חברים ברשימה. שולחים הצעת חברות ומתחילים.
            </Text>
          </View>
        ) : (
          friends.map((profile) => (
            <FriendRow
              key={profile.id}
              profile={profile}
              onOpen={handleOpenProfile}
              onPrimaryAction={handleRemove}
            />
          ))
        )}

        {/* Suggestions section */}
        <Text
          style={{
            fontSize: 15,
            fontWeight: '900',
            color: COLORS.text,
            writingDirection: 'rtl',
            textAlign: 'right',
            marginTop: 20,
            marginBottom: 10,
          }}
        >
          הצעות חברות
        </Text>
        {suggestions.length === 0 ? (
          <View
            style={{
              backgroundColor: COLORS.card,
              borderRadius: 16,
              padding: 16,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                color: COLORS.muted,
                writingDirection: 'rtl',
                textAlign: 'right',
              }}
            >
              אין הצעות חדשות כרגע.
            </Text>
          </View>
        ) : (
          suggestions.map((profile) => (
            <SuggestionRow
              key={profile.id}
              profile={profile}
              onOpen={handleOpenProfile}
              onPrimaryAction={handleSendRequest}
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
                <Text style={{ fontSize: 16, color: COLORS.text }}>✕</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 24, alignItems: 'center' }}>
              <AvatarImage avatarId={selectedProfile.avatarId} size={120} />
              <Text
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
                  <Text style={{ fontSize: 18, fontWeight: '900', color: COLORS.text }}>
                    {selectedProfile.level}
                  </Text>
                  <Text
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
                  <Text style={{ fontSize: 18, fontWeight: '900', color: COLORS.text }}>
                    {formatCoins(selectedProfile.coinsWon)}
                  </Text>
                  <Text
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
                  <Text style={{ fontSize: 15, fontWeight: '800', color: COLORS.danger }}>
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
                  accessibilityLabel="הצעת החברות ממתינה לאישור"
                >
                  <Text style={{ fontSize: 15, fontWeight: '800', color: COLORS.muted }}>
                    ממתין…
                  </Text>
                </View>
              ) : (
                <Pressable
                  onPress={() => handleSendRequest(selectedProfile.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`הצעת חברות ל${selectedProfile.name}`}
                  style={{
                    marginTop: 24,
                    alignSelf: 'stretch',
                    borderRadius: 16,
                    paddingVertical: 14,
                    alignItems: 'center',
                    backgroundColor: COLORS.blue,
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#ffffff' }}>
                    הצע חברות
                  </Text>
                </Pressable>
              )}

              {selectedProfile.requestPending ? (
                <Text
                  style={{
                    fontSize: 12,
                    color: COLORS.muted,
                    writingDirection: 'rtl',
                    textAlign: 'center',
                    marginTop: 10,
                  }}
                >
                  הצעת החברות נשלחה. נעדכן כשתאושר.
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
