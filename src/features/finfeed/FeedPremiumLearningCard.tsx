import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Image as ExpoImage } from "expo-image";
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import {
  View,
  Text,
  Pressable,
  Dimensions,
  StyleSheet,
  PanResponder,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import { AnimatedPressable } from '../../components/ui/AnimatedPressable';
import { LottieIcon } from '../../components/ui/LottieIcon';
import { useChapterStore } from '../chapter-1-content/useChapterStore';
import type { FeedPremiumLearning } from './types';
import { FINN_STANDARD } from '../retention-loops/finnMascotConfig';
import { useSoundEffect } from '../../hooks/useSoundEffect';
import { tapHaptic } from '../../utils/haptics';
import { FeedStartButton } from './minigames/shared/FeedStartButton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const LOTTIE_ARROW = require('../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

// ── Tap Zones sub-component: full image, tap left/right for popups ──
function TapZonesCard({ item, onStartModule }: { item: FeedPremiumLearning; onStartModule: () => void }) {
  const [popup, setPopup] = useState<'left' | 'right' | null>(null);
  const finnText = item.finnExplanations?.[0] ?? '';

  return (
    <View style={styles.container}>
      {/* Full image */}
      <View style={{ flex: 1, borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
        <ExpoImage
          source={item.infographics[0]}
          style={{ width: '100%', height: '100%' }}
          contentFit="contain"
          cachePolicy="memory-disk"
          priority="high"
          transition={200}
          placeholderContentFit="cover"
        />
        {/* Invisible tap zones */}
        <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setPopup(popup === 'left' ? null : 'left')} accessibilityRole="button" accessibilityLabel="הצג הסבר שמאל" />
          <Pressable style={{ flex: 1 }} onPress={() => setPopup(popup === 'right' ? null : 'right')} accessibilityRole="button" accessibilityLabel="הצג הסבר ימין" />
        </View>

        {/* Popup notification */}
        {popup && item.tapZoneLeft && item.tapZoneRight && (
          <Animated.View
            key={popup}
            entering={FadeInDown.duration(300)}
            style={{
              position: 'absolute', bottom: 12, left: 12, right: 12,
              backgroundColor: '#ffffff', borderRadius: 16, padding: 14,
              borderWidth: 1, borderColor: '#e0f2fe',
              shadowColor: '#0c4a6e', shadowOpacity: 0.1, shadowRadius: 10,
              shadowOffset: { width: 0, height: 3 }, elevation: 6,
              flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
            }}
          >
            <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 40, height: 40, flexShrink: 0 }} contentFit="contain" />
            <View style={{ flex: 1 }}>
              <Text style={[RTL, { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 2 }]}>
                {popup === 'right' ? item.tapZoneRight.title : item.tapZoneLeft.title}
              </Text>
              <Text style={[RTL, { fontSize: 12, fontWeight: '500', color: '#475569', lineHeight: 18 }]}>
                {popup === 'right' ? item.tapZoneRight.text : item.tapZoneLeft.text}
              </Text>
            </View>
            <Pressable onPress={() => setPopup(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ position: 'absolute', top: 8, left: 8 }} accessibilityRole="button" accessibilityLabel="סגור">
              <Text style={{ color: '#64748b', fontSize: 16, fontWeight: '600' }}>✕</Text>
            </Pressable>
          </Animated.View>
        )}
      </View>

      {/* Finn hint */}
      {finnText !== '' && (
        <View style={[styles.finnBubble, { marginTop: 8 }]}>
          <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 36, height: 36, flexShrink: 0 }} contentFit="contain" />
          <Text style={[styles.finnText, RTL]}>{finnText}</Text>
        </View>
      )}

      {/* CTA */}
      <FeedStartButton label="להתחיל ללמוד!" onPress={onStartModule} accessibilityLabel="התחל ללמוד" />
    </View>
  );
}

interface Props {
  item: FeedPremiumLearning;
  isActive: boolean;
}

export const FeedPremiumLearningCard = React.memo(function FeedPremiumLearningCard({ item, isActive: _isActive }: Props) {
  const router = useRouter();
  const { playSound } = useSoundEffect();
  const isDiveMode = item.diveMode && item.zoomRegions && item.zoomRegions.length > 0;
  const totalSteps = isDiveMode
    ? (item.finnExplanations?.length ?? item.zoomRegions?.length ?? 1)
    : item.infographics.length;
  const [step, setStep] = useState(0);
  const isLastStep = step >= totalSteps;

  // Audio Playback
  useEffect(() => {
    let playerObj: AudioPlayer | null = null;
    let isActive = true;

    if (_isActive && item.finnAudioUrl) {
      const targetStep = item.finnAudioIndex ?? 0;
      const matchesStep = item.singlePageView || item.tapZones ? true : step === targetStep;

      if (matchesStep) {
        try {
          const player = createAudioPlayer({ uri: item.finnAudioUrl });
          player.play();
          if (isActive) {
            playerObj = player;
          } else {
            player.remove();
          }
        } catch { /* audio playback failed, silent */ }
      }
    }

    return () => {
      isActive = false;
      if (playerObj) {
        try { playerObj.pause(); playerObj.remove(); } catch { /* ignore */ }
      }
    };
  }, [step, _isActive, item.finnAudioUrl, item.finnAudioIndex, item.singlePageView, item.tapZones]);

  // Animated zoom for dive mode
  const zoomScale = useSharedValue(1);
  const zoomX = useSharedValue(0);
  const zoomY = useSharedValue(0);

  const zoomStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: zoomX.value },
      { translateY: zoomY.value },
      { scale: zoomScale.value },
    ],
  }));

  // Refs for swipe handler (avoids stale closure)
  const handleNextRef = useRef<() => void>(() => {});
  const handlePrevRef = useRef<() => void>(() => {});

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 30 && Math.abs(g.dy) < 30,
      onPanResponderRelease: (_, g) => {
        // RTL: swipe right (dx > 0) = next, swipe left (dx < 0) = prev
        if (g.dx > 50) handleNextRef.current();
        else if (g.dx < -50) handlePrevRef.current();
      },
    })
  ).current;

  const handleNext = useCallback(() => {
    tapHaptic();
    playSound('btn_click_soft_2');
    const nextStep = step + 1;
    setStep(nextStep);

    // Animate zoom in dive mode
    if (isDiveMode && item.zoomRegions && nextStep < totalSteps) {
      const [x, y, s] = item.zoomRegions[nextStep];
      const prevRegion = item.zoomRegions[step];
      if (prevRegion && prevRegion[2] > 1 && s > 1) {
        const out = { duration: 300, easing: Easing.out(Easing.quad) };
        const inn = { duration: 500, easing: Easing.out(Easing.quad) };
        zoomScale.value = withSequence(withTiming(1, out), withTiming(s, inn));
        zoomX.value = withSequence(withTiming(0, out), withTiming(x, inn));
        zoomY.value = withSequence(withTiming(0, out), withTiming(y, inn));
      } else {
        const cfg = { duration: 600, easing: Easing.out(Easing.quad) };
        zoomScale.value = withTiming(s, cfg);
        zoomX.value = withTiming(x, cfg);
        zoomY.value = withTiming(y, cfg);
      }
    } else if (isDiveMode && nextStep >= totalSteps) {
      // Reset zoom for CTA
      zoomScale.value = withTiming(1, { duration: 400 });
      zoomX.value = withTiming(0, { duration: 400 });
      zoomY.value = withTiming(0, { duration: 400 });
    }
  }, [step, isDiveMode, item.zoomRegions, totalSteps, zoomScale, zoomX, zoomY, playSound]);

  const handlePrev = useCallback(() => {
    if (step > 0) {
      tapHaptic();
      playSound('btn_click_soft_1');
      const prevStep = step - 1;
      setStep(prevStep);
      if (isDiveMode && item.zoomRegions && prevStep < totalSteps) {
        const [x, y, s] = item.zoomRegions[prevStep];
        const fromRegion = item.zoomRegions[step];
        if (fromRegion && fromRegion[2] > 1 && s > 1) {
          const out = { duration: 300, easing: Easing.out(Easing.quad) };
          const inn = { duration: 500, easing: Easing.out(Easing.quad) };
          zoomScale.value = withSequence(withTiming(1, out), withTiming(s, inn));
          zoomX.value = withSequence(withTiming(0, out), withTiming(x, inn));
          zoomY.value = withSequence(withTiming(0, out), withTiming(y, inn));
        } else {
          const cfg = { duration: 600, easing: Easing.out(Easing.quad) };
          zoomScale.value = withTiming(s, cfg);
          zoomX.value = withTiming(x, cfg);
          zoomY.value = withTiming(y, cfg);
        }
      }
    }
  }, [step, isDiveMode, item.zoomRegions, totalSteps, zoomScale, zoomX, zoomY, playSound]);

  // Keep refs current for PanResponder
  handleNextRef.current = handleNext;
  handlePrevRef.current = handlePrev;

  const handleStartModule = useCallback(() => {
    tapHaptic();
    playSound('btn_click_heavy');
    useChapterStore.getState().setCurrentChapter(item.storeChapterId);
    useChapterStore.getState().setCurrentModule(item.moduleIndex);
    router.push(`/lesson/${item.moduleId}?chapterId=${item.chapterId}` as never);
  }, [item, router, playSound]);

  // CTA, last step
  if (isLastStep) {
    return (
      <View style={styles.container}>
        <Animated.View entering={FadeIn.duration(400)} style={styles.ctaCenter}>
          <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 90, height: 90 }} contentFit="contain" />
          <Text style={[styles.ctaTitle, RTL]}>רוצה ללמוד עוד?</Text>
          <Text style={[styles.ctaSub, RTL]}>
            התחל את המודולה המלאה של {item.moduleTitle}
          </Text>
          <View style={{ alignSelf: 'stretch', width: '100%', marginTop: 8 }}>
            <FeedStartButton label="להתחיל ללמוד!" onPress={handleStartModule} accessibilityLabel="התחל ללמוד" />
          </View>
        </Animated.View>
      </View>
    );
  }

  // ── Tap Zones mode: full-screen image with left/right tap areas ──
  if (item.tapZones && item.tapZoneLeft && item.tapZoneRight) {
    return <TapZonesCard item={item} onStartModule={handleStartModule} />;
  }

  // ── Single Page View: full-screen image, finn text, and start module CTA directly ──
  if (item.singlePageView) {
    const singleFinnText = item.finnExplanations?.[0] ?? '';
    return (
      <View style={styles.container}>
        <View style={styles.imageContainer}>
          <ExpoImage
            source={item.infographics[0]}
            style={styles.image}
            contentFit="contain"
            cachePolicy="memory-disk"
            priority="high"
            transition={150}
          />
        </View>
        
        {singleFinnText !== '' && (
          <View style={[styles.finnBubble, { marginTop: 8 }]}>
            <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 36, height: 36, flexShrink: 0 }} contentFit="contain" />
            <Text style={[styles.finnText, RTL]}>{singleFinnText}</Text>
          </View>
        )}

        <FeedStartButton label="להתחיל ללמוד!" onPress={handleStartModule} accessibilityLabel="התחל ללמוד" />
      </View>
    );
  }

  const finnText = item.finnExplanations?.[step] ?? '';

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {/* Step dots (RTL) */}
      <View style={styles.dotsRow}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === step && styles.dotActive,
              i < step && styles.dotDone,
            ]}
          />
        ))}
      </View>

      {/* Infographic image, dive mode or normal */}
      <View style={styles.imageContainer}>
        {isDiveMode ? (
          <View style={styles.diveViewport}>
            <Animated.View style={[styles.diveImage, zoomStyle]}>
              <ExpoImage
                source={item.infographics[0]}
                style={{ width: SCREEN_WIDTH - 24, height: (SCREEN_WIDTH - 24) * 1.6 }}
                contentFit="contain"
                cachePolicy="memory-disk"
                priority="high"
                transition={150}
              />
            </Animated.View>
          </View>
        ) : (
          <Animated.View key={`step-${step}`} entering={FadeIn.duration(300)}>
            <ExpoImage
              source={item.infographics[step]}
              style={styles.image}
              contentFit="contain"
              cachePolicy="memory-disk"
              priority="high"
              transition={150}
            />
          </Animated.View>
        )}
      </View>

      {/* Finn explanation */}
      {finnText !== '' && (
        <Animated.View key={`finn-${step}`} entering={FadeInDown.delay(isDiveMode ? 400 : 200).duration(400)} style={styles.finnBubble}>
          <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 36, height: 36, flexShrink: 0 }} contentFit="contain" />
          <Text style={[styles.finnText, RTL]}>{finnText}</Text>
        </Animated.View>
      )}

      {/* Full-width continue button */}
      <AnimatedPressable onPress={handleNext} style={styles.nextBtn} accessibilityRole="button" accessibilityLabel="המשך לשלב הבא">
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Text style={styles.nextBtnText}>המשך</Text>
          <View accessible={false}><LottieIcon source={LOTTIE_ARROW} size={18} /></View>
        </View>
      </AnimatedPressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    justifyContent: 'center',
  },
  dotsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(14,165,233,0.2)',
  },
  dotActive: {
    backgroundColor: '#0891b2',
    width: 20,
    borderRadius: 4,
  },
  dotDone: {
    backgroundColor: '#06b6d4',
  },
  imageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: SCREEN_WIDTH - 24,
    height: '100%',
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  diveViewport: {
    flex: 1,
    width: SCREEN_WIDTH - 24,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
  },
  diveImage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  finnBubble: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#bae6fd',
    shadowColor: '#0891b2',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  finnText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#0c4a6e',
    lineHeight: 20,
  },
  /* stepCounter removed, no longer shown */
  nextBtn: {
    width: '100%',
    backgroundColor: '#0891b2',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#0e7490',
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  ctaCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0369a1',
    textAlign: 'center',
  },
  ctaSub: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
  },
});
