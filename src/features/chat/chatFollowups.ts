/**
 * Follow-up question chips in the same /api/ai/chat response as the answer
 * (20.11). Every chat message used to make two Gemini calls: the answer, then
 * a second /api/ai/chat call only to write the two chips. Now the client asks
 * for them in the same call and the model writes them after the answer.
 *
 * Wire format (opt-in, so the clients already in the stores are unaffected):
 *   request   the usual body plus `followups: true`
 *   response  the answer streams as plain text exactly as before; after it the
 *             server may add FOLLOWUPS_SEPARATOR + JSON `{"followups":[q1,q2]}`.
 * Without the flag the server sends no extra instruction and no trailer.
 *
 * Shared by the client (ChatScreen) and both servers (api/ai/chat.ts,
 * app/api/ai/chat+api.ts). Pure TypeScript: no React Native imports.
 */

/** ASCII record separator: never part of model text. Ends the answer. */
export const FOLLOWUPS_SEPARATOR = '\u001e';

/** What the model writes, alone on a line, between the answer and the chips. */
export const FOLLOWUPS_MARKER = '@@FOLLOWUPS@@';

/** Appended to the system prompt (last) when the client asks for chips. Same
 *  rules the separate follow-up call used. */
export const FOLLOWUPS_INSTRUCTION = `

שאלות המשך (חובה, בסוף כל תשובה):
אחרי שסיימת את התשובה, כתוב שורה חדשה שיש בה רק ${FOLLOWUPS_MARKER}, ובשורה שאחריה מערך JSON של בדיוק שתי שאלות המשך קצרות שהמשתמש עשוי לשאול עכשיו.
- כל שאלה עד 6 מילים, בעברית, מנוסחת מנקודת המבט של המשתמש.
- השאלות ממשיכות את הנושא ושונות זו מזו.
- בלי עיצוב סביב הסימן ובלי סימון קוד. אחרי המערך לא כותבים כלום, ובתוך התשובה עצמה לא מזכירים את הסימן או את השאלות.
דוגמה לסוף תשובה:
${FOLLOWUPS_MARKER}
["שאלה ראשונה?", "שאלה שנייה?"]`;

/**
 * Pulls two short questions out of model text that should be a JSON array.
 * Tolerates ```json fences and stray prose around the array. Null when there
 * aren't two usable questions.
 */
export function parseQuestionPair(raw: string): [string, string] | null {
  const text = raw.trim();
  if (!text) return null;
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  const questions = parsed
    .filter((q): q is string => typeof q === 'string')
    .map((q) => q.trim())
    .filter((q) => q.length > 0 && q.length <= 80);
  if (questions.length < 2) return null;
  return [questions[0], questions[1]];
}

/**
 * Server side: splits the model's streamed text into the answer (forwarded to
 * the client as it arrives) and the follow-up tail (kept back). Holds back
 * only a trailing piece that could be the start of the marker, so the answer
 * still streams.
 */
export class FollowupStreamSplitter {
  private pending = '';
  private inTail = false;
  private tail = '';

  /** Feed one model chunk; returns the answer text safe to send now. */
  push(chunk: string): string {
    if (this.inTail) {
      this.tail += chunk;
      return '';
    }
    const buf = this.pending + chunk;
    const idx = buf.indexOf(FOLLOWUPS_MARKER);
    if (idx !== -1) {
      this.inTail = true;
      this.pending = '';
      this.tail = buf.slice(idx + FOLLOWUPS_MARKER.length);
      return buf.slice(0, idx);
    }
    let keep = 0;
    for (let k = Math.min(FOLLOWUPS_MARKER.length - 1, buf.length); k > 0; k--) {
      if (FOLLOWUPS_MARKER.startsWith(buf.slice(buf.length - k))) {
        keep = k;
        break;
      }
    }
    this.pending = buf.slice(buf.length - keep);
    return buf.slice(0, buf.length - keep);
  }

  /** End of the model stream: the answer text still held back, and the
   *  trailer to send after it ('' when there are no usable chips). */
  finish(): { text: string; trailer: string } {
    if (!this.inTail) {
      const text = this.pending;
      this.pending = '';
      return { text, trailer: '' };
    }
    const pair = parseQuestionPair(this.tail);
    return {
      text: '',
      trailer: pair ? FOLLOWUPS_SEPARATOR + JSON.stringify({ followups: pair }) : '',
    };
  }
}

/**
 * Client side, for a response that was asked for chips: the full response
 * text → the answer and the chips (if any). If the model skipped the marker
 * and ended the answer with the bare array, that last line is taken as the
 * chips instead of being shown.
 */
export function splitChatResponse(raw: string): { answer: string; followups: [string, string] | null } {
  const sep = raw.indexOf(FOLLOWUPS_SEPARATOR);
  if (sep === -1) {
    // No trailer: the server found no exact marker. The model may still have
    // written one loosely (`@@ FOLLOWUPS @@`, other case); cut there.
    const loose = lastLooseMarker(raw);
    if (loose) {
      return {
        answer: stripTrailingDebris(raw.slice(0, loose.index)),
        followups: parseQuestionPair(raw.slice(loose.index + loose.length)),
      };
    }
    const trimmed = raw.replace(/\s+$/, '');
    const lastBreak = trimmed.lastIndexOf('\n');
    const lastLine = trimmed.slice(lastBreak + 1).trim();
    if (lastBreak !== -1 && lastLine.startsWith('[') && lastLine.endsWith(']')) {
      const pair = parseQuestionPair(lastLine);
      if (pair) return { answer: stripTrailingDebris(trimmed.slice(0, lastBreak)), followups: pair };
    }
    // Trailing whitespace / markdown is what preceded a marker whose chips
    // didn't parse.
    return { answer: stripTrailingDebris(trimmed), followups: null };
  }
  const answer = stripTrailingDebris(raw.slice(0, sep));
  let followups: [string, string] | null = null;
  try {
    const parsed = JSON.parse(raw.slice(sep + 1)) as { followups?: unknown };
    if (Array.isArray(parsed.followups)) {
      followups = parseQuestionPair(JSON.stringify(parsed.followups));
    }
  } catch {
    /* malformed trailer: keep the answer, no chips */
  }
  return { answer, followups };
}

/** The marker as the model may really write it: spaces inside, other case,
 *  "FOLLOWUP" / "FOLLOW-UPS". */
const LOOSE_MARKER = /@@\s*follow[\s_-]*ups?\s*@@/gi;

function lastLooseMarker(text: string): { index: number; length: number } | null {
  let last: { index: number; length: number } | null = null;
  for (const m of text.matchAll(LOOSE_MARKER)) {
    if (m.index !== undefined) last = { index: m.index, length: m[0].length };
  }
  return last;
}

function countFenceLines(text: string): number {
  return text.split('\n').filter((line) => /^\s*`{3,}/.test(line)).length;
}

/**
 * What a marker wrapped in markdown leaves at the end of the answer once the
 * marker and chips are cut off: a line of bare emphasis (`**`, `__`, `*`), an
 * unclosed code fence (```` ``` ```` / ```` ```json ````), a trailing rule, or
 * an unpaired `**` glued to the last line. Removed; balanced markdown stays.
 */
function stripTrailingDebris(text: string): string {
  let out = text.replace(/\s+$/, '');
  for (;;) {
    const lastBreak = out.lastIndexOf('\n');
    const lastLine = out.slice(lastBreak + 1).trim();
    const debris =
      /^[*_~]+$/.test(lastLine)
      || /^-{3,}$/.test(lastLine)
      || (/^`{3,}[\w-]*$/.test(lastLine) && countFenceLines(out) % 2 === 1);
    if (!debris) break;
    out = (lastBreak === -1 ? '' : out.slice(0, lastBreak)).replace(/\s+$/, '');
  }
  // An unpaired emphasis run glued to the end of the last line.
  const lastBreak = out.lastIndexOf('\n');
  const lastLine = out.slice(lastBreak + 1);
  const glued = /\s*(\*\*|__)$/.exec(lastLine);
  if (glued && lastLine.split(glued[1]).length % 2 === 0) {
    out = out.slice(0, out.length - glued[0].length).replace(/\s+$/, '');
  }
  return out;
}
