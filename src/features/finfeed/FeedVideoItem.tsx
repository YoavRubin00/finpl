import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, Dimensions, Pressable, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Play, Heart, Volume2, VolumeX } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import type { FeedVideo } from "./types";

import { GoldCircleBadge } from "../../components/ui/GoldCircleBadge";
import { BannerRibbon } from "../../components/ui/BannerRibbon";

import { useSubscriptionStore } from "../subscription/useSubscriptionStore";
import { useSavedItemsStore } from "../saved-items/useSavedItemsStore";
import { useUpgradeModalStore } from "../../stores/useUpgradeModalStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface FeedVideoItemProps {
  item: FeedVideo;
  isActive: boolean;
}

export const FeedVideoItem = React.memo(function FeedVideoItem({ item, isActive }: FeedVideoItemProps) {
  const router = useRouter();
  const isPro = useSubscriptionStore((s) => s.tier === "pro" && s.status === "active");
  const isSaved = useSavedItemsStore((s) => s.isSaved);
  const removeItem = useSavedItemsStore((s) => s.removeItem);
  const addItem = useSavedItemsStore((s) => s.addItem);
  const showUpgradeModal = useUpgradeModalStore((s) => s.show);

  const feedBookmarkId = `feed-${item.id}`;
  const isBookmarked = isSaved(feedBookmarkId);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const videoRef = useRef<VideoView>(null);

  const videoUri = typeof item.localVideo === "object" && "uri" in item.localVideo
    ? item.localVideo.uri
    : "";

  // Create player — only when we have a valid URI
  let player: ReturnType<typeof useVideoPlayer> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    player = useVideoPlayer(videoUri || "https://invalid", (p) => {
      p.loop = true;
      if (isActive && videoUri) p.play();
    });
  } catch {
    // Player creation failed — show fallback
  }

  // Play/pause based on feed visibility
  useEffect(() => {
    if (!player || !videoUri) return;
    if (isActive) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, player, videoUri]);

  // Mute control
  useEffect(() => {
    if (!player) return;
    player.muted = isMuted;
  }, [isMuted, player]);

  // Listen for status changes
  useEffect(() => {
    if (!player || !videoUri) return;
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

  function handleBookmarkPress() {
    if (!isPro) { showUpgradeModal("saved_items"); return; }
    if (isBookmarked) {
      removeItem(feedBookmarkId);
    } else {
      addItem({ id: feedBookmarkId, type: "feed", title: item.title || "סרטון", feedItemId: item.id });
    }
  }

  function handleTap() {
    if (!player || hasError) return;
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
      {/* Video player — full screen */}
      <Pressable style={{ flex: 1 }} onPress={handleTap}>
        <VideoView
          ref={videoRef}
          player={player!}
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

      {/* Bookmark button */}
      <Pressable
        onPress={handleBookmarkPress}
        style={styles.bookmarkButton}
        accessibilityRole="button"
        accessibilityLabel={isBookmarked ? "הסר מהשמורים" : "שמור"}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Heart size={22} color={isBookmarked ? "#ef4444" : "#fff"} fill={isBookmarked ? "#ef4444" : "transparent"} />
      </Pressable>

      {/* Mute toggle */}
      <Pressable
        onPress={() => setIsMuted((m) => !m)}
        style={styles.muteButton}
        accessibilityRole="button"
        accessibilityLabel={isMuted ? "הפעל צליל" : "השתק"}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {isMuted
          ? <VolumeX size={20} color="#fff" />
          : <Volume2 size={20} color="#fff" />
        }
      </Pressable>

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
  bookmarkButton: {
    position: "absolute",
    top: 56,
    left: 16,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  muteButton: {
    position: "absolute",
    bottom: 100,
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
