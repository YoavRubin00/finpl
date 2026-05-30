export const meta = {
  name: 'code-efficiency-audit',
  description: 'FinPlay code efficiency audit — 6 ארכיטקט specialists scan in parallel for render-perf / bundle / async / data-fetch / DB / dead-code issues, each finding is adversarially verified (real? worth it?), and a synthesizer ROI-ranks the survivors into Quick Wins + Strategic Refactors. Use for periodic perf cleanup or before high-load releases.',
  whenToUse: 'When the user asks for a code efficiency audit, perf cleanup, dead-code sweep, or any variant of "אפליקציה איטית / קוד מנופח / יש מה לנקות?".',
  phases: [
    { title: 'Scout', detail: 'Map hot files + recent changes + DB schema (1 agent)' },
    { title: 'Audit', detail: '6 ארכיטקט specialists scan dimensions in parallel' },
    { title: 'Verify', detail: 'Each finding adversarially vetted — real? worth the effort?' },
    { title: 'Synthesize', detail: 'ROI-rank into Quick Wins + Strategic Refactors + Defer pile' },
  ],
};

/* ───────────────── Schemas ───────────────── */

const SCOUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    hotFiles: {
      type: 'array',
      maxItems: 15,
      description: 'Files changed recently OR >1000 lines — likely contains efficiency wins',
      items: { type: 'string' },
    },
    hotFeatures: {
      type: 'array',
      maxItems: 10,
      description: 'Feature directories with the most code/change volume (relative paths)',
      items: { type: 'string' },
    },
    dbTables: {
      type: 'array',
      description: 'Tables in src/db/schema.ts — DB specialist will target these',
      items: { type: 'string' },
    },
    summary: { type: 'string', description: 'Hebrew, ≤80 words — what surfaces are in scope' },
  },
  required: ['hotFiles', 'hotFeatures', 'dbTables', 'summary'],
};

const AUDIT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    dimension: { type: 'string', description: 'Which efficiency dimension this audit covered' },
    findings: {
      type: 'array',
      maxItems: 12,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string', description: 'Stable short id like "render-001"' },
          title: { type: 'string', description: 'Hebrew title, ≤12 words' },
          file: { type: 'string', description: 'Relative path; "" if global/cross-cutting' },
          line: { type: 'number', description: '0 if N/A' },
          evidence: { type: 'string', description: 'English, ≤50 words — what you saw (code snippet / grep output / file size)' },
          impact: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Runtime/UX impact if fixed' },
          effort: { type: 'string', enum: ['xs', 's', 'm', 'l'], description: 'xs=<10min, s=<1hr, m=<4hr, l=multi-session' },
          fix: { type: 'string', description: 'Hebrew, one concrete sentence describing the change' },
        },
        required: ['id', 'title', 'file', 'line', 'evidence', 'impact', 'effort', 'fix'],
      },
    },
    summary: { type: 'string', description: 'Hebrew, ≤100 words — top 3 patterns this specialist found' },
  },
  required: ['dimension', 'findings', 'summary'],
};

const VERIFY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    isReal: { type: 'boolean', description: 'After re-reading the code: does the inefficiency actually exist?' },
    isWorthIt: { type: 'boolean', description: 'Is the fix worth the effort given impact+effort? Default false if uncertain.' },
    refinedImpact: { type: 'string', enum: ['high', 'medium', 'low'] },
    refinedEffort: { type: 'string', enum: ['xs', 's', 'm', 'l'] },
    refinedFix: { type: 'string', description: 'Hebrew sentence; sharper than the original if you can do better' },
    rationale: { type: 'string', description: 'Hebrew, ≤40 words — why isReal/isWorthIt got their values' },
  },
  required: ['isReal', 'isWorthIt', 'refinedImpact', 'refinedEffort', 'refinedFix', 'rationale'],
};

const SYNTH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    quickWins: {
      type: 'array',
      maxItems: 10,
      description: 'High ROI (impact≥medium AND effort≤s). Sorted by impact desc.',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          file: { type: 'string' },
          impact: { type: 'string', enum: ['high', 'medium', 'low'] },
          effort: { type: 'string', enum: ['xs', 's', 'm', 'l'] },
          fix: { type: 'string' },
        },
        required: ['title', 'file', 'impact', 'effort', 'fix'],
      },
    },
    strategicRefactors: {
      type: 'array',
      maxItems: 5,
      description: 'High impact AND effort≥m — multi-session work but moves the needle',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          area: { type: 'string', description: 'Feature/dir affected' },
          impact: { type: 'string', enum: ['high', 'medium'] },
          effort: { type: 'string', enum: ['m', 'l'] },
          plan: { type: 'string', description: 'Hebrew, ≤60 words — staged plan' },
        },
        required: ['title', 'area', 'impact', 'effort', 'plan'],
      },
    },
    deferPile: {
      type: 'array',
      maxItems: 15,
      description: 'Acknowledged but not worth doing now (low impact OR refuted by verifier). One-line entries.',
      items: { type: 'string' },
    },
    headline: { type: 'string', description: 'Hebrew, ≤30 words — the one sentence the user should remember' },
    nextStep: { type: 'string', description: 'Hebrew, literal command/action to take RIGHT NOW (e.g., "תקן את ה-3 quick wins הראשונים בקומיט אחד")' },
  },
  required: ['quickWins', 'strategicRefactors', 'deferPile', 'headline', 'nextStep'],
};

/* ───────────────── Phase 1: Scout ───────────────── */

const scope = (typeof args === 'string' && args.length > 0)
  ? args
  : 'Full src/ + app/ + api/ + src/db/schema.ts on the current branch';

phase('Scout');

const scout = await agent(`You are ארכיטקט (scout pass). Map the codebase so specialists can target the right surfaces. Scope: ${scope}

Run these commands and report what you find:

1. Largest files (likely contain efficiency wins or god-components):
   \`find src app api -name "*.tsx" -o -name "*.ts" 2>/dev/null | xargs wc -l 2>/dev/null | sort -rn | head -20\`

2. Recently changed files (last 30 commits):
   \`git log --name-only --pretty=format: -n 30 | sort -u | grep -E "^(src|app|api)/" | head -30\`

3. Feature directories by code volume:
   \`du -k src/features/* | sort -rn | head -15\` (or equivalent via find/wc)

4. DB schema tables (open src/db/schema.ts and list every \`pgTable("...")\` name).

5. Hottest dependencies in package.json — list any package that is BOTH (a) in dependencies (not devDependencies) AND (b) commonly heavy: lottie-react-native, react-native-reanimated, lodash, moment, charts/svg libs.

Return ONLY the structured object. Hebrew summary.`, { schema: SCOUT_SCHEMA, phase: 'Scout' });

/* ───────────────── Phase 2: 6 ארכיטקט specialists ───────────────── */

phase('Audit');

const scoutContext = JSON.stringify(scout ?? {});

const SPECIALISTS = [
  {
    dim: 'render-perf',
    label: 'ארכיטקט·render',
    prompt: `You are ארכיטקט (render-perf lens). Find React render inefficiencies.

Scout report: ${scoutContext}

Target the hotFiles + hotFeatures FIRST. Hard checks:
1. Inline arrow functions / object literals in JSX props that defeat memoization.
2. useEffect with object/array deps that change every render.
3. Components >500 lines without React.memo where parent re-renders often.
4. FlatList without keyExtractor, getItemLayout, memoized renderItem.
5. Zustand selectors that return new objects every read (no shallow comparator).
6. Reanimated useSharedValue setup in render body (not in useEffect).
7. Heavy computation in render (Date.now in map, big JSON.parse, regex compile).

For each finding: cite file:line, give a 1-line evidence snippet, mark impact (visible jank? cold-start slowdown?), effort (xs–l), and one-sentence Hebrew fix.

Return ONLY the structured object. Hebrew summary.`,
  },
  {
    dim: 'bundle-weight',
    label: 'ארכיטקט·bundle',
    prompt: `You are ארכיטקט (bundle-weight lens). Find bundle bloat.

Scout report: ${scoutContext}

Hard checks:
1. \`grep -rn "import .* from ['\\\"]lodash['\\\"]" src/ app/\` — should be lodash/<fn> tree-shaken imports.
2. \`grep -rn "import .* from ['\\\"]moment['\\\"]" src/ app/\` — moment is a fat dep, replace with date-fns or Intl.DateTimeFormat.
3. \`grep -rn "import \\* as " src/ app/\` — star imports defeat tree-shaking.
4. Large in-source JSON/data blobs (>2000 lines, e.g., feedData, premiumLearningData). Should be split or lazy-loaded.
5. \`grep -rn "require(['\\\"].*\\.json['\\\"])" src/ app/\` — eager JSON requires.
6. Duplicate or competing libs (e.g., both react-native-svg and react-native-svg-charts; both Lottie + bodymovin).
7. \`assets/lottie/\` files >300KB — animations that should be Skia or static.

For each finding: cite file:line (or path), evidence (size, import count, etc.), impact (cold-start ms / APK KB), effort, Hebrew fix.

Return ONLY the structured object. Hebrew summary.`,
  },
  {
    dim: 'async-patterns',
    label: 'ארכיטקט·async',
    prompt: `You are ארכיטקט (async-patterns lens). Find sequential awaits and missing concurrency.

Scout report: ${scoutContext}

Hard checks:
1. Two or more consecutive \`await\` calls where the second doesn't depend on the first's result — should be \`Promise.all\`.
2. \`for...of\` loops with \`await\` inside (sequential when could be parallel).
3. fetch() calls without AbortController / cleanup on unmount (leaked requests).
4. useEffect with async work that doesn't bail on unmount (no \`cancelled\` flag).
5. \`setTimeout\` or \`setInterval\` without cleanup return.
6. Sequential setState calls (should batch).
7. Heavy work in component constructor / module-load time that should be deferred.

For each finding: cite file:line, show the offending pattern, impact (latency / leak), effort, Hebrew fix.

Return ONLY the structured object. Hebrew summary.`,
  },
  {
    dim: 'data-fetching',
    label: 'ארכיטקט·query',
    prompt: `You are ארכיטקט (data-fetching lens). Find React Query and cache inefficiencies.

Scout report: ${scoutContext}

Hard checks:
1. \`useQuery\` calls without \`staleTime\` set — defaults to 0, refetches every mount.
2. Duplicate query keys across files (same data fetched twice with different keys).
3. Missing \`enabled\` guards — queries firing while their args are still null.
4. \`queryClient.invalidateQueries\` with overly broad keys (invalidates more than needed).
5. Missing \`prefetchQuery\` opportunities on screens with predictable navigation targets.
6. \`fetch\` calls in components that should be \`useQuery\` (no caching, refetch every render).
7. Mutations without optimistic updates where UI clearly waits (>200ms).
8. Suspense boundaries missing where loading flicker is visible.

For each finding: cite file:line, evidence (the useQuery signature or the raw fetch), impact, effort, Hebrew fix.

Return ONLY the structured object. Hebrew summary.`,
  },
  {
    dim: 'db-queries',
    label: 'ארכיטקט·db',
    prompt: `You are ארכיטקט (DB lens). Audit Neon/Drizzle query efficiency.

Scout report: ${scoutContext}

Tables: ${JSON.stringify(scout?.dbTables ?? [])}

Hard checks:
1. \`api/\` and \`app/api/\` handlers — look for N+1 patterns: a SELECT followed by a loop that does another SELECT per row.
2. Drizzle queries doing \`SELECT *\` (no .select() projection) on wide tables — wasted bandwidth.
3. Missing \`.limit()\` on queries that could return unbounded rows.
4. Indices: scan src/db/schema.ts — every column used in WHERE/ORDER BY should be indexed. Flag tables with high write volume + many indices (slow writes).
5. Repeated identical queries in the same handler (should be memoized within request).
6. Queries inside loops or .map() — sequential round-trips.
7. \`mcp__Neon__list_slow_queries\` if accessible — top 5 slow queries become findings.

For each finding: cite file:line, evidence (query snippet), impact (ms/query, requests/min), effort, Hebrew fix.

Return ONLY the structured object. Hebrew summary.`,
  },
  {
    dim: 'dead-and-duplicate',
    label: 'ארכיטקט·dead',
    prompt: `You are ארכיטקט (dead code + duplication lens). Find orphan exports and copy-paste.

Scout report: ${scoutContext}

Hard checks:
1. \`grep -rn "^export "\` against actual import statements — exports nobody imports = dead.
2. Files in src/features/* that no other file imports (orphan features). Use Grep to verify.
3. Two or more files containing nearly identical functions (date formatters, currency formatters, validation helpers). The signal: ≥10 consecutive duplicate lines.
4. \`StyleSheet.create\` blocks with identical key+value pairs across 3+ files.
5. \`useEffect\` patterns that repeat verbatim — candidates for a shared custom hook.
6. \`progress*.txt\`, \`PRD*.md\` files older than 60 days in src/features/* — likely cruft.
7. Multiple zustand stores with overlapping state slices (e.g., two stores tracking "isPro").

For each finding: cite file:line (or list of duplicate file paths), evidence (the duplicate snippet or "no importers found"), impact (mostly low for dead code, medium for active duplicates), effort, Hebrew fix.

Return ONLY the structured object. Hebrew summary.`,
  },
];

const audits = await parallel(
  SPECIALISTS.map((s) => () =>
    agent(s.prompt, { label: s.label, phase: 'Audit', schema: AUDIT_SCHEMA }).then((res) => ({
      ...s,
      result: res,
    })),
  ),
);

/* ───────────────── Phase 3: Adversarial verify per finding ───────────────── */

phase('Verify');

const allFindings = (audits ?? [])
  .filter(Boolean)
  .flatMap((a) =>
    (a?.result?.findings ?? []).map((f) => ({ ...f, _dim: a.dim })),
  );

log(`Verifying ${allFindings.length} findings across ${audits.filter(Boolean).length} dimensions…`);

const verified = await parallel(
  allFindings.map((f) => () =>
    agent(`You are ארכיטקט (verifier — adversarial). Independently re-read the code and decide if this finding is REAL and WORTH FIXING.

Dimension: ${f._dim}
Title: ${f.title}
File: ${f.file}${f.line ? `:${f.line}` : ''}
Original evidence: ${f.evidence}
Proposed fix: ${f.fix}
Original impact/effort: ${f.impact} / ${f.effort}

YOUR JOB:
1. Open the file (if a path is given). Re-read at least 30 lines around the cited line.
2. Decide isReal: does the inefficiency actually exist as described? Default false if you can't confirm.
3. Decide isWorthIt: given the impact/effort, would a senior eng prioritize this in their next session? Default false if uncertain.
4. Refine the impact + effort — you may downgrade. Only upgrade if you found additional evidence.
5. Sharpen the fix sentence (Hebrew) if you can do better.

Be skeptical. False positives are worse than missed findings — we'd rather show the user 5 real wins than 20 maybes. Return ONLY the structured object.`, {
      label: `verify:${f._dim}/${f.id}`,
      phase: 'Verify',
      schema: VERIFY_SCHEMA,
    }).then((v) => ({ ...f, _verify: v })),
  ),
);

const survivors = verified
  .filter(Boolean)
  .filter((f) => f._verify?.isReal && f._verify?.isWorthIt)
  .map((f) => ({
    ...f,
    impact: f._verify?.refinedImpact ?? f.impact,
    effort: f._verify?.refinedEffort ?? f.effort,
    fix: f._verify?.refinedFix ?? f.fix,
  }));

const refuted = verified
  .filter(Boolean)
  .filter((f) => !f._verify?.isReal || !f._verify?.isWorthIt)
  .map((f) => `${f.title} (${f.file}) — ${f._verify?.rationale ?? 'rejected by verifier'}`);

log(`Survivors: ${survivors.length} real wins · Refuted/deferred: ${refuted.length}`);

/* ───────────────── Phase 4: Synthesize ───────────────── */

phase('Synthesize');

const synth = await agent(`Synthesize verified findings into a Hebrew ROI-ranked action plan for the user.

SURVIVORS (verified real & worth-it):
${JSON.stringify(survivors, null, 2)}

REFUTED / DEFERRED (verifier rejected — list as-is, do not include in quickWins/strategicRefactors):
${JSON.stringify(refuted)}

Rules:
- quickWins: any survivor with impact≥medium AND effort∈{xs,s}. Sort impact desc, then effort asc.
- strategicRefactors: any survivor with impact=high AND effort∈{m,l}. Max 5. Write a staged plan for each.
- Survivors that don't fit either bucket: append to deferPile with a brief reason.
- deferPile: also include all refuted items verbatim.
- headline: the ONE sentence the user should remember (e.g., "10 quick wins ≈3 שעות עבודה, חוסכים ~40% מזמן boot ו-200KB מה-APK").
- nextStep: a literal action ready to copy (e.g., "תקבל את 3 ה-quick wins הראשונים, commit אחד, ואחרי שזה עובד נחזור לסטרטגיים").

Return ONLY the structured object.`, {
  label: 'synthesize',
  phase: 'Synthesize',
  schema: SYNTH_SCHEMA,
});

return {
  synth,
  scout,
  raw: {
    audits,
    surviving_count: survivors.length,
    refuted_count: refuted.length,
  },
};
