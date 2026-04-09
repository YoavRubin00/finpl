import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TextInput,
  Alert,
  
  Share,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import LottieView from "lottie-react-native";
import {
  ChevronRight,
  Users,
  Crown,
  Copy,
  Plus,
  LogIn,
  Trophy,
  Search,
  CheckCircle,
} from "lucide-react-native";
import { CLASH, TEXT_SHADOW } from "../../constants/theme";
import { tapHaptic, heavyHaptic } from "../../utils/haptics";
import { DiamondBackground } from "../../components/ui/DiamondBackground";
import { GoldBorderCard } from "../../components/ui/GoldBorderCard";
import { SupercellButton } from "../../components/ui/SupercellButton";
import { useSquadsStore } from "./useSquadsStore";
import {
  TIER_COLORS,
  TIER_LABELS,
  CHEST_REWARDS,
  MOCK_RIVAL_SQUADS,
  MAX_SQUAD_MEMBERS,
  lookupSquadByCode,
  computeChestReward,
  getRankMultiplier,
} from "./squadData";
import type { SquadListing } from "./squadData";
import { ScrollView, Pressable } from "react-native";

// ---------------------------------------------------------------------------
// No-Squad View (Create / Join)
// ---------------------------------------------------------------------------

function NoSquadView({ onCreate, onJoin }: { onCreate: (name: string) => void; onJoin: (code: string) => void }) {
  const [tab, setTab] = useState<"create" | "join">("create");
  const [squadName, setSquadName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [preview, setPreview] = useState<SquadListing | null>(null);
  const [previewCode, setPreviewCode] = useState("");

  function handleCreate() {
    const trimmed = squadName.trim();
    if (trimmed.length < 2) {
      Alert.alert("שם קצר מדי", "שם הקבוצה צריך להיות לפחות 2 תווים");
      return;
    }
    tapHaptic();
    onCreate(trimmed);
  }

  function handleLookup() {
    const trimmed = inviteCode.trim().toUpperCase();
    if (trimmed.length < 4) {
      Alert.alert("קוד לא תקין", "הזן קוד הזמנה בעל 4 תווים לפחות");
      return;
    }
    tapHaptic();
    const found = lookupSquadByCode(trimmed);
    if (found) {
      setPreview(found);
      setPreviewCode(trimmed);
    } else {
      Alert.alert("לא נמצא", "לא נמצא סקוואד עם הקוד הזה");
    }
  }

  function handleConfirmJoin() {
    heavyHaptic();
    onJoin(previewCode);
  }

  function handleCancelPreview() {
    tapHaptic();
    setPreview(null);
    setPreviewCode("");
  }

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(100)}>
      {/* Tab switcher */}
      <View style={noSquadStyles.tabRow}>
        <Pressable
          onPress={() => { tapHaptic(); setTab("create"); setPreview(null); }}
          style={[noSquadStyles.tab, tab === "create" && noSquadStyles.tabActive]}
        >
          <Plus size={16} color={tab === "create" ? CLASH.goldLight : "#71717a"} />
          <Text style={[noSquadStyles.tabText, tab === "create" && noSquadStyles.tabTextActive]}>צור קבוצה</Text>
        </Pressable>
        <Pressable
          onPress={() => { tapHaptic(); setTab("join"); setPreview(null); }}
          style={[noSquadStyles.tab, tab === "join" && noSquadStyles.tabActive]}
        >
          <LogIn size={16} color={tab === "join" ? CLASH.goldLight : "#71717a"} />
          <Text style={[noSquadStyles.tabText, tab === "join" && noSquadStyles.tabTextActive]}>הצטרף</Text>
        </Pressable>
      </View>

      <GoldBorderCard>
        {tab === "create" ? (
          <View style={noSquadStyles.form}>
            <Text style={noSquadStyles.label}>שם הקבוצה</Text>
            <TextInput
              style={noSquadStyles.input}
              value={squadName}
              onChangeText={setSquadName}
              placeholder="למשל: וולף סטריט"
              placeholderTextColor="#52525b"
              textAlign="right"
              maxLength={20}
            accessibilityLabel="למשל: וולף סטריט" />
            <SupercellButton label="יצירת סקוואד" onPress={handleCreate} variant="orange" />
          </View>
        ) : preview ? (
          <Animated.View entering={FadeInDown.duration(300)} style={noSquadStyles.form}>
            <View style={noSquadStyles.previewHeader}>
              <CheckCircle size={20} color="#22c55e" />
              <Text style={noSquadStyles.previewFound}>סקוואד נמצא!</Text>
            </View>
            <View style={noSquadStyles.previewCard}>
              <Text style={noSquadStyles.previewName}>{preview.name}</Text>
              <View style={noSquadStyles.previewRow}>
                <Text style={noSquadStyles.previewDetail}>
                  {preview.memberCount} חברים
                </Text>
                <Text style={noSquadStyles.previewDot}>·</Text>
                <Text style={[noSquadStyles.previewDetail, { color: TIER_COLORS[preview.tier] }]}>
                  {TIER_LABELS[preview.tier]}
                </Text>
                <Text style={noSquadStyles.previewDot}>·</Text>
                <Text style={noSquadStyles.previewDetail}>
                  {preview.weeklyScore} XP
                </Text>
              </View>
            </View>
            <SupercellButton label="הצטרף לסקוואד" onPress={handleConfirmJoin} variant="green" />
            <Pressable onPress={handleCancelPreview} style={noSquadStyles.cancelButton}>
              <Text style={noSquadStyles.cancelText}>חזרה</Text>
            </Pressable>
          </Animated.View>
        ) : (
          <View style={noSquadStyles.form}>
            <Text style={noSquadStyles.label}>קוד הזמנה</Text>
            <TextInput
              style={[noSquadStyles.input, noSquadStyles.codeInput]}
              value={inviteCode}
              onChangeText={setInviteCode}
              placeholder="ABCD12"
              placeholderTextColor="#52525b"
              textAlign="center"
              maxLength={8}
              autoCapitalize="characters"
            accessibilityLabel="ABCD12" />
            <SupercellButton label="חפש סקוואד" onPress={handleLookup} variant="blue" />
          </View>
        )}
      </GoldBorderCard>
    </Animated.View>
  );
}

const noSquadStyles = StyleSheet.create({
  tabRow: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  tabActive: {
    backgroundColor: "rgba(212,160,23,0.15)",
    borderColor: CLASH.goldBorder,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#71717a",
    writingDirection: "rtl",
  },
  tabTextActive: {
    color: CLASH.goldLight,
  },
  form: {
    gap: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#94a3b8",
    textAlign: "right",
    writingDirection: "rtl",
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#e4e4e7",
    writingDirection: "rtl",
  },
  codeInput: {
    letterSpacing: 4,
    fontSize: 20,
    fontWeight: "800",
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },
  previewFound: {
    fontSize: 16,
    fontWeight: "800",
    color: "#22c55e",
    textAlign: "right",
  },
  previewCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  previewName: {
    fontSize: 20,
    fontWeight: "900",
    color: CLASH.goldLight,
    textAlign: "center",
    ...TEXT_SHADOW,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  previewDetail: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94a3b8",
  },
  previewDot: {
    fontSize: 13,
    color: "#52525b",
  },
  cancelButton: {
    alignSelf: "center",
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#71717a",
  },
});

// ---------------------------------------------------------------------------
// Squad Hub View
// ---------------------------------------------------------------------------

function MemberRow({ name, avatar, weeklyXP, isLeader }: { name: string; avatar: string; weeklyXP: number; isLeader: boolean }) {
  return (
    <View style={memberStyles.row}>
      <Text style={memberStyles.xp}>{weeklyXP} XP</Text>
      <View style={{ flex: 1 }}>
        <View style={memberStyles.nameRow}>
          <Text style={memberStyles.name}>{name}</Text>
          {isLeader && <Crown size={14} color={CLASH.goldLight} />}
        </View>
      </View>
      <Image source={{ uri: avatar }} style={memberStyles.avatar} />
    </View>
  );
}

const memberStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: "#e4e4e7",
    textAlign: "right",
  },
  xp: {
    fontSize: 13,
    fontWeight: "600",
    color: "#60a5fa",
  },
});

function SquadHubView() {
  const squad = useSquadsStore((s) => s.squad);
  const hasClaimedChest = useSquadsStore((s) => s.hasClaimedWeeklyChest);
  const claimWeeklyChest = useSquadsStore((s) => s.claimWeeklyChest);
  const leaveSquad = useSquadsStore((s) => s.leaveSquad);
  const checkWeeklyReset = useSquadsStore((s) => s.checkWeeklyReset);

  // Check for weekly reset on mount
  useEffect(() => {
    checkWeeklyReset();
  }, [checkWeeklyReset]);

  if (!squad) return null;

  const tierColor = TIER_COLORS[squad.tier];
  const tierLabel = TIER_LABELS[squad.tier];
  const chestReward = computeChestReward(squad.tier, squad.rank);
  const rankMultiplier = getRankMultiplier(squad.rank);
  const hasRankBonus = rankMultiplier > 1;

  async function handleCopyCode() {
    tapHaptic();
    if (squad?.inviteCode) {
      await Clipboard.setStringAsync(squad.inviteCode);
    }
    Share.share({ message: `הצטרף לסקוואד שלי ב-FinPlay! קוד: ${squad?.inviteCode}` });
  }

  function handleClaimChest() {
    heavyHaptic();
    claimWeeklyChest();
    Alert.alert("תיבת אוצר!", `קיבלת ${chestReward.coins} מטבעות ו-${chestReward.gems} ג'מס! 💎`);
  }

  function handleLeave() {
    Alert.alert(
      "עזיבת סקוואד",
      "בטוח שאתה רוצה לעזוב את הקבוצה?",
      [
        { text: "ביטול", style: "cancel" },
        { text: "עזיבה", style: "destructive", onPress: () => { tapHaptic(); leaveSquad(); } },
      ]
    );
  }

  // Sort members by weeklyXP descending
  const sortedMembers = [...squad.members].sort((a, b) => b.weeklyXP - a.weeklyXP);

  return (
    <>
      {/* Squad info header */}
      <Animated.View entering={FadeInDown.duration(400).delay(100)}>
        <GoldBorderCard>
          <View style={hubStyles.headerRow}>
            <View style={hubStyles.headerInfo}>
              <Text style={hubStyles.squadName}>{squad.name}</Text>
              <View style={[hubStyles.tierBadge, { backgroundColor: `${tierColor}22` }]}>
                <Text style={[hubStyles.tierText, { color: tierColor }]}>{tierLabel}</Text>
              </View>
            </View>
            <View style={hubStyles.scoreBox}>
              <Text style={hubStyles.scoreValue}>{squad.weeklyScore}</Text>
              <Text style={hubStyles.scoreLabel}>XP שבועי</Text>
            </View>
          </View>

          {/* Invite code */}
          <Pressable onPress={handleCopyCode} style={hubStyles.codeRow}>
            <Copy size={16} color={CLASH.goldBorder} />
            <Text style={hubStyles.codeText}>{squad.inviteCode}</Text>
            <Text style={hubStyles.codeLabel}>קוד הזמנה:</Text>
          </Pressable>
        </GoldBorderCard>
      </Animated.View>

      {/* Members */}
      <Animated.View entering={FadeInDown.duration(400).delay(200)}>
        <GoldBorderCard>
          <View style={hubStyles.sectionHeader}>
            <Text style={hubStyles.memberCount}>{squad.members.length}/{MAX_SQUAD_MEMBERS}</Text>
            <View style={hubStyles.sectionTitleRow}>
              <Text style={hubStyles.sectionTitle}>חברי הסקוואד</Text>
              <Users size={18} color={CLASH.goldBorder} />
            </View>
          </View>
          {sortedMembers.map((m, i) => (
            <React.Fragment key={m.id}>
              {i > 0 && <View style={hubStyles.divider} />}
              <MemberRow name={m.name} avatar={m.avatar} weeklyXP={m.weeklyXP} isLeader={i === 0} />
            </React.Fragment>
          ))}
        </GoldBorderCard>
      </Animated.View>

      {/* Weekly Chest */}
      <Animated.View entering={FadeInDown.duration(400).delay(300)}>
        <GoldBorderCard>
          <View style={hubStyles.chestSection}>
            <View style={hubStyles.sectionTitleRow}>
              <Text style={hubStyles.sectionTitle}>תיבת אוצר שבועית</Text>
              <View style={{ width: 24, height: 24, overflow: "hidden" }}>
                <LottieView
                  source={require("../../../assets/lottie/wired-flat-945-dividends-hover-pinch.json")}
                  style={{ width: 24, height: 24 }}
                  autoPlay
                  loop
                />
              </View>
            </View>

            {/* Progress Bar Logic */}
            {(() => {
              const TARGET_XP = 1000;
              const isLocked = squad.weeklyScore < TARGET_XP;
              const progress = Math.min(100, (squad.weeklyScore / TARGET_XP) * 100);
              
              if (isLocked) {
                return (
                  <View style={{ gap: 8 }}>
                    <Text style={{ fontSize: 13, color: '#94a3b8', textAlign: 'right', writingDirection: 'rtl' }}>
                      זקוקים ל-1000 XP כדי לפתוח את התיבה יחד!
                    </Text>
                    <View style={{ height: 16, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, overflow: 'hidden' }}>
                      <Animated.View style={{ height: '100%', backgroundColor: '#60a5fa', width: `${progress}%`, borderRadius: 8 }} />
                    </View>
                    <Text style={{ fontSize: 12, color: '#e4e4e7', textAlign: 'center', fontWeight: '800' }}>
                      {squad.weeklyScore} / {TARGET_XP}
                    </Text>
                    <SupercellButton
                      label="התיבה נעולה"
                      onPress={() => {}}
                      variant="blue"
                      disabled
                    />
                  </View>
                );
              }

              return (
                <>
                  <Text style={hubStyles.chestDesc}>
                    דירוג {tierLabel}: {chestReward.coins} מטבעות + {chestReward.gems} ג׳מס
                  </Text>
                  {hasRankBonus && (
                    <View style={hubStyles.rankBonusRow}>
                      <Text style={hubStyles.rankBonusText}>
                        בונוס מיקום #{squad.rank} — x{rankMultiplier}
                      </Text>
                      <Trophy size={14} color="#facc15" />
                    </View>
                  )}
                  <SupercellButton
                    label={hasClaimedChest ? "נאסף ✓" : "אסוף תיבה"}
                    onPress={handleClaimChest}
                    variant={hasClaimedChest ? "blue" : "orange"}
                    disabled={hasClaimedChest}
                  />
                </>
              );
            })()}
          </View>
        </GoldBorderCard>
      </Animated.View>

      {/* Leaderboard */}
      <Animated.View entering={FadeInDown.duration(400).delay(400)}>
        <GoldBorderCard>
          <View style={hubStyles.sectionTitleRow}>
            <Text style={hubStyles.sectionTitle}>טבלת סקוואדים</Text>
            <Trophy size={18} color={CLASH.goldLight} />
          </View>
          {MOCK_RIVAL_SQUADS.map((rival, i) => (
            <View key={rival.id}>
              {i > 0 && <View style={hubStyles.divider} />}
              <View style={[
                hubStyles.leaderRow,
                rival.id === squad.id && hubStyles.leaderRowSelf,
              ]}>
                <Text style={hubStyles.leaderScore}>{rival.weeklyScore} XP</Text>
                <Text style={hubStyles.leaderName}>{rival.name}</Text>
                <Text style={[hubStyles.leaderRank, { color: TIER_COLORS[rival.tier] }]}>
                  #{rival.rank}
                </Text>
              </View>
            </View>
          ))}
          {/* Show user's squad in list */}
          <View style={hubStyles.divider} />
          <View style={[hubStyles.leaderRow, hubStyles.leaderRowSelf]}>
            <Text style={hubStyles.leaderScore}>{squad.weeklyScore} XP</Text>
            <Text style={hubStyles.leaderName}>{squad.name}</Text>
            <Text style={[hubStyles.leaderRank, { color: TIER_COLORS[squad.tier] }]}>
              #{squad.rank}
            </Text>
          </View>
        </GoldBorderCard>
      </Animated.View>

      {/* Leave */}
      <Animated.View entering={FadeInDown.duration(400).delay(500)}>
        <Pressable onPress={handleLeave} style={hubStyles.leaveButton}>
          <Text style={hubStyles.leaveText}>עזוב סקוואד</Text>
        </Pressable>
      </Animated.View>
    </>
  );
}

const hubStyles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerInfo: {
    alignItems: "flex-end",
    gap: 6,
    flex: 1,
  },
  squadName: {
    fontSize: 22,
    fontWeight: "900",
    color: "#e4e4e7",
    textAlign: "right",
    ...TEXT_SHADOW,
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tierText: {
    fontSize: 12,
    fontWeight: "800",
  },
  scoreBox: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: "900",
    color: CLASH.goldLight,
    ...TEXT_SHADOW,
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94a3b8",
    marginTop: 2,
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  codeLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94a3b8",
  },
  codeText: {
    fontSize: 16,
    fontWeight: "900",
    color: CLASH.goldLight,
    letterSpacing: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#e4e4e7",
    textAlign: "right",
  },
  memberCount: {
    fontSize: 13,
    fontWeight: "600",
    color: "#71717a",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  chestSection: {
    gap: 10,
  },
  rankBonusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    backgroundColor: "rgba(250,204,21,0.1)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  rankBonusText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#facc15",
    textAlign: "right",
  },
  chestDesc: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94a3b8",
    textAlign: "right",
    writingDirection: "rtl",
  },
  leaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 8,
  },
  leaderRowSelf: {
    backgroundColor: "rgba(212,160,23,0.08)",
    borderRadius: 8,
  },
  leaderRank: {
    fontSize: 16,
    fontWeight: "900",
    minWidth: 28,
    textAlign: "center",
  },
  leaderName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#e4e4e7",
    textAlign: "right",
  },
  leaderScore: {
    fontSize: 13,
    fontWeight: "600",
    color: "#60a5fa",
  },
  leaveButton: {
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  leaveText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ef4444",
  },
});

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export function SquadsScreen() {
  const router = useRouter();
  const squad = useSquadsStore((s) => s.squad);
  const createSquad = useSquadsStore((s) => s.createSquad);
  const joinSquad = useSquadsStore((s) => s.joinSquad);

  function handleCreate(name: string) {
    createSquad(name);
    heavyHaptic();
  }

  function handleJoin(code: string) {
    const success = joinSquad(code);
    if (success) {
      heavyHaptic();
    } else {
      Alert.alert("שגיאה", "קוד הזמנה לא תקין");
    }
  }

  return (
    <View style={screenStyles.container}>
      <DiamondBackground>
        <ScrollView
          style={screenStyles.scroll}
          contentContainerStyle={screenStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <Pressable onPress={() => { tapHaptic(); router.canGoBack() ? router.back() : router.replace('/(tabs)' as never); }} style={screenStyles.backButton}>
            <ChevronRight size={22} color="#e4e4e7" strokeWidth={2.5} />
            <Text style={screenStyles.backLabel}>חזרה</Text>
          </Pressable>

          {/* Title */}
          <Animated.View entering={FadeInDown.duration(400)} style={screenStyles.titleRow}>
            <Users size={28} color={CLASH.goldLight} />
            <Text style={screenStyles.title}>סקוואדים</Text>
          </Animated.View>
          <Text style={screenStyles.subtitle}>
            {squad ? "התקדם עם הקבוצה שלך וצבור XP משותף" : "צור או הצטרף לסקוואד והתחרו יחד"}
          </Text>

          {squad ? <SquadHubView /> : <NoSquadView onCreate={handleCreate} onJoin={handleJoin} />}

          <View style={screenStyles.bottomSpacer} />
        </ScrollView>
      </DiamondBackground>
    </View>
  );
}

const screenStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CLASH.bgPrimary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 16,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingTop: 16,
    paddingBottom: 4,
    alignSelf: "flex-start",
  },
  backLabel: {
    color: "#e4e4e7",
    fontSize: 16,
    fontWeight: "600",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#e4e4e7",
    textAlign: "right",
    ...TEXT_SHADOW,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#94a3b8",
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: 8,
  },
  bottomSpacer: {
    height: 40,
  },
});
