import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, Dimensions, Pressable, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Play, Volume2, VolumeX } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import type { FeedVideo } from "./types";

import { GoldCircleBadge } from "../../components/ui/GoldCircleBadge";
import { BannerRibbon } from "../../components/ui/BannerRibbon";

import { tapHaptic, heavyHaptic } from "../../utils/haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface FeedVideoItemProps {
  item: FeedVideo;
  isActive: boolean;
}

export const FeedVideoItem = React.memo(function FeedVideoItem({ item, isActive }: FeedVideoItemProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const videoRef = useRef<VideoView>(null);

  const videoUri = typeof item.localVideo === "object" && "uri" in item.localVideo
    ? item.localVideo.uri
    : "";

  // Create player unconditionally to respect Rules of Hooks.
  // If URI is missing/invalid, errors surface through the statusChange listener → setHasError(true).
  // Don't auto-play on mount — FlashList preloads items off-screen, and starting playback
  // for every off-screen video swamps the network/decoder. The isActive useEffect below
  // handles play/pause based on actual viewport visibility.
  const player = useVideoPlayer(videoUri || "about:blank", (p) => {
    p.loop = true;
    p.bufferOptions = {
      preferredForwardBufferDuration: 5,
      waitsToMinimizeStalling: false,
      minBufferForPlayback: 1,
    };
  });

  // Play/pause based on feed visibility.
  // Re-applies mute/volume on every activation — works around an Android
  // expo-video quirk where .muted set before play() doesn't always propagate.
  useEffect(() => {
    if (!videoUri) return;
    if (isActive) {
      player.muted = isMuted;
      player.volume = isMuted ? 0 : 1.0;
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, player, videoUri, isMuted]);

  // Mute control — set both .muted and .volume for Android reliability
  useEffect(() => {
    if (!videoUri) return;
    player.muted = isMuted;
    player.volume = isMuted ? 0 : 1.0;
  }, [isMuted, player]);

  // Listen for status changes
  useEffect(() => {
    if (!videoUri) return;
    const subs: { remove: () => void }[] = [];

    subs.push(player.addListener("statusChange", (e: { status: string; error?: unknown }) => {
      if (e.status === "readyToPlay") setIsLoading(false);
      if (e.status === "error") { setHasError(true); setIsLoading(false); }
    }));

    subs.push(player.addListener("playingChange", (e: { isPlaying: boolean }) => {
      if (e.isPlaying) setIsLoading(false);
    }));

    // Safety timeout
    const timeout = setTimeout(() => {
      if (isLoading) setIsLoading(false);
    }, 8000);

    return () => {
      subs.forEach((s) => s.remove());
      clearTimeout(timeout);
    };
  }, [player, videoUri, isLoading]);

  // Short tap → toggle mute. Long press → toggle pause.
  function handleTap() {
    if (hasError) return;
    // If the video is paused, a tap resumes playback (intuitive fallback).
    if (isPaused) {
      player.play();
      setIsPaused(false);
      tapHaptic();
      return;
    }
    setIsMuted((m) => {
      const next = !m;
      player.muted = next;
      player.volume = next ? 0 : 1.0;
      return next;
    });
    tapHaptic();
  }

  function handleLongPress() {
    if (hasError) return;
    heavyHaptic();
    if (isPaused) {
      player.play();
      setIsPaused(false);
    } else {
      player.pause();
      setIsPaused(true);
    }
  }

  // Fallback: no video URI or player error
  if (!videoUri || hasError) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={["#e0f2fe", "#bae6fd", "#e0f2fe"]} style={StyleSheet.absoluteFillObject} />
        <View style={styles.centerPlay}>
          <GoldCircleBadge size={80} glowing>
            <Play size={36} color="#facc15" fill="#facc15" />
          </GoldCircleBadge>
          <Text style={styles.placeholderText}>סרטון הדרכה</Text>
          <Text style={styles.durationText}>{item.durationMinutes} דקות</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Video player, full screen. Tap toggles sound, long-press pauses. */}
      <Pressable
        style={{ flex: 1 }}
        onPress={handleTap}
        onLongPress={handleLongPress}
        delayLongPress={350}
        accessibilityRole="button"
        accessibilityLabel={isMuted ? "הפעל צליל. לחיצה ארוכה להשהיה" : "השתק. לחיצה ארוכה להשהיה"}
      >
        <VideoView
          ref={videoRef}
          player={player}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          nativeControls={false}
        />
      </Pressable>

      {/* Loading spinner */}
      {isLoading && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#38bdf8" />
        </View>
      )}

      {/* Paused overlay */}
      {isPaused && !isLoading && (
        <View style={styles.pausedOverlay} pointerEvents="none">
          <GoldCircleBadge size={70} glowing>
            <Play size={32} color="#facc15" fill="#facc15" />
          </GoldCircleBadge>
        </View>
      )}

      {/* Bookmark button is rendered at the FinFeedScreen wrapper level, shared across all card types. */}

      {/* Mute status indicator, non-interactive hint. Tapping the video itself toggles sound. */}
      <View style={styles.muteIndicator} pointerEvents="none">
        {isMuted
          ? <VolumeX size={18} color="rgba(255,255,255,0.85)" />
          : <Volume2 size={18} color="rgba(255,255,255,0.85)" />
        }
      </View>

      {/* Bottom title (only if title exists) */}
      {item.title ? (
        <View style={styles.bottomContent} pointerEvents="none">
          <View style={styles.titleBubble}>
            <Text style={styles.title}>{item.title}</Text>
            {item.description ? (
              <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    flex: 1,
    backgroundColor: "#000",
  },
  topBanner: {
    position: "absolute",
    top: 56,
    left: 0,
    right: 0,
  },
  centerPlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: "#0c4a6e",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 16,
    writingDirection: "rtl",
  },
  durationText: {
    color: "#0369a1",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
    writingDirection: "rtl",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  pausedOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  bottomContent: {
    position: "absolute",
    bottom: 40,
    left: 16,
    right: 80,
  },
  titleBubble: {
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: "#fff",
    textAlign: "right",
    writingDirection: "rtl",
  },
  description: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 20,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 4,
  },
  muteIndicator: {
    position: "absolute",
    top: 56,
    right: 16,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  muteButton: {
    position: "absolute",
    top: 56,
    right: 16,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
