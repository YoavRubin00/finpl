import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeIn, useReducedMotion } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BadgeCheck, Image as ImageIcon } from 'lucide-react-native';
import { FOMO_TOKENS } from './theme';
import type { ChatEntry, Persona } from './types';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

interface Props {
  entry: ChatEntry;
}

function formatTs(ms: number): string {
  const d = new Date(ms);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export const ChatBubble = React.memo(
  function ChatBubble({ entry }: Props) {
    const reduceMotion = useReducedMotion();
    const entering = reduceMotion ? FadeIn.duration(260) : FadeInDown.duration(260);

    if (entry.kind === 'self') {
      return <SelfBubble entry={entry} entering={entering} />;
    }
    return <OtherBubble entry={entry} entering={entering} />;
  },
  (prev, next) => prev.entry === next.entry,
);

function OtherBubble({
  entry,
  entering,
}: {
  entry: ChatEntry;
  entering: ReturnType<typeof FadeIn.duration>;
}) {
  const persona = entry.persona as Persona;
  const content = entry.message?.content ?? '';
  const showScreenshot = entry.message?.hasFakeScreenshot;

  const a11yLabel =
    `הודעה מ-${persona.handle}.` +
    (persona.fakeVerified ? ' מסומן כמאומת.' : '') +
    ` ${content}.` +
    ` נשלח בשעה ${formatTs(entry.ts)}`;

  const stateStyle =
    entry.state === 'reported'
      ? styles.bubbleReported
      : entry.state === 'dismissed'
        ? styles.bubbleDismissed
        : entry.state === 'added'
          ? styles.bubbleAdded
          : null;

  return (
    <Animated.View
      entering={entering}
      style={styles.otherRow}
      accessibilityRole="text"
      accessibilityLabel={a11yLabel}
    >
      <View style={styles.avatarCol}>
        <LinearGradient
          colors={persona.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatar}
        >
          <Text style={styles.avatarEmoji} allowFontScaling={false}>{persona.emoji}</Text>
        </LinearGradient>
      </View>

      <View style={styles.otherContentCol}>
        <View style={styles.handleRow}>
          <Text
            style={styles.handle}
            numberOfLines={1}
            allowFontScaling={false}
          >
            {persona.handle}
          </Text>
          {persona.fakeVerified && (
            <View style={styles.verifiedBadge} accessible={false}>
              <BadgeCheck size={12} color={FOMO_TOKENS.verifiedCheck} strokeWidth={3} fill={FOMO_TOKENS.verifiedBg} />
            </View>
          )}
          <Text style={styles.ts} allowFontScaling={false}>
            {formatTs(entry.ts)}
          </Text>
        </View>

        <View style={[styles.bubbleOther, stateStyle]}>
          <Text style={[styles.text, RTL]} allowFontScaling={false}>
            {content}
          </Text>
          {showScreenshot && (
            <View style={styles.screenshotPlaceholder} accessible={false}>
              <ImageIcon size={14} color="#94a3b8" />
              <Text style={styles.screenshotLabel}>[צילום-מסך]</Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

function SelfBubble({
  entry,
  entering,
}: {
  entry: ChatEntry;
  entering: ReturnType<typeof FadeIn.duration>;
}) {
  return (
    <Animated.View
      entering={entering}
      style={styles.selfRow}
      accessibilityRole="text"
      accessibilityLabel={`הודעה ששלחת: ${entry.selfText}. נשלח בשעה ${formatTs(entry.ts)}`}
    >
      <View style={styles.bubbleSelf}>
        <Text style={[styles.text, RTL, { color: '#ffffff' }]} allowFontScaling={false}>
          {entry.selfText}
        </Text>
        <Text style={styles.selfMeta} allowFontScaling={false}>
          {formatTs(entry.ts)} ✓✓
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  otherRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 8,
    alignSelf: 'flex-start',
    maxWidth: '85%',
    marginVertical: 4,
  },
  avatarCol: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 22,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 18,
    lineHeight: 20,
  },
  otherContentCol: {
    flexShrink: 1,
  },
  handleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
    paddingHorizontal: 4,
  },
  handle: {
    color: FOMO_TOKENS.handleColor,
    fontSize: 12,
    fontWeight: '800',
    maxWidth: 150,
  },
  verifiedBadge: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ts: {
    color: FOMO_TOKENS.bubbleMeta,
    fontSize: 10,
    opacity: 0.7,
    marginStart: 2,
  },
  bubbleOther: {
    backgroundColor: FOMO_TOKENS.bubbleOther,
    borderWidth: 1,
    borderColor: FOMO_TOKENS.bubbleOtherBorder,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderTopLeftRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
  },
  bubbleReported: {
    opacity: 0.6,
    borderColor: FOMO_TOKENS.scamOutline,
    borderWidth: 1.5,
  },
  bubbleDismissed: {
    opacity: 0.75,
  },
  bubbleAdded: {
    borderColor: FOMO_TOKENS.addedGlow,
    borderWidth: 1.5,
  },
  text: {
    color: FOMO_TOKENS.bubbleText,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  screenshotPlaceholder: {
    backgroundColor: '#0f2947',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    flexDirection: 'row-reverse',
  },
  screenshotLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },

  // Self bubble (user-action echo)
  selfRow: {
    alignSelf: 'flex-end',
    maxWidth: '78%',
    marginVertical: 4,
  },
  bubbleSelf: {
    backgroundColor: FOMO_TOKENS.bubbleSelf,
    borderWidth: 1,
    borderColor: FOMO_TOKENS.bubbleSelfBorder,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    borderTopRightRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 4,
  },
  selfMeta: {
    color: '#bae6fd',
    fontSize: 10,
    textAlign: 'left',  // intentional: Telegram-style read-receipt sits at bottom-end of self bubble
    writingDirection: 'ltr',
    opacity: 0.85,
  },
});
