import { Text } from 'react-native';
import { getGlossaryEntry } from './glossaryData';
import type { GlossaryEntry } from './glossaryData';

/**
 * Regex to match [[term]] or [[term|display]] glossary tags in content text.
 * Group 1 captures everything inside [[ ]], which may contain a pipe.
 */
const GLOSSARY_REGEX = /\[\[([^\]]+)\]\]/g;

interface GlossaryTextOptions {
  /** Base text color (for non-glossary text) */
  textColor?: string;
  /** Glossary term highlight color */
  highlightColor?: string;
  /** Called when a glossary term is tapped */
  onTermPress?: (entry: GlossaryEntry) => void;
  /** Whether to strip [[]] and render term as plain text (for contexts where interactivity isn't desired) */
  plainMode?: boolean;
}

/**
 * Parse text containing [[term]] glossary tags and return React nodes.
 * Glossary terms are rendered with a dashed underline and are tappable.
 * Non-glossary text is returned as-is.
 *
 * This is a "leaf" parser, it does NOT handle bold/English parsing.
 * Use this AFTER or INSIDE the existing renderBoldText flow.
 */
export function renderGlossaryText(
  text: string,
  options: GlossaryTextOptions = {},
): React.ReactNode[] {
  const {
    highlightColor = '#0891b2',
    onTermPress,
    plainMode = false,
  } = options;

  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  // Reset regex state
  GLOSSARY_REGEX.lastIndex = 0;

  while ((match = GLOSSARY_REGEX.exec(text)) !== null) {
    // Push text before the match
    if (match.index > lastIndex) {
      result.push(
        <Text key={`gt-${key++}`}>{text.slice(lastIndex, match.index)}</Text>,
      );
    }

    const raw = match[1];
    // Support [[term|display]] pipe syntax: term is the glossary key, display is what's shown
    const pipeIdx = raw.indexOf('|');
    const term = pipeIdx >= 0 ? raw.slice(0, pipeIdx) : raw;
    const display = pipeIdx >= 0 ? raw.slice(pipeIdx + 1) : raw;
    const entry = getGlossaryEntry(term);

    if (entry && !plainMode) {
      result.push(
        <Text
          key={`gt-${key++}`}
          onPress={() => onTermPress?.(entry)}
          style={{
            color: highlightColor,
            fontWeight: '700',
            textDecorationLine: 'underline',
            // iOS does not render dashed/dotted text decorations reliably —
            // solid keeps the underline continuous across all platforms.
            textDecorationStyle: 'solid',
          }}
        >
          {display}
        </Text>,
      );
    } else {
      // Term not found in glossary or plain mode, render as regular bold text
      result.push(
        <Text key={`gt-${key++}`} style={{ fontWeight: '700' }}>
          {display}
        </Text>,
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Push remaining text
  if (lastIndex < text.length) {
    result.push(
      <Text key={`gt-${key++}`}>{text.slice(lastIndex)}</Text>,
    );
  }

  return result;
}

/**
 * Check if a string contains any [[term]] glossary tags.
 */
export function hasGlossaryTags(text: string): boolean {
  GLOSSARY_REGEX.lastIndex = 0;
  return GLOSSARY_REGEX.test(text);
}

/**
 * Strip [[]] from text, leaving just the term name. For search/indexing.
 */
export function stripGlossaryTags(text: string): string {
  return text.replace(GLOSSARY_REGEX, (_match, content: string) => {
    const pipeIdx = content.indexOf('|');
    return pipeIdx >= 0 ? content.slice(pipeIdx + 1) : content;
  });
}
