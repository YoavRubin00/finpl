import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  FlatList,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image as ExpoImage } from "expo-image";
import { X, Lock, Layers } from "lucide-react-native";
import { useTheme } from "../../hooks/useTheme";
import { tapHaptic } from "../../utils/haptics";
import { captureEvent } from "../../lib/posthog";
import { getAllDecks, type ModuleDeck } from "./deckCatalog";
import { useCardCollectionStore } from "./useCardCollectionStore";
import { useCollectionBackfill } from "./useCollectionBackfill";
import { FINN_DANCING } from "../retention-loops/finnMascotConfig";

/**
 * אוסף חפיסות הכרטיסיות (Yoav 1.8.26) — the collection sector. Decks are
 * derived from lesson data (deckCatalog); ownership from useCardCollectionStore.
 * Grid grouped by chapter; a collected deck opens a full-screen card carousel.
 *
 * RTL is manual (row-reverse) per project convention; the carousel FlatList is
 * `inverted` so card 1 sits on the right and swiping left advances — natural
 * Hebrew reading order.
 */

export function CollectionScreen() {
  const router = useRouter();
  const theme = useTheme();
  // Zustand v5: single-slice selector — `collected` is a stable persisted
  // reference between updates (never a fresh object per call).
  const collected = useCardCollectionStore((s) => s.collected);
  // Retro-grant decks for pre-feature completions before rendering the grid.
  useCollectionBackfill();
  const [viewerDeck, setViewerDeck] = useState<ModuleDeck | null>(null);

  const decks = useMemo(() => getAllDecks(), []);
  const collectedCount = decks.filter((d) => collected[d.moduleId] !== undefined).length;

  // Group decks by chapter, preserving chapter → module lesson order.
  const chapters = useMemo(() => {
    const groups: { chapterId: string; chapterTitle: string; decks: ModuleDeck[] }[] = [];
    for (const deck of decks) {
      const last = groups[groups.length - 1];
      if (last !== undefined && last.chapterId === deck.chapterId) {
        last.decks.push(deck);
      } else {
        groups.push({ chapterId: deck.chapterId, chapterTitle: deck.chapterTitle, decks: [deck] });
      }
    }
    return groups;
  }, [decks]);

  useEffect(() => {
    captureEvent("deck_collection_viewed", {
      collected_count: collectedCount,
      total_count: decks.length,
    });
    // Fire once per screen visit — counts at entry are what we want.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDeck = useCallback((deck: ModuleDeck) => {
    tapHaptic();
    captureEvent("deck_opened", { module_id: deck.moduleId, deck_size: deck.cards.length });
    setViewerDeck(deck);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="סגירת אוסף הכרטיסיות"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={20} color={theme.textMuted} />
          </Pressable>
          <View style={{ alignItems: "flex-end", flex: 1 }}>
            <Text style={[styles.headerTitle, { color: theme.text }]} allowFontScaling={false}>
              אוסף הכרטיסיות
            </Text>
            <Text style={[styles.headerSub, { color: theme.textMuted }]} allowFontScaling={false}>
              {collectedCount > 0
                ? `${collectedCount} מתוך ${decks.length} חפיסות באוסף`
                : "כל מודול שנסגר מוסיף חפיסה לאוסף"}
            </Text>
          </View>
          <View style={styles.headerIcon}>
            <Layers size={22} color="#0891b2" />
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Honest, encouraging empty state — no decks collected yet. The
              locked grid below stays visible as the "here's what's waiting"
              hint. System voice = plural (BRAND.md). */}
          {collectedCount === 0 && (
            <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <ExpoImage source={FINN_DANCING} style={styles.emptyMascot} contentFit="contain" accessible={false} />
              <Text style={[styles.emptyTitle, { color: theme.text }]} allowFontScaling={false}>
                האוסף עוד ריק — בינתיים
              </Text>
              <Text style={[styles.emptySub, { color: theme.textMuted }]} allowFontScaling={false}>
                מסיימים מודול, והחפיסה שלו עפה לכאן. הכרטיסיות נשארות אצלכם — סיכום מהיר לכל מה שלמדתם.
              </Text>
              <Pressable
                onPress={() => { tapHaptic(); router.replace("/(tabs)/learn" as never); }}
                accessibilityRole="button"
                accessibilityLabel="מעבר למסך הלמידה"
              >
                <View style={styles.emptyCtaInner}>
                  <Text style={styles.emptyCtaText} allowFontScaling={false}>לחפיסה הראשונה</Text>
                </View>
              </Pressable>
            </View>
          )}

          {chapters.map((chapter) => (
            <View key={chapter.chapterId} style={{ marginBottom: 20 }}>
              <Text style={[styles.chapterTitle, { color: theme.text }]} allowFontScaling={false}>
                {chapter.chapterTitle}
              </Text>
              <View style={styles.grid}>
                {chapter.decks.map((deck) => {
                  const isCollected = collected[deck.moduleId] !== undefined;
                  return isCollected ? (
                    <Pressable
                      key={deck.moduleId}
                      style={styles.gridItem}
                      onPress={() => openDeck(deck)}
                      accessibilityRole="button"
                      accessibilityLabel={`פתיחת חפיסת ${deck.moduleTitle}, ${deck.cards.length} כרטיסיות`}
                    >
                      {/* Android Pressable rule: background lives on an inner
                          View, never in a function-style style prop. */}
                      <View style={[styles.deckCard, { backgroundColor: theme.surface, borderColor: "#7dd3fc" }]}>
                        <ExpoImage
                          source={deck.cards[0].source}
                          style={styles.deckCover}
                          contentFit="cover"
                          transition={150}
                          accessible={false}
                        />
                        <View style={styles.deckMeta}>
                          <Text
                            style={[styles.deckTitle, { color: theme.text }]}
                            numberOfLines={2}
                            allowFontScaling={false}
                          >
                            {deck.moduleTitle}
                          </Text>
                          <View style={styles.countPill}>
                            <Text style={styles.countPillText} allowFontScaling={false}>
                              {deck.cards.length}/{deck.cards.length}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  ) : (
                    <View key={deck.moduleId} style={styles.gridItem}>
                      <View
                        style={[styles.deckCard, styles.deckCardLocked, { borderColor: theme.border }]}
                        accessible
                        accessibilityLabel={`חפיסת ${deck.moduleTitle} נעולה. סיימו את המודול כדי לאסוף`}
                      >
                        <View style={styles.lockedCover}>
                          <Lock size={26} color="#94a3b8" />
                          {/* Visual hint of what's inside: face-down mini cards */}
                          <View style={styles.lockedHintRow}>
                            {Array.from({ length: Math.min(deck.cards.length, 5) }).map((_, i) => (
                              <View key={i} style={styles.lockedHintCard} />
                            ))}
                          </View>
                        </View>
                        <View style={styles.deckMeta}>
                          <Text style={styles.deckTitleLocked} numberOfLines={2} allowFontScaling={false}>
                            {deck.moduleTitle}
                          </Text>
                          <Text style={styles.lockedHintText} allowFontScaling={false}>
                            סיימו את המודול כדי לאסוף
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>

      {viewerDeck !== null && (
        <DeckViewer deck={viewerDeck} onClose={() => setViewerDeck(null)} />
      )}
    </View>
  );
}

/** Full-screen card carousel: swipe between the deck's infographics. */
function DeckViewer({ deck, onClose }: { deck: ModuleDeck; onClose: () => void }) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const cardsCount = deck.cards.length;
  // The list is inverted (RTL paging) — offsets still map 1:1 to indices.
  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const i = Math.round(e.nativeEvent.contentOffset.x / width);
      setIndex(Math.max(0, Math.min(cardsCount - 1, i)));
    },
    [width, cardsCount],
  );
  const listRef = useRef<FlatList>(null);

  return (
    <Modal visible transparent={false} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={viewerStyles.container}>
        <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
          <View style={viewerStyles.headerRow}>
            <Pressable
              onPress={onClose}
              style={viewerStyles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="סגירת החפיסה"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={20} color="#e2e8f0" />
            </Pressable>
            <View style={{ alignItems: "flex-end", flex: 1 }}>
              <Text style={viewerStyles.title} numberOfLines={1} allowFontScaling={false}>
                {deck.moduleTitle}
              </Text>
              <Text style={viewerStyles.counter} allowFontScaling={false}>
                {index + 1} / {cardsCount}
              </Text>
            </View>
          </View>

          <FlatList
            ref={listRef}
            data={deck.cards}
            keyExtractor={(c) => c.cardId}
            horizontal
            inverted
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onMomentumEnd}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            renderItem={({ item }) => (
              <View style={[viewerStyles.page, { width }]}>
                <ExpoImage
                  source={item.source}
                  style={{ width: width - 32, aspectRatio: 1, borderRadius: 20 }}
                  contentFit="contain"
                  transition={150}
                  accessibilityLabel={item.title}
                />
                <Text style={viewerStyles.cardTitle} allowFontScaling={false}>
                  {item.title}
                </Text>
              </View>
            )}
          />

          {/* Progress dots — RTL: first card's dot on the right. */}
          <View style={viewerStyles.dotsRow}>
            {deck.cards.map((c, i) => (
              <View key={c.cardId} style={[viewerStyles.dot, i === index && viewerStyles.dotActive]} />
            ))}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(8,145,178,0.08)",
    borderWidth: 1,
    borderColor: "#a5f3fc",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    writingDirection: "rtl",
    textAlign: "right",
  },
  headerSub: {
    fontSize: 12,
    fontWeight: "600",
    writingDirection: "rtl",
    textAlign: "right",
    marginTop: 2,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(100,116,139,0.1)",
  },
  chapterTitle: {
    fontSize: 15,
    fontWeight: "800",
    writingDirection: "rtl",
    textAlign: "right",
    marginBottom: 10,
  },
  grid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 12,
  },
  gridItem: {
    width: "47.5%",
  },
  deckCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: "hidden",
    shadowColor: "#0891b2",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  deckCardLocked: {
    backgroundColor: "#f1f5f9",
    borderStyle: "dashed",
    shadowOpacity: 0,
    elevation: 0,
  },
  deckCover: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#e0f2fe",
  },
  lockedCover: {
    width: "100%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#e2e8f0",
  },
  lockedHintRow: {
    flexDirection: "row-reverse",
    gap: 4,
  },
  lockedHintCard: {
    width: 14,
    height: 20,
    borderRadius: 3,
    backgroundColor: "#cbd5e1",
    borderWidth: 1,
    borderColor: "#94a3b8",
  },
  deckMeta: {
    padding: 10,
    gap: 6,
    alignItems: "flex-end",
  },
  deckTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    writingDirection: "rtl",
    textAlign: "right",
    minHeight: 32,
  },
  deckTitleLocked: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#64748b",
    writingDirection: "rtl",
    textAlign: "right",
    minHeight: 32,
  },
  countPill: {
    borderRadius: 999,
    backgroundColor: "rgba(8,145,178,0.1)",
    borderWidth: 1,
    borderColor: "#a5f3fc",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0891b2",
    fontVariant: ["tabular-nums"],
  },
  lockedHintText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#94a3b8",
    writingDirection: "rtl",
    textAlign: "right",
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 18,
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  emptyMascot: {
    width: 84,
    height: 84,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "900",
    writingDirection: "rtl",
    textAlign: "center",
  },
  emptySub: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
    writingDirection: "rtl",
    textAlign: "center",
  },
  emptyCtaInner: {
    marginTop: 4,
    borderRadius: 999,
    backgroundColor: "#0891b2",
    paddingHorizontal: 22,
    paddingVertical: 10,
  },
  emptyCtaText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ffffff",
    writingDirection: "rtl",
  },
});

const viewerStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: "#f1f5f9",
    writingDirection: "rtl",
    textAlign: "right",
  },
  counter: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
    fontVariant: ["tabular-nums"],
    marginTop: 2,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  page: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    gap: 16,
  },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#e2e8f0",
    lineHeight: 21,
    writingDirection: "rtl",
    textAlign: "center",
    paddingHorizontal: 8,
  },
  dotsRow: {
    flexDirection: "row-reverse",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  dotActive: {
    backgroundColor: "#22d3ee",
    width: 18,
  },
});
