import React from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Bookmark, ChevronLeft } from "lucide-react-native";
import type { FeedItem } from "../finfeed/types";
import { tapHaptic } from "../../utils/haptics";

interface Props {
  item: FeedItem;
  onPress?: () => void;
}

interface PreviewMeta {
  gradient: [string, string];
  badge: string;
  emoji: string;
}

function getPreviewMeta(item: FeedItem): PreviewMeta {
  switch (item.type) {
    case "video":
      return { gradient: ["#0c4a6e", "#0369a1"], badge: "וידאו", emoji: "🎬" };
    case "quote":
      return { gradient: ["#f0f4ff", "#fef3f2"], badge: "ציטוט", emoji: "💬" };
    case "comic":
      return { gradient: ["#fef3c7", "#fde68a"], badge: "קומיקס", emoji: "🦈" };
    case "module-hook":
      return { gradient: ["#e0f2fe", "#bae6fd"], badge: "הצצה", emoji: "🎯" };
    case "macro-event":
      return { gradient: ["#fee2e2", "#fecaca"], badge: "אירוע מאקרו", emoji: "📰" };
    case "scenario":
      return { gradient: ["#1e293b", "#0f172a"], badge: "תרחיש", emoji: "🌪️" };
    case "daily-quiz":
      return { gradient: ["#ecfeff", "#a5f3fc"], badge: "חידון", emoji: "🧠" };
    case "myth-or-tachles":
      return { gradient: ["#fef3c7", "#fcd34d"], badge: "מיתוס/תכלס", emoji: "❓" };
    case "premium-learning":
      return { gradient: ["#f0f9ff", "#dbeafe"], badge: "פרימיום", emoji: "👑" };
    case "daily-dilemma":
      return { gradient: ["#fef3c7", "#fde68a"], badge: "דילמה", emoji: "🤔" };
    case "daily-investment":
      return { gradient: ["#dcfce7", "#bbf7d0"], badge: "השקעה", emoji: "💰" };
    case "crash-game":
    case "swipe-game":
    case "bullshit-swipe":
      return { gradient: ["#1e1b4b", "#312e81"], badge: "מיני-משחק", emoji: "🎮" };
    case "higher-lower":
      return { gradient: ["#dbeafe", "#bfdbfe"], badge: "גבוה-נמוך", emoji: "📈" };
    case "budget-ninja":
      return { gradient: ["#0f172a", "#1e293b"], badge: "מיני-משחק", emoji: "🥷" };
    case "price-slider":
      return { gradient: ["#fff7ed", "#fed7aa"], badge: "סליידר", emoji: "🎚️" };
    case "cashout-rush":
      return { gradient: ["#0c4a6e", "#075985"], badge: "מיני-משחק", emoji: "💸" };
    case "fomo-killer":
      return { gradient: ["#1e1b4b", "#312e81"], badge: "מיני-משחק", emoji: "🛑" };
    case "did-you-know":
      return { gradient: ["#ecfdf5", "#d1fae5"], badge: "הידעת?", emoji: "💡" };
    case "graham-personality":
      return { gradient: ["#f3e8ff", "#e9d5ff"], badge: "אישיות", emoji: "🎭" };
    case "diamond-hands":
      return { gradient: ["#dbeafe", "#bfdbfe"], badge: "Diamond Hands", emoji: "💎" };
    case "shark-feedback":
      return { gradient: ["#cffafe", "#a5f3fc"], badge: "סקר", emoji: "🦈" };
    case "trading-nudge":
      return { gradient: ["#0c4a6e", "#0e7490"], badge: "מסחר", emoji: "📊" };
    case "referral-nudge":
      return { gradient: ["#fef3c7", "#fde68a"], badge: "הזמנה", emoji: "🎁" };
    case "simulator-teaser":
      return { gradient: ["#0f172a", "#1e293b"], badge: "סימולטור", emoji: "🎯" };
    case "live-market":
      return { gradient: ["#0a2540", "#082f49"], badge: "שוק חי", emoji: "📈" };
    case "live-news":
      return { gradient: ["#7f1d1d", "#991b1b"], badge: "חדשות חיות", emoji: "🔴" };
    case "crowd-question":
      return { gradient: ["#1e293b", "#334155"], badge: "שאלת קהל", emoji: "👥" };
    case "finn-hero":
      return { gradient: ["#0c4a6e", "#0369a1"], badge: "פין", emoji: "🦈" };
    case "lesson":
      return { gradient: ["#f0f9ff", "#dbeafe"], badge: "שיעור", emoji: "📚" };
    default: {
      const _exhaustive: never = item;
      void _exhaustive;
      return { gradient: ["#f1f5f9", "#e2e8f0"], badge: "פריט", emoji: "🔖" };
    }
  }
}

function getPreviewTitle(item: FeedItem): string {
  switch (item.type) {
    case "video":
      return item.title;
    case "quote":
      return item.title || (item.author ? `— ${item.author}` : "ציטוט");
    case "comic":
      return item.title;
    case "module-hook":
      return item.moduleTitle;
    case "scenario":
      return item.scenario.title;
    case "premium-learning":
      return item.moduleTitle;
    case "macro-event":
      return item.event.headline;
    case "simulator-teaser":
      return item.simulator.teaserTitle;
    default:
      return "";
  }
}

function getPreviewSubtitle(item: FeedItem): string {
  switch (item.type) {
    case "video":
      return item.description || "";
    case "quote":
      return item.quote;
    case "module-hook":
      return item.hook;
    case "macro-event":
      return item.event.context;
    case "simulator-teaser":
      return item.simulator.teaserSub;
    default:
      return "";
  }
}

function isDarkPreview(item: FeedItem): boolean {
  switch (item.type) {
    case "video":
    case "scenario":
    case "budget-ninja":
    case "cashout-rush":
    case "fomo-killer":
    case "bullshit-swipe":
    case "crash-game":
    case "swipe-game":
    case "simulator-teaser":
    case "live-market":
    case "live-news":
    case "crowd-question":
    case "trading-nudge":
    case "finn-hero":
      return true;
    default:
      return false;
  }
}

/**
 * Compact preview tile for any saved feed item, ~200px tall, card-like, tappable.
 * Renders a lightweight tile (gradient + emoji + title + subtitle + type badge)
 * rather than the full interactive card so the saved page stays fast even with
 * 50 items including heavy mini-games / video.
 */
export function CompactFeedCardPreview({ item, onPress }: Props) {
  const router = useRouter();
  const meta = getPreviewMeta(item);
  const title = getPreviewTitle(item);
  const subtitle = getPreviewSubtitle(item);
  const dark = isDarkPreview(item);
  const fg = dark ? "#ffffff" : "#0c4a6e";
  const fgMuted = dark ? "rgba(255,255,255,0.78)" : "#475569";

  const handlePress = () => {
    tapHaptic();
    if (onPress) {
      onPress();
    } else {
      router.push({
        pathname: "/(tabs)/learn",
        params: { scrollToFeedId: item.id },
      } as never);
    }
  };

  // Comic items have a real image — render it as the hero
  const comicImage = item.type === "comic" ? item.imageUrl : null;

  return (
    <Pressable
      onPress={handlePress}
      style={styles.container}
      accessibilityRole="button"
      accessibilityLabel={`פריט שמור: ${title || meta.badge}. הקש לפתיחה`}
    >
      <LinearGradient colors={meta.gradient} style={StyleSheet.absoluteFill} />

      {/* Comic image hero, if applicable */}
      {comicImage ? (
        <Image
          source={comicImage}
          style={[StyleSheet.absoluteFill, { opacity: 0.65 }]}
          resizeMode="cover"
        />
      ) : null}

      {/* Top-right badge */}
      <View style={[styles.badge, { backgroundColor: dark ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.85)" }]}>
        <Text style={[styles.badgeText, { color: dark ? "#facc15" : "#0c4a6e" }]}>{meta.badge}</Text>
      </View>

      {/* Centered emoji */}
      <View style={styles.emojiWrap}>
        <Text style={styles.emoji}>{meta.emoji}</Text>
      </View>

      {/* Saved indicator (top-left) */}
      <View style={styles.savedIndicator}>
        <Bookmark size={16} color={dark ? "#facc15" : "#16a34a"} fill={dark ? "#facc15" : "#16a34a"} />
      </View>

      {/* Bottom info bubble */}
      <View style={[styles.infoBubble, { backgroundColor: dark ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.85)" }]}>
        {title ? (
          <Text style={[styles.title, { color: fg }]} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text style={[styles.subtitle, { color: fgMuted }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
        <View style={styles.openHint}>
          <ChevronLeft size={14} color={fgMuted} />
          <Text style={[styles.openHintText, { color: fgMuted }]}>פתח</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 200,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    writingDirection: "rtl",
  },
  savedIndicator: {
    position: "absolute",
    top: 12,
    left: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  emojiWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 56,
    textAlign: "center",
  },
  infoBubble: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    padding: 12,
    borderRadius: 14,
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
    textAlign: "right",
    writingDirection: "rtl",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    textAlign: "right",
    writingDirection: "rtl",
  },
  openHint: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: 6,
    gap: 2,
  },
  openHintText: {
    fontSize: 11,
    fontWeight: "700",
    writingDirection: "rtl",
  },
});