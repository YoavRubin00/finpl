// src/features/shark-voice-chat/hooks/useElevenLabsConversation.ts
//
// Base module for TypeScript resolution ONLY. React Native's Metro bundler
// resolves `./useElevenLabsConversation` to the platform-specific variant
// (`.web.ts` on web, `.native.ts` on iOS/Android) automatically. TypeScript,
// however, does NOT do platform-suffix resolution (the Expo base tsconfig sets
// no `moduleSuffixes`), so without a concrete base file every importer errors
// "Cannot find module './useElevenLabsConversation'". Re-exporting the native
// variant here gives tsc something to resolve; at runtime Metro always picks a
// platform file over this one, so this module is never actually loaded.
export { useElevenLabsConversation } from './useElevenLabsConversation.native';
