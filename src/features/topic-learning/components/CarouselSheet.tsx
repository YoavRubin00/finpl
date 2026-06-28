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

import { STITCH } from "../../../constants/theme";
import { tapHaptic } from "../../../utils/haptics";
import { SheetCloseButton } from "../../../components/ui/SheetCloseButton";
import { toProxiedImageUri } from "../../../lib/imageProxy";
import type { CarouselSlide } from "../moduleCarouselMap";

/**
 * Generic in-app carousel viewer — a swipeable pager of CLOUD-hosted branded
 * slides (the Instagram edu-carousel surfaced as a topic-tree chip). Same UX as
 * MondialCarouselSheet (slide-up Modal, swipe-anywhere, X/N counter, RTL dots,
 * "המשך"/"סיום") but parameterized: slides + title come from the caller
 * (moduleCarouselMap), and images load from a URL via expo-image — proxied
 * through /api/img (toProxiedImageUri) to dodge the per-client Blob 403 burst.
 *
 * NO marketing CTA slide — inside the app the user is already playing (Yoav
 * 2026-06-21). Paging is state-driven (render the current slide only) + a Pan
 * gesture, the same RTL-safe approach as the Mondial sheet.
 */
export function CarouselSheet({
  visible,
  onClose,
  title,
  slides,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  slides: CarouselSlide[];
}): React.ReactElement | null {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const total = slides.length;

  useEffect(() => {
    if (visible) setPage(0);
  }, [visible]);

  const go = useCallback(
    (dir: number) => {
      setPage((p) => Math.max(0, Math.min(total - 1, p + dir)));
    },
    [total],
  );

  // Warm the next slide's decoded image into cache so swiping advances are
  // instant (the proxied 4:5 PNGs are heavy to decode on first paint).
  useEffect(() => {
    const next = slides[page + 1];
    if (next) void ExpoImage.prefetch(toProxiedImageUri(next.uri), "memory-disk");
  }, [page, slides]);

  // Horizontal swipe → next/prev. RTL mapping mirrors MondialCarouselSheet:
  // rightward drag = advance (next slide sits to the LEFT in RTL), leftward =
  // back. activeOffsetX lets vertical drags + taps pass through.
  const pan = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .onEnd((e) => {
      "worklet";
      if (e.translationX >= 40 || e.velocityX >= 500) runOnJS(go)(1);
      else if (e.translationX <= -40 || e.velocityX <= -500) runOnJS(go)(-1);
    });

  if (!visible || total === 0) return null;

  const slide = slides[page];
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
          <GestureDetector gesture={pan}>
            <View style={{ flex: 1 }}>
              <View style={styles.topBar}>
                <View style={styles.topRow}>
                  <Text style={styles.title} allowFontScaling={false}>
                    {title}
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

              <View style={styles.stage}>
                {/* No key={page}: keep the wrapper mounted so prefetched images
                    crossfade via ExpoImage's transition={150} instead of remounting
                    (a remount discards the warmed cache). FadeIn fires on first mount. */}
                <Animated.View
                  entering={FadeIn.duration(180)}
                  style={styles.slideWrap}
                >
                  <ExpoImage
                    source={{ uri: toProxiedImageUri(slide.uri) }}
                    accessibilityLabel={slide.alt}
                    style={{ width: imgW, aspectRatio: 4 / 5, borderRadius: 20 }}
                    contentFit="contain"
                    transition={150}
                    cachePolicy="memory-disk"
                  />
                </Animated.View>
              </View>

              <Text style={styles.counterText} allowFontScaling={false}>
                {`${page + 1} / ${total}`}
              </Text>
              <View style={styles.dotsRow}>
                {slides.map((s, i) => (
                  <Pressable
                    key={s.uri}
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

              <View style={[styles.ctaWrap, { paddingBottom: insets.bottom + 16 }]}>
                <Pressable
                  onPress={() => {
                    tapHaptic();
                    if (page < total - 1) go(1);
                    else onClose();
                  }}
                  style={styles.ctaBtn}
                  accessibilityRole="button"
                  accessibilityLabel={page < total - 1 ? "לשקופית הבאה" : "סיום"}
                >
                  <Text style={styles.ctaText} allowFontScaling={false}>
                    {page < total - 1 ? "המשך" : "סיום"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </GestureDetector>
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
  counterText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#64748b",
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  ctaWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  ctaBtn: {
    backgroundColor: "#16a34a",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 4,
    borderBottomColor: "#15803d",
  },
  ctaText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    writingDirection: "rtl",
  },
});
