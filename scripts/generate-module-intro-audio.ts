/**
 * Generate a module-intro narration MP3 with ElevenLabs (Captain Shark voice
 * = Liam) and upload to Vercel Blob under audio/intros/. Used to seed the
 * `introAudio` field of a new module in chapter*Data.ts without leaving the
 * terminal.
 *
 * Mirrors scripts/generate-walkthrough-step-audio.ts (same voice, same model,
 * same .env.local handling) — only the blob path differs (audio/intros/...
 * instead of audios/walkthrough/...) and the CLI takes a module ID instead
 * of a step index.
 *
 * Reads ELEVENLABS_API_KEY, BLOB_READ_WRITE_TOKEN from .env.local.
 *
 * Usage:
 *   npx tsx scripts/generate-module-intro-audio.ts <moduleId> "<text>"
 *
 * Example:
 *   npx tsx scripts/generate-module-intro-audio.ts mod-0-1b "הצד השני של הסיפור..."
 *
 * Output:
 *   - Local MP3 at assets/audio-intros/<moduleId>-v1.mp3
 *   - Uploaded to audio/intros/<moduleId>-v1-<randomSuffix>.mp3
 *   - Prints the final blob URL to stdout — paste into chapter*Data.ts.
 */
import { put } from '@vercel/blob';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^['"](.*)['"]$/, '$1');
    }
  }
}

// Liam — same Captain Shark voice as the walkthrough narration. The default
// ELEVENLABS_VOICE_ID in .env.local is Daisy UK (podcast) — using that here
// would break character on the module intro.
const CAPTAIN_SHARK_VOICE_ID = 'TX3LPaxmHKxFdv7VOQHJ';

const LOCAL_DIR = resolve(process.cwd(), 'assets/audio-intros');

async function tts(text: string, voiceId: string, apiKey: string): Promise<Buffer> {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      model_id: 'eleven_v3',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.8,
        style: 0.45,
        use_speaker_boost: true,
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function main(): Promise<void> {
  const moduleId = process.argv[2];
  const textArg = process.argv[3];

  if (!moduleId || !textArg) {
    console.error('Usage: npx tsx scripts/generate-module-intro-audio.ts <moduleId> "<text>"');
    process.exit(1);
  }
  if (!/^mod-[a-z0-9-]+$/.test(moduleId)) {
    console.error(`Invalid moduleId: ${moduleId}. Expected format like "mod-0-1b".`);
    process.exit(1);
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.MODULE_INTRO_VOICE_ID || CAPTAIN_SHARK_VOICE_ID;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

  if (!apiKey) {
    console.error('ERROR: ELEVENLABS_API_KEY is required in .env.local');
    process.exit(1);
  }
  if (!blobToken) {
    console.error('ERROR: BLOB_READ_WRITE_TOKEN is required in .env.local');
    process.exit(1);
  }

  if (!existsSync(LOCAL_DIR)) mkdirSync(LOCAL_DIR, { recursive: true });

  console.log(`→ ${moduleId}: generating TTS (${textArg.length} chars, voice ${voiceId})`);
  const buf = await tts(textArg, voiceId, apiKey);

  const localPath = resolve(LOCAL_DIR, `${moduleId}-v1.mp3`);
  writeFileSync(localPath, new Uint8Array(buf));
  console.log(`  ✓ wrote ${(buf.length / 1024).toFixed(1)} KB → ${localPath}`);

  console.log(`  ↑ uploading to Vercel Blob...`);
  const blob = await put(`audio/intros/${moduleId}-v1.mp3`, buf, {
    access: 'public',
    contentType: 'audio/mpeg',
    addRandomSuffix: true,
    allowOverwrite: true,
    token: blobToken,
  });
  console.log(`  ✓ blob URL: ${blob.url}`);
  console.log('\nPaste this into the module entry in chapter*Data.ts:');
  console.log(`  introAudio: { uri: '${blob.url}' },`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
