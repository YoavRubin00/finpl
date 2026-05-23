// scripts/dev-phone.mjs
// Runs the local API in the BACKGROUND (output to a temp log file) and
// `expo start --dev-client` in the FOREGROUND so its QR code and interactive
// menu render in a real TTY.
//
// Why not concurrently: concurrently pipes each child's stdout, so Expo sees a
// non-TTY (process.stdout.isTTY === false) and skips the QR code + key menu
// entirely. Giving Expo the inherited terminal (stdio: 'inherit') is what makes
// the barcode show up and the `r`/`m`/`j` keys work.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const isWin = process.platform === 'win32';
const logPath = path.join(os.tmpdir(), 'finpl-vercel-dev.log');
const logFd = fs.openSync(logPath, 'w');

console.log('\n────────────────────────────────────────────');
console.log('[dev:phone] Local API → background. Logs: ' + logPath);
console.log('[dev:phone] Expo starts below — scan the QR with your phone.');
console.log('            (open the FinPlay dev build, or iOS Camera → dev build)');
console.log('            Phone + PC must be on the same Wi-Fi.');
console.log('────────────────────────────────────────────\n');

// API: detached-style, output redirected to the log file so it never garbles
// Expo's QR redraw in the terminal.
const api = spawn(process.execPath, ['scripts/vercel-dev-local.mjs'], {
  stdio: ['ignore', logFd, logFd],
  env: process.env,
});

// Expo: foreground, inherits this terminal's TTY → QR + interactive keys work.
const app = spawn('npx', ['expo', 'start', '--dev-client'], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

function killApi() {
  try {
    if (isWin) {
      // Kill the whole vercel-dev process tree on Windows.
      spawn('taskkill', ['/pid', String(api.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      api.kill('SIGTERM');
    }
  } catch {
    /* already gone */
  }
}

app.on('exit', (code) => {
  killApi();
  process.exit(code ?? 0);
});
process.on('SIGINT', () => { killApi(); process.exit(0); });
process.on('SIGTERM', () => { killApi(); process.exit(0); });
