/**
 * One-off script — send the June 2026 legal-update notice to every registered
 * user in Supabase via Resend.
 *
 * Usage (from repo root):
 *   pnpm tsx ops/legal-update-2026-06/send-emails.ts --dry-run
 *   pnpm tsx ops/legal-update-2026-06/send-emails.ts --send
 *
 * Env vars required:
 *   SUPABASE_URL              — your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — service-role key (NOT anon!) for admin.listUsers
 *   RESEND_API_KEY            — from https://resend.com/api-keys
 *   RESEND_FROM_EMAIL         — e.g. "FinPlay <noreply@finplay.me>" (domain must be verified)
 *
 * Output:
 *   ./sent-log.csv — per-recipient send log (email, status, message_id, ts)
 *
 * NOT bundled into the app. Tsx-runnable Node script — operations only.
 */
import { readFileSync, appendFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Config ────────────────────────────────────────────────────────────────
const SUBJECT_HE = 'עדכנו את התנאים המשפטיים של FinPlay — מה שצריך לדעת';
const BATCH_SIZE = 50;
const DELAY_BETWEEN_BATCHES_MS = 1200;

// ── Setup ─────────────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = join(__dirname, 'email-template.html');
const LOG_PATH = join(__dirname, 'sent-log.csv');

const mode: 'dry-run' | 'send' = process.argv.includes('--send') ? 'send' : 'dry-run';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? '';
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'FinPlay <noreply@finplay.me>';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.');
  process.exit(1);
}
if (mode === 'send' && !RESEND_API_KEY) {
  console.error('Missing RESEND_API_KEY in env (required for --send mode).');
  process.exit(1);
}

// ── Types ─────────────────────────────────────────────────────────────────
interface SupabaseUser {
  id: string;
  email: string | null;
  user_metadata: { full_name?: string; displayName?: string };
}

interface ResendResponse {
  id?: string;
  message?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────
function firstName(name: string | undefined): string {
  if (!name) return 'חבר/ה יקר/ה';
  const trimmed = name.trim().split(/\s+/)[0];
  return trimmed.length > 0 ? trimmed : 'חבר/ה יקר/ה';
}

function renderEmail(template: string, params: { firstName: string; unsubscribeUrl: string }): string {
  return template
    .split('{{FIRST_NAME}}').join(params.firstName)
    .split('{{UNSUBSCRIBE_URL}}').join(params.unsubscribeUrl);
}

async function fetchAllUsers(): Promise<SupabaseUser[]> {
  const all: SupabaseUser[] = [];
  let page = 1;
  const perPage = 200;
  // Supabase admin endpoint — service role required
  while (true) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=${perPage}`, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
    if (!res.ok) {
      throw new Error(`Supabase admin/users failed: ${res.status} ${await res.text()}`);
    }
    const json = (await res.json()) as { users: SupabaseUser[] };
    if (!Array.isArray(json.users) || json.users.length === 0) break;
    all.push(...json.users);
    if (json.users.length < perPage) break;
    page++;
  }
  return all;
}

async function sendViaResend(to: string, html: string): Promise<ResendResponse> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to,
      subject: SUBJECT_HE,
      html,
    }),
  });
  const json = (await res.json()) as ResendResponse;
  if (!res.ok) {
    return { message: json.message ?? `HTTP ${res.status}` };
  }
  return json;
}

function ensureLogHeader(): void {
  if (!existsSync(LOG_PATH)) {
    writeFileSync(LOG_PATH, 'timestamp,email,status,message_id_or_error\n');
  }
}

function appendLog(email: string, status: 'sent' | 'failed' | 'dry', detail: string): void {
  const safeDetail = detail.split(',').join(';');
  const line = [new Date().toISOString(), email, status, safeDetail].join(',') + '\n';
  appendFileSync(LOG_PATH, line);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log(`Mode: ${mode === 'send' ? 'SEND (real emails)' : 'DRY RUN (no emails)'}`);

  const template = readFileSync(TEMPLATE_PATH, 'utf-8');
  console.log(`Loaded template (${template.length} chars)`);

  console.log('Fetching users from Supabase...');
  const users = await fetchAllUsers();
  const recipients = users.filter((u): u is SupabaseUser & { email: string } => !!u.email);
  console.log(`Found ${users.length} total users, ${recipients.length} with email.`);

  ensureLogHeader();

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} recipients)...`);

    await Promise.all(
      batch.map(async (user) => {
        const name = user.user_metadata?.full_name ?? user.user_metadata?.displayName ?? '';
        const html = renderEmail(template, {
          firstName: firstName(name),
          unsubscribeUrl: `https://yoavrubin00.github.io/finpl/unsubscribe.html?u=${encodeURIComponent(user.id)}`,
        });

        if (mode === 'dry-run') {
          appendLog(user.email, 'dry', 'preview-only');
          return;
        }

        try {
          const result = await sendViaResend(user.email, html);
          if (result.id) {
            sent++;
            appendLog(user.email, 'sent', result.id);
          } else {
            failed++;
            appendLog(user.email, 'failed', result.message ?? 'unknown');
          }
        } catch (err) {
          failed++;
          const msg = err instanceof Error ? err.message : String(err);
          appendLog(user.email, 'failed', msg);
        }
      }),
    );

    if (i + BATCH_SIZE < recipients.length) {
      await sleep(DELAY_BETWEEN_BATCHES_MS);
    }
  }

  console.log(`\n─── Done ───`);
  console.log(`Sent:   ${sent}`);
  console.log(`Failed: ${failed}`);
  console.log(`Log:    ${LOG_PATH}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
