/**
 * POST /api/ai/insights
 *
 * Generates 4 personalized financial learning insights for a Pro user.
 * Uses internal AI engine signals (persona, knowledge gaps, weak concepts)
 * alongside full curriculum context for high-quality, tailored insights.
 */

import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString } from '../_shared/validate';

interface InsightsRequestBody {
  name: string;
  xp: number;
  level: number;
  streak: number;
  completedModuleNames: string[];   // Hebrew names, translated on client
  lastModuleName: string | null;
  financialGoal?: string;
  knowledgeLevel?: string;
  // Internal AI engine signals
  persona?: string;                 // PersonaLabel from useAITelemetryStore
  knowledgeGaps?: string[];         // Module IDs with < 50% quiz accuracy
  recommendedActions?: string[];    // RecommendedAction[] from analyzeProfile
  weakConcepts?: string[];          // conceptTags with failCount >= 2
}

interface Insight {
  category: 'progress' | 'next' | 'strength' | 'tip';
  emoji: string;
  title: string;
  body: string;
}

interface GeminiResponse {
  candidates: Array<{
    content: { parts: Array<{ text: string }> };
  }>;
}

const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY ?? '';
const GEMINI_MODEL = 'gemini-2.5-flash';

// Full curriculum, same source of truth as the chat companion
const CURRICULUM_KNOWLEDGE = `
פרק 1, יסודות (בסיס פיננסי):
• תזרים ותקציב, חוק 50/30/20: 50% צרכים, 30% רצונות, 20% חיסכון.
• מלכודת המינוס, עמלות ישראליות על חריגה ממסגרת אשראי, ריבית על מינוס.
• אשראי ותשלום מינימום, למה תשלום מינימום בכרטיס אשראי זה מלכודת חוב.
• ריבית דריבית, איינשטיין קרא לה "הפלא השמיני". ריבית על ריבית לאורך זמן.
• תלוש שכר, ברוטו vs נטו, ניכויים (מס הכנסה, ביטוח לאומי, בריאות, פנסיה).
• הלוואות צרכניות, ריביות גבוהות על הלוואות לא מובטחות, עלות אמיתית (APR).
• עמלות בנק, סוגי עמלות, זכות למיקוח, מעבר לבנק דיגיטלי.
• מלכודות שיווקיות, טכניקות כמו anchoring, loss aversion, decoy effect בסופר.
• קרן חירום, כרית ביטחון של 3-6 חודשי הוצאות, סדר עדיפויות.

פרק 2, ביטחון (הגנה ארוכת טווח):
• דירוג אשראי, FICO / BDI, איך משפר דירוג, למה זה חשוב למשכנתא.
• נקודות זיכוי, הטבות מס לצעירים, נקודות זיכוי בסיסיות בישראל.
• פנסיה, חיסכון חובה, קרן פנסיה vs ביטוח מנהלים, דמי ניהול.
• קרן השתלמות, "היהלום" של שוק ההון הישראלי, פטור ממס לאחר 6 שנים.
• ביטוחים, ביטוח בריאות, חיים, רכב, דירה. מה חובה ומה מיותר.

פרק 3, יציבות (כוחות כלכליים):
• אינפלציה, "המפלצת השקופה" שמכרסמת בערך הכסף לאורך זמן.
• פסיכולוגיה של הכסף, הטיות קוגניטיביות: anchoring, sunk cost, FOMO.
• קופת גמל להשקעה, חיסכון פטור ממס רווחי הון, "המקפצה" לעצמאות.
• רובו-אדוויזור, ניהול השקעות אוטומטי, יתרונות לצעירים.

פרק 4, צמיחה (שוק ההון):
• שוק ההון 101, מניות (בעלות חלקית) vs אגרות חוב (הלוואה לחברה/ממשלה).
• קסם המדדים, S&P 500, מדד ת"א 125. למה רוב המנהלים לא מכים את המדד.
• תעודות סל (ETF), קרנות מחקות מדדים, דמי ניהול נמוכים, פיזור אוטומטי.
• פקודות מסחר, לימיט, מרקט, סטופ לוס. איך קונים ומוכרים בבורסה.
• דיבידנדים, "משכורת מהמניות", תשואת דיבידנד, DRIP.
• פיזור וניהול סיכונים, לא לשים הכל בסל אחד, קורלציה, אלוקציית נכסים.

פרק 5, הדרך לחופש כלכלי:
• תנועת FIRE, Financial Independence, Retire Early. שיעור חיסכון 50%+.
• משכנתא ונדל"ן, סוגי מסלולים (קבועה, משתנה, פריים), LTV, הון עצמי.
• REIT, נדל"ן מניב דרך הבורסה, פיזור נדל"ני ללא קניית דירה.
• תכנון פרישה, קיבוע זכויות, גיל פרישה, חישוב קצבה חודשית.
• העברה בין-דורית, צוואות, תכנון עיזבון, מתנות ככלי תכנון פיננסי.
`.trim();

const PERSONA_HEBREW: Record<string, string> = {
  'Aggressive':     'אגרסיבי, אוהב סיכון גבוה ותשואות גדולות',
  'Risk-Curious':   'סקרן, פתוח לסיכון אחרי למידה',
  'Balanced':       'מאוזן, שוקל סיכון מול תשואה בזהירות',
  'Risk-Averse':    'שמרן, מעדיף יציבות על תשואה',
  'Conservative':   'מרוסן, מינימום סיכון בכל מחיר',
};

const ACTION_HEBREW: Record<string, string> = {
  'UNLOCK_CRYPTO_NODE':       'מוכן לעולם הקריפטו',
  'UNLOCK_TAX_NODE':          'מוכן לתכנון מס מתקדם',
  'UNLOCK_ADVANCED_INVESTING':'מוכן לתיק השקעות מתקדם',
  'INCREASE_DIFFICULTY':      'מוכן לאתגרים ברמה גבוהה יותר',
  'DECREASE_DIFFICULTY':      'כדאי לחזק את הבסיס לפני שממשיכים',
  'TRIGGER_TARGETED_IAP':     'הראה עניין בכלים פרימיום',
};

export async function POST(request: Request): Promise<Response> {
  const blocked = enforceRateLimit(request, 'ai-insights', { limit: 10, windowSec: 60 });
  if (blocked) return blocked;

  if (!GEMINI_API_KEY) {
    return Response.json({ error: 'AI service not configured.' }, { status: 503 });
  }

  try {
    const body = (await request.json()) as InsightsRequestBody;

    const name = sanitizeString(body.name, 50) ?? 'משתמש';
    const xp = Number(body.xp) || 0;
    const level = Number(body.level) || 1;
    const streak = Number(body.streak) || 0;
    const completedModuleNames: string[] = Array.isArray(body.completedModuleNames)
      ? body.completedModuleNames.slice(0, 100).map((m) => sanitizeString(String(m), 80) ?? '').filter(Boolean)
      : [];
    const lastModuleName = body.lastModuleName
      ? (sanitizeString(String(body.lastModuleName), 80) ?? null)
      : null;

    const goalLabels: Record<string, string> = {
      'cash-flow':       'ניהול תזרים מזומנים',
      investing:         'השקעות',
      'army-release':    'שחרור מהצבא',
      'expand-horizons': 'הרחבת אופקים',
      unsure:            'עדיין לא בטוח',
    };
    const financialGoal = goalLabels[body.financialGoal ?? ''] ?? 'כללי';

    // AI engine signals
    const personaHebrew = body.persona ? (PERSONA_HEBREW[body.persona] ?? body.persona) : null;
    const knowledgeGaps: string[] = Array.isArray(body.knowledgeGaps) ? body.knowledgeGaps.slice(0, 10) : [];
    const recommendedActionsHebrew: string[] = Array.isArray(body.recommendedActions)
      ? body.recommendedActions.map((a) => ACTION_HEBREW[a] ?? a).slice(0, 5)
      : [];
    const weakConcepts: string[] = Array.isArray(body.weakConcepts) ? body.weakConcepts.slice(0, 10) : [];

    // Build the enriched context section only when signals are available
    const engineContext = [
      personaHebrew ? `פרופיל למידה (מנוע AI פנימי): ${personaHebrew}` : null,
      knowledgeGaps.length > 0 ? `נושאים עם קושי (ציון < 50%): ${knowledgeGaps.join(', ')}` : null,
      weakConcepts.length > 0 ? `מושגים שחוזרים ונכשלים בהם: ${weakConcepts.join(', ')}` : null,
      recommendedActionsHebrew.length > 0 ? `המלצות המנוע הפנימי: ${recommendedActionsHebrew.join(', ')}` : null,
    ].filter(Boolean).join('\n');

    const systemPrompt = `אתה מנתח למידה פיננסי של FinPlay, אפליקציית חינוך פיננסי לגיל Z.
תפקידך: לנתח את כל נתוני הלמידה של המשתמש ולהפיק 4 תובנות מותאמות אישית ומעמיקות.

## תוכנית הלימודים המלאה
${CURRICULUM_KNOWLEDGE}

## כללים לתובנות
- כתוב בעברית בלבד, בגוף שני רבים (אתם, שלכם)
- קצר ומדויק, כל "body" הוא 2-3 משפטים
- התייחס ספציפית למה שהמשתמש למד ולנקודות החולשה שלו
- הצעד הבא (next) חייב לנקוב בשם ספציפי של נושא מהתוכנית הלימודית
- הטיפ הפיננסי (tip) חייב להיות מיישם ומעשי, לא כללי
- השתמש בנתוני פרופיל הלמידה מהמנוע הפנימי כשהם קיימים
- תמיד תחזיר JSON תקין בלבד, ללא שום טקסט נוסף לפני או אחרי`;

    const userMessage = `## נתוני המשתמש
שם: ${name} | XP: ${xp.toLocaleString()} | רמה ${level} | רצף: ${streak} ימים | מטרה: ${financialGoal}
נושאים שהושלמו (${completedModuleNames.length}): ${completedModuleNames.length > 0 ? completedModuleNames.join(', ') : 'אף נושא עדיין'}
הנושא האחרון: ${lastModuleName ?? 'אין'}

${engineContext ? `## נתוני מנוע AI פנימי\n${engineContext}\n` : ''}
## הנחיה
הפק בדיוק 4 תובנות בפורמט JSON הבא:
{
  "insights": [
    {
      "category": "progress",
      "emoji": "📊",
      "title": "כותרת קצרה (3-5 מילים)",
      "body": "תובנה על קצב ההתקדמות, עקביות הלמידה, והרצף, התייחס לנתונים הספציפיים"
    },
    {
      "category": "next",
      "emoji": "💡",
      "title": "כותרת קצרה",
      "body": "המלצה ספציפית על הנושא הבא ללמוד, עם הסבר קצר למה זה הצעד הנכון עכשיו"
    },
    {
      "category": "strength",
      "emoji": "⭐",
      "title": "כותרת קצרה",
      "body": "נקודת חוזק מוכחת, תחום שבו ביצועי הלמידה טובים במיוחד"
    },
    {
      "category": "tip",
      "emoji": "💰",
      "title": "כותרת קצרה",
      "body": "טיפ פיננסי מעשי ומיישם, קשור ישירות לנושאים שנלמדו לאחרונה"
    }
  ]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userMessage }] }],
          generationConfig: {
            maxOutputTokens: 1024,
            responseMimeType: 'application/json',
          },
        }),
      },
    );

    if (!response.ok) {
      return Response.json({ error: 'AI service temporarily unavailable.' }, { status: 502 });
    }

    const data = (await response.json()) as GeminiResponse;
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    let insights: Insight[] = [];
    try {
      const parsed = JSON.parse(rawText) as { insights: Insight[] };
      insights = parsed.insights ?? [];
    } catch {
      return Response.json({ error: 'Failed to parse AI response.' }, { status: 502 });
    }

    if (!Array.isArray(insights) || insights.length !== 4) {
      return Response.json({ error: 'Unexpected AI response shape.' }, { status: 502 });
    }

    return Response.json({ ok: true, insights });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'ai/insights');
  }
}
