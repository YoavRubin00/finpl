import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { MessageCircle, MessagesSquare } from 'lucide-react-native';

import { GoldCoinIcon } from '../../../components/ui/GoldCoinIcon';
import { useTradeRoomsStore } from '../../trade-rooms/useTradeRoomsStore';
import { useAnonAdviceStore } from '../../anon-advice/useAnonAdviceStore';

// ─── Local palette (matches the light, social-first Friends feed) ─────
const CARD_BG = '#ffffff';
const PILL_BG = '#f0f9ff';
const PILL_BORDER = '#e0f2fe';
const TEXT_PRIMARY = '#1f2937';
const TEXT_MUTED = '#6b7280';
const SEA_BLUE = '#0284c7';

/**
 * A5 — "השבוע שלכם בקהילה".
 * A summary strip pinned to the top of the Friends hub, showing ONLY the
 * signed-in user's OWN weekly community activity. Every number is self-data,
 * pulled from the ready read-only getters that BATCH 2/3 built:
 *   • useTradeRoomsStore.getWeeklyRoomStats()      → messages the user sent + coins
 *   • useAnonAdviceStore.getWeeklyCommunityStats() → the user's posts/replies + coins
 * IRON RULE: never a single number about other people. If the user has done
 * nothing this week we show a warm first-action nudge instead of fake zeros.
 */

interface WeeklyStats {
  messagesSent: number;
  contributions: number; // the user's own posts + replies in the advice community
  coinsEarned: number; // real community-earned coins (rooms + advice), summed
  total: number; // any activity at all → drives the honest empty state
}

function useWeeklyCommunityStats(): WeeklyStats {
  // Subscribe to the raw STORED references only (stable across renders — they
  // change identity solely when the store writes real activity). We then call
  // the getters via getState() inside a useMemo keyed on those refs: reactive
  // to real data, yet free of the zustand-v5 fresh-object re-render loop.
  const roomMessages = useTradeRoomsStore((s) => s.messagesByRoom);
  const anonPosts = useAnonAdviceStore((s) => s.posts);
  const anonReplies = useAnonAdviceStore((s) => s.replies);
  const anonLedger = useAnonAdviceStore((s) => s.adviceCoinLedger);

  return React.useMemo(() => {
    const room = useTradeRoomsStore.getState().getWeeklyRoomStats();
    const anon = useAnonAdviceStore.getState().getWeeklyCommunityStats();
    const messagesSent = room.messagesSent;
    const contributions = anon.posts + anon.replies;
    const coinsEarned = room.coinsEarned + anon.coinsEarned;
    return {
      messagesSent,
      contributions,
      coinsEarned,
      total: messagesSent + contributions + coinsEarned,
    };
  }, [roomMessages, anonPosts, anonReplies, anonLedger]);
}

function Pill({
  value,
  label,
  accessibilityLabel,
  children,
}: {
  value: number;
  label: string;
  accessibilityLabel: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={{
        flex: 1,
        backgroundColor: PILL_BG,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: PILL_BORDER,
        paddingVertical: 12,
        paddingHorizontal: 8,
        alignItems: 'center',
        gap: 5,
      }}
    >
      {children}
      <Text
        maxFontSizeMultiplier={1.2}
        style={{
          fontSize: 19,
          fontWeight: '900',
          color: TEXT_PRIMARY,
          writingDirection: 'rtl',
        }}
      >
        {value.toLocaleString('he-IL')}
      </Text>
      <Text
        numberOfLines={2}
        maxFontSizeMultiplier={1.2}
        style={{
          fontSize: 11,
          fontWeight: '700',
          color: TEXT_MUTED,
          textAlign: 'center',
          writingDirection: 'rtl',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export function WeeklyCommunityStrip(): React.ReactElement {
  const reduced = useReducedMotion();
  const stats = useWeeklyCommunityStats();
  const hasActivity = stats.total > 0;

  const body = (
    <View
      style={{
        backgroundColor: CARD_BG,
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 16,
      }}
    >
      <Text
        accessibilityRole="header"
        maxFontSizeMultiplier={1.3}
        style={{
          fontSize: 16,
          fontWeight: '900',
          color: TEXT_PRIMARY,
          writingDirection: 'rtl',
          textAlign: 'right',
          marginBottom: 12,
          letterSpacing: -0.2,
        }}
      >
        השבוע שלכם בקהילה
      </Text>

      {hasActivity ? (
        <View style={{ flexDirection: 'row-reverse', gap: 10 }}>
          <Pill
            value={stats.messagesSent}
            label="הודעות ששלחתם"
            accessibilityLabel={`שלחתם ${stats.messagesSent} הודעות בקהילה השבוע`}
          >
            <MessageCircle size={20} color={SEA_BLUE} strokeWidth={2.4} />
          </Pill>
          <Pill
            value={stats.contributions}
            label="פוסטים ותגובות"
            accessibilityLabel={`כתבתם ${stats.contributions} פוסטים ותגובות השבוע`}
          >
            <MessagesSquare size={20} color={SEA_BLUE} strokeWidth={2.4} />
          </Pill>
          <Pill
            value={stats.coinsEarned}
            label="מטבעות מהקהילה"
            accessibilityLabel={`הרווחתם ${stats.coinsEarned} מטבעות מהקהילה השבוע`}
          >
            <GoldCoinIcon size={20} />
          </Pill>
        </View>
      ) : (
        <View
          style={{
            backgroundColor: PILL_BG,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: PILL_BORDER,
            paddingVertical: 14,
            paddingHorizontal: 14,
            flexDirection: 'row-reverse',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: '#e0f2fe',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <GoldCoinIcon size={20} />
          </View>
          <Text
            numberOfLines={2}
            maxFontSizeMultiplier={1.3}
            style={{
              flex: 1,
              flexShrink: 1,
              fontSize: 13,
              fontWeight: '700',
              color: TEXT_MUTED,
              writingDirection: 'rtl',
              textAlign: 'right',
              lineHeight: 19,
            }}
          >
            התחילו לפעול בקהילה — כל פעולה שווה מטבעות
          </Text>
        </View>
      )}
    </View>
  );

  if (reduced) {
    return body;
  }
  return (
    <Animated.View entering={FadeInDown.duration(260)}>{body}</Animated.View>
  );
}
