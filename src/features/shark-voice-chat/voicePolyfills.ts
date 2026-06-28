// Web-platform globals that the live-voice native chain
// (@elevenlabs/react-native → @livekit/react-native → livekit-client) expects at
// MODULE-EVAL time but which Hermes (React Native's engine) does not provide.
//
// The concrete failure: `livekit-client.esm.mjs` declares
//   class DeferrableMapAbortError extends DOMException { ... }
// at the top level. Evaluating `extends DOMException` throws
//   ReferenceError: Property 'DOMException' doesn't exist
// on native — and this happens DURING the `import '@livekit/react-native'` that
// sits at the very top of @elevenlabs's native entry, i.e. BEFORE that entry's
// own `registerGlobals()` (which would polyfill the WebRTC/web globals) ever
// runs. So registerGlobals can't save us; the shim must exist before the SDK is
// required at all. We install it right before each deferred `require(...)` of the
// SDK (SharkVoiceProvider + useElevenLabsConversation), and once on import here.
//
// Idempotent and dependency-free: a tiny spec-shaped DOMException is enough for
// the class hierarchy to evaluate and for livekit's abort/error handling to work.

// Legacy numeric codes (the historical `DOMException.code`), keyed by name. Most
// callers only read `.name`, but AbortError consumers occasionally check
// `.code === 20`, so we map the well-known ones faithfully.
const DOMEXCEPTION_LEGACY_CODES: Record<string, number> = {
  IndexSizeError: 1,
  HierarchyRequestError: 3,
  WrongDocumentError: 4,
  InvalidCharacterError: 5,
  NoModificationAllowedError: 7,
  NotFoundError: 8,
  NotSupportedError: 9,
  InUseAttributeError: 10,
  InvalidStateError: 11,
  SyntaxError: 12,
  InvalidModificationError: 13,
  NamespaceError: 14,
  InvalidAccessError: 15,
  SecurityError: 18,
  NetworkError: 19,
  AbortError: 20,
  URLMismatchError: 21,
  QuotaExceededError: 22,
  TimeoutError: 23,
  InvalidNodeTypeError: 24,
  DataCloneError: 25,
};

let installed = false;

/**
 * Installs a minimal `globalThis.DOMException` on native if it's missing. Safe to
 * call many times (no-op after the first, and a no-op where DOMException already
 * exists — e.g. web). MUST run before the live-voice SDK is required.
 */
export function installVoicePolyfills(): void {
  if (installed) return;
  installed = true;

  const g = globalThis as Record<string, unknown>;
  if (typeof g.DOMException === 'undefined') {
    class DOMException extends Error {
      readonly code: number;
      constructor(message?: string, name?: string) {
        super(message);
        this.name = name ?? 'Error';
        this.code = name ? (DOMEXCEPTION_LEGACY_CODES[name] ?? 0) : 0;
      }
    }
    g.DOMException = DOMException;
  }
}

// Self-install on import too, so a static `import './voicePolyfills'` at the top
// of a consumer module guarantees the shim before that module's body runs.
installVoicePolyfills();
