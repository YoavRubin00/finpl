// scripts/vercel-dev-local.mjs
// Launches `vercel dev` for local API testing with TS_NODE_SKIP_PROJECT set.
//
// Why: vercel dev's bundled ts-node crashes while resolving the project's
// tsconfig `extends: "expo/tsconfig.base"` against TypeScript 5.9
// ("TypeError: state.conditions.includes is not a function"). The api/*.ts
// functions then never compile and every request 502s (which surfaces in the
// browser as a misleading CORS error). Skipping the project tsconfig makes
// ts-node use its own defaults, which compile the API fine. This only affects
// `vercel dev`; the Vercel cloud builder uses a different path, so prod is
// unchanged.
//
// Setting the var in .env.local does NOT work — vercel injects that into the
// function runtime, but ts-node's `register` reads the var from the vercel dev
// PROCESS env at startup. So it must be set here, on this process.
import { spawn } from 'node:child_process';

process.env.TS_NODE_SKIP_PROJECT = 'true';

const port = process.env.LOCAL_API_PORT || '5050';

const child = spawn('vercel', ['dev', '--listen', port], {
  stdio: 'inherit',
  env: process.env,
  shell: true,
});

child.on('exit', (code) => process.exit(code ?? 0));
