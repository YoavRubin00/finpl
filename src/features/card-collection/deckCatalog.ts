import type { ImageSource } from "expo-image";
import type { Chapter } from "../chapter-1-content/types";
import { chapter0Data } from "../chapter-0-content/chapter0Data";
import { chapter1Data } from "../chapter-1-content/chapter1Data";
import { chapter2Data } from "../chapter-2-content/chapter2Data";
import { chapter3Data } from "../chapter-3-content/chapter3Data";
import { chapter4Data } from "../chapter-4-content/chapter4Data";
import { chapter5Data } from "../chapter-5-content/chapter5Data";
import { INFOGRAPHIC_MAP } from "../chapter-1-content/FlashcardInfographic";

/**
 * deckCatalog — derives each module's collectible card deck from the EXISTING
 * content data. Single source of truth chain:
 *   chapterXData (which flashcards a module has, in lesson order)
 *     × INFOGRAPHIC_MAP (which of them have a PNG infographic — imported from
 *       FlashcardInfographic, NOT duplicated, so the Blob→proxy rewrite that
 *       runs there at module load applies to the collection too)
 * A module's deck = its flashcards that have an infographic, in lesson order.
 * Modules with zero infographic cards simply have no deck (they never appear
 * in the collection — no fake/empty decks).
 *
 * NOTE: card ids are read from chapter data, never inferred from filenames —
 * mod-0-1's cards live under fc-0-2-* (the 2026-06-04 split legacy naming).
 */

export interface DeckCard {
  cardId: string;
  /** ExpoImage-compatible source: proxied remote {uri} or a bundled require(). */
  source: ImageSource | number;
  /** The card's sentence from the lesson data, markup-cleaned + smart-trimmed. */
  title: string;
}

export interface ModuleDeck {
  moduleId: string;
  moduleTitle: string;
  chapterId: string;
  chapterTitle: string;
  cards: DeckCard[];
}

const ALL_CHAPTERS: Chapter[] = [
  chapter0Data,
  chapter1Data,
  chapter2Data,
  chapter3Data,
  chapter4Data,
  chapter5Data,
];

/** Strip lesson markup for display: [[term]] → term, **bold** → bold. */
function cleanMarkup(text: string): string {
  return text
    .replace(/\[\[(.+?)\]\]/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

const TITLE_MAX_CHARS = 90;

/**
 * Smart trim: prefer the first full sentence (the flashcards open with a
 * definition sentence — "בנק: חנות שמוכרת וקונה כסף."); if that's still too
 * long, cut at a word boundary with an ellipsis.
 */
function smartTitle(rawText: string): string {
  const text = cleanMarkup(rawText);
  if (text.length === 0) return "";
  const sentenceEnd = text.search(/[.!?](\s|$)/);
  const firstSentence = sentenceEnd > 0 ? text.slice(0, sentenceEnd + 1) : text;
  if (firstSentence.length <= TITLE_MAX_CHARS) return firstSentence;
  const cut = firstSentence.lastIndexOf(" ", TITLE_MAX_CHARS);
  return `${firstSentence.slice(0, cut > 40 ? cut : TITLE_MAX_CHARS).trimEnd()}…`;
}

/** Stable identity for de-duping: remote uri or the bundled asset id. */
function sourceKey(source: ImageSource | number): string {
  if (typeof source === "number") return `bundled:${source}`;
  return typeof source.uri === "string" ? source.uri : JSON.stringify(source);
}

let catalogCache: ModuleDeck[] | null = null;

function buildCatalog(): ModuleDeck[] {
  const decks: ModuleDeck[] = [];
  for (const chapter of ALL_CHAPTERS) {
    for (const mod of chapter.modules) {
      if (mod.comingSoon) continue;
      const seen = new Set<string>();
      const cards: DeckCard[] = [];
      for (const fc of mod.flashcards) {
        const source = INFOGRAPHIC_MAP[fc.id];
        if (source === undefined || source === null) continue;
        // Some cards intentionally share a PNG (fc-4-b1-2 / fc-4-b1-2b) —
        // one collectible per image, not per flashcard.
        const key = sourceKey(source);
        if (seen.has(key)) continue;
        seen.add(key);
        cards.push({
          cardId: fc.id,
          source,
          // Fallback to the module title for the rare infographic card whose
          // text is empty — an empty caption under a full-screen card reads
          // as broken.
          title: smartTitle(fc.text) || mod.title,
        });
      }
      if (cards.length === 0) continue;
      decks.push({
        moduleId: mod.id,
        moduleTitle: mod.title,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        cards,
      });
    }
  }
  return decks;
}

/** All collectible decks, in chapter → module lesson order. Cached. */
export function getAllDecks(): ModuleDeck[] {
  if (catalogCache === null) catalogCache = buildCatalog();
  return catalogCache;
}

/** The deck for one module ([] when the module has no infographic cards). */
export function getDeckForModule(moduleId: string): DeckCard[] {
  return getAllDecks().find((d) => d.moduleId === moduleId)?.cards ?? [];
}

/** Number of collectible cards in the module's deck (0 = no deck). */
export function getDeckSize(moduleId: string): number {
  return getDeckForModule(moduleId).length;
}
