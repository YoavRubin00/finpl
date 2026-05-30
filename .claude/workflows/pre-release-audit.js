export const meta = {
  name: 'pre-release-audit',
  description: 'FinPlay pre-release GO/NO-GO audit — 4 specialist agents (קפטן release, הסורק bugs, ארכיטקט cleanup, אודרי taste) audit dev branch in parallel, then a synthesizer merges findings into a single Hebrew verdict with top-3 fixes. Use before any merge dev → master or eas update.',
  whenToUse: 'Run before merging dev → master, before eas update, or any time the user asks for a release-readiness check ("מוכן לdeploy?", "GO/NO-GO?", "צריך לבדוק לפני שאני מעלה").',
  phases: [
    { title: 'Audit', detail: '4 specialists scan in parallel (~2-3 min)' },
    { title: 'Synthesize', detail: 'Merge into single GO/NO-GO call' },
  ],
};

const AUDIT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    verdict: { type: 'string', enum: ['GO', 'WARN', 'NO-GO'] },
    severity: { type: 'string', enum: ['P0', 'P1', 'P2', 'clean'], description: 'Highest severity found' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string', description: 'Short Hebrew title of the issue' },
          severity: { type: 'string', enum: ['P0', 'P1', 'P2'] },
          file: { type: 'string', description: 'Relative path, or "" if global' },
          line: { type: 'number', description: '0 if not applicable' },
          fix: { type: 'string', description: 'One-sentence Hebrew fix recommendation' },
        },
        required: ['title', 'severity', 'file', 'line', 'fix'],
      },
    },
    summary: { type: 'string', description: 'Hebrew, ≤120 words, what this agent found' },
  },
  required: ['verdict', 'severity', 'findings', 'summary'],
};

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    verdict: { type: 'string', enum: ['GO', 'WARN', 'NO-GO'] },
    rationale: { type: 'string', description: 'Hebrew, ≤150 words explaining the verdict' },
    p0Count: { type: 'number' },
    p1Count: { type: 'number' },
    p2Count: { type: 'number' },
    top3Fixes: {
      type: 'array',
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          file: { type: 'string' },
          severity: { type: 'string', enum: ['P0', 'P1', 'P2'] },
          why: { type: 'string', description: 'Hebrew, ≤30 words' },
        },
        required: ['title', 'file', 'severity', 'why'],
      },
    },
    blockers: {
      type: 'array',
      items: { type: 'string', description: 'Hebrew, one P0 issue per item — empty array if none' },
    },
    nextStep: { type: 'string', description: 'Hebrew, ≤40 words — what to do right now' },
  },
  required: ['verdict', 'rationale', 'p0Count', 'p1Count', 'p2Count', 'top3Fixes', 'blockers', 'nextStep'],
};

const scope = (typeof args === 'string' && args.length > 0)
  ? args
  : 'Current dev branch state — uncommitted + recent commits since master. Default scope: src/, app/, api/, vercel.json, app.json, eas.json.';

phase('Audit');

const audits = await parallel([
  () => agent(`You are קפטן (Release Manager). Audit FinPlay for release readiness.

Scope: ${scope}

Hard checks (run these):
1. \`npx tsc --noEmit\` — count error lines that AREN'T in skills/. Report file paths of new errors only (compare to baseline).
2. Verify vercel.json — crons defined for /api/breaking-news/cron, /api/daily-news-challenge/cron, /api/email/send-daily.
3. Check app.json has: name, slug, version, icon, android.package, ios.bundleIdentifier, splash.image.
4. Search src/ for "AIza|sk-|EXPO_PUBLIC.*KEY" not gated through process.env — leaked secrets = P0.
5. Confirm assets/IMAGES/icon-1024.png exists.
6. Check eas.json has "production" profile.

Severity rules:
- P0: leaked secret, missing required app.json field, broken require() in assets, missing production cron.
- P1: TypeScript errors in committed JS/TS (not pre-existing), missing OTA-relevant config.
- P2: lint warnings, missing optional config.

Return ONLY the structured object. Hebrew summary.`, { label: 'קפטן', schema: AUDIT_SCHEMA, phase: 'Audit' }),

  () => agent(`You are הסורק (Bug Hunter). Hunt bugs in FinPlay.

Scope: ${scope}

Hard checks:
1. \`grep -r ": any\\|as any\\|<any>" src/\` — every "any" is potentially a runtime bug.
2. \`grep -r "console\\.\\(log\\|warn\\)" src/\` — committed console.log violates CLAUDE.md.
3. Search for useEffect with setInterval/setTimeout without cleanup return.
4. Search for require() calls where the target file might not exist (broken asset references).
5. Look for race conditions: ref.current set without guard, async state writes without isMounted check.
6. Search for "// TODO" / "// FIXME" / "// HACK" — unfinished work.
7. Check zustand stores for missing partialize that could leak ephemeral state to persist.

Severity rules:
- P0: runtime crash potential (broken require, null deref, unhandled async throw in render path).
- P1: data corruption potential (race conditions, stale state writes, persist of ephemeral state).
- P2: code smell (any types, console.log, missing cleanup).

Return ONLY the structured object. Hebrew summary.`, { label: 'הסורק', schema: AUDIT_SCHEMA, phase: 'Audit' }),

  () => agent(`You are ארכיטקט (Architect). Audit code architecture + perf in FinPlay.

Scope: ${scope}

Hard checks:
1. \`find src -name "*.tsx" -exec wc -l {} + | sort -rn | head -10\` — flag files >2000 lines as P1 god-components.
2. Search for duplicated style patterns (StyleSheet.create with similar keys across 3+ files).
3. FlatList without keyExtractor, getItemLayout, or memoized renderItem → P1.
4. Look for circular dependencies: pearls ↔ daily-challenges, *Store ↔ *Screen, etc.
5. Dead exports — exports in feature dirs that no other file imports (focus on recently-changed dirs).
6. Barrel index.ts re-exports (banned per CLAUDE.md, except simulations/).
7. Heavy synchronous computation in render bodies (Date.now, Math.random in loops, JSON.parse of large blobs).

Severity rules:
- P0: circular dep that breaks bundling, dead export of public API.
- P1: god-component >2000 lines, missing perf optimization in hot path.
- P2: style duplication, dead code, missing memoization.

Return ONLY the structured object. Hebrew summary.`, { label: 'ארכיטקט', schema: AUDIT_SCHEMA, phase: 'Audit' }),

  () => agent(`You are אודרי 🌹 (Taste & Restraint). Audit user-facing copy + feature restraint in FinPlay.

Scope: ${scope}

Hard checks:
1. Search for AI-generic Hebrew copy: "התחילו את המסע", "שפרו את העתיד", "למדו לנהל" — flag for rewrite.
2. Search for hype/casino lines: "כסף קל", "השקעה בטוחה", "שיטה סודית", "הזדמנות מטורפת" — P0.
3. Push notification titles + bodies — emoji creep (>1 emoji per title) breaks CALM theme.
4. Paywalls/upsells — language that creates shame/FOMO instead of value.
5. Streak/hearts/rewards — mechanics that feel like punishment, not invitation.
6. AI personalization — check that emotional state (anxious/impulsive) is NEVER a monetization vector (P0 if found).
7. Feature creep — features that distract from core learning loop without clear payoff.

Severity rules:
- P0: monetization-of-vulnerability, false promises, dark patterns.
- P1: AI-generic copy that erodes brand voice, emoji creep, salesy paywalls.
- P2: minor copy polish, restraint nudges.

Return ONLY the structured object. Hebrew summary.`, { label: 'אודרי', schema: AUDIT_SCHEMA, phase: 'Audit' }),
]);

const [release, bugs, architecture, taste] = audits;

phase('Synthesize');

const verdict = await agent(`Synthesize 4 audits into one Hebrew GO/NO-GO call for the user.

קפטן (release): ${JSON.stringify(release ?? { verdict: 'GO', severity: 'clean', findings: [], summary: '(no result)' })}

הסורק (bugs): ${JSON.stringify(bugs ?? { verdict: 'GO', severity: 'clean', findings: [], summary: '(no result)' })}

ארכיטקט (architecture): ${JSON.stringify(architecture ?? { verdict: 'GO', severity: 'clean', findings: [], summary: '(no result)' })}

אודרי (taste): ${JSON.stringify(taste ?? { verdict: 'GO', severity: 'clean', findings: [], summary: '(no result)' })}

Decision rules:
- NO-GO if ANY agent reports P0 in findings.
- WARN if no P0 but at least one P1.
- GO if all findings are P2 or clean.

Top-3 fixes: pick the 3 most impactful items across ALL audits (prefer P0 > P1 > P2; if tied, prefer fixes with shortest distance-to-merge).

Blockers array: list each P0 as one short Hebrew sentence ready to paste into a release-blocker checklist. Empty if no P0.

nextStep: literal command the user should run next, e.g. "תקן 2 P0 ב-vercel.json + push misroute, ואז commit" or "GO לmerge dev → master, אישור מפורש דרוש".

Return ONLY the structured object.`, { label: 'sync', phase: 'Synthesize', schema: VERDICT_SCHEMA });

return {
  verdict,
  raw: {
    קפטן: release,
    הסורק: bugs,
    ארכיטקט: architecture,
    אודרי: taste,
  },
};
