import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { Image as ExpoImage } from "expo-image";
import { View, Text, Image, FlatList, Dimensions, StyleSheet, ViewToken, Pressable, ImageBackground,  Modal } from "react-native";
import { useFocusEffect, useScrollToTop } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LottieView from "lottie-react-native";
import { SafeLottie } from "../../components/ui/SafeLottie";
import { useRouter } from "expo-router";
import { Lock, FlaskConical } from "lucide-react-native";

import { LottieIcon } from "../../components/ui/LottieIcon";
import { useAuthStore } from "../auth/useAuthStore";

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  cancelAnimation,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { FINN_STANDARD } from "../retention-loops/finnMascotConfig";

// Feed Data & Types
import { MOCK_FEED_DATA, COMIC_FEED_ITEMS, BENBEN_VIDEOS } from "./feedData";
import { type FeedItem, type FeedModuleHook, type FeedQuote, type FeedFinnHero } from "./types";
import { FeedVideoItem } from "./FeedVideoItem";
import { FeedQuoteItem } from "./FeedQuoteItem";
import { FeedComicItem } from "./FeedComicItem";
import { FeedModuleHookCard } from "./FeedModuleHookCard";
import { FeedSidebar } from "./FeedSidebar";
import { useFeedInteractionsStore } from "./useFeedInteractionsStore";
import { useChapterStore } from "../chapter-1-content/useChapterStore";
import { useAITelemetryStore } from "../ai-personalization/useAITelemetryStore";
import { MacroEventCard } from "../macro-events/MacroEventCard";
import { macroEventsData } from "../macro-events/macroEventsData";
import { useMacroEventStore } from "../macro-events/useMacroEventStore";
import { FeedSkeleton } from "../../components/ui/FeedSkeleton";
import { NotificationPermissionBanner } from "../../components/ui/NotificationPermissionBanner";
import { useTutorialStore } from "../../stores/useTutorialStore";
import { useEconomyStore } from "../economy/useEconomyStore";
import { useTheme } from "../../hooks/useTheme";
import { MythFeedCard } from "../myth-or-tachles/MythFeedCard";
import { FeedScenarioCard } from "./FeedScenarioCard";
import { FeedPremiumLearningCard } from "./FeedPremiumLearningCard";
import { PREMIUM_LEARNING_ITEMS } from "./premiumLearningData";
import { SCENARIOS } from "../scenario-lab/scenarioLabData";
import { useScenarioLabStore } from "../scenario-lab/useScenarioLabStore";
import { DailyQuizCard } from "../daily-quiz/DailyQuizCard";
import { useDailyQuizStore } from "../daily-quiz/useDailyQuizStore";
import { refreshDailyQuiz } from "../daily-quiz/dailyQuizPipeline";
import { getFallbackQuiz, getCategoryForDate } from "../daily-quiz/fallbackQuizzes";
import { DilemmaCard } from "../daily-challenges/DilemmaCard";
import { InvestmentCard } from "../daily-challenges/InvestmentCard";
import { SwipeGameCard } from "../daily-challenges/SwipeGameCard";
import { CrashGameCard } from "../daily-challenges/CrashGameCard";
import { GrahamPersonalityFeedCard } from "../graham-personality/GrahamPersonalityFeedCard";
import { useStreakCelebration } from "../../hooks/useStreakCelebration";
import { useDailyChallengesStore } from "../daily-challenges/use-daily-challenges-store";
import { getPyramidStatus } from "../../utils/progression";
import { TransitionOverlay } from "../../components/ui/TransitionOverlay";
// Chapter data — all 5 chapters
import { chapter1Data } from "../chapter-1-content/chapter1Data";
import { chapter2Data } from "../chapter-2-content/chapter2Data";
import { chapter3Data } from "../chapter-3-content/chapter3Data";
import { chapter4Data } from "../chapter-4-content/chapter4Data";
import { chapter5Data } from "../chapter-5-content/chapter5Data";

// Wisdom flashes
import { wisdomQuotes } from "../wisdom-flashes/wisdomData";
import { psychWisdomFlashes } from "../wisdom-flashes/psychWisdomData";
import { CATEGORY_LABELS } from "../wisdom-flashes/types";

// Daily concepts
import { DAILY_CONCEPTS } from "../daily-concepts/dailyConceptsData";
// Fun features
import { useFunStore } from "../../stores/useFunStore";
import { FinnMailModal } from "../fun/FinnMailModal";
import { FINN_DAD_JOKES, FINN_FUN_FACTS } from "../fun/finnJokesData";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Module-level flag — prevents re-check within the same session
let streakCheckedThisSession = false;

const STREAK_POPUP_KEY = "streak_popup_last_date";

// Stable FlatList helpers — avoids new references per render
function FeedSeparator() { return <View style={{ height: 10 }} />; }
function keyExtractor(item: FeedItem) { return item.id; }

// Seeded Fisher-Yates shuffle — stable for the same seed
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}


const CHAPTER_META = [
  { data: chapter1Data, storeId: "ch-1", chapterId: "chapter-1", name: "פרק 1: יסודות", layer: 1 },
  { data: chapter2Data, storeId: "ch-2", chapterId: "chapter-2", name: "פרק 2: ביטחון", layer: 2 },
  { data: chapter3Data, storeId: "ch-3", chapterId: "chapter-3", name: "פרק 3: יציבות", layer: 3 },
  { data: chapter4Data, storeId: "ch-4", chapterId: "chapter-4", name: "פרק 4: צמיחה", layer: 4 },
  { data: chapter5Data, storeId: "ch-5", chapterId: "chapter-5", name: "פרק 5: הדרך לחופש כלכלי", layer: 5 },
] as const;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "לילה טוב";
  if (hour < 12) return "בוקר טוב";
  if (hour < 18) return "צהריים טובים";
  return "ערב טוב";
}


// -- Animated bounce arrow --
function BouncingArrow() {
  const ty = useSharedValue(0);

  useEffect(() => {
    ty.value = withRepeat(
      withSequence(
        withTiming(4, { duration: 900 }),
        withTiming(0, { duration: 900 }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(ty);
  }, [ty]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }],
  }));

  return (
    <Animated.View style={[{ alignItems: 'center', gap: 2 }, animStyle]}>
      <View style={{ width: 52, height: 52, overflow: 'hidden' }} accessible={false}>
        <LottieView
          source={require("../../../assets/lottie/wired-flat-33-chevron-down-hover-scale.json")}
          style={{ width: 52, height: 52 }}
          autoPlay
          loop
          speed={0.5}
          resizeMode="cover"

        />
      </View>
      <Text style={{
        color: '#0891b2',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
        writingDirection: 'rtl',
      }}>
        גלול למטה
      </Text>
    </Animated.View>
  );
}

/** Pick a daily concept deterministically based on the day */
function getDailyConcept() {
  const dayIndex = Math.floor(Date.now() / 86400000);
  return DAILY_CONCEPTS[dayIndex % DAILY_CONCEPTS.length];
}

/** Pick a daily quote deterministically based on the day */
function getDailyQuote(): { text: string; author: string; icon: string } {
  const dayIndex = Math.floor(Date.now() / 86400000);
  const q = wisdomQuotes[dayIndex % wisdomQuotes.length];
  return { text: q.text, author: q.author, icon: q.icon };
}

/** Module-level ref so WelcomeCard can scroll the feed list */
let _feedListScrollToIndex: ((index: number) => void) | null = null;

/** Pending scroll-to index — set externally, consumed on next focus */
export let _pendingFeedScrollIndex: number | null = null;
export function setPendingFeedScroll(index: number) {
  _pendingFeedScrollIndex = index;
}

// -- Welcome Screen (full-screen first card with Finn + daily quote) --
function WelcomeCard({ height }: { height: number }) {
  const router = useRouter();
  const displayName = useAuthStore((s) => s.displayName);
  const hasUnreadMail = useFunStore((s) => s.hasUnreadMail);
  const refreshMail = useFunStore((s) => s.refreshMail);
  const [showMailModal, setShowMailModal] = useState(false);

  // Refresh mail on mount
  useEffect(() => { refreshMail(FINN_DAD_JOKES, FINN_FUN_FACTS); }, []);
  const dailyQuote = useMemo(() => getDailyQuote(), []);
  const dailyConcept = useMemo(() => getDailyConcept(), []);

  // Staggered bubble pulse animations
  const scale1 = useSharedValue(1);
  const scale2 = useSharedValue(1);
  const scale3 = useSharedValue(1);
  const scale4 = useSharedValue(1);

  useEffect(() => {
    const pulse = (sv: ReturnType<typeof useSharedValue<number>>, delay: number) => {
      sv.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1.03, { duration: 2200 }),
            withTiming(1, { duration: 2200 }),
          ),
          -1,
          false,
        ),
      );
    };
    pulse(scale1, 0);
    pulse(scale2, 533);
    pulse(scale3, 1066);
    pulse(scale4, 266);
    return () => { cancelAnimation(scale1); cancelAnimation(scale2); cancelAnimation(scale3); cancelAnimation(scale4); };
  }, []);
  const bubble1Style = useAnimatedStyle(() => ({ transform: [{ scale: scale1.value }] }));
  const bubble2Style = useAnimatedStyle(() => ({ transform: [{ scale: scale2.value }] }));
  const bubble3Style = useAnimatedStyle(() => ({ transform: [{ scale: scale3.value }] }));
  const bubble4Style = useAnimatedStyle(() => ({ transform: [{ scale: scale4.value }] }));

  return (
    <View style={[welcomeStyles.container, { height }]}>

      <View style={welcomeStyles.centralContent}>
        {/* The Daily Concept First */}
        <Animated.View style={[welcomeStyles.conceptCard, bubble2Style]}>
           <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 6 }}>
             <ExpoImage source={FINN_STANDARD} style={{ width: 28, height: 28 }} contentFit="contain" accessible={false} />
             <Text style={welcomeStyles.quoteDailyLabel}>המושג היומי</Text>
           </View>
           <Text style={welcomeStyles.conceptTitle}>{dailyConcept.titleHe}</Text>
           <Text style={welcomeStyles.conceptText}>{dailyConcept.descriptionHe}</Text>
        </Animated.View>

        {/* Daily quote card Second */}
        <Animated.View style={[welcomeStyles.quoteCard, bubble1Style]}>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 6 }}>
            <View accessible={false}><LottieIcon source={require("../../../assets/lottie/wired-flat-3140-book-open-hover-pinch.json")} size={24} /></View>
            <Text style={welcomeStyles.quoteDailyLabel}>המשפט היומי</Text>
          </View>
          <Text style={welcomeStyles.quoteText}>
            ״{dailyQuote.text}״
          </Text>
          <Text style={welcomeStyles.quoteAuthor}>
            — {dailyQuote.author}
          </Text>
        </Animated.View>
      </View>

      {/* Finn mascot + mail button + Bouncing arrow */}
      <View style={{ alignSelf: 'center', marginTop: -50, alignItems: 'center' }}>
        <Animated.View style={[{ alignItems: 'center' }, bubble4Style]}>
          <View style={{ width: 220, height: 220, overflow: 'hidden' }}>
            <ExpoImage source={FINN_STANDARD}
              style={{ width: 220, height: 220 }}
              contentFit="contain"
              accessible={false}
              />
          </View>
        </Animated.View>

        {/* Mail from Captain Shark — next to Finn */}
        {hasUnreadMail && (
          <Pressable
            onPress={() => { setShowMailModal(true); }}
            style={{
              flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
              backgroundColor: '#f0f9ff', borderRadius: 14, borderWidth: 1, borderColor: '#bae6fd',
              paddingHorizontal: 12, paddingVertical: 8, marginTop: -20,
            }}
          >
            <LottieView
              source={require("../../../assets/lottie/wired-flat-411-news-newspaper-hover-pinch.json")}
              style={{ width: 22, height: 22 }}
              autoPlay loop
            />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#0369a1', writingDirection: 'rtl' }}>
              דואר מקפטן שארק
            </Text>
          </Pressable>
        )}

        <Animated.View style={[{ alignItems: 'center', marginTop: hasUnreadMail ? -4 : -10 }, bubble3Style]}>
          <View style={{ width: 50, height: 50, overflow: 'hidden' }} accessible={false}>
            <LottieView
              source={require("../../../assets/lottie/wired-flat-33-chevron-down-hover-scale.json")}
              style={{ width: 50, height: 50 }}
              autoPlay
              loop
              speed={0.5}
              resizeMode="cover"
            />
          </View>
        </Animated.View>
      </View>

      <FinnMailModal visible={showMailModal} onClose={() => setShowMailModal(false)} />
    </View>
  );
}

const welcomeStyles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 30, 
    paddingBottom: 60,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  centralContent: {
    width: "100%",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
  },
  conceptCard: {
    width: "90%",
    borderRadius: 22,
    backgroundColor: "#f0f9ff", // pleasant light blue background
    paddingHorizontal: 20,
    paddingVertical: 18,
    alignItems: "center",
    // 3D card borders
    borderWidth: 1.5,
    borderColor: "#e0f2fe",
    borderBottomWidth: 4,
    borderBottomColor: "#bae6fd",
    // Light blue premium glow
    shadowColor: "#38bdf8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  conceptTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0f172a",
    writingDirection: "rtl",
    textAlign: "center",
    marginBottom: 8,
  },
  conceptText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#334155",
    writingDirection: "rtl",
    textAlign: "center",
    lineHeight: 24,
  },
  quoteCard: {
    width: "90%",
    borderRadius: 22,
    backgroundColor: "#f0f9ff", // pleasant light blue background
    paddingHorizontal: 20,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 16,
    // 3D card borders
    borderWidth: 1.5,
    borderColor: "#e0f2fe",
    borderBottomWidth: 4,
    borderBottomColor: "#bae6fd",
    // Light blue premium glow
    shadowColor: "#38bdf8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  quoteDailyLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0369a1",
    letterSpacing: 1,
    writingDirection: "rtl",
    textAlign: "center",
  },
  quoteIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  quoteText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1e293b",
    writingDirection: "rtl",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 8,
  },
  quoteAuthor: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0369a1",
    writingDirection: "rtl",
    textAlign: "center",
  },
  bottomFade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 110,
  },
  alreadyDoneOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  alreadyDoneCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    gap: 12,
    marginHorizontal: 32,
    borderWidth: 1.5,
    borderColor: "#bae6fd",
    shadowColor: "#0891b2",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  alreadyDoneTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#1e293b",
    textAlign: "center",
    writingDirection: "rtl",
  },
  alreadyDoneSub: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
    textAlign: "center",
    writingDirection: "rtl",
  },
  alreadyDoneBtn: {
    backgroundColor: "#0ea5e9",
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 12,
    marginTop: 4,
    borderBottomWidth: 3,
    borderBottomColor: "#0284c7",
  },
  alreadyDoneBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
  },
});

// -- Feed item background decorations (sea + money, subtle) --
const FEED_DECO_SOURCES = [
  require("../../../assets/lottie/wired-flat-291-coin-dollar-hover-pinch.json"),
  require("../../../assets/lottie/wired-flat-161-growth-hover-pinch.json"),
  require("../../../assets/lottie/wired-flat-152-bar-chart-arrow-hover-growth.json"),
  require("../../../assets/lottie/wired-flat-298-coins-hover-jump.json"),
] as number[];

const FEED_DECO_SLOTS: Array<{ top: `${number}%`; left?: number; right?: number }> = [
  { top: "8%", left: 8 },
  { top: "10%", right: 10 },
  { top: "45%", right: 6 },
  { top: "75%", left: 6 },
];

function seedHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function FeedItemDecorations({ seed }: { seed: string }) {
  const h = seedHash(seed);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {FEED_DECO_SLOTS.map((slot, i) => {
        const src = FEED_DECO_SOURCES[((h >>> 0) + i * 7) % FEED_DECO_SOURCES.length] as number;
        return (
          <View key={i} style={{ position: "absolute" as const, opacity: 0.08, top: slot.top as `${number}%`, left: slot.left, right: slot.right }} accessible={false}>
            <SafeLottie source={src as never} style={{ width: 34, height: 34 }} autoPlay loop speed={0.4}  />
          </View>
        );
      })}
    </View>
  );
}

// -- Video sidebar with like/save state --
function VideoSidebar({ itemId, baseLikes, baseSaves }: { itemId: string; baseLikes: number; baseSaves: number }) {
  const toggleLike = useFeedInteractionsStore((s) => s.toggleLike);
  const toggleSave = useFeedInteractionsStore((s) => s.toggleSave);
  const isLiked = useFeedInteractionsStore((s) => s.isLiked);
  const isSaved = useFeedInteractionsStore((s) => s.isSaved);
  const getLikes = useFeedInteractionsStore((s) => s.getLikes);
  return (
    <FeedSidebar
      likes={getLikes(itemId, baseLikes)}
      saves={baseSaves}
      isLiked={isLiked(itemId)}
      isSaved={isSaved(itemId)}
      onLike={() => toggleLike(itemId, baseLikes)}
      onSave={() => toggleSave(itemId)}
    />
  );
}

// -- Main Home Screen --
export function FinFeedScreen() {
  const router = useRouter();
  const [listHeight, setListHeight] = useState<number>(0);
  const [activeItemIndex, setActiveItemIndex] = useState(-1);
  const [feedSeed, setFeedSeed] = useState(() => Math.floor(Math.random() * 0x7fffffff));
  const { showStreakCelebration } = useStreakCelebration();
  const streakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flatListRef = useRef<FlatList<FeedItem>>(null);
  useScrollToTop(flatListRef);

  // Continuous auto-scroll during walkthrough feed step — feels infinite
  const walkthroughScreen = useTutorialStore((s) => s.walkthroughActiveScreen);
  useEffect(() => {
    if (walkthroughScreen !== 'feed') return;
    let scrollIdx = 0;
    const delay = setTimeout(() => {
      const interval = setInterval(() => {
        scrollIdx += 1;
        try {
          flatListRef.current?.scrollToIndex({ index: scrollIdx, animated: true });
        } catch { /* safe — index may be out of range */ }
      }, 3000);
      return () => clearInterval(interval);
    }, 1500);
    return () => clearTimeout(delay);
  }, [walkthroughScreen]);

  // Wire module-level scroll helper for WelcomeCard
  _feedListScrollToIndex = (index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  const progress = useChapterStore((s) => s.progress);
  const aiProfile = useAITelemetryStore((s) => s.profile);
  const getUnansweredMacroEvents = useMacroEventStore((s) => s.getUnanswered);
  const completedScenarios = useScenarioLabStore((s) => s.completedScenarios);
  const xp = useEconomyStore((s) => s.xp);
  const streak = useEconomyStore((s) => s.streak);
  const { layer: currentLayer } = getPyramidStatus(xp);
  const todayQuiz = useDailyQuizStore((s) => s.todayQuiz);
  const hasAnsweredQuizToday = useDailyQuizStore((s) => s.hasAnsweredToday);
  const knowledgeLevel = useAuthStore((s) => s.profile?.knowledgeLevel);
  const isQuizUnlocked = currentLayer >= 2 || knowledgeLevel === 'experienced' || knowledgeLevel === 'expert';

  // Ensure daily quiz is always available — set fallback immediately, then try API
  useEffect(() => {
    const store = useDailyQuizStore.getState();
    const today = new Date().toISOString().slice(0, 10);
    const category = getCategoryForDate(today);
    const fallback = getFallbackQuiz(today, category);
    store.setTodayQuiz(fallback);
    // Then try to upgrade to AI-generated quiz in background
    refreshDailyQuiz().catch(() => {});
  }, []);

  // Show streak popup on focus — but DON'T reshuffle feed (preserves scroll position)
  useFocusEffect(
    useCallback(() => {
      // Consume pending scroll (e.g. from daily challenge completion)
      if (_pendingFeedScrollIndex !== null && listHeight > 0) {
        const idx = _pendingFeedScrollIndex;
        _pendingFeedScrollIndex = null;
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({ index: idx, animated: true });
        }, 300);
      }

      // Show streak popup once per day, only on first app entry (skip during walkthrough)
      if (streak > 0 && !streakCheckedThisSession && useTutorialStore.getState().hasSeenAppWalkthrough) {
        streakCheckedThisSession = true;
        const today = new Date().toISOString().slice(0, 10);
        AsyncStorage.getItem(STREAK_POPUP_KEY).then((lastDate) => {
          if (lastDate !== today) {
            AsyncStorage.setItem(STREAK_POPUP_KEY, today);
            streakTimerRef.current = setTimeout(() => {
              showStreakCelebration();
            }, 2000);
          }
        });
      }
      return () => {
        if (streakTimerRef.current) clearTimeout(streakTimerRef.current);
      };
    }, [streak])
  );

  const feedItems = useMemo(() => {
    const seed = feedSeed;

    // Hook cards — top 4 uncompleted per chapter across all 5 chapters
    const hooks: FeedModuleHook[] = CHAPTER_META.flatMap(({ data, storeId, chapterId, name, layer }) => {
      const completedSet = new Set(progress[storeId]?.completedModules ?? []);
      const result: FeedModuleHook[] = [];
      for (let index = 0; index < data.modules.length && result.length < 4; index++) {
        const m = data.modules[index];
        if (completedSet.has(m.id)) continue;
        result.push({
          id: `hook-${m.id}`,
          type: "module-hook" as const,
          moduleId: m.id,
          moduleIndex: index,
          chapterId,
          storeChapterId: storeId,
          moduleTitle: m.title,
          chapterName: name,
          hook: m.videoHook,
          videoHookAsset: m.videoHookAsset,
          pyramidLayer: layer,
        });
      }
      return result;
    });

    // Wisdom flashes → mapped to FeedQuote
    const wisdomItems: FeedQuote[] = [
      ...wisdomQuotes.map((w) => ({
        id: w.id,
        type: "quote" as const,
        title: `${w.icon} ${w.author}`,
        quote: w.text,
        author: w.authorRole,
        category: "Investing" as const,
        pyramidLayer: 3 as const,
        likes: 0,
        saves: 0,
      })),
      ...psychWisdomFlashes.map((p) => ({
        id: p.id,
        type: "quote" as const,
        title: `${p.icon} ${CATEGORY_LABELS[p.category]}`,
        quote: p.text,
        category: "Investing" as const,
        pyramidLayer: 3 as const,
        likes: 0,
        saves: 0,
      })),
    ];

    // Macro-event cards — up to 3 unanswered events; cycle from beginning if all answered
    const unansweredEvents = getUnansweredMacroEvents(macroEventsData, 8);
    const macroEventsToShow = unansweredEvents.length > 0
      ? unansweredEvents
      : macroEventsData.slice(0, 8);
    const macroItems: FeedItem[] = macroEventsToShow.map((event) => ({
      id: `macro-${event.id}`,
      type: "macro-event" as const,
      event,
    }));

    // Pool: base feed + comics + hooks + wisdom + macro-events + scenarios
    const pool: FeedItem[] = [
      ...MOCK_FEED_DATA,
      ...COMIC_FEED_ITEMS,
      ...hooks,
      ...wisdomItems,
      ...macroItems,
      ...PREMIUM_LEARNING_ITEMS,
    ];

    // Categorize items for the cyclical pattern: Game -> Quote -> Video
    const games: FeedItem[] = [
      ...macroItems,
      ...PREMIUM_LEARNING_ITEMS,
      ...MOCK_FEED_DATA.filter(i => i.type !== "video" && i.type !== "quote"),
      { id: 'myth-or-tachles', type: 'myth-or-tachles' },
      { id: 'daily-investment', type: 'daily-investment' as const },
      { id: 'crash-game', type: 'crash-game' as const },
      { id: 'swipe-game', type: 'swipe-game' },
      { id: 'graham-personality', type: 'graham-personality' } as const,
    ];
    
    // Add daily quiz
    const today = new Date().toISOString().slice(0, 10);
    const quizToShow = todayQuiz ?? getFallbackQuiz(today, getCategoryForDate(today));
    if (quizToShow) {
      games.push({
        id: `daily-quiz-${quizToShow.date || today}`,
        type: 'daily-quiz' as const,
        quiz: quizToShow,
      });
    }

    const quotes: FeedItem[] = [
      ...wisdomItems,
      ...COMIC_FEED_ITEMS,
      ...MOCK_FEED_DATA.filter(i => i.type === "quote"),
    ];

    // Hook videos — interspersed between games and quotes
    const videos: FeedItem[] = [...hooks];

    // Shuffle each category using the random seed (changes on tab focus)
    const shuffledGames = seededShuffle(games, seed);
    const shuffledQuotes = seededShuffle(quotes, seed + 1);
    const shuffledVideos = seededShuffle(videos, seed + 2);

    const merged: FeedItem[] = [];
    const maxLength = Math.max(shuffledGames.length, shuffledQuotes.length, shuffledVideos.length);

    // Build the infinite cycle layout: [Game, Quote, Video]
    for (let i = 0; i < maxLength; i++) {
      if (i < shuffledGames.length) merged.push(shuffledGames[i]);
      if (i < shuffledQuotes.length) merged.push(shuffledQuotes[i]);
      if (i < shuffledVideos.length) merged.push(shuffledVideos[i]);
    }
    // Ensure no 2 videos in a row
    const filteredMerged: FeedItem[] = [];
    let lastWasVideo = false;
    for (const item of merged) {
      const isVideo = item.type === "video" || item.type === "module-hook";
      if (isVideo && lastWasVideo) {
        continue; // drop consecutive video
      }
      filteredMerged.push(item);
      lastWasVideo = isVideo;
    }

    // Always put daily-dilemma FIRST, then daily-quiz (מבזק) SECOND
    // Remove daily-quiz from shuffled position if it ended up there
    const quizIdx = filteredMerged.findIndex((i) => i.type === 'daily-quiz');
    const quizItem = quizIdx >= 0 ? filteredMerged.splice(quizIdx, 1)[0] : null;

    // Pin a macro-event at position 3 (after dilemma + quiz) so users always see one early
    const macroIdx = filteredMerged.findIndex((i) => i.type === 'macro-event');
    const pinnedMacro = macroIdx >= 0 ? filteredMerged.splice(macroIdx, 1)[0] : null;

    if (quizItem) filteredMerged.unshift(quizItem);
    filteredMerged.unshift({ id: 'daily-dilemma', type: 'daily-dilemma' });

    // Insert pinned BENBEN creator video at position 7 (rotates each session)
    const benbenVideo = BENBEN_VIDEOS[seed % BENBEN_VIDEOS.length];
    filteredMerged.splice(Math.min(7, filteredMerged.length), 0, benbenVideo);

    // Insert pinned macro event at position 8
    if (pinnedMacro) {
      const insertAt = Math.min(8, filteredMerged.length);
      filteredMerged.splice(insertAt, 0, pinnedMacro);
    }

    return filteredMerged;
  }, [feedSeed, progress, aiProfile, completedScenarios]);

  const getItemLayout = useCallback((_data: ArrayLike<FeedItem> | null | undefined, index: number) => ({
    length: listHeight,
    offset: listHeight * index,
    index,
  }), [listHeight]);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 });

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      const idx = viewableItems[0].index ?? 0;
      setActiveItemIndex(idx);

      // Handle full-screen TikTok mode for videos
      const isVideo = viewableItems[0].item?.type === "video" || viewableItems[0].item?.type === "module-hook";
      useFeedInteractionsStore.getState().setIsVideoActive(isVideo);
    }
  });

  const renderItem = ({ item, index }: { item: FeedItem; index: number }) => {
    const isActive = index === activeItemIndex;
    const showDecorations = item.type !== "video";

    return (
      <View style={{ height: listHeight, width: SCREEN_WIDTH, justifyContent: "center", backgroundColor: showDecorations ? "#f0f9ff" : "#000", overflow: "hidden" }}>
        {/* Subtle sea + money Lottie background for non-video items */}
        {showDecorations && <FeedItemDecorations seed={item.id} />}

        {item.type === "video" && <FeedVideoItem item={item} isActive={isActive} />}
        {item.type === "quote" && <FeedQuoteItem item={item} isActive={isActive} />}
        {item.type === "comic" && <FeedComicItem item={item} isActive={isActive} />}
        {item.type === "module-hook" && <FeedModuleHookCard item={item} isActive={isActive} />}
        {item.type === "macro-event" && (
          <MacroEventCard
            item={item}
            isActive={isActive}
            onAnswer={() => {}}
          />
        )}
        {item.type === "daily-quiz" && (
          <DailyQuizCard quiz={item.quiz} isActive={isActive} />
        )}
        {item.type === "daily-dilemma" && (
          <View>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#0f172a", textAlign: "right", writingDirection: "rtl", paddingHorizontal: 16, marginBottom: 8 }}>
              האתגר היומי
            </Text>
            <DilemmaCard isActive={isActive} />
          </View>
        )}
        {item.type === "daily-investment" && (
          <InvestmentCard isActive={isActive} />
        )}
        {item.type === "myth-or-tachles" && (
          <MythFeedCard />
        )}
        {item.type === "premium-learning" && (
          <FeedPremiumLearningCard item={item} isActive={isActive} />
        )}
        {item.type === "swipe-game" && (
          <SwipeGameCard isActive={isActive} />
        )}
        {item.type === "crash-game" && (
          <CrashGameCard isActive={isActive} />
        )}
        {item.type === "graham-personality" && (
          <GrahamPersonalityFeedCard isActive={isActive} />
        )}
        {/* Action Sidebar — videos only */}
        {item.type === "video" && (
          <VideoSidebar itemId={item.id} baseLikes={item.likes} baseSaves={item.saves} />
        )}
      </View>
    );
  };

  const theme = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }} onLayout={(e) => {
      // Only set height if it's not set yet to prevent re-renders
      if (listHeight === 0) setListHeight(e.nativeEvent.layout.height);
    }}>
      {listHeight > 0 && (
        <FlatList
          ref={flatListRef}
          data={feedItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={() => (
             <WelcomeCard height={listHeight} />
          )}
          ListEmptyComponent={<FeedSkeleton />}
          showsVerticalScrollIndicator={false}
          pagingEnabled={true}
          viewabilityConfig={viewabilityConfig.current}
          onViewableItemsChanged={onViewableItemsChanged.current}
          maxToRenderPerBatch={5}
          updateCellsBatchingPeriod={50}
          windowSize={7}
          removeClippedSubviews
          getItemLayout={getItemLayout}
        />
      )}



      {useTutorialStore.getState().hasSeenAppWalkthrough && <NotificationPermissionBanner />}
    </View>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: "absolute",
    bottom: 24,
    left: 20,
    zIndex: 50,
  },
  fab: {
    shadowColor: "#001b3d",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderRadius: 999,
  },
  fabGradient: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 999,
    gap: 10,
    borderWidth: 1.5,
    borderColor: "#bae6fd",
  },
  fabText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0369a1",
  },
});

