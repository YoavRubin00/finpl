import { streamChatRequest } from "../../utils/streamChat";

/**
 * Generates two short Hebrew follow-up questions based on the last Q&A turn.
 *
 * Reuses the existing /api/ai/chat streaming endpoint (no backend change): we
 * accumulate the streamed text and parse a JSON array out of it. The model is
 * asked for ONLY a JSON array, but real outputs sometimes wrap it in markdown
 * fences or stray prose — `extractQuestionPair` tolerates that.
 *
 * Never throws. Any failure (network, abort, malformed output, wrong shape)
 * resolves to `null`, and the caller simply keeps whatever chips are showing.
 */

const FOLLOWUP_SYSTEM_PROMPT = `אתה עוזר שמייצר שאלות המשך לצ'אט פיננסי בעברית.
על סמך השאלה האחרונה של המשתמש והתשובה שקיבל, החזר בדיוק שתי שאלות המשך קצרות וטבעיות שהמשתמש עשוי לשאול עכשיו.
חוקים:
- כל שאלה עד 6 מילים, בעברית, מנוסחת מנקודת מבט המשתמש.
- השאלות חייבות להמשיך את הנושא ולהיות שונות זו מזו.
- החזר אך ורק מערך JSON של שתי מחרוזות, בלי שום טקסט נוסף, בלי הסברים, בלי סימון קוד.
דוגמה לפלט: ["שאלה ראשונה?", "שאלה שנייה?"]`;

function extractQuestionPair(raw: string): [string, string] | null {
  const text = raw.trim();
  if (!text) return null;

  // Pull the first JSON-array-looking span, tolerating ```json fences / prose.
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;
  const slice = text.slice(start, end + 1);

  let parsed: unknown;
  try {
    parsed = JSON.parse(slice);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;

  const questions = parsed
    .filter((q): q is string => typeof q === "string")
    .map((q) => q.trim())
    .filter((q) => q.length > 0 && q.length <= 80);

  if (questions.length < 2) return null;
  return [questions[0], questions[1]];
}

export async function generateFollowups(
  lastQuestion: string,
  lastAnswer: string,
  signal?: AbortSignal,
): Promise<[string, string] | null> {
  const q = lastQuestion.trim();
  const a = lastAnswer.trim();
  if (!q || !a) return null;

  const userTurn = `שאלת המשתמש: ${q}\nהתשובה שקיבל: ${a}\n\nהחזר מערך JSON של שתי שאלות המשך.`;

  let accumulated = "";
  const { ok } = await streamChatRequest(
    {
      systemPrompt: FOLLOWUP_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userTurn }],
      // gemini-2.5-flash spends a large, variable share of the budget on
      // internal reasoning before emitting output, and Hebrew is token-dense.
      // A low cap truncates the JSON before its closing `]` (verified: 120/256/
      // 512 all cut off mid-array; ~1024 completes). The cap only prevents
      // truncation — when the two-question array is short the model stops early,
      // so the headroom costs nothing extra.
      maxOutputTokens: 2048,
    },
    (chunk) => {
      accumulated += chunk;
    },
    signal,
  );

  if (!ok) return null;
  return extractQuestionPair(accumulated);
}
