import React, { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, Dimensions } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Zap, Play, Volume2, VolumeX, Map } from "lucide-react-native";
import Animated from "react-native-reanimated";
import LottieView from "lottie-react-native";
import { WebView } from "react-native-webview";
import { useChapterStore } from "../chapter-1-content/useChapterStore";
import { useAudioStore } from "../../stores/useAudioStore";
import { CLASH } from "../../constants/theme";
import { FINN_STANDARD } from "../retention-loops/finnMascotConfig";
import { useSoundEffect } from "../../hooks/useSoundEffect";
import { tapHaptic, heavyHaptic } from "../../utils/haptics";
import type { FeedModuleHook } from "./types";
import { CHAPTER_CTA_COLORS } from "./types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface Props {
  item: FeedModuleHook;
  isActive: boolean;
}

function buildVideoHtml(videoUri: string): string {
  try { new URL(videoUri); } catch { return ""; }
  // Decoupled play/pause and mute/unmute: long-press pause must not silently
  // override the user's mute preference, and vice-versa.
  return `<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#000;overflow:hidden;display:flex;align-items:center;justify-content:center;height:100vh}
video{width:100%;height:100%;object-fit:cover;object-position:center bottom}
</style></head><body>
<video id="v" src="${videoUri}" playsinline webkit-playsinline preload="auto"
  loop autoplay muted></video>
<script>
var v=document.getElementById('v');
window.addEventListener('message',function(e){
  try{var d=JSON.parse(e.data);
    if(d.action==='play')v.play();
    if(d.action==='pause')v.pause();
    if(d.action==='mute')v.muted=true;
    if(d.action==='unmute')v.muted=false;
  }catch(x){}
});
if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage('READY');
</script></body></html>`;
}

export const FeedModuleHookCard = React.memo(function FeedModuleHookCard({ item, isActive }: Props) {
  const router = useRouter();
  const setCurrentChapter = useChapterStore((s) => s.setCurrentChapter);
  const setCurrentModule = useChapterStore((s) => s.setCurrentModule);
  const setVideoPlaying = useAudioStore((s) => s.setVideoPlaying);
  const webViewRef = useRef<WebView>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const { playSound } = useSoundEffect();

  const ctaColors = CHAPTER_CTA_COLORS[item.chapterId] ?? CHAPTER_CTA_COLORS["chapter-1"];
  const videoUri = item.videoHookAsset?.uri as string | undefined;
  const hasVideo = Boolean(videoUri);

  // Auto-play/pause based on visibility + stop bg music
  useEffect(() => {
    if (!hasVideo || !webViewRef.current) return;
    if (isActive) {
      webViewRef.current.postMessage(JSON.stringify({ action: "unmute" }));
      webViewRef.current.postMessage(JSON.stringify({ action: "play" }));
      setIsPlaying(true);
      setVideoPlaying(true);
    } else {
      webViewRef.current.postMessage(JSON.stringify({ action: "mute" }));
      webViewRef.current.postMessage(JSON.stringify({ action: "pause" }));
      setIsPlaying(false);
      setVideoPlaying(false);
    }
    return () => {
      webViewRef.current?.postMessage(JSON.stringify({ action: "mute" }));
      webViewRef.current?.postMessage(JSON.stringify({ action: "pause" }));
      setVideoPlaying(false);
    };
  }, [isActive, hasVideo, setVideoPlaying]);

  function handleGoToLesson() {
    tapHaptic();
    playSound('btn_click_heavy');
    setCurrentChapter(item.storeChapterId);
    setCurrentModule(item.moduleIndex);
    router.push(`/lesson/${item.moduleId}?chapterId=${item.chapterId}`);
  }

  function handleOpenChapterMap() {
    tapHaptic();
    router.push(`/chapter/${item.chapterId}`);
  }

  // Short tap → toggle sound (mute/unmute). Long press → toggle pause.
  function toggleMute() {
    if (!webViewRef.current) return;
    tapHaptic();
    const next = !isMuted;
    webViewRef.current.postMessage(JSON.stringify({ action: next ? "mute" : "unmute" }));
    setIsMuted(next);
  }

  function togglePause() {
    if (!webViewRef.current) return;
    heavyHaptic();
    const action = isPlaying ? "pause" : "play";
    webViewRef.current.postMessage(JSON.stringify({ action }));
    const next = !isPlaying;
    setIsPlaying(next);
    setVideoPlaying(next);
  }

  function handleMessage(event: { nativeEvent: { data: string } }) {
    if (event.nativeEvent.data === "READY" && isActive) {
      // Once WebView JS is ready, if active, make sure it plays with sound
      webViewRef.current?.postMessage(JSON.stringify({ action: "unmute" }));
      webViewRef.current?.postMessage(JSON.stringify({ action: "play" }));
    }
  }

  return (
    <View style={styles.container}>
      {hasVideo ? (
        <View style={StyleSheet.absoluteFill}>
          <WebView
            ref={webViewRef}
            source={{ html: buildVideoHtml(videoUri!) }}
            style={StyleSheet.absoluteFill}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            scrollEnabled={false}
            bounces={false}
            javaScriptEnabled
            originWhitelist={["*"]}
            onMessage={handleMessage}
          />
          {/* Bottom gradient for text readability */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.6)", "rgba(0,0,0,0.9)"]}
            locations={[0.3, 0.65, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          {/* Tap → toggle sound. Long press → toggle pause. */}
          <Pressable
            onPress={toggleMute}
            onLongPress={togglePause}
            delayLongPress={350}
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel={isMuted ? "הפעל צליל. לחיצה ארוכה להשהיה" : "השתק. לחיצה ארוכה להשהיה"}
          />

          {/* Mute indicator, small badge (top-right) reflecting current mute state */}
          <View style={styles.muteIndicator} pointerEvents="none">
            {isMuted
              ? <VolumeX size={18} color="rgba(255,255,255,0.9)" />
              : <Volume2 size={18} color="rgba(255,255,255,0.9)" />
            }
          </View>

          {/* Paused overlay, large play badge in the center when video is paused */}
          {!isPlaying && (
            <View style={styles.pausedOverlay} pointerEvents="none">
              <View style={styles.pausedBadge}>
                <Play size={36} color="#facc15" fill="#facc15" />
              </View>
            </View>
          )}
        </View>
      ) : (
        <>
          <LinearGradient
            colors={["#f0f4ff", "#f8fafc", "#eef2ff"]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          {/* Finn in glow orb, placeholder until video is added */}
          <View style={styles.finnOrbWrap} pointerEvents="none" accessible={false}>
            <View style={styles.glowOrb} />
            <ExpoImage
              source={FINN_STANDARD} accessible={false}
              style={styles.finnOrbImage}
              contentFit="contain"
            />
          </View>
        </>
      )}

      {/* Map button — opens chapter intro screen */}
      <Pressable
        onPress={handleOpenChapterMap}
        style={styles.mapButton}
        accessibilityRole="button"
        accessibilityLabel="פתח את מפת הפרק"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Map size={14} color="rgba(255,255,255,0.95)" />
        <Text style={styles.mapButtonText}>מפת הפרק</Text>
      </Pressable>

      {/* Content overlay at bottom */}
      <Animated.View style={styles.content}>
        {/* Badge */}
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Zap size={12} color={CLASH.goldBorder} fill={CLASH.goldBorder} />
            <Text style={styles.badgeText}>השיעור הבא שלך</Text>
          </View>
        </View>

        {/* Hook text */}
        <Text style={[
          styles.hookText,
          hasVideo
            ? { color: '#ffffff', textShadowColor: 'rgba(0,0,0,0.7)' }
            : { color: '#1f2937', textShadowColor: 'transparent' },
        ]}>
          {item.hook}
        </Text>

        {/* Module info */}
        <View style={[
          styles.moduleInfo,
          hasVideo && { borderRightColor: 'rgba(255,255,255,0.4)' },
        ]}>
          <Text style={[styles.chapterLabel, { color: hasVideo ? '#e2e8f0' : '#6b7280' }]}>
            {item.chapterName}
          </Text>
          <Text style={[styles.moduleTitle, { color: hasVideo ? '#ffffff' : ctaColors.bg }]}>
            {item.moduleTitle}
          </Text>
        </View>

        {/* CTA */}
        <Pressable onPress={handleGoToLesson} style={[styles.ctaButton, { backgroundColor: ctaColors.bg, shadowColor: ctaColors.shadow }]} accessibilityRole="button" accessibilityLabel="מעבר לתוכן הזה" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <View style={{ width: 18, height: 18, overflow: 'hidden' }} accessible={false}>
            <LottieView
              source={require("../../../assets/lottie/wired-flat-489-rocket-space-hover-flying.json")}
              style={{ width: 18, height: 18 }}
              autoPlay={isActive}
              loop={isActive}
              speed={0.8}

            />
          </View>
          <Text style={[styles.ctaText, { color: ctaColors.text }]}>מעבר לתוכן הזה</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "flex-end",
  },
  finnOrbWrap: {
    position: "absolute",
    top: "20%",
    left: "50%",
    width: 240,
    height: 240,
    marginLeft: -120,
    alignItems: "center",
    justifyContent: "center",
  },
  glowOrb: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 120,
    backgroundColor: "#0891b2",
    opacity: 0.12,
  },
  finnOrbImage: {
    width: 180,
    height: 180,
    opacity: 0.35,
  },
  content: {
    width: "100%",
    alignItems: "flex-end",
    zIndex: 10,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  badgeRow: {
    alignSelf: "flex-end",
    marginBottom: 10,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(250, 204, 21, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(250, 204, 21, 0.3)",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: CLASH.goldBorder,
    writingDirection: "rtl",
  },
  hookText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 32,
    marginBottom: 16,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  moduleInfo: {
    alignItems: "flex-end",
    marginBottom: 14,
    borderRightWidth: 3,
    borderRightColor: "#64748b",
    paddingRight: 14,
  },
  chapterLabel: {
    fontSize: 12,
    color: "#71717a",
    writingDirection: "rtl",
    marginBottom: 4,
  },
  moduleTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#22d3ee",
    textAlign: "right",
    writingDirection: "rtl",
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: "800",
    writingDirection: "rtl",
  },
  // Map button — top-left corner, opposite the mute indicator.
  mapButton: {
    position: "absolute",
    top: 56,
    left: 16,
    zIndex: 20,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  mapButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.95)",
    writingDirection: "rtl",
  },
  // Small mute-state indicator pinned to the top-right corner of the video.
  muteIndicator: {
    position: "absolute",
    top: 56,
    right: 16,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  // Centered overlay shown while the video is paused (after long-press).
  pausedOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  pausedBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(15,23,42,0.7)",
    borderWidth: 2,
    borderColor: "rgba(250,204,21,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
});
