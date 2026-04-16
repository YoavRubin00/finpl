import React, { useState, useMemo } from "react";
import { ScrollView, View, Text, Pressable, StyleSheet } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import Animated from "react-native-reanimated";
import { Trophy, Swords, ChevronRight } from "lucide-react-native";
import { useArenaStore } from "./useArenaStore";
import { useEconomyStore } from "../economy/useEconomyStore";
import { useClashStore } from "../friends-clash/useClashStore";
import { ClashInvitationModal } from "../friends-clash/ClashInvitationModal";
import { ChallengeCard } from "./ChallengeCard";
import { DAILY_CHALLENGES, MOCK_LEADERBOARD } from "./arenaData";
import { getPyramidStatus } from "../../utils/progression";
import { useEntranceAnimation, fadeInScale, fadeInUp, SPRING_BOUNCY } from "../../utils/animations";
import { BannerRibbon } from "../../components/ui/BannerRibbon";
import { GlowCard } from "../../components/ui/GlowCard";
import { DecorationOverlay } from "../../components/ui/DecorationOverlay";
import { SUBTITLE_TEXT } from "../../constants/theme";
import { tapHaptic } from "../../utils/haptics";

const CHALLENGE_STAGGER = 80;
const LEADERBOARD_STAGGER = 60;

function AnimatedChallengeWrapper({
  children,
  index,
}: {
  children: React.ReactNode;
  index: number;
}) {
  const style = useEntranceAnimation(fadeInScale, { delay: index * CHALLENGE_STAGGER });
  return <Animated.View style={style}>{children}</Animated.View>;
}

function AnimatedLeaderboardWrapper({
  children,
  index,
}: {
  children: React.ReactNode;
  index: number;
}) {
  const style = useEntranceAnimation(fadeInUp, { delay: 200 + index * LEADERBOARD_STAGGER });
  return <Animated.View style={style}>{children}</Animated.View>;
}

const LeaderboardRow = React.memo(function LeaderboardRow({
  rank,
  name,
  xp,
  isCurrentUser,
}: {
  rank: number;
  name: string;
  xp: number;
  isCurrentUser: boolean;
}) {
  const isTop3 = rank <= 3;
  const crownColors = ["#facc15", "#64748b", "#b45309"];

  return (
    <View
      style={[
        s.leaderboardRow,
        isCurrentUser && s.currentUserRow
      ]}
    >
      <View style={s.rankPill}>
        <Text style={[s.rankText, isTop3 && { color: crownColors[rank - 1] }]}>#{rank}</Text>
      </View>
      <Text style={[s.playerName, isCurrentUser && { color: "#1e293b", fontWeight: '900' }]}>
        {name}
        {isCurrentUser ? " (אתה)" : ""}
      </Text>
      <View style={s.xpBadge}>
        <Text style={s.xpValue}>{xp.toLocaleString()}</Text>
        <Text style={s.xpLabel}>XP</Text>
      </View>
    </View>
  );
});

export function ArenaScreen() {
  const isFocused = useIsFocused();
  const completeChallenge = useArenaStore((s) => s.completeChallenge);
  const isChallengeCompleted = useArenaStore((s) => s.isChallengeCompleted);
  const xp = useEconomyStore((s) => s.xp);
  const streak = useEconomyStore((s) => s.streak);
  const pendingInvite = useClashStore((s) =>
    s.invites.find((i) => i.status === "pending")
  );
  const [clashModalVisible, setClashModalVisible] = useState(false);

  const { layer, layerName } = getPyramidStatus(xp);

  const completedCount = useMemo(
    () => DAILY_CHALLENGES.filter((c) => isChallengeCompleted(c.id)).length,
    [isChallengeCompleted],
  );

  const titleStyle = useEntranceAnimation(fadeInScale, { delay: 0, spring: SPRING_BOUNCY });

  // Build leaderboard: insert current user at their position by XP
  const allEntries = useMemo(
    () => [...MOCK_LEADERBOARD, { name: "You", xp, isCurrentUser: true }]
      .sort((a, b) => b.xp - a.xp)
      .map((entry, i) => ({ ...entry, rank: i + 1 }))
      .slice(0, 6),
    [xp],
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <DecorationOverlay screenName="ArenaScreen" active={isFocused} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View style={[titleStyle, { alignItems: "center", marginBottom: 20 }]}>
          <BannerRibbon title="זירה" icon={<Swords size={20} color="#fff" />} />
          <Text style={[SUBTITLE_TEXT, { marginTop: 8, color: "#64748b" }]}>
            רמה {layer} · {layerName} · {streak > 0 ? `רצף ${streak} ימים` : "התחילו רצף!"}
          </Text>
        </Animated.View>

        {/* Clash Invite Banner */}
        {pendingInvite && (
          <Pressable
            style={s.clashInvite}
            onPress={() => { tapHaptic(); setClashModalVisible(true); }}
          >
            <View style={s.clashIcon}>
              <Swords size={20} color="#fff" />
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={s.clashTitle}>אתגר מ{pendingInvite.opponentName}!</Text>
              <Text style={s.clashSub}>לחץ כדי לקבל את האתגר</Text>
            </View>
            <ChevronRight size={18} color="#7c3aed" style={{ transform: [{ scaleX: -1 }] }} />
          </Pressable>
        )}

        {/* Daily Challenges */}
        <View style={{ marginBottom: 24 }}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>אתגרים יומיים</Text>
            <Text style={s.sectionCount}>
              {completedCount}/{DAILY_CHALLENGES.length} הושלמו
            </Text>
          </View>

          {DAILY_CHALLENGES.map((challenge, index) => (
            <AnimatedChallengeWrapper key={challenge.id} index={index}>
              <ChallengeCard
                challenge={challenge}
                isCompleted={isChallengeCompleted(challenge.id)}
                onComplete={() => completeChallenge(challenge.id)}
              />
            </AnimatedChallengeWrapper>
          ))}

          {completedCount === DAILY_CHALLENGES.length && (
            <View style={s.allDone}>
              <Text style={s.allDoneText}>כל הכבוד! חזרו מחר לאתגרים חדשים 🏆</Text>
            </View>
          )}
        </View>

        {/* Leaderboard */}
        <View>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>לוח תוצאות</Text>
            <Trophy size={18} color="#facc15" />
          </View>

          <GlowCard glowColor="#f1f5f9">
            <View style={{ padding: 8 }}>
              {allEntries.map((entry, index) => (
                <AnimatedLeaderboardWrapper
                  key={entry.isCurrentUser ? "you" : entry.name}
                  index={index}
                >
                  <LeaderboardRow
                    rank={entry.rank}
                    name={entry.name}
                    xp={entry.xp}
                    isCurrentUser={entry.isCurrentUser}
                  />
                </AnimatedLeaderboardWrapper>
              ))}
            </View>
          </GlowCard>
        </View>
      </ScrollView>

      {pendingInvite && (
        <ClashInvitationModal
          visible={clashModalVisible}
          inviteId={pendingInvite.id}
          onClose={() => setClashModalVisible(false)}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 48,
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1e293b',
    writingDirection: 'rtl',
  },
  sectionCount: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
  },
  clashInvite: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ddd6fe',
    padding: 12,
    gap: 12,
    marginBottom: 24,
  },
  clashIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clashTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1e293b',
  },
  clashSub: {
    fontSize: 11,
    color: '#7c3aed',
    fontWeight: '700',
  },
  allDone: {
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    alignItems: 'center',
    marginTop: 4,
  },
  allDoneText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
    textAlign: 'center',
  },
  leaderboardRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 12,
    borderRadius: 12,
  },
  currentUserRow: {
    backgroundColor: '#f1f5f9',
  },
  rankPill: {
    width: 32,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#64748b',
  },
  playerName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'right',
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  xpValue: {
    fontSize: 12,
    fontWeight: '900',
    color: '#1e293b',
  },
  xpLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
});
