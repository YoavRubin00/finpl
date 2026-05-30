export const meta = {
  name: 'qa-flow-audit',
  description: 'FinPlay QA audit — 5 specialist agents scan user flows for blockers, dead-ends, loops, and broken progression (onboarding, module progression, pearls, DNC, sheets). Each finding adversarially verified. Synthesizer ROI-ranks blockers vs nits.',
  whenToUse: 'Run when the user asks to verify flows ("האם המשתמש יכול להתקדם?", "יש לופים?", "תבדוק את ה-QA", "תבדוק זרימה"). Different from pre-release-audit: focuses on can-the-user-actually-use-it rather than release readiness.',
  phases: [
    { title: 'Map', detail: 'List the user flows to audit' },
    { title: 'Audit', detail: '5 parallel flow specialists hunt blockers' },
    { title: 'Verify', detail: 'Adversarial verify per finding (real? reproducible?)' },
    { title: 'Synthesize', detail: 'Rank confirmed blockers + nextStep' },
  ],
};

const FLOW_FINDING_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    flow: { type: 'string', description: 'Which flow this belongs to (e.g. "onboarding", "module", "pearl", "dnc", "loop")' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string', description: 'Short Hebrew title of the blocker/bug/loop' },
          severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
          kind: { type: 'string', enum: ['cant-progress', 'infinite-loop', 'dead-end', 'state-corruption', 'guard-deadlock', 'broken-callback', 'missing-route'] },
          file: { type: 'string', description: 'Relative path. "" if global' },
          line: { type: 'number', description: 'Line number. 0 if not applicable' },
          repro: { type: 'string', description: 'Hebrew, ≤40 words. Steps to reproduce' },
          fix: { type: 'string', description: 'Hebrew, ≤30 words. One-sentence fix recommendation' },
        },
        required: ['title', 'severity', 'kind', 'file', 'line', 'repro', 'fix'],
      },
    },
    summary: { type: 'string', description: 'Hebrew, ≤100 words. What this agent found' },
  },
  required: ['flow', 'findings', 'summary'],
};

const VERIFY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    isReal: { type: 'boolean', description: 'true = bug confirmed by reading the code, false = refuted' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    reasoning: { type: 'string', description: 'Hebrew, ≤80 words. Why confirmed or refuted, citing exact lines' },
  },
  required: ['isReal', 'confidence', 'reasoning'],
};

const REPORT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    verdict: { type: 'string', enum: ['healthy', 'has-issues', 'critical'] },
    blockerCount: { type: 'number' },
    majorCount: { type: 'number' },
    minorCount: { type: 'number' },
    topIssues: {
      type: 'array',
      maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          flow: { type: 'string' },
          file: { type: 'string' },
          severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
          repro: { type: 'string' },
          fix: { type: 'string' },
        },
        required: ['title', 'flow', 'file', 'severity', 'repro', 'fix'],
      },
    },
    rationale: { type: 'string', description: 'Hebrew, ≤150 words. Overall health of user flows' },
    nextStep: { type: 'string', description: 'Hebrew, ≤40 words. Concrete next action' },
  },
  required: ['verdict', 'blockerCount', 'majorCount', 'minorCount', 'topIssues', 'rationale', 'nextStep'],
};

const scope = (typeof args === 'string' && args.length > 0)
  ? args
  : 'Current dev branch. Default scope: src/features/onboarding, src/features/chapter-1-content/LessonFlowScreen.tsx, src/features/pyramid/DuoLearnScreen.tsx, src/features/pearls/, src/features/daily-news-challenge/, src/features/the-bridge/, app/(tabs)/, app/_layout.tsx, all *Store.ts files referenced.';

phase('Map');

const FLOWS = [
  {
    key: 'onboarding',
    label: 'flow:onboarding',
    prompt: `אתה QA specialist. תבדוק את **flow האונבורדינג** של FinPlay end-to-end.

Scope: ${scope}

תקראי קודם: src/features/onboarding/ProfilingFlow.tsx, src/features/onboarding/InModuleProfileQuestion.tsx, app/_layout.tsx (router gates), src/features/chapter-1-content/LessonFlowScreen.tsx (PROFILE_QUESTION_BACKSTOPS), src/store/useOnboardingStore.ts ו-useUserStore אם קיימים.

תחפש:
1. **Can't progress** — שלב שמשתמש יכול להגיע אליו בלי דרך לצאת. כפתור "המשך" disabled לנצח.
2. **Guard deadlock** — \`profileQuestionAskedRef.current = true\` שלא מאופס כשצריך. שדה שחייב להיות מלא אבל אין UI להזין אותו.
3. **Conditional dead-end** — אם user.knowledgeLevel === 'X' && learningTime === 'Y' → no module unlocks.
4. **Missing route** — נתיב router שמופיע ב-Linking/href אבל לא קיים ב-app/.
5. **Persisted bad state** — MMKV/AsyncStorage שמכיל ערך שמונע התקדמות גם אחרי reinstall (clearOnboarding לא קיים).

לכל ממצא: file:line + repro 3 צעדים + fix.

severity: blocker = משתמש לא יכול לסיים אונבורדינג. major = חוויה שבורה אבל אפשר להמשיך. minor = polish.

החזר ONLY structured object. Hebrew summary.`,
  },
  {
    key: 'module',
    label: 'flow:module-progression',
    prompt: `אתה QA specialist. תבדוק את **module progression flow** של FinPlay.

Scope: ${scope}

תקראי קודם: src/features/chapter-1-content/LessonFlowScreen.tsx (3000+ שורות, ה-core), src/features/pyramid/DuoLearnScreen.tsx, src/features/pyramid/usePyramidStore.ts, lessonsConfig/chaptersData (איפה שהמפה של הצ'אפטרים), goToNextSequentialModule logic.

תחפש:
1. **Lesson lock-in** — שיעור שמתחיל ואין דרך לסיים (כל התרגילים answeredAt אבל "המשך" לא מופיע).
2. **goToNextSequentialModule misroute** — מודולה X שצריכה ללכת ל-Y אבל הולכת ל-Z או ל-/(tabs) במקום ללסון הבא.
3. **Special-route regression** — mod-0-3 → bullshit interstitial, mod-0-4 → paywall, mod-1-9 → tower-defense. תוודא שכל אחד עובד.
4. **Stuck button** — TimelineOrderCard "בדוק" disabled stuck (היה באג כזה, בודק שלא חזר). InvestmentCard onContinue לא קורא. Any card שמסיים בלי onContinue/onComplete.
5. **Module unlock race** — completedModules נכתב אבל ה-Duolearn screen לא מציג מודולה חדשה כ-unlocked עד reload.
6. **Resume scroll math** — calcResumeScrollY עם NODE_SIZE/padding/pearl שלא תואם את ה-render בפועל (משתמש חוזר ולא רואה איפה הוא).

לכל ממצא: file:line + repro + fix.

severity: blocker = משתמש לא יכול לעבור מודולה. major = bypass-able אבל מבלבל. minor = polish.

החזר ONLY structured object. Hebrew summary.`,
  },
  {
    key: 'pearl',
    label: 'flow:pearl',
    prompt: `אתה QA specialist. תבדוק את **Pearl flow** של FinPlay (פיצ'ר חדש, גבוהה סיכון לבאגים).

Scope: ${scope}

תקראי קודם: src/features/pearls/PearlSheet.tsx, PearlGameStage.tsx, pearlConfig.ts, usePearlsStore.ts, stages/* (כל ה-stage components), ואיפה ש-DuoLearnScreen מציג ולוחץ פנינים.

תחפש:
1. **Stage pager stuck** — pager שלא עובר מ-stage X ל-stage X+1 כי onContinue לא נקרא. במיוחד FallbackContinueOnMount race (אם תוקן).
2. **Pearl complete לא יוצא** — pearl_completed event נורה אבל הסטור לא מעדכן completedIds → פנינה נשארת unlocked לעולמים.
3. **Auto-advance broken** — pearl completion אמורה לפתוח next module, בודק שזה קורה.
4. **Locked pearl interaction** — משתמש Free לוחץ על פנינה סגורה — צריך לפתוח paywall modal, לא להיתקע.
5. **Game card missing onComplete** — InvestmentCard / CrashGameCard / כל ה-mini-games — כל אחד צריך onContinue→handleStageDone path. תבדוק שכולם מחוברים.
6. **macro-event missing macroEventId** — pearl עם gameKey 'macro-event' בלי macroEventId → renderGameCard מחזיר null → user stuck.
7. **PearlSheet remount fires double-event** — אותה בעיה כמו DNC: useEffect שמסתמך על answered state ועושה re-fire על mount.

לכל ממצא: file:line + repro + fix.

severity: blocker = פנינה לא ניתנת לסיום. major = state inconsistent. minor = animation jank.

החזר ONLY structured object. Hebrew summary.`,
  },
  {
    key: 'dnc',
    label: 'flow:dnc-sheets',
    prompt: `אתה QA specialist. תבדוק את **Daily News Challenge + sheets/modals flow** של FinPlay.

Scope: ${scope}

תקראי קודם: src/features/daily-news-challenge/DailyNewsChallengeSheet.tsx, components/ChallengePage.tsx, useDailyNewsChallengeStore.ts, NewsIconButton (ב-DuoLearnScreen). גם: AppWalkthroughOverlay, UpgradeModal, BridgeScreen, paywall sheets.

תחפש:
1. **Sheet trap** — sheet שנפתח ואי אפשר לסגור (אין X, onDismiss broken, presentationStyle='fullScreen' בלי back).
2. **DNC double-fire** — news_challenge_completed שעולה כל mount של ה-sheet (כבר ידוע — תוודא שעדיין שם או תוקן).
3. **Modal stacking** — modal שפותח modal שפותח modal (Brawl Stars anti-pattern). תאתר שלוש שכבות+.
4. **NewsIconButton positioning** — האייקון רנדר אבל מחוץ למסך / מאחורי FAB / לא pressable (zIndex/position בעיה).
5. **Walkthrough loop** — appWalkthroughCompleted נכתב אבל walkthrough חוזר בכל פתיחה (storage key wrong, או isFirstLaunch logic broken).
6. **Bridge dead-end** — משתמש לוחץ Bridge CTA, פותח BridgeScreen, אבל אין דרך לחזור (back button missing, deep-link broken).
7. **Paywall trap** — paywall שנפתח ב-mod-0-4 ובלי close button → user is forced to upgrade or close app.

לכל ממצא: file:line + repro + fix.

severity: blocker = sheet trap או paywall trap. major = state חוזר. minor = animation.

החזר ONLY structured object. Hebrew summary.`,
  },
  {
    key: 'loop',
    label: 'loop-hunter',
    prompt: `אתה QA specialist מיוחד ל-**loop & deadlock hunting** ב-FinPlay.

Scope: ${scope}

תחפש דפוסים שיוצרים לולאה אינסופית או deadlock:

1. **useEffect infinite loop** — \`useEffect(() => setX(...), [x])\` או deps שמשתנים בכל render.
2. **navigate-to-self** — router.push למסך הנוכחי בלי guard (useFocusEffect → push current route).
3. **Ref deadlock** — \`if (askedRef.current) return; askedRef.current = true; <do thing that prevents reset>\` — שדרכו שדה לא מאופס לעולם.
4. **Async race in render** — setState ב-then של promise שמופעל מ-render, בלי isMountedRef.
5. **Zustand subscribe leak** — store.subscribe ב-useEffect בלי unsubscribe → leak + multi-fire.
6. **withRepeat/withTiming animation שלא נעצרת** — useReducedMotion ignored.
7. **setInterval/setTimeout בלי cleanup** — useEffect שלא מחזיר () => clearInterval.
8. **Recursion** — A calls B which calls A directly or via callback chain.
9. **Storage hydration loop** — onRehydrate triggers store update which triggers persist which triggers onRehydrate.
10. **Conditional render flicker** — A renders B based on X, B sets X back, A re-renders.

לכל ממצא: file:line + repro (איך מגיעים ללולאה) + fix.

severity: blocker = crash או user-visible freeze. major = perf hit / battery drain. minor = code smell.

החזר ONLY structured object. Hebrew summary.`,
  },
];

phase('Audit');

const audited = await pipeline(
  FLOWS,
  (flow) => agent(flow.prompt, { label: flow.label, schema: FLOW_FINDING_SCHEMA, phase: 'Audit' }),
  async (audit, flow) => {
    if (!audit || !audit.findings || audit.findings.length === 0) {
      return { flow: flow.key, summary: audit?.summary ?? '(no findings)', confirmed: [] };
    }
    const verified = await parallel(
      audit.findings.map((f) => () =>
        agent(
          `אתה adversarial verifier. תקבל ממצא QA ותחזיר isReal=true רק אם תוכל לאמת מהקוד עצמו (קריאת הקובץ ב-${f.file} סביב שורה ${f.line}).

הממצא:
${JSON.stringify(f, null, 2)}

החזר ONLY structured object. אם אתה לא בטוח — confidence: 'low' ו-isReal=true (recall-biased: עדיף false positive מ-false negative).
REFUTED רק אם תוכל לצטט שורה ספציפית שמראה שזה כבר טופל / לא יכול לקרות.`,
          { label: `verify:${f.title.slice(0, 24)}`, schema: VERIFY_SCHEMA, phase: 'Verify' }
        ).then((v) => ({ ...f, flow: flow.key, verdict: v }))
      )
    );
    const confirmed = verified.filter(Boolean).filter((f) => f.verdict?.isReal);
    return { flow: flow.key, summary: audit.summary, confirmed };
  }
);

const allConfirmed = audited.filter(Boolean).flatMap((a) => a.confirmed);

phase('Synthesize');

const report = await agent(
  `אתה QA lead. תסנתז את כל הממצאים המאומתים לדוח אחד.

ממצאים מאומתים (כולם isReal=true):
${JSON.stringify(allConfirmed, null, 2)}

סיכומים לפי flow:
${JSON.stringify(audited.filter(Boolean).map((a) => ({ flow: a.flow, summary: a.summary, confirmed_count: a.confirmed.length })), null, 2)}

חוקי החלטה:
- verdict: 'critical' אם blockerCount ≥ 1. 'has-issues' אם majorCount ≥ 1 בלי blockers. 'healthy' אם רק minor או 0 issues.
- topIssues: עד 5, prefer blocker > major > minor. בתוך אותה severity, prefer flows שעלולים להשפיע על user funnel (onboarding > module > pearl > dnc > loop generic).
- rationale: 150 מילים. סיכום אמיתי של מה עובד ומה לא. אם 0 issues — תגיד "healthy" בלי לחפש דברים שלא קיימים.
- nextStep: פקודה קונקרטית, לדוגמה "תקן את ה-blocker ב-LessonFlowScreen.tsx:2700, ואז commit ל-dev" או "מצב בריא — אפשר למזג ל-master".

החזר ONLY structured object.`,
  { label: 'synthesize', schema: REPORT_SCHEMA, phase: 'Synthesize' }
);

return {
  report,
  raw: {
    by_flow: audited,
    all_confirmed: allConfirmed,
  },
};
