import type { DailyQuiz } from './dailyQuizTypes';
import type { DataPoint } from './newsDataService';
import { getFallbackQuiz } from './fallbackQuizzes';

interface GeminiQuizResponse {
  userFacingTitle: string;
  citation: string;
  historicalExample: string;
  question: string;
  options: [string, string, string];
  correctAnswerIndex: 0 | 1 | 2;
  explanation: string;
}

function buildPrompt(dataPoint: DataPoint): string {
  const newsSection = dataPoint.newsHeadline
    ? `\nכותרת חדשות אקטואלית (מ-${dataPoint.newsSource ?? 'מקור פיננסי'}):
"${dataPoint.newsHeadline}"
${dataPoint.newsSummary ? `תקציר: ${dataPoint.newsSummary}` : ''}
\nצור שאלה שמתחברת לכותרת החדשות הזו ומסבירה את המנגנון הכלכלי שמאחוריה.`
    : '';

  return `אתה אנליסט פיננסי בכיר שמלמד צעירים (18-28) בישראל חשיבה כלכלית מעמיקה.
נתון כלכלי: ${dataPoint.label} עומד על ${dataPoint.value}.
מגמה: ${dataPoint.direction === 'up' ? 'עלייה' : dataPoint.direction === 'down' ? 'ירידה' : 'יציבות'}.
${newsSection}

צור מבזק פיננסי יומי — שאלה מעמיקה בעברית שבודקת חשיבה כלכלית ברמה גבוהה.
השאלה חייבת להיות מבוססת על אירוע אקטואלי או מגמה עכשיווית בשוק.

פורמט JSON בלבד (ללא טקסט נוסף):
{
  "userFacingTitle": "כותרת מושכת בעברית שמרמזת על הידיעה",
  "citation": "משפט אחד שמתאר את המצב הכלכלי הנוכחי בהתבסס על הכותרת",
  "historicalExample": "דוגמה היסטורית קצרה — מקרה דומה שקרה בעבר עם נתונים אמיתיים",
  "question": "שאלה שבודקת הבנה עמוקה של מנגנון כלכלי הקשור לידיעה",
  "options": ["תשובה 1", "תשובה 2", "תשובה 3"],
  "correctAnswerIndex": 0,
  "explanation": "הסבר מעמיק שחושף את המנגנון הכלכלי ומלמד משהו חדש"
}

כללים:
- השאלה חייבת להתחבר לידיעה האקטואלית ולא להיות גנרית
- התשובות קצרות (עד 15 מילים) אבל מדויקות
- ההסבר חושף מנגנון כלכלי אמיתי עם דוגמה מספרית או היסטורית
- השאלה בודקת חשיבה כלכלית — קורלציות, סיבתיות, או trade-offs
- החזר JSON תקין בלבד, ללא markdown או backticks`;
}

function validateGeminiResponse(data: unknown): data is GeminiQuizResponse {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  if (typeof obj.userFacingTitle !== 'string') return false;
  if (typeof obj.citation !== 'string') return false;
  if (typeof obj.question !== 'string') return false;
  if (!Array.isArray(obj.options) || obj.options.length !== 3) return false;
  if (obj.options.some((o: unknown) => typeof o !== 'string')) return false;
  if (![0, 1, 2].includes(obj.correctAnswerIndex as number)) return false;
  if (typeof obj.explanation !== 'string') return false;
  return true;
}

// Rate limit: track last call date (client-side, best-effort)
let lastCallDate = '';

export async function generateDailyQuiz(dataPoint: DataPoint): Promise<DailyQuiz> {
  const today = new Date().toISOString().slice(0, 10);

  // Rate limit — 1 call per day
  if (lastCallDate === today) {
    return getFallbackQuiz(today, dataPoint.category);
  }

  try {
    const res = await fetch('/api/ai/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: buildPrompt(dataPoint) }),
    });

    if (!res.ok) throw new Error('Quiz API error');

    lastCallDate = today;

    const json = (await res.json()) as { ok: boolean; text: string };
    const text = json.text ?? '';

    // Clean potential markdown wrapping
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed: unknown = JSON.parse(cleanText);

    if (!validateGeminiResponse(parsed)) {
      throw new Error('Invalid response structure');
    }

    return {
      quizId: `ai-${today}-${dataPoint.category}`,
      date: today,
      category: dataPoint.category,
      rawNewsTitle: `${dataPoint.label}: ${dataPoint.value}`,
      userFacingTitle: parsed.userFacingTitle,
      question: parsed.question,
      options: parsed.options,
      correctAnswerIndex: parsed.correctAnswerIndex,
      explanation: parsed.explanation,
      citation: parsed.citation,
      historicalExample: parsed.historicalExample ?? '',
      xpReward: 50,
      coinReward: 25,
      sourceValue: dataPoint.value,
      sourceLabel: dataPoint.label,
    };
  } catch {
    return getFallbackQuiz(today, dataPoint.category);
  }
}
