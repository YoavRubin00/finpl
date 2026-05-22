# 🎙️ Shark Voice Chat — Setup & Handoff Guide

מדריך הקמה מלא לפיצ'ר "שיחת לייב 1-on-1 עם קפטן שארק".
הקוד באפליקציה כבר מוכן — צריך להשלים את **שלב הקונפיג החיצוני** (ElevenLabs + Vercel env vars).

---

## ✅ Quick-start Checklist

| # | משימה | איפה | זמן משוער |
|---|---|---|---|
| 1 | פתיחת חשבון ElevenLabs Pro/Business | [elevenlabs.io](https://elevenlabs.io) | 2 דק' |
| 2 | הוספת הקול **Liam (Eleven v3)** מה-Voice Library | ElevenLabs → Voices → Add from library | 1 דק' |
| 3 | יצירת Conversational AI Agent עם Liam | ElevenLabs → Conversational AI | 10 דק' |
| 4 | חיווט Gemini כ-LLM של ה-Agent | תוך ה-Agent | 3 דק' |
| 5 | הזנת ה-System Prompt (להלן) | תוך ה-Agent | 1 דק' |
| 6 | הוספת ה-env vars ב-Vercel | Vercel → Project Settings | 3 דק' |
| 7 | (אופציונלי) יצירת לופי וידאו ב-Higgsfield | MCP מ-Claude | 30 דק' |
| 8 | בדיקה: `npm run web` → `/chat` → אייקון 📞 | מקומי | 5 דק' |

---

## 🎤 Step 1 — קול השארק: **Liam (Eleven v3)**

הקול הסופי שנבחר: **Liam**, מודל **Eleven v3** — קול גברי, חם וצעיר מספריית ה-Voices של ElevenLabs.
**אין צורך לשבט קול חדש.**

### הוספת Liam לחשבון
1. ElevenLabs → **Voices** → **Voice Library** → חיפוש: `Liam`.
2. בחר את הקול **Liam** (זכר, אנרגיה צעירה, מתאים לדיאלוג).
3. לחץ **Add to Voices**.
4. אחרי ההוספה — **העתק את ה-Voice ID** של Liam מתוך הרשימה שלך.
   → ילך ל-`ELEVENLABS_SHARK_VOICE_ID`.

### Voice Settings מומלצות (תוך ה-Agent)
- **Model:** `Eleven v3`
- **Stability:** 0.45 (מאזן בין טבעיות לעקביות)
- **Similarity:** 0.80
- **Style Exaggeration:** 0.25
- **Speaker Boost:** ✅
- **Streaming Latency:** 3 (balanced) או 4 (lowest latency)

### למה Liam עובד טוב לשארק
- אנרגיה צעירה ושובבה — מתאים לבני Gen-Z.
- מבטא אמריקאי קל, אבל מודל v3 מטפל מצוין בעברית עם accent ישראלי טבעי.
- נשמע "חי" יותר מהקולות הסטנדרטיים — מתאים לאישיות של קפטן שארק.

### V3 model — למה זה חשוב
- Eleven v3 הוא המודל המתקדם ביותר נכון לתחילת 2026.
- Latency נמוך משמעותית (~250ms time-to-first-byte בסטרים).
- תמיכה רב-לשונית מובנית — מטפל בערבוב עברית+אנגלית באותו משפט.
- emotional inflection טבעי יותר — קריטי לחוויית "שיחה ולא הקראה".
- תומך ב-`streaming_latency=4` (lowest latency) ב-WebSocket של Conversational AI.

---

## 🤖 Step 2 — יצירת Conversational AI Agent

### יצירה
1. ElevenLabs → **Conversational AI** → **Agents** → **Create agent**.
2. שם: `Captain Shark – Live Chat`.
3. תיאור: "1-on-1 voice chat with FinPlay's Captain Shark — Hebrew Gen-Z financial mentor."

### הגדרות שיחה (Agent Settings)
- **First message** (פתיחה אוטומטית כשהמשתמש מתחבר):
  ```
  היי! אני קפטן שארק. על מה תרצה לדבר היום?
  ```
- **Language:** Hebrew (`he`).
- **Voice:** **Liam** (מה-Voice Library שהוספת).
- **TTS Model:** **Eleven v3**.
- **Streaming latency optimization:** 3 (balanced) או 4 (fastest).

### Speech-to-Text (STT)
- **Provider:** ElevenLabs default (Whisper-based, מבין עברית מעולה).
- **Detect language:** Hebrew.
- **Silence threshold:** 1.5 שניות (כמה שקט עד שמחשיבים שהמשתמש סיים).
- **Min words to consider end of turn:** 2.

### LLM Configuration
- **LLM Provider:** Google AI (Gemini).
- **Model:** `gemini-2.5-flash` (מהיר) או `gemini-2.5-pro` (איכותי, יותר latency).
- **Temperature:** 0.7.
- **Max tokens:** 250 (כדי לאלץ תשובות קצרות).
- **API key:** ה-`GOOGLE_AI_API_KEY` שלכם (אותו אחד שמוגדר ב-Vercel).

### System Prompt
העתק את כל הטקסט הבא ל-System Prompt של ה-Agent (זה תוכן הקובץ
`app/api/ai/_prompts/sharkVoicePrompt.ts` שיצרנו):

```
אתה "קפטן שארק" — שארק חכם, חם ושובב מאפליקציית FinPlay לבני דור Z בישראל.
אתה מדבר עם המשתמש בשיחת קול חיה אחד-על-אחד.

## האישיות שלך
- חם, אמפתי, ישיר. שילוב של חבר טוב עם מומחה פיננסי.
- מקשיב באמת, שואל שאלות, לא מטיף.
- שובב ויש לך חוש הומור — מותר לצחוק על עצמך, על מקרים, על הכריש שבך.
- אסור להציג עצמך כרואה חשבון, יועץ פיננסי או יועץ השקעות מוסמך. כל מה שאתה אומר זה לידע כללי בלבד.
- אם נשאלים על השקעה ספציפית, מוצר ספציפי, או מה לקנות/למכור — מסבירים עקרונות אבל מבקשים לפנות ליועץ מוסמך.

## כללי הדיבור (חשוב מאוד)
- עברית בלבד, RTL, בגוף שני יחיד (אתה, שלך).
- מקסימום 3 משפטים בתגובה. רצוי 1-2 משפטים קצרים.
- מקסימום 250 תווים בתגובה.
- בלי markdown, בלי כוכביות, בלי רשימות, בלי כותרות, בלי JSON, בלי code blocks.
- בלי אימוג'ים — ה-TTS קורא אותם בקול וזה נשמע מוזר.
- בלי מילים באנגלית, חוץ ממונחים שאין להם תרגום ("בנק", "אפליקציה", "פינטק", שמות מוצרים).
- אם המספר חשוב — אמור אותו במילים כשאפשר ("שלושת אלפים שקלים", לא "3000 ש"ח").
- שאלות פתוחות עוזרות לשיחה לזרום: "ספר לי עוד", "איך זה גורם לך להרגיש", "מה ניסית עד עכשיו".
- כשמסכימים על משהו, סוגרים את הנקודה בקצרה ועוברים הלאה. לא חוזרים על מה שהמשתמש אמר.

## תחומי שיחה
- ניהול תקציב יומי, חודשי, חיסכון לטווח קצר/ארוך.
- פנסיה, ביטוח לאומי, קרן השתלמות, תלושי שכר (ברמת עקרונות).
- חובות, אשראי, כרטיסי אשראי, הלוואות.
- ההשקעות הראשונות (תיק מדדים פסיבי, ETF, פיקדונות, איגרות חוב) — ברמת חינוך.
- מנטליות פיננסית: דחיית סיפוקים, קניות אימפולסיביות, FOMO, השוואות חברתיות.
- מטרות חיים: דירה, חתונה, טיול גדול, ילדים, פרישה מוקדמת.

## אם המשתמש בלחץ או במצוקה
- האט. הקשב. אל תקפוץ לפתרון.
- שאל מה הוא מרגיש לפני שמדברים על מספרים.
- אם זה נשמע חמור (לחץ קיצוני, חובות מסוכנים, מחשבות פגיעה) — המלץ לפנות לגוף מקצועי: "פעמונים" לעזרה פיננסית, "ער"ן" לעזרה רגשית.

## פתיחת שיחה
- כשפותחים שיחה, בקצרה: "היי! אני קפטן שארק. על מה תרצה לדבר היום?"
- אל תאריך, אל תפתח רשימת אפשרויות, פשוט תקשיב.

זכור: זאת שיחת קול. הטון שלך זה לא טקסט — זאת שיחה אמיתית.
```

### Tools (אופציונלי לעתיד)
ב-V2 נוסיף Function Calling ל-Agent כדי שיוכל לפעול:
- `get_user_savings_goals()` — קריאת המטרות מ-Zustand
- `update_budget(category, amount)` — עדכון תקציב
- `recommend_lesson(topic)` — להפנות לשיעור ספציפי באפליקציה

לבינתיים — בלי tools.

### שמירת ה-Agent ID
אחרי יצירה → קופץ `Agent ID` (יתחיל ב-`agent_...`).
→ ילך ל-`ELEVENLABS_AGENT_ID`.

---

## 🔑 Step 3 — Environment Variables

### Vercel (Production)
ב-Vercel → Project Settings → Environment Variables → הוסף את הבאים ב-**Production** + **Preview**:

| שם המשתנה | ערך | הערות |
|---|---|---|
| `ELEVENLABS_API_KEY` | `xi_...` | מ-ElevenLabs Dashboard → Profile → API Keys |
| `ELEVENLABS_AGENT_ID` | `agent_...` | מה-Agent שיצרת |
| `ELEVENLABS_SHARK_VOICE_ID` | (Liam ID) | ה-Voice ID של Liam מתוך הספרייה שלך |
| `GOOGLE_AI_API_KEY` | (כבר קיים) | בודק ש-Gemini 2.5 דורש כרגע |

### לוקאלי (לפיתוח)
צור `.env.local` בשורש הפרויקט (לא יעלה ל-git):
```bash
ELEVENLABS_API_KEY=xi_...
ELEVENLABS_AGENT_ID=agent_...
ELEVENLABS_SHARK_VOICE_ID=<Liam Voice ID>
```
שום משתנה שמתחיל ב-`ELEVENLABS_` לא יהיה חשוף לאפליקציית הלקוח — הם משמשים רק את ה-API routes ב-Vercel.

---

## 🌊 Step 4 — Architecture Recap

```
┌──────────────────────────────────────────────────────────────┐
│                      Mobile / Web Client                       │
│                                                                │
│  ChatScreen ─── 📞 button ──→ /shark-voice                     │
│                                  │                             │
│                                  ▼                             │
│            SharkVoiceCallScreen                                │
│            ├─ SharkAvatar (8 WebP variants, cross-fade)        │
│            ├─ TranscriptOverlay                                │
│            └─ CallControls (mute, end)                         │
│                       │                                        │
│                       │ uses                                   │
│                       ▼                                        │
│   useElevenLabsConversation()                                  │
│   ├─ POST /api/voice/session  ──→ signed_url                   │
│   ├─ new WebSocket(signed_url)                                 │
│   ├─ mic stream (web: MediaRecorder)                           │
│   └─ events: user_transcript, agent_response, audio, ping      │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         │ WSS
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                ElevenLabs Conversational AI                    │
│                                                                │
│   ┌────────────┐   ┌────────────┐   ┌────────────┐             │
│   │   STT      │──→│  Gemini    │──→│  TTS (v3)  │             │
│   │ (Whisper)  │   │  2.5 Flash │   │ Shark voice│             │
│   └────────────┘   └────────────┘   └────────────┘             │
│                                                                │
│                  Latency ~300ms first audio                    │
│                  Built-in barge-in / interruption              │
└──────────────────────────────────────────────────────────────┘
```

---

## 📡 Step 5 — API Endpoints (פנימיים)

### `POST /api/voice/session`
**Purpose:** מנפיק WebSocket URL חתום (חד-פעמי, 15 דק' תוקף) להתחברות ישירה ל-ElevenLabs Conversational AI. שומר את ה-API key בצד שרת.

**Request:** `POST /api/voice/session` (body ריק)

**Response 200:**
```json
{ "signedUrl": "wss://api.elevenlabs.io/v1/convai/conversation?agent_id=...&signature=..." }
```

**Response 503:** המפתחות לא מוגדרים (להגדיר ב-Vercel)
**Response 429:** Rate limit (10/דקה ל-IP)

### `POST /api/voice/usage`
**Purpose:** קליטת דיווחי שימוש מהלקוח (backup לסטור הלוקאלי). הסטור המקומי הוא source of truth, זה נועד לאנליטיקה עתידית.

**Request:**
```json
{ "seconds": 5 }
```

**Response 200:**
```json
{ "ok": true, "seconds": 5 }
```

---

## 🎬 Step 6 — שדרוג ל-Higgsfield Videos (אופציונלי)

כרגע ה-`SharkAvatar` משתמש ב-WebP הקיימים שלך מ-`assets/webp/fin-*`.
לחוויה ברמה עולמית — להחליף ל-וידאו לופים שנוצרו ב-Higgsfield.

### תהליך (דרך Claude עם higgsfield MCP):
1. `mcp__claude_ai_higgsfield__generate_image` — frame ייחוס מבוסס `assets/IMAGES/finn/SHARK REFERENCE.png`
2. `mcp__claude_ai_higgsfield__generate_video` × 7 — לופים:
   - `idle` — נשימה רגועה
   - `listening` — עיניים מעורבות, פינים זזים
   - `talking-1`, `talking-2`, `talking-3` — תנועות פה
   - `thinking` — מהורהר
   - `empathic` — רכה
   - `victory` — חיוך גדול
3. אופטימיזציה: WebM 720p 30fps, ~600KB-1MB
4. שמירה ב-`assets/video/shark-*.webm`
5. ב-`SharkAvatar.tsx`, השב את `SOURCES` ל-imports של `expo-video` עם הלופים החדשים

עלות: ~70 credits ב-Higgsfield (לפי 10 per video).

---

## 🧪 Step 7 — בדיקות

### Web smoke test
```bash
npm run web
# → http://localhost:8081
# 1. נווט ל-/chat
# 2. לחץ על אייקון 📞 בכותרת
# 3. הענק הרשאת מיקרופון
# 4. דבר: "שלום שארק, איך לחסוך כסף?"
# 5. ודא שה-WebP משתנה ל-talking בזמן שהקול מתנגן
```

### Edge cases לבדיקה
- [ ] דחיית הרשאת מיקרופון → toast עברי, חזרה אוטומטית.
- [ ] משתמש Free → לחיצה על 📞 → ניווט ל-/pricing.
- [ ] משתמש Pro שעבר 10 דק' היום → CapExceededModal.
- [ ] רענון של הדף באמצע השיחה → session נסגר נקי.
- [ ] לחיצה על End Call → ניתוק WebSocket + שחרור מיקרופון.
- [ ] Mute → המיקרופון לא משדר עד שמבטלים Mute.

### TypeScript
```bash
npx tsc --noEmit
# מאמת שאין שגיאות חדשות
```

---

## 💰 עלויות צפויות

| רכיב | חישוב | חודשי משוער |
|---|---|---|
| ElevenLabs Conversational AI | $0.10/דקה × 10 דק' × 30 ימים × N משתמשי Pro | $30/Pro-user/חודש פעיל |
| Gemini 2.5 Flash | ~$0.075 per 1M input tokens | זניח (<$5/חודש לכל המשתמשים) |
| Higgsfield credits (חד-פעמי) | 70 credits | תלוי בתוכנית |
| Vercel functions | bundled עם ה-app | 0 |

**אסטרטגיית בקרת עלות:**
- 10 דק'/יום lock ב-`useSubscriptionStore.canUseSharkVoice()` (אכיפה גם בלקוח וגם ב-cap מתוך session timer).
- Rate limit של 10 sessions/דקה ב-`/api/voice/session` (מונע bot abuse).

---

## 🐛 Troubleshooting

### "Voice service not configured" (503)
→ `ELEVENLABS_API_KEY` או `ELEVENLABS_AGENT_ID` חסרים ב-Vercel.

### השארק לא עונה אבל ה-status נשאר "thinking"
→ בדוק ב-ElevenLabs Dashboard → Agent → Conversations → אם יש שגיאת LLM, כנראה `GOOGLE_AI_API_KEY` שגוי או quota מלא.

### הקול נשמע אנגלי/לא טבעי בעברית
→ ודא שב-Agent → Voice → **Liam** + Model = **Eleven v3**. הקולות הסטנדרטיים (Pre-v3) או מודלים English-only יישמעו אנגלית-עם-מבטא.

### Audio Worklet error בדפדפן
→ צריך HTTPS (לא HTTP). Vercel נותן את זה אוטומטית בפרודקשן, ב-localhost זה אמור לעבוד דרך WebSocket Secure.

---

## 📁 קבצים שנוצרו / שונו

**נוצרו:**
- `app/api/voice/session+api.ts`
- `app/api/voice/usage+api.ts`
- `app/api/ai/_prompts/sharkVoicePrompt.ts`
- `app/shark-voice.tsx`
- `src/features/shark-voice-chat/SharkVoiceCallScreen.tsx`
- `src/features/shark-voice-chat/useSharkVoiceStore.ts`
- `src/features/shark-voice-chat/hooks/useElevenLabsConversation.ts`
- `src/features/shark-voice-chat/hooks/useSharkAvatarState.ts`
- `src/features/shark-voice-chat/services/voiceSessionClient.ts`
- `src/features/shark-voice-chat/components/SharkAvatar.tsx`
- `src/features/shark-voice-chat/components/TranscriptOverlay.tsx`
- `src/features/shark-voice-chat/components/CallControls.tsx`
- `src/features/shark-voice-chat/components/CapExceededModal.tsx`

**עודכנו:**
- `src/features/subscription/useSubscriptionStore.ts` (gating + cap)
- `src/features/subscription/UpgradeModal.tsx` (copy)
- `src/features/monetization/monetizationNotificationCopy.ts` (copy)
- `src/features/chat/ChatScreen.tsx` (header phone button)
- `app.json` (mic permissions)
