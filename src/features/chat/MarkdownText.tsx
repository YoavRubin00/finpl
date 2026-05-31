import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  type StyleProp,
  type TextStyle,
  type LayoutChangeEvent,
} from "react-native";

/* ------------------------------------------------------------------ */
/*  Lightweight RTL markdown renderer for bot replies                  */
/* ------------------------------------------------------------------ */
//
// Renders the small markdown subset we ask the model for — **bold**, *italic*,
// `inline code`, #/##/### headings, `- `/`* ` bullets, and `1. ` numbered
// lists — laid out as a plain View/Text tree. Deliberately NOT a full markdown
// engine: keeping it small means full control over Hebrew RTL (markers sit on
// the right, neutral chars are bidi-isolated) and it drops straight into the
// streaming reveal, which measures one View height and slides a cover over it.

// RLI (U+2067) ... PDI (U+2069): strong RTL bidi isolate so neutral chars
// (digits, /, ., ", parens) don't drift while the bidi context re-resolves.
const RLI = "⁧";
const PDI = "⁩";

type Block =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "bullet"; text: string }
  | { type: "ordered"; marker: string; text: string }
  | { type: "paragraph"; text: string }
  | { type: "spacer" };

const BULLET_RE = /^\s*[-*]\s+(.*)$/;
const ORDERED_RE = /^\s*(\d+)[.)]\s+(.*)$/;
const HEADING_RE = /^\s*(#{1,3})\s+(.*)$/;

/** Split raw markdown text into block-level chunks, line by line. */
function parseBlocks(content: string): Block[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];

  for (const line of lines) {
    if (line.trim().length === 0) {
      // Collapse runs of blank lines into a single spacer.
      if (blocks.length && blocks[blocks.length - 1].type !== "spacer") {
        blocks.push({ type: "spacer" });
      }
      continue;
    }

    const heading = HEADING_RE.exec(line);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length as 1 | 2 | 3,
        text: heading[2].trim(),
      });
      continue;
    }

    const ordered = ORDERED_RE.exec(line);
    if (ordered) {
      blocks.push({ type: "ordered", marker: ordered[1], text: ordered[2].trim() });
      continue;
    }

    const bullet = BULLET_RE.exec(line);
    if (bullet) {
      blocks.push({ type: "bullet", text: bullet[1].trim() });
      continue;
    }

    blocks.push({ type: "paragraph", text: line.trim() });
  }

  // Drop a trailing spacer so the bubble doesn't end with dead space.
  if (blocks.length && blocks[blocks.length - 1].type === "spacer") blocks.pop();
  return blocks;
}

/* --- inline: **bold**, *italic* / _italic_, `code` --------------------- */

type Inline = { text: string; bold?: boolean; italic?: boolean; code?: boolean };

// One pass, longest-delimiter-first so `**` wins over `*`.
const INLINE_RE = /(\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*|_([^_]+)_)/g;

function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  INLINE_RE.lastIndex = 0;
  while ((m = INLINE_RE.exec(text)) !== null) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    if (m[2] !== undefined) out.push({ text: m[2], bold: true });
    else if (m[3] !== undefined) out.push({ text: m[3], code: true });
    else if (m[4] !== undefined) out.push({ text: m[4], italic: true });
    else if (m[5] !== undefined) out.push({ text: m[5], italic: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out.length ? out : [{ text }];
}

function InlineRuns({
  text,
  style,
}: {
  text: string;
  style: StyleProp<TextStyle>;
}) {
  const runs = useMemo(() => parseInline(text), [text]);
  return (
    <Text style={style}>
      {RLI}
      {runs.map((r, i) => (
        <Text
          key={i}
          style={[
            r.bold && mdStyles.bold,
            r.italic && mdStyles.italic,
            r.code && mdStyles.code,
          ]}
        >
          {r.text}
        </Text>
      ))}
      {PDI}
    </Text>
  );
}

/* ------------------------------------------------------------------ */

export function MarkdownText({
  content,
  baseStyle,
  onLayout,
}: {
  content: string;
  /** Bot text base style (color / fontSize / lineHeight). */
  baseStyle: StyleProp<TextStyle>;
  onLayout?: (e: LayoutChangeEvent) => void;
}) {
  const blocks = useMemo(() => parseBlocks(content), [content]);

  return (
    <View onLayout={onLayout}>
      {blocks.map((block, i) => {
        if (block.type === "spacer") {
          return <View key={i} style={{ height: 8 }} />;
        }

        if (block.type === "heading") {
          const headingStyle =
            block.level === 1
              ? mdStyles.h1
              : block.level === 2
                ? mdStyles.h2
                : mdStyles.h3;
          return (
            <InlineRuns
              key={i}
              text={block.text}
              style={[baseStyle, mdStyles.rtl, headingStyle]}
            />
          );
        }

        if (block.type === "bullet" || block.type === "ordered") {
          const marker = block.type === "bullet" ? "•" : `${block.marker}.`;
          return (
            // row-reverse so the marker sits on the right (RTL), with the
            // content flex-shrinking to the left and wrapping under itself.
            <View key={i} style={mdStyles.listRow}>
              <Text style={[baseStyle, mdStyles.rtl, mdStyles.marker]}>{marker}</Text>
              <InlineRuns
                text={block.text}
                style={[baseStyle, mdStyles.rtl, mdStyles.listContent]}
              />
            </View>
          );
        }

        return (
          <InlineRuns
            key={i}
            text={block.text}
            style={[baseStyle, mdStyles.rtl, mdStyles.paragraph]}
          />
        );
      })}
    </View>
  );
}

const mdStyles = StyleSheet.create({
  rtl: {
    writingDirection: "rtl",
    textAlign: "right",
  },
  paragraph: {
    marginTop: 2,
  },
  bold: {
    fontWeight: "800",
  },
  italic: {
    fontStyle: "italic",
  },
  code: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    backgroundColor: "#f1f5f9",
    color: "#0f172a",
  },
  h1: {
    fontSize: 17,
    fontWeight: "900",
    marginTop: 4,
    marginBottom: 2,
  },
  h2: {
    fontSize: 15,
    fontWeight: "900",
    marginTop: 4,
    marginBottom: 2,
  },
  h3: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 3,
    marginBottom: 1,
  },
  listRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    marginTop: 3,
  },
  marker: {
    marginLeft: 6,
    fontWeight: "800",
  },
  listContent: {
    flex: 1,
  },
});
