import React, { useEffect, useMemo } from "react";
import { Text, View, StyleSheet, type TextStyle, type StyleProp } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from "react-native-reanimated";
import { EMPHASIS_SPRING, EMPHASIS_STAGGER_MS, LL_COLORS, RTL_STYLE } from "./tokens";

/**
 * Parses `**bold**` (brand-gold emphasis) and `[[term]]` / `[[term|display]]`
 * (glossary link — same trigger contract as renderGlossaryText.tsx /
 * renderBoldText in LessonFlowScreen.tsx: caller owns `onTermPress` and
 * renders the actual tooltip, this component only fires the callback).
 *
 * Renders word-by-word in a `row-reverse` + `flexWrap: 'wrap'` container
 * (the same technique src/features/sentence-exercise/FillBlankCard.tsx uses
 * for RTL token flow) instead of one nested <Text> tree, because RN cannot
 * apply `transform` (scale) to a Text node nested INSIDE another Text — only
 * standalone Text/Animated.Text siblings support it. That's what lets each
 * emphasized word pop in independently instead of just changing color.
 */

interface RichTextProps {
  text: string;
  /** Base word style (fontSize/lineHeight/color for plain words). */
  style?: StyleProp<TextStyle>;
  onTermPress?: (term: string) => void;
  /** false under reduced-motion (or once already revealed) — words render settled, no pop-in. */
  animate?: boolean;
  /** Delay (ms) before the FIRST emphasized word starts its pop-in. */
  baseDelayMs?: number;
}

type WordToken =
  | { kind: "word"; text: string; emphasis: boolean; boldIndex: number }
  | { kind: "term"; term: string; display: string };

const MARKUP_REGEX = /\*\*([^*]+)\*\*|\[\[([^\]]+)\]\]/g;

function buildWords(text: string): WordToken[] {
  const tokens: WordToken[] = [];
  let lastIndex = 0;
  let boldIndex = 0;
  let match: RegExpExecArray | null;
  MARKUP_REGEX.lastIndex = 0;

  const pushPlainRun = (run: string, emphasis: boolean) => {
    const words = run.split(/\s+/).filter((w) => w.length > 0);
    for (const w of words) {
      tokens.push({ kind: "word", text: w, emphasis, boldIndex: emphasis ? boldIndex++ : -1 });
    }
  };

  while ((match = MARKUP_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      pushPlainRun(text.slice(lastIndex, match.index), false);
    }
    if (match[1] !== undefined) {
      pushPlainRun(match[1], true);
    } else if (match[2] !== undefined) {
      const raw = match[2];
      const pipeIdx = raw.indexOf("|");
      const term = pipeIdx >= 0 ? raw.slice(0, pipeIdx) : raw;
      const display = pipeIdx >= 0 ? raw.slice(pipeIdx + 1) : raw;
      tokens.push({ kind: "term", term, display });
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    pushPlainRun(text.slice(lastIndex), false);
  }
  return tokens;
}

function EmphasisWord({
  text,
  delayMs,
  animate,
  style,
}: {
  text: string;
  delayMs: number;
  animate: boolean;
  style?: StyleProp<TextStyle>;
}) {
  const progress = useSharedValue(animate ? 0 : 1);

  useEffect(() => {
    if (!animate) return;
    progress.value = withDelay(delayMs, withSpring(1, EMPHASIS_SPRING));
    // Runs once per mount — this word reveals exactly one time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + 0.7 * progress.value,
    transform: [{ scale: 0.78 + 0.22 * progress.value }],
  }));

  return (
    <Animated.Text style={[styles.word, style, animatedStyle, styles.emphasisWord]}>
      {text}
    </Animated.Text>
  );
}

function GlossaryWord({
  term,
  display,
  onPress,
  style,
}: {
  term: string;
  display: string;
  onPress?: (term: string) => void;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text
      style={[styles.word, style, styles.glossaryWord]}
      onPress={() => onPress?.(term)}
      suppressHighlighting
      accessibilityRole="link"
      accessibilityLabel={`מונח: ${display}`}
    >
      {display}
    </Text>
  );
}

export function RichText({ text, style, onTermPress, animate = true, baseDelayMs = 0 }: RichTextProps) {
  const words = useMemo(() => buildWords(text), [text]);

  return (
    <View style={styles.row}>
      {words.map((token, i) => {
        if (token.kind === "term") {
          return <GlossaryWord key={i} term={token.term} display={token.display} onPress={onTermPress} style={style} />;
        }
        if (token.emphasis) {
          return (
            <EmphasisWord
              key={i}
              text={token.text}
              animate={animate}
              delayMs={baseDelayMs + token.boldIndex * EMPHASIS_STAGGER_MS}
              style={style}
            />
          );
        }
        return (
          <Text key={i} style={[styles.word, style, RTL_STYLE]}>
            {token.text}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    alignItems: "baseline",
    rowGap: 4,
    columnGap: 6,
  },
  word: {
    ...RTL_STYLE,
    color: LL_COLORS.textPrimary,
    fontSize: 17,
    lineHeight: 26,
    fontWeight: "600",
  },
  emphasisWord: {
    color: LL_COLORS.emphasis,
    fontWeight: "800",
  },
  glossaryWord: {
    color: LL_COLORS.brandCyan,
    fontWeight: "900",
    textDecorationLine: "underline",
    textDecorationStyle: "solid",
    textDecorationColor: LL_COLORS.brandCyan,
  },
});
