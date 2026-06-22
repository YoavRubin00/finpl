/**
 * Build-time switch for the live-voice "shark call" feature.
 *
 * The live call pulls a NATIVE SDK (`@elevenlabs/react-native` → LiveKit/WebRTC)
 * that exists ONLY in native builds that bundle it. OTA updates ship JS onto an
 * EXISTING binary — if that binary predates the SDK, evaluating the native
 * import crashes. Every live-voice ENTRY POINT therefore checks this flag and
 * bails BEFORE the lazy native import can run:
 *   • src/features/topic-learning/components/ModuleSharkCallCard.tsx
 *   • app/shark-voice.tsx
 *
 * RELEASE PROTOCOL:
 *   • OTA-safe release (onto a binary WITHOUT the SDK): set this to `false`.
 *   • Native build that ships the SDK: set this to `true`.
 *
 * On `dev` this stays `true` (the next native build carries the SDK). For an
 * OTA-stripped release onto OLD binaries, flip to `false`.
 *
 * 2026-06-22: the 1.3.7 store build SHIPS the SDK and ENABLES live-voice, so
 * master is `true`. To keep the OLD (pre-SDK) binaries safe, that release also
 * PINS runtimeVersion to "1.3.7" (app.json) — flag=true OTAs now only reach
 * 1.3.7+ binaries, never the old exposdk:55.0.0 ones (which already got their
 * final flag=false OTA).
 */
export const LIVE_VOICE_AVAILABLE = true;
