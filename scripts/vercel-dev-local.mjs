// scripts/vercel-dev-local.mjs
// Launches `vercel dev` for local API testing. Handles two vercel-dev quirks:
//
// 1. ts-node crash: vercel dev's bundled ts-node crashes while resolving the
//    project's tsconfig `extends: "expo/tsconfig.base"` against TypeScript 5.9
//    ("TypeError: state.conditions.includes is not a function"). The api/*.ts
//    functions then never compile and every request 502s (which surfaces in the
//    browser as a misleading CORS error). TS_NODE_SKIP_PROJECT makes ts-node use
//    its own defaults, which compile the API fine. Must be set on THIS process —
//    setting it in .env.local doesn't work, because ts-node's `register` reads it
//    from the vercel dev process env at startup, not from the function runtime.
//
// 2. Missing DATABASE_URL: vercel dev pulls most env from the linked Vercel cloud
//    project (Development env), but the test-branch DATABASE_URL lives only in
//    .env.local. DB-touching functions then 500 with "No database connection
//    string was provided to neon()". We load .env.local into this process env so
//    the functions inherit it — and so the LOCAL test-branch DB always wins over
//    anything pulled from the cloud (prevents accidentally hitting prod locally).
//
// Both fixes only affect `vercel dev`; the Vercel cloud builder uses a different
// path, so prod is unchanged.
import { spawn } from 'node:child_process';
import fs from 'node:fs';

process.env.TS_NODE_SKIP_PROJECT = 'true';

// Load .env.local into this process's env (KEY=VALUE, optional quotes, skip
// comments/blanks). Values here take precedence so the local test branch wins.
try {
  const raw = fs.readFileSync('.env.local', 'utf8');
  for (const line of raw.split('\n')) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim());
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
} catch {
  // No .env.local — dev-local.mjs already validates this and fails earlier.
}

const port = process.env.LOCAL_API_PORT || '5050';

const child = spawn('vercel', ['dev', '--listen', port], {
  stdio: 'inherit',
  env: process.env,
  shell: true,
});

child.on('exit', (code) => process.exit(code ?? 0));
