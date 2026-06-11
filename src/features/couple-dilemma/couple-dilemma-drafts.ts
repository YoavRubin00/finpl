/**
 * Source of truth for the 8 "young-couple dilemmas".
 *
 * Each draft contains everything needed to:
 *   1. Generate Daisy's 5s narration via ElevenLabs (scriptForTTS + blobAudioKey)
 *   2. Reference the matching Higgsfield Kling 3.0 video (videoBlobKey)
 *   3. Render the swipe card (caption, scenario, optionA, optionB)
 *
 * The runtime `coupleDilemmas.ts` reads this list together with the generated
 * URL map (`couple-urls.generated.json`) to build the actual CoupleDilemmaSegment
 * objects consumed by LessonFlowScreen.
 */

import type { CoupleDilemmaOption } from '../chapter-1-content/types';

export interface CoupleDilemmaDraft {
  id: string;
  /** Vercel Blob mp3 key — `audio/couple-dilemmas/{id}.mp3` */
  blobAudioKey: string;
  /** Vercel Blob mp4 key — `finn-videos/{videoId}.mp4` */
  videoBlobId: string;
  /** ~5s of Daisy narration text passed to ElevenLabs eleven_v3 */
  scriptForTTS: string;
  /** Overlay caption on the video itself, RTL, ≤32 chars */
  caption: string;
  /** Scenario question on the swipe card */
  scenario: string;
  optionA: CoupleDilemmaOption;
  optionB: CoupleDilemmaOption;
}

export const COUPLE_DILEMMA_DRAFTS: CoupleDilemmaDraft[] = [
  // ── 5 existing videos — refined for ישראל 2026 with concrete numbers ──
  // All ₪ figures are typical 2025-2026 retail values for a young Israeli
  // couple: avg combined gross income ~25-30k ₪/mo, BoI rate ~4.5%, CBS
  // CPI inflation ~3%, mortgage PTI Bank of Israel cap 50% (33% recommended).
  {
    id: 'cd-wine-receipt',
    blobAudioKey: 'audio/couple-dilemmas/cd-wine-receipt.mp3',
    videoBlobId: 'couple-wine-receipt',
    scriptForTTS: 'החשבון הגיע, שני בקבוקי יין, שני סטייקים. שווה לחזור לפה?',
    caption: 'ערב רומנטי, חשבון מנופח',
    scenario: 'יוצאים החודש שוב למסעדה יקרה?',
    optionA: {
      id: 'a',
      label: 'תקציב 800₪ לבילויים',
      isWise: true,
      feedback: 'תקציב 800₪/חודש = ~2 ערבים נחמדים. לא נשכח לשים גם כסף להשקעות לטווח ארוך.',
    },
    optionB: {
      id: 'b',
      label: 'ממשיכים, חיים פעם אחת',
      isWise: false,
      feedback: 'לחיות את הכאן ועכשיו זה חשוב. אבל גם חשוב לתכנן לטווח רחוק, ולראות שמצליחים לחסוך בכל חודש. נלמד על זה בהמשך.',
    },
  },
  {
    id: 'cd-engagement-ring',
    blobAudioKey: 'audio/couple-dilemmas/cd-engagement-ring.mp3',
    videoBlobId: 'couple-engagement-ring',
    scriptForTTS: 'הטבעת מאחורי הזכוכית. יפה. אבל איך נסגור את החתונה עכשיו?',
    caption: 'בחלון הראווה',
    scenario: 'לוקחים את הטבעת הכי יקרה?',
    optionA: {
      id: 'a',
      label: 'בתקציב, חוסכים לחתונה',
      isWise: true,
      feedback: 'ממוצע טבעת בישראל ~12,000₪. חתונה ~100,000₪. הון עצמי לדירה: 250,000₪+. סדר עדיפויות.',
    },
    optionB: {
      id: 'b',
      label: 'בכרטיס, נדאג אחר כך',
      isWise: false,
      feedback: 'הלוואה של 25,000₪ בכרטיס אשראי בריבית 11% = ~700₪ בחודש שנה שלמה. פתיחה רעה.',
    },
  },
  {
    id: 'cd-dream-apartment',
    blobAudioKey: 'audio/couple-dilemmas/cd-dream-apartment.mp3',
    videoBlobId: 'couple-dream-apartment',
    scriptForTTS: 'הדירה מושלמת. המשכנתא קצת מעל הראש. מה עושים?',
    caption: 'דירת חלומות, החזר מפחיד',
    scenario: 'נמתחים על המשכנתא כדי לקנות?',
    optionA: {
      id: 'a',
      label: 'דירה בהישג יד',
      isWise: true,
      feedback: 'PTI עד 33% מההכנסה זה הסף שיועצים ממליצים. בנק ישראל מאפשר 50%, אבל אז הגג הוא גם החיים.',
    },
    optionB: {
      id: 'b',
      label: 'קופצים, נסתדר',
      isWise: false,
      feedback: 'PTI 45% על 25,000₪ = 11,250₪ למשכנתא. נשאר 14,000₪, מתוכם ~4,000₪ מסים. אפס מרווח לטעויות.',
    },
  },
  {
    id: 'cd-cafe-bill',
    blobAudioKey: 'audio/couple-dilemmas/cd-cafe-bill.mp3',
    videoBlobId: 'couple-cafe-bill',
    // NOTE: Content updated 2026-05-25 — old script was about splitting the bill,
    // new content focuses on monthly cash-flow visibility (matches mod-0-4 topic).
    // Audio still narrates the old script until generate-couple-narrations.ts is re-run.
    scriptForTTS: 'אתה יודע בכלל כמה נכנס וכמה יצא לנו בחודש שעבר — בלי להציץ באפליקציה?',
    caption: 'שקיפות תזרים חודשי',
    scenario: 'כמה באמת נכנס וכמה יצא בחודש שעבר?',
    optionA: {
      id: 'a',
      label: 'נבדוק יחד בסוף החודש',
      isWise: true,
      feedback: 'סקירה חודשית של 15 דק׳ מעלה הוצאות "סמויות" שמסתננות בלי שתשימו לב. זוגות שעושים את זה חוסכים בממוצע 8-12% מההוצאה החודשית — בלי לוותר על שום דבר משמעותי.',
    },
    optionB: {
      id: 'b',
      label: 'מספיק שהיתרה לא שלילית',
      isWise: false,
      feedback: 'בלי מודעות שוטפת, ההוצאות "הקטנות" מצטברות בשקט. אפילו 500₪ לחודש שאתם לא יודעים לאן הולכים = 6,000₪/שנה. ב-3 שנים זה חופשה משפחתית או 18,000₪ שיכלו להתחיל קרן.',
    },
  },
  {
    id: 'cd-vacation-brochure',
    blobAudioKey: 'audio/couple-dilemmas/cd-vacation-brochure.mp3',
    videoBlobId: 'couple-vacation-brochure',
    scriptForTTS: 'תאילנד עכשיו, או עשר שנים בקרן השתלמות?',
    caption: 'מבצע חופשה מפתה',
    scenario: 'טסים עם הבונוס השנתי?',
    optionA: {
      id: 'a',
      label: 'חצי חופשה, חצי חיסכון',
      isWise: true,
      feedback: 'בונוס 20,000₪: 10k לתאילנד, 10k לקרן השתלמות = ~17,900₪ אחרי 6 שנים, פטור ממס.',
    },
    optionB: {
      id: 'b',
      label: 'הכל לחופשה',
      isWise: false,
      feedback: '20,000₪ לתאילנד = חוויה של 10 ימים. אותם 20k בקרן השתלמות 10 שנים: ~35,800₪.',
    },
  },

];
