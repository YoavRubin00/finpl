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
 * On `dev` this stays `true` (the next native build carries the SDK). The
 * OTA-stripped `master` release flips it to `false`. (Replaces the old manual
 * "strip live-voice" commit on the ota-release branch with a one-line toggle.)
 */
export const LIVE_VOICE_AVAILABLE = true;
