import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  useWindowDimensions,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, runOnJS } from "react-native-reanimated";
import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture,
} from "react-native-gesture-handler";
import { ChevronRight } from "lucide-react-native";

import { STITCH } from "../../constants/theme";
import { tapHaptic } from "../../utils/haptics";
import { SheetCloseButton } from "../../components/ui/SheetCloseButton";
import { MONDIAL_SLIDES } from "./mondialCarouselData";

/**
 * Pearl-style swipeable carousel for the featured "מאחורי המונדיאל" content.
 * Mirrors the PearlSheet chrome (slide-up Modal, GestureHandlerRootView wrap,
 * title row + close chevron) but the body is a horizontal pager of the 5
 * baked-Hebrew slides.
 *
 * Paging is state-driven (render only the current slide) rather than a native
 * horizontal ScrollView/FlatList — RN's RTL layout flips horizontal scroll
 * order, and PearlSheet hit the same "scrollToIndex no-ops" bug, so we advance
 * via a Pan gesture (absolute deltas, RTL-safe) + tappable dots.
 */
export function MondialCarouselSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}): React.ReactElement | null {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const total = MONDIAL_SLIDES.length;

  useEffect(() => {
    if (visible) setPage(0);
  }, [visible]);

  const go = useCallback(
    (dir: number) => {
      setPage((p) => Math.max(0, Math.min(total - 1, p + dir)));
    },
    [total]
  );

  // Horizontal swipe → next/prev.  activeOffsetX so a mostly-vertical drag
  // doesn't hijack; absolute translationX so it's unaffected by RTL layout.
  //
  // RTL gesture mapping (Hebrew "book" reading direction):
  //   swipe LEFT  (translationX < 0) → advance forward  → go(+1)
  //   swipe RIGHT (translationX > 0) → go back          → go(-1)
  // This matches native iOS/Android RTL pager behaviour and feels natural for
  // a right-to-left reader (slide 0 is the "rightmost" conceptually).
  const pan = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .onEnd((e) => {
      "worklet";
      if (e.translationX <= -40) runOnJS(go)(1);
      else if (e.translationX >= 40) runOnJS(go)(-1);
    });

  if (!visible) return null;

  const slide = MONDIAL_SLIDES[page];
  const imgW = Math.min(width - 32, 460);

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <GestureHandlerRootView
        style={{ flex: 1, paddingTop: insets.top, backgroundColor: "#f8fafc" }}
      >
        <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
          <View style={styles.topBar}>
            <View style={styles.topRow}>
              <Text style={styles.title} allowFontScaling={false}>
                מאחורי המונדיאל
              </Text>
              <View style={styles.closeBtnRight} pointerEvents="box-none">
                <SheetCloseButton
                  onPress={onClose}
                  accessibilityLabel="חזרה למסך הלמידה"
                  icon={<ChevronRight size={22} color={STITCH.onSurface} strokeWidth={2.6} />}
                />
              </View>
            </View>
          </View>

          <GestureDetector gesture={pan}>
            <View style={styles.stage}>
              <Animated.View
                key={page}
                entering={FadeIn.duration(180)}
                style={styles.slideWrap}
              >
                <ExpoImage
                  source={slide.source}
                  accessibilityLabel={slide.alt}
                  style={{ width: imgW, aspectRatio: 4 / 5, borderRadius: 20 }}
                  contentFit="contain"
                  transition={120}
                />
              </Animated.View>
            </View>
          </GestureDetector>

          {/* Page dots — tappable, RTL-ordered.
              flexDirection:"row-reverse" places dot 0 (the cover / first slide)
              on the visual RIGHT, matching the Hebrew right-to-left reading
              order so the active pill tracks rightward as the user progresses
              (mirrors iOS RTL pager behaviour).  accessibilityLabel uses the
              RTL visual position: dot at visual position (total - i) from right. */}
          <View style={[styles.dotsRow, { paddingBottom: insets.bottom + 18 }]}>
            {MONDIAL_SLIDES.map((s, i) => (
              <Pressable
                key={s.id}
                onPress={() => {
                  tapHaptic();
                  setPage(i);
                }}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`שקופית ${total - i} מתוך ${total}`}
              >
                <View style={[styles.dot, i === page && styles.dotActive]} />
              </Pressable>
            ))}
          </View>
        </SafeAreaView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  topBar: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6 },
  topRow: { height: 44, justifyContent: "center", position: "relative" },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: STITCH.onSurface,
    writingDirection: "rtl",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  closeBtnRight: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  stage: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  slideWrap: { alignItems: "center", justifyContent: "center" },
  dotsRow: {
    // RTL: dot 0 (first/cover slide) sits on the visual right, trailing dots
    // extend leftward — mirrors the Hebrew right-to-left reading order.
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingTop: 14,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#cbd5e1",
  },
  dotActive: {
    width: 22,
    backgroundColor: "#16a34a",
  },
});
